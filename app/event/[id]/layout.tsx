'use client'

import type { ReactNode } from 'react'

/* ──────────────────────────────────────────────────────────────────────────────
   Desktop proof rails — visible only on xl (1280 px+).

   Center column: the existing phone-companion experience (Hub / Map / Pulse).
   Left rail:  "How it works" — 4-step numbered process + live indicators.
   Right rail: "Architecture" proof + data model specs.

   Rules:
   - pointer-events-none on the aside containers so scroll/click passes through
     to the page underneath. pointer-events-auto on individual cards.
   - No layout shift: child pages are untouched — rails float in the gutters.
   - Reduced-motion: pure CSS, no JS animation dependency.
   ────────────────────────────────────────────────────────────────────────── */

/* ── Step data ─────────────────────────────────────────────────────────────── */

const STEPS = [
  {
    num: 1,
    title: 'Rules select the plan',
    desc: 'Gate, timing & route derived from ticket + preferences — no ML black box.',
  },
  {
    num: 2,
    title: 'Staff signals weighted 3×',
    desc: 'Venue staff updates carry triple trust weight vs fan reports.',
  },
  {
    num: 3,
    title: 'Fan reports filtered',
    desc: '≥3 similar reports = majority signal. Fewer stay informational only.',
  },
  {
    num: 4,
    title: 'AI explains only',
    desc: 'LLM writes the copy — never decides the plan. Deterministic first.',
  },
] as const

const LIVE_ITEMS = [
  { label: 'Arrival plan', dot: 'bg-emerald-500' },
  { label: 'Gate scoring', dot: 'bg-emerald-500' },
  { label: 'Fan Pulse', dot: 'bg-emerald-500' },
] as const

/* ── Architecture proof data ───────────────────────────────────────────────── */

const ARCH_ITEMS = [
  { icon: '⚙️', label: 'Rules decide', value: 'Deterministic engine' },
  { icon: '✨', label: 'AI explains', value: 'Groq → Gemini → Template' },
  { icon: '📡', label: 'Fan pulse', value: '≥3 = majority threshold' },
  { icon: '🛡️', label: 'Staff trust', value: '3× weight per signal' },
  { icon: '🔄', label: 'Cross-tab sync', value: 'Native storage events' },
] as const

const DATA_MODEL = [
  { key: 'Confidence', value: '[25, 95] %' },
  { key: 'Modes', value: '3 operating tiers' },
  { key: 'Gates', value: 'Scored on 4 factors' },
  { key: 'Signals', value: '≤30 min TTL' },
] as const

/* ── Shared card styles ────────────────────────────────────────────────────── */

const railCard =
  'pointer-events-auto rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-sm shadow-sm p-4'

/* ── Layout component ──────────────────────────────────────────────────────── */

export default function EventLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      {/* ── Left rail ─────────────────────────────────────────────────── */}
      <aside
        className="pointer-events-none fixed left-0 top-0 bottom-0 z-30 hidden xl:flex flex-col justify-center px-5 2xl:px-8"
        style={{ width: 'calc((100vw - 28rem) / 2)' }}
        aria-hidden="true"
      >
        <div className="flex flex-col gap-5 max-w-[280px] ml-auto">
          {/* How it works */}
          <div className={railCard}>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400 mb-3">
              How it works
            </h3>
            <ol className="space-y-3">
              {STEPS.map((s) => (
                <li key={s.num} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-600 text-white text-[11px] font-bold flex items-center justify-center mt-0.5">
                    {s.num}
                  </span>
                  <div>
                    <div className="text-[13px] font-semibold text-slate-900 leading-snug">
                      {s.title}
                    </div>
                    <div className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      {s.desc}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Live now */}
          <div className={railCard}>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400 mb-2.5">
              Live now
            </h3>
            <ul className="space-y-2">
              {LIVE_ITEMS.map((item) => (
                <li key={item.label} className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span
                      className={`absolute inline-flex h-full w-full rounded-full ${item.dot} opacity-75 animate-ping`}
                    />
                    <span
                      className={`relative inline-flex h-2 w-2 rounded-full ${item.dot}`}
                    />
                  </span>
                  <span className="text-[12px] font-medium text-slate-700">
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      {/* ── Center: existing page ─────────────────────────────────────── */}
      {children}

      {/* ── Right rail ────────────────────────────────────────────────── */}
      <aside
        className="pointer-events-none fixed right-0 top-0 bottom-0 z-30 hidden xl:flex flex-col justify-center px-5 2xl:px-8"
        style={{ width: 'calc((100vw - 28rem) / 2)' }}
        aria-hidden="true"
      >
        <div className="flex flex-col gap-5 max-w-[280px] mr-auto">
          {/* Architecture */}
          <div className={railCard}>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400 mb-3">
              Architecture
            </h3>
            <ul className="space-y-2.5">
              {ARCH_ITEMS.map((a) => (
                <li key={a.label} className="flex items-start gap-2.5">
                  <span className="text-sm mt-0.5 flex-shrink-0">{a.icon}</span>
                  <div>
                    <div className="text-[12px] font-semibold text-slate-900 leading-snug">
                      {a.label}
                    </div>
                    <div className="text-[11px] text-slate-500 leading-relaxed">
                      {a.value}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Data model */}
          <div className={railCard}>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400 mb-2.5">
              Data model
            </h3>
            <dl className="space-y-1.5">
              {DATA_MODEL.map((d) => (
                <div key={d.key} className="flex items-baseline justify-between">
                  <dt className="text-[12px] font-medium text-slate-700">
                    {d.key}
                  </dt>
                  <dd className="text-[11px] font-semibold text-violet-600 tabular-nums">
                    {d.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </aside>
    </div>
  )
}
