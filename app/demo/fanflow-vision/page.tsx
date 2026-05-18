'use client'

/**
 * FanFlow Vision — single-route cinematic walkthrough.
 *
 * This route is intentionally front-end only and exists alongside the
 * real working product. URL never changes; an internal state machine
 * advances through six stages, each with its own panel:
 *
 *   discovery → listing → seatmap → confirmed → building → preview
 *
 * It does NOT call the real rule engine, the AI endpoint, or any real
 * marketplace API. All values are pre-computed demo constants that
 * happen to mirror what the deterministic engine produces for the
 * Maria-MetLife scenario. The final CTA routes to the actual working
 * Hub at /event/wc2026-final/hub.
 *
 * Safe-copy contract:
 * - "Guidance based on your ticket, group, venue context, and live signals"
 * - "Expected entry load" / "Recommended arrival window"
 * - "Always follow venue signage and staff instructions"
 * - Never: guaranteed, safe route, no wait, exact crowd prediction
 *
 * Rules-decide / AI-explains stays explicit on the building stage —
 * the LLM is shown ONLY wording the explanation, never deciding.
 */

import { useState, useMemo, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import {
  AnimatePresence,
  animate,
  motion,
  useReducedMotion,
} from 'framer-motion'

// ─────────────────────────────────────────────────────────────────────
// Types + state machine
// ─────────────────────────────────────────────────────────────────────

type Stage =
  | 'discovery'
  | 'listing'
  | 'seatmap'
  | 'confirmed'
  | 'building'
  | 'preview'

const STAGE_ORDER: Stage[] = [
  'discovery',
  'listing',
  'seatmap',
  'confirmed',
  'building',
  'preview',
]

const STAGE_LABELS: Record<Stage, string> = {
  discovery: 'Discovery',
  listing: 'World Cup listing',
  seatmap: 'Seat selection',
  confirmed: 'Ticket confirmed',
  building: 'Building plan',
  preview: 'Event Day Hub',
}

// ─────────────────────────────────────────────────────────────────────
// Static data — never fetched, never mutated
// ─────────────────────────────────────────────────────────────────────

const CATEGORIES = ['Sports', 'Concerts', 'Theater', 'Festivals', 'Top Cities']
const NAV_RIGHT = ['Explore', 'Sell', 'Favorites', 'My Tickets']

const HERO_EVENTS = [
  {
    id: 'nba',
    title: 'NBA Playoffs',
    sub: 'May 17 – Jun 19',
    bg: 'from-slate-900 to-slate-800',
    brand: 'Playoffs',
    fanflow: false,
  },
  {
    id: 'nfl',
    title: 'NFL',
    sub: 'Season',
    bg: 'from-amber-700 via-amber-800 to-stone-900',
    brand: 'NFL',
    fanflow: false,
  },
  {
    id: 'wc',
    title: 'World Cup',
    sub: 'Jun 11 – Jul 19',
    bg: 'from-violet-600 via-violet-700 to-indigo-800',
    brand: 'WORLD\nCUP',
    fanflow: true,
  },
  {
    id: 'bts',
    title: 'BTS',
    sub: 'May 17 – Oct 31',
    bg: 'from-rose-500 via-pink-600 to-fuchsia-700',
    brand: 'BTS',
    fanflow: false,
  },
]

const SECONDARY_ROWS = [
  { kicker: 'Last minute deals', items: ['Coldplay tonight', 'Knicks vs Celtics', 'Hamilton Sun'] },
  { kicker: 'Trending near you', items: ['World Cup Final', 'NBA Finals Game 5', 'Taylor Swift'] },
  { kicker: 'Recommended for you', items: ['Dallas Cowboys', 'Texas Rangers', 'Sooners FB'] },
]

const MATCHES = [
  {
    id: 'final',
    teamA: '🏆 Champion',
    teamB: '🏆 Champion',
    date: 'Sat · Jul 19',
    time: '7:00 PM',
    venue: 'MetLife Stadium · East Rutherford, NJ',
    matchNo: 'Match 104 · Final',
    status: { label: 'Only 3% tickets left', tone: 'urgent' as const },
    fanflow: true,
    isMaria: true,
  },
  {
    id: 'm22',
    teamA: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 England',
    teamB: '🇭🇷 Croatia',
    date: 'Wed · Jun 17',
    time: '3:00 PM',
    venue: 'AT&T Stadium · Arlington, TX',
    matchNo: 'Match 22 · Group L',
    status: { label: 'Selling fast', tone: 'warm' as const },
    fanflow: true,
    isMaria: false,
  },
  {
    id: 'm43',
    teamA: '🇦🇷 Argentina',
    teamB: '🇦🇹 Austria',
    date: 'Mon · Jun 22',
    time: '12:00 PM',
    venue: 'AT&T Stadium · Arlington, TX',
    matchNo: 'Match 43 · Group J',
    status: { label: 'Selling fast', tone: 'warm' as const },
    fanflow: true,
    isMaria: false,
  },
]

// Maria's pre-computed plan — mirrors what deriveArrivalPlan returns
// for Section 117 + family + transit. Used purely for the cinematic.
const MARIA_PLAN = {
  section: '117',
  row: '12',
  qty: 3,
  gate: 'Gate 3',
  gateFull: 'Gate 3 (Budweiser Plaza)',
  leaveBy: '12:45 AM',
  arriveBy: '01:50 AM',
  confidence: 84,
  peakWindow: '5:20 PM – 6:10 PM',
  expectedLoad: 'Moderate',
  fanPulse: { smooth: 72, slow: 18, needHelp: 10 },
  gateScores: [
    { id: 'gate-3', name: 'Gate 3', score: 18.4 },
    { id: 'gate-7', name: 'Gate 7', score: 11.2 },
    { id: 'gate-1', name: 'Gate 1', score: 6.8 },
  ],
}

const SUPPORT_MODULES = [
  { id: 'family', icon: '👶', label: 'Family Services', tone: 'bg-violet-600' },
  { id: 'first_aid', icon: '➕', label: 'First Aid', tone: 'bg-rose-600' },
  { id: 'quiet', icon: '🧩', label: 'Quiet Space', tone: 'bg-emerald-600' },
  { id: 'accessibility', icon: '♿', label: 'Accessibility', tone: 'bg-sky-600' },
  { id: 'restroom', icon: '🚻', label: 'Family Restroom', tone: 'bg-slate-600' },
]

const UNLOCK_MODULES = [
  { id: 'plan', icon: '🧭', title: 'Arrival Plan', sub: 'Best gate · leave-by · route' },
  { id: 'map', icon: '🗺️', title: 'Venue Map', sub: 'Support resources nearby' },
  { id: 'support', icon: '🤝', title: 'Support Resources', sub: 'Family · accessibility · quiet' },
  { id: 'signals', icon: '📡', title: 'Live Signals', sub: 'Staff weighted 3× over fan reports' },
]

const BUILDING_STEPS = [
  { n: 1, title: 'Reading your ticket', body: `Section ${MARIA_PLAN.section} · Row ${MARIA_PLAN.row} · ${MARIA_PLAN.qty} tickets together` },
  { n: 2, title: 'Mapping MetLife Stadium', body: '3 gates · 6 support points · family services nearby' },
  { n: 3, title: 'Applying group context', body: 'Family route · calmer entry · NJ Transit buffer' },
  { n: 4, title: 'Scoring gate candidates', body: '' }, // rendered specially
  { n: 5, title: 'Selecting arrival plan', body: `${MARIA_PLAN.gate} · leave by ${MARIA_PLAN.leaveBy} · arrive by ${MARIA_PLAN.arriveBy}` },
  { n: 6, title: 'AI wording the explanation', body: 'Rules picked the plan. AI only explains it.' },
]

// ─────────────────────────────────────────────────────────────────────
// Tiny reusable bits
// ─────────────────────────────────────────────────────────────────────

function Shimmer() {
  return (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent"
      initial={{ x: '-100%', opacity: 0 }}
      animate={{ x: '400%', opacity: [0, 1, 0] }}
      transition={{ duration: 1.1, ease: 'easeOut' }}
    />
  )
}

function FanflowBadge({ subtle = false }: { subtle?: boolean }) {
  return (
    <span
      className={`relative inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
        subtle
          ? 'bg-white/95 border-violet-200 text-violet-700'
          : 'bg-gradient-to-r from-violet-50 to-fuchsia-50 border-violet-200 text-violet-700'
      }`}
      title="Arrival guidance unlocks after checkout"
    >
      <span className="text-[9px]">✨</span>
      FanFlow AI {subtle ? 'eligible' : 'available'}
    </span>
  )
}

function CountUpNum({ value, delay = 0, decimals = 1 }: { value: number; delay?: number; decimals?: number }) {
  const reduced = useReducedMotion()
  const [v, setV] = useState(reduced ? value : 0)
  useEffect(() => {
    if (reduced) return setV(value)
    const c = animate(0, value, { duration: 0.9, delay, ease: [0.16, 1, 0.3, 1], onUpdate: setV })
    return () => c.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduced])
  return <span className="tabular-nums">{v.toFixed(decimals)}</span>
}

function CheckTick({ delay = 0 }: { delay?: number }) {
  const reduced = useReducedMotion()
  return (
    <motion.span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white flex-shrink-0"
      initial={reduced ? false : { scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.35, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12.5l5 5L20 6.5" />
      </svg>
    </motion.span>
  )
}

function NavBar() {
  return (
    <div className="border-b border-slate-100 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-violet-600 to-violet-800" />
          <span className="font-bold text-slate-900 text-sm">Marketplace</span>
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 border border-violet-100 text-[10px] font-bold uppercase tracking-wider text-violet-700">
            + FanFlow AI
          </span>
        </div>
        <div className="hidden md:flex flex-1 max-w-md items-center gap-2 px-3 h-9 rounded-full bg-slate-100 border border-slate-200 text-sm text-slate-400">
          <span>🔍</span>
          <span className="truncate">Search events, artists, teams…</span>
        </div>
        <div className="flex items-center gap-4 text-sm font-semibold text-slate-600">
          {NAV_RIGHT.map((n) => (
            <span key={n} className="hidden lg:inline">{n}</span>
          ))}
          <div className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold">M</div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Stage 1: Discovery
// ─────────────────────────────────────────────────────────────────────

function StageDiscovery({ onAdvance }: { onAdvance: () => void }) {
  const reduced = useReducedMotion()
  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Categories row */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map((c) => (
            <span key={c} className="chip">{c}</span>
          ))}
        </div>

        {/* Hero — 4 cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {HERO_EVENTS.map((ev, i) => {
            const Card = (
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                whileHover={ev.fanflow && !reduced ? { y: -3 } : undefined}
                className={`relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br ${ev.bg} flex items-center justify-center cursor-pointer`}
              >
                {ev.fanflow && (
                  <span className="absolute top-2.5 left-2.5 z-10">
                    <FanflowBadge subtle />
                  </span>
                )}
                <div className="text-white font-bold leading-[0.9] tracking-tighter whitespace-pre-line text-center text-[28px] sm:text-[44px]">
                  {ev.brand}
                </div>
                {ev.fanflow && !reduced && (
                  <motion.span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    animate={{ x: ['-100%', '400%'] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.4 }}
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2.5">
                  <div className="text-white font-bold text-sm sm:text-base leading-tight">{ev.title}</div>
                  <div className="text-white/80 text-[10px] sm:text-xs mt-0.5">{ev.sub}</div>
                </div>
              </motion.div>
            )
            return ev.fanflow ? (
              <button key={ev.id} onClick={onAdvance} className="text-left rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-400">
                {Card}
              </button>
            ) : (
              <div key={ev.id}>{Card}</div>
            )
          })}
        </div>

        {/* Three rows of secondary categories */}
        {SECONDARY_ROWS.map((row, idx) => (
          <motion.div
            key={row.kicker}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 + idx * 0.08 }}
            className="mt-10"
          >
            <div className="kicker mb-3">{row.kicker}</div>
            <div className="grid grid-cols-3 gap-3">
              {row.items.map((it) => (
                <div
                  key={it}
                  className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700 truncate"
                >
                  {it}
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Inline FanFlow promo strip */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-10 rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-200 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        >
          <div className="w-12 h-12 rounded-full bg-violet-600 text-white flex items-center justify-center text-xl flex-shrink-0">✨</div>
          <div className="flex-1 min-w-0">
            <div className="kicker text-violet-700">New on selected events</div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-0.5">
              Your ticket gets you in. FanFlow helps you arrive ready.
            </h3>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              Know your gate, route, support options, and live entry conditions before you arrive.
              Unlocks automatically on eligible events after checkout.
            </p>
          </div>
          <button
            onClick={onAdvance}
            className="btn-primary !min-h-[44px] flex-shrink-0"
          >
            See it on World Cup →
          </button>
        </motion.div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Stage 2: Listing
// ─────────────────────────────────────────────────────────────────────

function StageListing({ onAdvance, onBack }: { onAdvance: () => void; onBack: () => void }) {
  const reduced = useReducedMotion()
  const [pending, setPending] = useState(false)
  const advance = () => {
    setPending(true)
    setTimeout(onAdvance, 700)
  }
  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <button onClick={onBack} className="text-xs text-slate-500 hover:text-slate-700 mb-3">
          ← Back to discovery
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          World Cup Tickets
        </h1>
        <div className="text-xs text-slate-500 mt-1">70,962 people viewing World Cup events in the past hour</div>

        <div className="flex flex-wrap gap-2 mt-4 mb-5">
          {['📍 Denton', 'Team', 'All Rounds', 'All dates', 'Parking', 'Price'].map((f) => (
            <span key={f} className="chip text-xs">
              {f} <span className="text-slate-400">▾</span>
            </span>
          ))}
        </div>

        {/* Mini intelligence preview for the World Cup overall */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/60 to-white p-4 sm:p-5 mb-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">✨</span>
            <span className="kicker text-violet-700">FanFlow intelligence preview</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Expected entry load</div>
              <div className="text-sm font-bold text-slate-900 mt-1">{MARIA_PLAN.expectedLoad}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Peak arrival window</div>
              <div className="text-sm font-bold text-slate-900 mt-1 font-mono">{MARIA_PLAN.peakWindow}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Live entry signals</div>
              <div className="text-sm font-bold text-slate-900 mt-1">Unlock after checkout</div>
            </div>
          </div>
        </motion.div>

        {/* Match rows */}
        <div className="space-y-3">
          {MATCHES.map((m, i) => (
            <motion.div
              key={m.id}
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              className={`rounded-2xl bg-white border ${
                m.isMaria ? 'border-violet-300 ring-2 ring-violet-100' : 'border-slate-200'
              } p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-base font-bold text-slate-900">{m.teamA}</span>
                  <span className="text-xs text-slate-500">vs.</span>
                  <span className="text-base font-bold text-slate-900">{m.teamB}</span>
                  {m.isMaria && (
                    <span className="ml-1 inline-flex items-center px-1.5 py-0 rounded-full bg-violet-600 text-white text-[9px] font-bold uppercase tracking-wider">
                      Maria's match
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-600 mt-1">{m.matchNo}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{m.date} · {m.time} · {m.venue}</div>
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold ${
                      m.status.tone === 'urgent'
                        ? 'bg-rose-50 border-rose-200 text-rose-700'
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}
                  >
                    {m.status.tone === 'urgent' ? '🔥' : '⚡'} {m.status.label}
                  </span>
                  {m.fanflow && <FanflowBadge />}
                </div>
              </div>
              {m.isMaria ? (
                <button
                  onClick={advance}
                  disabled={pending}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-full border-2 border-violet-600 text-violet-700 hover:bg-violet-50 font-bold text-sm transition flex-shrink-0 self-stretch sm:self-center min-h-[40px]"
                >
                  {pending ? 'Reading venue map…' : 'See tickets'}
                </button>
              ) : (
                <span className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-slate-200 text-slate-400 text-sm flex-shrink-0">
                  Demo card
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Stage 3: Seatmap
// ─────────────────────────────────────────────────────────────────────

function StageSeatmap({ onAdvance, onBack }: { onAdvance: () => void; onBack: () => void }) {
  const reduced = useReducedMotion()
  const [selected, setSelected] = useState(true) // Section 117 pre-selected
  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <button onClick={onBack} className="text-xs text-slate-500 hover:text-slate-700 mb-3">
          ← Back to listing
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Pick your seat</h1>
        <div className="text-xs text-slate-500 mt-1">MetLife Stadium · World Cup Final · Sat Jul 19, 7:00 PM</div>

        <div className="mt-6 grid lg:grid-cols-[1.4fr_1fr] gap-5">
          {/* Stadium SVG */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6">
            <div className="kicker mb-3">Section map</div>
            <div className="relative aspect-[4/3] rounded-xl bg-emerald-50 border border-emerald-200 overflow-hidden">
              <svg viewBox="0 0 400 300" className="w-full h-full">
                {/* Field */}
                <rect x="120" y="100" width="160" height="100" rx="6" fill="#16a34a" stroke="white" strokeWidth="2" />
                <line x1="200" y1="100" x2="200" y2="200" stroke="white" strokeWidth="1.5" />
                <circle cx="200" cy="150" r="16" fill="none" stroke="white" strokeWidth="1.5" />

                {/* Lower bowl section blocks — Section 117 highlighted */}
                {[
                  { id: '101', x: 60, y: 60, w: 40, h: 30 },
                  { id: '117', x: 175, y: 50, w: 50, h: 30, maria: true },
                  { id: '139', x: 300, y: 60, w: 40, h: 30 },
                  { id: '102', x: 60, y: 110, w: 40, h: 30 },
                  { id: '140', x: 300, y: 110, w: 40, h: 30 },
                  { id: '103', x: 60, y: 160, w: 40, h: 30 },
                  { id: '141', x: 300, y: 160, w: 40, h: 30 },
                  { id: '118', x: 175, y: 220, w: 50, h: 30 },
                ].map((s) => {
                  const isMaria = s.maria
                  return (
                    <g key={s.id}>
                      <motion.rect
                        x={s.x}
                        y={s.y}
                        width={s.w}
                        height={s.h}
                        rx={4}
                        fill={isMaria && selected ? '#7c3aed' : '#cbd5e1'}
                        stroke={isMaria && selected ? '#5b21b6' : '#94a3b8'}
                        strokeWidth={isMaria && selected ? 2 : 1}
                        initial={false}
                        animate={
                          isMaria && selected && !reduced
                            ? { fillOpacity: [0.8, 1, 0.8] }
                            : { fillOpacity: 1 }
                        }
                        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                      />
                      <text
                        x={s.x + s.w / 2}
                        y={s.y + s.h / 2 + 4}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="700"
                        fill={isMaria && selected ? 'white' : '#475569'}
                      >
                        {s.id}
                      </text>
                    </g>
                  )
                })}

                {/* Gate 3 marker */}
                <g>
                  <circle cx="200" cy="20" r="10" fill="#dc2626" />
                  <text x="200" y="24" textAnchor="middle" fontSize="9" fontWeight="700" fill="white">G3</text>
                </g>

                {/* Route line — Gate 3 → Section 117 */}
                {selected && (
                  <motion.path
                    d="M 200 30 Q 200 50, 200 50"
                    fill="none"
                    stroke="#7c3aed"
                    strokeWidth="2.5"
                    strokeDasharray="4 3"
                    initial={reduced ? false : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
              </svg>
            </div>
            <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-violet-600" /> Selected</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-slate-300" /> Available</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full bg-rose-600" /> Gate 3</span>
            </div>
          </div>

          {/* Right ticket panel */}
          <motion.aside
            initial={reduced ? false : { opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 h-fit space-y-4"
          >
            <div>
              <div className="kicker">Your selection</div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold text-slate-900">Section {MARIA_PLAN.section}</span>
                <span className="text-base font-bold text-slate-900 tabular-nums">${(1248).toLocaleString()}</span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Row {MARIA_PLAN.row} · {MARIA_PLAN.qty} tickets together</div>
            </div>

            {/* Quantity */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-sm text-slate-600">Quantity</span>
              <div className="flex items-center gap-3 text-sm">
                <button className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200">−</button>
                <span className="font-bold w-4 text-center">{MARIA_PLAN.qty}</span>
                <button className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200">+</button>
              </div>
            </div>

            {/* FanFlow eligible card */}
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="rounded-xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-200 p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">✨</span>
                <span className="text-xs font-bold uppercase tracking-wider text-violet-700">
                  FanFlow eligible for this section
                </span>
              </div>
              <p className="text-[11px] text-violet-900/80 leading-relaxed mb-2">
                Event Day Hub unlocks after checkout.
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {UNLOCK_MODULES.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={reduced ? false : { opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: 0.55 + i * 0.08 }}
                    className="flex items-center gap-1.5 text-[10px] font-semibold text-violet-900"
                  >
                    <span>{m.icon}</span>
                    {m.title}
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Likely entry preview */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Preview · finalized after checkout
              </div>
              <div className="text-xs text-slate-700 space-y-1">
                <div>Likely entry: <span className="font-bold">{MARIA_PLAN.gate}</span></div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {SUPPORT_MODULES.slice(0, 3).map((s, i) => (
                    <motion.span
                      key={s.id}
                      initial={reduced ? false : { opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.35, delay: 0.8 + i * 0.1 }}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-semibold text-slate-700"
                    >
                      {s.icon} {s.label}
                    </motion.span>
                  ))}
                </div>
                <div className="text-[10px] text-slate-500 mt-1.5">Live signals: available after purchase</div>
              </div>
            </div>

            <button
              onClick={onAdvance}
              className="btn-primary w-full !min-h-[48px] text-sm"
            >
              Continue to checkout · ${(1248).toLocaleString()}
            </button>
            <p className="text-[10px] text-slate-400 text-center">Concept simulation — no real payment.</p>
          </motion.aside>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Stage 4: Ticket confirmed
// ─────────────────────────────────────────────────────────────────────

function StageConfirmed({ onAdvance, onBack }: { onAdvance: () => void; onBack: () => void }) {
  const reduced = useReducedMotion()
  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <button onClick={onBack} className="text-xs text-slate-500 hover:text-slate-700 mb-4">
          ← Back to seat selection
        </button>

        {/* Checkmark stamp */}
        <div className="text-center mb-6">
          <motion.div
            className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-200 mb-3"
            initial={reduced ? false : { scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {!reduced && (
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-emerald-400"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 1.6, repeat: 1, ease: 'easeOut', delay: 0.2 }}
              />
            )}
            <motion.svg viewBox="0 0 24 24" className="w-10 h-10 text-emerald-600">
              <motion.path
                d="M4 12.5l5 5L20 6.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={reduced ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              />
            </motion.svg>
          </motion.div>
          <motion.h2
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight"
          >
            Ticket confirmed
          </motion.h2>
          <motion.p
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.65 }}
            className="text-sm text-slate-500 mt-1"
          >
            Your seat is locked in. A receipt was sent to your email.
          </motion.p>
        </div>

        {/* Ticket card */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.85, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm"
        >
          <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between text-[10px]">
            <span className="font-bold uppercase tracking-[0.15em] opacity-70">FIFA World Cup 2026</span>
            <span className="font-mono opacity-70">Jul 19, 2026</span>
          </div>
          <div className="p-5">
            <div className="font-bold text-slate-900 text-lg">World Cup Final</div>
            <div className="text-sm text-slate-500">MetLife Stadium · East Rutherford, NJ</div>
            <div className="mt-4 pt-4 border-t border-dashed border-slate-200 grid grid-cols-3 gap-3 text-center">
              {[
                { k: 'Section', v: MARIA_PLAN.section },
                { k: 'Row', v: MARIA_PLAN.row },
                { k: 'Qty', v: String(MARIA_PLAN.qty) },
              ].map((c) => (
                <div key={c.k}>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{c.k}</div>
                  <div className="font-bold text-slate-900 text-lg mt-0.5 font-mono">{c.v}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Shimmer sweep */}
          {!reduced && (
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-violet-200/50 to-transparent"
              initial={{ x: '-100%' }}
              animate={{ x: '400%' }}
              transition={{ duration: 1.3, delay: 1.6, ease: 'easeOut' }}
            />
          )}
        </motion.div>

        {/* FanFlow unlock */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 1.9, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 text-center"
        >
          <motion.div
            initial={reduced ? false : { scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 2.0 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-200 mb-3"
          >
            <span>✨</span>
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-violet-700">FanFlow AI · unlocked</span>
          </motion.div>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            FanFlow AI is unlocked for your group.
          </h3>
          <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
            Your ticket gets you in. FanFlow helps you arrive ready.
          </p>
        </motion.div>

        {/* Four module cards light up */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {UNLOCK_MODULES.map((m, i) => (
            <motion.div
              key={m.id}
              initial={reduced ? false : { opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: reduced ? 0 : 2.4 + i * 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-3.5 overflow-hidden"
            >
              <div className="w-9 h-9 rounded-full bg-violet-600 text-white flex items-center justify-center mb-2">
                {m.icon}
              </div>
              <div className="font-bold text-sm text-slate-900 leading-tight">{m.title}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{m.sub}</div>
              {!reduced && <Shimmer />}
            </motion.div>
          ))}
        </div>

        {/* Safety note */}
        <p className="text-[11px] text-slate-500 text-center mt-5 leading-relaxed max-w-md mx-auto">
          Always follow venue signage and staff instructions. FanFlow provides guidance, not emergency response.
        </p>

        {/* CTAs */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: reduced ? 0 : 3.6 }}
          className="mt-5 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2"
        >
          <button onClick={onAdvance} className="btn-primary !min-h-[52px] text-base">
            Build my event day plan →
          </button>
          <Link
            href="/event/wc2026-final/hub"
            className="btn-secondary !min-h-[52px] text-sm"
          >
            Open real Event Day Hub
          </Link>
        </motion.div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Stage 5: Building plan (architecture reveal)
// ─────────────────────────────────────────────────────────────────────

function StageBuilding({ onAdvance, onBack }: { onAdvance: () => void; onBack: () => void }) {
  const reduced = useReducedMotion()
  const [tick, setTick] = useState(reduced ? BUILDING_STEPS.length : 0)
  const stepDelay = 0.7

  useEffect(() => {
    if (reduced) return
    const timers = BUILDING_STEPS.map((_, i) =>
      setTimeout(() => setTick(i + 1), (i + 1) * stepDelay * 1000),
    )
    return () => timers.forEach(clearTimeout)
  }, [reduced])

  const done = (i: number) => tick >= i
  const allDone = tick >= BUILDING_STEPS.length

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <button onClick={onBack} className="text-xs text-slate-500 hover:text-slate-700 mb-4">
          ← Back to confirmation
        </button>

        <div className="text-center mb-8">
          <div className="kicker text-violet-700 mb-2">Personalizing your arrival</div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            FanFlow is building your plan
          </h2>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Guidance based on your ticket, group, venue context, and live staff/fan signals.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-violet-500 via-violet-600 to-violet-500" />
          <div className="p-5 sm:p-7 space-y-5">
            {BUILDING_STEPS.map((s, i) => {
              const isScoring = s.n === 4
              const visible = done(i + 1)
              const myDelay = i * stepDelay
              return (
                <motion.div
                  key={s.n}
                  initial={reduced ? false : { opacity: 0, y: 6 }}
                  animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
                  transition={{ duration: 0.4, delay: reduced ? 0 : myDelay }}
                  className="flex items-start gap-3"
                >
                  {visible ? <CheckTick delay={0} /> : <span className="w-6 h-6 flex-shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] font-bold text-slate-400 tabular-nums">0{s.n}</span>
                      <span className="font-semibold text-slate-900 text-sm">{s.title}</span>
                    </div>
                    {isScoring ? (
                      <div className="mt-2 space-y-1.5">
                        {MARIA_PLAN.gateScores.map((g, idx) => {
                          const won = idx === 0
                          const rowDelay = myDelay + 0.25 + idx * 0.18
                          return (
                            <motion.div
                              key={g.id}
                              initial={reduced ? false : { opacity: 0, x: -6 }}
                              animate={visible ? { opacity: 1, x: 0 } : { opacity: 0, x: -6 }}
                              transition={{ duration: 0.4, delay: reduced ? 0 : rowDelay }}
                              className={`flex items-center justify-between rounded-xl px-3 py-2 border ${
                                won ? 'bg-violet-50 border-violet-300' : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <span className={`text-sm font-semibold ${won ? 'text-violet-800' : 'text-slate-700'}`}>
                                {g.name}
                                {won && (
                                  <span className="ml-2 inline-flex items-center px-1.5 py-0 rounded-full bg-violet-600 text-white text-[9px] font-bold uppercase tracking-wider align-middle">
                                    Winner
                                  </span>
                                )}
                              </span>
                              <span className={`text-base font-bold font-mono ${won ? 'text-violet-700' : 'text-slate-600'}`}>
                                {visible ? <CountUpNum value={g.score} delay={rowDelay + 0.1} /> : '0.0'}
                              </span>
                            </motion.div>
                          )
                        })}
                      </div>
                    ) : s.n === 6 ? (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                          Rules picked the plan
                        </span>
                        <span className="text-slate-300">→</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-[10px] font-bold uppercase tracking-wider text-violet-700">
                          AI only explains it
                        </span>
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-slate-600 leading-relaxed">{s.body}</div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Final card */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={allDone ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 rounded-2xl bg-gradient-to-br from-violet-50 via-white to-white border border-violet-200 p-5 sm:p-6"
        >
          <div className="flex items-start gap-3 mb-4">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-violet-600 text-white flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12.5l5 5L20 6.5" />
              </svg>
            </span>
            <div>
              <div className="kicker text-violet-700">Plan ready</div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-0.5">
                Your event day plan is ready.
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                {MARIA_PLAN.gate} · Leave by {MARIA_PLAN.leaveBy} · Arrive at {MARIA_PLAN.arriveBy}.
              </p>
            </div>
          </div>
          <button onClick={onAdvance} className="btn-primary w-full !min-h-[48px]">
            See your Event Day Hub preview →
          </button>
          <p className="text-[11px] text-slate-500 mt-3">
            Always follow venue signage and staff instructions.
          </p>
        </motion.div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Stage 6: Hub preview
// ─────────────────────────────────────────────────────────────────────

function StagePreview({ onBack }: { onBack: () => void }) {
  const reduced = useReducedMotion()
  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4">
        <button onClick={onBack} className="text-xs text-slate-500 hover:text-slate-700">
          ← Back to building
        </button>

        {/* Preview disclaimer */}
        <div className="rounded-2xl bg-violet-50 border border-violet-100 px-4 py-2.5 flex items-center gap-2 text-xs text-violet-800">
          <span className="font-bold">Preview:</span>
          <span>This is the cinematic Hub preview. The fully working version lives below — open it any time.</span>
        </div>

        {/* Event card with countdown */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl bg-white border border-slate-200 overflow-hidden"
        >
          <div className="h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
          <div className="p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="kicker text-violet-700">Your event</div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Live
              </span>
            </div>
            <div className="font-bold text-slate-900 text-lg">World Cup Final</div>
            <div className="text-xs text-slate-500">MetLife Stadium · Sat, Jul 19 · 7:00 PM</div>
            <div className="mt-3 flex items-end gap-3 font-mono">
              {['62', '03', '14', '27'].map((d, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl font-bold text-slate-900">{d}</div>
                  <div className="text-[9px] text-slate-500 tracking-wider">
                    {['DAYS', 'HRS', 'MINS', 'SECS'][i]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Arrival Plan command card */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl bg-white border border-slate-200 p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="kicker text-violet-700">Your arrival plan</div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700">
              High confidence · <CountUpNum value={MARIA_PLAN.confidence} decimals={0} />%
            </span>
          </div>
          <div className="space-y-1">
            {[
              { icon: '⏰', label: 'Leave by', value: MARIA_PLAN.leaveBy },
              { icon: '🎯', label: 'Arrive at', value: MARIA_PLAN.arriveBy },
              { icon: '📍', label: 'Gate', value: MARIA_PLAN.gate, emphasis: true },
            ].map((r, i, arr) => (
              <div key={r.label} className={`flex justify-between items-center py-2.5 ${i < arr.length - 1 ? 'border-b border-slate-100' : ''}`}>
                <span className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                  <span className="w-6 h-6 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-xs">{r.icon}</span>
                  {r.label}
                </span>
                <span className={`font-bold text-base ${r.emphasis ? 'text-violet-700' : 'text-slate-900'}`}>{r.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Event Intelligence */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-2xl bg-white border border-slate-200 overflow-hidden"
        >
          <div className="h-1 bg-gradient-to-r from-violet-500 to-violet-600" />
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="kicker text-violet-700">Event intelligence</div>
                <h3 className="font-bold text-slate-900 text-sm mt-0.5">Conditions at your gate</h3>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-700">
                <CountUpNum value={MARIA_PLAN.confidence} decimals={0} />% confidence
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5">
                <div className="text-[9px] uppercase tracking-wider text-amber-800 font-semibold">Expected load</div>
                <div className="text-sm font-bold text-amber-900 mt-1">{MARIA_PLAN.expectedLoad}</div>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
                <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Peak window</div>
                <div className="text-sm font-bold text-slate-900 mt-1 font-mono">{MARIA_PLAN.peakWindow}</div>
              </div>
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5">
                <div className="text-[9px] uppercase tracking-wider text-emerald-800 font-semibold">Fan pulse</div>
                <div className="text-sm font-bold text-emerald-900 mt-1">{MARIA_PLAN.fanPulse.smooth}% smooth</div>
              </div>
            </div>
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex items-start gap-2">
              <span className="text-emerald-700 text-sm">👮</span>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Staff update applied · weighted 3× over fan reports
                </div>
                <p className="text-xs text-emerald-900 mt-1 leading-snug">
                  &ldquo;Gate 3 moving smoothly.&rdquo; This increased confidence for your route.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Fan pulse bars */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="rounded-2xl bg-white border border-slate-200 p-5"
        >
          <div className="kicker mb-3">Fan pulse · last 30 minutes</div>
          <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100">
            <motion.div
              className="bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${MARIA_PLAN.fanPulse.smooth}%` }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.div
              className="bg-amber-500"
              initial={{ width: 0 }}
              animate={{ width: `${MARIA_PLAN.fanPulse.slow}%` }}
              transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.div
              className="bg-rose-500"
              initial={{ width: 0 }}
              animate={{ width: `${MARIA_PLAN.fanPulse.needHelp}%` }}
              transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2.5 text-[11px]">
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="font-semibold">{MARIA_PLAN.fanPulse.smooth}%</span> smooth</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /><span className="font-semibold">{MARIA_PLAN.fanPulse.slow}%</span> slow</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /><span className="font-semibold">{MARIA_PLAN.fanPulse.needHelp}%</span> need help</div>
          </div>
        </motion.div>

        {/* Nearby support */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="rounded-2xl bg-white border border-slate-200 p-5"
        >
          <div className="kicker mb-3">Nearby support</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SUPPORT_MODULES.map((s, i) => (
              <motion.div
                key={s.id}
                initial={reduced ? false : { opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.5 + i * 0.06 }}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200"
              >
                <span className={`w-9 h-9 rounded-full ${s.tone} text-white flex items-center justify-center flex-shrink-0`}>
                  {s.icon}
                </span>
                <span className="text-sm font-semibold text-slate-900">{s.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Need Help preview */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="rounded-2xl bg-white border border-slate-200 overflow-hidden"
        >
          <div className="h-1 bg-gradient-to-r from-rose-400 via-rose-500 to-rose-400" />
          <div className="p-5">
            <div className="kicker text-rose-700">Need help during the event?</div>
            <h3 className="font-bold text-slate-900 text-base mt-1">Context-aware support, one tap away</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              For urgent medical or safety issues, contact venue staff or local emergency services.
              FanFlow provides guidance, not emergency response.
            </p>
          </div>
        </motion.div>

        {/* Hand-off CTA */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.6 }}
          className="rounded-2xl bg-slate-900 text-white p-5 sm:p-6"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center text-base">🚪</div>
            <div>
              <div className="font-bold text-sm">Hand-off to the real system</div>
              <div className="text-xs text-slate-300 mt-0.5">
                Live signals · cross-tab staff updates · score breakdown · tests
              </div>
            </div>
          </div>
          <Link
            href="/event/wc2026-final/hub"
            className="inline-flex items-center justify-center w-full min-h-[48px] px-5 rounded-full bg-white text-slate-900 font-bold text-sm hover:bg-slate-100 transition"
          >
            Open real FanFlow Hub →
          </Link>
          <p className="text-[11px] text-slate-400 text-center mt-3 leading-relaxed">
            The real Hub uses the deterministic rule engine, AI explanation endpoint, and live staff/fan signals.
          </p>
        </motion.div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Main route — state machine + stage progress chip
// ─────────────────────────────────────────────────────────────────────

function StageProgress({ stage, onJump }: { stage: Stage; onJump: (s: Stage) => void }) {
  const idx = STAGE_ORDER.indexOf(stage)
  return (
    <div className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="font-bold text-violet-700">FanFlow Vision</span>
          <span className="text-slate-400 hidden sm:inline">· cinematic walkthrough</span>
        </div>
        <div className="flex items-center gap-1.5">
          {STAGE_ORDER.map((s, i) => {
            const active = i === idx
            const done = i < idx
            return (
              <button
                key={s}
                onClick={() => onJump(s)}
                title={STAGE_LABELS[s]}
                className={`h-1.5 rounded-full transition-all ${
                  active ? 'w-8 bg-violet-600' : done ? 'w-4 bg-violet-300' : 'w-4 bg-slate-200 hover:bg-slate-300'
                }`}
                aria-label={`Jump to ${STAGE_LABELS[s]}`}
              />
            )
          })}
          <span className="ml-2 text-[11px] font-semibold text-slate-600 tabular-nums hidden sm:inline">
            {idx + 1} / {STAGE_ORDER.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onJump('discovery')}
            className="text-[11px] text-slate-500 hover:text-slate-700 hidden sm:inline"
          >
            Restart
          </button>
          <Link href="/" className="text-[11px] text-slate-500 hover:text-slate-700">
            ← Home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function FanflowVisionPage() {
  const [stage, setStage] = useState<Stage>('discovery')

  const idx = STAGE_ORDER.indexOf(stage)
  const next = useMemo(() => () => {
    const i = STAGE_ORDER.indexOf(stage)
    if (i < STAGE_ORDER.length - 1) {
      setStage(STAGE_ORDER[i + 1])
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
  }, [stage])
  const back = useMemo(() => () => {
    const i = STAGE_ORDER.indexOf(stage)
    if (i > 0) {
      setStage(STAGE_ORDER[i - 1])
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
  }, [stage])

  return (
    <>
      <StageProgress stage={stage} onJump={(s) => { setStage(s); window.scrollTo({ top: 0, behavior: 'auto' }) }} />
      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {stage === 'discovery' && <StageDiscovery onAdvance={next} />}
          {stage === 'listing' && <StageListing onAdvance={next} onBack={back} />}
          {stage === 'seatmap' && <StageSeatmap onAdvance={next} onBack={back} />}
          {stage === 'confirmed' && <StageConfirmed onAdvance={next} onBack={back} />}
          {stage === 'building' && <StageBuilding onAdvance={next} onBack={back} />}
          {stage === 'preview' && <StagePreview onBack={back} />}
        </motion.div>
      </AnimatePresence>
    </>
  )
}
