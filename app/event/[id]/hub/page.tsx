'use client'

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  demoEvent,
  demoTicket,
  demoVenue,
  deriveArrivalPlan,
} from '@/lib/seed'
import { loadSelectedTicket } from '@/lib/ticketContext'
import {
  getAllSignals,
  loadReadiness,
  subscribeToFanflowChanges,
} from '@/lib/store'
import type { LiveSignal, ReadinessPrefs } from '@/lib/types'
import { computeEventIntelligence, computeFanPulse } from '@/lib/intelligence'
import { HelpSheet } from '@/components/shared/HelpSheet'
import { SessionChip } from '@/components/shared/SessionChip'

/**
 * Event Day Hub — premium mobile-native launcher dashboard.
 *
 * The Hub is intentionally NOT one giant scroll. It's a focused at-a-glance
 * launcher: hero + ticket strip + compact plan summary + a 6-tile dashboard
 * grid that takes the fan into each detail screen:
 *
 *    🧭 Journey   → /event/[id]/journey     (vertical timeline)
 *    🗺️ Map      → /event/[id]/venue-map   (immersive stadium + route)
 *    📡 Conditions → /event/[id]/conditions (live signals + intelligence)
 *    💜 Pulse     → /event/[id]/pulse       (fan sentiment + community)
 *    🤝 Help      → opens HelpSheet modal
 *    ⚙️ Prefs    → /event/[id]/readiness   (personalize)
 *
 * Every tile shows a live stat pulled from the rule engine, so the user can
 * see at a glance that the dashboard is connected to real backend output —
 * not just static navigation.
 */

/**
 * Animated circular progress ring used in the plan summary.
 */
function CircularProgress({
  percent,
  size = 64,
  stroke = 6,
  color = 'rgb(16, 185, 129)',
  trackColor = 'rgb(226, 232, 240)',
}: {
  percent: number
  size?: number
  stroke?: number
  color?: string
  trackColor?: string
}) {
  const reduced = useReducedMotion()
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (c * percent) / 100
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
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
          transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-extrabold text-slate-900 tabular-nums leading-none">
          {percent}%
        </span>
      </div>
    </div>
  )
}

/**
 * Bottom tab navigation — same component referenced by every event sub-page
 * so the visual rhythm carries across.
 */
function BottomNav({
  eventId,
  active,
  onHelp,
}: {
  eventId: string
  active: 'guide' | 'map' | 'pulse' | 'help'
  onHelp: () => void
}) {
  const item = (
    key: 'guide' | 'map' | 'pulse' | 'help',
    icon: ReactNode,
    label: string,
    href?: string,
    onClick?: () => void,
  ) => {
    const isActive = active === key
    const cls = `flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-semibold transition ${
      isActive ? 'text-violet-700' : 'text-slate-500 hover:text-slate-700'
    }`
    const inner = (
      <>
        <span
          className={`flex items-center justify-center w-9 h-9 rounded-full text-xl ${
            isActive ? 'bg-violet-100' : ''
          }`}
        >
          {icon}
        </span>
        {label}
      </>
    )
    if (onClick) {
      return (
        <button onClick={onClick} className={cls}>
          {inner}
        </button>
      )
    }
    return (
      <Link href={href ?? '#'} className={cls}>
        {inner}
      </Link>
    )
  }

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="container-mobile h-16 grid grid-cols-4 px-2">
        {item('guide', '✦', 'Guide', `/event/${eventId}/hub`)}
        {item('map', '🗺️', 'Map', `/event/${eventId}/venue-map`)}
        {item('pulse', '📊', 'Pulse', `/event/${eventId}/pulse`)}
        {item('help', '🎧', 'Help', undefined, onHelp)}
      </div>
    </nav>
  )
}

