import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import {
  ExplainRequestSchema,
  buildLLMPrompt,
  buildTemplateExplanation,
  mentionsWrongGate,
  sanitizeExplanation,
  type ExplainRequest,
} from '@/lib/explain/arrivalExplanation'
import { env } from '@/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LLM_TIMEOUT_MS = 2500

type Source = 'template' | 'groq' | 'gemini'

/**
 * Standardized error response shape. All non-2xx responses use this so
 * clients (and future monitoring) can rely on consistent keys.
 */
function errorResponse(
  code: string,
  message: string,
  status: number,
  requestId: string,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      error: { code, message, requestId, ...extra },
    },
    { status, headers: { 'x-request-id': requestId } },
  )
}

/**
 * Extract or generate a request ID. Honors an inbound x-request-id header
 * so a frontend or proxy can correlate logs across hops.
 */
function getRequestId(request: Request): string {
  const inbound = request.headers.get('x-request-id')
  if (inbound && /^[\w-]{8,64}$/.test(inbound)) return inbound
  return randomUUID()
}

/**
 * Hard outer timeout wrapper. Each provider call (callGroq / callGemini)
 * already has its own AbortController + timeout — this is defense in depth:
 * if the inner promise hangs synchronously or never settles, this guarantees
 * the request returns. Resolves to null on timeout; the caller falls back
 * to the deterministic template.
 */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms)
    p.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      () => {
        clearTimeout(timer)
        resolve(null)
      },
    )
  })
}

async function callGroq(
  req: ExplainRequest,
  template: string,
  apiKey: string,
): Promise<string | null> {
  const { system, user } = buildLLMPrompt(req, template)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), LLM_TIMEOUT_MS)
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.4,
        max_tokens: 220,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: ctrl.signal,
    })
    if (!res.ok) return null
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const text = json.choices?.[0]?.message?.content?.trim()
    return text || null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function callGemini(
  req: ExplainRequest,
  template: string,
  apiKey: string,
): Promise<string | null> {
  const { system, user } = buildLLMPrompt(req, template)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), LLM_TIMEOUT_MS)
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(
        apiKey,
      )}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 220 },
        }),
        signal: ctrl.signal,
      },
    )
    if (!res.ok) return null
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    return text || null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('invalid_json', 'Request body is not valid JSON.', 400, requestId)
  }

  const parsed = ExplainRequestSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(
      'invalid_shape',
      'Request body does not match the expected schema.',
      400,
      requestId,
      { issues: parsed.error.flatten() },
    )
  }
  const req = parsed.data

  const template = buildTemplateExplanation(req)
  let explanation = template
  let source: Source = 'template'
  let latencyMs = 0
  let llmDiscarded = false

  const groqKey = env.GROQ_API_KEY
  const geminiKey = env.GEMINI_API_KEY
  const recommendedGateName = req.plan.recommended_gate.name

  if (groqKey) {
    const start = Date.now()
    const raw = await withTimeout(callGroq(req, template, groqKey), LLM_TIMEOUT_MS + 200)
    latencyMs = Date.now() - start
    if (raw) {
      const sanitized = sanitizeExplanation(raw)
      if (mentionsWrongGate(sanitized, recommendedGateName)) {
        // LLM hallucinated a different gate — discard, keep template
        llmDiscarded = true
      } else {
        explanation = sanitized
        source = 'groq'
      }
    }
  } else if (geminiKey) {
    const start = Date.now()
    const raw = await withTimeout(
      callGemini(req, template, geminiKey),
      LLM_TIMEOUT_MS + 200,
    )
    latencyMs = Date.now() - start
    if (raw) {
      const sanitized = sanitizeExplanation(raw)
      if (mentionsWrongGate(sanitized, recommendedGateName)) {
        llmDiscarded = true
      } else {
        explanation = sanitized
        source = 'gemini'
      }
    }
  }

  return NextResponse.json(
    {
      explanation,
      source,
      generatedAt: new Date().toISOString(),
      latencyMs,
      requestId,
      // Observability hint: true if an LLM was called but its output was
      // rejected by the guardrail (gate hallucination). Lets reviewers see
      // the safety net working in production.
      ...(llmDiscarded ? { llmDiscarded: true } : {}),
    },
    { headers: { 'x-request-id': requestId } },
  )
}
