'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { demoVenue, deriveArrivalPlan } from '@/lib/seed'
import {
  getAllSignals,
  loadReadiness,
  subscribeToFanflowChanges,
} from '@/lib/store'
import type { LiveSignal, ReadinessPrefs } from '@/lib/types'
import { computeEventIntelligence, computeFanPulse } from '@/lib/intelligence'
import { HelpSheet } from '@/components/shared/HelpSheet'
import { AIExplanationCard } from '@/components/shared/AIExplanationCard'
import { demoEvent, demoTicket } from '@/lib/seed'
import { loadSelectedTicket } from '@/lib/ticketContext'

/**
 * Live Conditions — bottom-nav adjacent page focused on the live signal
 * picture for the recommended gate:
 *   - Arrival Confidence circular ring
 *   - Expected Entry Load (Light/Moderate/Heavy)
 *   - Peak Arrival Window
 *   - Fan Pulse near the gate
 *   - Staff Verified Update (when present)
 *   - Recent signal stream (last 10, sorted newest-first)
 *
 * All values stream from the same store the Hub uses, so cross-tab updates
 * (staff console publishing while the user has this page open) re-render
 * instantly.
 */
function ConfidenceRing({
  percent,
  color,
}: {
  percent: number
  color: string
}) {
  const reduced = useReducedMotion()
  const size = 110
  const stroke = 9
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (c * percent) / 100
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(226, 232, 240)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduced ? offset : c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-slate-900 tabular-nums leading-none">
          {percent}
        </span>
        <span className="text-xs font-bold text-slate-500 mt-0.5">percent</span>
      </div>
    </div>
  )
}

function MiniBars({ tone }: { tone: 'violet' | 'amber' | 'emerald' | 'rose' | 'slate' }) {
  const heights = [40, 55, 72, 60, 85, 68, 90, 78, 95, 70, 82, 65, 50, 42]
  const toneClasses: Record<string, string> = {
    violet: 'from-violet-300 to-violet-500',
    amber: 'from-amber-300 to-amber-500',
    emerald: 'from-emerald-300 to-emerald-500',
    rose: 'from-rose-300 to-rose-500',
    slate: 'from-slate-300 to-slate-500',
  }
  return (
    <div className="flex items-end gap-[2px] h-7 mt-2">
      {heights.map((h, i) => (
        <motion.span
          key={i}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.5, delay: i * 0.025, ease: [0.16, 1, 0.3, 1] }}
          style={{ height: `${h}%`, transformOrigin: 'bottom' }}
          className={`flex-1 rounded-sm bg-gradient-to-t ${toneClasses[tone]}`}
        />
      ))}
    </div>
  )
}

