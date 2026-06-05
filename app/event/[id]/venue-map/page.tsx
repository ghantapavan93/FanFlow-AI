'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { demoParkingLots, demoTicket, demoVenue, deriveArrivalPlan } from '@/lib/seed'
import { getAllSignals, loadReadiness, subscribeToFanflowChanges } from '@/lib/store'
import type {
  Gate,
  LiveSignal,
  ParkingLot,
  ReadinessPrefs,
  SupportPoint,
  SupportType,
} from '@/lib/types'
import { HelpSheet } from '@/components/shared/HelpSheet'
import { SourceChip } from '@/components/shared/SourceChip'
import { ConfidenceChip } from '@/components/shared/ConfidenceChip'
import { getGateCrowd } from '@/lib/services/crowdService'
import { PARKING_STATUS_COLOR, PARKING_STATUS_LABEL } from '@/lib/services/parkingService'
import { SCENES } from '@/lib/scenes/scenes'

/* ─────────────────────────────────────────────────────────────────────────
   Venue Map — the hero product surface.

   A layer system drives the whole experience. Selecting a layer changes:
     - the page background tint (via the scene engine)
     - which overlay renders on the stadium SVG
     - the content card shown beneath the map
     - the route treatment

   Every "live" claim (parking status, gate crowd, etc.) renders a
   SourceChip + ConfidenceChip so the demo never overclaims. The rule
   engine (deriveArrivalPlan) and crowd math (crowdService → computeFanPulse)
   are untouched — this page only renders their output.
   ─────────────────────────────────────────────────────────────────────── */

type LayerId =
  | 'route'
  | 'parking'
  | 'gates'
  | 'crowd'
  | 'restrooms'
  | 'accessibility'
  | 'support'
  | 'exit'

const LAYERS: { id: LayerId; label: string; icon: string }[] = [
  { id: 'route', label: 'Route', icon: '🧭' },
  { id: 'parking', label: 'Parking', icon: '🅿️' },
  { id: 'gates', label: 'Gates', icon: '🚪' },
  { id: 'crowd', label: 'Crowd', icon: '📊' },
  { id: 'restrooms', label: 'Restrooms', icon: '🚻' },
  { id: 'accessibility', label: 'Access', icon: '♿' },
  { id: 'support', label: 'Support', icon: '🤝' },
  { id: 'exit', label: 'Exit', icon: '🚗' },
]

/** Maps each layer to a scene so background + tone stay aligned. */
const LAYER_SCENE: Record<LayerId, keyof typeof SCENES> = {
  route: 'gate_guidance',
  parking: 'parking',
  gates: 'gate_guidance',
  crowd: 'crowd_pulse',
  restrooms: 'restrooms',
  accessibility: 'accessibility',
  support: 'support',
  exit: 'exit',
}

type Marker =
  | { kind: 'gate'; data: Gate; recommended: boolean }
  | { kind: 'support'; data: SupportPoint }
  | { kind: 'parking'; data: ParkingLot }

const SUPPORT_META: Record<SupportType, { emoji: string; tone: string; label: string }> = {
  first_aid: { emoji: '➕', tone: '#dc2626', label: 'First Aid' },
  family_services: { emoji: '👶', tone: '#7c3aed', label: 'Family' },
  accessibility: { emoji: '♿', tone: '#0ea5e9', label: 'Accessibility' },
  restroom: { emoji: '🚻', tone: '#475569', label: 'Restroom' },
  guest_services: { emoji: 'ℹ️', tone: '#0891b2', label: 'Guest Services' },
  quiet_space: { emoji: '🧩', tone: '#16a34a', label: 'Quiet Space' },
  concessions: { emoji: '🍿', tone: '#ea580c', label: 'Concessions' },
}

/** Which support types each "facility" layer surfaces. */
const RESTROOM_TYPES: SupportType[] = ['restroom', 'family_services']
const ACCESS_TYPES: SupportType[] = ['accessibility', 'guest_services']
const SUPPORT_TYPES: SupportType[] = ['first_aid', 'guest_services', 'accessibility', 'quiet_space']

