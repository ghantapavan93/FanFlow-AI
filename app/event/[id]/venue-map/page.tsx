'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { demoTicket, demoVenue, deriveArrivalPlan } from '@/lib/seed'
import { getAllSignals, loadReadiness, subscribeToFanflowChanges } from '@/lib/store'
import type {
  Gate,
  LiveSignal,
  ReadinessPrefs,
  SupportPoint,
  SupportType,
} from '@/lib/types'
import { HelpSheet } from '@/components/shared/HelpSheet'

type Marker =
  | { kind: 'gate'; data: Gate; recommended: boolean }
  | { kind: 'support'; data: SupportPoint }

const SUPPORT_META: Record<SupportType, { emoji: string; tone: string; label: string }> = {
  first_aid: { emoji: '➕', tone: '#dc2626', label: 'First Aid' },
  family_services: { emoji: '👶', tone: '#7c3aed', label: 'Family' },
  accessibility: { emoji: '♿', tone: '#0ea5e9', label: 'Accessibility' },
  restroom: { emoji: '🚻', tone: '#475569', label: 'Restroom' },
  guest_services: { emoji: 'ℹ️', tone: '#0891b2', label: 'Guest Services' },
  quiet_space: { emoji: '🧩', tone: '#16a34a', label: 'Quiet Space' },
  concessions: { emoji: '🍿', tone: '#ea580c', label: 'Concessions' },
}

const LEGEND: { type: SupportType }[] = [
  { type: 'first_aid' },
  { type: 'family_services' },
  { type: 'accessibility' },
  { type: 'quiet_space' },
  { type: 'restroom' },
  { type: 'guest_services' },
]

/**
 * Venue Map — mobile-first immersive route experience.
 *
 * The page is structured as a single vertical scroll, like the rest of the
 * fan companion (Hub / Journey / Pulse): a cinematic route-summary hero, the
 * stadium map with a glowing animated route from the recommended gate to the
 * fan's section, a tap-to-inspect detail card, and a grid of visual support
 * tiles. A bottom tab nav keeps the navigation rhythm consistent with the
 * other event pages. Nothing here changes the rule engine — it only renders
 * `deriveArrivalPlan` output.
 */
