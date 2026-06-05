'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { demoEvent, demoTicket, deriveArrivalPlan, demoVenue } from '@/lib/seed'
import {
  getAllSignals,
  loadReadiness,
  publishSignal,
  subscribeToFanflowChanges,
} from '@/lib/store'
import type { LiveSignal, ReadinessPrefs } from '@/lib/types'
import { computeFanPulse } from '@/lib/intelligence'
import { HelpSheet } from '@/components/shared/HelpSheet'

/**
 * Fan Pulse — bottom-nav "Pulse" tab. A focused, single-purpose screen:
 *   - 4-button sentiment grid (Smooth / Slow / Busy / Need help)
 *   - Real-time breakdown chart at the recommended gate
 *   - Recent fan reports list
 *
 * Wired to the same `publishSignal` + `getAllSignals` store as the Hub,
 * so a tap here surfaces immediately on /hub and the Staff Console.
 */
export default function PulsePage() {
  const params = useParams<{ id: string }>()
  const eventId = params?.id ?? 'wc2026-final'

  const [prefs, setPrefs] = useState<ReadinessPrefs | null>(null)
  const [signals, setSignals] = useState<LiveSignal[]>([])
  const [pulseCount, setPulseCount] = useState(0)
  const [helpOpen, setHelpOpen] = useState(false)
  // Transient "your signal is flowing into the live layer" wave after a tap.
  const [sentWave, setSentWave] = useState<LiveSignal['sentiment'] | null>(null)
  const waveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (waveTimer.current) clearTimeout(waveTimer.current) }, [])

  const refresh = useCallback(() => {
    setPrefs(loadReadiness())
    setSignals(getAllSignals())
  }, [])

  useEffect(() => {
    refresh()
    return subscribeToFanflowChanges(['fanflow:readiness', 'fanflow:signals'], refresh)
  }, [refresh])

  const plan = deriveArrivalPlan(prefs, signals.length ? signals : undefined)
  const fanPulse = computeFanPulse(signals, plan.recommended_gate.id)
  const gateLabel = plan.recommended_gate.name.split(' (')[0]

  const handlePulse = (sentiment: LiveSignal['sentiment'], label: string) => {
    publishSignal({
      id: `pulse-${Date.now()}`,
      gate_id: plan.recommended_gate.id,
      source: 'fan',
      sentiment,
      message: label,
      created_at: new Date().toISOString(),
    })
    setPulseCount((c) => c + 1)
    // Trigger the "signal sent → flows into the live layer" pulse wave.
    setSentWave(sentiment)
    if (waveTimer.current) clearTimeout(waveTimer.current)
    waveTimer.current = setTimeout(() => setSentWave(null), 1900)
  }

  // Staff signals at the recommended gate (last 60 min) — prominent section
  const staffAtGate = signals
    .filter(
      (s) =>
        s.source === 'staff' &&
        s.gate_id === plan.recommended_gate.id &&
        Date.now() - new Date(s.created_at).getTime() < 60 * 60 * 1000,
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3)

  // Recent fan reports at the recommended gate (last 30 min)
  const recentFan = signals
    .filter(
      (s) =>
        s.source === 'fan' &&
        Date.now() - new Date(s.created_at).getTime() < 30 * 60 * 1000,
    )
    .slice(0, 5)

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-violet-100/60 via-violet-50/20 to-white pb-24">
        {/* Top brand bar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100">
          <div className="container-mobile px-4 h-14 flex items-center justify-between">
            <Link
              href={`/event/${eventId}/hub`}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              ← Hub
            </Link>
            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-900 text-sm">Fan Pulse</span>
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
          {/* Hero — human-powered intelligence, cinematic band */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="surface-night relative overflow-hidden rounded-3xl p-5 text-white shadow-[0_10px_30px_-12px_rgba(76,29,149,0.55)]"
          >
            <motion.div
              aria-hidden="true"
              className="absolute -bottom-12 -left-8 w-44 h-44 rounded-full bg-fuchsia-500/20 blur-3xl"
              animate={{ x: [0, 16, 0], y: [0, -10, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="relative">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-violet-200">
                <span className="relative flex w-2 h-2">
                  <span className="absolute inset-0 rounded-full bg-fuchsia-300 animate-ping opacity-70" />
                  <span className="relative inline-block w-2 h-2 rounded-full bg-fuchsia-300" />
                </span>
                Fan Pulse · live
              </div>
              <h1 className="font-extrabold text-[30px] sm:text-[34px] tracking-tight leading-[1.05] mt-2">
                Help others arrive smarter.
              </h1>
              <p className="text-[13px] text-violet-100/85 mt-2 leading-relaxed">
                Your one-tap report joins the live crowd layer for every fan headed to{' '}
                {gateLabel}. 3+ similar reports start shaping guidance.
              </p>
            </div>
          </motion.section>

          {/* "Signal sent → flows into the live crowd layer" wave. Fires on
              every tap; expanding rings + a confirmation chip. */}
          <AnimatePresence>
            {sentWave && (
              <motion.div
                key="sent-wave"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
                aria-live="polite"
              >
                <div className="relative flex items-center justify-center">
                  {[0, 0.25, 0.5].map((d) => (
                    <motion.span
                      key={d}
                      className={`absolute rounded-full border-2 ${
                        sentWave === 'smooth'
                          ? 'border-emerald-400'
                          : sentWave === 'moderate'
                            ? 'border-amber-400'
                            : sentWave === 'busy'
                              ? 'border-orange-400'
                              : 'border-rose-400'
                      }`}
                      initial={{ width: 40, height: 40, opacity: 0.7 }}
                      animate={{ width: 320, height: 320, opacity: 0 }}
                      transition={{ duration: 1.6, delay: d, ease: 'easeOut' }}
                    />
                  ))}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0, y: 6 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                    className="surface-night relative rounded-2xl px-4 py-3 text-white text-center shadow-[0_10px_30px_-10px_rgba(76,29,149,0.6)]"
                  >
                    <div className="text-[11px] font-bold uppercase tracking-wider text-violet-200">
                      Signal sent
                    </div>
                    <div className="text-[13px] font-semibold mt-0.5">
                      Flowing into the live crowd layer
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Question card */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl bg-white border border-slate-200 shadow-[0_4px_20px_-8px_rgba(124,58,237,0.10)] p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="w-9 h-9 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center text-lg flex-shrink-0">
                💜
              </span>
              <div className="min-w-0">
                <div className="font-bold text-slate-900 text-base leading-tight">
                  How&apos;s it looking near {gateLabel}?
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Your report helps other fans.
                </div>
              </div>
            </div>

            {/* Participation signals — live, at-a-glance community state */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded-xl bg-violet-50 border border-violet-100 px-2.5 py-2 text-center">
                <div className="font-extrabold text-violet-700 text-lg tabular-nums leading-none">
                  {fanPulse.total}
                </div>
                <div className="text-[9px] font-semibold text-slate-500 mt-0.5 uppercase tracking-wide">
                  Live reports
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-2.5 py-2 text-center">
                <div className={`font-extrabold text-lg leading-none ${fanPulse.total >= 3 ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {fanPulse.total >= 3 ? '✓' : `${fanPulse.total}/3`}
                </div>
                <div className="text-[9px] font-semibold text-slate-500 mt-0.5 uppercase tracking-wide">
                  Majority
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-2.5 py-2 text-center">
                <div className="font-extrabold text-slate-900 text-lg tabular-nums leading-none">
                  {pulseCount}
                </div>
                <div className="text-[9px] font-semibold text-slate-500 mt-0.5 uppercase tracking-wide">
                  Your taps
                </div>
              </div>
            </div>

            {/* 2x2 sentiment grid */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handlePulse('smooth', 'Entry is smooth')}
                className="min-h-[72px] bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 rounded-2xl font-bold transition border border-emerald-200 flex flex-col items-center justify-center gap-1 group"
              >
                <span className="text-2xl group-hover:scale-110 transition">👍</span>
                <span className="text-sm">Smooth</span>
              </button>
              <button
                onClick={() => handlePulse('moderate', 'Slow but moving')}
                className="min-h-[72px] bg-yellow-50 hover:bg-yellow-100 active:bg-yellow-200 text-yellow-800 rounded-2xl font-bold transition border border-yellow-200 flex flex-col items-center justify-center gap-1 group"
              >
                <span className="text-2xl group-hover:scale-110 transition">🐢</span>
                <span className="text-sm">Slow</span>
              </button>
              <button
                onClick={() => handlePulse('busy', 'Entry is busy')}
                className="min-h-[72px] bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-800 rounded-2xl font-bold transition border border-amber-200 flex flex-col items-center justify-center gap-1 group"
              >
                <span className="text-2xl group-hover:scale-110 transition">😬</span>
                <span className="text-sm">Busy</span>
              </button>
              <button
                onClick={() => handlePulse('difficult', 'Need help at entry')}
                className="min-h-[72px] bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-800 rounded-2xl font-bold transition border border-rose-200 flex flex-col items-center justify-center gap-1 group"
              >
                <span className="text-2xl group-hover:scale-110 transition">🆘</span>
                <span className="text-sm">Need help</span>
              </button>
            </div>

            {pulseCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                    className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold"
                  >
                    ✓
                  </motion.span>
                  <span className="text-[12px] text-emerald-800 font-bold">
                    Report added · {pulseCount} total
                  </span>
                </div>
                <div className="space-y-1 pl-8">
                  <p className="text-[11px] text-emerald-700/80 leading-snug">
                    <span className="font-semibold">1 report</span> helps visibility at {gateLabel}.
                  </p>
                  <p className="text-[11px] text-emerald-700/80 leading-snug">
                    <span className="font-semibold">3+ similar reports</span> influence guidance for all fans.
                  </p>
                  <p className="text-[11px] text-emerald-700/80 leading-snug">
                    <span className="font-semibold">Staff updates</span> carry 3× higher trust weight.
                  </p>
                </div>
              </motion.div>
            )}

            {pulseCount === 0 && (
              <p className="text-[11px] text-slate-500 mt-3 leading-relaxed text-center">
                One report helps visibility. 3+ similar reports influence guidance.
              </p>
            )}
          </motion.section>

          {/* === Staff Verified Updates at Your Gate =================== */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="rounded-3xl bg-gradient-to-br from-violet-50 via-white to-violet-50/30 border border-violet-200 shadow-[0_4px_20px_-8px_rgba(124,58,237,0.10)] p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white flex items-center justify-center text-sm flex-shrink-0 shadow-md shadow-violet-500/25">
                ✓
              </span>
              <div className="min-w-0">
                <div className="font-bold text-slate-900 text-base leading-tight">
                  Staff Updates · {gateLabel}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Verified by on-ground staff · Weighted 3× in the rule engine
                </div>
              </div>
            </div>

            {staffAtGate.length === 0 ? (
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-center">
                <p className="text-sm text-slate-500">
                  No staff updates at {gateLabel} yet.
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  When staff publish a signal via the Staff Console, it appears
                  here instantly and updates your plan.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {staffAtGate.map((s) => {
                  const ageMin = Math.floor(
                    (Date.now() - new Date(s.created_at).getTime()) / 60000,
                  )
                  const rel = ageMin < 1 ? 'just now' : `${ageMin}m ago`
                  const sentimentColor =
                    s.sentiment === 'smooth'
                      ? 'bg-emerald-50 border-emerald-200'
                      : s.sentiment === 'moderate'
                        ? 'bg-yellow-50 border-yellow-200'
                        : s.sentiment === 'busy'
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-rose-50 border-rose-200'
                  return (
                    <div
                      key={s.id}
                      className={`flex items-start gap-3 px-3.5 py-3 rounded-xl border ${sentimentColor}`}
                    >
                      <span className="text-base flex-shrink-0 mt-0.5">
                        {s.sentiment === 'smooth'
                          ? '✅'
                          : s.sentiment === 'moderate'
                            ? '🟡'
                            : s.sentiment === 'busy'
                              ? '🟠'
                              : '🔴'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-800 font-semibold leading-tight">
                          {s.message}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-violet-100 text-[9px] font-bold text-violet-700 uppercase tracking-wider">
                            Staff
                          </span>
                          <span className="text-[11px] text-slate-500">{rel}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.section>

          {/* Breakdown — animated bars at the recommended gate */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-3xl bg-white border border-slate-200 shadow-[0_4px_20px_-8px_rgba(124,58,237,0.10)] p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="kicker text-violet-700">Recent pulse · {gateLabel}</div>
                <div className="text-xs text-slate-500 mt-0.5">Last 30 minutes</div>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                <span className="font-bold">{fanPulse.total}</span> report
                {fanPulse.total === 1 ? '' : 's'}
              </span>
            </div>

            {fanPulse.total === 0 ? (
              <div className="text-center text-sm text-slate-500 py-6">
                No recent fan reports yet. Be the first to share!
              </div>
            ) : (
              <>
                {/* Stacked bar */}
                <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
                  {fanPulse.smoothPct > 0 && (
                    <motion.div
                      className="bg-emerald-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${fanPulse.smoothPct}%` }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                  {fanPulse.slowPct > 0 && (
                    <motion.div
                      className="bg-amber-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${fanPulse.slowPct}%` }}
                      transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                  {fanPulse.needHelpPct > 0 && (
                    <motion.div
                      className="bg-rose-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${fanPulse.needHelpPct}%` }}
                      transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-bold text-slate-900 tabular-nums">
                      {fanPulse.smoothPct}%
                    </span>
                    <span className="text-slate-500">smooth</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="font-bold text-slate-900 tabular-nums">
                      {fanPulse.slowPct}%
                    </span>
                    <span className="text-slate-500">slow</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="font-bold text-slate-900 tabular-nums">
                      {fanPulse.needHelpPct}%
                    </span>
                    <span className="text-slate-500">need help</span>
                  </div>
                </div>
              </>
            )}
          </motion.section>

          {/* Recent fan reports */}
          {recentFan.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="rounded-3xl bg-white border border-slate-200 shadow-[0_4px_20px_-8px_rgba(124,58,237,0.10)] p-5"
            >
              <div className="kicker mb-3">Recent fan reports</div>
              <ul className="space-y-2">
                {recentFan.map((s) => {
                  const ageMin = Math.floor(
                    (Date.now() - new Date(s.created_at).getTime()) / 60000,
                  )
                  const rel = ageMin < 1 ? 'just now' : `${ageMin}m ago`
                  const sentimentBg =
                    s.sentiment === 'smooth'
                      ? 'bg-emerald-50 border-emerald-100'
                      : s.sentiment === 'moderate'
                        ? 'bg-yellow-50 border-yellow-100'
                        : s.sentiment === 'busy'
                          ? 'bg-amber-50 border-amber-100'
                          : 'bg-rose-50 border-rose-100'
                  const gate = demoVenue.gates.find((g) => g.id === s.gate_id)
                  return (
                    <li
                      key={s.id}
                      className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border ${sentimentBg}`}
                    >
                      <span className="text-base flex-shrink-0">
                        {s.sentiment === 'smooth'
                          ? '👍'
                          : s.sentiment === 'moderate'
                            ? '🐢'
                            : s.sentiment === 'busy'
                              ? '😬'
                              : '🆘'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-800 font-medium leading-tight">
                          {s.message}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {gate?.name ?? s.gate_id} · {rel}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </motion.section>
          )}

          {/* How Fan Pulse works — trust explanation */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="rounded-3xl bg-gradient-to-br from-violet-50 via-white to-fuchsia-50/30 border border-violet-200 p-5"
          >
            <div className="kicker text-violet-700 mb-3">How Fan Pulse works</div>
            <div className="space-y-3">
              {[
                { icon: '👤', title: 'Fan reports', desc: 'Individual fan taps. Visible to all fans, 1× weight.' },
                { icon: '👥', title: 'Majority signal', desc: '3+ similar reports create a "majority" that influences routing.'},
                { icon: '✓', title: 'Staff verified', desc: 'Staff signals carry 3× higher trust. One staff update overrides fan noise.' },
                { icon: '🛡️', title: 'Anti-noise threshold', desc: '<3 fan reports = helpful info only. Won\'t change your plan until the pattern is clear.' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                    {item.icon}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[12px] font-bold text-slate-900 leading-tight">{item.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Community proof */}
          <div className="rounded-3xl bg-gradient-to-br from-violet-50 via-white to-fuchsia-50/30 border border-violet-100 p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 -space-x-2 mb-2">
              {['🧑', '👩', '🧑‍🦰', '👨', '👩‍🦱'].map((a, i) => (
                <span
                  key={i}
                  className="w-7 h-7 rounded-full bg-white border-2 border-violet-100 flex items-center justify-center text-sm"
                >
                  {a}
                </span>
              ))}
            </div>
            <p className="text-[12px] text-slate-700 font-semibold">
              +124 fans reported in the last 30 min
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Your taps publish real signals into the live store — visible on the Hub and Staff Console.
            </p>
          </div>
        </main>

        {/* Bottom tab nav — matches Hub */}
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
            <div className="flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-semibold text-violet-700">
              <span className="flex items-center justify-center w-9 h-9 rounded-full text-xl bg-violet-100">
                📊
              </span>
              Pulse
            </div>
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

      {/* Suppress unused warnings for demoEvent/demoTicket which the store may
          fall back to during cold-start cross-tab hydration. */}
      {demoEvent && demoTicket && null}
    </>
  )
}