export default function VenueMapPage() {
  const params = useParams<{ id: string }>()
  const eventId = params?.id ?? 'wc2026-final'

  const [prefs, setPrefs] = useState<ReadinessPrefs | null>(null)
  const [signals, setSignals] = useState<LiveSignal[]>([])
  const [selected, setSelected] = useState<Marker | null>(null)
  const [layer, setLayer] = useState<LayerId>('route')
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

  // Replay the route/marker animation whenever the layer changes.
  useEffect(() => {
    setSelected(null)
    setReplayKey((k) => k + 1)
  }, [layer])

  const plan = useMemo(
    () => deriveArrivalPlan(prefs, signals.length ? signals : undefined),
    [prefs, signals],
  )

  // Compute crowd state for every gate ONCE per signal change, from the
  // already-loaded signals — instead of re-reading localStorage inside each
  // render loop. Keyed by gate id for O(1) lookup in the SVG + content list.
  const gateCrowds = useMemo(() => {
    const map: Record<string, ReturnType<typeof getGateCrowd>> = {}
    for (const g of demoVenue.gates) map[g.id] = getGateCrowd(g.id, signals)
    return map
  }, [signals])

  const recommendedGateId = plan.recommended_gate.id
  const recommendedGate = demoVenue.gates.find((g) => g.id === recommendedGateId)!
  const gateLabel = recommendedGate.name.split(' (')[0]

  const recommendedLot =
    demoParkingLots.find((l) => l.recommended_gate_id === recommendedGateId && l.status === 'open') ??
    demoParkingLots.find((l) => l.status === 'open') ??
    demoParkingLots[0]

  const scene = SCENES[LAYER_SCENE[layer]]

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
              <span className="font-bold text-slate-900 text-sm">Venue Map</span>
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
          {/* === Layer scene hero ==================================== */}
          <motion.section
            key={`hero-${layer}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="surface-night relative overflow-hidden rounded-3xl text-white p-5 shadow-[0_10px_30px_-12px_rgba(76,29,149,0.55)]"
          >
            <div className="shimmer-overlay" aria-hidden="true" />
            <motion.div
              aria-hidden="true"
              className="absolute -top-12 -right-10 w-44 h-44 rounded-full bg-violet-500/20 blur-3xl"
              animate={{ x: [0, 18, 0], y: [0, 12, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="relative">
              <div className="text-[10px] font-bold uppercase tracking-wider text-violet-200">
                {scene.eyebrow}
              </div>
              <div className="font-extrabold text-2xl leading-tight mt-1">{scene.title}</div>
              <p className="text-[12px] text-violet-100/85 mt-2 leading-relaxed">
                {layer === 'route' &&
                  `${gateLabel} → Section ${demoTicket.section}. Your cleanest path in.`}
                {layer === 'parking' &&
                  `${recommendedLot.name.replace(' (Recommended)', '')} → ${gateLabel}, about ${recommendedLot.walk_time_to_gate_minutes} min on foot.`}
                {layer === 'gates' && `Comparing every gate by proximity, wait, and live signals.`}
                {layer === 'crowd' && `Venue zones colored by current crowd signal.`}
                {layer === 'restrooms' && `Nearest, family, and accessible facilities to Section ${demoTicket.section}.`}
                {layer === 'accessibility' && `Step-free route, accessible entry, and guest services.`}
                {layer === 'support' && `Verified help points, mapped to your seat.`}
                {layer === 'exit' && `Best way out after the final whistle.`}
              </p>
            </div>
          </motion.section>

          {/* === Layer toggle bar =================================== */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {LAYERS.map((l) => {
              const active = layer === l.id
              return (
                <button
                  key={l.id}
                  onClick={() => setLayer(l.id)}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-semibold transition border ${
                    active
                      ? 'bg-violet-600 border-violet-500 text-white glow-violet'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300'
                  }`}
                >
                  <span aria-hidden="true">{l.icon}</span>
                  {l.label}
                </button>
              )
            })}
          </div>

          {/* === Stadium map ======================================= */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_4px_20px_-8px_rgba(124,58,237,0.10)]"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-900 text-sm">{demoVenue.name}</h2>
              <button
                onClick={() => setReplayKey((k) => k + 1)}
                className="text-[11px] font-semibold text-violet-700 hover:text-violet-800 inline-flex items-center gap-1"
                aria-label="Replay animation"
              >
                ↻ Replay
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
              <svg
                viewBox="0 0 520 340"
                className="w-full h-auto"
                role="img"
                aria-label={`Stylized ${demoVenue.name} map — ${layer} layer`}
              >
                <defs>
                  <radialGradient id="field" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#bbf7d0" />
                    <stop offset="100%" stopColor="#86efac" />
                  </radialGradient>
                </defs>

                {/* Concourse + field */}
                <ellipse cx="260" cy="170" rx="220" ry="120" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1.5" />
                <ellipse cx="260" cy="170" rx="170" ry="85" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
                <ellipse cx="260" cy="170" rx="120" ry="55" fill="url(#field)" stroke="#22c55e" strokeWidth="1.5" opacity="0.85" />
                <line x1="260" y1="115" x2="260" y2="225" stroke="#fff" strokeWidth="1.5" />
                <circle cx="260" cy="170" r="14" fill="none" stroke="#fff" strokeWidth="1.5" />
                <text x="260" y="28" textAnchor="middle" fontSize="10" fill="#94a3b8" fontWeight="600">NORTH</text>
                <text x="260" y="320" textAnchor="middle" fontSize="10" fill="#94a3b8" fontWeight="600">SOUTH</text>

                {/* Seat marker — always visible */}
                <motion.circle
                  cx="260" cy="228" r="16" fill="#7c3aed" opacity="0.22"
                  animate={{ r: [12, 20, 12], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                />
                <circle cx="260" cy="228" r="8" fill="#7c3aed" stroke="#fff" strokeWidth="2" />
                <text x="260" y="250" textAnchor="middle" fontSize="9" fill="#7c3aed" fontWeight="700">
                  Section {demoTicket.section}
                </text>

                {/* ROUTE / GATES / CROWD / ACCESS / EXIT overlays use the gate→seat line */}
                {(layer === 'route' || layer === 'accessibility') && (
                  <RouteLine
                    key={`route-${replayKey}`}
                    from={{ x: recommendedGate.map_x ?? 260, y: recommendedGate.map_y ?? 90 }}
                    to={{ x: 260, y: 228 }}
                    color={layer === 'accessibility' ? '#0ea5e9' : '#7c3aed'}
                  />
                )}

                {layer === 'exit' && (
                  <RouteLine
                    key={`exit-${replayKey}`}
                    from={{ x: 260, y: 228 }}
                    to={{ x: recommendedLot.map_x ?? 60, y: recommendedLot.map_y ?? 60 }}
                    color="#475569"
                    dashed
                  />
                )}

                {layer === 'parking' && (
                  <RouteLine
                    key={`park-route-${replayKey}`}
                    from={{ x: recommendedLot.map_x ?? 60, y: recommendedLot.map_y ?? 60 }}
                    to={{ x: recommendedGate.map_x ?? 260, y: recommendedGate.map_y ?? 90 }}
                    color="#0ea5e9"
                  />
                )}

                {/* Parking markers */}
                {layer === 'parking' &&
                  demoParkingLots.map((lot, i) => {
                    const x = lot.map_x ?? 0
                    const y = lot.map_y ?? 0
                    const active = selected?.kind === 'parking' && selected.data.id === lot.id
                    return (
                      <motion.g
                        key={`lot-${lot.id}-${replayKey}`}
                        onClick={() => setSelected({ kind: 'parking', data: lot })}
                        style={{ cursor: 'pointer', transformOrigin: `${x}px ${y}px` }}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: 0.2 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <rect
                          x={x - 13} y={y - 11} width="26" height="22" rx="5"
                          fill={PARKING_STATUS_COLOR[lot.status]}
                          stroke={active ? '#1e293b' : '#fff'} strokeWidth="2"
                        />
                        <text x={x} y={y + 5} textAnchor="middle" fontSize="12" fill="#fff" fontWeight="700">P</text>
                      </motion.g>
                    )
                  })}

                {/* Gate markers — route/gates/crowd/exit layers */}
                {(layer === 'route' || layer === 'gates' || layer === 'crowd' || layer === 'exit') &&
                  demoVenue.gates.map((g, i) => {
                    const x = g.map_x ?? 0
                    const y = g.map_y ?? 0
                    const recommended = g.id === recommendedGateId
                    const active = selected?.kind === 'gate' && selected.data.id === g.id
                    const crowd = gateCrowds[g.id]
                    const crowdColor =
                      crowd.pressure === 'busy'
                        ? '#ef4444'
                        : crowd.pressure === 'moderate'
                          ? '#f59e0b'
                          : crowd.pressure === 'smooth'
                            ? '#10b981'
                            : '#64748b'
                    const fill =
                      layer === 'crowd'
                        ? crowdColor
                        : recommended
                          ? '#7c3aed'
                          : '#1e293b'
                    return (
                      <motion.g
                        key={`gate-${g.id}-${replayKey}`}
                        onClick={() => setSelected({ kind: 'gate', data: g, recommended })}
                        style={{ cursor: 'pointer', transformOrigin: `${x}px ${y}px` }}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.45, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                      >
                        {(recommended && layer !== 'crowd') || (layer === 'crowd' && crowd.pressure === 'busy') ? (
                          <circle cx={x} cy={y} r="22" fill="none" stroke={fill} strokeWidth="2" opacity="0.4">
                            <animate attributeName="r" from="14" to="26" dur="1.8s" repeatCount="indefinite" />
                            <animate attributeName="opacity" from="0.6" to="0" dur="1.8s" repeatCount="indefinite" />
                          </circle>
                        ) : null}
                        <rect
                          x={x - 16} y={y - 12} width="32" height="24" rx="6"
                          fill={fill} stroke={active ? '#fbbf24' : '#fff'} strokeWidth="2"
                        />
                        <text x={x} y={y + 5} textAnchor="middle" fontSize="11" fill="#fff" fontWeight="700">
                          {g.name.match(/Gate (\d+)/)?.[1] ?? '?'}
                        </text>
                      </motion.g>
                    )
                  })}

                {/* Support / facility markers */}
                {(layer === 'restrooms' || layer === 'accessibility' || layer === 'support') &&
                  demoVenue.support_points
                    .filter((sp) =>
                      layer === 'restrooms'
                        ? RESTROOM_TYPES.includes(sp.type)
                        : layer === 'accessibility'
                          ? ACCESS_TYPES.includes(sp.type)
                          : SUPPORT_TYPES.includes(sp.type),
                    )
                    .map((sp, i) => {
                      const meta = SUPPORT_META[sp.type]
                      const x = sp.map_x ?? 0
                      const y = sp.map_y ?? 0
                      const active = selected?.kind === 'support' && selected.data.id === sp.id
                      return (
                        <motion.g
                          key={`sp-${sp.id}-${replayKey}`}
                          onClick={() => setSelected({ kind: 'support', data: sp })}
                          style={{ cursor: 'pointer', transformOrigin: `${x}px ${y}px` }}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.4, delay: 0.25 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <circle cx={x} cy={y} r={active ? 13 : 10} fill={meta.tone} stroke="#fff" strokeWidth="2" opacity={active ? 1 : 0.92} />
                          <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fill="#fff">{meta.emoji}</text>
                        </motion.g>
                      )
                    })}
              </svg>
            </div>

            {/* Honest source line under the map */}
            <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
              {layer === 'parking' || layer === 'crowd' ? (
                <SourceChip source={layer === 'parking' ? 'simulated_demo' : 'fan_reported'} size="xs" />
              ) : (
                <span className="text-[10px] text-slate-400">Tap any marker for detail.</span>
              )}
              <span className="text-[10px] text-slate-400">Stylized map · follow venue signage.</span>
            </div>
          </motion.section>

          {/* === Tap-to-inspect detail card ======================== */}
          <AnimatePresence mode="wait">
            {selected && (
              <motion.section
                key={
                  selected.kind === 'gate'
                    ? `g-${selected.data.id}`
                    : selected.kind === 'parking'
                      ? `p-${selected.data.id}`
                      : `s-${selected.data.id}`
                }
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-3xl border border-violet-200/70 bg-white p-5 shadow-[0_4px_20px_-8px_rgba(124,58,237,0.12)]"
              >
                <DetailCard selected={selected} onClose={() => setSelected(null)} />
              </motion.section>
            )}
          </AnimatePresence>

          {/* === Layer content card ================================ */}
          <LayerContent
            layer={layer}
            plan={plan}
            recommendedGate={recommendedGate}
            recommendedLot={recommendedLot}
            gateCrowds={gateCrowds}
            onSelect={setSelected}
          />

          {/* === One-tap help ===================================== */}
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            onClick={() => setHelpOpen(true)}
            className="w-full rounded-3xl bg-gradient-to-br from-violet-50 to-white border border-violet-200 p-4 text-left hover:from-violet-100 transition group"
          >
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white flex items-center justify-center text-lg flex-shrink-0 shadow-md shadow-violet-500/25">
                🎧
              </span>
              <div className="flex-1 min-w-0">
                <div className="kicker text-violet-700">Need help finding something?</div>
                <div className="text-xs text-slate-600 mt-0.5 leading-snug">
                  Tap for support mapped to your gate and section.
                </div>
              </div>
              <span className="text-violet-700 text-lg group-hover:translate-x-0.5 transition-transform">›</span>
            </div>
          </motion.button>
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
            <div className="flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-semibold text-violet-700">
              <span className="flex items-center justify-center w-9 h-9 rounded-full text-xl bg-violet-100">🗺️</span>
              Map
            </div>
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

/* ── Animated route line (glow underlay + dashed/solid path + travelling dot) ── */
function RouteLine({
  from,
  to,
  color,
  dashed = false,
}: {
  from: { x: number; y: number }
  to: { x: number; y: number }
  color: string
  dashed?: boolean
}) {
  const d = `M ${from.x} ${from.y} L ${to.x} ${to.y}`
  return (
    <>
      <motion.path
        d={d} stroke={color} strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.15"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
      />
      <motion.path
        d={d} stroke={color} strokeWidth="3" fill="none" strokeLinecap="round"
        strokeDasharray={dashed ? '6 4' : undefined} opacity="0.85"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
      />
      <motion.circle
        r="4" fill={color} stroke="#fff" strokeWidth="2"
        initial={{ cx: from.x, cy: from.y, opacity: 0 }}
        animate={{ cx: [from.x, to.x], cy: [from.y, to.y], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 2.4, delay: 1.1, repeat: Infinity, repeatDelay: 1, ease: 'easeInOut' }}
      />
    </>
  )
}

/* ── Detail card for a tapped marker ── */
function DetailCard({ selected, onClose }: { selected: Marker; onClose: () => void }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {selected.kind === 'gate'
              ? 'Entrance'
              : selected.kind === 'parking'
                ? 'Parking lot'
                : SUPPORT_META[selected.data.type].label}
          </div>
          <h3 className="font-bold text-slate-900 text-lg mt-0.5 leading-tight">{selected.data.name}</h3>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm flex-shrink-0"
          aria-label="Close details"
        >
          ✕
        </button>
      </div>

      {selected.kind === 'gate' && (
        <>
          {selected.recommended && (
            <span className="inline-flex items-center gap-1 mt-2 text-[11px] bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full font-semibold">
              ✨ Recommended for you
            </span>
          )}
          <dl className="mt-4 grid grid-cols-2 gap-2.5 text-sm">
            <Stat label="Typical wait" value={`~${selected.data.typical_wait_minutes} min`} />
            <Stat label="Accessibility" value={selected.data.accessibility ? 'Step-free' : 'Stairs'} />
            <Stat label="Family-friendly" value={selected.data.family_friendly ? 'Yes' : 'Standard'} />
            <Stat label="Serves" value={selected.data.sections.join(', ')} small />
          </dl>
        </>
      )}

      {selected.kind === 'parking' && (
        <>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white"
              style={{ background: PARKING_STATUS_COLOR[selected.data.status] }}
            >
              {PARKING_STATUS_LABEL[selected.data.status]}
            </span>
            <SourceChip source={selected.data.status_source} derivedAt={selected.data.derivedAt} size="xs" />
            <ConfidenceChip level={selected.data.status_confidence} short />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-2.5 text-sm">
            <Stat label="Walk to gate" value={`~${selected.data.walk_time_to_gate_minutes} min`} />
            <Stat label="Capacity" value={selected.data.capacity_label} small />
          </dl>
          {selected.data.notes && (
            <p className="text-[12px] text-slate-600 mt-3 leading-relaxed">{selected.data.notes}</p>
          )}
        </>
      )}

      {selected.kind === 'support' && (
        <>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">{selected.data.description}</p>
          {selected.data.walk_time_minutes && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-100 px-3 py-1.5 text-[12px] font-semibold text-violet-700">
              🚶 ~{selected.data.walk_time_minutes} min walk from your seat
            </div>
          )}
        </>
      )}
    </>
  )
}

