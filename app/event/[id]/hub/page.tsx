'use client'

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  demoEvent,
  demoTicket,
  deriveArrivalPlan,
} from '@/lib/seed'
import { loadSelectedTicket } from '@/lib/ticketContext'
import {
  getAllSignals,
  loadReadiness,
  saveReadiness,
  subscribeToFanflowChanges,
} from '@/lib/store'
import type {
  AccessibilityNeed,
  ArrivalPlan,
  ArrivalPreference,
  BringingItem,
  FanPriority,
  GroupType,
  LiveSignal,
  ReadinessPrefs,
  TransportMode,
  VenueExperience,
} from '@/lib/types'
import { computeEventIntelligence, computeFanPulse } from '@/lib/intelligence'
import type { EventIntelligence, FanPulseBreakdown } from '@/lib/intelligence'
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
      <svg width={size} height={size} className="-rotate-90" style={{ filter: `drop-shadow(0 0 4px ${color}40)` }}>
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
 * Animated count-up text — parses "2.4M+" style strings and animates the
 * numeric prefix from 0 to target when scrolled into view. Falls back to
 * the static string for users who prefer reduced motion.
 */
function CountUpText({ text }: { text: string }) {
  const [inView, setInView] = useState(false)
  const [progress, setProgress] = useState(0)
  const reduced = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold: 0.5 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!inView) return
    if (reduced) { setProgress(1); return }
    const start = Date.now()
    const dur = 1400
    let raf: number
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / dur)
      setProgress(1 - Math.pow(1 - p, 3)) // ease-out cubic
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, reduced])

  const match = text.match(/^([\d.]+)(.*)$/)
  if (!match) return <span ref={ref}>{text}</span>
  const target = parseFloat(match[1])
  const suffix = match[2]
  const decimals = match[1].includes('.') ? match[1].split('.')[1].length : 0
  return <span ref={ref}>{(target * progress).toFixed(decimals)}{suffix}</span>
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
        <span className="relative flex items-center justify-center w-9 h-9 rounded-full text-xl">
          {isActive && (
            <motion.span
              layoutId="nav-active"
              className="absolute inset-0 rounded-full bg-violet-100"
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            />
          )}
          <span className="relative">{icon}</span>
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
                <span className="relative flex items-center justify-center w-4 h-4 flex-shrink-0">
                  <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-[ff-pulse-ring_2s_ease-out_infinite]" />
                  <motion.span
                    className="relative w-2 h-2 rounded-full bg-emerald-500"
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </span>
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
            className="relative overflow-hidden rounded-2xl bg-white border border-emerald-200/70 px-3.5 py-2.5 flex items-center justify-between gap-3"
          >
            <div className="shimmer-overlay" aria-hidden="true" />
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
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.3 }}
                    className="font-extrabold text-violet-900 text-2xl tracking-tight leading-none mt-1"
                  >
                    {gateLabel}
                  </motion.div>
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

          {/* === Inline Personalization Prompt ========================= */}
          {!prefs && (
            <PersonalizationPrompt onSaved={refresh} eventId={eventId} />
          )}

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
                stat={`${gateLabel} route`}
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
                stat="Nearby support"
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

          {/* === Event Flow Status Bar ================================ */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <Link
              href={`/event/${eventId}/conditions`}
              className="block rounded-3xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 p-4 hover:border-violet-300 transition-colors group"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="relative flex items-center justify-center w-4 h-4 flex-shrink-0">
                  <span
                    className="absolute inset-0 rounded-full animate-[ff-pulse-ring_2s_ease-out_infinite]"
                    style={{
                      backgroundColor:
                        intelligence.expectedEntryLoad === 'light'
                          ? 'rgba(16,185,129,0.3)'
                          : intelligence.expectedEntryLoad === 'moderate'
                            ? 'rgba(245,158,11,0.3)'
                            : intelligence.expectedEntryLoad === 'busy'
                              ? 'rgba(244,63,94,0.3)'
                              : 'rgba(148,163,184,0.3)',
                    }}
                  />
                  <motion.span
                    className="relative w-2 h-2 rounded-full"
                    style={{
                      backgroundColor:
                        intelligence.expectedEntryLoad === 'light'
                          ? '#10b981'
                          : intelligence.expectedEntryLoad === 'moderate'
                            ? '#f59e0b'
                            : intelligence.expectedEntryLoad === 'busy'
                              ? '#f43f5e'
                              : '#94a3b8',
                    }}
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Event Flow
                </span>
                <span className="text-[10px] text-slate-400 ml-auto group-hover:translate-x-0.5 transition-transform">
                  Details ›
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-[10px] text-slate-500 font-medium">Entry</div>
                  <div className={`font-bold text-sm mt-0.5 ${
                    intelligence.expectedEntryLoad === 'light'
                      ? 'text-emerald-700'
                      : intelligence.expectedEntryLoad === 'moderate'
                        ? 'text-amber-700'
                        : intelligence.expectedEntryLoad === 'busy'
                          ? 'text-rose-700'
                          : 'text-slate-500'
                  }`}>
                    {intelligence.expectedEntryLoad === 'light'
                      ? 'Smooth'
                      : intelligence.expectedEntryLoad === 'moderate'
                        ? 'Moderate'
                        : intelligence.expectedEntryLoad === 'busy'
                          ? 'Heavy'
                          : 'Awaiting'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-medium">Peak</div>
                  <div className="font-bold text-sm text-slate-900 mt-0.5 tabular-nums">
                    {intelligence.peakWindow.split(' – ')[0]}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-medium">Fan Reports</div>
                  <div className="font-bold text-sm text-slate-900 mt-0.5 tabular-nums">
                    {fanPulse.total > 0 ? `${fanPulse.total} recent` : 'None yet'}
                  </div>
                </div>
              </div>
              {intelligence.avoidsPeak && (
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold"
                >
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.4 }}
                  >
                    ✓
                  </motion.span>
                  Your plan avoids peak congestion
                </motion.div>
              )}
            </Link>
          </motion.section>

          {/* === Staff Verified Update ================================= */}
          {intelligence.latestStaffAtGate && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                href={`/event/${eventId}/pulse`}
                className="block rounded-3xl bg-gradient-to-br from-violet-50 to-violet-50/40 border border-violet-200 p-4 hover:from-violet-100 hover:to-violet-50/70 transition-colors group shadow-[0_0_0_0_rgba(124,58,237,0)] hover:shadow-[0_0_12px_-2px_rgba(124,58,237,0.15)]"
              >
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white flex items-center justify-center text-lg flex-shrink-0 shadow-md shadow-violet-500/25">
                    ✓
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="kicker text-violet-700">Staff Update · {gateLabel}</div>
                    <div className="font-bold text-slate-900 text-[13px] mt-0.5 leading-tight line-clamp-2">
                      {intelligence.latestStaffAtGate.message}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Verified · Weighted 3× over fan reports
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

          {/* === Personalized Smart Alerts ============================== */}
          <SmartAlerts
            prefs={prefs}
            plan={plan}
            intelligence={intelligence}
            fanPulse={fanPulse}
            eventId={eventId}
            onHelp={() => setHelpOpen(true)}
          />

          {/* === Safety Assurance ======================================= */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 border border-emerald-200 p-4"
          >
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-lg flex-shrink-0">
                🛡️
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 text-[13px] leading-tight">
                  You&apos;re covered before, during, and after entry
                </div>
                <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                  FanFlow is working alongside venue staff to help you arrive
                  confidently. Your route, gate conditions, and nearby support are
                  all monitored — so you can focus on enjoying the event.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {[
                    'Live gate updates',
                    'Staff-verified conditions',
                    'Nearby help mapped',
                    'Real-time routing',
                  ].map((tag, i) => (
                    <motion.span
                      key={tag}
                      initial={{ opacity: 0, scale: 0.85, y: 4 }}
                      whileInView={{ opacity: 1, scale: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: 0.1 * i + 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-[10px] font-semibold text-emerald-800"
                    >
                      ✓ {tag}
                    </motion.span>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          {/* === Dark cinematic CTA =================================== */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55 }}
            className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 text-white p-5 hover-lift"
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-60 bg-[radial-gradient(ellipse_at_20%_80%,rgba(167,139,250,0.35),transparent_55%),radial-gradient(ellipse_at_85%_15%,rgba(236,72,153,0.25),transparent_55%)]"
            />
            {/* Floating light orbs — drift slowly for a cinematic ambient feel */}
            <motion.div
              aria-hidden="true"
              className="absolute w-56 h-56 rounded-full bg-violet-400/15 blur-3xl"
              animate={{ x: [0, 40, 0], y: [0, -25, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              style={{ top: '-10%', left: '5%' }}
            />
            <motion.div
              aria-hidden="true"
              className="absolute w-44 h-44 rounded-full bg-fuchsia-400/10 blur-3xl"
              animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              style={{ bottom: '0%', right: '0%' }}
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
                ].map((b, i) => (
                  <motion.li
                    key={b}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.12 * i + 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-start gap-2 leading-snug"
                  >
                    <span className="text-violet-300 font-bold flex-shrink-0 mt-0.5">✓</span>
                    <span>{b}</span>
                  </motion.li>
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
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
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
              ].map((p, i) => (
                <motion.div
                  key={p.title}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.4, delay: 0.07 * i, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-start gap-2"
                >
                  <motion.span
                    className="text-base flex-shrink-0 mt-0.5"
                    whileHover={{ scale: 1.25, rotate: [0, -8, 8, 0], transition: { duration: 0.3 } }}
                  >
                    {p.icon}
                  </motion.span>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-[12px] leading-tight">
                      {p.title}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                      {p.sub}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* === Stats bar — matches the reference's bottom strip ======== */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl overflow-hidden bg-gradient-to-br from-violet-600 via-violet-700 to-fuchsia-700 p-4 sm:p-5 text-white relative"
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.4),transparent_60%)]"
            />
            <div className="shimmer-overlay" aria-hidden="true" />
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
                      <CountUpText text={s.v} />
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
      {hydrated && null}
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
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3, scale: 1.02, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.96, transition: { duration: 0.1 } }}
      className="rounded-2xl bg-white border border-slate-200 p-3 text-left h-full hover:border-violet-300 hover:shadow-lg hover:shadow-violet-500/15 transition-shadow cursor-pointer"
    >
      <motion.div
        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${iconTone} flex items-center justify-center text-xl shadow-md mb-2`}
        whileHover={{ rotate: [0, -6, 6, 0], transition: { duration: 0.4 } }}
      >
        {icon}
      </motion.div>
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

/**
 * SmartAlerts — personalized notification cards below the tile grid.
 *
 * Derives alert messages from the fan's preference profile + live intelligence.
 * If no prefs are set, shows a simplified "conditions-only" set of messages
 * so even first-time visitors get value. With prefs, alerts are tailored
 * to the specific group type and needs (family, accessibility, timing, etc.).
 */
function SmartAlerts({
  prefs,
  plan,
  intelligence,
  fanPulse,
  eventId,
  onHelp,
}: {
  prefs: ReadinessPrefs | null
  plan: ArrivalPlan
  intelligence: EventIntelligence
  fanPulse: FanPulseBreakdown
  eventId: string
  onHelp: () => void
}) {
  const alerts: Array<{
    id: string
    icon: string
    title: string
    body: string
    tone: 'violet' | 'emerald' | 'amber' | 'sky' | 'rose'
    action?: { label: string; href?: string; onClick?: () => void }
  }> = []

  const gateLabel = plan.recommended_gate.name.split(' (')[0]

  // === Preference-gated personalized alerts ===
  if (prefs) {
    // Family-specific
    if (prefs.group === 'family_young_kids') {
      alerts.push({
        id: 'family-young',
        icon: '👶',
        title: 'Arriving with young kids',
        body: `${gateLabel} is family-friendly with wider lanes. Family Services is nearby for stroller storage and nursing. Plan for a 5-min buffer at the gate.`,
        tone: 'violet',
        action: { label: 'View family support', href: `/event/${eventId}/venue-map` },
      })
    } else if (prefs.group === 'family_teens') {
      alerts.push({
        id: 'family-teens',
        icon: '👨‍👩‍👧‍👦',
        title: 'Family arrival tip',
        body: `Set a meetup point inside the venue in case anyone gets separated. Guest Services near ${gateLabel} can help coordinate.`,
        tone: 'violet',
      })
    }

    // Large group
    if (prefs.group === 'large_group') {
      alerts.push({
        id: 'large-group',
        icon: '👥',
        title: 'Group arrival strategy',
        body: `With a larger group, arrive together at ${gateLabel} and have one person lead with all tickets ready. The gate handles group entries well.`,
        tone: 'sky',
      })
    }

    // Accessibility needs
    if (prefs.needs.includes('wheelchair') || prefs.needs.includes('slow_pace')) {
      alerts.push({
        id: 'accessibility',
        icon: '♿',
        title: 'Accessible route ready',
        body: `${gateLabel} has step-free access. Staff can assist with elevator access to your section. Allow a few extra minutes for the accessible concourse route.`,
        tone: 'sky',
        action: { label: 'Map accessible route', href: `/event/${eventId}/venue-map` },
      })
    }

    // Sensory sensitive
    if (prefs.needs.includes('sensory_sensitive')) {
      alerts.push({
        id: 'sensory',
        icon: '🧩',
        title: 'Quiet zones nearby',
        body: 'The Sensory Room is available inside the venue for a calmer break. Staff can guide you there from your section at any time.',
        tone: 'emerald',
        action: { label: 'Find quiet spaces', href: `/event/${eventId}/venue-map` },
      })
    }

    // First-time visitor
    if (prefs.needs.includes('first_time')) {
      alerts.push({
        id: 'first-time',
        icon: '🌟',
        title: 'First time at this venue?',
        body: `Follow your Journey timeline step by step — it covers everything from departure to your seat. Staff in high-vis vests at ${gateLabel} can answer any question.`,
        tone: 'violet',
        action: { label: 'View journey', href: `/event/${eventId}/journey` },
      })
    }

    // Transit-specific
    if (prefs.transport === 'transit') {
      alerts.push({
        id: 'transit',
        icon: '🚇',
        title: 'Transit arrival tip',
        body: `Taking transit means you'll arrive at the main plaza. ${gateLabel} is an 8-minute walk from the transit drop-off. Follow the fan flow signs.`,
        tone: 'sky',
      })
    } else if (prefs.transport === 'driving') {
      alerts.push({
        id: 'driving',
        icon: '🚗',
        title: 'Parking reminder',
        body: `Stadium lots fill up fast on event day. Your leave-by time (${plan.leave_by_time}) accounts for parking walk time to ${gateLabel}.`,
        tone: 'amber',
      })
    }

    // Arrival timing — late arrivals get urgency tip
    if (prefs.arrival_preference === 'last_minute') {
      alerts.push({
        id: 'late-arrival',
        icon: '🏃',
        title: 'Running late? Here\'s your fast track',
        body: `Head straight to ${gateLabel} with your ticket ready. Skip concession stops — you can grab food after you're seated. Staff can point you to the fastest route from the gate.`,
        tone: 'amber',
        action: { label: 'View fastest route', href: `/event/${eventId}/venue-map` },
      })
    } else if (prefs.arrival_preference === 'early') {
      alerts.push({
        id: 'early-arrival',
        icon: '🌅',
        title: 'Early arrival perks',
        body: `Arriving early means shorter lines and time to explore. Concessions near ${gateLabel} are less crowded before gates fill up — a great time to grab food.`,
        tone: 'emerald',
      })
    }

    // Priority — calmest route or closest seat
    if (prefs.priority === 'calmest_route') {
      alerts.push({
        id: 'calm-route',
        icon: '🧘',
        title: 'Your calm route is set',
        body: `${gateLabel} was chosen for lower crowd density. If it starts to feel busy, staff can redirect you to a quieter concourse lane. You can also request a Quiet Space escort.`,
        tone: 'emerald',
        action: { label: 'Find quiet spaces', href: `/event/${eventId}/venue-map` },
      })
    } else if (prefs.priority === 'closest_seat') {
      alerts.push({
        id: 'close-seat',
        icon: '🎯',
        title: 'Closest gate selected',
        body: `${gateLabel} puts you closest to your section — minimal walking once you're through the gate. Follow internal signage to your section.`,
        tone: 'sky',
      })
    }

    // Bags & security screening
    if (prefs.bringing === 'large_bag') {
      alerts.push({
        id: 'bag-check',
        icon: '🎒',
        title: 'Bag check heads-up',
        body: `Backpacks and large bags require additional screening at ${gateLabel}. Allow 5–10 extra minutes. Consider a clear bag next time for express entry.`,
        tone: 'amber',
      })
    } else if (prefs.bringing === 'medical_equipment') {
      alerts.push({
        id: 'medical-screening',
        icon: '🏥',
        title: 'Special screening lane available',
        body: `${gateLabel} has a dedicated screening lane for medical equipment. Let the first staff member know — they'll route you through quickly and discreetly.`,
        tone: 'sky',
        action: { label: 'View accessible route', href: `/event/${eventId}/venue-map` },
      })
    }

    // Venue experience — first-timers vs. regulars
    if (prefs.venue_experience === 'first_time' && !prefs.needs.includes('first_time')) {
      alerts.push({
        id: 'venue-first-time',
        icon: '🌟',
        title: 'First time at this venue?',
        body: `Follow your Journey timeline step by step — it covers everything from departure to your seat. Staff in high-vis vests at ${gateLabel} can answer any question.`,
        tone: 'violet',
        action: { label: 'View journey', href: `/event/${eventId}/journey` },
      })
    }
  }

  // === Universal condition-based alerts (always show) ===

  // Busy entry alert
  if (intelligence.expectedEntryLoad === 'busy') {
    alerts.push({
      id: 'busy-entry',
      icon: '⚠️',
      title: 'Heavy entry expected',
      body: `Current conditions suggest heavier traffic at ${gateLabel}. Arriving by ${plan.arrival_time} gives you the best chance to beat the rush.`,
      tone: 'amber',
      action: { label: 'Check conditions', href: `/event/${eventId}/conditions` },
    })
  }

  // Fan pulse needs help surge
  if (fanPulse.needHelp >= 2) {
    alerts.push({
      id: 'fan-concern',
      icon: '📢',
      title: 'Fans reporting issues nearby',
      body: `${fanPulse.needHelp} recent fan reports indicate difficulty at ${gateLabel}. Staff have been notified — check Pulse for live updates.`,
      tone: 'rose',
      action: { label: 'See fan reports', href: `/event/${eventId}/pulse` },
    })
  }

  // If no prefs set, show a safety-first baseline message (the inline
  // personalization prompt above the tiles handles the main nudge now)
  if (!prefs) {
    alerts.push({
      id: 'safety-baseline',
      icon: '🛡️',
      title: 'Safety basics for today',
      body: `Staff are stationed at every gate including ${gateLabel}. For urgent help, flag any high-vis vest or call 911. FanFlow updates your plan live as conditions change.`,
      tone: 'emerald',
    })
  }

  // Always show safety note (unless too many alerts already)
  if (alerts.length < 4) {
    alerts.push({
      id: 'safety-proactive',
      icon: '🎧',
      title: 'Support is one tap away',
      body: 'Need help at any point? FanFlow connects you to the nearest support — medical, family services, accessibility, and more.',
      tone: 'emerald',
      action: { label: 'Get help', onClick: onHelp },
    })
  }

  // Sort by urgency so the cap doesn't push out time-sensitive alerts.
  // Higher tier = shown first. Ties preserve insertion order (stable sort).
  const URGENCY: Record<string, number> = {
    'fan-concern': 5, 'busy-entry': 5,              // live conditions — highest
    'late-arrival': 4, 'bag-check': 4,              // time-sensitive actions
    'medical-screening': 4, 'accessibility': 4,      // safety / accessibility
    'sensory': 3, 'family-young': 3,                 // group-specific, actionable
    'calm-route': 2, 'close-seat': 2,                // nice-to-know optimizations
    'safety-baseline': 1, 'safety-proactive': 1,     // always-on safety
  }
  alerts.sort((a, b) => (URGENCY[b.id] ?? 2) - (URGENCY[a.id] ?? 2))

  // Cap at 4 to prevent the Hub from becoming a wall of cards
  const visible = alerts.slice(0, 4)

  if (visible.length === 0) return null

  const toneMap = {
    violet: {
      bg: 'from-violet-50 to-violet-50/40',
      border: 'border-violet-200',
      iconBg: 'bg-violet-100',
      accent: 'text-violet-700',
    },
    emerald: {
      bg: 'from-emerald-50 to-emerald-50/40',
      border: 'border-emerald-200',
      iconBg: 'bg-emerald-100',
      accent: 'text-emerald-700',
    },
    amber: {
      bg: 'from-amber-50 to-amber-50/40',
      border: 'border-amber-200',
      iconBg: 'bg-amber-100',
      accent: 'text-amber-700',
    },
    sky: {
      bg: 'from-sky-50 to-sky-50/40',
      border: 'border-sky-200',
      iconBg: 'bg-sky-100',
      accent: 'text-sky-700',
    },
    rose: {
      bg: 'from-rose-50 to-rose-50/40',
      border: 'border-rose-200',
      iconBg: 'bg-rose-100',
      accent: 'text-rose-700',
    },
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="kicker text-violet-700">
          {prefs ? 'For you' : 'Smart alerts'}
        </div>
        {prefs && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-violet-100 text-[9px] font-bold text-violet-700 uppercase tracking-wider">
            Personalized
          </span>
        )}
      </div>
      <div className="space-y-2.5">
        {visible.map((alert, i) => {
          const t = toneMap[alert.tone]
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -12, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.45, delay: 0.08 * i, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ x: 2, transition: { duration: 0.2 } }}
              className={`rounded-2xl bg-gradient-to-br ${t.bg} border ${t.border} p-3.5 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start gap-3">
                <span className={`w-9 h-9 rounded-xl ${t.iconBg} flex items-center justify-center text-base flex-shrink-0`}>
                  {alert.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={`font-bold text-slate-900 text-[13px] leading-tight`}>
                    {alert.title}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    {alert.body}
                  </p>
                  {alert.action && (
                    alert.action.href ? (
                      <Link
                        href={alert.action.href}
                        className={`inline-flex items-center gap-1 mt-2 text-[11px] font-bold ${t.accent} hover:underline`}
                      >
                        {alert.action.label} <span>›</span>
                      </Link>
                    ) : alert.action.onClick ? (
                      <button
                        onClick={alert.action.onClick}
                        className={`inline-flex items-center gap-1 mt-2 text-[11px] font-bold ${t.accent} hover:underline`}
                      >
                        {alert.action.label} <span>›</span>
                      </button>
                    ) : null
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.section>
  )
}

/**
 * PersonalizationPrompt — inline 6-step questionnaire on the Hub.
 *
 * Covers every common fan use case with simple tap-to-advance questions:
 *   1. Transport mode — affects leave-by buffer + gate approach
 *   2. Group type — affects gate choice, family routing, timing buffer
 *   3. Arrival timing — early bird vs. just in time vs. running late
 *   4. Priority — fastest entry, calmest route, closest seat, family-safe
 *   5. Bags & items — security screening expectations
 *   6. Accessibility & comfort — multi-select chips
 *
 * Each step auto-advances on tap. Every step is skippable. On completion
 * the prefs save to the store, the Hub re-derives the plan, and
 * SmartAlerts unlocks personalized messages.
 *
 * Even if the fan skips everything, they still get baseline safety info.
 */
const TOTAL_PROMPT_STEPS = 6

const Q_TRANSPORT: { value: TransportMode; emoji: string; label: string; sub: string }[] = [
  { value: 'transit', emoji: '🚆', label: 'Public transit', sub: 'Train, bus, subway' },
  { value: 'driving', emoji: '🚗', label: 'Driving', sub: 'Parking at venue' },
  { value: 'rideshare', emoji: '🚕', label: 'Rideshare', sub: 'Uber, Lyft, taxi' },
  { value: 'walking', emoji: '🚶', label: 'Walking', sub: 'Nearby or hotel' },
]

const Q_GROUP: { value: GroupType; emoji: string; label: string; sub: string }[] = [
  { value: 'solo', emoji: '🧍', label: 'Just me', sub: 'Solo entry' },
  { value: 'couple', emoji: '👥', label: 'Two of us', sub: 'With one other' },
  { value: 'family_young_kids', emoji: '👨‍👩‍👧', label: 'Family (young kids)', sub: 'Under 12' },
  { value: 'family_teens', emoji: '👨‍👩‍👦', label: 'Family (teens)', sub: 'Teens or older' },
  { value: 'large_group', emoji: '👫', label: 'Large group', sub: '4+ people' },
]

const Q_ARRIVAL: { value: ArrivalPreference; emoji: string; label: string; sub: string }[] = [
  { value: 'early', emoji: '🌅', label: 'Early bird', sub: 'Arrive well before gates open' },
  { value: 'on_time', emoji: '⏰', label: 'Right on time', sub: 'Doors open, walk in' },
  { value: 'last_minute', emoji: '🏃', label: 'Might be late', sub: 'Need the fastest route in' },
]

const Q_PRIORITY: { value: FanPriority; emoji: string; label: string; sub: string }[] = [
  { value: 'fastest_entry', emoji: '⚡', label: 'Fastest entry', sub: 'Shortest line, quickest in' },
  { value: 'calmest_route', emoji: '🧘', label: 'Calmest route', sub: 'Less crowded, more space' },
  { value: 'closest_seat', emoji: '🎯', label: 'Closest to seat', sub: 'Minimal walking inside' },
  { value: 'family_friendly', emoji: '👶', label: 'Best for families', sub: 'Safe, wide, kid-friendly' },
]

const Q_BRINGING: { value: BringingItem; emoji: string; label: string; sub: string }[] = [
  { value: 'nothing', emoji: '👐', label: 'Nothing extra', sub: 'Phone + ticket only' },
  { value: 'small_bag', emoji: '👜', label: 'Small bag', sub: 'Clutch or clear bag' },
  { value: 'large_bag', emoji: '🎒', label: 'Backpack / large bag', sub: 'May need to check' },
  { value: 'medical_equipment', emoji: '🏥', label: 'Medical equipment', sub: 'Special screening lane' },
]

const Q_NEEDS: { value: AccessibilityNeed; emoji: string; label: string }[] = [
  { value: 'wheelchair', emoji: '♿', label: 'Wheelchair / step-free' },
  { value: 'slow_pace', emoji: '🦯', label: 'Shorter walk preferred' },
  { value: 'stroller', emoji: '🍼', label: 'Stroller' },
  { value: 'hearing', emoji: '🦻', label: 'Hearing assistance' },
  { value: 'visual', emoji: '👁️', label: 'Visual assistance' },
  { value: 'sensory_sensitive', emoji: '🧩', label: 'Sensory-sensitive' },
  { value: 'first_time', emoji: '🧭', label: 'First time at this venue' },
  { value: 'none', emoji: '✓', label: 'None of these' },
]

function PromptStepHeader({
  stepNum,
  title,
  onSkip,
}: {
  stepNum: number
  title: string
  onSkip: () => void
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-violet-700">
          Step {stepNum} of {TOTAL_PROMPT_STEPS}
        </div>
        <div className="font-bold text-slate-900 text-base mt-0.5">{title}</div>
      </div>
      <button onClick={onSkip} className="text-[11px] text-slate-400 hover:text-slate-600">
        Skip
      </button>
    </div>
  )
}

function PromptOption({
  emoji,
  label,
  sub,
  selected,
  onClick,
}: {
  emoji: string
  label: string
  sub?: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border transition text-left ${
        selected
          ? 'border-violet-600 bg-violet-50'
          : 'border-slate-200 bg-white hover:border-slate-300 active:bg-slate-50'
      }`}
    >
      <span className="text-lg flex-shrink-0">{emoji}</span>
      <div className="min-w-0">
        <div className="font-semibold text-slate-900 text-sm leading-tight">{label}</div>
        {sub && <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">{sub}</div>}
      </div>
    </button>
  )
}

function PersonalizationPrompt({
  onSaved,
  eventId,
}: {
  onSaved: () => void
  eventId: string
}) {
  // 0 = intro, 1..6 = steps, 7 = done
  const [step, setStep] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [transport, setTransport] = useState<TransportMode | null>(null)
  const [group, setGroup] = useState<GroupType | null>(null)
  const [arrivalPref, setArrivalPref] = useState<ArrivalPreference | null>(null)
  const [priority, setPriority] = useState<FanPriority | null>(null)
  const [bringing, setBringing] = useState<BringingItem | null>(null)
  const [needs, setNeeds] = useState<AccessibilityNeed[]>([])
  const [venueExp, setVenueExp] = useState<VenueExperience | null>(null)

  if (dismissed) return null

  const saveAndFinish = () => {
    // Derive venue_experience from accessibility "first_time" selection if not
    // explicitly set — keeps the UI at 6 steps while still populating the field.
    const derivedVenueExp: VenueExperience | undefined =
      venueExp ?? (needs.includes('first_time') ? 'first_time' : undefined)

    const prefs: ReadinessPrefs = {
      transport: transport ?? 'transit',
      group: group ?? 'solo',
      needs: needs.length > 0 ? needs : ['none'],
      arrival_preference: arrivalPref ?? undefined,
      priority: priority ?? undefined,
      bringing: bringing ?? undefined,
      venue_experience: derivedVenueExp,
      updated_at: new Date().toISOString(),
    }
    saveReadiness(prefs)
    setStep(7)
    setTimeout(onSaved, 300)
  }

  const toggleNeed = (n: AccessibilityNeed) => {
    if (n === 'none') { setNeeds([]); return }
    setNeeds((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev.filter((x) => x !== 'none'), n],
    )
  }

  const back = () => setStep((s) => Math.max(0, s - 1))

  return (
    <AnimatePresence mode="wait">
      <motion.section
        key={`prompt-step-${step}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-3xl bg-gradient-to-br from-violet-50 via-white to-fuchsia-50/30 border border-violet-200 shadow-[0_4px_20px_-8px_rgba(124,58,237,0.15)] p-5 overflow-hidden"
      >
        <div
          aria-hidden="true"
          className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br from-violet-200/50 to-fuchsia-200/30 blur-2xl"
        />

        {/* === Intro ================================================== */}
        {step === 0 && (
          <div className="relative">
            <div className="flex items-start gap-3 mb-3">
              <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white flex items-center justify-center text-lg flex-shrink-0 shadow-md shadow-violet-500/25">
                ✨
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-violet-700">
                  Quick personalization
                </div>
                <div className="font-bold text-slate-900 text-[15px] leading-tight mt-0.5">
                  A few taps to set up your perfect day
                </div>
              </div>
            </div>
            <p className="text-[12px] text-slate-600 leading-relaxed mb-1">
              Answer {TOTAL_PROMPT_STEPS} simple questions — each one is a single tap. We&apos;ll
              tailor your gate, timing, security tips, safety info, and support
              to exactly your situation.
            </p>
            <div className="flex flex-wrap gap-1.5 my-3">
              {['Transport', 'Group', 'Timing', 'Priority', 'Bags', 'Accessibility'].map((q) => (
                <span key={q} className="inline-flex items-center px-2 py-0.5 rounded-full bg-violet-100 text-[10px] font-semibold text-violet-700">
                  {q}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mb-4">
              Takes under 60 seconds. Skip anytime — we&apos;ll still keep you safe with baseline updates.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition"
              >
                Let&apos;s go →
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-sm transition"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* === Step 1: Transport ====================================== */}
        {step === 1 && (
          <div className="relative">
            <PromptStepHeader stepNum={1} title="How are you getting there?" onSkip={() => setStep(2)} />
            <div className="grid grid-cols-2 gap-2">
              {Q_TRANSPORT.map((opt) => (
                <PromptOption
                  key={opt.value}
                  emoji={opt.emoji}
                  label={opt.label}
                  sub={opt.sub}
                  selected={transport === opt.value}
                  onClick={() => { setTransport(opt.value); setStep(2) }}
                />
              ))}
            </div>
          </div>
        )}

        {/* === Step 2: Group ========================================== */}
        {step === 2 && (
          <div className="relative">
            <PromptStepHeader stepNum={2} title="Who's coming with you?" onSkip={() => setStep(3)} />
            <div className="grid grid-cols-2 gap-2">
              {Q_GROUP.map((opt) => (
                <PromptOption
                  key={opt.value}
                  emoji={opt.emoji}
                  label={opt.label}
                  sub={opt.sub}
                  selected={group === opt.value}
                  onClick={() => { setGroup(opt.value); setStep(3) }}
                />
              ))}
            </div>
            <button onClick={back} className="mt-2 text-[11px] text-violet-600 font-semibold hover:underline">← Back</button>
          </div>
        )}

        {/* === Step 3: Arrival timing ================================= */}
        {step === 3 && (
          <div className="relative">
            <PromptStepHeader stepNum={3} title="When do you want to arrive?" onSkip={() => setStep(4)} />
            <div className="space-y-2">
              {Q_ARRIVAL.map((opt) => (
                <PromptOption
                  key={opt.value}
                  emoji={opt.emoji}
                  label={opt.label}
                  sub={opt.sub}
                  selected={arrivalPref === opt.value}
                  onClick={() => { setArrivalPref(opt.value); setStep(4) }}
                />
              ))}
            </div>
            <button onClick={back} className="mt-2 text-[11px] text-violet-600 font-semibold hover:underline">← Back</button>
          </div>
        )}

        {/* === Step 4: Priority ======================================= */}
        {step === 4 && (
          <div className="relative">
            <PromptStepHeader stepNum={4} title="What matters most today?" onSkip={() => setStep(5)} />
            <div className="grid grid-cols-2 gap-2">
              {Q_PRIORITY.map((opt) => (
                <PromptOption
                  key={opt.value}
                  emoji={opt.emoji}
                  label={opt.label}
                  sub={opt.sub}
                  selected={priority === opt.value}
                  onClick={() => { setPriority(opt.value); setStep(5) }}
                />
              ))}
            </div>
            <button onClick={back} className="mt-2 text-[11px] text-violet-600 font-semibold hover:underline">← Back</button>
          </div>
        )}

        {/* === Step 5: Bags & items =================================== */}
        {step === 5 && (
          <div className="relative">
            <PromptStepHeader stepNum={5} title="Bringing anything through security?" onSkip={() => setStep(6)} />
            <div className="grid grid-cols-2 gap-2">
              {Q_BRINGING.map((opt) => (
                <PromptOption
                  key={opt.value}
                  emoji={opt.emoji}
                  label={opt.label}
                  sub={opt.sub}
                  selected={bringing === opt.value}
                  onClick={() => { setBringing(opt.value); setStep(6) }}
                />
              ))}
            </div>
            <button onClick={back} className="mt-2 text-[11px] text-violet-600 font-semibold hover:underline">← Back</button>
          </div>
        )}

        {/* === Step 6: Accessibility & comfort ======================== */}
        {step === 6 && (
          <div className="relative">
            <PromptStepHeader stepNum={6} title="Any accessibility or comfort needs?" onSkip={saveAndFinish} />
            <p className="text-[11px] text-slate-500 mb-2">
              Tap any that apply — we&apos;ll adjust your gate, route, and support.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Q_NEEDS.map((opt) => {
                const isSelected = opt.value === 'none'
                  ? needs.length === 0
                  : needs.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggleNeed(opt.value)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold transition ${
                      isSelected
                        ? 'border-violet-600 bg-violet-50 text-violet-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span>{opt.emoji}</span>
                    {opt.label}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={back} className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-sm transition">
                ← Back
              </button>
              <button onClick={saveAndFinish} className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition">
                Save & personalize ✓
              </button>
            </div>
          </div>
        )}

        {/* === Done confirmation ====================================== */}
        {step === 7 && (
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative text-center py-3">
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 12 }}
              className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl font-bold mx-auto mb-2"
            >
              ✓
            </motion.div>
            <div className="font-bold text-slate-900 text-base">Your plan is personalized!</div>
            <p className="text-[12px] text-slate-600 mt-1 leading-relaxed max-w-xs mx-auto">
              Gate, timing, security tips, safety alerts, and support — all
              tailored to your answers. Scroll down to see your personalized feed.
            </p>
            <Link
              href={`/event/${eventId}/readiness`}
              className="inline-flex items-center gap-1 mt-3 text-[11px] font-bold text-violet-700 hover:underline"
            >
              Fine-tune in full preferences ›
            </Link>
          </motion.div>
        )}

        {/* Progress bar */}
        {step >= 1 && step <= TOTAL_PROMPT_STEPS && (
          <div className="mt-4 flex gap-0.5">
            {Array.from({ length: TOTAL_PROMPT_STEPS }, (_, i) => i + 1).map((s) => (
              <div key={s} className="h-1 flex-1 rounded-full bg-slate-200 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-violet-600"
                  initial={{ width: '0%' }}
                  animate={{ width: s <= step ? '100%' : '0%' }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            ))}
          </div>
        )}
      </motion.section>
    </AnimatePresence>
  )
}
