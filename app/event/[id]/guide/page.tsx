'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { deriveArrivalPlan, demoEvent, demoTicket, demoVenue } from '@/lib/seed'
import { getAllSignals, loadReadiness } from '@/lib/store'
import type { LiveSignal, ReadinessPrefs } from '@/lib/types'
import { HelpSheet } from '@/components/shared/HelpSheet'

type ExplainResponse = {
  explanation: string
  source: 'template' | 'groq' | 'gemini'
  generatedAt: string
}

export default function ArrivalGuidePage() {
  const params = useParams<{ id: string }>()
  const eventId = params?.id ?? 'wc2026-final'

  const [prefs, setPrefs] = useState<ReadinessPrefs | null>(null)
  const [signals, setSignals] = useState<LiveSignal[]>([])
  const [explanation, setExplanation] = useState<ExplainResponse | null>(null)
  const [explainLoading, setExplainLoading] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const lastReqKey = useRef<string>('')

  useEffect(() => {
    const refresh = () => {
      setPrefs(loadReadiness())
      setSignals(getAllSignals())
    }
    refresh()
    window.addEventListener('fanflow:readiness', refresh)
    window.addEventListener('fanflow:signals', refresh)
    return () => {
      window.removeEventListener('fanflow:readiness', refresh)
      window.removeEventListener('fanflow:signals', refresh)
    }
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
    lastReqKey.current = key

    setExplainLoading(true)
    let cancelled = false
    fetch('/api/explain-arrival-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: key,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: ExplainResponse | null) => {
        if (cancelled || !json) return
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
    <div className="min-h-screen page-bg">
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
        {/* Timeline */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="font-bold text-slate-900 mb-5 sm:mb-6 text-lg">Your journey timeline</h2>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-lg">
                  1
                </div>
                <div className="w-1 h-12 bg-violet-200 my-2" />
              </div>
              <div className="flex-1 py-2">
                <div className="font-bold text-slate-900">Leave Home</div>
                <div className="text-2xl font-bold text-violet-600">{plan.leave_by_time}</div>
                <p className="text-sm text-slate-600 mt-2">Depart with tickets and ID</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-lg">
                  2
                </div>
                <div className="w-1 h-12 bg-violet-200 my-2" />
              </div>
              <div className="flex-1 py-2">
                <div className="font-bold text-slate-900">Transit to Venue</div>
                <div className="text-lg text-slate-700">{plan.route_summary}</div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">
                  3
                </div>
                <div className="w-1 h-12 bg-emerald-200 my-2" />
              </div>
              <div className="flex-1 py-2">
                <div className="font-bold text-slate-900">Arrive at Gate</div>
                <div className="text-2xl font-bold text-emerald-600">{plan.arrival_time}</div>
                <p className="text-sm text-slate-600 mt-2">{plan.recommended_gate.name}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-lg">
                  🎉
                </div>
              </div>
              <div className="flex-1 py-2">
                <div className="font-bold text-slate-900">Enjoy the Event!</div>
                <div className="text-sm text-slate-600">
                  Section {demoTicket.section}, Row {demoTicket.row}, Seat {demoTicket.seat}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900">Why this recommendation?</h3>
            {explanation && (
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full ${
                  explanation.source === 'template'
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-violet-100 text-violet-700'
                }`}
                title={
                  explanation.source === 'template'
                    ? 'Deterministic template — no LLM available'
                    : `Rewritten in a warmer tone by ${explanation.source.toUpperCase()}, facts unchanged`
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
