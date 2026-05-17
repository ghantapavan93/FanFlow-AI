/**
 * GET /api/health
 *
 * Liveness + readiness signal. Returns:
 *   - status: 'ok' (always 200 when the function executes)
 *   - version: package version (from package.json at build time)
 *   - llmProvider: 'groq' | 'gemini' | 'none' — which provider the explain
 *     endpoint will use, based on currently set env vars
 *   - timestamp: ISO time the response was generated
 *   - uptimeSec: seconds since this server process started
 *
 * Used for:
 *   - Vercel deployment verification
 *   - Recruiter sanity-checking the deployed environment ("does GROQ key
 *     reach this deployment?")
 *   - Future uptime monitoring (Pingdom / UptimeRobot / etc.)
 */

import { NextResponse } from 'next/server'
import { llmProvider } from '@/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const startedAt = Date.now()
const VERSION = '0.1.0'

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      version: VERSION,
      llmProvider: llmProvider(),
      timestamp: new Date().toISOString(),
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
