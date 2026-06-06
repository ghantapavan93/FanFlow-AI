'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { demoParkingLots, demoVenue, deriveArrivalPlan } from '@/lib/seed'
import { getAllSignals, loadReadiness, subscribeToFanflowChanges } from '@/lib/store'
import type { LiveSignal, ParkingLot, ParkingStatus, ReadinessPrefs } from '@/lib/types'
import {
  getRecommendedLot,
  PARKING_STATUS_COLOR as STATUS_COLOR,
  PARKING_STATUS_LABEL as STATUS_LABEL,
} from '@/lib/services/parkingService'
import { SourceChip } from '@/components/shared/SourceChip'
import { ConfidenceChip } from '@/components/shared/ConfidenceChip'
import { SCENES } from '@/lib/scenes/scenes'
import { HelpSheet } from '@/components/shared/HelpSheet'

/* ─────────────────────────────────────────────────────────────────────────
   Parking & Arrival — a first-class scene.

   When a fan is driving, this is the moment that matters: where to park,
   which lot is filling, and the walk from the lot to the recommended gate.
   Parking statuses are simulated demo data and labeled as such on every
   surface. The recommended gate still comes from deriveArrivalPlan.
   ─────────────────────────────────────────────────────────────────────── */

const STATUS_RING: Record<ParkingStatus, string> = {
  open: 'bg-emerald-500',
  filling: 'bg-amber-500',
  limited: 'bg-orange-500',
  full: 'bg-rose-500',
  unknown: 'bg-slate-400',
}

