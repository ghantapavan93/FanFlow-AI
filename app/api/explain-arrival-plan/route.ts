import { NextResponse } from 'next/server'
import {
  ExplainRequestSchema,
  buildLLMPrompt,
  buildTemplateExplanation,
  sanitizeExplanation,
  type ExplainRequest,
} from '@/lib/explain/arrivalExplanation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LLM_TIMEOUT_MS = 2500

type Source = 'template' | 'groq' | 'gemini'

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    return await p
  } catch {
    return null
  } finally {
    clearTimeout(timer)
    void ctrl
  }
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
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    )
  }

  const parsed = ExplainRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request shape', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const req = parsed.data

  const template = buildTemplateExplanation(req)
  let explanation = template
  let source: Source = 'template'

  const groqKey = process.env.GROQ_API_KEY?.trim()
  const geminiKey = process.env.GEMINI_API_KEY?.trim()

  if (groqKey) {
    const raw = await withTimeout(callGroq(req, template, groqKey), LLM_TIMEOUT_MS + 200)
    if (raw) {
      explanation = sanitizeExplanation(raw)
      source = 'groq'
    }
  } else if (geminiKey) {
    const raw = await withTimeout(
      callGemini(req, template, geminiKey),
      LLM_TIMEOUT_MS + 200,
    )
    if (raw) {
      explanation = sanitizeExplanation(raw)
      source = 'gemini'
    }
  }

  return NextResponse.json({
    explanation,
    source,
    generatedAt: new Date().toISOString(),
  })
}
