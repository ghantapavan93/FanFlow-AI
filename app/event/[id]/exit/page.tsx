'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { demoEvent, demoTicket, demoVenue, deriveArrivalPlan } from '@/lib/seed'
import { getAllSignals, loadReadiness, subscribeToFanflowChanges } from '@/lib/store'
import type { LiveSignal, ReadinessPrefs } from '@/lib/types'
import { getRecommendedLot } from '@/lib/services/parkingService'
import { SourceChip } from '@/components/shared/SourceChip'
import { SCENES } from '@/lib/scenes/scenes'
import { HelpSheet } from '@/components/shared/HelpSheet'

/* ─────────────────────────────────────────────────────────────────────────
   ExitFlow — the post-event moment that completes the journey from
   purchase → arrival → entry → venue → support → exit.

   Routing here is estimated from venue layout and the fan's arrival mode;
   it is labeled `estimated` and never claims live closure or crowd data.
   ─────────────────────────────────────────────────────────────────────── */

export default function ExitFlowPage() {
  const params = useParams<{ id: string }>()
  const eventId = params?.id ?? 'wc2026-final'

  const [prefs, setPrefs] = useState<ReadinessPrefs | null>(null)
  const [signals, setSignals] = useState<LiveSignal[]>([])
  const [helpOpen, setHelpOpen] = useState(false)

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
  const recommendedLot = getRecommendedLot(plan.recommended_gate.id)
  const lotName = recommendedLot?.name.replace(' (Recommended)', '') ?? 'your lot'
  const scene = SCENES.exit

  // The exit options the fan sees depend on how they arrived.
  const transport = prefs?.transport
  const primary =
    transport === 'driving'
      ? { icon: '🚗', label: 'Back to your car', detail: `${lotName} · ~${recommendedLot?.walk_time_to_gate_minutes ?? 8} min walk`, accent: true }
      : transport === 'rideshare'
        ? { icon: '📱', label: 'Rideshare pickup zone', detail: 'Designated lot on the south side · stagger your request 10–15 min', accent: true }
        : transport === 'transit'
          ? { icon: '🚆', label: 'Rail platform', detail: 'North concourse exit · trains every few minutes post-event', accent: true }
          : { icon: '🚪', label: 'Best exit on foot', detail: 'Nearest concourse exit from your section', accent: true }

  const secondary = [
    { icon: '🚪', label: 'Best exit from your section', detail: `From Section ${demoTicket.section}, follow concourse signs to the nearest open exit` },
    { icon: '🚗', label: 'Parking', detail: `${lotName} · expect slower egress in the first 20 min` },
    { icon: '📱', label: 'Rideshare', detail: 'South-side pickup lot' },
    { icon: '🚆', label: 'Transit', detail: 'Rail platform via north concourse' },
    { icon: '📍', label: 'Group meeting point', detail: 'Main plaza fountain — easy to find if you split up' },
  ].filter((r) => r.label !== primary.label)

  return (
    <>
      <div className={`min-h-screen ${scene.backgroundClass} pb-24 page-enter`}>
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100">
          <div className="container-mobile px-4 h-14 flex items-center justify-between">
            <Link href={`/event/${eventId}/hub`} className="text-sm text-slate-500 hover:text-slate-700">
              ← Hub
            </Link>
            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-900 text-sm">ExitFlow</span>
              <span className="text-[10px] font-bold bg-gradient-to-br from-slate-600 to-violet-600 text-white px-1.5 py-0.5 rounded">
                AFTER
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
          {/* === Hero ============================================== */}
          <section className="pt-1">
            <div className="kicker text-slate-600">After the final whistle</div>
            <h1 className="font-extrabold text-slate-900 text-[28px] tracking-tight leading-[1.08] mt-2">
              The smoothest way out.
            </h1>
            <p className="text-[13px] text-slate-600 mt-2 leading-relaxed">
              When the match ends, FanFlow flips into exit mode — your route back, mapped to how
              you arrived.
            </p>
          </section>

          {/* === Primary exit recommendation ====================== */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="surface-night relative overflow-hidden rounded-3xl text-white p-5 shadow-[0_10px_30px_-12px_rgba(76,29,149,0.55)]"
          >
            <div aria-hidden="true" className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_top_right,rgba(167,139,250,0.4),transparent_60%)]" />
            <div className="relative">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-violet-200">
                  Your exit
                </div>
                <SourceChip source="estimated" size="xs" short />
              </div>
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl flex-shrink-0">
                  {primary.icon}
                </span>
                <div className="min-w-0">
                  <div className="font-extrabold text-lg leading-tight">{primary.label}</div>
                  <div className="text-[12px] text-violet-100/85 mt-0.5 leading-snug">{primary.detail}</div>
                </div>
              </div>
              {/* Route strip seat → exit */}
              <div className="mt-4 flex items-center gap-2">
                <span className="text-[10px] font-bold text-violet-200">Sec {demoTicket.section}</span>
                <div className="flex-1 relative h-[3px] rounded-full bg-white/20 overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-white/70"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <span className="text-base">{primary.icon}</span>
              </div>
            </div>
          </motion.section>

          {/* === Crowd-aware exit note ============================= */}
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
            <span className="text-lg flex-shrink-0">⏱️</span>
            <p className="text-[12px] text-amber-900 leading-relaxed">
              <strong>Crowd-aware tip:</strong> the heaviest egress is the first 15–20 minutes after
              the final whistle. If you’re not rushing, a short wait near your section often means a
              faster, calmer walk out.
            </p>
          </div>

          {/* === Other options ==================================== */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_-8px_rgba(124,58,237,0.10)]">
            <div className="kicker text-violet-700 mb-3">Other ways out</div>
            <div className="space-y-2">
              {secondary.map((row) => (
                <div key={row.label} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-lg flex-shrink-0">
                    {row.icon}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold text-slate-900 leading-tight">{row.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{row.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* === Recap ============================================ */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl bg-gradient-to-br from-violet-50 via-white to-fuchsia-50/30 border border-violet-200 p-5"
          >
            <div className="kicker text-violet-700 mb-2">Your day with FanFlow</div>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] font-semibold text-slate-700">
              {['Ticket', 'Plan', 'Parking', 'Gate', 'Seat', 'Exit'].map((step, i, arr) => (
                <span key={step} className="inline-flex items-center gap-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white border border-violet-200 text-violet-700">
                    {step}
                  </span>
                  {i < arr.length - 1 && <span className="text-slate-300">→</span>}
                </span>
              ))}
            </div>
            <p className="text-[12px] text-slate-600 mt-3 leading-relaxed">
              From checkout to the walk back to {lotName}, FanFlow stayed with you the whole way.
              Safe travels — and enjoy {demoEvent.name.replace('FIFA World Cup 2026 Final', 'the final')}.
            </p>
          </motion.section>

          <p className="text-[10px] text-slate-400 text-center px-4 leading-relaxed">
            Exit routing is estimated from {demoVenue.name} layout — confirm against on-site signage
            and staff direction on the day.
          </p>
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
