'use client'

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { demoEvent, demoTicket, demoVenue, deriveArrivalPlan } from '@/lib/seed'
import {
  getAllSignals,
  loadChecklist,
  loadReadiness,
  publishSignal,
  saveChecklist,
  subscribeToFanflowChanges,
} from '@/lib/store'
import type { LiveSignal, ReadinessPrefs } from '@/lib/types'
import { HelpSheet } from '@/components/shared/HelpSheet'
import { ImpactCards } from '@/components/impact/ImpactCards'
import { EventIntelligenceCard } from '@/components/intelligence/EventIntelligenceCard'
import { computeEventIntelligence, computeFanPulse } from '@/lib/intelligence'
import { motion, AnimatePresence } from 'framer-motion'
import type { SupportType } from '@/lib/types'

/**
 * Scroll-triggered fade-up reveal — local to the Hub for lower-fold cards.
 * Mirrors the Landing's RevealOnScroll pattern; once-only so back-scroll
 * doesn't retrigger. Framer Motion handles prefers-reduced-motion natively.
 */
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const SUPPORT_TONE: Record<SupportType, string> = {
  first_aid: '#dc2626',
  family_services: '#7c3aed',
  accessibility: '#0ea5e9',
  restroom: '#475569',
  guest_services: '#0891b2',
  quiet_space: '#16a34a',
  concessions: '#ea580c',
}
const SUPPORT_EMOJI: Record<SupportType, string> = {
  first_aid: '➕',
  family_services: '👶',
  accessibility: '♿',
  restroom: '🚻',
  guest_services: 'ℹ️',
  quiet_space: '🧩',
  concessions: '🍿',
}

const DEFAULT_CHECKLIST = { tickets: false, transit: false, parking: false }