export default function ParkingPage() {
  const params = useParams<{ id: string }>()
  const eventId = params?.id ?? 'wc2026-final'

  const [prefs, setPrefs] = useState<ReadinessPrefs | null>(null)
  const [signals, setSignals] = useState<LiveSignal[]>([])
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [replayKey, setReplayKey] = useState(0)

  useEffect(() => {
    const refresh = () => {
      setPrefs(loadReadiness())
      setSignals(getAllSignals())
    }
    refresh()
    return subscribeToFanflowChanges(['fanflow:readiness', 'fanflow:signals'], refresh)
  }, [])

  const plan = useMemo(
    () => deriveArrivalPlan(prefs, signals.length ? signals : undefined),
    [prefs, signals],
  )
  const recommendedGate = demoVenue.gates.find((g) => g.id === plan.recommended_gate.id)!
  const gateLabel = recommendedGate.name.split(' (')[0]

  const recommendedLot = getRecommendedLot(plan.recommended_gate.id) ?? demoParkingLots[0]
  const activeLot: ParkingLot =
    demoParkingLots.find((l) => l.id === selectedLotId) ?? recommendedLot

  const driving = prefs?.transport === 'driving'
  const scene = SCENES.parking

  return (
    <>
      <div className={`min-h-screen ${scene.backgroundClass} pb-24 page-enter`}>
        {/* Sticky brand bar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100">
          <div className="container-mobile px-4 h-14 flex items-center justify-between">
            <Link href={`/event/${eventId}/hub`} className="text-sm text-slate-500 hover:text-slate-700">
              ← Hub
            </Link>
            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-900 text-sm">Parking & Arrival</span>
              <span className="text-[10px] font-bold bg-gradient-to-br from-sky-500 to-violet-600 text-white px-1.5 py-0.5 rounded">
                DEMO
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
          {/* === Recommended lot hero with car→gate animation ========= */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 via-sky-700 to-violet-700 text-white p-5 shadow-lg shadow-sky-500/20"
          >
            <div className="shimmer-overlay" aria-hidden="true" />
            <div aria-hidden="true" className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.5),transparent_60%)]" />
            <div className="relative">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-100">
                  Recommended parking
                </div>
                <SourceChip source="simulated_demo" size="xs" short />
              </div>
              <div className="font-extrabold text-2xl leading-tight">
                {recommendedLot.name.replace(' (Recommended)', '')}
              </div>
              <p className="text-[12px] text-sky-100/85 mt-1.5 leading-relaxed">
                {recommendedLot.notes ?? `Closest open lot to ${gateLabel}.`}
              </p>

              {/* Car → lot → gate route strip */}
              <div className="mt-4 flex items-center gap-2">
                <span className="text-base flex-shrink-0">🚗</span>
                <div className="flex-1 relative h-[3px] rounded-full bg-white/20 overflow-hidden">
                  <motion.div
                    key={`fill-${replayKey}`}
                    className="absolute inset-y-0 left-0 rounded-full bg-white/80"
                    initial={{ width: '0%' }}
                    animate={{ width: '60%' }}
                    transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <span className="w-6 h-6 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center text-[11px] font-bold flex-shrink-0">P</span>
                <div className="flex-1 relative h-[3px] rounded-full bg-white/20 overflow-hidden">
                  <motion.div
                    key={`fill2-${replayKey}`}
                    className="absolute inset-y-0 left-0 rounded-full bg-white/80"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1.1, delay: 1.0, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <span className="text-base flex-shrink-0">🚪</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-sky-100/80 mt-1.5">
                <span>Drive in</span>
                <span>~{recommendedLot.walk_time_to_gate_minutes} min walk to {gateLabel}</span>
              </div>

              <button
                onClick={() => setReplayKey((k) => k + 1)}
                className="mt-3 text-[11px] font-semibold text-sky-100 hover:text-white inline-flex items-center gap-1"
              >
                ↻ Replay arrival
              </button>
            </div>
          </motion.section>

          {/* === Driving-preference nudge ============================= */}
          {!driving && (
            <div className="rounded-2xl bg-white border border-slate-200 p-3.5 flex items-center gap-3">
              <span className="text-lg flex-shrink-0">🚗</span>
              <p className="text-[12px] text-slate-600 leading-snug flex-1">
                Not driving? You can switch your arrival mode and FanFlow will re-plan.
              </p>
              <Link
                href={`/event/${eventId}/readiness`}
                className="text-[11px] font-bold text-violet-700 whitespace-nowrap hover:underline"
              >
                Update ›
              </Link>
            </div>
          )}

          {/* === Parking signs rising in ============================= */}
          <section>
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="kicker text-sky-700">All lots</div>
              <SourceChip source="simulated_demo" size="xs" />
            </div>
            <div className="space-y-2.5">
              {demoParkingLots.map((lot, i) => {
                const isActive = lot.id === activeLot.id
                return (
                  <motion.button
                    key={lot.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                    onClick={() => setSelectedLotId(lot.id)}
                    className={`w-full text-left rounded-2xl border p-4 transition ${
                      isActive
                        ? 'bg-white border-sky-300 shadow-[0_4px_20px_-8px_rgba(14,165,233,0.3)]'
                        : 'bg-white border-slate-200 hover:border-sky-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Traffic-light status */}
                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        <span className={`w-3 h-3 rounded-full ${lot.status === 'open' || lot.status === 'filling' ? STATUS_RING[lot.status] : 'bg-slate-200'}`} />
                        <span className={`w-3 h-3 rounded-full ${lot.status === 'limited' ? STATUS_RING[lot.status] : 'bg-slate-200'}`} />
                        <span className={`w-3 h-3 rounded-full ${lot.status === 'full' ? STATUS_RING[lot.status] : 'bg-slate-200'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-[15px] truncate">
                            {lot.name.replace(' (Recommended)', '')}
                          </span>
                          {lot.id === recommendedLot.id && (
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded">
                              ★ Best
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${
                              lot.status === 'filling' || lot.status === 'limited' ? 'animate-pulse' : ''
                            }`}
                            style={{ background: STATUS_COLOR[lot.status] }}
                          >
                            {(lot.status === 'filling' || lot.status === 'limited') && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
                            )}
                            {STATUS_LABEL[lot.status]}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            ~{lot.walk_time_to_gate_minutes} min walk
                          </span>
                        </div>
                      </div>
                      <ConfidenceChip level={lot.status_confidence} short />
                    </div>
                    {isActive && lot.notes && (
                      <p className="text-[12px] text-slate-600 mt-3 leading-relaxed border-t border-slate-100 pt-3">
                        {lot.notes}
                      </p>
                    )}
                  </motion.button>
                )
              })}
            </div>
            <p className="text-[10px] text-slate-400 mt-3 leading-relaxed px-1">
              Parking statuses are simulated demo data — not a live availability feed. Always
              follow posted lot signage and attendants on the day.
            </p>
          </section>

          {/* === Continue to map ===================================== */}
          <Link
            href={`/event/${eventId}/venue-map`}
            className="block w-full text-center px-4 py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition shadow-sm shadow-violet-500/20"
          >
            See the full route on the map →
          </Link>
        </main>

        {/* Bottom tab nav */}
        <nav
          className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="container-mobile h-16 grid grid-cols-4 px-2">
            <Link href={`/event/${eventId}/hub`} className="flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-semibold text-slate-500 hover:text-slate-700">
              <span className="flex items-center justify-center w-9 h-9 rounded-full text-xl">✦</span>
              Guide
            </Link>
            <Link href={`/event/${eventId}/venue-map`} className="flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-semibold text-slate-500 hover:text-slate-700">
              <span className="flex items-center justify-center w-9 h-9 rounded-full text-xl">🗺️</span>
              Map
            </Link>
            <Link href={`/event/${eventId}/pulse`} className="flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-semibold text-slate-500 hover:text-slate-700">
              <span className="flex items-center justify-center w-9 h-9 rounded-full text-xl">📊</span>
              Pulse
            </Link>
            <button onClick={() => setHelpOpen(true)} className="flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-semibold text-slate-500 hover:text-slate-700">
              <span className="flex items-center justify-center w-9 h-9 rounded-full text-xl">🎧</span>
              Help
            </button>
          </div>
        </nav>
      </div>

      <HelpSheet open={helpOpen} onClose={() => setHelpOpen(false)} plan={plan} eventId={eventId} />
    </>
  )
}
