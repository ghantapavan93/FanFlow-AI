'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { ArrivalPlan, LiveSignal, ReadinessPrefs } from '@/lib/types'

/* ─────────────────────────────────────────────────────────────────────────
   HubAISummary — compact 2–3 sentence AI-generated explanation for the
   top of the Hub.

   Reuses the existing /api/explain-arrival-plan endpoint so the sanitizer
   and mentionsWrongGate guard apply unchanged. The endpoint contract
   itself is NOT modified — we trim its output client-side to two
   sentences so the Hub stays scannable, while the full prose is still
   available on the Arrival Guide via AIExplanationCard.

   Falls back to a deterministic single-line template if the network call
   fails, so the Hub never shows a broken state.
   ───────────────────────────────────────────────────────────────────── */

interface ExplainResponse {
  explanation: string
  source: 'template' | 'groq' | 'gemini'
  generatedAt: string
  latencyMs: number
  requestId: string
}

const SOURCE_BADGE: Record<ExplainResponse['source'], { label: string; cls: string }> = {
  groq: {
    label: 'AI · Groq',
    cls: 'bg-violet-400/15 text-violet-200 border-violet-400/30',
  },
  gemini: {
    label: 'AI · Gemini',
    cls: 'bg-sky-400/15 text-sky-200 border-sky-400/30',
  },
  template: {
    label: 'Template',
    cls: 'bg-white/10 text-slate-300 border-white/20',
  },
}

/** Trim long explanations to the first ~2 sentences so the Hub stays scannable. */
function compactSentences(text: string, maxSentences = 2): string {
  // Split on sentence end punctuation followed by space/end. Preserve the
  // punctuation in the slice so the result still reads like prose.
  const parts = text.match(/[^.!?]+[.!?]+/g)
  if (!parts) return text.trim()
  return parts.slice(0, maxSentences).join(' ').trim()
}

interface HubAISummaryProps {
  plan: ArrivalPlan
  prefs: ReadinessPrefs | null
  signals: LiveSignal[]
  eventName: string
  venueName: string
  ticketSection: string
}

export function HubAISummary({
  plan,
  prefs,
  signals,
  eventName,
  venueName,
  ticketSection,
}: HubAISummaryProps) {
  const [data, setData] = useState<ExplainResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [errored, setErrored] = useState(false)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setErrored(false)
    try {
      // Build the same request shape AIExplanationCard uses so the
      // sanitizer and gate-whitelist guard have identical context. The
      // endpoint contract is unchanged.
      const recentStaff = signals
        .filter(
          (s) =>
            s.source === 'staff' &&
            s.gate_id === plan.recommended_gate.id &&
            Date.now() - new Date(s.created_at).getTime() < 60 * 60 * 1000,
        )
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )[0]
      const fanSignalsAtGate = signals.filter(
        (s) =>
          s.source === 'fan' &&
          s.gate_id === plan.recommended_gate.id &&
          Date.now() - new Date(s.created_at).getTime() < 60 * 60 * 1000,
      )

      const body = {
        plan: {
          recommended_gate: {
            id: plan.recommended_gate.id,
            name: plan.recommended_gate.name,
            typical_wait_minutes: plan.recommended_gate.typical_wait_minutes,
            accessibility: plan.recommended_gate.accessibility,
            family_friendly: plan.recommended_gate.family_friendly,
            sections: plan.recommended_gate.sections,
          },
          leave_by_time: plan.leave_by_time,
          arrival_time: plan.arrival_time,
          route_summary: plan.route_summary,
          confidence: plan.confidence,
          confidence_reason: plan.confidence_reason,
          support_points: plan.support_points.slice(0, 6).map((sp) => ({
            id: sp.id,
            type: sp.type,
            name: sp.name,
          })),
        },
        user: {
          transport: prefs?.transport ?? null,
          group: prefs?.group ?? null,
          needs: prefs?.needs ?? [],
          section: ticketSection,
        },
        event: { name: eventName, venue: venueName },
        conditions: {
          recent_staff_sentiment: recentStaff?.sentiment ?? null,
          recent_fan_signal_count: fanSignalsAtGate.length,
        },
      }
      const res = await fetch('/api/explain-arrival-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: ExplainResponse = await res.json()
      setData(json)
    } catch {
      setErrored(true)
    } finally {
      setLoading(false)
    }
    // We intentionally depend on the inputs that materially change the
    // recommendation, not on every signal append.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    plan.recommended_gate.id,
    plan.confidence_breakdown.percent,
    prefs?.transport,
    prefs?.group,
    signals.length,
  ])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  const compact = data ? compactSentences(data.explanation, 2) : null
  const gateLabel = plan.recommended_gate.name.split(' (')[0]

  // Deterministic fallback so the Hub never shows a broken AI card.
  const fallback = `${gateLabel} is your best fit and you’ll be inside by ${plan.arrival_time}. Plan derived from your readiness, ticket, and current signals.`

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="surface-night relative overflow-hidden rounded-2xl p-4 text-white shadow-[0_10px_30px_-12px_rgba(76,29,149,0.55)]"
    >
      {/* Ambient bloom — slow drift for a "live intelligence" feel */}
      <motion.div
        aria-hidden="true"
        className="absolute -top-12 -right-8 w-40 h-40 rounded-full bg-violet-500/20 blur-3xl"
        animate={{ x: [0, 16, 0], y: [0, 12, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-violet-200">
            <span className="relative flex w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-violet-300 animate-ping opacity-60" />
              <span className="relative inline-block w-2 h-2 rounded-full bg-violet-300" />
            </span>
            FanFlow insight
          </div>
          <div className="flex items-center gap-1.5">
            {data && (
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${SOURCE_BADGE[data.source].cls}`}
                title={
                  data.source === 'template'
                    ? 'Deterministic template — no LLM key configured or LLM timed out'
                    : `Generated by ${data.source} · sanitized · guarded`
                }
              >
                {SOURCE_BADGE[data.source].label}
              </span>
            )}
            <button
              onClick={fetchSummary}
              disabled={loading}
              className="inline-flex items-center justify-center w-7 h-7 rounded-full text-violet-200 hover:bg-white/10 active:bg-white/15 disabled:opacity-50 transition"
              title="Regenerate summary"
              aria-label="Regenerate summary"
            >
              <span className={loading ? 'inline-block animate-spin' : ''}>↻</span>
            </button>
          </div>
        </div>

        {loading && !data ? (
          <div className="space-y-1.5">
            <div className="h-3.5 rounded bg-white/10 animate-pulse" />
            <div className="h-3.5 w-5/6 rounded bg-white/10 animate-pulse" />
          </div>
        ) : (
          <p className="text-[15px] text-slate-100 leading-relaxed font-medium">
            {compact ?? fallback}
          </p>
        )}

        {errored && (
          <p className="text-[10px] text-violet-200/70 mt-1.5">
            AI service unavailable — showing baseline summary.
          </p>
        )}

        <p className="text-[10px] text-violet-200/60 mt-2.5 leading-relaxed">
          Rules pick the plan. AI only writes the words. Full reasoning in the Arrival Guide.
        </p>
      </div>
    </motion.section>
  )
}
