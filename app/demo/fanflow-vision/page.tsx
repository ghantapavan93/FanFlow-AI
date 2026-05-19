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

type CardEvent = {
  id: string
  title: string
  sub?: string
  date?: string
  venue?: string
  views?: string
  rank?: number
  bg?: string
  brand?: string
  img?: string
  fanflow?: boolean
  trending?: boolean
}

const HERO_EVENTS: CardEvent[] = [
  {
    id: 'nba',
    title: 'NBA Playoffs',
    sub: 'May 17 – Jun 19',
    bg: 'from-slate-900 to-slate-800',
    brand: 'Playoffs',
  },
  {
    id: 'nfl',
    title: 'NFL',
    sub: 'Season',
    bg: 'from-amber-700 via-amber-800 to-stone-900',
    img: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=600&h=600&fit=crop',
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
    img: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&h=600&fit=crop',
  },
]

// Recently viewed — small cards with view-count pills like the real StubHub
const RECENTLY_VIEWED: CardEvent[] = [
  { id: 'wc-rv', title: 'World Cup', views: '60.7k', bg: 'from-violet-600 to-indigo-800', brand: 'WORLD\nCUP', fanflow: true },
  { id: 'bottlerock', title: 'BottleRock Napa Valley', views: '5.3k', bg: 'from-lime-400 to-sky-400', brand: 'B' },
  { id: 'tcu', title: 'TCU Horned Frogs Football', views: '285', bg: 'from-amber-700 to-stone-900', img: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=400&h=400&fit=crop' },
  { id: 'rangers-rv', title: 'Texas Rangers', views: '31.9k', bg: 'from-blue-700 to-blue-900', brand: 'T' },
]

// Trending Events near Denton — numbered #1..#4
const TRENDING_NEAR: CardEvent[] = [
  { id: 'bts-t', title: 'BTS', rank: 1, date: 'Sat, 15 Aug · 8:00 PM', venue: 'AT&T Stadium', img: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&h=400&fit=crop' },
  { id: 'wc-t', title: 'Netherlands vs Japan · World Cup Group F', rank: 2, date: 'Sun, 14 Jun · 3:00 PM', venue: 'AT&T Stadium', bg: 'from-violet-600 to-indigo-800', brand: 'WORLD\nCUP', fanflow: true },
  { id: 'usher', title: 'Usher and Chris Brown', rank: 3, date: 'Thu, 10 Sep · 7:00 PM', venue: 'AT&T Stadium', img: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop' },
  { id: 'forrest', title: 'Forrest Frank', rank: 4, date: 'Sat, 01 Aug · 7:00 PM', venue: 'Globe Life Field', img: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=400&fit=crop' },
]

// Last-minute deals
const LAST_MINUTE: CardEvent[] = [
  { id: 'behemoth', title: 'Behemoth', date: 'Mon, 18 May · 18:30', venue: 'The Bomb Factory', img: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=400&h=400&fit=crop' },
  { id: 'mystics', title: 'Washington Mystics at Dallas Wings', date: 'Mon, 18 May · 19:00', venue: 'College Park Center', img: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=400&fit=crop' },
  { id: 'pubchoir', title: 'Pub Choir', date: 'Mon, 18 May · 19:00', venue: 'Texas Theatre', img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop' },
  { id: 'sanantonio', title: 'San Antonio Missions at Frisco Roughriders', date: 'Tue, 19 May · 11:05', venue: 'Riders Field', img: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400&h=400&fit=crop' },
]

const DISCOVERY_FILTERS = ['All types', 'Sports', 'Concerts', 'Theatre & Comedy']

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

/**
 * StubHub-style nav bar. The brand block looks like the real StubHub
 * purple-rounded-square mark; the "+ FanFlow AI" pill makes clear this
 * is the FanFlow integration concept, not the actual StubHub site.
 *
 * `compact` mode (used on Listing / Seatmap / Confirmed / Building /
 * Preview) shrinks the search bar and hides the category row so the
 * stage's own content gets more vertical room.
 */
function NavBar({ compact = false }: { compact?: boolean }) {
  return (
    <header className="sticky top-12 z-30 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="bg-violet-700 text-white font-extrabold text-sm sm:text-base px-2.5 py-1 rounded-md leading-none tracking-tight">
            StubHub
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 border border-violet-100 text-[10px] font-bold uppercase tracking-wider text-violet-700">
            + FanFlow AI
          </span>
        </div>
        {!compact && (
          <div className="hidden md:flex flex-1 max-w-md items-center gap-2 px-3 h-9 rounded-full bg-slate-100 border border-slate-200 text-sm text-slate-400">
            <span>🔍</span>
            <span className="truncate">Search events, artists, teams…</span>
          </div>
        )}
        <div className="flex items-center gap-3 sm:gap-4 text-sm font-semibold text-slate-600">
          {NAV_RIGHT.map((n) => (
            <span key={n} className="hidden lg:inline">{n}</span>
          ))}
          <div className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold">M</div>
        </div>
      </div>
      {!compact && (
        <div className="border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-10 flex items-center gap-5 text-sm font-semibold text-slate-700 overflow-x-auto">
            {CATEGORIES.map((c) => (
              <button key={c} className="hover:text-slate-900 whitespace-nowrap">
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}

/**
 * Reusable card primitives used by every section of Stage 1.
 */
function HeartIcon({ tone = 'light' }: { tone?: 'light' | 'on-image' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-3.5 h-3.5"
      fill="none"
      stroke={tone === 'on-image' ? 'white' : '#475569'}
      strokeWidth="2"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function CardCorner({ views }: { views?: string }) {
  return (
    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 z-10">
      {views && (
        <span className="bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          {views}
        </span>
      )}
      <button
        onClick={(e) => e.preventDefault()}
        className="w-7 h-7 rounded-full bg-slate-900/40 backdrop-blur-sm hover:bg-slate-900/60 flex items-center justify-center transition"
        aria-label="Favorite"
      >
        <HeartIcon tone="on-image" />
      </button>
    </div>
  )
}

function CardTile({ ev }: { ev: CardEvent }) {
  if (ev.img) {
    return (
      <div
        className="relative aspect-square rounded-2xl bg-cover bg-center overflow-hidden"
        style={{ backgroundImage: `url(${ev.img})` }}
      />
    )
  }
  return (
    <div
      className={`relative aspect-square rounded-2xl overflow-hidden flex items-center justify-center bg-gradient-to-br ${ev.bg ?? 'from-slate-700 to-slate-900'}`}
    >
      {ev.brand && (
        <div className="text-white font-bold leading-[0.85] tracking-tighter whitespace-pre-line text-center text-[28px] sm:text-[40px]">
          {ev.brand}
        </div>
      )}
      <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.4),transparent_60%),radial-gradient(circle_at_80%_70%,rgba(0,0,0,0.4),transparent_60%)]" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Premium cinematic primitives — reused across Stages 2..6
// ─────────────────────────────────────────────────────────────────────

/**
 * Soft purple ambient background — applied to whole-stage wrappers to
 * give every cinematic stage a consistent "premium violet" atmosphere.
 * Three layered radial gradients on a near-white base, no fixed bg-image
 * so it stays perfectly performant.
 */
/**
 * Atmospheric purple backdrop. Three deep radial gradients +  subtle
 * dot pattern overlay + two glowing orbs that softly pulse. Same
 * "premium" feel as the reference Figma mockups Pavan shared.
 */
function AmbientBackdrop() {
  const reduced = useReducedMotion()
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Layered radial purples */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_0%,rgba(124,58,237,0.18),transparent_55%),radial-gradient(ellipse_70%_50%_at_85%_25%,rgba(217,70,239,0.14),transparent_55%),radial-gradient(ellipse_70%_50%_at_15%_75%,rgba(99,102,241,0.10),transparent_55%)] bg-[#fafafe]" />
      {/* Dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(124,58,237,0.35) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />
      {/* Two glowing orbs — gently pulse */}
      <motion.div
        className="absolute -top-32 -right-24 w-[520px] h-[520px] rounded-full bg-fuchsia-400/30 blur-3xl"
        animate={reduced ? undefined : { scale: [1, 1.08, 1], opacity: [0.6, 0.85, 0.6] }}
        transition={reduced ? undefined : { duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-40 -left-32 w-[600px] h-[600px] rounded-full bg-violet-500/25 blur-3xl"
        animate={reduced ? undefined : { scale: [1, 1.12, 1], opacity: [0.5, 0.75, 0.5] }}
        transition={reduced ? undefined : { duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
      />
    </div>
  )
}

/**
 * Glassmorphic card wrapper. Semi-transparent white with a subtle
 * backdrop blur, soft violet ring. Used by Stage 4/5/6 panels.
 */
function GlassCard({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-3xl bg-white/75 backdrop-blur-md border border-white/60 shadow-[0_8px_40px_-12px_rgba(124,58,237,0.18)] ring-1 ring-violet-100/60 ${className}`}
    >
      {children}
    </div>
  )
}

/**
 * Stylized 3D-perspective stadium illustration. SVG only — no raster,
 * no external assets. Triple-bowl design with people dots, light beams,
 * location pins, and a subtle violet glow underneath.
 */
function StadiumIllustration({
  size = 280,
  glow = false,
  showPin = true,
}: {
  size?: number
  glow?: boolean
  showPin?: boolean
}) {
  // Deterministic people dots — same pattern every render
  const people = [
    [40, 90], [55, 75], [75, 65], [100, 55], [120, 52], [140, 55], [165, 65], [185, 75], [200, 90],
    [45, 110], [62, 130], [82, 145], [120, 158], [158, 145], [178, 130], [195, 110],
    [30, 70], [210, 70], [25, 95], [215, 95], [35, 115], [205, 115],
    [50, 50], [70, 40], [110, 35], [130, 35], [170, 40], [190, 50],
  ]
  return (
    <svg
      viewBox="0 0 240 180"
      width={size}
      height={(size * 180) / 240}
      aria-hidden="true"
      className="select-none drop-shadow-[0_20px_40px_rgba(124,58,237,0.35)]"
    >
      <defs>
        <radialGradient id="stadium-glow" cx="50%" cy="55%" r="60%">
          <stop offset="0%" stopColor="rgba(124,58,237,0.55)" />
          <stop offset="55%" stopColor="rgba(124,58,237,0.18)" />
          <stop offset="100%" stopColor="rgba(124,58,237,0)" />
        </radialGradient>
        <linearGradient id="stadium-outer" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
        <linearGradient id="stadium-middle" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="stadium-inner" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ede9fe" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
        <radialGradient id="field-grad" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#15803d" />
        </radialGradient>
        <radialGradient id="section-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d946ef" />
          <stop offset="100%" stopColor="#7c3aed" />
        </radialGradient>
      </defs>

      {/* Glow base */}
      <ellipse cx="120" cy="120" rx="120" ry="55" fill="url(#stadium-glow)" />

      {/* Three layered bowls — outer to inner */}
      <ellipse cx="120" cy="110" rx="108" ry="48" fill="url(#stadium-outer)" opacity="0.7" />
      <ellipse cx="120" cy="108" rx="108" ry="48" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="0.8" />
      <ellipse cx="120" cy="105" rx="92" ry="40" fill="url(#stadium-middle)" opacity="0.85" />
      <ellipse cx="120" cy="103" rx="92" ry="40" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="0.8" />
      <ellipse cx="120" cy="100" rx="74" ry="32" fill="url(#stadium-inner)" />
      <ellipse cx="120" cy="98" rx="74" ry="32" fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="0.8" />

      {/* Field */}
      <ellipse cx="120" cy="95" rx="54" ry="22" fill="url(#field-grad)" />
      <ellipse cx="120" cy="95" rx="54" ry="22" fill="none" stroke="white" strokeWidth="1" />
      <line x1="120" y1="73" x2="120" y2="117" stroke="white" strokeWidth="0.8" />
      <ellipse cx="120" cy="95" rx="9" ry="5" fill="none" stroke="white" strokeWidth="0.8" />
      <ellipse cx="80" cy="95" rx="6" ry="4" fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="0.6" />
      <ellipse cx="160" cy="95" rx="6" ry="4" fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="0.6" />

      {/* People dots — tiny semi-transparent circles around the bowl */}
      {people.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.2" fill="white" opacity={0.55 + (i % 3) * 0.15} />
      ))}

      {/* Section glow (Maria's section 117) */}
      {glow && (
        <>
          <path
            d="M 90 64 L 150 64 L 158 78 L 82 78 Z"
            fill="url(#section-glow)"
            opacity="0.95"
          />
          <path
            d="M 90 64 L 150 64 L 158 78 L 82 78 Z"
            fill="none"
            stroke="#ede9fe"
            strokeWidth="2"
          />
          {/* Section number label */}
          <text x="120" y="74" textAnchor="middle" fontSize="8" fontWeight="700" fill="white">117</text>
        </>
      )}

      {/* Location pins around the bowl */}
      {showPin && (
        <>
          <g transform="translate(120,26)">
            <circle cx="0" cy="6" r="4" fill="rgba(124,58,237,0.4)" />
            <path d="M 0 0 L -7 -10 L 7 -10 Z" fill="#facc15" />
            <circle cx="0" cy="-6" r="6" fill="#facc15" />
            <text x="0" y="-3" textAnchor="middle" fontSize="7" fontWeight="700" fill="#7c3aed">★</text>
          </g>
          <circle cx="50" cy="80" r="3" fill="#d946ef" />
          <circle cx="50" cy="80" r="6" fill="none" stroke="#d946ef" strokeOpacity="0.4" strokeWidth="1" />
          <circle cx="190" cy="80" r="3" fill="#d946ef" />
          <circle cx="190" cy="80" r="6" fill="none" stroke="#d946ef" strokeOpacity="0.4" strokeWidth="1" />
          <circle cx="120" cy="145" r="3" fill="#d946ef" />
          <circle cx="120" cy="145" r="6" fill="none" stroke="#d946ef" strokeOpacity="0.4" strokeWidth="1" />
        </>
      )}

      {/* Stadium light beams — four corners */}
      <g stroke="white" strokeOpacity="0.7" strokeLinecap="round">
        <line x1="15" y1="35" x2="55" y2="80" strokeWidth="1.5" />
        <line x1="20" y1="30" x2="60" y2="75" strokeWidth="2" />
        <line x1="225" y1="35" x2="185" y2="80" strokeWidth="1.5" />
        <line x1="220" y1="30" x2="180" y2="75" strokeWidth="2" />
      </g>
      {/* Tower lights */}
      <circle cx="18" cy="32" r="3" fill="#facc15" opacity="0.9" />
      <circle cx="222" cy="32" r="3" fill="#facc15" opacity="0.9" />
    </svg>
  )
}

/**
 * Circular confidence meter — SVG arc with violet→fuchsia gradient
 * stroke. Animates its dashoffset on mount.
 */
/**
 * Animated shimmering gradient title. The gradient slowly slides across
 * the text so the headline visibly breathes instead of sitting flat.
 * Use sparingly — only on hero headlines.
 */
function ShimmerTitle({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  const reduced = useReducedMotion()
  return (
    <span
      className={`inline-block bg-clip-text text-transparent bg-[linear-gradient(110deg,#7c3aed_0%,#a855f7_25%,#d946ef_50%,#a855f7_75%,#7c3aed_100%)] ${
        reduced ? '' : 'bg-[length:200%_auto]'
      } ${className}`}
      style={
        reduced
          ? undefined
          : {
              animation: 'ff-shimmer-title 6s ease-in-out infinite',
            }
      }
    >
      {children}
    </span>
  )
}

/**
 * Burst of sparkle particles flying outward from a central point.
 * Used at the FanFlow Unlocked moment on Stage 4.
 */
function SparkleBurst({ count = 14 }: { count?: number }) {
  const reduced = useReducedMotion()
  if (reduced) return null
  // Deterministic positions for SSR consistency
  const particles = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2
    const dist = 120 + ((i * 17) % 60)
    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      delay: (i * 0.06) % 1.2,
      size: 6 + (i % 4) * 2,
      color: i % 3 === 0 ? '#d946ef' : i % 3 === 1 ? '#a855f7' : '#facc15',
    }
  })
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 12px ${p.color}`,
          }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
          animate={{
            x: p.x,
            y: p.y,
            opacity: [0, 1, 0],
            scale: [0, 1, 0.4],
          }}
          transition={{
            duration: 1.4,
            delay: 0.9 + p.delay,
            ease: [0.16, 1, 0.3, 1],
          }}
        />
      ))}
    </div>
  )
}

function ConfidenceRing({
  value,
  size = 120,
  label = 'Confidence',
}: {
  value: number
  size?: number
  label?: string
}) {
  const reduced = useReducedMotion()
  const strokeWidth = size / 12
  const radius = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * radius
  const target = (value / 100) * circ
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`ring-grad-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#d946ef" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#ede9fe"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#ring-grad-${size})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={reduced ? { strokeDashoffset: circ - target } : { strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - target }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold text-slate-900 tabular-nums">
          <CountUpNum value={value} decimals={0} />
          <span className="text-base">%</span>
        </div>
        <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold mt-0.5">{label}</div>
      </div>
    </div>
  )
}

/**
 * Live pulse bar chart — N vertical bars, each animating from height 0
 * to its target value. Bars use the violet/fuchsia gradient.
 */
function LivePulseBars({
  count = 14,
  height = 56,
  delay = 0,
}: {
  count?: number
  height?: number
  delay?: number
}) {
  const reduced = useReducedMotion()
  // Deterministic pseudo-random heights so SSR === client
  const heights = Array.from({ length: count }, (_, i) => 30 + ((i * 37) % 70))
  return (
    <div className="flex items-end gap-[3px]" style={{ height }}>
      {heights.map((h, i) => (
        <motion.div
          key={i}
          className="w-1.5 rounded-full bg-gradient-to-t from-violet-300 to-fuchsia-500"
          initial={reduced ? false : { height: 0 }}
          animate={{ height: `${h}%` }}
          transition={{
            duration: 0.5,
            delay: reduced ? 0 : delay + i * 0.025,
            ease: [0.16, 1, 0.3, 1],
          }}
        />
      ))}
    </div>
  )
}

/**
 * Horizontal "trust strip" used at the bottom of Listing and Seatmap.
 * Four mini cells with icon + label + subtitle.
 */
function TrustStrip({
  items,
}: {
  items: { icon: string; label: string; sub: string }[]
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200 p-4 sm:p-5">
      {items.map((it) => (
        <div key={it.label} className="flex items-start gap-2.5">
          <span className="w-9 h-9 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center text-base flex-shrink-0">
            {it.icon}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900 leading-tight">{it.label}</div>
            <div className="text-[11px] text-slate-500 leading-snug mt-0.5">{it.sub}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

const TRUST_ITEMS = [
  { icon: '🛡️', label: '100% Fan Guarantee', sub: "We're here if your plans change." },
  { icon: '🎟️', label: 'Millions of tickets', sub: "The world's largest marketplace." },
  { icon: '🔒', label: 'Secure checkout', sub: 'Your data is always protected.' },
  { icon: '✨', label: 'FanFlow AI available', sub: 'Smarter insights for high-friction events.' },
]

// ─────────────────────────────────────────────────────────────────────
// Stage 1: Discovery
// ─────────────────────────────────────────────────────────────────────

function StageDiscovery({ onAdvance }: { onAdvance: () => void }) {
  const reduced = useReducedMotion()
  const [activeFilter, setActiveFilter] = useState('All types')

  // Reusable section header
  const SectionHead = ({ title, cta }: { title: string; cta?: string }) => (
    <div className="flex items-center justify-between mb-4 px-1">
      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>
      {cta && <button className="text-sm font-semibold text-sky-600 hover:underline">{cta}</button>}
    </div>
  )

  // Compact card used by Recently viewed / Last-minute deals
  const CompactCard = ({ ev }: { ev: CardEvent }) => {
    const Inner = (
      <div className="group">
        <div className="relative">
          <CardCorner views={ev.views} />
          {ev.fanflow && (
            <span className="absolute top-2.5 left-2.5 z-10">
              <FanflowBadge subtle />
            </span>
          )}
          <CardTile ev={ev} />
        </div>
        <div className="mt-2.5 px-0.5">
          <div className="font-bold text-slate-900 text-sm leading-tight line-clamp-2">
            {ev.title}
          </div>
          {ev.date && <div className="text-xs text-slate-600 mt-1">{ev.date}</div>}
          {ev.venue && <div className="text-xs text-slate-500 mt-0.5">{ev.venue}</div>}
        </div>
      </div>
    )
    return ev.fanflow ? (
      <button
        onClick={onAdvance}
        className="text-left rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-400"
      >
        {Inner}
      </button>
    ) : (
      <div>{Inner}</div>
    )
  }

  // Numbered card used by Trending Events near Denton
  const NumberedCard = ({ ev }: { ev: CardEvent }) => {
    const Inner = (
      <div className="group">
        <div className="relative">
          <CardCorner />
          {ev.fanflow && (
            <span className="absolute top-2.5 left-9 z-10">
              <FanflowBadge subtle />
            </span>
          )}
          <span className="absolute top-2.5 left-2.5 inline-flex items-center justify-center w-7 h-7 rounded-full bg-violet-600 text-white text-xs font-bold z-10">
            #{ev.rank}
          </span>
          <CardTile ev={ev} />
        </div>
        <div className="mt-2.5 px-0.5">
          <div className="font-bold text-slate-900 text-sm leading-tight line-clamp-2">
            {ev.title}
          </div>
          {ev.date && <div className="text-xs text-slate-600 mt-1">{ev.date}</div>}
          {ev.venue && <div className="text-xs text-slate-500 mt-0.5">{ev.venue}</div>}
        </div>
      </div>
    )
    return ev.fanflow ? (
      <button
        onClick={onAdvance}
        className="text-left rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-400"
      >
        {Inner}
      </button>
    ) : (
      <div>{Inner}</div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Search bar — large rounded like StubHub */}
        <div className="relative mb-6 sm:mb-8">
          <input
            type="text"
            placeholder="Search events, artists, teams and more"
            className="w-full h-12 sm:h-14 pl-12 pr-4 rounded-full border border-slate-200 bg-white text-sm sm:text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
          />
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
        </div>

        {/* Hero — 4 large square cards */}
        <section>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {HERO_EVENTS.map((ev, i) => {
              const Inner = (
                <motion.div
                  initial={reduced ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={ev.fanflow && !reduced ? { y: -3 } : undefined}
                  className="relative cursor-pointer"
                >
                  <CardCorner />
                  {ev.fanflow && (
                    <span className="absolute top-2.5 left-2.5 z-10">
                      <FanflowBadge subtle />
                    </span>
                  )}
                  <CardTile ev={ev} />
                  {ev.fanflow && !reduced && (
                    <motion.span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 left-0 w-1/3 rounded-2xl overflow-hidden bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      animate={{ x: ['-100%', '400%'] }}
                      transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.6 }}
                    />
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 py-2.5 rounded-b-2xl">
                    <div className="text-white font-bold text-base sm:text-lg leading-tight">{ev.title}</div>
                    <div className="text-white/80 text-[11px] sm:text-xs mt-0.5">{ev.sub}</div>
                  </div>
                </motion.div>
              )
              return ev.fanflow ? (
                <button
                  key={ev.id}
                  onClick={onAdvance}
                  className="text-left rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-400"
                >
                  {Inner}
                </button>
              ) : (
                <div key={ev.id}>{Inner}</div>
              )
            })}
          </div>
        </section>

        {/* Filter row — location chip + filter chips */}
        <section className="mt-6 sm:mt-8 flex flex-wrap items-center gap-3">
          <button className="w-10 h-10 rounded-full bg-violet-100 hover:bg-violet-200 flex items-center justify-center transition">
            📍
          </button>
          <button className="chip font-semibold !text-slate-700">
            <span>📌</span> Denton <span className="text-slate-400">▾</span>
          </button>
          <button className="chip font-semibold !text-slate-700">
            <span>📅</span> All dates <span className="text-slate-400">▾</span>
          </button>
          <div className="hidden sm:block h-6 w-px bg-slate-200" />
          <div className="flex flex-wrap gap-2">
            {DISCOVERY_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={activeFilter === f ? 'chip-active' : 'chip'}
              >
                {f}
              </button>
            ))}
          </div>
        </section>

        {/* Spotify connect banner */}
        <section className="mt-8 rounded-2xl bg-slate-900 text-white p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-xl flex-shrink-0">
            🎵
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-base">
              Connect your Spotify account and sync your favorite artists
            </div>
            <div className="text-sm text-slate-300 mt-0.5">
              Discover events from who you actually listen to
            </div>
          </div>
          <button className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold text-sm transition flex-shrink-0">
            Connect Spotify
          </button>
        </section>

        {/* Recently viewed */}
        <motion.section
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-10 sm:mt-12"
        >
          <SectionHead title="Recently viewed" cta="Edit" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {RECENTLY_VIEWED.map((ev) => (
              <CompactCard key={ev.id} ev={ev} />
            ))}
          </div>
        </motion.section>

        {/* Trending Events near Denton — numbered */}
        <motion.section
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.28 }}
          className="mt-10 sm:mt-12"
        >
          <SectionHead title="Trending Events near Denton" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {TRENDING_NEAR.map((ev) => (
              <NumberedCard key={ev.id} ev={ev} />
            ))}
          </div>
        </motion.section>

        {/* Last-minute deals */}
        <motion.section
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.36 }}
          className="mt-10 sm:mt-12"
        >
          <SectionHead title="Last-minute deals" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {LAST_MINUTE.map((ev) => (
              <CompactCard key={ev.id} ev={ev} />
            ))}
          </div>
        </motion.section>

        {/* Inline FanFlow promo strip — the wedge story */}
        <motion.section
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-10 sm:mt-12 rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-200 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        >
          <div className="w-12 h-12 rounded-full bg-violet-600 text-white flex items-center justify-center text-xl flex-shrink-0">
            ✨
          </div>
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
          <button onClick={onAdvance} className="btn-primary !min-h-[44px] flex-shrink-0">
            See it on World Cup →
          </button>
        </motion.section>

        {/* Download app banner */}
        <section className="mt-12 rounded-2xl bg-violet-100 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Download the StubHub app
            </h3>
            <p className="text-sm text-slate-700 mt-1">
              Discover your favourite events with ease
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold">
              <span>🍎</span>
              <span className="text-left">
                <span className="block text-[10px] opacity-70 leading-none">Download on the</span>
                <span className="block leading-tight">App Store</span>
              </span>
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold">
              <span>▶️</span>
              <span className="text-left">
                <span className="block text-[10px] opacity-70 leading-none">GET IT ON</span>
                <span className="block leading-tight">Google Play</span>
              </span>
            </button>
          </div>
        </section>

        {/* Email signup */}
        <section className="mt-12 text-center">
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            Get hot events and deals delivered straight to your inbox
          </h3>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="mt-4 flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
          >
            <input
              type="email"
              placeholder="Email address"
              className="flex-1 h-11 px-4 rounded-full border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <button
              type="submit"
              className="h-11 px-6 rounded-full border-2 border-violet-600 text-violet-700 font-bold text-sm hover:bg-violet-50 transition"
            >
              Join the List
            </button>
          </form>
          <p className="text-[11px] text-slate-500 mt-3 max-w-md mx-auto">
            By signing up, you acknowledge and accept our privacy policy and consent to receiving
            emails.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-violet-700">🛡️</span>
              <span className="font-bold text-slate-900">FanProtect</span>
            </div>
            <ul className="text-xs text-slate-600 space-y-2">
              <li>✓ Buy and sell with confidence</li>
              <li>✓ Customer service all the way to your seat</li>
              <li>✓ Every order is 100% guaranteed</li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 mb-3">Our Company</div>
            <ul className="text-sm text-slate-600 space-y-2">
              <li>About Us</li>
              <li>Open Distribution</li>
              <li>Investors</li>
              <li className="text-violet-700 font-semibold">Careers</li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 mb-3">Have Questions?</div>
            <ul className="text-sm text-slate-600 space-y-2">
              <li>Help Centre</li>
              <li>Gift Cards</li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 mb-3">
              Live events all over the world
            </div>
            <div className="border border-slate-200 rounded-xl p-3 text-xs space-y-1 text-slate-600">
              <div>🇺🇸 United States</div>
              <div>English (UK) · US$</div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8 text-[11px] text-slate-500 leading-relaxed">
          © 2000–2026 StubHub. All Rights Reserved.
          <span className="block mt-1 text-violet-700 font-semibold">
            Demo · StubHub-inspired surface for the FanFlow AI walkthrough. Only the World Cup card advances.
          </span>
        </div>
      </footer>
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
    <div className="min-h-screen relative">
      <AmbientBackdrop />
      <NavBar compact />

      {/* === Purple hero strip with stadium photo backdrop ========== */}
      <div className="relative overflow-hidden">
        {/* Real stadium photograph with deep purple wash */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1522778526097-ce0a22ceb253?w=1600&h=900&fit=crop')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-violet-900/85 via-violet-800/85 to-violet-50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(217,70,239,0.4),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.7),transparent_70%)]" />
        {/* Floating light particles */}
        {!reduced && (
          <>
            <motion.div
              className="absolute top-10 left-1/4 w-2 h-2 rounded-full bg-white/70 blur-sm"
              animate={{ y: [0, -20, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute top-20 right-1/3 w-3 h-3 rounded-full bg-fuchsia-300/80 blur-sm"
              animate={{ y: [0, -25, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            />
            <motion.div
              className="absolute top-32 left-2/3 w-2 h-2 rounded-full bg-white/60 blur-sm"
              animate={{ y: [0, -15, 0], opacity: [0.3, 0.9, 0.3] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            />
          </>
        )}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 relative">
          <button onClick={onBack} className="text-xs text-slate-500 hover:text-slate-700 mb-3">
            ← Back to discovery
          </button>
          <div className="grid lg:grid-cols-[1fr_auto] gap-4 items-center pt-2">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-200">
                Discover
              </div>
              <h1 className="text-[44px] sm:text-6xl lg:text-7xl xl:text-[88px] font-extrabold text-white tracking-[-0.03em] leading-[0.95] mt-3 drop-shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
                World Cup
                <br />
                <ShimmerTitle>Tickets</ShimmerTitle>
              </h1>
              <div className="text-sm text-white/90 mt-4 flex items-center gap-2 drop-shadow-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse" />
                <span className="font-bold tabular-nums">70,962</span> people viewing World Cup events in the past hour
              </div>
            </div>
            <motion.div
              initial={reduced ? false : { opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="hidden lg:flex items-start gap-3 rounded-2xl bg-white/95 backdrop-blur-md border border-white p-4 max-w-xs shadow-[0_20px_60px_-12px_rgba(124,58,237,0.6)]"
            >
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white flex items-center justify-center text-base flex-shrink-0 shadow-lg">
                ✨
              </span>
              <div className="min-w-0">
                <div className="font-bold text-slate-900 text-sm leading-tight">FanFlow AI</div>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                  Real-time arrival intelligence for a smoother event day.
                </p>
                <div className="text-[10px] font-bold text-violet-700 mt-1.5">Learn how it works →</div>
              </div>
            </motion.div>
          </div>

          <div className="flex flex-wrap gap-2 mt-6">
            {['📍 Denton, TX', 'Team', 'All Rounds', 'All dates', 'Parking', 'Price'].map((f) => (
              <span
                key={f}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/95 backdrop-blur border border-white/60 text-xs font-semibold text-slate-700 shadow-lg"
              >
                {f} <span className="text-slate-400">▾</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* === FanFlow AI Intelligence Preview with stadium graphic === */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-5"
        >
          <GlassCard className="p-5 sm:p-6">
            <div className="grid lg:grid-cols-[1fr_auto] gap-4 items-center">
              <div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="kicker text-violet-700">FanFlow AI Intelligence Preview</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-violet-100 border border-violet-200 text-[9px] font-bold uppercase tracking-wider text-violet-700">
                    Beta
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/30 border border-amber-200 p-3">
                    <div className="text-[10px] text-amber-800 uppercase tracking-wider font-bold">Expected entry load</div>
                    <div className="text-base font-bold text-amber-900 mt-1">{MARIA_PLAN.expectedLoad}</div>
                    <div className="text-[10px] text-amber-800/70 mt-0.5">Manageable traffic expected</div>
                  </div>
                  <div className="rounded-xl bg-gradient-to-br from-violet-50 to-violet-100/30 border border-violet-200 p-3">
                    <div className="text-[10px] text-violet-800 uppercase tracking-wider font-bold">Peak arrival window</div>
                    <div className="text-base font-bold text-violet-900 mt-1 font-mono">{MARIA_PLAN.peakWindow}</div>
                    <div className="text-[10px] text-violet-800/70 mt-0.5">Plan to arrive within this window</div>
                  </div>
                  <div className="rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/30 border border-slate-200 p-3">
                    <div className="text-[10px] text-slate-700 uppercase tracking-wider font-bold flex items-center gap-1">
                      <span>🔒</span> Live signals
                    </div>
                    <div className="text-base font-bold text-slate-900 mt-1">Unlock after checkout</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Real-time updates on event day</div>
                  </div>
                </div>
              </div>
              <div className="hidden lg:flex flex-shrink-0">
                <StadiumIllustration size={180} />
              </div>
            </div>
          </GlassCard>
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

        {/* === "Why fans choose FanFlow AI" sidebar callout ========== */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-6"
        >
          <GlassCard className="p-5 sm:p-6">
            <div className="kicker text-violet-700 mb-3">Why fans choose FanFlow AI</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: '🛡️', title: 'Smarter arrival planning', body: 'AI predicts traffic and crowd flow to help you arrive on time.' },
                { icon: '📡', title: 'Live event day signals', body: 'Real-time updates on gates, congestion, and more.' },
                { icon: '🔓', title: 'Unlocks after checkout', body: 'Exclusive details available only to ticket holders.' },
              ].map((b) => (
                <div key={b.title} className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-100 to-violet-50 border border-violet-200 flex items-center justify-center text-base flex-shrink-0">
                    {b.icon}
                  </span>
                  <div>
                    <div className="font-bold text-slate-900 text-sm leading-tight">{b.title}</div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-snug">{b.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-violet-100/70 text-xs text-slate-600 flex items-center justify-between flex-wrap gap-2">
              <span>Trusted by fans. Powered by AI.</span>
              <a className="font-semibold text-violet-700 hover:underline" href="#">
                How FanFlow AI works →
              </a>
            </div>
          </GlassCard>
        </motion.div>

        {/* Trust strip — same as bottom of /discover */}
        <div className="mt-6">
          <TrustStrip items={TRUST_ITEMS} />
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
  void setSelected // currently always selected; setSelected kept for future seat-swap UI
  return (
    <div className="min-h-screen relative">
      <AmbientBackdrop />
      <NavBar compact />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <button onClick={onBack} className="text-xs text-slate-500 hover:text-slate-700 mb-3">
          ← Back to listing
        </button>

        {/* === Breadcrumb + Headline + High Demand summary ============ */}
        <div className="grid lg:grid-cols-[1fr_auto] gap-3 items-start">
          <div>
            <div className="kicker text-violet-700">FIFA World Cup 2026™</div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-3 flex-wrap">
              World Cup Final
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-[10px] font-bold uppercase tracking-wider text-violet-700">
                ✨ FanFlow AI
              </span>
            </h1>
            <div className="text-sm text-slate-600 mt-2 flex flex-wrap items-center gap-2">
              <span>MetLife Stadium · East Rutherford, NJ</span>
              <span className="text-slate-300">·</span>
              <span className="font-mono">Sun, Jul 19 · 7:00 PM · Final</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
              {[
                { n: '1', label: 'Choose Event', done: true },
                { n: '2', label: 'Seat Map & Eligibility', active: true },
                { n: '3', label: 'Confirm & Checkout' },
              ].map((s, i, arr) => (
                <span key={s.n} className="inline-flex items-center gap-1.5">
                  <span
                    className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold ${
                      s.active
                        ? 'bg-violet-600 text-white'
                        : s.done
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {s.n}
                  </span>
                  <span className={s.active ? 'text-violet-700 font-bold' : ''}>{s.label}</span>
                  {i < arr.length - 1 && <span className="text-slate-300 mx-1">›</span>}
                </span>
              ))}
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3 rounded-2xl bg-white/85 backdrop-blur border border-violet-200 px-4 py-3">
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                🔥 High demand
              </div>
              <div className="text-xs text-slate-600">Tickets are moving fast</div>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <ConfidenceRing value={95} size={64} label="95%" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-700">95% Confidence</div>
              <div className="text-[10px] text-slate-500">Great arrival experience</div>
            </div>
          </div>
        </div>

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
// Stage 4: Ticket confirmed — premium cinematic version
// ─────────────────────────────────────────────────────────────────────

function StageConfirmed({ onAdvance, onBack }: { onAdvance: () => void; onBack: () => void }) {
  const reduced = useReducedMotion()
  return (
    <div className="min-h-screen relative">
      <AmbientBackdrop />
      <NavBar compact />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <button onClick={onBack} className="text-xs text-slate-500 hover:text-slate-700 mb-6">
          ← Back to seat selection
        </button>

        {/* === MASSIVE Headline + glowing checkmark ================== */}
        <div className="text-center mb-12 sm:mb-16">
          <motion.div
            className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.18em] text-violet-700 mb-4"
            initial={reduced ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            Ticket Confirmed
          </motion.div>
          <motion.h1
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-[44px] sm:text-6xl lg:text-7xl xl:text-[88px] font-extrabold tracking-[-0.03em] leading-[0.95]"
          >
            <ShimmerTitle>FanFlow Unlocked</ShimmerTitle>{' '}
            <motion.span
              className="inline-block text-fuchsia-500"
              animate={reduced ? undefined : { rotate: [0, -8, 8, -4, 0], scale: [1, 1.2, 1] }}
              transition={reduced ? undefined : { duration: 1.6, delay: 0.6, ease: 'easeInOut', repeat: Infinity, repeatDelay: 2.5 }}
            >
              ✨
            </motion.span>
          </motion.h1>

          {/* MUCH bigger checkmark with multi-layer glow + sparkle burst */}
          <div className="relative inline-flex items-center justify-center mt-10 sm:mt-12 mb-2">
            <SparkleBurst count={18} />
            {!reduced && (
              <>
                <motion.span
                  className="absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full bg-fuchsia-400/30 blur-3xl"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1.3, opacity: 1 }}
                  transition={{ duration: 1.5, delay: 0.3, ease: 'easeOut' }}
                />
                <motion.span
                  className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-violet-500/30 blur-2xl"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 1 }}
                  transition={{ duration: 1.2, delay: 0.35, ease: 'easeOut' }}
                />
                <motion.span
                  className="absolute w-28 h-28 sm:w-36 sm:h-36 rounded-full border-2 border-violet-400/60"
                  initial={{ scale: 0.9, opacity: 0.8 }}
                  animate={{ scale: 1.8, opacity: 0 }}
                  transition={{ duration: 2.2, delay: 0.4, repeat: 1, ease: 'easeOut' }}
                />
                <motion.span
                  className="absolute w-28 h-28 sm:w-36 sm:h-36 rounded-full border-2 border-fuchsia-400/60"
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{ scale: 2.2, opacity: 0 }}
                  transition={{ duration: 2.6, delay: 0.8, repeat: 1, ease: 'easeOut' }}
                />
              </>
            )}
            <motion.div
              className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-br from-violet-500 via-violet-600 to-fuchsia-600 flex items-center justify-center shadow-[0_20px_60px_-12px_rgba(124,58,237,0.8)] ring-4 ring-white/60"
              initial={reduced ? false : { scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.65, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.svg viewBox="0 0 24 24" className="w-14 h-14 sm:w-20 sm:h-20 text-white">
                <motion.path
                  d="M4 12.5l5 5L20 6.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={reduced ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, delay: 0.75, ease: [0.16, 1, 0.3, 1] }}
                />
              </motion.svg>
            </motion.div>
          </div>
        </div>

        {/* === Iridescent ticket card ================================ */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0, ease: [0.16, 1, 0.3, 1] }}
          className="relative max-w-2xl mx-auto rounded-3xl overflow-hidden shadow-[0_24px_60px_-20px_rgba(124,58,237,0.4)]"
        >
          {/* Layered gradient backdrop */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-violet-200" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,rgba(217,70,239,0.25),transparent_60%),radial-gradient(ellipse_at_30%_80%,rgba(99,102,241,0.20),transparent_60%)]" />

          <div className="relative grid grid-cols-[1fr_auto] items-stretch">
            {/* Left: ticket details */}
            <div className="p-6 sm:p-8">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-700 opacity-80">
                FIFA World Cup 2026™
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">
                World Cup Final
              </div>
              <div className="text-sm text-slate-600 mt-1">
                MetLife Stadium · East Rutherford, NJ
              </div>
              <div className="text-xs text-slate-500 mt-2 flex items-center gap-2 flex-wrap">
                <span className="font-mono">📅 Sat, Jul 19</span>
                <span>·</span>
                <span className="font-mono">⏰ 7:00 PM</span>
                <span>·</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/70 border border-violet-200 text-[10px] font-bold uppercase tracking-wider text-violet-700">
                  🏆 Final
                </span>
              </div>
              <div className="mt-6 pt-5 border-t border-dashed border-violet-300/60 grid grid-cols-3 gap-3">
                {[
                  { k: 'Section', v: MARIA_PLAN.section },
                  { k: 'Row', v: MARIA_PLAN.row },
                  { k: 'Tickets', v: String(MARIA_PLAN.qty) },
                ].map((c) => (
                  <div key={c.k}>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-700/70">
                      {c.k}
                    </div>
                    <div className="font-bold text-violet-700 text-2xl sm:text-3xl mt-0.5 font-mono">
                      {c.v}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stadium graphic + perforation + barcode */}
            <div className="relative flex items-center pr-3 sm:pr-4">
              <div className="hidden sm:block opacity-50 -mr-4">
                <StadiumIllustration size={140} showPin={false} />
              </div>
              {/* Perforation line */}
              <div
                aria-hidden="true"
                className="h-full w-px border-l-2 border-dashed border-violet-300/70 mx-2"
              />
              {/* Barcode strip */}
              <div className="flex flex-col items-center gap-1.5 py-6 px-2 sm:px-3">
                <div className="flex gap-[1.5px]" aria-hidden="true">
                  {[2, 1, 3, 1, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 1, 2, 1].map((w, i) => (
                    <span
                      key={i}
                      className="h-20 sm:h-24 bg-slate-900/85 rounded-sm"
                      style={{ width: `${w}px` }}
                    />
                  ))}
                </div>
                <div className="text-[8px] font-mono text-slate-500 tracking-widest mt-1">
                  TK-MARIA-001
                </div>
              </div>
            </div>
          </div>

          {/* Shimmer sweep */}
          {!reduced && (
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent"
              initial={{ x: '-100%' }}
              animate={{ x: '400%' }}
              transition={{ duration: 1.6, delay: 1.6, ease: 'easeOut' }}
            />
          )}
        </motion.div>

        {/* === Tagline =============================================== */}
        <motion.p
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.6 }}
          className="text-center text-base sm:text-lg font-semibold text-slate-700 mt-8 sm:mt-10 max-w-md mx-auto"
        >
          Your ticket gets you in. FanFlow helps you arrive ready.
        </motion.p>

        {/* === Four numbered module cards ============================ */}
        <div className="mt-6 sm:mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {UNLOCK_MODULES.map((m, i) => (
            <motion.div
              key={m.id}
              initial={reduced ? false : { opacity: 0, y: 14, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.5,
                delay: reduced ? 0 : 2.0 + i * 0.15,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative rounded-2xl bg-white/80 backdrop-blur-sm border border-violet-100 shadow-[0_4px_20px_-8px_rgba(124,58,237,0.15)] p-4 sm:p-5"
            >
              {/* Numbered badge floating at top */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white text-xs font-bold flex items-center justify-center shadow-md">
                {i + 1}
              </div>
              <div className="text-center pt-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-violet-100 to-violet-50 border border-violet-200 flex items-center justify-center text-xl mb-2">
                  {m.icon}
                </div>
                <div className="font-bold text-sm text-slate-900 leading-tight">{m.title}</div>
                <div className="text-[11px] text-slate-500 mt-1 leading-snug">{m.sub}</div>
              </div>
              {!reduced && <Shimmer />}
            </motion.div>
          ))}
        </div>

        {/* === Ticket companion entry points ============================
            FanFlow is not a separate page — it's attached to the ticket
            lifecycle. These 4 tiles show where it appears across the
            confirmation flow. My Tickets is a real route; the other
            three are concept mocks (Wallet/email/push need provider
            integration we don't have in a 3-day prototype). */}
        {/* === Horizontal "FanFlow is with you" strip ================ */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: reduced ? 0 : 3.0 }}
          className="mt-8 sm:mt-10"
        >
          <GlassCard className="p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] items-center gap-4 sm:gap-6">
              <div className="sm:max-w-[14rem]">
                <div className="font-bold text-slate-900 text-sm leading-tight">
                  FanFlow is with you
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">every step of the way</div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: '🎟️', label: 'My Tickets', sub: 'Access in your account anytime.', tone: 'real' as const, href: '/my-tickets' },
                  { icon: '✉️', label: 'Confirmation Email', sub: 'Details + FanFlow tools delivered to you.' },
                  { icon: '💳', label: 'Wallet Companion', sub: 'Syncs to your mobile wallet for easy access.' },
                  { icon: '🔔', label: 'Pre-event Update', sub: 'Timely reminders & updates as event day approaches.' },
                ].map((m) => {
                  const Inner = (
                    <div className="flex items-start gap-2.5">
                      <span className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-100 to-violet-50 border border-violet-200 flex items-center justify-center text-base flex-shrink-0">
                        {m.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs leading-tight">
                            {m.label}
                          </span>
                          {m.tone === 'real' ? (
                            <span className="inline-flex items-center px-1.5 py-0 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold uppercase tracking-wider">
                              real
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0 rounded-full bg-slate-100 text-slate-600 text-[9px] font-bold uppercase tracking-wider">
                              demo
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{m.sub}</p>
                      </div>
                    </div>
                  )
                  return m.href ? (
                    <Link key={m.label} href={m.href} className="hover:opacity-80 transition">
                      {Inner}
                    </Link>
                  ) : (
                    <div key={m.label}>{Inner}</div>
                  )
                })}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* === Big gradient CTA + secondary link ===================== */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: reduced ? 0 : 3.5 }}
          className="mt-8 sm:mt-10 max-w-2xl mx-auto"
        >
          <button
            onClick={onAdvance}
            className="group relative w-full overflow-hidden rounded-full bg-gradient-to-r from-violet-600 via-violet-700 to-fuchsia-600 text-white font-bold text-base sm:text-lg min-h-[60px] sm:min-h-[64px] shadow-[0_12px_32px_-8px_rgba(124,58,237,0.5)] hover:shadow-[0_16px_40px_-8px_rgba(124,58,237,0.6)] transition-shadow"
          >
            <span className="relative z-10 inline-flex items-center justify-center gap-2.5">
              Build my event day plan
              <motion.span
                className="inline-block text-base"
                animate={reduced ? undefined : { rotate: [0, -15, 15, -8, 0] }}
                transition={reduced ? undefined : { duration: 1.6, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
              >
                ✨
              </motion.span>
            </span>
            {!reduced && (
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ['-100%', '400%'] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.5 }}
              />
            )}
          </button>
          <div className="text-center mt-3">
            <Link
              href="/event/wc2026-final/hub"
              className="text-xs text-slate-500 hover:text-violet-700 transition"
            >
              Or open the real Event Day Hub →
            </Link>
          </div>
          <p className="text-[11px] text-slate-500 text-center mt-4 leading-relaxed flex items-center justify-center gap-1.5">
            <span className="text-emerald-600">🔒</span>
            100% Secure Checkout. Your data is always protected.
          </p>
          <p className="text-[10px] text-slate-400 text-center mt-1 leading-relaxed">
            Always follow venue signage and staff instructions. FanFlow provides guidance, not emergency response.
          </p>
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
    <div className="min-h-screen relative">
      <AmbientBackdrop />
      <NavBar compact />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <button onClick={onBack} className="text-xs text-slate-500 hover:text-slate-700 mb-6">
          ← Back to confirmation
        </button>

        {/* === Headline + stadium ambient ============================ */}
        <div className="relative text-center mb-8 sm:mb-10">
          {/* Stadium illustration absolutely positioned behind */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/4 sm:-translate-x-1/2 opacity-30 sm:opacity-40 pointer-events-none hidden md:block">
            <StadiumIllustration size={200} showPin={false} />
          </div>
          <motion.div
            initial={reduced ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-200 mb-4"
          >
            <span className="text-base">✨</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-violet-700">
              FanFlow AI · Concierge
            </span>
          </motion.div>
          <motion.h2
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-[40px] sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-slate-900 tracking-[-0.03em] leading-[0.95]"
          >
            FanFlow is{' '}
            <ShimmerTitle>building your plan</ShimmerTitle>
          </motion.h2>
          <motion.p
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-base sm:text-lg text-slate-600 mt-5 max-w-2xl mx-auto leading-relaxed"
          >
            Our multi-layer reasoning engine analyzes your ticket, venue context, and
            live signals to create the smartest way for you to arrive.
          </motion.p>
        </div>

        {/* === Two-column: steps card + side intelligence panel ====== */}
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5 sm:gap-6">
          <GlassCard className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500" />
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

            {/* Bottom "Rules decide. AI only explains." pinned line */}
            <div className="pt-4 border-t border-violet-100/70 flex items-center justify-center gap-2 text-[11px] text-slate-500">
              <span>🔒</span>
              <span className="font-semibold">Rules decide the plan. AI only explains.</span>
            </div>
          </div>
          </GlassCard>

          {/* === Right-side intelligence panel ====================== */}
          <div className="space-y-4">
            {/* Confidence meter */}
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <GlassCard className="p-4 sm:p-5">
                <div className="flex items-start gap-3 mb-3">
                  <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-100 to-violet-50 border border-violet-200 flex items-center justify-center text-base flex-shrink-0">
                    🛡️
                  </span>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">Confidence Meter</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Entry-day arrival certainty
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <ConfidenceRing value={MARIA_PLAN.confidence} size={100} label="Plan score" />
                  <div className="flex-1">
                    <LivePulseBars count={14} height={56} delay={0.4} />
                    <div className="text-[10px] text-slate-500 mt-1.5 font-mono tabular-nums">
                      Updated 10:20:14 PM
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* Live pulse summary */}
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
            >
              <GlassCard className="p-4 sm:p-5">
                <div className="font-bold text-slate-900 text-sm mb-1">Live Pulse</div>
                <div className="text-[11px] text-slate-500 mb-3">
                  Real-time signals shaping your plan
                </div>
                <LivePulseBars count={22} height={48} delay={0.5} />
                <div className="grid grid-cols-3 gap-2 mt-3 text-[10px]">
                  {[
                    { dot: 'bg-emerald-500', label: 'Traffic' },
                    { dot: 'bg-violet-500', label: 'Crowd' },
                    { dot: 'bg-fuchsia-500', label: 'Transit' },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${l.dot}`} />
                      <span className="text-slate-600 font-semibold">{l.label}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>

            {/* AI Explanation card — appears when scoring finishes */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={tick >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.55 }}
            >
              <GlassCard className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">✨</span>
                  <div className="font-bold text-slate-900 text-sm">AI Explanation</div>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Gate 3 has the highest confidence: lighter foot traffic, direct transit
                  access, and proximity to your Section 117. Leaving by{' '}
                  <span className="font-mono font-bold">{MARIA_PLAN.leaveBy}</span> balances
                  arrival timing with current congestion trends.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    ✓ Plan optimal
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Low risk
                  </span>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>

        {/* === Final hand-off card — big gradient CTA ================ */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={allDone ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 sm:mt-8 max-w-3xl mx-auto rounded-3xl overflow-hidden relative bg-gradient-to-br from-violet-600 via-violet-700 to-fuchsia-700 text-white p-6 sm:p-7 shadow-[0_20px_60px_-20px_rgba(124,58,237,0.5)]"
        >
          <div className="absolute -right-10 -top-10 opacity-20 hidden sm:block">
            <StadiumIllustration size={220} showPin={false} />
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">✓</span>
              <div className="kicker !text-white/80">Plan ready</div>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight">
              Your event day plan is ready.
            </h3>
            <p className="text-sm text-white/80 mt-1">
              {MARIA_PLAN.gate} · Leave by {MARIA_PLAN.leaveBy} · Arrive at {MARIA_PLAN.arriveBy}.
            </p>
            <button
              onClick={onAdvance}
              className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-violet-700 font-bold text-sm hover:bg-violet-50 transition shadow-md"
            >
              See your Event Day Hub preview
              <span>→</span>
            </button>
            <p className="text-[11px] text-white/70 mt-3">
              Always follow venue signage and staff instructions.
            </p>
          </div>
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
    <div className="min-h-screen relative">
      <AmbientBackdrop />
      <NavBar compact />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-5 sm:space-y-6">
        <button onClick={onBack} className="text-xs text-slate-500 hover:text-slate-700">
          ← Back to building
        </button>

        {/* === Premium hero ====================================== */}
        <div className="relative grid lg:grid-cols-[1.5fr_1fr] gap-6 items-center mt-2 mb-2">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-700">
              Premium Hub Preview
            </div>
            <h1 className="text-[44px] sm:text-6xl lg:text-7xl xl:text-[84px] font-extrabold text-slate-900 tracking-[-0.03em] mt-3 leading-[0.95]">
              You're all set
              <br />
              for <ShimmerTitle>Event Day</ShimmerTitle>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 mt-4 max-w-xl leading-relaxed flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Everything is aligned for a smooth arrival.
              </span>
              <span>Here's your personalized plan.</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-[10px] font-bold uppercase tracking-wider text-violet-700">
                ✨ Vision route
              </span>
            </p>
          </div>
          <div className="hidden lg:flex justify-end">
            <StadiumIllustration size={320} />
          </div>
        </div>

        {/* === Event card — premium quick info row ================= */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <GlassCard className="p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto_auto_auto_auto] gap-3 sm:gap-4 items-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-2xl flex-shrink-0">
                🏆
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm sm:text-base">
                  FIFA World Cup 2026™ Final
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Sat, Jul 19 · 7:00 PM · MetLife Stadium · East Rutherford, NJ
                </div>
              </div>
              {[
                { k: 'Tickets', v: `${MARIA_PLAN.qty}`, sub: `Section ${MARIA_PLAN.section}, Row ${MARIA_PLAN.row}` },
                { k: 'Entry', v: 'Mobile', sub: '2 Adults, 1 Child' },
                { k: 'Weather', v: '🌤 78°F', sub: 'Clear skies' },
                { k: 'Parking', v: 'Lot A', sub: 'Premium Parking' },
              ].map((c) => (
                <div key={c.k} className="hidden sm:block">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{c.k}</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{c.v}</div>
                  <div className="text-[10px] text-slate-500">{c.sub}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* === Arrival Plan + Event Intelligence side-by-side ====== */}
        <div className="grid lg:grid-cols-2 gap-5">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <GlassCard className="p-5 sm:p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-violet-600">👑</span>
                  <div className="kicker text-violet-700">Your arrival plan</div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Recommended for you
                </span>
              </div>
              <div className="grid grid-cols-[1fr_auto] items-center gap-4">
                <div className="space-y-2">
                  {[
                    { icon: '🚗', label: 'Leave by', value: MARIA_PLAN.leaveBy, sub: 'From Home' },
                    { icon: '🚶', label: 'Arrive at', value: MARIA_PLAN.arriveBy, sub: 'Including walk time' },
                    { icon: '📍', label: 'Recommended Gate', value: MARIA_PLAN.gate, sub: 'Shortest walk', emphasis: true },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center gap-3 py-1.5">
                      <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-100 to-violet-50 border border-violet-200 flex items-center justify-center text-base flex-shrink-0">
                        {r.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {r.label}
                        </div>
                        <div className={`font-bold text-base ${r.emphasis ? 'text-violet-700' : 'text-slate-900'}`}>
                          {r.value}
                        </div>
                        <div className="text-[10px] text-slate-500">{r.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col items-center gap-2">
                  <ConfidenceRing value={MARIA_PLAN.confidence} size={108} label="Confidence" />
                  <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                    High confidence
                  </div>
                </div>
              </div>
              <ul className="mt-4 pt-4 border-t border-violet-100/70 grid grid-cols-2 gap-1.5 text-[11px] text-slate-700">
                {[
                  '✓ Traffic is light',
                  '✓ Shorter lines expected',
                  '✓ Optimal gate choice',
                  '✓ Real-time staff input',
                ].map((b) => (
                  <li key={b} className="font-semibold">{b}</li>
                ))}
              </ul>
            </GlassCard>
          </motion.div>

          {/* Event Intelligence — moved here for the side-by-side layout */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <GlassCard className="p-5 sm:p-6 h-full">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="kicker text-violet-700">Event intelligence</div>
                  <h3 className="font-bold text-slate-900 text-sm mt-0.5">Conditions at your gate</h3>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Live updates
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/40 border border-amber-200 p-3">
                  <div className="text-[9px] uppercase tracking-wider text-amber-800 font-semibold">Expected load</div>
                  <div className="text-sm font-bold text-amber-900 mt-1">{MARIA_PLAN.expectedLoad}</div>
                  <div className="text-[10px] text-amber-800/70 mt-0.5">Manageable traffic</div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-violet-50 to-violet-100/40 border border-violet-200 p-3">
                  <div className="text-[9px] uppercase tracking-wider text-violet-800 font-semibold">Peak window</div>
                  <div className="text-sm font-bold text-violet-900 mt-1 font-mono">{MARIA_PLAN.peakWindow}</div>
                  <div className="text-[10px] text-violet-800/70 mt-0.5">Plan to arrive within</div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/40 border border-emerald-200 p-3">
                  <div className="text-[9px] uppercase tracking-wider text-emerald-800 font-semibold">Fan pulse</div>
                  <div className="text-sm font-bold text-emerald-900 mt-1">{MARIA_PLAN.fanPulse.smooth}% smooth</div>
                  <div className="text-[10px] text-emerald-800/70 mt-0.5">Happy &amp; relaxed</div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-sky-50 to-sky-100/40 border border-sky-200 p-3">
                  <div className="text-[9px] uppercase tracking-wider text-sky-800 font-semibold">Staff update</div>
                  <div className="text-sm font-bold text-sky-900 mt-1">Weighted 3×</div>
                  <div className="text-[10px] text-sky-800/70 mt-0.5">More reliable insights</div>
                </div>
              </div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-start gap-2">
                <span className="text-emerald-700 text-sm">👮</span>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Staff update applied
                  </div>
                  <p className="text-xs text-emerald-900 mt-1 leading-snug">
                    &ldquo;Gate 3 moving smoothly.&rdquo; Confidence increased for your route.
                  </p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* === Live Pulse — full-width pulse signal chart ============ */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <GlassCard className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="kicker text-violet-700">Live pulse</div>
                <h3 className="font-bold text-slate-900 text-sm mt-0.5">
                  Real-time conditions around the venue
                </h3>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <ConfidenceRing value={MARIA_PLAN.confidence} size={72} label="Overall" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { k: 'Traffic', v: 'Light', dot: 'bg-emerald-500' },
                { k: 'Entry Lines', v: 'Moderate', dot: 'bg-amber-500' },
                { k: 'Concessions', v: 'Smooth', dot: 'bg-emerald-500' },
                { k: 'Restrooms', v: 'Low Wait', dot: 'bg-emerald-500' },
                { k: 'Exits', v: 'Clear', dot: 'bg-emerald-500' },
              ].map((p, i) => (
                <motion.div
                  key={p.k}
                  initial={reduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.07 }}
                  className="rounded-xl bg-white/60 border border-slate-200/70 p-3"
                >
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{p.k}</div>
                  <div className="flex items-center gap-1.5 mt-1.5 mb-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                    <span className="text-sm font-bold text-slate-900">{p.v}</span>
                  </div>
                  <LivePulseBars count={8} height={28} delay={0.4 + i * 0.05} />
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* === Nearby support + Context-aware support side-by-side === */}
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <GlassCard className="p-5 sm:p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="kicker text-violet-700">Nearby support</div>
                  <h3 className="font-bold text-slate-900 text-sm mt-0.5">Help is close by</h3>
                </div>
                <button className="text-xs font-semibold text-sky-600 hover:underline">
                  View on map →
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'family', icon: '👶', label: 'Family Services', sub: '2 min walk', tone: 'bg-violet-600' },
                  { id: 'aid', icon: '➕', label: 'First Aid', sub: '3 min walk', tone: 'bg-rose-600' },
                  { id: 'quiet', icon: '🧩', label: 'Quiet Space', sub: '3 min walk', tone: 'bg-emerald-600' },
                  { id: 'access', icon: '♿', label: 'Accessibility', sub: '2 min walk', tone: 'bg-sky-600' },
                  { id: 'restroom', icon: '🚻', label: 'Family Restroom', sub: '2 min walk', tone: 'bg-slate-600' },
                ].map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={reduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.4 + i * 0.05 }}
                    className="rounded-xl bg-white/60 border border-slate-200/70 p-3 text-center"
                  >
                    <span
                      className={`inline-flex w-10 h-10 rounded-full ${s.tone} text-white items-center justify-center text-base mx-auto mb-2`}
                    >
                      {s.icon}
                    </span>
                    <div className="text-xs font-bold text-slate-900 leading-tight">{s.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{s.sub}</div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Context-aware support card with floating headset graphic */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <GlassCard className="relative p-5 sm:p-6 h-full overflow-hidden">
              <div className="kicker text-violet-700">Context-aware support</div>
              <h3 className="font-bold text-slate-900 text-base mt-1">We've got your back</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Personalized help based on your tickets, plans, and real-time conditions.
              </p>
              <button className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition">
                🎧 One tap for help
              </button>
              {/* Floating headset glow */}
              <motion.div
                aria-hidden="true"
                className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-gradient-to-br from-violet-400/40 to-fuchsia-400/40 blur-2xl"
                animate={reduced ? undefined : { scale: [1, 1.15, 1] }}
                transition={reduced ? undefined : { duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="absolute right-2 bottom-2 w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-3xl shadow-lg">
                🎧
              </div>
              <p className="text-[10px] text-slate-400 mt-4">
                FanFlow provides guidance, not emergency response. For urgent issues call 911.
              </p>
            </GlassCard>
          </motion.div>
        </div>

        {/* === Dark hand-off card ===================================== */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.5 }}
          className="relative rounded-3xl overflow-hidden p-6 sm:p-8 text-white shadow-[0_20px_60px_-20px_rgba(15,23,42,0.5)]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-violet-900" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(124,58,237,0.4),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(217,70,239,0.2),transparent_50%)]" />
          <div className="relative grid lg:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <div className="kicker !text-white/70 mb-2">You're ready. We'll handle the rest.</div>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
                Your real-time hub is moments away.
              </h3>
              <p className="text-sm text-white/80 mt-2 max-w-md">
                We'll keep monitoring conditions and guide you in with confidence.
              </p>
              <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-white/90">
                {[
                  '✓ Real-time updates as conditions change',
                  '✓ Smarter routing around peak surges',
                  '✓ Priority alerts that matter most',
                  '✓ Cross-tab staff signals · weighted 3×',
                ].map((b) => (
                  <li key={b} className="font-semibold">{b}</li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col items-center sm:items-end gap-2 flex-shrink-0">
              <Link
                href="/event/wc2026-final/hub"
                className="inline-flex items-center justify-center min-h-[56px] px-8 rounded-full bg-white text-slate-900 font-bold text-base hover:bg-slate-100 transition shadow-md"
              >
                Open real FanFlow Hub
                <span className="ml-2">→</span>
              </Link>
              <p className="text-[11px] text-white/60 flex items-center gap-1.5">
                <span>🔒</span> Secure. Private. Yours.
              </p>
            </div>
          </div>
        </motion.div>

        {/* === Bottom trust strip ===================================== */}
        <TrustStrip items={TRUST_ITEMS} />
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