export default function ConditionsPage() {
  const params = useParams<{ id: string }>()
  const eventId = params?.id ?? 'wc2026-final'

  const [prefs, setPrefs] = useState<ReadinessPrefs | null>(null)
  const [signals, setSignals] = useState<LiveSignal[]>([])
  const [helpOpen, setHelpOpen] = useState(false)
  const [lastRefreshAt, setLastRefreshAt] = useState<Date>(new Date())

  const refresh = useCallback(() => {
    setPrefs(loadReadiness())
    setSignals(getAllSignals())
    setLastRefreshAt(new Date())
  }, [])

  useEffect(() => {
    refresh()
    return subscribeToFanflowChanges(['fanflow:readiness', 'fanflow:signals'], refresh)
  }, [refresh])

  const plan = deriveArrivalPlan(prefs, signals.length ? signals : undefined)
  const intelligence = computeEventIntelligence(plan, signals)
  const fanPulse = computeFanPulse(signals, plan.recommended_gate.id)

  const gateLabel = plan.recommended_gate.name.split(' (')[0]

  const confidence = plan.confidence_breakdown.percent
  const confidenceLabel =
    confidence >= 75 ? 'High' : confidence >= 55 ? 'Medium' : 'Low'
  const confidenceColor =
    confidence >= 75 ? 'rgb(16, 185, 129)' : confidence >= 55 ? 'rgb(245, 158, 11)' : 'rgb(244, 63, 94)'
  const confidenceCopy =
    confidence >= 75
      ? 'Better than usual'
      : confidence >= 55
        ? 'Steady — based on current information'
        : 'Cautious — limited live signals'

  const loadInfo =
    intelligence.expectedEntryLoad === 'light'
      ? { text: 'Light', tone: 'emerald' as const, sub: 'Smooth entry expected' }
      : intelligence.expectedEntryLoad === 'moderate'
        ? { text: 'Moderate', tone: 'amber' as const, sub: 'Manageable traffic' }
        : intelligence.expectedEntryLoad === 'busy'
          ? { text: 'Heavy', tone: 'rose' as const, sub: 'Allow extra time' }
          : { text: 'Unknown', tone: 'slate' as const, sub: 'Waiting on signals' }

  const recentSignals = signals.slice(0, 10)

  const refreshAge = (() => {
    const ms = Date.now() - lastRefreshAt.getTime()
    const min = Math.floor(ms / 60000)
    if (min < 1) return 'just now'
    if (min < 60) return `${min}m ago`
    return `${Math.floor(min / 60)}h ago`
  })()

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
              <span className="font-bold text-slate-900 text-sm">Live Conditions</span>
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
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
          {/* Hero */}
          <section className="pt-1">
            <div className="kicker text-violet-700">Live Conditions</div>
            <h1 className="font-extrabold text-slate-900 text-[28px] tracking-tight leading-[1.1] mt-2">
              Conditions at {gateLabel}
            </h1>
            <p className="text-[12px] text-slate-500 mt-1.5">Updated {refreshAge}</p>
          </section>

          {/* Arrival Confidence ring card */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl bg-white border border-slate-200 shadow-[0_4px_20px_-8px_rgba(124,58,237,0.10)] p-5"
          >
            <div className="flex items-center gap-5">
              <ConfidenceRing percent={confidence} color={confidenceColor} />
              <div className="flex-1 min-w-0">
                <div className="kicker text-violet-700">Arrival Confidence</div>
                <div className="font-bold text-slate-900 text-xl mt-0.5 leading-tight">
                  {confidenceLabel}
                </div>
                <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {confidenceCopy}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-500">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                    <span className="font-bold tabular-nums">
                      {plan.confidence_breakdown.staffSignalCount}
                    </span>
                    staff
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                    <span className="font-bold tabular-nums">
                      {plan.confidence_breakdown.fanSignalCount}
                    </span>
                    fan
                  </span>
                </div>
              </div>
            </div>
          </motion.section>

          {/* 3-tile metric strip */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-3 gap-2.5"
          >
            {/* Entry Load */}
            <div className="rounded-2xl bg-white border border-slate-200 p-3 shadow-sm">
              <div className="flex items-center gap-1 text-[9px] text-slate-500">
                <span>👥</span>
                <span className="font-bold uppercase tracking-wider truncate">Load</span>
              </div>
              <div
                className={`font-bold text-base mt-1 ${
                  loadInfo.tone === 'emerald'
                    ? 'text-emerald-600'
                    : loadInfo.tone === 'amber'
                      ? 'text-amber-600'
                      : loadInfo.tone === 'rose'
                        ? 'text-rose-600'
                        : 'text-slate-600'
                }`}
              >
                {loadInfo.text}
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                {loadInfo.sub}
              </div>
              <MiniBars tone={loadInfo.tone} />
            </div>

            {/* Peak window */}
            <div className="rounded-2xl bg-white border border-slate-200 p-3 shadow-sm">
              <div className="flex items-center gap-1 text-[9px] text-slate-500">
                <span>🕐</span>
                <span className="font-bold uppercase tracking-wider truncate">Peak</span>
              </div>
              <div className="font-bold text-[11px] sm:text-xs mt-1 text-violet-700 tabular-nums leading-tight">
                {intelligence.peakWindow}
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                {intelligence.avoidsPeak ? 'Your plan avoids this' : 'Arrive before this'}
              </div>
              <MiniBars tone="violet" />
            </div>

            {/* Fan pulse */}
            <div className="rounded-2xl bg-white border border-slate-200 p-3 shadow-sm">
              <div className="flex items-center gap-1 text-[9px] text-slate-500">
                <span>💜</span>
                <span className="font-bold uppercase tracking-wider truncate">Pulse</span>
              </div>
              <div
                className={`font-bold text-[11px] sm:text-xs mt-1 tabular-nums leading-tight ${
                  fanPulse.total > 0 ? 'text-emerald-600' : 'text-violet-700'
                }`}
              >
                {fanPulse.total > 0 ? `${fanPulse.smoothPct}% smooth` : 'No reports'}
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                {fanPulse.total > 0 ? 'Happy & relaxed crowd' : 'Be the first to share'}
              </div>
              <MiniBars tone={fanPulse.total > 0 ? 'emerald' : 'violet'} />
            </div>
          </motion.section>

          {/* Staff Verified Update */}
          {intelligence.latestStaffAtGate && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="rounded-3xl bg-gradient-to-br from-violet-50 to-violet-50/40 border border-violet-200 p-4"
            >
              <div className="flex items-start gap-3">
                <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white flex items-center justify-center text-lg flex-shrink-0 shadow-md shadow-violet-500/25">
                  ✓
                </span>
                <div className="flex-1 min-w-0">
                  <div className="kicker text-violet-700">Staff Verified Update</div>
                  <div className="font-bold text-slate-900 text-[13px] mt-0.5 leading-tight">
                    &ldquo;{intelligence.latestStaffAtGate.message}&rdquo;
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                    Staff signals are weighted 3× over individual fan reports. This
                    one is influencing your plan right now.
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Recent signal stream */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="rounded-3xl bg-white border border-slate-200 shadow-[0_4px_20px_-8px_rgba(124,58,237,0.10)] p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="kicker text-violet-700">Recent signals</div>
                <div className="text-[11px] text-slate-500 mt-0.5">All gates · last 2 hours</div>
              </div>
              <span className="text-[11px] text-slate-500">
                <span className="font-bold tabular-nums">{signals.length}</span> total
              </span>
            </div>

            {recentSignals.length === 0 ? (
              <p className="text-sm text-slate-500 italic py-4 text-center">
                Waiting for first signals. Open the Staff Console in another tab to
                see live updates flow in.
              </p>
            ) : (
              <ul className="space-y-2">
                {recentSignals.map((s) => {
                  const rowBg =
                    s.sentiment === 'smooth'
                      ? 'bg-emerald-50/60 border-emerald-100'
                      : s.sentiment === 'moderate'
                        ? 'bg-amber-50/60 border-amber-100'
                        : s.sentiment === 'busy'
                          ? 'bg-amber-100/40 border-amber-200'
                          : 'bg-rose-50/60 border-rose-100'
                  const gate = demoVenue.gates.find((g) => g.id === s.gate_id)
                  const ageMin = Math.floor(
                    (Date.now() - new Date(s.created_at).getTime()) / 60000,
                  )
                  const rel =
                    ageMin < 1
                      ? 'just now'
                      : ageMin < 60
                        ? `${ageMin}m ago`
                        : `${Math.floor(ageMin / 60)}h ago`
                  const sentimentTone =
                    s.sentiment === 'smooth'
                      ? 'bg-emerald-500 text-white'
                      : s.sentiment === 'moderate'
                        ? 'bg-amber-500 text-white'
                        : s.sentiment === 'busy'
                          ? 'bg-amber-600 text-white'
                          : 'bg-rose-500 text-white'
                  return (
                    <li
                      key={s.id}
                      className={`flex items-start justify-between gap-3 p-3 rounded-xl border ${rowBg}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-800 font-medium leading-snug">
                          {s.message}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                          <span>{gate?.name ?? s.gate_id}</span>
                          <span>·</span>
                          <span className="font-semibold">
                            {s.source === 'staff' ? '👮 Staff' : '🙋 Fan'}
                          </span>
                          <span>·</span>
                          <span>{rel}</span>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${sentimentTone}`}
                      >
                        {s.sentiment}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </motion.section>

          {/* AI Explanation — same /api/explain-arrival-plan cascade as the
              Arrival Guide. Tone='light' for the white-card surfaces. */}
          <AIExplanationCard
            plan={plan}
            prefs={prefs}
            signals={signals}
            eventName={demoEvent.name}
            venueName="MetLife Stadium"
            ticketSection={(loadSelectedTicket() ?? demoTicket).section}
            title={`Why ${gateLabel} right now`}
            subtitle="AI explanation of the live conditions and your plan"
          />

          {/* Recommendation copy from intelligence */}
          {intelligence.recommendation && (
            <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 flex items-start gap-2 text-[12px] text-slate-700 leading-relaxed">
              <span className="text-violet-600 flex-shrink-0 mt-0.5">💡</span>
              <p>{intelligence.recommendation}</p>
            </div>
          )}

          <p className="text-[10px] text-slate-400 text-center px-4 leading-relaxed">
            Based on current information. Always follow venue signage and staff
            instructions.
          </p>
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
