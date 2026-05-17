'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { demoTicket, demoVenue, deriveArrivalPlan } from '@/lib/seed'
import { getAllSignals, loadReadiness, subscribeToFanflowChanges } from '@/lib/store'
import type {
  Gate,
  LiveSignal,
  ReadinessPrefs,
  SupportPoint,
  SupportType,
} from '@/lib/types'

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

export default function VenueMapPage() {
  const params = useParams<{ id: string }>()
  const eventId = params?.id ?? 'wc2026-final'

  const [prefs, setPrefs] = useState<ReadinessPrefs | null>(null)
  const [signals, setSignals] = useState<LiveSignal[]>([])
  const [selected, setSelected] = useState<Marker | null>(null)
  const [filter, setFilter] = useState<'all' | 'gates' | SupportType>('all')

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

  return (
    <div className="min-h-screen page-bg page-enter">
      <div className="page-header px-4 h-14 flex items-center justify-between">
        <h1 className="font-bold text-slate-900">Venue Map & Support</h1>
        <Link
          href={`/event/${eventId}/hub`}
          className="btn-ghost !min-h-[40px] text-sm text-violet-700"
        >
          ← Hub
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5 sm:py-6 space-y-5 sm:space-y-6 safe-bottom">
        {/* Summary */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-3">
            <div>
              <div className="kicker text-violet-700">Your seat</div>
              <div className="font-bold text-slate-900 text-base sm:text-lg mt-1">
                Section {demoTicket.section} · Row {demoTicket.row} · Seat {demoTicket.seat}
              </div>
            </div>
            <div>
              <div className="kicker text-violet-700">Recommended gate</div>
              <div className="font-bold text-slate-900 text-base sm:text-lg mt-1">{recommendedGate.name}</div>
            </div>
            <div>
              <div className="kicker text-violet-700">Typical wait</div>
              <div className="font-bold text-emerald-700 text-base sm:text-lg mt-1">
                ~{recommendedGate.typical_wait_minutes} min
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-900">MetLife Stadium</h2>
              <span className="text-xs text-slate-500">Tap a marker for details</span>
            </div>

            {/* Filter chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 -mx-1 px-1 scrollbar-thin">
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

            <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
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
                <ellipse
                  cx="260"
                  cy="160"
                  rx="220"
                  ry="120"
                  fill="#f1f5f9"
                  stroke="#e2e8f0"
                  strokeWidth="1.5"
                />
                {/* Inner concourse */}
                <ellipse
                  cx="260"
                  cy="160"
                  rx="170"
                  ry="85"
                  fill="#ffffff"
                  stroke="#e2e8f0"
                  strokeWidth="1.5"
                />
                {/* Field */}
                <ellipse cx="260" cy="160" rx="120" ry="55" fill="url(#field)" stroke="#22c55e" strokeWidth="1.5" opacity="0.85" />
                {/* Field markings */}
                <line x1="260" y1="105" x2="260" y2="215" stroke="#fff" strokeWidth="1.5" />
                <circle cx="260" cy="160" r="14" fill="none" stroke="#fff" strokeWidth="1.5" />

                {/* North/South labels */}
                <text x="260" y="22" textAnchor="middle" fontSize="10" fill="#94a3b8" fontWeight="600">
                  NORTH
                </text>
                <text x="260" y="306" textAnchor="middle" fontSize="10" fill="#94a3b8" fontWeight="600">
                  SOUTH
                </text>

                {/* Section 117 highlight */}
                <circle
                  cx="260"
                  cy="218"
                  r="8"
                  fill="#7c3aed"
                  stroke="#fff"
                  strokeWidth="2"
                />
                <text x="260" y="240" textAnchor="middle" fontSize="9" fill="#7c3aed" fontWeight="700">
                  Section 117
                </text>

                {/* Walking path from recommended gate to seat — animated draw */}
                <motion.path
                  d={`M ${recommendedGate.map_x} ${recommendedGate.map_y} L 260 218`}
                  stroke="#7c3aed"
                  strokeWidth="2.5"
                  strokeDasharray="5 5"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.7"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
                />

                {/* Support markers — visible when filter is 'all' or matches type */}
                {supportMarkers
                  .filter((m) => filter === 'all' || filter === m.data.type)
                  .map((m, i) => {
                  const meta = SUPPORT_META[m.data.type]
                  const x = m.data.map_x ?? 0
                  const y = m.data.map_y ?? 0
                  const isActive =
                    selected?.kind === 'support' && selected.data.id === m.data.id
                  return (
                    <motion.g
                      key={m.data.id}
                      onClick={() => setSelected(m)}
                      style={{ cursor: 'pointer', transformOrigin: `${x}px ${y}px` }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        duration: 0.45,
                        delay: 0.6 + i * 0.06,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      <circle
                        cx={x}
                        cy={y}
                        r={isActive ? 13 : 10}
                        fill={meta.tone}
                        stroke="#fff"
                        strokeWidth="2"
                        opacity={isActive ? 1 : 0.9}
                      />
                      <text
                        x={x}
                        y={y + 4}
                        textAnchor="middle"
                        fontSize="11"
                        fill="#fff"
                      >
                        {meta.emoji}
                      </text>
                    </motion.g>
                  )
                })}

                {/* Gate markers (drawn last to sit on top) — visible when filter is 'all' or 'gates' */}
                {gateMarkers
                  .filter(() => filter === 'all' || filter === 'gates')
                  .map((m, i) => {
                  const x = m.data.map_x ?? 0
                  const y = m.data.map_y ?? 0
                  const isActive = selected?.kind === 'gate' && selected.data.id === m.data.id
                  const fill = m.recommended ? '#7c3aed' : '#1e293b'
                  return (
                    <motion.g
                      key={m.data.id}
                      onClick={() => setSelected(m)}
                      style={{ cursor: 'pointer', transformOrigin: `${x}px ${y}px` }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        duration: 0.5,
                        delay: 0.1 + i * 0.08,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      {m.recommended && (
                        <circle
                          cx={x}
                          cy={y}
                          r="22"
                          fill="none"
                          stroke="#7c3aed"
                          strokeWidth="2"
                          opacity="0.4"
                        >
                          <animate
                            attributeName="r"
                            from="14"
                            to="26"
                            dur="1.8s"
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="opacity"
                            from="0.6"
                            to="0"
                            dur="1.8s"
                            repeatCount="indefinite"
                          />
                        </circle>
                      )}
                      <rect
                        x={x - 16}
                        y={y - 12}
                        width="32"
                        height="24"
                        rx="6"
                        fill={fill}
                        stroke={isActive ? '#fbbf24' : '#fff'}
                        strokeWidth="2"
                      />
                      <text
                        x={x}
                        y={y + 5}
                        textAnchor="middle"
                        fontSize="11"
                        fill="#fff"
                        fontWeight="700"
                      >
                        {m.data.name.match(/Gate (\d+)/)?.[1] ?? '?'}
                      </text>
                    </motion.g>
                  )
                })}
              </svg>
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block w-3 h-3 rounded-sm"
                  style={{ background: '#7c3aed' }}
                />
                Recommended gate
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block w-3 h-3 rounded-sm"
                  style={{ background: '#1e293b' }}
                />
                Other gate
              </div>
              {LEGEND.map(({ type }) => (
                <div key={type} className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ background: SUPPORT_META[type].tone }}
                  />
                  {SUPPORT_META[type].label}
                </div>
              ))}
            </div>
          </div>

          {/* Side panel */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 min-h-[180px]">
              {selected ? (
                selected.kind === 'gate' ? (
                  <>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Entrance
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg mt-1">
                      {selected.data.name}
                    </h3>
                    {selected.recommended && (
                      <span className="inline-block mt-2 text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded-full font-semibold">
                        ✨ Recommended for you
                      </span>
                    )}
                    <dl className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-slate-600">Typical wait</dt>
                        <dd className="font-semibold text-slate-900">
                          ~{selected.data.typical_wait_minutes} min
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-600">Accessibility</dt>
                        <dd className="font-semibold text-slate-900">
                          {selected.data.accessibility ? 'Step-free' : 'Stairs'}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-600">Family-friendly</dt>
                        <dd className="font-semibold text-slate-900">
                          {selected.data.family_friendly ? 'Yes' : 'Standard'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-600">Serves sections</dt>
                        <dd className="font-semibold text-slate-900 text-right">
                          {selected.data.sections.join(', ')}
                        </dd>
                      </div>
                    </dl>
                  </>
                ) : (
                  <>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {SUPPORT_META[selected.data.type].label}
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg mt-1">
                      {selected.data.name}
                    </h3>
                    <p className="text-sm text-slate-600 mt-2">{selected.data.description}</p>
                    {selected.data.walk_time_minutes && (
                      <div className="mt-3 text-sm text-slate-700">
                        <span className="font-semibold">~{selected.data.walk_time_minutes} min</span>{' '}
                        walk from your seat
                      </div>
                    )}
                  </>
                )
              ) : (
                <div className="text-sm text-slate-500">
                  Tap any marker on the map to see details. The pulsing purple marker is your
                  recommended gate.
                </div>
              )}
            </div>

            {/* Recommended support points */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="kicker mb-3">For your group</h3>
              <div className="space-y-1">
                {plan.support_points.map((sp) => {
                  const meta = SUPPORT_META[sp.type]
                  return (
                    <button
                      key={sp.id}
                      onClick={() => setSelected({ kind: 'support', data: sp })}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 active:bg-slate-100 text-left transition min-h-[56px]"
                    >
                      <span
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-base flex-shrink-0 shadow-sm"
                        style={{ background: meta.tone }}
                      >
                        {meta.emoji}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {sp.name}
                        </div>
                        {sp.walk_time_minutes && (
                          <div className="text-xs text-slate-500">
                            ~{sp.walk_time_minutes} min walk
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </aside>
        </div>

        <div className="text-xs text-slate-500 text-center pb-4">
          <p>Map is a stylized representation. Always follow official venue signage and staff instructions.</p>
        </div>
      </div>
    </div>
  )
}