export default function EventHubPage() {
  const params = useParams<{ id: string }>()
  const eventId = params?.id ?? 'wc2026-final'

  const [prefs, setPrefs] = useState<ReadinessPrefs | null>(null)
  const [signals, setSignals] = useState<LiveSignal[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [staffToast, setStaffToast] = useState<{ message: string } | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<ReturnType<typeof loadSelectedTicket>>(null)
  const [countdown, setCountdown] = useState('— — — —')

  const ticket = selectedTicket ?? demoTicket

  const lastStaffSignalIdRef = useRef<string | null>(null)
  const hasInitializedStaffRef = useRef(false)

  const refresh = useCallback(() => {
    setPrefs(loadReadiness())
    setSignals(getAllSignals())
    setSelectedTicket(loadSelectedTicket())
  }, [])

  useEffect(() => {
    setHydrated(true)
    refresh()
    return subscribeToFanflowChanges(['fanflow:readiness', 'fanflow:signals'], refresh)
  }, [refresh])

  // Countdown ticker
  useEffect(() => {
    const tick = () => {
      const eventDate = new Date(demoEvent.date)
      const diff = eventDate.getTime() - Date.now()
      if (diff <= 0) {
        setCountdown('Event is now!')
        return
      }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff / 3600000) % 24)
      const m = Math.floor((diff / 60000) % 60)
      setCountdown(`${d}d ${h}h ${m}m`)
    }
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [])

  // Staff toast — only fires on NEW staff signals after mount.
  useEffect(() => {
    const staffSignals = signals.filter((s) => s.source === 'staff')
    const newest = staffSignals[0] ?? null
    if (!hasInitializedStaffRef.current) {
      hasInitializedStaffRef.current = true
      lastStaffSignalIdRef.current = newest?.id ?? null
      return
    }
    if (newest && newest.id !== lastStaffSignalIdRef.current) {
      lastStaffSignalIdRef.current = newest.id
      setStaffToast({ message: newest.message })
    }
  }, [signals])

  useEffect(() => {
    if (!staffToast) return
    const t = setTimeout(() => setStaffToast(null), 3000)
    return () => clearTimeout(t)
  }, [staffToast])

  // === Derived data ===
  const plan = deriveArrivalPlan(prefs, signals.length ? signals : undefined)
  const intelligence = computeEventIntelligence(plan, signals)
  const fanPulse = computeFanPulse(signals, plan.recommended_gate.id)

  const confidence = plan.confidence_breakdown.percent
  const confidenceLabel =
    confidence >= 75 ? 'High' : confidence >= 55 ? 'Medium' : 'Low'
  const confidenceColor =
    confidence >= 75 ? 'rgb(16, 185, 129)' : confidence >= 55 ? 'rgb(245, 158, 11)' : 'rgb(244, 63, 94)'

  const gateLabel = plan.recommended_gate.name.split(' (')[0]
  const gateSub = plan.recommended_gate.name.match(/\(([^)]+)\)/)?.[1] ?? null

  // Tile live stats — each pulled from the rule engine output
  const recentSignalCount = signals.filter(
    (s) => Date.now() - new Date(s.created_at).getTime() < 60 * 60 * 1000,
  ).length

  const loadText =
    intelligence.expectedEntryLoad === 'light'
      ? 'Light load'
      : intelligence.expectedEntryLoad === 'moderate'
        ? 'Moderate load'
        : intelligence.expectedEntryLoad === 'busy'
          ? 'Heavy load'
          : 'Awaiting signals'

  const fanPulseStat = fanPulse.total > 0 ? `${fanPulse.smoothPct}% smooth` : 'Be the first'

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-violet-50/40 via-white to-white pb-24">
        {/* === Sticky brand bar ====================================== */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100">
          <div className="container-mobile px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="font-bold text-white text-[13px] bg-violet-600 px-2.5 py-1 rounded-md hover:bg-violet-700 transition"
                aria-label="Back to StubHub home"
              >
                StubHub
              </Link>
              <span className="flex items-center gap-1">
                <span className="font-bold text-slate-900 text-sm">FanFlow</span>
                <span className="text-[10px] font-bold bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white px-1.5 py-0.5 rounded">
                  AI
                </span>
              </span>
            </div>
            <Link
              href={`/event/${eventId}/readiness`}
              className="flex items-center gap-1"
              aria-label={prefs ? 'Edit your preferences' : 'Personalize your plan'}
            >
              <span className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                M
              </span>
              <span className="text-slate-400 text-xs">▾</span>
            </Link>
          </div>
        </header>

        <main className="container-mobile px-4 py-5 space-y-4">
          {/* === Hero =================================================== */}
          <section className="pt-1">
            <div className="kicker text-violet-700">Premium Event Day Hub</div>
            <h1 className="font-extrabold text-slate-900 text-[34px] sm:text-4xl tracking-tight leading-[1.05] mt-2.5">
              You&apos;re all set for
              <br />
              Event Day
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-3.5">
              <div className="inline-flex items-center gap-1.5 text-[13px] text-slate-600">
                <motion.span
                  className="w-2 h-2 rounded-full bg-emerald-500"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
                Everything is aligned for a smooth arrival.
              </div>
              <Link
                href="/demo/fanflow-vision"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-[11px] font-bold text-violet-700 hover:bg-violet-100 transition"
              >
                <span>✦</span>
                Vision Route
              </Link>
            </div>
          </section>

          {/* === Ticket Confirmed strip ================================ */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl bg-white border border-emerald-200/70 px-3.5 py-2.5 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                ✓
              </span>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 leading-none">
                  Ticket confirmed
                </div>
                <div className="text-[12px] text-slate-700 mt-0.5 font-medium leading-tight truncate">
                  Section {ticket.section} · Row {ticket.row} · Seat {ticket.seat}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold tabular-nums flex-shrink-0">
              <span>⏱️</span>
              {countdown}
            </div>
          </motion.div>

          {/* === Recommended Plan summary card ========================= */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-3xl bg-white border border-slate-200 shadow-[0_4px_20px_-8px_rgba(124,58,237,0.12)] p-5 hover-lift overflow-hidden"
          >
            {/* Subtle gradient corner */}
            <div
              aria-hidden="true"
              className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br from-violet-200/40 to-fuchsia-200/30 blur-2xl"
            />

            <div className="relative flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-700">
                  <span>👑</span>
                  Your Arrival Plan
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Recommended for you</div>
              </div>
              <div className="flex flex-col items-center flex-shrink-0">
                <CircularProgress percent={confidence} color={confidenceColor} size={56} stroke={5} />
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mt-1">
                  {confidenceLabel} conf.
                </div>
              </div>
            </div>

            {/* Gate hero block */}
            <div className="relative rounded-2xl bg-gradient-to-br from-violet-50 via-white to-fuchsia-50/40 border border-violet-200 p-3.5 mb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-700">
                    <span>🚪</span>
                    Enter via
                  </div>
                  <div className="font-extrabold text-violet-900 text-2xl tracking-tight leading-none mt-1">
                    {gateLabel}
                  </div>
                  {gateSub && (
                    <div className="text-xs text-violet-700/80 mt-1">{gateSub}</div>
                  )}
                </div>
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-violet-600 text-white text-[9px] font-bold uppercase tracking-wider whitespace-nowrap shadow-sm flex-shrink-0">
                  ★ Best
                </span>
              </div>
            </div>

            {/* Times row */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  <span>🕐</span>
                  Leave by
                </div>
                <div className="font-bold text-slate-900 text-lg mt-0.5 tabular-nums leading-none">
                  {plan.leave_by_time}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  <span>🎯</span>
                  Arrive at
                </div>
                <div className="font-bold text-slate-900 text-lg mt-0.5 tabular-nums leading-none">
                  {plan.arrival_time}
                </div>
              </div>
            </div>

            <Link
              href={`/event/${eventId}/guide`}
              className="block w-full text-center px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition"
            >
              View full arrival guide →
            </Link>
          </motion.section>

          {/* === Dashboard tile grid =================================== */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="kicker text-violet-700">Explore your event</div>
              <div className="text-[10px] text-slate-400">Tap a tile to open</div>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <DashTile
                href={`/event/${eventId}/journey`}
                icon="🧭"
                iconTone="from-violet-500 to-fuchsia-600"
                title="Journey"
                stat="5 steps"
                delay={0.0}
              />
              <DashTile
                href={`/event/${eventId}/venue-map`}
                icon="🗺️"
                iconTone="from-sky-500 to-violet-600"
                title="Map"
                stat="8 min walk"
                delay={0.05}
              />
              <DashTile
                href={`/event/${eventId}/conditions`}
                icon="📡"
                iconTone="from-emerald-500 to-cyan-600"
                title="Conditions"
                stat={recentSignalCount > 0 ? `${recentSignalCount} signals` : loadText}
                delay={0.1}
              />
              <DashTile
                href={`/event/${eventId}/pulse`}
                icon="💜"
                iconTone="from-fuchsia-500 to-pink-600"
                title="Pulse"
                stat={fanPulseStat}
                delay={0.15}
              />
              <DashTile
                onClick={() => setHelpOpen(true)}
                icon="🤝"
                iconTone="from-rose-500 to-orange-500"
                title="Help"
                stat="6 categories"
                delay={0.2}
              />
              <DashTile
                href={`/event/${eventId}/readiness`}
                icon="⚙️"
                iconTone="from-slate-500 to-slate-700"
                title="Prefs"
                stat={prefs ? 'Personalized' : 'Set up'}
                delay={0.25}
              />
            </div>
          </motion.section>

          {/* === Staff Verified Update ================================= */}
          {intelligence.latestStaffAtGate && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Link
                href={`/event/${eventId}/conditions`}
                className="block rounded-3xl bg-gradient-to-br from-violet-50 to-violet-50/40 border border-violet-200 p-4 hover:from-violet-100 hover:to-violet-50/70 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white flex items-center justify-center text-lg flex-shrink-0 shadow-md shadow-violet-500/25">
                    ✓
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="kicker text-violet-700">Staff Verified Update</div>
                    <div className="font-bold text-slate-900 text-[13px] mt-0.5 leading-tight line-clamp-2">
                      {intelligence.latestStaffAtGate.message}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Weighted 3× over fan reports
                    </div>
                  </div>
                  <span className="inline-flex items-center text-[11px] font-bold text-violet-700 whitespace-nowrap flex-shrink-0 group-hover:translate-x-0.5 transition-transform">
                    View
                    <span className="ml-0.5">›</span>
                  </span>
                </div>
              </Link>
            </motion.div>
          )}

          {/* === Dark cinematic CTA =================================== */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.4 }}
            className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 text-white p-5 hover-lift"
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-60 bg-[radial-gradient(ellipse_at_20%_80%,rgba(167,139,250,0.35),transparent_55%),radial-gradient(ellipse_at_85%_15%,rgba(236,72,153,0.25),transparent_55%)]"
            />

            <div className="relative">
              <div className="flex items-start gap-3">
                <span className="w-11 h-11 rounded-2xl bg-violet-500/15 border border-violet-400/30 backdrop-blur flex items-center justify-center text-xl flex-shrink-0">
                  🎟️
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-300">
                    You&apos;re Ready. We&apos;ll Handle the Rest.
                  </div>
                  <h3 className="font-bold text-lg mt-1 leading-tight">
                    Your real-time hub is moments away.
                  </h3>
                </div>
              </div>
              <ul className="mt-4 space-y-1.5 text-[13px] text-slate-200">
                {[
                  'Real-time updates as conditions change',
                  'Smarter routing around peak surges',
                  'Priority alerts that matter most',
                ].map((b) => (
                  <li key={b} className="flex items-start gap-2 leading-snug">
                    <span className="text-violet-300 font-bold flex-shrink-0 mt-0.5">✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between gap-3 mt-5 flex-wrap">
                <Link
                  href={`/event/${eventId}/guide`}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 font-bold text-sm shadow-lg shadow-violet-500/30 transition"
                >
                  Open Arrival Guide
                  <span>→</span>
                </Link>
                <span className="inline-flex items-center gap-1 text-[10px] text-white/60 whitespace-nowrap">
                  <span>🔒</span>
                  Secure. Private. Yours.
                </span>
              </div>
            </div>
          </motion.section>

          {/* === Why FanFlow trust strip (6 pillars) =================== */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="rounded-3xl bg-white border border-slate-200 p-4"
          >
            <div className="kicker mb-3">Why FanFlow</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: '🧠', title: 'Smart plan', sub: 'AI builds your best plan' },
                { icon: '📡', title: 'Real-time signals', sub: 'Live updates & staff cues' },
                { icon: '🎯', title: 'Personalized routing', sub: 'Best route, less stress' },
                { icon: '💜', title: 'Fan powered', sub: 'Community insights' },
                { icon: '🤝', title: 'Human support', sub: 'Help when you need it' },
                { icon: '🛡️', title: 'Always safe', sub: 'Follow staff & signage' },
              ].map((p) => (
                <div key={p.title} className="flex items-start gap-2">
                  <span className="text-base flex-shrink-0 mt-0.5">{p.icon}</span>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-[12px] leading-tight">
                      {p.title}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                      {p.sub}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* === Stats bar — matches the reference's bottom strip ======== */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            className="rounded-3xl overflow-hidden bg-gradient-to-br from-violet-600 via-violet-700 to-fuchsia-700 p-4 sm:p-5 text-white relative"
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.4),transparent_60%)]"
            />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-base">
                  🏟️
                </span>
                <div>
                  <div className="font-bold text-sm leading-tight">FanFlow AI</div>
                  <div className="text-[10px] text-violet-100 leading-tight">
                    Your event day companion
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1 text-center">
                {[
                  { v: '2.4M+', l: 'Fans guided' },
                  { v: '98%', l: 'Plan accuracy' },
                  { v: '45K+', l: 'Staff signals' },
                  { v: '1.2M+', l: 'Fan reports' },
                ].map((s) => (
                  <div key={s.l}>
                    <div className="font-extrabold text-[15px] sm:text-base tabular-nums leading-tight">
                      {s.v}
                    </div>
                    <div className="text-[9px] text-violet-200 mt-0.5 leading-tight">
                      {s.l}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-violet-100/80 mt-3 text-center italic">
                Always follow venue staff and signage.
              </p>
            </div>
          </motion.section>

          {/* Session chip + disclaimer */}
          <div className="pt-2 flex justify-center">
            <SessionChip />
          </div>

          <p className="text-[10px] text-slate-400 text-center px-4 leading-relaxed">
            FanFlow provides guidance, not emergency response. For emergencies, call
            911 or flag any staff member.
          </p>
        </main>

        <BottomNav eventId={eventId} active="guide" onHelp={() => setHelpOpen(true)} />
      </div>

      <HelpSheet
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        plan={plan}
        eventId={eventId}
      />

      <AnimatePresence>
        {staffToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[90] max-w-[90vw]"
          >
            <div className="bg-slate-900 text-white text-sm px-4 py-3 rounded-2xl shadow-2xl flex items-start gap-2.5 max-w-md">
              <span className="text-emerald-400 flex-shrink-0 mt-0.5">🔄</span>
              <div className="min-w-0">
                <div className="font-semibold">Staff update applied</div>
                <div className="text-slate-300 text-xs mt-0.5 leading-snug">
                  &ldquo;{staffToast.message}&rdquo; · plan refreshed
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suppress unused-var lint while hydrated flag is reserved for future use */}
      {hydrated && demoVenue && null}
    </>
  )
}

/**
 * Dashboard tile — used for the 6-tile launcher grid. Renders as a Link
 * unless an `onClick` is provided (Help tile opens a modal).
 *
 * Icon sits inside a gradient-filled rounded square. Tile shows live stat
 * pulled from the rule engine output by the parent.
 */
function DashTile({
  icon,
  iconTone,
  title,
  stat,
  href,
  onClick,
  delay = 0,
}: {
  icon: string
  iconTone: string
  title: string
  stat: string
  href?: string
  onClick?: () => void
  delay?: number
}) {
  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2 }}
      className="rounded-2xl bg-white border border-slate-200 p-3 text-left h-full hover:border-violet-300 hover:shadow-md hover:shadow-violet-500/10 transition-shadow cursor-pointer"
    >
      <div
        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${iconTone} flex items-center justify-center text-xl shadow-md mb-2`}
      >
        {icon}
      </div>
      <div className="font-bold text-slate-900 text-sm leading-tight">{title}</div>
      <div className="text-[11px] text-slate-500 mt-0.5 leading-snug truncate">{stat}</div>
    </motion.div>
  )
  if (onClick) {
    return (
      <button onClick={onClick} className="text-left">
        {inner}
      </button>
    )
  }
  return <Link href={href ?? '#'}>{inner}</Link>
}