function Stat({ label, value, small = false }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
      <dt className="text-[11px] text-slate-500">{label}</dt>
      <dd className={`font-bold text-slate-900 mt-0.5 ${small ? 'text-[13px] leading-tight' : ''}`}>{value}</dd>
    </div>
  )
}

/* ── Layer-specific content beneath the map ── */
function LayerContent({
  layer,
  plan,
  recommendedGate,
  recommendedLot,
  gateCrowds,
  onSelect,
}: {
  layer: LayerId
  plan: ReturnType<typeof deriveArrivalPlan>
  recommendedGate: Gate
  recommendedLot: ParkingLot
  gateCrowds: Record<string, ReturnType<typeof getGateCrowd>>
  onSelect: (m: Marker) => void
}) {
  if (layer === 'parking') {
    return (
      <motion.section
        key="lc-parking"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_-8px_rgba(124,58,237,0.10)]"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="kicker text-violet-700">Parking lots</div>
          <SourceChip source="simulated_demo" size="xs" />
        </div>
        <div className="space-y-2.5">
          {demoParkingLots.map((lot) => (
            <button
              key={lot.id}
              onClick={() => onSelect({ kind: 'parking', data: lot })}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-violet-200 hover:bg-violet-50/40 text-left transition"
            >
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
                style={{ background: PARKING_STATUS_COLOR[lot.status] }}
              >
                P
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-slate-900 truncate">
                    {lot.name.replace(' (Recommended)', '')}
                  </span>
                  {lot.id === recommendedLot.id && (
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">
                      ★ Best
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {PARKING_STATUS_LABEL[lot.status]} · ~{lot.walk_time_to_gate_minutes} min to gate
                </div>
              </div>
              <ConfidenceChip level={lot.status_confidence} short />
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
          Parking statuses are simulated demo data — not a live availability feed.
        </p>
      </motion.section>
    )
  }

  if (layer === 'gates' || layer === 'crowd') {
    return (
      <motion.section
        key="lc-gates"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_-8px_rgba(124,58,237,0.10)]"
      >
        <div className="kicker text-violet-700 mb-3">
          {layer === 'crowd' ? 'Crowd by gate' : 'Gate comparison'}
        </div>
        <div className="space-y-2">
          {demoVenue.gates.map((g) => {
            const crowd = gateCrowds[g.id]
            const recommended = g.id === recommendedGate.id
            const pressureLabel =
              crowd.pressure === 'busy'
                ? 'Busy'
                : crowd.pressure === 'moderate'
                  ? 'Moderate'
                  : crowd.pressure === 'smooth'
                    ? 'Smooth'
                    : 'Estimated'
            const pressureColor =
              crowd.pressure === 'busy'
                ? 'text-rose-600'
                : crowd.pressure === 'moderate'
                  ? 'text-amber-600'
                  : crowd.pressure === 'smooth'
                    ? 'text-emerald-600'
                    : 'text-slate-500'
            return (
              <button
                key={g.id}
                onClick={() => onSelect({ kind: 'gate', data: g, recommended })}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition ${
                  recommended
                    ? 'bg-violet-50 border-violet-200'
                    : 'bg-slate-50 border-slate-100 hover:border-violet-200'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-slate-900 truncate">
                      {g.name.split(' (')[0]}
                    </span>
                    {recommended && (
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-violet-600 text-white px-1.5 py-0.5 rounded">
                        Your gate
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[11px] font-semibold ${pressureColor}`}>{pressureLabel}</span>
                    <SourceChip source={crowd.source} size="xs" short />
                  </div>
                </div>
                <span className="text-[11px] text-slate-500 tabular-nums">~{g.typical_wait_minutes}m</span>
              </button>
            )
          })}
        </div>
        <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
          Live pressure comes from staff &amp; fan signals — not from ticket sales. Wait times are typical
          estimates.
        </p>
      </motion.section>
    )
  }

  if (layer === 'restrooms' || layer === 'accessibility' || layer === 'support') {
    const types =
      layer === 'restrooms' ? RESTROOM_TYPES : layer === 'accessibility' ? ACCESS_TYPES : SUPPORT_TYPES
    const points = demoVenue.support_points.filter((sp) => types.includes(sp.type))
    return (
      <motion.section
        key={`lc-${layer}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_-8px_rgba(124,58,237,0.10)]"
      >
        <div className="kicker text-violet-700 mb-3">
          {layer === 'restrooms'
            ? 'Restrooms & facilities'
            : layer === 'accessibility'
              ? 'Accessibility points'
              : 'Support points'}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {points.map((sp) => {
            const meta = SUPPORT_META[sp.type]
            return (
              <button
                key={sp.id}
                onClick={() => onSelect({ kind: 'support', data: sp })}
                className="flex flex-col gap-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-violet-200 hover:bg-violet-50/40 text-left transition"
              >
                <span className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-lg shadow-sm" style={{ background: meta.tone }}>
                  {meta.emoji}
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-slate-900 leading-tight truncate">{sp.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {sp.walk_time_minutes ? `~${sp.walk_time_minutes} min walk` : meta.label}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </motion.section>
    )
  }

  if (layer === 'exit') {
    return (
      <motion.section
        key="lc-exit"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_-8px_rgba(124,58,237,0.10)]"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="kicker text-violet-700">After the final whistle</div>
          <SourceChip source="estimated" size="xs" />
        </div>
        <div className="space-y-2">
          {[
            { icon: '🚪', label: 'Best exit from your section', detail: `Nearest concourse exit toward ${recommendedLot.name.replace(' (Recommended)', '')}` },
            { icon: '🚗', label: 'Back to parking', detail: `${recommendedLot.name.replace(' (Recommended)', '')} · ~${recommendedLot.walk_time_to_gate_minutes} min walk` },
            { icon: '📱', label: 'Rideshare pickup', detail: 'Designated lot on the south side' },
            { icon: '🚆', label: 'Transit option', detail: 'Rail platform via north concourse' },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-lg flex-shrink-0">
                {row.icon}
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-slate-900 leading-tight">{row.label}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{row.detail}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
          Exit routing is estimated from venue layout — confirm against on-site signage and staff direction.
        </p>
      </motion.section>
    )
  }

  // route (default) — support tiles matched to the plan
  return (
    <motion.section
      key="lc-route"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_-8px_rgba(124,58,237,0.10)]"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="kicker text-violet-700">Support near your seat</div>
        <span className="text-[10px] text-slate-400">Matched to your group</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {plan.support_points.map((sp) => {
          const meta = SUPPORT_META[sp.type]
          return (
            <button
              key={sp.id}
              onClick={() => onSelect({ kind: 'support', data: sp })}
              className="flex flex-col gap-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-violet-200 hover:bg-violet-50/40 text-left transition"
            >
              <span className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-lg shadow-sm" style={{ background: meta.tone }}>
                {meta.emoji}
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-slate-900 leading-tight truncate">{sp.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {sp.walk_time_minutes ? `~${sp.walk_time_minutes} min walk` : meta.label}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </motion.section>
  )
}
