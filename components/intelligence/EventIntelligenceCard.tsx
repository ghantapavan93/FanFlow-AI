'use client'

import { useEffect, useState } from 'react'
import { animate, motion, useReducedMotion } from 'framer-motion'
import type { EventIntelligence } from '@/lib/intelligence'

/**
 * Count up an integer from 0 to `value` over `duration` ms when it mounts.
 * Respects prefers-reduced-motion (renders the final number instantly).
 * Linear-style polish — keep duration short (~500-700ms) so it feels alive
 * but never delays comprehension.
 */
function CountUp({
  value,
  duration = 0.6,
  suffix = '',
}: {
  value: number
  duration?: number
  suffix?: string
}) {
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(reduced ? value : 0)

  useEffect(() => {
    if (reduced) {
      setDisplay(value)
      return
    }
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduced])

  return (
    <span className="tabular-nums">
      {display}
      {suffix}
    </span>
  )
}

interface Props {
  intelligence: EventIntelligence
}

const LOAD_META: Record<
  EventIntelligence['expectedEntryLoad'],
  { label: string; tone: string; dot: string }
> = {
  light: { label: 'Light', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  moderate: { label: 'Moderate', tone: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  busy: { label: 'Busy', tone: 'text-rose-700 bg-rose-50 border-rose-200', dot: 'bg-rose-500' },
  unknown: { label: 'Awaiting signals', tone: 'text-slate-600 bg-slate-50 border-slate-200', dot: 'bg-slate-400' },
}

/**
 * Premium intelligence summary card.
 *
 * Renders the deterministic, signal-derived intelligence from
 * lib/intelligence.ts. Carefully worded ("expected", "based on signals",
 * "recommended" — never "guaranteed"). Subtle Framer Motion reveal.
 *
 * Designed to sit between the Ticket-confirmed handoff and the Arrival Plan
 * on the Hub. Tells the recruiter: this isn't a static demo — the system
 * actually summarizes signals.
 */
export function EventIntelligenceCard({ intelligence }: Props) {
  const load = LOAD_META[intelligence.expectedEntryLoad]
  const { fanPulse, latestStaffAtGate, recommendation, peakWindow, confidencePct } =
    intelligence

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-slate-200 bg-white overflow-hidden hover-lift"
    >
      {/* Top accent strip — violet, mirrors the Arrival Plan card */}
      <div className="h-1 bg-gradient-to-r from-violet-500 via-violet-600 to-violet-500" />

      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="kicker text-violet-700">Event intelligence</div>
            <h3 className="font-bold text-slate-900 text-base sm:text-lg leading-tight mt-0.5">
              Conditions at your gate
            </h3>
          </div>
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-50 border border-slate-200 text-slate-700"
            title="Confidence percentage derived from your readiness preferences, gate scoring, and recent signals."
          >
            <CountUp value={confidencePct} suffix="%" /> confidence
          </span>
        </div>

        {/* Three metric tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
          <div className={`rounded-xl border p-3 ${load.tone}`}>
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
              Expected entry load
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className={`w-2 h-2 rounded-full ${load.dot}`} />
              <span className="font-bold text-sm">{load.label}</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Peak arrival window
            </div>
            <div className="font-bold text-sm text-slate-900 mt-1.5 font-mono tabular-nums">
              {peakWindow}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 col-span-2 sm:col-span-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Fan pulse near gate
            </div>
            <div className="font-bold text-sm text-slate-900 mt-1.5">
              {fanPulse.total > 0 ? (
                <>
                  <CountUp value={fanPulse.smoothPct} suffix="%" /> smooth
                </>
              ) : (
                'No recent reports'
              )}
              {fanPulse.total > 0 && (
                <span className="block text-[10px] font-normal text-slate-500 mt-0.5">
                  {fanPulse.total} report{fanPulse.total === 1 ? '' : 's'} · last 30m
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Staff signal callout, only when one exists */}
        {latestStaffAtGate && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-start gap-2">
              <span className="text-emerald-700 text-sm flex-shrink-0 mt-0.5">👮</span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  Staff signal · weighted 3× over fan reports
                </div>
                <p className="text-sm text-emerald-900 mt-1 leading-snug">
                  &ldquo;{latestStaffAtGate.message}&rdquo;
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recommendation line */}
        <div className="rounded-xl bg-gradient-to-br from-violet-50 to-slate-50 border border-violet-100/60 p-3">
          <div className="flex items-start gap-2">
            <span className="text-violet-600 text-sm flex-shrink-0 mt-0.5">💡</span>
            <p className="text-sm text-slate-700 leading-relaxed">
              {recommendation}
            </p>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
          Based on current information. Always follow venue signage and staff
          instructions.
        </p>
      </div>
    </motion.div>
  )
}
