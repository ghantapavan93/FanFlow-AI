'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { SCENARIOS, type Scenario } from '@/lib/scenarios/scenarios'
import {
  clearIncidentOverrides,
  clearPublishedSignals,
  clearReadiness,
  publishSignal,
  saveReadiness,
} from '@/lib/store'

/**
 * Floating demo control bar — only renders when ?demo=true is in the URL.
 *
 * Not visible to normal fans. Lets a reviewer / recruiter / you switch
 * scenarios mid-flow without leaving the page they're on.
 *
 * Mounts in app/layout.tsx so it's available everywhere when the param is set.
 */
function DemoToolbarInner() {
  const params = useSearchParams()
  const enabled = params?.get('demo') === 'true'

  const [scenarioId, setScenarioId] = useState<string>('')
  // Start collapsed (gear icon only) so the toolbar never covers fixed page
  // footers like the Readiness Check's Continue button. User opts in to expand.
  const [collapsed, setCollapsed] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 1400)
    return () => clearTimeout(t)
  }, [toast])

  if (!enabled) return null

  const flash = (msg: string) => setToast(msg)

  const applyScenario = (s: Scenario) => {
    if (s.prefs) saveReadiness(s.prefs)
    else clearReadiness()
    clearPublishedSignals()
    for (const sig of s.signals) publishSignal(sig)
    setScenarioId(s.id)
    flash(`Applied: ${s.name.split(' — ')[0]}`)
  }

  const onScenarioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    if (!id) return
    const s = SCENARIOS.find((x) => x.id === id)
    if (s) applyScenario(s)
  }

  const resetAll = () => {
    clearReadiness()
    clearPublishedSignals()
    clearIncidentOverrides()
    setScenarioId('')
    flash('Demo state reset')
  }

  const seedStaffUpdate = () => {
    publishSignal({
      id: `staff-toolbar-${Date.now()}`,
      gate_id: 'gate-3',
      source: 'staff',
      sentiment: 'smooth',
      message: 'Family entrance clear, moving smoothly',
      created_at: new Date().toISOString(),
    })
    flash('Staff signal seeded')
  }

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-4 right-4 z-[80] bg-slate-900 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:bg-slate-800 transition"
        aria-label="Open demo toolbar"
        title="Demo controls"
      >
        ⚙
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-[80] w-[300px] sm:w-[340px] bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 overflow-hidden animate-in">
      <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-slate-800 bg-slate-950/50">
        <div className="flex items-center gap-2">
          <span className="dot bg-violet-500" />
          <span className="font-bold text-sm">Demo controls</span>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded-full">
            ?demo=true
          </span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          aria-label="Collapse"
          className="text-slate-400 hover:text-white text-lg leading-none w-6 h-6 flex items-center justify-center rounded hover:bg-slate-800"
        >
          −
        </button>
      </div>

      <div className="p-3.5 space-y-3">
        {/* Scenario switcher */}
        <div>
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Apply scenario
          </label>
          <select
            value={scenarioId}
            onChange={onScenarioChange}
            className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
          >
            <option value="">— pick a scenario —</option>
            {SCENARIOS.filter((s) => s.id !== 'llm-fallback').map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={resetAll}
            className="text-xs font-semibold py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition border border-slate-700"
          >
            ↻ Reset demo
          </button>
          <button
            onClick={() => {
              clearPublishedSignals()
              flash('Cleared signals')
            }}
            className="text-xs font-semibold py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition border border-slate-700"
          >
            ⌫ Clear signals
          </button>
          <button
            onClick={seedStaffUpdate}
            className="text-xs font-semibold py-2 rounded-lg bg-violet-600 hover:bg-violet-500 transition col-span-2"
          >
            + Seed staff &ldquo;smooth&rdquo; signal
          </button>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
          <Link
            href="/event/wc2026-final/hub?demo=true"
            className="text-xs font-semibold text-center py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition border border-slate-700"
          >
            Fan Hub →
          </Link>
          <Link
            href="/staff/wc2026-final?demo=true"
            className="text-xs font-semibold text-center py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition border border-slate-700"
          >
            Staff Console →
          </Link>
          <Link
            href="/debug"
            className="col-span-2 text-xs font-semibold text-center py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition border border-slate-700"
          >
            Full /debug page →
          </Link>
        </div>
      </div>

      {toast && (
        <div className="px-3.5 py-2 bg-emerald-600/90 text-white text-xs font-semibold flex items-center gap-2 border-t border-emerald-500">
          ✓ {toast}
        </div>
      )}
    </div>
  )
}

export function DemoToolbar() {
  // useSearchParams must be inside a Suspense boundary for static prerender
  return (
    <Suspense fallback={null}>
      <DemoToolbarInner />
    </Suspense>
  )
}
