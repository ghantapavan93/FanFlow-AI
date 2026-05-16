'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SCENARIOS, type Scenario } from '@/lib/scenarios/scenarios'
import {
  clearIncidentOverrides,
  clearPublishedSignals,
  clearReadiness,
  getAllSignals,
  loadIncidents,
  loadReadiness,
  publishSignal,
  saveReadiness,
} from '@/lib/store'

export default function DebugPage() {
  const [appliedId, setAppliedId] = useState<string | null>(null)
  const [counts, setCounts] = useState({ signals: 0, incidents: 0, prefs: false })
  const [toast, setToast] = useState<string | null>(null)

  const refresh = () => {
    setCounts({
      signals: getAllSignals().length,
      incidents: loadIncidents().length,
      prefs: !!loadReadiness(),
    })
  }

  useEffect(() => {
    refresh()
  }, [])

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 1600)
  }

  const applyScenario = (s: Scenario) => {
    // 1. Replace readiness prefs
    if (s.prefs) saveReadiness(s.prefs)
    else clearReadiness()

    // 2. Clear published signals, then replay the scenario's
    clearPublishedSignals()
    for (const sig of s.signals) publishSignal(sig)

    setAppliedId(s.id)
    refresh()
    flash(`Applied: ${s.name}`)
  }

  const resetAll = () => {
    clearReadiness()
    clearPublishedSignals()
    clearIncidentOverrides()
    setAppliedId(null)
    refresh()
    flash('Demo state reset')
  }

  const seedStaffUpdate = () => {
    publishSignal({
      id: `staff-debug-${Date.now()}`,
      gate_id: 'gate-3',
      source: 'staff',
      sentiment: 'smooth',
      message: 'Family entrance clear, moving smoothly',
      created_at: new Date().toISOString(),
    })
    refresh()
    flash('Seeded a staff "smooth" signal at Gate 3')
  }

  return (
    <div className="min-h-screen page-bg">
      <div className="page-header px-4 h-14 flex items-center justify-between">
        <h1 className="font-bold text-slate-900">Demo Control · /debug</h1>
        <Link href="/" className="btn-ghost !min-h-[40px] text-sm text-slate-500">
          ← Home
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Intro */}
        <div className="card-base p-5 sm:p-6">
          <div className="kicker mb-2">Internal demo tooling — not a fan feature</div>
          <h2 className="text-xl font-bold text-slate-900">
            Switch scenarios to prove the rule engine isn&apos;t hardcoded around Maria.
          </h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Each scenario rewrites the localStorage state, then you open the Fan Hub or
            Staff Console to see the rule engine respond. Pure deterministic — no API key
            required.
          </p>
        </div>

        {/* Quick actions */}
        <div className="card-base p-5 sm:p-6">
          <h3 className="kicker mb-3">Quick actions</h3>
          <div className="flex flex-wrap gap-2">
            <button onClick={resetAll} className="btn-secondary !min-h-[40px] text-sm">
              ↻ Reset all demo state
            </button>
            <button
              onClick={() => {
                clearPublishedSignals()
                refresh()
                flash('Cleared published signals')
              }}
              className="btn-secondary !min-h-[40px] text-sm"
            >
              Clear published signals
            </button>
            <button
              onClick={seedStaffUpdate}
              className="btn-secondary !min-h-[40px] text-sm"
            >
              + Seed staff &ldquo;smooth&rdquo; signal
            </button>
            <Link
              href="/event/wc2026-final/hub"
              className="btn-primary !min-h-[40px] text-sm"
            >
              Open Fan Hub →
            </Link>
            <Link
              href="/staff/wc2026-final"
              className="btn-secondary !min-h-[40px] text-sm"
            >
              Open Staff Console →
            </Link>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-xs text-slate-500">Readiness prefs</div>
              <div className="font-semibold text-slate-900 mt-0.5">
                {counts.prefs ? 'Set' : 'Not set'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Live signals</div>
              <div className="font-semibold text-slate-900 mt-0.5">{counts.signals}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Incidents</div>
              <div className="font-semibold text-slate-900 mt-0.5">{counts.incidents}</div>
            </div>
          </div>
        </div>

        {/* Scenario grid */}
        <div>
          <h3 className="kicker mb-3">Scenarios</h3>
          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
            {SCENARIOS.map((s) => {
              const isApplied = appliedId === s.id
              const isMeta = s.id === 'llm-fallback'
              return (
                <div
                  key={s.id}
                  className={`p-5 rounded-2xl border bg-white transition ${
                    isApplied ? 'border-violet-400 ring-2 ring-violet-100' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="font-bold text-slate-900 text-base leading-snug">
                      {s.name}
                    </h4>
                    {isApplied && (
                      <span className="text-[10px] font-bold uppercase tracking-wide bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                        ✨ Applied
                      </span>
                    )}
                    {isMeta && (
                      <span className="text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                        Meta
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{s.description}</p>

                  <details className="mt-3">
                    <summary className="text-xs font-semibold text-slate-700 cursor-pointer hover:text-slate-900">
                      Expected behavior ({s.expectedBehavior.length})
                    </summary>
                    <ul className="mt-2 space-y-1 text-xs text-slate-600 list-disc list-inside">
                      {s.expectedBehavior.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </details>

                  {!isMeta && (
                    <button
                      onClick={() => applyScenario(s)}
                      className="btn-primary w-full mt-4 !min-h-[42px] text-sm"
                    >
                      Apply scenario
                    </button>
                  )}
                  {isMeta && (
                    <p className="mt-4 text-xs text-slate-500 italic">
                      Endpoint behavior — verified in{' '}
                      <code className="bg-slate-100 px-1.5 py-0.5 rounded">
                        tests/explanation.test.ts
                      </code>
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer note */}
        <div className="text-xs text-slate-500 text-center py-4 border-t border-slate-200">
          <p>
            This page is for demo control only. It is not part of the fan-facing journey.
          </p>
          <p className="mt-1">
            All actions are local to your browser — no data leaves the device.
          </p>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-full shadow-lg text-sm font-semibold animate-in">
          ✓ {toast}
        </div>
      )}
    </div>
  )
}
