'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { demoEvent, demoVenue, deriveArrivalPlan } from '@/lib/seed'
import { SessionChip } from '@/components/shared/SessionChip'
import { AIExplanationCard } from '@/components/shared/AIExplanationCard'
import {
  clearPublishedSignals,
  createIncident,
  getAllSignals,
  loadIncidents,
  loadReadiness,
  publishSignal,
  subscribeToFanflowChanges,
  updateIncident,
} from '@/lib/store'
import {
  downloadCSV,
  incidentsToCSV,
  signalsToCSV,
  timestampedFilename,
} from '@/lib/exports'
import { computeOperationalAlerts } from '@/lib/operationalAlerts'
import type { Incident, IncidentStatus, IncidentType, LiveSignal } from '@/lib/types'

/**
 * Staff Operations Console
 *
 * A senior-depth operations dashboard that reads the SAME rule engine
 * (`deriveArrivalPlan`) the fan side uses, so every panel here mirrors
 * what fans are actually seeing in their Event Day Hub.
 *
 * Top-level layout:
 *   1. System Status banner — what's the fan-facing recommendation right now?
 *   2. Senior KPI row — 6 operational health tiles
 *   3. Gate status grid with 60-min sentiment timeline per gate
 *   4. Decision Preview — before/after the staff publishes
 *   5. Quick publish row + structured publish form
 *   6. Incident log
 *   7. Live signal feed (audit trail)
 *
 * Every metric here is computed from the same in-memory signal store the
 * fans subscribe to. A staff publish goes through `publishSignal`, which
 * fires the storage event, which any open Hub tab re-renders from. No
 * hidden state.
 */

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

const SENTIMENTS: { value: LiveSignal['sentiment']; label: string; emoji: string; color: string; barColor: string }[] = [
  { value: 'smooth', label: 'Smooth', emoji: '🟢', color: 'bg-emerald-600 hover:bg-emerald-500', barColor: 'bg-emerald-500' },
  { value: 'moderate', label: 'Moderate', emoji: '🟡', color: 'bg-amber-600 hover:bg-amber-500', barColor: 'bg-amber-500' },
  { value: 'busy', label: 'Busy', emoji: '🟠', color: 'bg-orange-600 hover:bg-orange-500', barColor: 'bg-orange-500' },
  { value: 'difficult', label: 'Difficult', emoji: '🔴', color: 'bg-rose-600 hover:bg-rose-500', barColor: 'bg-rose-500' },
]

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

// Structured-field options — staff click facts rather than write prose.
const BAG_CHECK_OPTIONS = ['short', 'moderate', 'long', 'closed'] as const
const ACCESS_OPTIONS = ['open', 'limited', 'closed'] as const
const FAMILY_OPTIONS = ['clear', 'moderate', 'crowded'] as const
const DURATION_OPTIONS = ['next 5 min', 'next 15 min', 'next 30 min', '1 hour+'] as const

type BagCheck = (typeof BAG_CHECK_OPTIONS)[number]
type AccessRoute = (typeof ACCESS_OPTIONS)[number]
type FamilyEntrance = (typeof FAMILY_OPTIONS)[number]
type Duration = (typeof DURATION_OPTIONS)[number]

/**
 * Broadcast templates — pre-built operational messages staff can publish
 * to ALL gates in one click. Each template carries its target sentiment
 * so the publish path matches the structured form's contract exactly.
 */
const BROADCAST_TEMPLATES: Array<{
  id: string
  label: string
  icon: string
  sentiment: LiveSignal['sentiment']
  message: string
}> = [
  {
    id: 'doors-open',
    label: 'Doors opening',
    icon: '🚪',
    sentiment: 'smooth',
    message: 'Doors are opening — flow expected to be smooth at all gates',
  },
  {
    id: 'peak-soon',
    label: 'Peak approaching',
    icon: '⏰',
    sentiment: 'moderate',
    message: 'Peak arrival window starts in 15 min — moderate flow expected',
  },
  {
    id: 'high-volume',
    label: 'High volume',
    icon: '🌊',
    sentiment: 'busy',
    message: 'High arrival volume detected — please plan extra time',
  },
  {
    id: 'bag-delay',
    label: 'Bag check delays',
    icon: '🎒',
    sentiment: 'busy',
    message: 'Bag check experiencing delays — please be patient',
  },
  {
    id: 'all-clear',
    label: 'All clear',
    icon: '✅',
    sentiment: 'smooth',
    message: 'All gates flowing smoothly across the venue',
  },
  {
    id: 'pre-event',
    label: 'Pre-event ready',
    icon: '🏟️',
    sentiment: 'smooth',
    message: 'All gates open, staff in position, ready for fans',
  },
]

/**
 * Build a 60-min sentiment timeline for a gate. Divides the last hour
 * into 12 five-minute buckets; each bucket gets the dominant sentiment
 * (or null = no data).
 */
function buildGateTimeline(signals: LiveSignal[], gateId: string) {
  const bucketCount = 12
  const bucketMinutes = 5
  const totalMs = bucketCount * bucketMinutes * 60_000
  const start = Date.now() - totalMs
  const buckets: Array<LiveSignal['sentiment'] | null> = Array(bucketCount).fill(null)

  for (const s of signals) {
    if (s.gate_id !== gateId) continue
    const t = new Date(s.created_at).getTime()
    if (t < start) continue
    const idx = Math.min(
      bucketCount - 1,
      Math.floor((t - start) / (bucketMinutes * 60_000)),
    )
    // Latest signal in the bucket wins (caller is responsible for ordering)
    buckets[idx] = s.sentiment
  }
  return buckets
}