export default function VenueMapPage() {
  const params = useParams<{ id: string }>()
  const eventId = params?.id ?? 'wc2026-final'

  const [prefs, setPrefs] = useState<ReadinessPrefs | null>(null)
  const [signals, setSignals] = useState<LiveSignal[]>([])
  const [selected, setSelected] = useState<Marker | null>(null)
  const [filter, setFilter] = useState<'all' | 'gates' | SupportType>('all')
  const [helpOpen, setHelpOpen] = useState(false)
  // Incrementing this key remounts the animated <motion.path> and <motion.g>
  // elements, replaying the path-drawing and marker stagger animations.
  const [replayKey, setReplayKey] = useState(0)

  useEffect(() => {
    const refresh = () => {
      setPrefs(loadReadiness())
      setSignals(getAllSignals())
    }
    refresh()
    return subscribeToFanflowChanges(
      ['fanflow:readiness', 'fanflow:signals'],
      refresh,
    )
  }, [])

  const plan = useMemo(
    () => deriveArrivalPlan(prefs, signals.length ? signals : undefined),
    [prefs, signals],
  )

  const recommendedGateId = plan.recommended_gate.id

  const gateMarkers = demoVenue.gates.map((g) => ({
    kind: 'gate' as const,
    data: g,
    recommended: g.id === recommendedGateId,
  }))
  const supportMarkers = demoVenue.support_points.map((sp) => ({
    kind: 'support' as const,
    data: sp,
  }))

  const recommendedGate = demoVenue.gates.find((g) => g.id === recommendedGateId)!
  const gateLabel = recommendedGate.name.split(' (')[0]

  // Route quality — light, friendly heuristic from the gate's live wait.
  const routeQuality =
    recommendedGate.typical_wait_minutes <= 8
      ? { label: 'Clear route', tone: 'text-emerald-300', dot: 'bg-emerald-400' }
      : recommendedGate.typical_wait_minutes <= 15
        ? { label: 'Moderate flow', tone: 'text-amber-200', dot: 'bg-amber-300' }
        : { label: 'Busy route', tone: 'text-rose-200', dot: 'bg-rose-300' }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-violet-100/60 via-violet-50/20 to-white pb-24 page-enter">
        {/* Sticky brand bar — matches Hub / Journey / Pulse */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100">
          <div className="container-mobile px-4 h-14 flex items-center justify-between">
            <Link
              href={`/event/${eventId}/hub`}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
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
          {/* === Route summary hero — cinematic ====================== */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-violet-700 to-fuchsia-700 text-white p-5 shadow-lg shadow-violet-500/20"
          >
            <div className="shimmer-overlay" aria-hidden="true" />
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.5),transparent_60%)]"
            />
            <div className="relative">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-violet-200">
                  Your route
                </div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold">
                  <span className={`w-1.5 h-1.5 rounded-full ${routeQuality.dot} animate-pulse`} />
                  <span className={routeQuality.tone}>{routeQuality.label}</span>
                </span>
              </div>
              <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                <span className="font-extrabold text-2xl leading-none">{gateLabel}</span>
                <span className="text-violet-200/70 text-xl">→</span>
                <span className="font-extrabold text-2xl leading-none">Section {demoTicket.section}</span>
              </div>
              {/* Route strip with travelling dot */}
              <div className="flex items-center gap-2 mb-4">
                <span className="w-3 h-3 rounded-full bg-white/30 border-2 border-white flex-shrink-0" />
                <div className="flex-1 relative h-[3px] rounded-full bg-white/20 overflow-hidden">
                  <motion.div
                    key={`fill-${replayKey}`}
                    className="absolute inset-y-0 left-0 rounded-full bg-white/70"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <span className="w-3 h-3 rounded-full bg-violet-300 border-2 border-white flex-shrink-0" />
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <div className="font-extrabold text-lg tabular-nums leading-none">~8</div>
                  <div className="text-[10px] text-violet-200 mt-0.5">min walk</div>
                </div>
                <div>
                  <div className="font-extrabold text-lg tabular-nums leading-none">~{recommendedGate.typical_wait_minutes}</div>
                  <div className="text-[10px] text-violet-200 mt-0.5">min wait</div>
                </div>
                <div>
                  <div className="font-extrabold text-lg leading-none">{recommendedGate.family_friendly ? '✓' : '—'}</div>
                  <div className="text-[10px] text-violet-200 mt-0.5">Family</div>
                </div>
                <div>
                  <div className="font-extrabold text-lg leading-none">{recommendedGate.accessibility ? '✓' : '—'}</div>
                  <div className="text-[10px] text-violet-200 mt-0.5">Step-free</div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* === Stadium map ========================================= */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_4px_20px_-8px_rgba(124,58,237,0.10)]"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-900 text-sm">MetLife Stadium</h2>
              <button
                onClick={() => setReplayKey((k) => k + 1)}
                className="text-[11px] font-semibold text-violet-700 hover:text-violet-800 inline-flex items-center gap-1"
                aria-label="Replay route animation"
              >
                ↻ Replay route
              </button>
            </div>

            {/* Filter chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 -mx-1 px-1">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'gates', label: 'Gates' },
                  { id: 'first_aid', label: 'First Aid' },
                  { id: 'family_services', label: 'Family' },
                  { id: 'accessibility', label: 'Accessibility' },
                  { id: 'quiet_space', label: 'Quiet Space' },
                  { id: 'restroom', label: 'Restrooms' },
                  { id: 'guest_services', label: 'Guest Services' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id as typeof filter)}
                  className={filter === f.id ? 'chip-active whitespace-nowrap' : 'chip whitespace-nowrap'}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
              <svg
                viewBox="0 0 520 320"
                className="w-full h-auto"
                role="img"
                aria-label="Stylized map of MetLife Stadium showing gates and support points"
              >
                <defs>
                  <radialGradient id="field" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#bbf7d0" />
                    <stop offset="100%" stopColor="#86efac" />
                  </radialGradient>
                </defs>

                {/* Concourse ring */}
                <ellipse cx="260" cy="160" rx="220" ry="120" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1.5" />
                {/* Inner concourse */}
                <ellipse cx="260" cy="160" rx="170" ry="85" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
                {/* Field */}
                <ellipse cx="260" cy="160" rx="120" ry="55" fill="url(#field)" stroke="#22c55e" strokeWidth="1.5" opacity="0.85" />
                <line x1="260" y1="105" x2="260" y2="215" stroke="#fff" strokeWidth="1.5" />
                <circle cx="260" cy="160" r="14" fill="none" stroke="#fff" strokeWidth="1.5" />

                <text x="260" y="22" textAnchor="middle" fontSize="10" fill="#94a3b8" fontWeight="600">NORTH</text>
                <text x="260" y="306" textAnchor="middle" fontSize="10" fill="#94a3b8" fontWeight="600">SOUTH</text>

                {/* Section highlight — your seat, gentle pulse loop */}
                <motion.circle
                  cx="260"
                  cy="218"
                  r="16"
                  fill="#7c3aed"
                  opacity="0.25"
                  animate={{ r: [12, 20, 12], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.circle
                  cx="260"
                  cy="218"
                  r="8"
                  fill="#7c3aed"
                  stroke="#fff"
                  strokeWidth="2"
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ transformOrigin: '260px 218px' }}
                />
                <text x="260" y="240" textAnchor="middle" fontSize="9" fill="#7c3aed" fontWeight="700">
                  Section {demoTicket.section}
                </text>

                {/* Route glow — blurred underlay */}
                <motion.path
                  key={`glow-${replayKey}`}
                  d={`M ${recommendedGate.map_x} ${recommendedGate.map_y} L 260 218`}
                  stroke="#7c3aed"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.15"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
                />
                {/* Walking path — animated draw */}
                <motion.path
                  key={`route-${replayKey}`}
                  d={`M ${recommendedGate.map_x} ${recommendedGate.map_y} L 260 218`}
                  stroke="#7c3aed"
                  strokeWidth="3"
                  strokeDasharray="6 4"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.85"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
                />
                {/* Moving dot along route */}
                <motion.circle
                  key={`dot-${replayKey}`}
                  r="4"
                  fill="#7c3aed"
                  stroke="#fff"
                  strokeWidth="2"
                  initial={{ cx: recommendedGate.map_x, cy: recommendedGate.map_y, opacity: 0 }}
                  animate={{
                    cx: [recommendedGate.map_x, 260],
                    cy: [recommendedGate.map_y, 218],
                    opacity: [0, 1, 1, 0],
                  }}
                  transition={{ duration: 2.5, delay: 1.2, repeat: Infinity, repeatDelay: 1, ease: 'easeInOut' }}
                />

                {/* Support markers */}
                {supportMarkers
                  .filter((m) => filter === 'all' || filter === m.data.type)
                  .map((m, i) => {
                    const meta = SUPPORT_META[m.data.type]
                    const x = m.data.map_x ?? 0
                    const y = m.data.map_y ?? 0
                    const isActive = selected?.kind === 'support' && selected.data.id === m.data.id
                    return (
                      <motion.g
                        key={`support-${m.data.id}-${replayKey}`}
                        onClick={() => setSelected(m)}
                        style={{ cursor: 'pointer', transformOrigin: `${x}px ${y}px` }}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.45, delay: 0.6 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <circle cx={x} cy={y} r={isActive ? 13 : 10} fill={meta.tone} stroke="#fff" strokeWidth="2" opacity={isActive ? 1 : 0.9} />
                        <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fill="#fff">{meta.emoji}</text>
                      </motion.g>
                    )
                  })}

                {/* Gate markers (on top) */}
                {gateMarkers
                  .filter(() => filter === 'all' || filter === 'gates')
                  .map((m, i) => {
                    const x = m.data.map_x ?? 0
                    const y = m.data.map_y ?? 0
                    const isActive = selected?.kind === 'gate' && selected.data.id === m.data.id
                    const fill = m.recommended ? '#7c3aed' : '#1e293b'
                    return (
                      <motion.g
                        key={`gate-${m.data.id}-${replayKey}`}
                        onClick={() => setSelected(m)}
                        style={{ cursor: 'pointer', transformOrigin: `${x}px ${y}px` }}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                      >
                        {m.recommended && (
                          <circle cx={x} cy={y} r="22" fill="none" stroke="#7c3aed" strokeWidth="2" opacity="0.4">
                            <animate attributeName="r" from="14" to="26" dur="1.8s" repeatCount="indefinite" />
                            <animate attributeName="opacity" from="0.6" to="0" dur="1.8s" repeatCount="indefinite" />
                          </circle>
                        )}
                        <rect x={x - 16} y={y - 12} width="32" height="24" rx="6" fill={fill} stroke={isActive ? '#fbbf24' : '#fff'} strokeWidth="2" />
                        <text x={x} y={y + 5} textAnchor="middle" fontSize="11" fill="#fff" fontWeight="700">
                          {m.data.name.match(/Gate (\d+)/)?.[1] ?? '?'}
                        </text>
                      </motion.g>
                    )
                  })}
              </svg>
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#7c3aed' }} />
                Recommended gate
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#1e293b' }} />
                Other gate
              </div>
              {LEGEND.map(({ type }) => (
                <div key={type} className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ background: SUPPORT_META[type].tone }} />
                  {SUPPORT_META[type].label}
                </div>
              ))}
            </div>
          </motion.section>

          {/* === Tap-to-inspect detail card ========================== */}
          <AnimatePresence mode="wait">
            {selected && (
              <motion.section
                key={selected.kind === 'gate' ? `g-${selected.data.id}` : `s-${selected.data.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-3xl border border-violet-200/70 bg-white p-5 shadow-[0_4px_20px_-8px_rgba(124,58,237,0.12)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {selected.kind === 'gate' ? 'Entrance' : SUPPORT_META[selected.data.type].label}
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg mt-0.5 leading-tight">
                      {selected.data.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm flex-shrink-0"
                    aria-label="Close details"
                  >
                    ✕
                  </button>
                </div>

                {selected.kind === 'gate' ? (
                  <>
                    {selected.recommended && (
                      <span className="inline-flex items-center gap-1 mt-2 text-[11px] bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full font-semibold">
                        ✨ Recommended for you
                      </span>
                    )}
                    <dl className="mt-4 grid grid-cols-2 gap-2.5 text-sm">
                      <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                        <dt className="text-[11px] text-slate-500">Typical wait</dt>
                        <dd className="font-bold text-slate-900 mt-0.5">~{selected.data.typical_wait_minutes} min</dd>
                      </div>
                      <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                        <dt className="text-[11px] text-slate-500">Accessibility</dt>
                        <dd className="font-bold text-slate-900 mt-0.5">{selected.data.accessibility ? 'Step-free' : 'Stairs'}</dd>
                      </div>
                      <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                        <dt className="text-[11px] text-slate-500">Family-friendly</dt>
                        <dd className="font-bold text-slate-900 mt-0.5">{selected.data.family_friendly ? 'Yes' : 'Standard'}</dd>
                      </div>
                      <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                        <dt className="text-[11px] text-slate-500">Serves</dt>
                        <dd className="font-bold text-slate-900 mt-0.5 text-[13px] leading-tight">{selected.data.sections.join(', ')}</dd>
                      </div>
                    </dl>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">{selected.data.description}</p>
                    {selected.data.walk_time_minutes && (
                      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-100 px-3 py-1.5 text-[12px] font-semibold text-violet-700">
                        🚶 ~{selected.data.walk_time_minutes} min walk from your seat
                      </div>
                    )}
                  </>
                )}
              </motion.section>
            )}
          </AnimatePresence>

          {/* === Visual support tiles ================================ */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_-8px_rgba(124,58,237,0.10)]"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="kicker text-violet-700">Support near your seat</div>
              <span className="text-[10px] text-slate-400">Matched to your group</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {plan.support_points.map((sp, i) => {
                const meta = SUPPORT_META[sp.type]
                return (
                  <motion.button
                    key={sp.id}
                    initial={{ opacity: 0, scale: 0.94 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setSelected({ kind: 'support', data: sp })}
                    className="flex flex-col gap-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-violet-200 hover:bg-violet-50/40 active:bg-violet-50 text-left transition"
                  >
                    <span
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-lg shadow-sm"
                      style={{ background: meta.tone }}
                    >
                      {meta.emoji}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold text-slate-900 leading-tight truncate">{sp.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {sp.walk_time_minutes ? `~${sp.walk_time_minutes} min walk` : meta.label}
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </motion.section>

          {/* === One-tap help ======================================== */}
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

          <p className="text-[10px] text-slate-400 text-center px-4 leading-relaxed">
            Map is a stylized representation. Always follow official venue signage and staff instructions.
          </p>
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
              <span className="flex items-center justify-center w-9 h-9 rounded-full text-xl">✦</span>
              Guide
            </Link>
            <div className="flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-semibold text-violet-700">
              <span className="flex items-center justify-center w-9 h-9 rounded-full text-xl bg-violet-100">🗺️</span>
              Map
            </div>
            <Link
              href={`/event/${eventId}/pulse`}
              className="flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-semibold text-slate-500 hover:text-slate-700"
            >
              <span className="flex items-center justify-center w-9 h-9 rounded-full text-xl">📊</span>
              Pulse
            </Link>
            <button
              onClick={() => setHelpOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-semibold text-slate-500 hover:text-slate-700"
            >
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
