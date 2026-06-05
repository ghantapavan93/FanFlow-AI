'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { deriveArrivalPlan, demoEvent, demoTicket, demoVenue } from '@/lib/seed'
import { getAllSignals, loadReadiness, subscribeToFanflowChanges } from '@/lib/store'
import type { LiveSignal, ReadinessPrefs, SupportType } from '@/lib/types'
import { computeEventIntelligence } from '@/lib/intelligence'
import { HelpSheet } from '@/components/shared/HelpSheet'

type ExplainResponse = {
  explanation: string
  source: 'template' | 'groq' | 'gemini'
  generatedAt: string
  latencyMs?: number
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

export default function ArrivalGuidePage() {
  const params = useParams<{ id: string }>()
  const eventId = params?.id ?? 'wc2026-final'

  const [prefs, setPrefs] = useState<ReadinessPrefs | null>(null)
  const [signals, setSignals] = useState<LiveSignal[]>([])
  const [explanation, setExplanation] = useState<ExplainResponse | null>(null)
  const [explainLoading, setExplainLoading] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [scoreOpen, setScoreOpen] = useState(false)
  const lastReqKey = useRef<string>('')

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

  const gateSignals = signals
    .filter((s) => s.gate_id === plan.recommended_gate.id)
    .slice(0, 3)

  useEffect(() => {
    const recentStaff = signals
      .filter(
        (s) =>
          s.source === 'staff' &&
          s.gate_id === plan.recommended_gate.id &&
          Date.now() - new Date(s.created_at).getTime() < 30 * 60 * 1000,
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

    const recentFanCount = signals.filter(
      (s) =>
        s.source === 'fan' &&
        s.gate_id === plan.recommended_gate.id &&
        Date.now() - new Date(s.created_at).getTime() < 30 * 60 * 1000,
    ).length

    const body = {
      plan: {
        recommended_gate: {
          id: plan.recommended_gate.id,
          name: plan.recommended_gate.name,
          typical_wait_minutes: plan.recommended_gate.typical_wait_minutes,
          accessibility: plan.recommended_gate.accessibility,
          family_friendly: plan.recommended_gate.family_friendly,
          sections: plan.recommended_gate.sections,
        },
        leave_by_time: plan.leave_by_time,
        arrival_time: plan.arrival_time,
        route_summary: plan.route_summary,
        confidence: plan.confidence,
        confidence_reason: plan.confidence_reason,
        support_points: plan.support_points.map((sp) => ({
          id: sp.id,
          type: sp.type,
          name: sp.name,
        })),
      },
      user: {
        transport: prefs?.transport ?? null,
        group: prefs?.group ?? null,
        needs: prefs?.needs ?? [],
        section: demoTicket.section,
      },
      event: {
        name: demoEvent.name,
        venue: demoVenue.name,
      },
      conditions: {
        recent_staff_sentiment: recentStaff?.sentiment ?? null,
        recent_fan_signal_count: recentFanCount,
      },
    }

    const key = JSON.stringify(body)
    if (key === lastReqKey.current) return

    setExplainLoading(true)
    let cancelled = false
    fetch('/api/explain-arrival-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: key,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: ExplainResponse | null) => {
        if (cancelled) return
        if (!json) return
        // Only cache the key on a successful response. This means a transient
        // failure does NOT freeze the UI on the Template fallback — the next
        // refresh (or the same inputs re-rendering) will retry.
        lastReqKey.current = key
        setExplanation(json)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setExplainLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [plan, prefs, signals])

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-100/60 via-violet-50/20 to-white pb-24 page-enter">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="container-mobile px-4 h-14 flex items-center justify-between">
          <Link
            href={`/event/${eventId}/hub`}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← Hub
          </Link>
          <div className="flex items-center gap-1">
            <span className="font-bold text-slate-900 text-sm">Arrival Guide</span>
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

      <div className="container-mobile px-4 py-5 sm:py-6 space-y-5 sm:space-y-6 safe-bottom">
        {/* Cinematic recommendation hero — the headline decision up top */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="surface-night relative overflow-hidden rounded-3xl p-5 text-white shadow-[0_10px_30px_-12px_rgba(76,29,149,0.55)]"
        >
          <motion.div
            aria-hidden="true"
            className="absolute -top-12 -right-10 w-44 h-44 rounded-full bg-violet-500/20 blur-3xl"
            animate={{ x: [0, 16, 0], y: [0, 12, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-200">
              Your arrival recommendation
            </div>
            <div className="font-extrabold text-2xl leading-tight mt-1">
              Enter via {plan.recommended_gate.name.replace(/\s*\(.*\)\s*$/, '')}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="glass inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold">
                🕐 Leave {plan.leave_by_time}
              </span>
              <span className="glass inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold">
                🎯 Arrive {plan.arrival_time}
              </span>
              <span className="glass inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold">
                ⏱ ~{plan.recommended_gate.typical_wait_minutes} min wait
              </span>
            </div>
            <p className="text-[11px] text-violet-200/70 mt-3 leading-relaxed">
              Rules picked this plan. The AI explanation below puts it in plain words.
            </p>
          </div>
        </motion.section>

        {/* Timeline — refined with icons + staggered reveal */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="font-bold text-slate-900 mb-5 sm:mb-6 text-lg">Your journey timeline</h2>

          <div className="space-y-6">
            {(() => {
              const steps = [
                {
                  icon: '🏠',
                  title: 'Leave Home',
                  primary: plan.leave_by_time,
                  primarySize: 'text-2xl font-bold text-violet-600',
                  body: 'Depart with tickets and ID',
                  iconBg: 'bg-violet-600',
                  connectorColor: 'bg-violet-200',
                  showConnector: true,
                  destination: false,
                },
                {
                  icon: '🚆',
                  title: 'Transit to Venue',
                  primary: null as string | null,
                  primarySize: '',
                  body: plan.route_summary,
                  iconBg: 'bg-violet-600',
                  connectorColor: 'bg-violet-200',
                  showConnector: true,
                  destination: false,
                },
                {
                  icon: '🎯',
                  title: 'Arrive at Gate',
                  primary: plan.arrival_time,
                  primarySize: 'text-2xl font-bold text-emerald-600',
                  body: plan.recommended_gate.name,
                  iconBg: 'bg-emerald-600',
                  connectorColor: 'bg-emerald-200',
                  showConnector: true,
                  destination: true,
                },
                {
                  icon: '🎉',
                  title: 'Enjoy the Event!',
                  primary: null as string | null,
                  primarySize: '',
                  body: `Section ${demoTicket.section}, Row ${demoTicket.row}, Seat ${demoTicket.seat}`,
                  iconBg: 'bg-amber-500',
                  connectorColor: '',
                  showConnector: false,
                  destination: false,
                },
              ]
              return steps.map((s, i) => (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.45,
                    delay: 0.1 + i * 0.1,
                    ease: 'easeOut',
                  }}
                  className="flex gap-4"
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={`relative w-12 h-12 rounded-full ${s.iconBg} text-white flex items-center justify-center text-xl shadow-sm`}
                    >
                      {s.icon}
                      {s.destination && (
                        <span className="absolute inset-0 rounded-full border-2 border-emerald-500/60 animate-pulse pointer-events-none" />
                      )}
                    </div>
                    {s.showConnector && (
                      <div className={`w-0.5 h-12 ${s.connectorColor} my-2 rounded-full`} />
                    )}
                  </div>
                  <div className="flex-1 py-1">
                    <div className="font-bold text-slate-900">{s.title}</div>
                    {s.primary && <div className={s.primarySize}>{s.primary}</div>}
                    <p className="text-sm text-slate-600 mt-1.5">{s.body}</p>
                  </div>
                </motion.div>
              ))
            })()}
          </div>
        </div>

        {/* Why this recommendation — hero-treatment.
            This is the centerpiece of the "rules decide, AI explains" thesis,
            so it gets the visual weight to match. */}
        <div
          className={`relative rounded-2xl overflow-hidden ${
            explanation?.source && explanation.source !== 'template'
              ? 'border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-white'
              : 'border border-slate-200 bg-white'
          }`}
        >
          {/* Top accent strip */}
          <div
            className={`absolute inset-x-0 top-0 h-1 ${
              explanation?.source && explanation.source !== 'template'
                ? 'bg-gradient-to-r from-violet-500 via-violet-600 to-violet-500'
                : 'bg-slate-200'
            }`}
          />
          <div className="p-5 sm:p-6 pt-6 sm:pt-7">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 ${
                    explanation?.source && explanation.source !== 'template'
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  💡
                </span>
                <div>
                  <div className="kicker">
                    {explanation?.source && explanation.source !== 'template'
                      ? 'Rules decided · AI explained'
                      : 'Rules decided'}
                  </div>
                  <h3 className="font-bold text-slate-900 text-base sm:text-lg leading-tight">
                    Why this recommendation?
                  </h3>
                </div>
              </div>
              {explanation && (
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full cursor-help flex-shrink-0 ${
                    explanation.source === 'template'
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-violet-100 text-violet-700'
                  }`}
                  title={
                    explanation.source === 'template'
                      ? 'Template = deterministic explanation, always available.'
                      : `AI = rewritten by ${explanation.source} and sanitized before display. Facts (gate, times, support) unchanged.${
                          explanation.latencyMs ? ` Latency: ${explanation.latencyMs}ms.` : ''
                        }`
                  }
                >
                  {explanation.source === 'template'
                    ? 'Template'
                    : `AI · ${explanation.source}`}
                </span>
              )}
            </div>

            {explainLoading && !explanation ? (
              <div className="space-y-2 mt-4">
                <div className="h-3 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 bg-slate-200 rounded animate-pulse w-5/6" />
                <div className="h-3 bg-slate-200 rounded animate-pulse w-4/6" />
              </div>
            ) : (
              <p className="text-slate-800 text-[15px] sm:text-base leading-relaxed mt-2">
                {explanation?.explanation ?? plan.explanation_text}
              </p>
            )}

            <div className="mt-4 flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 text-slate-600">
                <span
                  className={`dot ${
                    plan.confidence === 'high'
                      ? 'bg-emerald-500'
                      : plan.confidence === 'medium'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                />
                <span className="font-semibold">
                  {plan.confidence.charAt(0).toUpperCase() + plan.confidence.slice(1)} confidence
                </span>
                <span className="text-slate-400 hidden sm:inline">
                  · {plan.confidence_reason}
                </span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-3 leading-relaxed border-t border-slate-100 pt-3">
              Rules pick the gate, times, support points, and confidence. AI only
              rewords this explanation — it cannot change facts.
            </p>
          </div>
        </div>

        {/* "Signals used in this plan" — shows the real inputs the rule
            engine consumed. Proves the backend uses signals, not static copy. */}
        {(() => {
          const intel = computeEventIntelligence(plan, signals)
          const items: { label: string; value: string; emoji: string }[] = []
          items.push({
            emoji: '🎟️',
            label: 'Ticket section',
            value: `Section ${demoTicket.section} · Row ${demoTicket.row}`,
          })
          if (prefs) {
            items.push({
              emoji: '👥',
              label: 'Group + needs',
              value: `${prefs.group.replace(/_/g, ' ')}${
                prefs.needs.length && !prefs.needs.includes('none')
                  ? ` · ${prefs.needs.join(', ')}`
                  : ''
              }`,
            })
          }
          items.push({
            emoji: '🚦',
            label: 'Expected entry load',
            value:
              intel.expectedEntryLoad === 'unknown'
                ? 'Awaiting signals'
                : intel.expectedEntryLoad.charAt(0).toUpperCase() +
                  intel.expectedEntryLoad.slice(1),
          })
          if (intel.latestStaffAtGate) {
            items.push({
              emoji: '👮',
              label: 'Latest staff signal at your gate',
              value: `"${intel.latestStaffAtGate.message}"`,
            })
          }
          if (intel.fanPulse.total > 0) {
            items.push({
              emoji: '🙋',
              label: 'Fan pulse near gate',
              value: `${intel.fanPulse.smoothPct}% smooth · ${intel.fanPulse.total} report${
                intel.fanPulse.total === 1 ? '' : 's'
              }`,
            })
          }
          items.push({
            emoji: '⏱',
            label: 'Typical gate wait',
            value: `~${plan.recommended_gate.typical_wait_minutes} min`,
          })

          return (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="kicker">Signals used in this plan</h3>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-700">
                  {intel.confidencePct}% confidence
                </span>
              </div>
              <ul className="space-y-2">
                {items.map((it) => (
                  <li
                    key={it.label}
                    className="flex items-start gap-2.5 text-sm py-1"
                  >
                    <span className="w-7 h-7 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-sm flex-shrink-0">
                      {it.emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        {it.label}
                      </div>
                      <div className="text-slate-800 leading-snug capitalize">
                        {it.value}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-slate-500 mt-3 leading-relaxed border-t border-slate-100 pt-3">
                Staff signals weighted 3× over fan reports. Based on current
                information.
              </p>
            </div>
          )
        })()}

        {/* Score Breakdown — collapsible details panel */}
        {plan.gate_scores && plan.gate_scores.length > 0 && (
          <details
            open={scoreOpen}
            onToggle={(e) => setScoreOpen((e.target as HTMLDetailsElement).open)}
            className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
          >
            <summary className="list-none cursor-pointer p-5 sm:p-6 flex items-center justify-between hover:bg-slate-50 transition">
              <div>
                <h3 className="font-bold text-slate-900">Why this gate?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  See the deterministic score for each gate.
                </p>
              </div>
              <span className="text-slate-400 text-lg">{scoreOpen ? '−' : '+'}</span>
            </summary>
            <div className="border-t border-slate-200 p-5 sm:p-6 space-y-4 bg-slate-50/50">
              {plan.gate_scores.map((g) => {
                const c = g.components
                const fmt = (n: number) =>
                  (n > 0 ? '+' : '') + (Number.isInteger(n) ? n.toString() : n.toFixed(1))
                const rows: { label: string; value: number }[] = [
                  { label: 'Section proximity', value: c.section_proximity },
                  { label: 'Accessibility match', value: c.accessibility_match },
                  { label: 'Family-friendly match', value: c.family_match },
                  { label: 'Sensory-sensitive match', value: c.sensory_match },
                  { label: 'Typical wait penalty', value: c.wait_penalty },
                  { label: 'Staff signals (×3)', value: c.staff_signal },
                  { label: 'Fan signals (×1)', value: c.fan_signal },
                ]
                return (
                  <div
                    key={g.gate_id}
                    className={`rounded-xl border bg-white p-4 ${
                      g.is_recommended ? 'border-violet-300' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm">
                          {g.gate_name}
                        </span>
                        {g.is_recommended && (
                          <span className="text-[10px] font-bold uppercase tracking-wide bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                            ✨ Picked
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-sm font-bold text-slate-900">
                        {fmt(g.total)}
                      </div>
                    </div>
                    <dl className="space-y-1 text-xs">
                      {rows.map((row) => (
                        <div
                          key={row.label}
                          className="flex justify-between items-center py-0.5"
                        >
                          <dt className="text-slate-600">{row.label}</dt>
                          <dd
                            className={`font-mono ${
                              row.value > 0
                                ? 'text-emerald-700'
                                : row.value < 0
                                ? 'text-rose-700'
                                : 'text-slate-400'
                            }`}
                          >
                            {fmt(row.value)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )
              })}
              <p className="text-[11px] text-slate-500 px-1 leading-relaxed">
                The deterministic rule engine computes these scores from your readiness
                preferences and recent live signals. Staff signals are weighted 3× over fan
                signals.
              </p>
            </div>
          </details>
        )}

        {/* Route Details */}
        <div className="card-base p-5 sm:p-6">
          <h3 className="kicker mb-4">Route details</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="text-slate-600">Recommended Gate</span>
              <span className="font-bold text-slate-900">{plan.recommended_gate.name}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="text-slate-600">Your Section</span>
              <span className="font-bold text-slate-900">{demoTicket.section}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-600">Typical Wait Time</span>
              <span className="font-bold text-emerald-600">
                ~{plan.recommended_gate.typical_wait_minutes} min
              </span>
            </div>
          </div>
        </div>

        {/* Conditions */}
        <div className="card-base p-5 sm:p-6">
          <h3 className="kicker mb-4">Conditions at your gate</h3>
          {gateSignals.length === 0 ? (
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="font-semibold text-emerald-900">🟢 Smooth Entry Expected</div>
              <div className="text-sm text-emerald-700 mt-1">
                No live reports yet — based on typical conditions
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {gateSignals.map((s) => {
                const color =
                  s.sentiment === 'smooth'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : s.sentiment === 'moderate'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                const emoji =
                  s.sentiment === 'smooth' ? '🟢' : s.sentiment === 'moderate' ? '🟡' : '🔴'
                return (
                  <div key={s.id} className={`p-3 rounded-lg border ${color}`}>
                    <div className="font-semibold">
                      {emoji} {s.message}
                    </div>
                    <div className="text-xs opacity-80 mt-1">
                      {s.source === 'staff' ? '👮 Staff report' : '🙋 Fan report'}
                    </div>
                  </div>
                )
              })}
            </div>
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
              Open venue map →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {plan.support_points.map((sp) => (
              <Link
                key={sp.id}
                href={`/event/${eventId}/venue-map`}
                className="flex flex-col gap-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-violet-200 hover:bg-violet-50/40 active:bg-violet-50 transition"
              >
                <span
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-lg shadow-sm"
                  style={{ background: SUPPORT_TONE[sp.type] ?? '#7c3aed' }}
                  aria-hidden="true"
                >
                  {SUPPORT_EMOJI[sp.type] ?? '📍'}
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-slate-900 leading-tight truncate">{sp.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {sp.walk_time_minutes ? `~${sp.walk_time_minutes} min walk` : sp.description}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <button
          onClick={() => setHelpOpen(true)}
          className="btn-primary w-full !min-h-[56px]"
        >
          Need help getting to the venue?
        </button>

        <div className="text-xs text-slate-500 text-center pb-4">
          <p>This guidance is based on typical conditions and publicly available data.</p>
          <p className="mt-1">Always follow official venue signage and staff instructions on the day.</p>
        </div>
      </div>

      <HelpSheet
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        plan={plan}
        eventId={eventId}
      />

      {/* Bottom tab nav — matches Hub. Guide is the active tab. */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="container-mobile h-16 grid grid-cols-4 px-2">
          <div className="flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-semibold text-violet-700">
            <span className="flex items-center justify-center w-9 h-9 rounded-full text-xl bg-violet-100">✦</span>
            Guide
          </div>
          <Link
            href={`/event/${eventId}/venue-map`}
            className="flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-semibold text-slate-500 hover:text-slate-700"
          >
            <span className="flex items-center justify-center w-9 h-9 rounded-full text-xl">🗺️</span>
            Map
          </Link>
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
  )
}