export default function EventHubPage() {
  const params = useParams<{ id: string }>()
  const eventId = params?.id ?? 'wc2026-final'

  const [countdown, setCountdown] = useState<string>('— — — —')
  const [prefs, setPrefs] = useState<ReadinessPrefs | null>(null)
  const [signals, setSignals] = useState<LiveSignal[]>([])
  const [checklist, setChecklist] = useState<Record<string, boolean>>(DEFAULT_CHECKLIST)
  const [pulseCount, setPulseCount] = useState(0)
  const [hydrated, setHydrated] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [staffToast, setStaffToast] = useState<{ message: string; sentiment: string } | null>(null)

  // Track the most-recent staff-signal id we've already shown a toast for.
  // The toast only fires when a NEW staff signal arrives (not on initial
  // mount). Prevents the demo from greeting the user with a stale "staff
  // update applied" the first time they open the Hub.
  const lastStaffSignalIdRef = useRef<string | null>(null)
  const hasInitializedStaffRef = useRef(false)

  const refresh = useCallback(() => {
    setPrefs(loadReadiness())
    setSignals(getAllSignals())
  }, [])

  useEffect(() => {
    setHydrated(true)
    refresh()
    setChecklist({ ...DEFAULT_CHECKLIST, ...loadChecklist() })
    return subscribeToFanflowChanges(
      ['fanflow:readiness', 'fanflow:signals'],
      refresh,
    )
  }, [refresh])

  // Watch the signals array for newly-arrived STAFF signals. When one shows
  // up, fire a toast so the user can SEE the cross-tab demo working —
  // otherwise the live refresh is invisible.
  useEffect(() => {
    const staffSignals = signals.filter((s) => s.source === 'staff')
    const newest = staffSignals[0] ?? null

    // First time we see signals, just snapshot the latest staff id without
    // toasting. Subsequent changes will toast if a NEW staff id appears.
    if (!hasInitializedStaffRef.current) {
      hasInitializedStaffRef.current = true
      lastStaffSignalIdRef.current = newest?.id ?? null
      return
    }

    if (newest && newest.id !== lastStaffSignalIdRef.current) {
      lastStaffSignalIdRef.current = newest.id
      setStaffToast({ message: newest.message, sentiment: newest.sentiment })
    }
  }, [signals])

  // Auto-dismiss the staff toast after 3s
  useEffect(() => {
    if (!staffToast) return
    const t = setTimeout(() => setStaffToast(null), 3000)
    return () => clearTimeout(t)
  }, [staffToast])

  useEffect(() => {
    const tick = () => {
      const eventDate = new Date(demoEvent.date)
      const diff = eventDate.getTime() - Date.now()
      if (diff <= 0) {
        setCountdown('Event is now!')
        return
      }
      const days = String(Math.floor(diff / 86400000)).padStart(2, '0')
      const hours = String(Math.floor((diff / 3600000) % 24)).padStart(2, '0')
      const mins = String(Math.floor((diff / 60000) % 60)).padStart(2, '0')
      const secs = String(Math.floor((diff / 1000) % 60)).padStart(2, '0')
      setCountdown(`${days}  ${hours}  ${mins}  ${secs}`)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])

  const plan = deriveArrivalPlan(prefs, signals.length ? signals : undefined)

  const toggleChecklist = (key: string) => {
    setChecklist((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      saveChecklist(next)
      return next
    })
  }

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
  }

  const visibleSignals = signals.slice(0, 5)

  return (
    <div className="min-h-screen page-bg page-enter">
      <div className="page-header px-4 h-14 flex items-center justify-between">
        <h1 className="font-bold text-slate-900">Event Day Hub</h1>
        <div className="flex items-center gap-1">
          <Link
            href={`/event/${eventId}/readiness`}
            className="btn-ghost !min-h-[40px] text-sm text-violet-700 hover:text-violet-800"
          >
            {prefs ? 'Edit prefs' : 'Personalize'}
          </Link>
          <Link
            href="/"
            className="btn-ghost !min-h-[40px] text-sm text-slate-500"
            aria-label="Back to home"
          >
            ←
          </Link>
        </div>
      </div>

      <div className="container-mobile px-4 py-5 sm:py-6 space-y-4 sm:space-y-5 safe-bottom">
        {/* Ticket-confirmed handoff — feels like the literal post-purchase moment.
            Renders prominently when no prefs yet (the "you just bought a ticket"
            beat); collapses to a quieter acknowledgment once readiness is done. */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={
            hydrated && !prefs
              ? 'rounded-2xl bg-emerald-50 border border-emerald-200 p-4 sm:p-5'
              : 'rounded-xl bg-white border border-emerald-200/70 px-3.5 py-2.5'
          }
        >
          {hydrated && !prefs ? (
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center text-base font-bold flex-shrink-0">
                ✓
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-emerald-900 text-sm sm:text-base">
                  Ticket confirmed
                </div>
                <div className="text-xs sm:text-sm text-emerald-800 mt-0.5">
                  Section {demoTicket.section} · Row {demoTicket.row} · Seat{' '}
                  {demoTicket.seat}
                </div>
                <p className="text-xs text-emerald-700 mt-2 leading-relaxed">
                  Want a personalized arrival guide for your group? It takes about 90 seconds.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Link
                    href={`/event/${eventId}/readiness`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition px-3 py-2 rounded-full"
                  >
                    Start Event Day Readiness →
                  </Link>
                  <Link
                    href={`/event/${eventId}/checkout-success`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
                    title="Replay the cinematic post-purchase unlock"
                  >
                    ↻ Replay unlock
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="dot bg-emerald-500" />
                <span className="font-semibold text-emerald-800">Ticket confirmed</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-600 truncate">
                  Section {demoTicket.section}, Row {demoTicket.row}
                </span>
              </div>
              <Link
                href={`/event/${eventId}/checkout-success`}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 whitespace-nowrap flex-shrink-0"
              >
                ↻ Replay
              </Link>
            </div>
          )}
        </motion.div>

        {/* Event Hero — StubHub-style confirmation card, cinematic refinement */}
        <div className="card-base overflow-hidden">
          <div
            className="h-36 sm:h-44 bg-cover bg-center relative"
            style={{ backgroundImage: `url(${demoEvent.image_url})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="badge-trust bg-white/95">
                <motion.span
                  className="dot bg-rose-500"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                />
                Confirmed
              </span>
            </div>
            <div className="absolute bottom-3 left-4 right-4 text-white">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-6 h-px bg-white/70" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-90">
                  FIFA World Cup 2026
                </span>
              </div>
              <h2 className="text-xl sm:text-[26px] font-bold leading-[1.1] tracking-tight">
                {demoEvent.name}
              </h2>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-900">{demoVenue.name}</div>
                <div className="text-xs text-slate-500">East Rutherford, NJ · Section 117</div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Mock weather chip — seeded value, not a real API. Adds the
                    universal arrival-confidence cue every venue product has. */}
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-[11px] font-semibold text-sky-700"
                  title="Mock weather — seeded for the demo"
                >
                  🌤 72°F
                </span>
                <span className="chip-status-live">
                  <motion.span
                    className="dot bg-emerald-500"
                    animate={{ opacity: [1, 0.5, 1], scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  Live
                </span>
              </div>
            </div>
            <div className="border-t border-slate-200 pt-3">
              <div className="flex items-baseline justify-between mb-2">
                <div className="kicker">Time to event</div>
                {(() => {
                  const days = parseInt(countdown.split(/\s+/)[0], 10)
                  if (!Number.isFinite(days)) return null
                  return (
                    <span className="text-[11px] text-violet-700 font-semibold">
                      In {days} {days === 1 ? 'day' : 'days'}
                    </span>
                  )
                })()}
              </div>
              <div className="font-mono text-[26px] sm:text-[28px] font-bold text-slate-900 tracking-[0.04em] flex gap-2 sm:gap-3">
                {countdown.split(/\s+/).filter(Boolean).map((digit, i) => (
                  <motion.span
                    key={`${i}-${digit}`}
                    initial={{ scale: 0.96, opacity: 0.85 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="tabular-nums"
                  >
                    {digit}
                  </motion.span>
                ))}
              </div>
              <div className="text-[10px] text-slate-400 mt-1.5 font-mono tracking-[0.2em] flex gap-2 sm:gap-3">
                <span className="w-[2ch] sm:w-[2.5ch]">DAYS</span>
                <span className="w-[2ch] sm:w-[2.5ch]">HRS</span>
                <span className="w-[2ch] sm:w-[2.5ch]">MINS</span>
                <span className="w-[2ch] sm:w-[2.5ch]">SECS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Post-purchase unlock moment — anchors FanFlow as a StubHub benefit */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-white p-5 sm:p-6 hover-lift"
        >
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center text-base flex-shrink-0">
              ✨
            </span>
            <div className="flex-1">
              <div className="kicker text-violet-700 mb-1">A StubHub benefit</div>
              <h3 className="font-bold text-slate-900 text-lg leading-tight">
                Your Event Day Guide is unlocked.
              </h3>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                Because you booked this ticket through StubHub, FanFlow can personalize
                arrival guidance around your section, group, and venue context.
              </p>
            </div>
          </div>

          {/* Included-with-ticket benefit list */}
          <div className="mt-5 pt-4 border-t border-violet-100">
            <div className="kicker mb-3">Included with your StubHub ticket</div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {[
                { icon: '🎟️', label: 'Event Day Hub' },
                { icon: '🧭', label: 'Personalized Arrival Guide' },
                { icon: '🗺️', label: 'Venue Support Map' },
                { icon: '📡', label: 'Live Updates' },
                { icon: '🤝', label: 'Need Help context' },
              ].map((b, i) => (
                <motion.li
                  key={b.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 + i * 0.06, ease: 'easeOut' }}
                  className="flex items-center gap-2.5 text-slate-700"
                >
                  <span className="w-7 h-7 rounded-full bg-white border border-violet-100 flex items-center justify-center text-sm">
                    {b.icon}
                  </span>
                  <span>{b.label}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* (Personalize CTA removed — the Ticket-confirmed handoff card at the
            top of this page already carries the Start Readiness CTA when no
            prefs exist. Two banners doing the same job was scroll noise.) */}

        {/* Impact cards — render only when there are reasons to show */}
        {hydrated && <ImpactCards plan={plan} prefs={prefs} signals={signals} />}

        {/* Event Intelligence — deterministic summary of signals */}
        {hydrated && (
          <EventIntelligenceCard
            intelligence={computeEventIntelligence(plan, signals)}
          />
        )}

        {/* Arrival Plan — premium card with subtle accent and icon-prefixed rows */}
        <div className="relative rounded-2xl border border-slate-200 bg-white overflow-hidden hover-lift">
          {/* Top accent strip */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-violet-600 to-violet-500" />

          <div className="p-5 sm:p-6 pt-6 sm:pt-7">
            <div className="flex items-center justify-between mb-4">
              <h3 className="kicker text-violet-700">Your arrival plan</h3>
              <span
                className={
                  plan.confidence === 'high'
                    ? 'badge-success'
                    : plan.confidence === 'medium'
                    ? 'badge-warning'
                    : 'badge-danger'
                }
              >
                <span
                  className={`dot ${
                    plan.confidence === 'high'
                      ? 'bg-emerald-500'
                      : plan.confidence === 'medium'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                />
                {plan.confidence.charAt(0).toUpperCase() + plan.confidence.slice(1)} confidence
              </span>
            </div>

            <div className="space-y-1 mb-4">
              {[
                {
                  icon: '⏰',
                  label: 'Leave by',
                  value: plan.leave_by_time,
                  emphasis: false,
                },
                {
                  icon: '🎯',
                  label: 'Arrive at',
                  value: plan.arrival_time,
                  emphasis: false,
                },
                {
                  icon: '📍',
                  label: 'Gate',
                  value: plan.recommended_gate.name,
                  emphasis: true,
                },
              ].map((row, i, arr) => (
                <div
                  key={row.label}
                  className={`flex justify-between items-center py-2.5 ${
                    i < arr.length - 1 ? 'border-b border-slate-100' : ''
                  }`}
                >
                  <span className="flex items-center gap-2.5 text-slate-600 font-medium">
                    <span className="w-7 h-7 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-sm">
                      {row.icon}
                    </span>
                    {row.label}
                  </span>
                  <span
                    className={`font-bold text-lg ${
                      row.emphasis ? 'text-violet-700' : 'text-slate-900'
                    }`}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-gradient-to-br from-violet-50 to-slate-50 border border-violet-100/60 mb-3">
              <div className="flex items-start gap-2">
                <span className="text-violet-600 text-sm flex-shrink-0 mt-0.5">🧭</span>
                <p className="text-sm text-slate-700 leading-relaxed">{plan.route_summary}</p>
              </div>
            </div>

            {/* Why this gate — surfaces the top 3 score reasons inline so the
                rules-decide-AI-explains logic is visible on the Hub, not
                buried in the Guide page. */}
            {(() => {
              const picked = plan.gate_scores?.find((g) => g.is_recommended)
              if (!picked) return null
              const c = picked.components
              const reasons: { label: string; tone: 'pos' | 'neg' }[] = []
              if (c.section_proximity >= 10)
                reasons.push({ label: `Closest to Section ${demoTicket.section}`, tone: 'pos' })
              else if (c.section_proximity >= 6)
                reasons.push({ label: `Near your section`, tone: 'pos' })
              if (c.accessibility_match > 0)
                reasons.push({ label: 'Step-free accessible entry', tone: 'pos' })
              if (c.family_match > 0)
                reasons.push({ label: 'Family-friendly lane', tone: 'pos' })
              if (c.sensory_match > 0)
                reasons.push({ label: 'Calmer route preference', tone: 'pos' })
              if (c.staff_signal > 0)
                reasons.push({ label: 'Staff just reported smooth entry', tone: 'pos' })
              else if (c.staff_signal < 0)
                reasons.push({ label: 'Staff reports congestion at other gates', tone: 'pos' })
              if (picked.gate_name.match(/typical wait|wait/i)) {/* no-op */}
              if (c.wait_penalty > -2.5)
                reasons.push({
                  label: `Typical wait ~${plan.recommended_gate.typical_wait_minutes} min`,
                  tone: 'pos',
                })
              const top = reasons.slice(0, 3)
              if (top.length === 0) return null
              return (
                <div className="mb-4">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Picked because
                  </div>
                  <ul className="space-y-1">
                    {top.map((r) => (
                      <li
                        key={r.label}
                        className="flex items-start gap-2 text-xs text-slate-700"
                      >
                        <span className="text-emerald-600 font-bold mt-0.5 flex-shrink-0">
                          ✓
                        </span>
                        <span>{r.label}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/event/${eventId}/guide`}
                    className="inline-block text-[11px] font-semibold text-violet-700 hover:text-violet-800 mt-2"
                  >
                    See full score breakdown →
                  </Link>
                </div>
              )
            })()}

            <Link href={`/event/${eventId}/guide`} className="btn-primary w-full">
              View Full Arrival Guide →
            </Link>
          </div>
        </div>

        {/* Checklist */}
        <Reveal>
        <div className="card-base p-5 sm:p-6">
          <h3 className="kicker mb-4">Before you leave</h3>
          <div className="space-y-1">
            {[
              { key: 'tickets', label: 'Tickets in wallet' },
              { key: 'transit', label: 'NJ Transit app' },
              { key: 'parking', label: 'Parking pass' },
            ].map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 active:bg-slate-100 px-2 py-3 rounded-xl min-h-[48px] transition"
              >
                <input
                  type="checkbox"
                  checked={!!checklist[key]}
                  onChange={() => toggleChecklist(key)}
                  className="w-5 h-5 rounded accent-violet-600 cursor-pointer flex-shrink-0"
                />
                <span
                  className={`font-medium text-base ${
                    checklist[key] ? 'text-slate-400 line-through' : 'text-slate-800'
                  }`}
                >
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>
        </Reveal>

        {/* Live Conditions — felt-live polish + last-updated cue */}
        <Reveal>
        <div className="card-base p-5 sm:p-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <h3 className="kicker">Live conditions</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                <motion.span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                  animate={{ opacity: [1, 0.4, 1], scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                />
                Live
              </span>
            </div>
            <span className="text-xs text-slate-500">
              {signals.length} signal{signals.length === 1 ? '' : 's'}
            </span>
          </div>
          {/* Last-updated microcopy */}
          <div className="text-[11px] text-slate-500 mb-4">
            {(() => {
              if (signals.length === 0) return 'Waiting for first signals'
              const newest = signals[0]
              const ageMs = Date.now() - new Date(newest.created_at).getTime()
              const ageMin = Math.floor(ageMs / 60000)
              const rel =
                ageMin < 1
                  ? 'just now'
                  : ageMin < 60
                  ? `${ageMin}m ago`
                  : `${Math.floor(ageMin / 60)}h ago`
              return `Last update · ${rel}`
            })()}
          </div>
          <div className="space-y-2">
            {visibleSignals.length === 0 ? (
              <p className="text-sm text-slate-500 italic py-2">
                No live signals yet. Conditions will update as staff and fans report in.
              </p>
            ) : (
              visibleSignals.map((signal) => {
                const rowBg =
                  signal.sentiment === 'smooth'
                    ? 'bg-emerald-50/40 border-emerald-100'
                    : signal.sentiment === 'moderate'
                    ? 'bg-amber-50/40 border-amber-100'
                    : 'bg-rose-50/40 border-rose-100'
                const sentimentColor =
                  signal.sentiment === 'smooth'
                    ? 'badge-success'
                    : signal.sentiment === 'moderate'
                    ? 'badge-warning'
                    : 'badge-danger'
                const sentimentDot =
                  signal.sentiment === 'smooth'
                    ? 'bg-emerald-500'
                    : signal.sentiment === 'moderate'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                const gate = demoVenue.gates.find((g) => g.id === signal.gate_id)
                const ageMs = Date.now() - new Date(signal.created_at).getTime()
                const ageMin = Math.floor(ageMs / 60000)
                const rel =
                  ageMin < 1 ? 'just now' : ageMin < 60 ? `${ageMin}m ago` : `${Math.floor(ageMin / 60)}h ago`
                return (
                  <div
                    key={signal.id}
                    className={`flex items-start justify-between gap-3 p-3 rounded-xl border ${rowBg}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-800 font-medium leading-snug">
                        {signal.message}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                        <span>{gate?.name ?? signal.gate_id}</span>
                        <span>·</span>
                        <span>{signal.source === 'staff' ? '👮 Staff' : '🙋 Fan'}</span>
                        <span>·</span>
                        <span>{rel}</span>
                      </div>
                    </div>
                    <span className={`${sentimentColor} text-xs whitespace-nowrap`}>
                      <span className={`dot ${sentimentDot}`} />
                      {signal.sentiment}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
        </Reveal>

        {/* Fan Pulse */}
        <Reveal>
        <div className="card-base p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="kicker">Fan pulse</h3>
              <p className="text-sm text-slate-800 font-semibold mt-1">
                Help the next fan arrive smarter.
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Staff updates carry higher trust than fan signals.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handlePulse('smooth', 'Entry is smooth')}
              className="min-h-[64px] bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-700 rounded-xl font-bold transition text-3xl border border-emerald-200/60"
              aria-label="Smooth entry"
            >
              👍
            </button>
            <button
              onClick={() => handlePulse('busy', 'Entry is busy / slow')}
              className="min-h-[64px] bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-700 rounded-xl font-bold transition text-3xl border border-amber-200/60"
              aria-label="Busy entry"
            >
              👎
            </button>
            <button
              onClick={() => handlePulse('difficult', 'Need help at entry')}
              className="min-h-[64px] bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 rounded-xl font-bold transition text-3xl border border-rose-200/60"
              aria-label="Need help"
            >
              🆘
            </button>
          </div>
          {pulseCount > 0 && (
            <p className="text-xs text-slate-600 text-center mt-3 leading-relaxed">
              Thanks — your signal helps improve event-day guidance.{' '}
              <span className="text-slate-400">({pulseCount} sent)</span>
            </p>
          )}

          {/* Fan pulse breakdown — aggregates recent fan reports at the
              recommended gate. Only renders when there are recent reports. */}
          {(() => {
            const fp = computeFanPulse(signals, plan.recommended_gate.id)
            if (fp.total === 0) return null
            return (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Recent fan pulse · {plan.recommended_gate.name.replace(/\s*\(.*\)\s*$/, '')}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {fp.total} report{fp.total === 1 ? '' : 's'}
                  </span>
                </div>
                {/* Stacked bar — segments animate from width 0 on mount */}
                <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
                  {fp.smoothPct > 0 && (
                    <motion.div
                      className="bg-emerald-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${fp.smoothPct}%` }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                  {fp.slowPct > 0 && (
                    <motion.div
                      className="bg-amber-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${fp.slowPct}%` }}
                      transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                  {fp.needHelpPct > 0 && (
                    <motion.div
                      className="bg-rose-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${fp.needHelpPct}%` }}
                      transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-[11px]">
                  <div className="flex items-center gap-1">
                    <span className="dot bg-emerald-500" />
                    <span className="font-semibold text-slate-900">
                      {fp.smoothPct}%
                    </span>
                    <span className="text-slate-500">smooth</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="dot bg-amber-500" />
                    <span className="font-semibold text-slate-900">{fp.slowPct}%</span>
                    <span className="text-slate-500">slow</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="dot bg-rose-500" />
                    <span className="font-semibold text-slate-900">
                      {fp.needHelpPct}%
                    </span>
                    <span className="text-slate-500">need help</span>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
        </Reveal>

        {/* Support */}
        <Reveal>
        <div className="card-base p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="kicker">Nearby support</h3>
            <Link
              href={`/event/${eventId}/venue-map`}
              className="text-xs font-semibold text-violet-700 hover:text-violet-800"
            >
              See on map →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {plan.support_points.map((sp) => (
              <Link
                key={sp.id}
                href={`/event/${eventId}/venue-map`}
                className="list-row min-h-[64px]"
              >
                <span
                  className="thumb-circle"
                  style={{ background: SUPPORT_TONE[sp.type as SupportType] ?? '#7c3aed' }}
                  aria-hidden="true"
                >
                  {SUPPORT_EMOJI[sp.type as SupportType] ?? '📍'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{sp.name}</div>
                  {sp.walk_time_minutes && (
                    <div className="text-xs text-slate-500 mt-0.5">{sp.walk_time_minutes} min walk</div>
                  )}
                </div>
                <span className="text-slate-300 flex-shrink-0">›</span>
              </Link>
            ))}
          </div>
        </div>
        </Reveal>

        <Reveal>
        <button
          onClick={() => setHelpOpen(true)}
          className="btn-secondary w-full !min-h-[56px]"
        >
          Need help? Contact support
        </button>
        </Reveal>

        {/* Compact FanFlow does / doesn't trust panel */}
        <Reveal>
        <div className="card-base p-5">
          <h3 className="kicker mb-3">How FanFlow works</h3>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-semibold text-emerald-700 mb-2">Does</div>
              <ul className="space-y-1.5 text-slate-700">
                <li>✓ Uses your ticket section to guide arrival</li>
                <li>✓ Surfaces venue support relevant to you</li>
                <li>✓ Weighs staff and fan signals carefully</li>
                <li>✓ Explains why a route is recommended</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-rose-700 mb-2">Doesn&apos;t</div>
              <ul className="space-y-1.5 text-slate-700">
                <li>✗ Replace venue staff or signage</li>
                <li>✗ Guarantee wait times</li>
                <li>✗ Predict exact crowd density</li>
                <li>✗ Sell or change tickets</li>
              </ul>
            </div>
          </div>
        </div>
        </Reveal>

        {/* Trust pill — mirrors StubHub's "Prices include all fees" */}
        <div className="flex justify-center pt-2">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-50 border border-violet-100 text-xs font-semibold text-violet-700">
            <span className="dot bg-violet-600" />
            Plan updates live · Free, always
          </span>
        </div>

        <div className="text-xs text-slate-500 text-center pb-4">
          <p>Always follow official venue signage and staff instructions.</p>
          <p className="mt-1">For emergencies, call 911.</p>
        </div>
      </div>

      <HelpSheet
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        plan={plan}
        eventId={eventId}
      />

      {/* Staff-signal-applied toast — fires when a fresh staff signal lands
          via the cross-tab storage event. Makes the architecturally
          impressive moment observable. */}
      <AnimatePresence>
        {staffToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] max-w-[90vw]"
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
    </div>
  )
}
