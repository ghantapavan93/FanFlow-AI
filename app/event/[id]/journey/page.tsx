'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { demoEvent, demoTicket, deriveArrivalPlan } from '@/lib/seed'
import { loadSelectedTicket } from '@/lib/ticketContext'
import {
  getAllSignals,
  loadReadiness,
  subscribeToFanflowChanges,
} from '@/lib/store'
import type { LiveSignal, ReadinessPrefs } from '@/lib/types'
import { HelpSheet } from '@/components/shared/HelpSheet'
import { AIExplanationCard } from '@/components/shared/AIExplanationCard'
import { demoVenue } from '@/lib/seed'

/**
 * Your Journey — full-page vertical timeline that walks the fan through
 * the entire arrival flow step-by-step. Each step is derived from the
 * rule engine's plan output; the gate step is visually emphasized as the
 * primary recommendation.
 *
 * Bottom tab nav matches the Hub so the user can move laterally to Map /
 * Pulse / Help without losing context.
 */
export default function JourneyPage() {
  const params = useParams<{ id: string }>()
  const eventId = params?.id ?? 'wc2026-final'

  const [prefs, setPrefs] = useState<ReadinessPrefs | null>(null)
  const [signals, setSignals] = useState<LiveSignal[]>([])
  const [selectedTicket, setSelectedTicket] = useState<ReturnType<typeof loadSelectedTicket>>(null)
  const [helpOpen, setHelpOpen] = useState(false)

  const refresh = useCallback(() => {
    setPrefs(loadReadiness())
    setSignals(getAllSignals())
    setSelectedTicket(loadSelectedTicket())
  }, [])

  useEffect(() => {
    refresh()
    return subscribeToFanflowChanges(['fanflow:readiness', 'fanflow:signals'], refresh)
  }, [refresh])

  const ticket = selectedTicket ?? demoTicket
  const plan = deriveArrivalPlan(prefs, signals.length ? signals : undefined)
  const gateMatch = plan.recommended_gate.name.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
  const gateLabel = gateMatch?.[1] ?? plan.recommended_gate.name
  const gateSub = gateMatch?.[2] ?? 'Recommended entrance'

  const eventTime = (() => {
    const d = new Date(demoEvent.date)
    let h = d.getHours()
    const m = d.getMinutes().toString().padStart(2, '0')
    const ap = h >= 12 ? 'PM' : 'AM'
    h = h % 12
    if (h === 0) h = 12
    return `${h.toString().padStart(2, '0')}:${m} ${ap}`
  })()

  const steps: Array<{
    id: string
    icon: string
    label: string
    primary: string
    sub?: string
    detail?: string
    accent?: boolean
  }> = [
    {
      id: 'leave',
      icon: '🕐',
      label: 'Leave by',
      primary: plan.leave_by_time,
      sub: 'Give yourself time',
      detail:
        'Buffer based on your transport mode and group size. Adjust in Prefs if you want a tighter or looser margin.',
    },
    {
      id: 'arrive',
      icon: '🏟️',
      label: 'Arrive at venue',
      primary: plan.arrival_time,
      sub: 'Avoid the peak window',
      detail:
        'Targets 30 min after doors open so the gate line has thinned but you still have walk time to your seat.',
    },
    {
      id: 'enter',
      icon: '🚪',
      label: 'Enter via',
      primary: gateLabel,
      sub: gateSub,
      detail:
        'The rule engine ranked every gate by section proximity, accessibility match, family fit, current wait, and live signals. This one won.',
      accent: true,
    },
    {
      id: 'seat',
      icon: '🎫',
      label: 'Find your seat',
      primary: `Section ${ticket.section}`,
      sub: ticket.row
        ? `Row ${ticket.row}${ticket.seat ? ` · Seat ${ticket.seat}` : ''}`
        : undefined,
      detail:
        'From your gate, follow concourse signs for your section number. Staff in high-vis vests can radio for support.',
    },
    {
      id: 'match',
      icon: '🎉',
      label: 'Enjoy the match',
      primary: `Kickoff ${eventTime}`,
      sub: "You're all set",
    },
  ]

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-violet-100/60 via-violet-50/20 to-white pb-24">
        {/* Sticky brand bar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100">
          <div className="container-mobile px-4 h-14 flex items-center justify-between">
            <Link
              href={`/event/${eventId}/hub`}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              ← Hub
            </Link>
            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-900 text-sm">Journey</span>
              <span className="text-[10px] font-bold bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white px-1.5 py-0.5 rounded">
                LIVE
              </span>
            </div>
            <Link
              href={`/event/${eventId}/readiness`}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white font-bold text-sm flex items-center justify-center shadow-sm"
              aria-label="Profile"
            >
              M
            </Link>
          </div>
        </header>

        <main className="container-mobile px-4 py-5 space-y-4">
          {/* Hero — cinematic event path */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="surface-night relative overflow-hidden rounded-2xl p-5 text-white shadow-[0_10px_30px_-12px_rgba(76,29,149,0.55)]"
          >
            <motion.div
              aria-hidden="true"
              className="absolute -top-12 -right-10 w-44 h-44 rounded-full bg-violet-500/20 blur-3xl"
              animate={{ x: [0, 16, 0], y: [0, 12, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="relative">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-200">
                Your journey
              </div>
              <h1 className="font-extrabold text-[34px] tracking-tight leading-[1.02] mt-1">
                Starts now
              </h1>
              <p className="text-[13px] text-violet-100/85 mt-2 leading-relaxed">
                The path the rule engine planned — your gate step is highlighted.
              </p>
              {/* Event path chips */}
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-3 text-[11px] font-semibold">
                {['Home', 'Arrive', 'Gate', 'Seat', 'Match'].map((step, i, arr) => (
                  <span key={step} className="inline-flex items-center gap-1.5">
                    <span className="glass inline-flex items-center rounded-full px-2 py-0.5 text-violet-50">
                      {step}
                    </span>
                    {i < arr.length - 1 && <span className="text-violet-300/60">→</span>}
                  </span>
                ))}
              </div>
            </div>
          </motion.section>

          {/* Timeline */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl bg-white border border-slate-200 shadow-[0_4px_20px_-8px_rgba(124,58,237,0.10)] p-5"
          >
            <ol className="relative">
              <div
                aria-hidden="true"
                className="absolute left-[23px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-violet-300 via-violet-200 to-slate-200"
              />

              {steps.map((step, i) => (
                <motion.li
                  key={step.id}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.45, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="relative flex items-start gap-3.5 pb-5 last:pb-0"
                >
                  <span
                    className={`relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 ring-4 ring-white ${
                      step.accent
                        ? 'bg-gradient-to-br from-violet-500 via-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/40'
                        : 'bg-white border-2 border-violet-200 text-violet-600 shadow-sm'
                    }`}
                  >
                    {step.icon}
                  </span>

                  <div
                    className={`flex-1 min-w-0 rounded-2xl px-4 py-3 ${
                      step.accent
                        ? 'bg-gradient-to-br from-violet-50 via-white to-fuchsia-50/50 border border-violet-200 shadow-sm'
                        : 'bg-slate-50/60 border border-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          step.accent ? 'text-violet-700' : 'text-slate-500'
                        }`}
                      >
                        {step.label}
                      </div>
                      {step.accent && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-violet-600 text-white text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
                          ★ Best
                        </span>
                      )}
                    </div>
                    <div
                      className={`font-bold leading-tight tabular-nums ${
                        step.accent
                          ? 'text-violet-900 text-xl mt-1'
                          : 'text-slate-900 text-base mt-0.5'
                      }`}
                    >
                      {step.primary}
                    </div>
                    {step.sub && (
                      <div
                        className={`text-[11px] mt-1 leading-snug ${
                          step.accent ? 'text-violet-700/80 font-semibold' : 'text-slate-500'
                        }`}
                      >
                        {step.sub}
                      </div>
                    )}
                    {step.detail && (
                      <div className="text-[11px] text-slate-600 mt-2 leading-relaxed border-t border-slate-100 pt-2">
                        {step.detail}
                      </div>
                    )}
                  </div>
                </motion.li>
              ))}
            </ol>
          </motion.section>

          {/* AI Explanation — premium formatted narration ============= */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 text-white p-5"
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-60 bg-[radial-gradient(ellipse_at_20%_80%,rgba(167,139,250,0.35),transparent_55%),radial-gradient(ellipse_at_85%_15%,rgba(236,72,153,0.25),transparent_55%)]"
            />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center text-base">
                  ✨
                </span>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-300">
                    AI Analysis
                  </div>
                  <div className="font-bold text-sm leading-tight">
                    Why this plan works for you
                  </div>
                </div>
              </div>

              {/* Structured insight cards inside the dark card */}
              <div className="space-y-3 mb-4">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-emerald-400 text-sm">🚪</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Gate Selection</span>
                  </div>
                  <p className="text-[13px] text-slate-200 leading-relaxed">
                    <strong className="text-white">{gateLabel}</strong> was chosen because it is
                    the closest entrance to Section {ticket.section}
                    {plan.recommended_gate.family_friendly ? ', supports family-friendly access' : ''}
                    {plan.recommended_gate.accessibility ? ', and has step-free entry' : ''}.
                    {plan.recommended_gate.typical_wait_minutes <= 8
                      ? ' Wait times are currently below average.'
                      : ''}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sky-400 text-sm">⏱️</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">Timing Strategy</span>
                  </div>
                  <p className="text-[13px] text-slate-200 leading-relaxed">
                    Leaving by <strong className="text-white">{plan.leave_by_time}</strong> and
                    arriving at <strong className="text-white">{plan.arrival_time}</strong> targets
                    the sweet spot — after the initial rush has thinned but with enough buffer
                    to reach your seat comfortably before kickoff.
                  </p>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-violet-400 text-sm">🛡️</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Confidence</span>
                  </div>
                  <p className="text-[13px] text-slate-200 leading-relaxed">
                    Plan confidence is at <strong className="text-white">{plan.confidence_breakdown.percent}%</strong>
                    {plan.confidence_breakdown.staffSignalCount > 0
                      ? ` — boosted by ${plan.confidence_breakdown.staffSignalCount} staff-verified signal${plan.confidence_breakdown.staffSignalCount > 1 ? 's' : ''}`
                      : ''}.
                    {plan.confidence_breakdown.reasons[0] ? ` ${plan.confidence_breakdown.reasons[0]}.` : ''}
                  </p>
                </div>
              </div>

              {/* Live AI cascade narration */}
              <AIExplanationCard
                plan={plan}
                prefs={prefs}
                signals={signals}
                eventName="FIFA World Cup 2026 Final"
                venueName={demoVenue.name}
                ticketSection={ticket.section}
                title="Full AI narration"
                subtitle="Generated by the Groq → Gemini → Template cascade"
                tone="dark"
              />
            </div>
          </motion.section>

          {/* Journey safety assurance strip ============================== */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg flex-shrink-0">🛡️</span>
              <p className="text-[12px] text-emerald-900 leading-relaxed">
                <strong>You&apos;re all set.</strong> Every step above is monitored — if conditions
                change, your plan updates automatically. Staff are stationed at every gate.
              </p>
            </div>
          </motion.div>

          {/* Help CTA */}
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            onClick={() => setHelpOpen(true)}
            className="w-full rounded-2xl bg-gradient-to-br from-violet-50 to-white border border-violet-200 p-4 text-left hover:from-violet-100 transition group"
          >
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white flex items-center justify-center text-lg flex-shrink-0 shadow-md shadow-violet-500/25">
                🎧
              </span>
              <div className="flex-1 min-w-0">
                <div className="kicker text-violet-700">Need help during the event?</div>
                <div className="text-xs text-slate-600 mt-0.5 leading-snug">
                  Nearby support mapped to your gate and section.
                </div>
              </div>
              <span className="text-violet-700 text-lg">›</span>
            </div>
          </motion.button>
        </main>

        {/* Bottom tab nav */}
        <nav
          className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="container-mobile h-16 grid grid-cols-4 px-2">
            <Link
              href={`/event/${eventId}/hub`}
              className="flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-semibold text-slate-500 hover:text-slate-700"
            >
              <span className="flex items-center justify-center w-9 h-9 rounded-full text-xl">
                ✦
              </span>
              Guide
            </Link>
            <Link
              href={`/event/${eventId}/venue-map`}
              className="flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-semibold text-slate-500 hover:text-slate-700"
            >
              <span className="flex items-center justify-center w-9 h-9 rounded-full text-xl">
                🗺️
              </span>
              Map
            </Link>
            <Link
              href={`/event/${eventId}/pulse`}
              className="flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-semibold text-slate-500 hover:text-slate-700"
            >
              <span className="flex items-center justify-center w-9 h-9 rounded-full text-xl">
                📊
              </span>
              Pulse
            </Link>
            <button
              onClick={() => setHelpOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-semibold text-slate-500 hover:text-slate-700"
            >
              <span className="flex items-center justify-center w-9 h-9 rounded-full text-xl">
                🎧
              </span>
              Help
            </button>
          </div>
        </nav>
      </div>

      <HelpSheet
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        plan={plan}
        eventId={eventId}
      />
    </>
  )
}
