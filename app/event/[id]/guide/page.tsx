'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { deriveArrivalPlan, demoEvent, demoTicket, demoVenue } from '@/lib/seed'
import { getAllSignals, loadReadiness, subscribeToFanflowChanges } from '@/lib/store'
import type { LiveSignal, ReadinessPrefs } from '@/lib/types'
import { HelpSheet } from '@/components/shared/HelpSheet'

type ExplainResponse = {
  explanation: string
  source: 'template' | 'groq' | 'gemini'
  generatedAt: string
  latencyMs?: number
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
    <div className="min-h-screen page-bg page-enter">
      <div className="page-header px-4 h-14 flex items-center justify-between">
        <h1 className="font-bold text-slate-900">Arrival Guide</h1>
        <Link
          href={`/event/${eventId}/hub`}
          className="btn-ghost !min-h-[40px] text-sm text-violet-700"
        >
          ← Hub
        </Link>
      </div>

      <div className="container-mobile px-4 py-5 sm:py-6 space-y-5 sm:space-y-6 safe-bottom">
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

        {/* Explanation */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900">Why this recommendation?</h3>
            {explanation && (
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full cursor-help ${
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
            <div className="space-y-2">
              <div className="h-3 bg-slate-200 rounded animate-pulse" />
              <div className="h-3 bg-slate-200 rounded animate-pulse w-5/6" />
              <div className="h-3 bg-slate-200 rounded animate-pulse w-4/6" />
            </div>
          ) : (
            <p className="text-slate-700 text-sm leading-relaxed">
              {explanation?.explanation ?? plan.explanation_text}
            </p>
          )}
          <div className="mt-4 text-xs text-slate-500 p-3 bg-white rounded border border-slate-200">
            Confidence:{' '}
            <span
              className={
                plan.confidence === 'high'
                  ? 'font-bold text-emerald-600'
                  : plan.confidence === 'medium'
                  ? 'font-bold text-amber-600'
                  : 'font-bold text-rose-600'
              }
            >
              {plan.confidence.toUpperCase()}
            </span>{' '}
            — {plan.confidence_reason}
          </div>
          <p className="text-[11px] text-slate-500 mt-2 px-1">
            Rules pick the gate and times. AI only rewords the explanation — it cannot change facts.
          </p>
        </div>

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
          <div className="space-y-2">
            {plan.support_points.map((sp) => (
              <div key={sp.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="font-semibold text-slate-900">{sp.name}</div>
                <div className="text-sm text-slate-600 mt-1">{sp.description}</div>
                {sp.walk_time_minutes && (
                  <div className="text-xs text-slate-500 mt-2">
                    ~{sp.walk_time_minutes} min walk
                  </div>
                )}
              </div>
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
    </div>
  )
}