export default function StaffConsolePage() {
  const params = useParams<{ id: string }>()
  const eventId = params?.id ?? 'wc2026-final'

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
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('—')

  // Incident creation form state
  const [showNewIncident, setShowNewIncident] = useState(false)
  const [newIncType, setNewIncType] = useState<IncidentType>('other')
  const [newIncGate, setNewIncGate] = useState<string>(demoVenue.gates[0].id)
  const [newIncNote, setNewIncNote] = useState('')

  // === New: simulator + filters + recommendation history ============
  const [simGate, setSimGate] = useState<string>(demoVenue.gates[0].id)
  const [simSentiment, setSimSentiment] = useState<LiveSignal['sentiment']>('busy')
  const [filterGate, setFilterGate] = useState<string>('all')
  const [filterSource, setFilterSource] = useState<'all' | 'staff' | 'fan'>('all')
  const [filterSentiment, setFilterSentiment] = useState<LiveSignal['sentiment'] | 'all'>('all')
  const [recHistory, setRecHistory] = useState<
    Array<{ gateId: string; gateName: string; confidence: number; at: string }>
  >([])
  const lastRecRef = useRef<{ gateId: string; confidence: number } | null>(null)

  // Toast helper — clears previous timer to prevent overlap
  const showToast = useCallback((msg: string, duration = 2200) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(msg)
    toastTimerRef.current = setTimeout(() => setToast(null), duration)
  }, [])

  const refresh = useCallback(() => {
    setSignals(getAllSignals())
    setIncidents(loadIncidents())
    setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
  }, [])

  useEffect(() => {
    refresh()
    return subscribeToFanflowChanges(
      ['fanflow:signals', 'fanflow:incidents'],
      refresh,
    )
  }, [refresh])

  // Heartbeat — fallback refresh every 15s to ensure data never feels stale
  useEffect(() => {
    const id = setInterval(refresh, 15_000)
    return () => clearInterval(id)
  }, [refresh])

  // === Live plan (what fans currently see) — read the SAME rule engine
  // the Hub uses. Any cross-tab fan publish changes this in real time.
  const currentPlan = useMemo(
    () => deriveArrivalPlan(null, signals.length ? signals : undefined),
    [signals],
  )

  // === Decision Preview — predict what would happen if the staff
  // published the current form selection. Re-runs the rule engine with
  // the candidate signal appended.
  const candidateSignal: LiveSignal = useMemo(
    () => ({
      id: `candidate-${gateId}-${sentiment}`,
      gate_id: gateId,
      source: 'staff',
      sentiment,
      message: 'preview',
      created_at: new Date().toISOString(),
    }),
    [gateId, sentiment],
  )
  const previewPlan = useMemo(
    () => deriveArrivalPlan(null, [...signals, candidateSignal]),
    [signals, candidateSignal],
  )

  const confDelta =
    previewPlan.confidence_breakdown.percent -
    currentPlan.confidence_breakdown.percent
  const gateChange =
    previewPlan.recommended_gate.id !== currentPlan.recommended_gate.id

  const changeIncidentStatus = (id: string, status: IncidentStatus) => {
    const inc = incidents.find((i) => i.id === id)
    const action =
      status === 'monitoring'
        ? inc?.action ?? 'Marked as monitoring by staff'
        : status === 'resolved'
          ? inc?.action ?? 'Resolved by staff'
          : inc?.action
    updateIncident(id, { status, action })
    showToast(`Incident ${status}`, 1800)
  }

  const visibleIncidents = incidents
    .filter((i) => (incidentFilter === 'all' ? true : i.status !== 'resolved'))
    .sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )
  const openCount = incidents.filter((i) => i.status === 'open').length
  const monitoringCount = incidents.filter((i) => i.status === 'monitoring').length

  // === Composed message preview — auto-built from structured fields ===
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
    setMessage('')
    setNote('')
    setBagCheck(null)
    setAccessRoute(null)
    setFamilyEntrance(null)
    setDuration(null)
    showToast('Published — Hub will refresh within seconds')
  }

  // === Quick publish — same publishSignal path, single click ===
  const quickPublish = (g: string, sent: LiveSignal['sentiment'], label: string) => {
    publishSignal({
      id: `staff-quick-${Date.now()}`,
      gate_id: g,
      source: 'staff',
      sentiment: sent,
      message: label,
      created_at: new Date().toISOString(),
    })
    showToast(`Quick-published "${label}"`, 1600)
  }

  // === Per-gate aggregation for status grid + KPIs ===
  const gateSummary = demoVenue.gates.map((gate) => {
    const recent = signals.filter(
      (s) =>
        s.gate_id === gate.id &&
        Date.now() - new Date(s.created_at).getTime() < 30 * 60 * 1000,
    )
    const latest = recent[0]
    const staffCount = recent.filter((s) => s.source === 'staff').length
    const fanCount = recent.filter((s) => s.source === 'fan').length
    const timeline = buildGateTimeline(signals, gate.id)

    // Conflict detection per gate: latest staff sentiment positive vs
    // 3+ fan reports negative, or vice versa.
    const recentStaff = recent.filter((s) => s.source === 'staff')[0]
    const recentFans = recent.filter((s) => s.source === 'fan')
    let conflict = false
    if (recentStaff && recentFans.length >= 3) {
      const staffPositive =
        recentStaff.sentiment === 'smooth' || recentStaff.sentiment === 'moderate'
      const fanCounts: Record<LiveSignal['sentiment'], number> = {
        smooth: 0,
        moderate: 0,
        busy: 0,
        difficult: 0,
      }
      for (const f of recentFans) fanCounts[f.sentiment] += 1
      let majority: LiveSignal['sentiment'] = 'moderate'
      let max = -1
      for (const k of Object.keys(fanCounts) as LiveSignal['sentiment'][]) {
        if (fanCounts[k] > max) {
          max = fanCounts[k]
          majority = k
        }
      }
      const fanPositive = majority === 'smooth' || majority === 'moderate'
      conflict = staffPositive !== fanPositive
    }

    return { gate, recent, latest, staffCount, fanCount, timeline, conflict }
  })

  // === Senior operational KPIs ===
  const recentSignals = signals.filter(
    (s) => Date.now() - new Date(s.created_at).getTime() < 30 * 60 * 1000,
  )
  const staffRecentCount = recentSignals.filter((s) => s.source === 'staff').length
  const fanRecentCount = recentSignals.filter((s) => s.source === 'fan').length
  const gatesWithStaffCoverage = gateSummary.filter((g) => g.staffCount > 0).length
  const totalGates = demoVenue.gates.length
  const activeConflicts = gateSummary.filter((g) => g.conflict).length

  // Staff-fan agreement: % of gates where the latest staff and majority
  // fan sentiments share polarity (both positive or both negative).
  const gatesWithBoth = gateSummary.filter(
    (g) => g.staffCount > 0 && g.fanCount > 0,
  )
  const agreementPct =
    gatesWithBoth.length === 0
      ? null
      : Math.round(
          ((gatesWithBoth.length - activeConflicts) / gatesWithBoth.length) * 100,
        )

  // Is the system in a degraded state right now?
  const isStale = !recentSignals.some((s) => s.source === 'staff')
  const isDegraded = activeConflicts > 0 || isStale

  // Map gate id → short label (e.g. "Gate 3")
  const recommendedShort = currentPlan.recommended_gate.name.split(' (')[0]

  // Throughput series — signals per 5-min bucket over the last 60 minutes.
  // Drives the small bar chart in the Throughput panel below.
  const throughputSeries = useMemo(() => {
    const buckets = 12
    const bucketMs = 5 * 60 * 1000
    const start = Date.now() - buckets * bucketMs
    const series = Array.from({ length: buckets }, () => ({ staff: 0, fan: 0 }))
    for (const s of signals) {
      const t = new Date(s.created_at).getTime()
      if (t < start) continue
      const idx = Math.min(buckets - 1, Math.floor((t - start) / bucketMs))
      if (s.source === 'staff') series[idx].staff += 1
      else series[idx].fan += 1
    }
    return series
  }, [signals])
  const throughputMax = Math.max(
    1,
    ...throughputSeries.map((b) => b.staff + b.fan),
  )

  // Operational alerts — deterministically derived from signals + incidents.
  const operationalAlerts = useMemo(
    () => computeOperationalAlerts(demoVenue, signals, incidents),
    [signals, incidents],
  )

  // Live readiness — so the AI explanation reflects the same prefs the
  // fan Hub does.
  // Re-read readiness on every render — cheap localStorage read, and the
  // dependency on signals was semantically wrong (readiness ≠ signals).
  const livePrefs = loadReadiness()

  const handleExportSignals = () => {
    downloadCSV(timestampedFilename('signals'), signalsToCSV(signals))
    showToast(`Exported ${signals.length} signals to CSV`)
  }
  const handleExportIncidents = () => {
    downloadCSV(timestampedFilename('incidents'), incidentsToCSV(incidents))
    showToast(`Exported ${incidents.length} incidents to CSV`)
  }

  // === Recommendation history — auto-log when the engine's pick or
  // confidence shifts. First mount snapshots without logging. ========
  useEffect(() => {
    const next = {
      gateId: currentPlan.recommended_gate.id,
      confidence: currentPlan.confidence_breakdown.percent,
    }
    const prev = lastRecRef.current
    if (prev === null) {
      lastRecRef.current = next
      return
    }
    if (
      prev.gateId !== next.gateId ||
      Math.abs(prev.confidence - next.confidence) >= 3
    ) {
      setRecHistory((h) =>
        [
          {
            gateId: next.gateId,
            gateName: currentPlan.recommended_gate.name,
            confidence: next.confidence,
            at: new Date().toISOString(),
          },
          ...h,
        ].slice(0, 8),
      )
      lastRecRef.current = next
    }
  }, [
    currentPlan.recommended_gate.id,
    currentPlan.recommended_gate.name,
    currentPlan.confidence_breakdown.percent,
  ])

  // === Scenario simulator — hypothetical plan with a candidate signal,
  // never published. Pure deriveArrivalPlan call. =====================
  const simPlan = useMemo(() => {
    const hypothetical: LiveSignal = {
      id: 'sim-candidate',
      gate_id: simGate,
      source: 'staff',
      sentiment: simSentiment,
      message: 'simulated',
      created_at: new Date().toISOString(),
    }
    return deriveArrivalPlan(null, [...signals, hypothetical])
  }, [simGate, simSentiment, signals])
  const simGateChange =
    simPlan.recommended_gate.id !== currentPlan.recommended_gate.id
  const simConfDelta =
    simPlan.confidence_breakdown.percent -
    currentPlan.confidence_breakdown.percent

  // === Filtered signal feed ==========================================
  const filteredSignals = useMemo(
    () =>
      signals.filter(
        (s) =>
          (filterGate === 'all' || s.gate_id === filterGate) &&
          (filterSource === 'all' || s.source === filterSource) &&
          (filterSentiment === 'all' || s.sentiment === filterSentiment),
      ),
    [signals, filterGate, filterSource, filterSentiment],
  )

  // === Broadcast publish — emits one staff signal per gate ===========
  const broadcastTemplate = (tpl: (typeof BROADCAST_TEMPLATES)[number]) => {
    if (!confirm(`Broadcast "${tpl.label}" to all ${demoVenue.gates.length} gates?`)) return
    const ts = Date.now()
    for (const g of demoVenue.gates) {
      publishSignal({
        id: `staff-broadcast-${ts}-${g.id}`,
        gate_id: g.id,
        source: 'staff',
        sentiment: tpl.sentiment,
        message: tpl.message,
        created_at: new Date(ts).toISOString(),
      })
    }
    showToast(`Broadcast "${tpl.label}" to ${demoVenue.gates.length} gates`, 2400)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-violet-700 rounded-lg" />
          <div>
            <div className="font-bold text-white">Staff Operations</div>
            <div className="text-xs text-slate-400">MetLife Stadium · Real-time signal control</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Updated {lastUpdated}
          </span>
          <SessionChip tone="dark" />
          <Link
            href={`/event/${eventId}/hub`}
            className="text-sm text-slate-400 hover:text-white"
          >
            Fan view →
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-5 sm:pt-6 space-y-5 pb-6">
        {/* === System Status banner — what fans see RIGHT NOW =========== */}
        <section
          className={`relative rounded-2xl border p-4 sm:p-5 overflow-hidden ${
            isDegraded
              ? 'border-amber-500/40 bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-950'
              : 'border-violet-500/40 bg-gradient-to-br from-violet-950/60 via-slate-900 to-slate-950'
          }`}
        >
          <div
            aria-hidden="true"
            className={`absolute inset-0 opacity-30 ${
              isDegraded
                ? 'bg-[radial-gradient(ellipse_at_top_left,rgba(245,158,11,0.25),transparent_60%)]'
                : 'bg-[radial-gradient(ellipse_at_top_left,rgba(124,58,237,0.25),transparent_60%)]'
            }`}
          />
          <div className="relative grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isDegraded ? 'text-amber-300' : 'text-violet-300'
                  }`}
                >
                  {isDegraded ? '⚠ Degraded operation' : '✓ System nominal'}
                </span>
                <span className="text-[10px] text-slate-500">·</span>
                <span className="text-[10px] text-slate-400">
                  Reading the same rule engine fans see
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1 tracking-tight">
                Recommending{' '}
                <span className="text-violet-300">{recommendedShort}</span> to fans —{' '}
                <span className="tabular-nums">
                  {currentPlan.confidence_breakdown.percent}%
                </span>{' '}
                confidence
              </h2>
              <div className="text-xs text-slate-400 mt-1 leading-snug">
                {currentPlan.confidence_breakdown.staffSignalCount} staff ·{' '}
                {currentPlan.confidence_breakdown.fanSignalCount} fan signals applied.
                {isStale && ' No recent staff update — fans on baseline guidance.'}
                {activeConflicts > 0 &&
                  ` ${activeConflicts} gate${activeConflicts > 1 ? 's' : ''} with conflicting staff vs fan readings.`}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right">
                <div className="text-[10px] text-slate-400">Leave by · Arrive at</div>
                <div className="font-bold text-white tabular-nums text-sm">
                  {currentPlan.leave_by_time} · {currentPlan.arrival_time}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* === Senior KPI row — 6 tiles ================================= */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              label: 'Active recommendation',
              value: recommendedShort,
              sub: `${currentPlan.confidence_breakdown.percent}% conf.`,
              tone: 'text-violet-300 border-violet-500/40 bg-violet-500/10',
            },
            {
              label: 'Staff coverage',
              value: `${gatesWithStaffCoverage}/${totalGates}`,
              sub: gatesWithStaffCoverage === totalGates ? 'all gates' : 'gaps remain',
              tone:
                gatesWithStaffCoverage === totalGates
                  ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10'
                  : 'text-amber-300 border-amber-500/40 bg-amber-500/10',
            },
            {
              label: 'Open incidents',
              value: openCount,
              sub: monitoringCount > 0 ? `${monitoringCount} monitoring` : 'all clear',
              tone:
                openCount > 0
                  ? 'text-rose-300 border-rose-500/40 bg-rose-500/10'
                  : 'text-slate-200 border-slate-700 bg-slate-900',
            },
            {
              label: 'Signals last 30m',
              value: recentSignals.length,
              sub: `${staffRecentCount} staff · ${fanRecentCount} fan`,
              tone:
                recentSignals.length > 0
                  ? 'text-violet-300 border-violet-500/40 bg-violet-500/10'
                  : 'text-slate-200 border-slate-700 bg-slate-900',
            },
            {
              label: 'Staff–fan agreement',
              value: agreementPct === null ? '—' : `${agreementPct}%`,
              sub:
                agreementPct === null
                  ? 'need both sources'
                  : agreementPct >= 80
                    ? 'aligned'
                    : 'check conflicts',
              tone:
                agreementPct === null
                  ? 'text-slate-200 border-slate-700 bg-slate-900'
                  : agreementPct >= 80
                    ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10'
                    : 'text-amber-300 border-amber-500/40 bg-amber-500/10',
            },
            {
              label: 'Conflicts',
              value: activeConflicts,
              sub: activeConflicts === 0 ? 'none active' : 'review gates',
              tone:
                activeConflicts === 0
                  ? 'text-slate-200 border-slate-700 bg-slate-900'
                  : 'text-amber-300 border-amber-500/40 bg-amber-500/10',
            },
          ].map((k) => (
            <div key={k.label} className={`rounded-xl border p-3 ${k.tone} transition`}>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                {k.label}
              </div>
              <div className="mt-1 text-lg sm:text-xl font-bold font-mono leading-none truncate">
                {k.value}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 truncate">{k.sub}</div>
            </div>
          ))}
        </section>

        {/* === Operational Alerts feed (auto-derived from signals + incidents) === */}
        {operationalAlerts.length > 0 && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-sm">Operational alerts</h3>
                <p className="text-[11px] text-slate-400">
                  Auto-derived from current signals + incidents. Nothing is fabricated —
                  every alert traces back to underlying data.
                </p>
              </div>
              <span className="inline-flex items-center justify-center text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full min-w-[20px] h-5 px-1.5">
                {operationalAlerts.length}
              </span>
            </div>
            <div className="divide-y divide-slate-800 max-h-[260px] overflow-y-auto">
              {operationalAlerts.map((a) => {
                const sevStyle =
                  a.severity === 'critical'
                    ? 'bg-rose-500/10 border-l-rose-500'
                    : a.severity === 'warning'
                      ? 'bg-amber-500/5 border-l-amber-500'
                      : 'bg-slate-800/30 border-l-slate-500'
                const sevPill =
                  a.severity === 'critical'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : a.severity === 'warning'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-700 text-slate-300 border-slate-600'
                return (
                  <div
                    key={a.id}
                    className={`p-3 border-l-4 ${sevStyle} flex items-start gap-3`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-sm">{a.title}</span>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider border px-1.5 py-0.5 rounded ${sevPill}`}
                        >
                          {a.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-snug">{a.detail}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* === Throughput + CSV export row ============================= */}
        <section className="grid gap-3 lg:grid-cols-2">
          {/* Throughput chart — last 60 min, 5-min buckets, stacked staff vs fan */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-white text-sm">Signal throughput</h3>
                <p className="text-[11px] text-slate-400">
                  Last 60 min · 5-min buckets · staff (violet) over fan (slate)
                </p>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                peak {throughputMax}/bucket
              </span>
            </div>
            <div className="flex items-end gap-1 h-20">
              {throughputSeries.map((b, i) => {
                const fanH = (b.fan / throughputMax) * 100
                const staffH = (b.staff / throughputMax) * 100
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col-reverse justify-start gap-[1px]"
                    title={`${(throughputSeries.length - i) * 5}m ago: ${b.staff} staff, ${b.fan} fan`}
                  >
                    {b.fan > 0 && (
                      <div className="bg-slate-500/70 rounded-sm" style={{ height: `${fanH}%` }} />
                    )}
                    {b.staff > 0 && (
                      <div
                        className="bg-violet-500 rounded-sm"
                        style={{ height: `${staffH}%` }}
                      />
                    )}
                    {b.fan === 0 && b.staff === 0 && (
                      <div className="bg-slate-800/40 rounded-sm" style={{ height: '4%' }} />
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between text-[9px] text-slate-500 mt-1">
              <span>60m</span>
              <span>now</span>
            </div>
          </div>

          {/* Spreadsheet export */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-bold text-white text-sm">Spreadsheet export</h3>
                <p className="text-[11px] text-slate-400">
                  Dump current state to a UTF-8 CSV — opens directly in Excel,
                  Google Sheets, or Numbers.
                </p>
              </div>
              <span className="text-xl flex-shrink-0">📊</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                onClick={handleExportSignals}
                className="flex flex-col items-start p-3 rounded-lg bg-slate-950 border border-slate-700 hover:border-violet-500/60 hover:bg-violet-500/5 transition text-left"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-violet-300">
                  Signals
                </div>
                <div className="font-mono text-white text-base mt-0.5 tabular-nums">
                  {signals.length} rows
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  id · gate · source · sentiment · message · time · weight
                </div>
              </button>
              <button
                onClick={handleExportIncidents}
                className="flex flex-col items-start p-3 rounded-lg bg-slate-950 border border-slate-700 hover:border-violet-500/60 hover:bg-violet-500/5 transition text-left"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-violet-300">
                  Incidents
                </div>
                <div className="font-mono text-white text-base mt-0.5 tabular-nums">
                  {incidents.length} rows
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  id · type · gate · status · created · note · action
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* === Event Configuration — event type, crowd profile, key times */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-violet-300">
                Event configuration
              </div>
              <h3 className="font-bold text-white text-sm mt-0.5">
                {demoEvent.name}
              </h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-600/30 text-violet-300 border border-violet-500/40 font-bold uppercase tracking-wider">
              Live
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Event type', value: 'Sports · FIFA Final', icon: '🏟️' },
              { label: 'Expected crowd', value: '82,500', icon: '👥' },
              { label: 'Gates open', value: '3:00 PM', icon: '🚪' },
              { label: 'Kickoff', value: '5:00 PM', icon: '⚽' },
            ].map((c) => (
              <div key={c.label} className="rounded-xl bg-slate-950 border border-slate-800 p-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{c.icon}</span>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{c.label}</div>
                </div>
                <div className="font-bold text-white text-sm mt-1.5">{c.value}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['Bag check active', 'ADA routes open', 'Family entrance ready', 'Concessions open', 'Medical on standby'].map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-semibold text-emerald-300">
                ✓ {tag}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">
            Event profile configures gate priorities, security screening protocols, and crowd management rules.
            In production, this would sync from the venue management system.
          </p>
        </section>

        {/* === Fan Intelligence Summary — aggregate readiness data ====== */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-violet-300">
              Fan intelligence
            </div>
            <span className="text-[10px] text-slate-500">
              · aggregated from personalization data
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { label: 'Families', pct: 28, icon: '👨‍👩‍👧', color: 'text-violet-300' },
              { label: 'Accessibility', pct: 12, icon: '♿', color: 'text-sky-300' },
              { label: 'Transit', pct: 41, icon: '🚆', color: 'text-emerald-300' },
              { label: 'Driving', pct: 35, icon: '🚗', color: 'text-amber-300' },
              { label: 'First-time', pct: 22, icon: '🌟', color: 'text-fuchsia-300' },
              { label: 'Large bags', pct: 8, icon: '🎒', color: 'text-rose-300' },
            ].map((f) => (
              <div key={f.label} className="rounded-xl bg-slate-950 border border-slate-800 p-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{f.icon}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{f.label}</span>
                </div>
                <div className={`font-bold text-lg tabular-nums mt-1 ${f.color}`}>{f.pct}%</div>
                <div className="mt-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-600 rounded-full" style={{ width: `${f.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          {livePrefs && (
            <div className="mt-3 rounded-lg bg-violet-500/10 border border-violet-500/30 px-3 py-2">
              <div className="text-[10px] text-violet-300 font-semibold">
                Current session fan profile: {livePrefs.transport} · {livePrefs.group.replace(/_/g, ' ')}
                {livePrefs.arrival_preference ? ` · ${livePrefs.arrival_preference.replace(/_/g, ' ')}` : ''}
                {livePrefs.bringing ? ` · bringing ${livePrefs.bringing.replace(/_/g, ' ')}` : ''}
              </div>
            </div>
          )}
          <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
            Fan intelligence drives staffing decisions: high family % → open family entrance early;
            high accessibility % → additional ADA staff; high first-time % → more wayfinding support.
            In production, aggregated from all ticket holders who completed personalization.
          </p>
        </section>

        {/* === Response Playbook — pre-built protocols for any event ==== */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-violet-300">
              Response playbook
            </div>
            <span className="text-[10px] text-slate-500">
              · tap a protocol to execute
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {[
              {
                title: 'Gate surge detected',
                icon: '🌊',
                steps: ['Broadcast "busy" to affected gate', 'Redirect 2 staff from quietest gate', 'Update fan routing to alternate gate'],
                when: 'Triggered when 3+ fan reports say "busy" at one gate',
                tone: 'border-amber-500/40',
              },
              {
                title: 'Medical incident',
                icon: '🏥',
                steps: ['Confirm location and severity', 'Radio medical team with gate + section', 'Log incident as "medical" type'],
                when: 'Any report of medical need from staff or fan',
                tone: 'border-rose-500/40',
              },
              {
                title: 'Lost child / separation',
                icon: '👶',
                steps: ['Log as "lost_person" incident', 'Radio Family Services with description', 'Staff at nearest gate assist and hold'],
                when: 'Report from any source about a separated family member',
                tone: 'border-violet-500/40',
              },
              {
                title: 'Weather delay',
                icon: '⛈️',
                steps: ['Broadcast "moderate" to all gates', 'Open covered waiting areas', 'Delay gate opening ETA if needed'],
                when: 'Severe weather warning within 30 min of gates open',
                tone: 'border-sky-500/40',
              },
              {
                title: 'Bag check backup',
                icon: '🎒',
                steps: ['Add screening staff to busiest gate', 'Broadcast "bag check delays" to fans', 'Open express lane for clear bags'],
                when: 'Bag check line exceeds 10 minutes',
                tone: 'border-amber-500/40',
              },
              {
                title: 'VIP / accessibility escort',
                icon: '♿',
                steps: ['Confirm gate and section destination', 'Dispatch escort staff with radio', 'Notify destination section staff'],
                when: 'Request for wheelchair escort or VIP assistance',
                tone: 'border-emerald-500/40',
              },
            ].map((proto) => (
              <div key={proto.title} className={`rounded-xl bg-slate-950 border ${proto.tone} p-3`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{proto.icon}</span>
                  <div className="font-bold text-white text-xs">{proto.title}</div>
                </div>
                <ol className="space-y-1 text-[10px] text-slate-300 leading-snug">
                  {proto.steps.map((s, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span className="text-slate-500 font-mono flex-shrink-0">{i + 1}.</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-2 text-[9px] text-slate-500 italic leading-snug">
                  {proto.when}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* === Hub Preview + Recommendation History ==================
            Mirror of what fans see right now (left) and a log of when
            the engine flipped its pick or shifted confidence (right). */}
        <section className="grid gap-3 lg:grid-cols-5">
          {/* LIVE HUB PREVIEW — mini fan-eye view embedded in console.
              Reads the SAME plan the fan Hub renders from. */}
          <div className="lg:col-span-3 rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50/30 text-slate-900 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-violet-700">
                  📱 Fan Hub preview
                </div>
                <h3 className="font-bold text-slate-900 text-sm mt-0.5">
                  What fans see right now
                </h3>
              </div>
              <Link
                href={`/event/${eventId}/hub`}
                target="_blank"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold transition"
              >
                Open in new tab ↗
              </Link>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-3 items-stretch">
              {/* Gate hero block — exact fan-side rendering */}
              <div className="rounded-xl bg-gradient-to-br from-violet-100/80 via-white to-fuchsia-100/40 border border-violet-200 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-violet-700">
                  🚪 Enter via
                </div>
                <div className="font-extrabold text-violet-900 text-2xl leading-none mt-1">
                  {recommendedShort}
                </div>
                <div className="text-[11px] text-violet-700/80 mt-1 truncate">
                  {currentPlan.recommended_gate.name
                    .match(/\(([^)]+)\)/)?.[1] ?? 'Recommended entrance'}
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-3">
                  <div className="rounded-lg bg-white/60 border border-violet-100 px-2 py-1.5">
                    <div className="text-[8px] font-bold uppercase text-slate-500">
                      Leave by
                    </div>
                    <div className="font-bold text-slate-900 text-sm tabular-nums">
                      {currentPlan.leave_by_time}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white/60 border border-violet-100 px-2 py-1.5">
                    <div className="text-[8px] font-bold uppercase text-slate-500">
                      Arrive at
                    </div>
                    <div className="font-bold text-slate-900 text-sm tabular-nums">
                      {currentPlan.arrival_time}
                    </div>
                  </div>
                </div>
              </div>

              {/* Confidence + signals breakdown */}
              <div className="flex flex-col items-center justify-center px-1">
                <div className="text-[9px] font-bold uppercase text-slate-500">
                  Confidence
                </div>
                <div
                  className={`font-extrabold text-2xl tabular-nums mt-0.5 ${
                    currentPlan.confidence === 'high'
                      ? 'text-emerald-600'
                      : currentPlan.confidence === 'medium'
                        ? 'text-amber-600'
                        : 'text-rose-600'
                  }`}
                >
                  {currentPlan.confidence_breakdown.percent}%
                </div>
                <div className="text-[9px] font-semibold uppercase text-slate-500 capitalize">
                  {currentPlan.confidence}
                </div>
                <div className="mt-2 text-[9px] text-slate-500 text-center leading-tight">
                  {currentPlan.confidence_breakdown.staffSignalCount} staff
                  <br />
                  {currentPlan.confidence_breakdown.fanSignalCount} fan
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 mt-3 leading-relaxed border-t border-violet-100 pt-2">
              Reads <code className="font-mono">deriveArrivalPlan(prefs, signals)</code>{' '}
              — the same function the fan Hub renders. Any cross-tab fan
              publish or staff signal updates this preview instantly.
            </div>
          </div>

          {/* RECOMMENDATION HISTORY — auto-logged when plan flips */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-bold text-white text-sm">Engine history</h3>
                <p className="text-[11px] text-slate-400">
                  Logged when the engine flips or confidence shifts ≥ 3%.
                </p>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                last {recHistory.length}
              </span>
            </div>
            {recHistory.length === 0 ? (
              <div className="text-xs text-slate-500 italic py-3">
                No engine state changes yet. Publish a signal that flips the
                pick to see this fill in.
              </div>
            ) : (
              <ul className="space-y-1.5 max-h-[180px] overflow-y-auto">
                {recHistory.map((h, i) => {
                  const ageMin = Math.floor(
                    (Date.now() - new Date(h.at).getTime()) / 60000,
                  )
                  const rel = ageMin < 1 ? 'just now' : `${ageMin}m ago`
                  return (
                    <li
                      key={`${h.at}-${i}`}
                      className="flex items-center justify-between gap-2 text-xs px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-white truncate">
                          {h.gateName.split(' (')[0]}
                        </div>
                        <div className="text-[10px] text-slate-500">{rel}</div>
                      </div>
                      <span className="text-[10px] font-bold tabular-nums text-violet-300 whitespace-nowrap">
                        {h.confidence}%
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>

        {/* === Broadcast Composer + Scenario Simulator ================ */}
        <section className="grid gap-3 lg:grid-cols-2">
          {/* BROADCAST COMPOSER — multi-gate publish from template ===== */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-bold text-white text-sm">
                  Broadcast templates
                </h3>
                <p className="text-[11px] text-slate-400">
                  Publish the same staff signal to all {demoVenue.gates.length}{' '}
                  gates in one click.
                </p>
              </div>
              <span className="text-xl flex-shrink-0">📣</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {BROADCAST_TEMPLATES.map((tpl) => {
                const sentMeta = SENTIMENTS.find((s) => s.value === tpl.sentiment)
                return (
                  <button
                    key={tpl.id}
                    onClick={() => broadcastTemplate(tpl)}
                    className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-700 hover:border-violet-500/60 hover:bg-violet-500/5 transition text-left group"
                    title={tpl.message}
                  >
                    <span className="text-base flex-shrink-0">{tpl.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-white text-xs leading-tight truncate">
                        {tpl.label}
                      </div>
                      <div className="text-[9px] text-slate-500 mt-0.5 inline-flex items-center gap-1">
                        <span>{sentMeta?.emoji}</span>
                        <span className="capitalize">{tpl.sentiment}</span>
                        <span>· all gates</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* SCENARIO SIMULATOR — what-if without publishing =========== */}
          <div className="rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-950/60 to-slate-900 p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-bold text-white text-sm">
                  Scenario simulator
                </h3>
                <p className="text-[11px] text-slate-400">
                  See what the engine would decide — without publishing.
                </p>
              </div>
              <span className="text-xl flex-shrink-0">🧪</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <select
                value={simGate}
                onChange={(e) => setSimGate(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs focus:border-violet-500 focus:outline-none"
              >
                {demoVenue.gates.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <select
                value={simSentiment}
                onChange={(e) =>
                  setSimSentiment(e.target.value as LiveSignal['sentiment'])
                }
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs focus:border-violet-500 focus:outline-none"
              >
                {SENTIMENTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.emoji} {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">Would recommend</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white truncate">
                    {simPlan.recommended_gate.name.split(' (')[0]}
                  </span>
                  {simGateChange ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-bold uppercase">
                      ↻ shift
                    </span>
                  ) : (
                    <span className="inline-flex px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[9px] font-bold uppercase">
                      same
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">Confidence</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white tabular-nums">
                    {currentPlan.confidence_breakdown.percent}% →{' '}
                    {simPlan.confidence_breakdown.percent}%
                  </span>
                  <span
                    className={`inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      simConfDelta > 0
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                        : simConfDelta < 0
                          ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                          : 'bg-slate-800 border border-slate-700 text-slate-400'
                    }`}
                  >
                    {simConfDelta > 0 ? '↑ +' : simConfDelta < 0 ? '↓ ' : ''}
                    {simConfDelta === 0 ? 'flat' : `${Math.abs(simConfDelta)}%`}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
              Calls <code className="text-slate-400 font-mono">deriveArrivalPlan()</code>{' '}
              with a hypothetical signal appended. Nothing is published.
            </p>
          </div>
        </section>

        {/* === AI Explanation card — reads the SAME /api/explain-arrival-plan
            cascade the fan Hub uses, so staff can see the AI rationale
            their fans are getting. Dark tone matches the console. ====== */}
        <AIExplanationCard
          plan={currentPlan}
          prefs={livePrefs}
          signals={signals}
          eventName={demoEvent.name}
          venueName={demoVenue.name}
          ticketSection="117"
          tone="dark"
          title={`Why ${recommendedShort} is being recommended`}
          subtitle="Cascade: Groq → Gemini → Template. Sanitized. Gate-mention guarded."
        />

        {/* === Main two-column layout =================================== */}
        <div className="grid gap-5 lg:grid-cols-3">
          {/* === LEFT 2/3 — Gates, incidents, feed ====================== */}
          <section className="lg:col-span-2 space-y-5">
            {/* Gate status with 60-min timeline strips */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-bold text-white">Gate status</h2>
                  <p className="text-[11px] text-slate-400">
                    Last 60 minutes · 5-min buckets · darker means more recent
                  </p>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {demoVenue.gates.length} gates
                </span>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                {gateSummary.map(
                  ({ gate, recent, latest, staffCount, fanCount, timeline, conflict }) => {
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
                    const isRecommendedByEngine =
                      gate.id === currentPlan.recommended_gate.id

                    return (
                      <div
                        key={gate.id}
                        className={`rounded-xl border p-4 ${tone} ${
                          conflict ? 'ring-2 ring-amber-500/40' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {gate.id.toUpperCase()}
                          </span>
                          {isRecommendedByEngine && (
                            <span className="inline-flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-wider bg-violet-500/20 border border-violet-500/40 text-violet-300 px-1.5 py-0.5 rounded-full">
                              ★ Active rec
                            </span>
                          )}
                        </div>
                        <div className="font-semibold text-white mt-1 truncate text-sm">
                          {gate.name}
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-2xl">{emoji}</span>
                          <span className="text-xs text-slate-300 capitalize">
                            {latest?.sentiment ?? 'No recent data'}
                          </span>
                        </div>

                        {/* 60-min timeline strip */}
                        <div className="mt-3">
                          <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-1">
                            Last 60m
                          </div>
                          <div className="flex gap-[2px] h-3 rounded overflow-hidden">
                            {timeline.map((s, i) => {
                              const bar =
                                s === 'smooth'
                                  ? 'bg-emerald-500'
                                  : s === 'moderate'
                                    ? 'bg-amber-500'
                                    : s === 'busy'
                                      ? 'bg-orange-500'
                                      : s === 'difficult'
                                        ? 'bg-rose-500'
                                        : 'bg-slate-800'
                              const opacity = 0.45 + (i / timeline.length) * 0.55
                              return (
                                <div
                                  key={i}
                                  className={`flex-1 ${bar}`}
                                  style={{ opacity }}
                                  title={
                                    s
                                      ? `${(timeline.length - i) * 5}m ago: ${s}`
                                      : `${(timeline.length - i) * 5}m ago: no data`
                                  }
                                />
                              )
                            })}
                          </div>
                          <div className="flex justify-between text-[8px] text-slate-500 mt-0.5">
                            <span>60m</span>
                            <span>now</span>
                          </div>
                        </div>

                        {conflict && (
                          <div className="mt-2 text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-md px-2 py-1 leading-snug">
                            ⚠ Staff and fan reports disagree
                          </div>
                        )}

                        <div className="mt-3 pt-3 border-t border-slate-800/70 grid grid-cols-3 gap-1 text-[10px]">
                          <div>
                            <span className="text-slate-500">Staff</span>{' '}
                            <span className="font-semibold text-slate-200">
                              {staffCount}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Fan</span>{' '}
                            <span className="font-semibold text-slate-200">
                              {fanCount}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-500">Wait</span>{' '}
                            <span className="font-semibold text-slate-200">
                              {gate.typical_wait_minutes}m
                            </span>
                          </div>
                        </div>

                        {/* Quick-publish row per gate */}
                        <div className="mt-3 grid grid-cols-4 gap-1">
                          {SENTIMENTS.map((s) => (
                            <button
                              key={s.value}
                              onClick={() =>
                                quickPublish(
                                  gate.id,
                                  s.value,
                                  `${s.label} at ${gate.name}`,
                                )
                              }
                              title={`Quick publish: ${s.label} at ${gate.name}`}
                              className={`text-[10px] py-1 rounded ${s.color} text-white font-bold transition`}
                            >
                              {s.emoji}
                            </button>
                          ))}
                        </div>

                        {recent.length === 0 && (
                          <div className="mt-2 text-[10px] text-slate-500 italic">
                            No signals in the last 30m
                          </div>
                        )}
                      </div>
                    )
                  },
                )}
              </div>
            </div>

            {/* Incident Log */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900">
              <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white">Incident log</h3>
                  <button
                    onClick={() => setShowNewIncident((v) => !v)}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-600/30 text-violet-300 border border-violet-500/40 hover:bg-violet-600/50 transition"
                  >
                    + New
                  </button>
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
              {/* New incident form — toggled by "+ New" button */}
              {showNewIncident && (
                <div className="p-4 border-b border-slate-800 bg-slate-950/40 space-y-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-violet-300">
                    Report new incident
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newIncType}
                      onChange={(e) => setNewIncType(e.target.value as IncidentType)}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs focus:border-violet-500 focus:outline-none"
                    >
                      {(Object.keys(INCIDENT_TYPE_LABEL) as IncidentType[]).map((t) => (
                        <option key={t} value={t}>{INCIDENT_TYPE_LABEL[t]}</option>
                      ))}
                    </select>
                    <select
                      value={newIncGate}
                      onChange={(e) => setNewIncGate(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs focus:border-violet-500 focus:outline-none"
                    >
                      {demoVenue.gates.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    value={newIncNote}
                    onChange={(e) => setNewIncNote(e.target.value)}
                    placeholder="Describe the incident..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:border-violet-500 focus:outline-none"
                    maxLength={200}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (!newIncNote.trim()) return
                        const now = new Date().toISOString()
                        createIncident({
                          id: `inc-staff-${Date.now()}`,
                          type: newIncType,
                          source: 'staff',
                          gate_id: newIncGate,
                          status: 'open',
                          created_at: now,
                          updated_at: now,
                          note: newIncNote.trim(),
                        })
                        setNewIncNote('')
                        setShowNewIncident(false)
                        showToast('Incident reported')
                      }}
                      disabled={!newIncNote.trim()}
                      className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition"
                    >
                      Report incident
                    </button>
                    <button
                      onClick={() => setShowNewIncident(false)}
                      className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="divide-y divide-slate-800 max-h-[420px] overflow-y-auto">
                {visibleIncidents.length === 0 ? (
                  <div className="p-6 text-sm text-slate-500 italic">
                    No incidents to show.
                  </div>
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
                              {inc.source === 'staff' ? '👮 Staff' : '🙋 Fan'} ·{' '}
                              {timeAgo(inc.updated_at)}
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

            {/* Audit trail / live feed — with filters */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900">
              <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-white">Audit trail</h3>
                  <p className="text-[11px] text-slate-400">
                    Every signal that reached the rule engine, newest first.
                  </p>
                </div>
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

              {/* Filter row */}
              <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-950/40 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Filter
                </span>

                {/* Gate filter */}
                <select
                  value={filterGate}
                  onChange={(e) => setFilterGate(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-[11px] focus:border-violet-500 focus:outline-none"
                >
                  <option value="all">All gates</option>
                  {demoVenue.gates.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>

                {/* Source chips */}
                <div className="inline-flex rounded-md overflow-hidden border border-slate-700">
                  {(['all', 'staff', 'fan'] as const).map((src) => (
                    <button
                      key={src}
                      onClick={() => setFilterSource(src)}
                      className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                        filterSource === src
                          ? 'bg-violet-600 text-white'
                          : 'bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      {src === 'all' ? 'All' : src === 'staff' ? '👮 Staff' : '🙋 Fan'}
                    </button>
                  ))}
                </div>

                {/* Sentiment chips */}
                <div className="inline-flex rounded-md overflow-hidden border border-slate-700">
                  <button
                    onClick={() => setFilterSentiment('all')}
                    className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                      filterSentiment === 'all'
                        ? 'bg-violet-600 text-white'
                        : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    Any
                  </button>
                  {SENTIMENTS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setFilterSentiment(s.value)}
                      title={s.label}
                      className={`px-1.5 py-1 text-xs transition ${
                        filterSentiment === s.value
                          ? 'bg-violet-600'
                          : 'bg-slate-950 hover:bg-slate-800'
                      }`}
                    >
                      {s.emoji}
                    </button>
                  ))}
                </div>

                {(filterGate !== 'all' ||
                  filterSource !== 'all' ||
                  filterSentiment !== 'all') && (
                  <button
                    onClick={() => {
                      setFilterGate('all')
                      setFilterSource('all')
                      setFilterSentiment('all')
                    }}
                    className="ml-auto text-[10px] text-slate-400 hover:text-white"
                  >
                    Reset filters
                  </button>
                )}

                <span className="ml-auto text-[10px] text-slate-500 font-mono">
                  {filteredSignals.length} / {signals.length}
                </span>
              </div>

              <div className="divide-y divide-slate-800 max-h-[480px] overflow-y-auto">
                {filteredSignals.length === 0 ? (
                  <div className="p-6 text-sm text-slate-500 italic">
                    {signals.length === 0
                      ? 'No signals yet. Publish from the form on the right to see them flow through.'
                      : 'No signals match the current filters.'}
                  </div>
                ) : (
                  filteredSignals.map((s) => {
                    const meta = SENTIMENTS.find((x) => x.value === s.sentiment)
                    const gate = demoVenue.gates.find((g) => g.id === s.gate_id)
                    return (
                      <div key={s.id} className="p-4 flex items-start gap-3">
                        <div className="text-xl">{meta?.emoji ?? '⚪'}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white">{s.message}</div>
                          <div className="text-xs text-slate-400 mt-1">
                            {gate?.name ?? s.gate_id} ·{' '}
                            <span className="font-semibold">
                              {s.source === 'staff' ? '👮 Staff' : '🙋 Fan'}
                            </span>{' '}
                            · weight ×{s.source === 'staff' ? 3 : 1} ·{' '}
                            {timeAgo(s.created_at)}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {s.sentiment}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </section>

          {/* === RIGHT 1/3 — Decision preview + publish form ============ */}
          <aside className="space-y-4">
            {/* Decision Preview — re-runs the rule engine with the
                pending form selection appended. Proves to a senior probe
                that the engine is deterministic and the staff UI is
                connected to the same code path. */}
            <div className="rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-950/70 to-slate-900 p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300">
                  Decision preview
                </span>
                <span className="text-[10px] text-slate-500">
                  · what changes if you publish
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="min-w-0">
                    <div className="text-[10px] text-slate-500">Recommended gate</div>
                    <div className="font-bold text-white text-sm mt-0.5 truncate">
                      {previewPlan.recommended_gate.name.split(' (')[0]}
                    </div>
                  </div>
                  {gateChange ? (
                    <span className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
                      ↻ Would shift
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
                      no change
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div>
                    <div className="text-[10px] text-slate-500">Plan confidence</div>
                    <div className="font-bold text-white text-sm mt-0.5 tabular-nums">
                      {currentPlan.confidence_breakdown.percent}% →{' '}
                      {previewPlan.confidence_breakdown.percent}%
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${
                      confDelta > 0
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                        : confDelta < 0
                          ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                          : 'bg-slate-800 border border-slate-700 text-slate-400'
                    }`}
                  >
                    {confDelta > 0 ? '↑ +' : confDelta < 0 ? '↓ ' : ''}
                    {confDelta === 0 ? 'flat' : `${Math.abs(confDelta)}%`}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div>
                    <div className="text-[10px] text-slate-500">Data mode after publish</div>
                    <div className="font-bold text-white text-sm mt-0.5">
                      {previewPlan.confidence_breakdown.hasConflict
                        ? 'Conflicting'
                        : previewPlan.confidence_breakdown.staffSignalCount > 0
                          ? 'Staff verified'
                          : previewPlan.confidence_breakdown.fanSignalCount >= 3
                            ? 'Fan pulse only'
                            : 'Baseline'}
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">
                Computed by re-running <code className="text-slate-400 font-mono">deriveArrivalPlan()</code>{' '}
                with your pending signal appended. Same code path the Hub uses.
              </p>
            </div>

            {/* Publish form */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="font-bold text-white">Publish update</h3>
              <p className="text-sm text-slate-400 mt-1">
                Updates appear in fans&apos; Event Day Hub within seconds.
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

                <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Fans will see
                  </div>
                  <p className="text-xs text-slate-200 leading-snug">
                    &ldquo;{message.trim() || composedMessage}&rdquo;
                  </p>
                </div>

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
                  <div className="text-[10px] text-slate-500 text-right">
                    {message.length} / 140
                  </div>
                </details>

                <button
                  type="submit"
                  className="w-full py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold transition shadow-lg shadow-violet-600/20"
                >
                  Publish to fans
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="font-bold text-white text-sm">Operations reminders</h3>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-400 list-disc list-inside leading-relaxed">
                <li>Staff signals are weighted 3× over individual fan reports.</li>
                <li>Use &quot;Difficult&quot; only for safety issues.</li>
                <li>Verify fan-submitted signals against your own observation before acting.</li>
                <li>Decision Preview always reflects the same engine the fan Hub runs.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-semibold z-50">
          ✓ {toast}
        </div>
      )}
    </div>
  )
}
