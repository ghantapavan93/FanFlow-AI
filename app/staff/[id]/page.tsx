'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { demoVenue } from '@/lib/seed'
import { SessionChip } from '@/components/shared/SessionChip'
import {
  clearPublishedSignals,
  getAllSignals,
  loadIncidents,
  publishSignal,
  subscribeToFanflowChanges,
  updateIncident,
} from '@/lib/store'
import type { Incident, IncidentStatus, IncidentType, LiveSignal } from '@/lib/types'

const INCIDENT_TYPE_LABEL: Record<IncidentType, string> = {
  family_assistance: 'Family assistance',
  long_line: 'Long line',
  accessibility_question: 'Accessibility question',
  lost_ticket: 'Ticket issue',
  medical: 'Medical',
  lost_person: 'Lost person',
  other: 'Other',
}

const INCIDENT_STATUS_STYLE: Record<IncidentStatus, string> = {
  open: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  monitoring: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  resolved: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
}

const SENTIMENTS: { value: LiveSignal['sentiment']; label: string; emoji: string; color: string }[] = [
  { value: 'smooth', label: 'Smooth', emoji: '🟢', color: 'bg-emerald-600 hover:bg-emerald-500' },
  { value: 'moderate', label: 'Moderate', emoji: '🟡', color: 'bg-amber-600 hover:bg-amber-500' },
  { value: 'busy', label: 'Busy', emoji: '🟠', color: 'bg-orange-600 hover:bg-orange-500' },
  { value: 'difficult', label: 'Difficult', emoji: '🔴', color: 'bg-rose-600 hover:bg-rose-500' },
]

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ago`
}

// Structured-field options — let staff click facts rather than write prose.
// The submitted LiveSignal.message is auto-composed from these unless the
// staff member overrides it with the free-text "Additional note" field.
const BAG_CHECK_OPTIONS = ['short', 'moderate', 'long', 'closed'] as const
const ACCESS_OPTIONS = ['open', 'limited', 'closed'] as const
const FAMILY_OPTIONS = ['clear', 'moderate', 'crowded'] as const
const DURATION_OPTIONS = ['next 5 min', 'next 15 min', 'next 30 min', '1 hour+'] as const

type BagCheck = (typeof BAG_CHECK_OPTIONS)[number]
type AccessRoute = (typeof ACCESS_OPTIONS)[number]
type FamilyEntrance = (typeof FAMILY_OPTIONS)[number]
type Duration = (typeof DURATION_OPTIONS)[number]

export default function StaffConsolePage() {
  const [signals, setSignals] = useState<LiveSignal[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [incidentFilter, setIncidentFilter] = useState<'all' | 'open'>('all')
  const [gateId, setGateId] = useState<string>(demoVenue.gates[0].id)
  const [sentiment, setSentiment] = useState<LiveSignal['sentiment']>('smooth')
  const [bagCheck, setBagCheck] = useState<BagCheck | null>(null)
  const [accessRoute, setAccessRoute] = useState<AccessRoute | null>(null)
  const [familyEntrance, setFamilyEntrance] = useState<FamilyEntrance | null>(null)
  const [duration, setDuration] = useState<Duration | null>(null)
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  const refresh = () => {
    setSignals(getAllSignals())
    setIncidents(loadIncidents())
  }

  useEffect(() => {
    refresh()
    return subscribeToFanflowChanges(
      ['fanflow:signals', 'fanflow:incidents'],
      refresh,
    )
  }, [])

  const changeIncidentStatus = (id: string, status: IncidentStatus) => {
    const inc = incidents.find((i) => i.id === id)
    const action =
      status === 'monitoring'
        ? inc?.action ?? 'Marked as monitoring by staff'
        : status === 'resolved'
        ? inc?.action ?? 'Resolved by staff'
        : inc?.action
    updateIncident(id, { status, action })
    setToast(`Incident ${status}`)
    setTimeout(() => setToast(null), 1800)
  }

  const visibleIncidents = incidents
    .filter((i) => (incidentFilter === 'all' ? true : i.status !== 'resolved'))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

  const openCount = incidents.filter((i) => i.status === 'open').length

  // Auto-compose a clean factual message from the structured fields.
  // Staff can override by typing their own message; otherwise we
  // build something like:
  //   "Smooth. Bag check: short. Accessibility route: open. Next 15 min."
  const composedMessage = useMemo(() => {
    const parts: string[] = []
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
    parts.push(cap(sentiment))
    if (bagCheck) parts.push(`Bag check: ${bagCheck}`)
    if (accessRoute) parts.push(`Accessibility route: ${accessRoute}`)
    if (familyEntrance) parts.push(`Family entrance: ${familyEntrance}`)
    if (duration) parts.push(cap(duration))
    if (note.trim()) parts.push(note.trim())
    return parts.join('. ') + '.'
  }, [sentiment, bagCheck, accessRoute, familyEntrance, duration, note])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const final = message.trim() || composedMessage
    if (!final) return
    publishSignal({
      id: `staff-${Date.now()}`,
      gate_id: gateId,
      source: 'staff',
      sentiment,
      message: final,
      created_at: new Date().toISOString(),
    })
    // Reset all structured + free fields
    setMessage('')
    setNote('')
    setBagCheck(null)
    setAccessRoute(null)
    setFamilyEntrance(null)
    setDuration(null)
    setToast('Update published to fans')
    setTimeout(() => setToast(null), 2200)
  }

  const gateSummary = demoVenue.gates.map((gate) => {
    const recent = signals.filter(
      (s) =>
        s.gate_id === gate.id &&
        Date.now() - new Date(s.created_at).getTime() < 30 * 60 * 1000,
    )
    const latest = recent[0]
    return { gate, recent, latest }
  })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-violet-700 rounded-lg" />
          <div>
            <div className="font-bold text-white">Staff Console</div>
            <div className="text-xs text-slate-400">MetLife Stadium · Operations</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SessionChip tone="dark" />
          <Link
            href="/event/wc2026-final/hub"
            className="text-sm text-slate-400 hover:text-white"
          >
            Fan view →
          </Link>
        </div>
      </div>

      {/* KPI dashboard top row — dashboard credibility signal */}
      <div className="max-w-5xl mx-auto px-4 pt-5 sm:pt-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(() => {
            const openIncidents = incidents.filter((i) => i.status === 'open').length
            const monitoringIncidents = incidents.filter((i) => i.status === 'monitoring').length
            const recentSignals = signals.filter(
              (s) => Date.now() - new Date(s.created_at).getTime() < 30 * 60 * 1000,
            ).length
            const staffSignalsRecent = signals.filter(
              (s) =>
                s.source === 'staff' &&
                Date.now() - new Date(s.created_at).getTime() < 30 * 60 * 1000,
            ).length
            const avgWait = Math.round(
              demoVenue.gates.reduce((sum, g) => sum + g.typical_wait_minutes, 0) /
                demoVenue.gates.length,
            )

            const kpis = [
              {
                label: 'Open incidents',
                value: openIncidents,
                sub: monitoringIncidents > 0 ? `${monitoringIncidents} monitoring` : 'all clear',
                tone:
                  openIncidents > 0
                    ? 'text-rose-300 border-rose-500/40 bg-rose-500/10'
                    : 'text-slate-200 border-slate-700 bg-slate-900',
              },
              {
                label: 'Gates monitored',
                value: demoVenue.gates.length,
                sub: 'real-time',
                tone: 'text-slate-200 border-slate-700 bg-slate-900',
              },
              {
                label: 'Signals last 30m',
                value: recentSignals,
                sub: staffSignalsRecent > 0 ? `${staffSignalsRecent} from staff` : 'fan-only',
                tone:
                  recentSignals > 0
                    ? 'text-violet-300 border-violet-500/40 bg-violet-500/10'
                    : 'text-slate-200 border-slate-700 bg-slate-900',
              },
              {
                label: 'Avg typical wait',
                value: `${avgWait}m`,
                sub: 'across all gates',
                tone: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
              },
            ]
            return kpis.map((k) => (
              <div
                key={k.label}
                className={`rounded-xl border p-3 sm:p-4 ${k.tone} transition`}
              >
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {k.label}
                </div>
                <div className="mt-1 text-2xl sm:text-3xl font-bold font-mono leading-none">
                  {k.value}
                </div>
                <div className="text-[11px] text-slate-400 mt-1.5">{k.sub}</div>
              </div>
            ))
          })()}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-5 sm:pt-6 pb-6 grid gap-6 lg:grid-cols-3">
        {/* Gate Panel */}
        <section className="lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white">Gate status</h2>
            <p className="text-sm text-slate-400">
              Last 30 minutes of signals across each entrance.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {gateSummary.map(({ gate, recent, latest }) => {
              const tone =
                latest?.sentiment === 'smooth'
                  ? 'border-emerald-700 bg-emerald-950/40'
                  : latest?.sentiment === 'moderate'
                  ? 'border-amber-700 bg-amber-950/40'
                  : latest?.sentiment === 'busy'
                  ? 'border-orange-700 bg-orange-950/40'
                  : latest?.sentiment === 'difficult'
                  ? 'border-rose-700 bg-rose-950/40'
                  : 'border-slate-800 bg-slate-900'
              const emoji = latest
                ? SENTIMENTS.find((s) => s.value === latest.sentiment)?.emoji ?? '⚪'
                : '⚪'
              // Per-gate intelligence detail — fan vs staff signal counts
              // and a deterministic confidence pct derived from the latest
              // sentiment + signal source.
              const staffCount = recent.filter((s) => s.source === 'staff').length
              const fanCount = recent.filter((s) => s.source === 'fan').length
              const confidencePct = (() => {
                if (!latest) return null
                const base =
                  latest.sentiment === 'smooth'
                    ? 85
                    : latest.sentiment === 'moderate'
                    ? 65
                    : latest.sentiment === 'busy'
                    ? 45
                    : 25
                // Staff signals add confidence; fan-only knocks 10 off
                return latest.source === 'staff' ? base : Math.max(20, base - 10)
              })()
              const latestAge = latest
                ? (() => {
                    const ageMs = Date.now() - new Date(latest.created_at).getTime()
                    const m = Math.floor(ageMs / 60000)
                    if (m < 1) return 'just now'
                    if (m < 60) return `${m}m ago`
                    return `${Math.floor(m / 60)}h ago`
                  })()
                : null

              return (
                <div key={gate.id} className={`rounded-xl border p-4 ${tone}`}>
                  <div className="text-xs text-slate-400 font-mono">
                    {gate.id.toUpperCase()}
                  </div>
                  <div className="font-semibold text-white mt-1 truncate">{gate.name}</div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-2xl">{emoji}</span>
                    {confidencePct !== null && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 border border-slate-700 text-slate-200 px-2 py-0.5 rounded-full">
                        {confidencePct}%
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    {latest ? latest.sentiment : 'No recent signals'}
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-800/70 grid grid-cols-2 gap-1 text-[10px]">
                    <div>
                      <span className="text-slate-500">Staff</span>{' '}
                      <span className="font-semibold text-slate-200">{staffCount}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Fan</span>{' '}
                      <span className="font-semibold text-slate-200">{fanCount}</span>
                    </div>
                  </div>
                  {latestAge && (
                    <div className="text-[10px] text-slate-500 mt-1">
                      Updated {latestAge}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-500 mt-1.5">
                    ~{gate.typical_wait_minutes} min typical wait
                  </div>
                </div>
              )
            })}
          </div>

          {/* Incident Log */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white">Incident log</h3>
                {openCount > 0 && (
                  <span className="inline-flex items-center justify-center text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full min-w-[20px] h-5 px-1.5">
                    {openCount} open
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIncidentFilter('all')}
                  className={`text-xs px-2.5 py-1 rounded-md transition ${
                    incidentFilter === 'all'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setIncidentFilter('open')}
                  className={`text-xs px-2.5 py-1 rounded-md transition ${
                    incidentFilter === 'open'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Active only
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-800 max-h-[420px] overflow-y-auto">
              {visibleIncidents.length === 0 ? (
                <div className="p-6 text-sm text-slate-500 italic">No incidents to show.</div>
              ) : (
                visibleIncidents.map((inc) => {
                  const gate = demoVenue.gates.find((g) => g.id === inc.gate_id)
                  return (
                    <div key={inc.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-white text-sm">
                              {INCIDENT_TYPE_LABEL[inc.type]}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wide border px-2 py-0.5 rounded-full ${INCIDENT_STATUS_STYLE[inc.status]}`}
                            >
                              {inc.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            {gate?.name ?? inc.gate_id} ·{' '}
                            {inc.source === 'staff' ? '👮 Staff' : '🙋 Fan'} · {timeAgo(inc.updated_at)}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-200">{inc.note}</p>
                      {inc.action && (
                        <p className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-2 py-1.5">
                          ↳ {inc.action}
                        </p>
                      )}
                      {inc.status !== 'resolved' && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {inc.status !== 'monitoring' && (
                            <button
                              onClick={() => changeIncidentStatus(inc.id, 'monitoring')}
                              className="text-xs px-3 py-1.5 rounded-md bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 font-semibold transition border border-amber-500/40"
                            >
                              Mark monitoring
                            </button>
                          )}
                          <button
                            onClick={() => changeIncidentStatus(inc.id, 'resolved')}
                            className="text-xs px-3 py-1.5 rounded-md bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 font-semibold transition border border-emerald-500/40"
                          >
                            Mark resolved
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Feed */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="font-bold text-white">Live signal feed</h3>
              <button
                onClick={() => {
                  if (confirm('Clear all published staff signals? Seeded fan signals remain.')) {
                    clearPublishedSignals()
                  }
                }}
                className="text-xs text-slate-400 hover:text-rose-400"
              >
                Clear staff signals
              </button>
            </div>
            <div className="divide-y divide-slate-800 max-h-[480px] overflow-y-auto">
              {signals.length === 0 ? (
                <div className="p-6 text-sm text-slate-500 italic">No signals yet.</div>
              ) : (
                signals.map((s) => {
                  const meta = SENTIMENTS.find((x) => x.value === s.sentiment)
                  const gate = demoVenue.gates.find((g) => g.id === s.gate_id)
                  return (
                    <div key={s.id} className="p-4 flex items-start gap-3">
                      <div className="text-xl">{meta?.emoji ?? '⚪'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white">{s.message}</div>
                        <div className="text-xs text-slate-400 mt-1">
                          {gate?.name ?? s.gate_id} ·{' '}
                          {s.source === 'staff' ? '👮 Staff' : '🙋 Fan'} · {timeAgo(s.created_at)}
                        </div>
                      </div>
                      <span className="text-xs uppercase tracking-wide text-slate-400">
                        {s.sentiment}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </section>

        {/* Publish form */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="font-bold text-white">Publish update</h3>
            <p className="text-sm text-slate-400 mt-1">
              Updates appear in fans' Event Day Hub within seconds.
            </p>

            <form onSubmit={submit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Gate
                </label>
                <select
                  value={gateId}
                  onChange={(e) => setGateId(e.target.value)}
                  className="mt-2 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-violet-500 focus:outline-none"
                >
                  {demoVenue.gates.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Condition
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {SENTIMENTS.map((s) => (
                    <button
                      type="button"
                      key={s.value}
                      onClick={() => setSentiment(s.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold border transition ${
                        sentiment === s.value
                          ? `${s.color} text-white border-transparent`
                          : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {s.emoji} {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Structured fields — let staff click facts rather than write
                  prose. The composed message previews below in real time. */}
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Bag check line
                </label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {BAG_CHECK_OPTIONS.map((o) => (
                    <button
                      type="button"
                      key={o}
                      onClick={() => setBagCheck(bagCheck === o ? null : o)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                        bagCheck === o
                          ? 'bg-violet-600 text-white border-transparent'
                          : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Accessibility route
                </label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ACCESS_OPTIONS.map((o) => (
                    <button
                      type="button"
                      key={o}
                      onClick={() => setAccessRoute(accessRoute === o ? null : o)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                        accessRoute === o
                          ? 'bg-violet-600 text-white border-transparent'
                          : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Family entrance
                </label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {FAMILY_OPTIONS.map((o) => (
                    <button
                      type="button"
                      key={o}
                      onClick={() => setFamilyEntrance(familyEntrance === o ? null : o)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                        familyEntrance === o
                          ? 'bg-violet-600 text-white border-transparent'
                          : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Expected duration
                </label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {DURATION_OPTIONS.map((o) => (
                    <button
                      type="button"
                      key={o}
                      onClick={() => setDuration(duration === o ? null : o)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                        duration === o
                          ? 'bg-violet-600 text-white border-transparent'
                          : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Additional note (optional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Stroller lane open"
                  className="mt-2 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-violet-500 focus:outline-none"
                  maxLength={120}
                />
              </div>

              {/* Live preview of the composed message */}
              <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Fans will see
                </div>
                <p className="text-xs text-slate-200 leading-snug">
                  &ldquo;{message.trim() || composedMessage}&rdquo;
                </p>
              </div>

              {/* Override box — collapsed by default since structured fields
                  cover the common case */}
              <details className="text-xs">
                <summary className="cursor-pointer text-slate-400 hover:text-slate-200">
                  Override with custom message
                </summary>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your own message instead"
                  className="mt-2 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-violet-500 focus:outline-none min-h-16"
                  maxLength={140}
                />
                <div className="text-[10px] text-slate-500 text-right">{message.length} / 140</div>
              </details>

              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold transition"
              >
                Publish to fans
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="font-bold text-white text-sm">Reminders</h3>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-400 list-disc list-inside">
              <li>Keep messages factual and brief.</li>
              <li>Use "Difficult" only for safety issues.</li>
              <li>Fan-submitted signals appear here too — verify before acting.</li>
            </ul>
          </div>
        </aside>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-semibold">
          ✓ {toast}
        </div>
      )}
    </div>
  )
}
