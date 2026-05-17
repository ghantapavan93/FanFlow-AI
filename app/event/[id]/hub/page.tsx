'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { demoEvent, demoVenue, deriveArrivalPlan } from '@/lib/seed'
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
import { motion } from 'framer-motion'
import type { SupportType } from '@/lib/types'

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
    <div className="min-h-screen page-bg">
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
        {/* Event Hero — StubHub-style confirmation card */}
        <div className="card-base overflow-hidden">
          <div
            className="h-32 sm:h-40 bg-cover bg-center relative"
            style={{ backgroundImage: `url(${demoEvent.image_url})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute top-3 left-3">
              <span className="badge-trust bg-white/95">
                <span className="dot bg-rose-500" /> Confirmed
              </span>
            </div>
            <div className="absolute bottom-3 left-4 right-4 text-white">
              <div className="text-[11px] font-semibold uppercase tracking-widest opacity-90">🏆 FIFA World Cup 2026</div>
              <h2 className="text-xl sm:text-2xl font-bold leading-tight">{demoEvent.name}</h2>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">{demoVenue.name}</div>
                <div className="text-xs text-slate-500">East Rutherford, NJ · Section 117</div>
              </div>
              <span className="chip-status-live">
                <span className="dot bg-emerald-500" /> Live
              </span>
            </div>
            <div className="border-t border-slate-200 pt-3">
              <div className="kicker mb-2">Time to event</div>
              <div className="font-mono text-2xl font-bold text-slate-900 tracking-wide">{countdown}</div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono tracking-widest">
                DAYS &nbsp; HRS &nbsp; MINS &nbsp; SECS
              </div>
            </div>
          </div>
        </div>

        {/* Post-purchase unlock moment — anchors FanFlow as a StubHub benefit */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-white p-5 sm:p-6"
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

        {/* Personalize CTA — StubHub-style lavender promo banner */}
        {hydrated && !prefs && (
          <div className="promo-banner">
            <span className="w-9 h-9 rounded-full bg-violet-600 text-white flex items-center justify-center text-base flex-shrink-0">
              ✨
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-900 text-sm sm:text-base">
                Want a tailored plan?
              </div>
              <div className="text-xs sm:text-sm text-slate-600 mt-0.5 hidden sm:block">
                60 seconds. Personalize your gate and timing.
              </div>
            </div>
            <Link
              href={`/event/${eventId}/readiness`}
              className="inline-flex items-center justify-center min-h-[40px] px-4 rounded-full bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 active:bg-violet-800 transition flex-shrink-0 whitespace-nowrap"
            >
              Personalize
            </Link>
          </div>
        )}

        {/* Impact cards — render only when there are reasons to show */}
        {hydrated && <ImpactCards plan={plan} prefs={prefs} signals={signals} />}

        {/* Arrival Plan */}
        <div className="rounded-2xl border border-slate-200 p-5 sm:p-6 bg-white">
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
              {plan.confidence === 'high' ? '🟢' : plan.confidence === 'medium' ? '🟡' : '🔴'}{' '}
              {plan.confidence.charAt(0).toUpperCase() + plan.confidence.slice(1)} Confidence
            </span>
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="text-slate-600 font-medium">Leave by</span>
              <span className="font-bold text-lg text-slate-900">{plan.leave_by_time}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="text-slate-600 font-medium">Arrive at</span>
              <span className="font-bold text-lg text-slate-900">{plan.arrival_time}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-600 font-medium">Gate</span>
              <span className="font-bold text-lg text-violet-600">{plan.recommended_gate.name}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-100 rounded-lg mb-4">
            <p className="text-sm text-slate-700">{plan.route_summary}</p>
          </div>

          <Link
            href={`/event/${eventId}/guide`}
            className="btn-primary w-full"
          >
            View Full Arrival Guide →
          </Link>
        </div>

        {/* Checklist */}
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

        {/* Live Conditions */}
        <div className="card-base p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="kicker">Live conditions</h3>
            <span className="text-xs text-slate-500">
              {signals.length} signal{signals.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="space-y-2">
            {visibleSignals.length === 0 ? (
              <p className="text-sm text-slate-500 italic py-2">
                No live signals yet. Conditions will update as staff and fans report in.
              </p>
            ) : (
              visibleSignals.map((signal) => {
                const sentimentColor =
                  signal.sentiment === 'smooth'
                    ? 'badge-success'
                    : signal.sentiment === 'moderate'
                    ? 'badge-warning'
                    : 'badge-danger'
                const sentimentEmoji =
                  signal.sentiment === 'smooth'
                    ? '🟢'
                    : signal.sentiment === 'moderate'
                    ? '🟡'
                    : '🔴'
                const gate = demoVenue.gates.find((g) => g.id === signal.gate_id)
                return (
                  <div
                    key={signal.id}
                    className="flex items-start justify-between gap-3 py-2 border-b border-slate-200 last:border-0"
                  >
                    <div className="flex-1">
                      <div className="text-sm text-slate-800">{signal.message}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {gate?.name ?? signal.gate_id} ·{' '}
                        {signal.source === 'staff' ? '👮 Staff' : '🙋 Fan'}
                      </div>
                    </div>
                    <span className={`${sentimentColor} text-xs whitespace-nowrap`}>
                      {sentimentEmoji} {signal.sentiment}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Fan Pulse */}
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
        </div>

        {/* Support */}
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

        <button
          onClick={() => setHelpOpen(true)}
          className="btn-secondary w-full !min-h-[56px]"
        >
          Need help? Contact support
        </button>

        {/* Compact FanFlow does / doesn't trust panel */}
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
    </div>
  )
}
