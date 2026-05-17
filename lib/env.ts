/**
 * Centralized environment-variable access.
 *
 * Reads + validates once at import time. Downstream code consumes the
 * already-checked `env` object instead of reaching into `process.env`,
 * which means malformed keys (whitespace, wrong shape) are caught at boot
 * rather than at first request.
 *
 * This file is server-only — Next.js will refuse to bundle it into a
 * client component. Use it from API routes, server components, and
 * library code that runs on the server.
 */

import { z } from 'zod'

const EnvSchema = z.object({
  /** Groq API key. Optional — without it, explain endpoint uses the template. */
  GROQ_API_KEY: z
    .string()
    .trim()
    .min(1)
    .optional()
    .or(z.literal('').transform(() => undefined)),

  /** Gemini API key. Optional fallback if Groq isn't configured. */
  GEMINI_API_KEY: z
    .string()
    .trim()
    .min(1)
    .optional()
    .or(z.literal('').transform(() => undefined)),

  /** Node environment. Set by Next.js automatically. */
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
})

const parsed = EnvSchema.safeParse({
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  NODE_ENV: process.env.NODE_ENV,
})

if (!parsed.success) {
  // Loud at boot, but don't crash — the demo must run even with no keys.
  console.warn(
    '[FanFlow] env validation found issues:',
    parsed.error.flatten().fieldErrors,
  )
}

export const env = parsed.success
  ? parsed.data
  : { GROQ_API_KEY: undefined, GEMINI_API_KEY: undefined, NODE_ENV: 'development' as const }

/**
 * Convenience: which LLM provider is configured?
 * Returns 'groq' if GROQ_API_KEY is set, 'gemini' if only Gemini is set,
 * or 'none' if neither — in which case the explain endpoint serves the
 * deterministic template.
 */
export function llmProvider(): 'groq' | 'gemini' | 'none' {
  if (env.GROQ_API_KEY) return 'groq'
  if (env.GEMINI_API_KEY) return 'gemini'
  return 'none'
}
