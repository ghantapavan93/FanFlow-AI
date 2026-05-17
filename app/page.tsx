'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'

// Positions are tuned for the EXPANDED chaos overlay (extends ~128px each
// side beyond the phone). Left-column phrases scatter to the left of the
// phone; right-column phrases to the right. Some phrases also dip into the
// top/bottom corners. Phrases at left/right 4–10% land 5–55px inside the
// overlay's edge, well clear of the phone's center column.
const ANXIETIES: { text: string; top: string; left?: string; right?: string; rotate: number; size: string; delay: number }[] = [
  // Left side
  { text: 'Where do I park?',          top: '4%',   left: '4%',   rotate: -7,  size: 'text-sm',  delay: 0.00 },
  { text: 'When does kickoff start?',  top: '22%',  left: '2%',   rotate: -3,  size: 'text-xs',  delay: 0.12 },
  { text: "Where's first aid?",        top: '40%',  left: '5%',   rotate: -10, size: 'text-sm',  delay: 0.24 },
  { text: 'How early should I leave?', top: '60%',  left: '3%',   rotate: -5,  size: 'text-sm',  delay: 0.36 },
  { text: 'Is bag check fast?',        top: '80%',  left: '6%',   rotate: -2,  size: 'text-xs',  delay: 0.48 },
  // Right side
  { text: 'Is Gate 3 accessible?',     top: '8%',   right: '4%',  rotate: 5,   size: 'text-sm',  delay: 0.06 },
  { text: 'Will my stroller fit?',     top: '28%',  right: '3%',  rotate: 8,   size: 'text-base',delay: 0.18 },
  { text: 'Can I bring water?',        top: '48%',  right: '5%',  rotate: 4,   size: 'text-xs',  delay: 0.30 },
  { text: 'Where do families enter?',  top: '68%',  right: '3%',  rotate: 6,   size: 'text-xs',  delay: 0.42 },
  { text: 'Will I miss kickoff?',      top: '88%',  right: '6%',  rotate: -4,  size: 'text-sm',  delay: 0.54 },
  // Top + bottom corner accents
  { text: "Where's the quiet space?",  top: '-1%',  left: '38%',  rotate: 3,   size: 'text-xs',  delay: 0.30 },
  { text: 'Which line is shortest?',   top: '96%',  left: '34%',  rotate: 7,   size: 'text-xs',  delay: 0.60 },
]

const PROBLEMS = [
  {
    title: 'Discovery is solved. Arrival is not.',
    body: "StubHub's ChatGPT integration already helps fans find tickets. The next 48 hours — between purchase and venue entry — is where confidence gets lost.",
  },
  {
    title: 'Every fan is different.',
    body: 'A first-time international visitor with a 6-year-old needs a different plan than a season-ticket regular. Generic venue apps don\'t know that. StubHub knows your purchase.',
  },
  {
    title: 'Confidence beats prediction.',
    body: 'Fans don\'t need an AI that pretends to predict crowds. They need a clear plan, a calm explanation, and a way to ask for help.',
  },
]

const STEPS = [
  { n: 1, title: 'Ticket Confirmed', body: 'Your purchase becomes our starting signal.' },
  { n: 2, title: 'Share Your Needs', body: 'A quick check captures your preferences.' },
  { n: 3, title: 'We Build Your Plan', body: 'Rules pick the best gate, time, and route.' },
  { n: 4, title: 'Stay Updated', body: 'Live signals from staff and fans keep it current.' },
  { n: 5, title: 'Enter Confidently', body: 'Smooth entry. Better experience.' },
]

const TRUST_PARTNERS = [
  { icon: '🎟️', title: 'StubHub', subtitle: 'Partner' },
  { icon: '📡', title: 'Staff & Fan', subtitle: 'Signals' },
  { icon: '🔒', title: 'Privacy', subtitle: 'First' },
  { icon: '🤝', title: 'Human', subtitle: 'Support' },
]

const MARIA_GIVES = [
  'Best gate for family & step-free access',
  'Leave-by time tuned to transit + buffer',
  'Quiet space and family services nearby',
  'Live updates from staff and fans',
  'Plain-language explanation of the plan',
]

function PhonePreview() {
  return (
    <div className="relative mx-auto w-[280px] sm:w-[300px]">
      <div className="rounded-[42px] bg-slate-900 p-3 shadow-[0_30px_60px_-15px_rgba(15,23,42,0.30)]">
        <div className="rounded-[32px] bg-white overflow-hidden">
          {/* Status bar */}
          <div className="flex justify-between items-center px-5 pt-3 pb-1.5 text-[10px] font-semibold text-slate-900">
            <span>9:41</span>
            <span className="flex items-center gap-1">
              <span className="text-[9px]">●●●</span>
              <span className="text-[9px]">⌧</span>
              <span className="text-[9px]">▮▮▮</span>
            </span>
          </div>

          {/* Event hero card */}
          <div className="px-3">
            <div className="relative h-28 rounded-2xl overflow-hidden bg-gradient-to-br from-violet-700 via-violet-800 to-slate-900">
              <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_60%,_rgba(255,255,255,0.4),_transparent_50%)]" />
              <div className="absolute top-2 left-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/95 text-[9px] font-bold text-slate-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Confirmed
                </span>
              </div>
              <div className="absolute bottom-2 left-3 right-3 text-white">
                <div className="text-[8px] font-bold opacity-90 tracking-[0.15em]">🏆 FIFA WORLD CUP 2026</div>
                <div className="text-sm font-bold leading-tight mt-0.5">World Cup Final</div>
              </div>
            </div>
          </div>

          {/* Countdown */}
          <div className="px-4 pt-3 pb-2">
            <div className="text-[8px] font-semibold text-slate-500 tracking-[0.15em] mb-1">TIME TO EVENT</div>
            <div className="flex gap-3 items-end">
              {[
                { n: '05', l: 'DAYS' },
                { n: '23', l: 'HRS' },
                { n: '59', l: 'MINS' },
                { n: '34', l: 'SECS' },
              ].map((x, i) => (
                <div key={i} className="text-center">
                  <div className="text-lg font-bold text-slate-900 font-mono leading-none">{x.n}</div>
                  <div className="text-[7px] text-slate-500 tracking-wider mt-0.5">{x.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Plan card */}
          <div className="mx-3 mb-3 rounded-xl border border-slate-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[8px] font-bold tracking-[0.1em] text-violet-700">YOUR ARRIVAL PLAN</span>
              <span className="text-[8px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-200">
                🟢 High
              </span>
            </div>
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Leave by</span>
                <span className="font-bold text-slate-900">11:39 PM</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Arrive at</span>
                <span className="font-bold text-slate-900">12:24 AM</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Gate</span>
                <span className="font-bold text-violet-700">Gate 3</span>
              </div>
            </div>
            <div className="mt-2 py-2 text-center rounded-lg bg-violet-600 text-white text-[10px] font-bold">
              View Full Plan →
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex justify-around items-center py-2.5 border-t border-slate-100">
            {['🏠', '📋', '🗺️', '🆘', '👤'].map((icon, i) => (
              <span key={i} className={`text-sm ${i === 0 ? 'opacity-100' : 'opacity-30'}`}>
                {icon}
              </span>
            ))}
          </div>
        </div>
      </div>
      {/* Soft ground shadow */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-6 rounded-full bg-violet-200/40 blur-2xl -z-10" />
    </div>
  )
}

function JourneyCard({
  step,
  label,
  accent = false,
  children,
}: {
  step: number
  label: string
  accent?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <div
        className={`rounded-2xl border p-3 transition ${
          accent
            ? 'border-violet-300 bg-violet-50/60'
            : 'border-slate-200 bg-slate-50'
        }`}
      >
        {/* Step badge */}
        <div className="flex items-center justify-between mb-2">
          <span
            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${
              accent
                ? 'bg-violet-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {step}
          </span>
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider ${
              accent ? 'text-violet-700' : 'text-slate-500'
            }`}
          >
            {label}
          </span>
        </div>
        {/* The visual mockup content */}
        {children}
      </div>
    </div>
  )
}

function HeroPhoneStage() {
  const reduced = useReducedMotion()

  return (
    <div
      className="relative mx-auto w-full max-w-[300px] sm:max-w-[320px]"
      aria-label="FanFlow Hub preview"
    >
      {/*
        Anxiety phrases — desktop only, never on mobile (cramping risk).
        The overlay EXTENDS BEYOND the phone container so phrases scatter
        AROUND the phone rather than being trapped inside its silhouette.
        - inset-x: -8rem (128px) each side = ~556px total overlay width
        - inset-y: -1rem (16px) each side for slight top/bottom breathing room
        overflow-hidden contains everything within the column.
        aria-hidden so screen readers skip the decorative storytelling.
      */}
      {!reduced && (
        <div
          className="hidden sm:block absolute -inset-x-32 -inset-y-4 overflow-hidden pointer-events-none select-none"
          aria-hidden="true"
        >
          {ANXIETIES.map((q, i) => (
            <motion.span
              key={i}
              className={`absolute ${q.size} font-medium text-slate-400 italic whitespace-nowrap`}
              style={{
                top: q.top,
                ...(q.left !== undefined ? { left: q.left } : {}),
                ...(q.right !== undefined ? { right: q.right } : {}),
                transformOrigin: 'center',
                willChange: 'transform, opacity',
              }}
              initial={{ opacity: 0, scale: 0.92, rotate: q.rotate }}
              animate={{
                opacity: [0, 0.7, 0.65, 0],
                scale: [0.92, 1, 1, 0.4],
                rotate: [q.rotate, q.rotate * 0.6, q.rotate * 0.2, 0],
                y: [0, -3, -1, 10],
              }}
              transition={{
                duration: 2.8,
                times: [0, 0.18, 0.7, 1],
                delay: q.delay,
                ease: 'easeInOut',
              }}
            >
              &ldquo;{q.text}&rdquo;
            </motion.span>
          ))}
        </div>
      )}

      {/*
        Phone — always visible by default (no JS dependency / no flash on hydration).
        On desktop with motion enabled, gets a gentle infinite float after the
        chaos sequence completes. On mobile or with reduced motion, stays static.
      */}
      <motion.div
        animate={reduced ? undefined : { y: [0, -8, 0] }}
        transition={
          reduced
            ? undefined
            : {
                duration: 4.5,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 3.0,
              }
        }
      >
        <PhonePreview />
      </motion.div>
    </div>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="page-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-violet-700 rounded-lg shadow-sm" />
            <span className="font-bold text-slate-900">FanFlow AI</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/staff/wc2026-final"
              className="hidden sm:inline-flex btn-ghost text-sm"
            >
              Staff Console →
            </Link>
            <Link
              href="/event/wc2026-final/hub"
              className="btn-primary !min-h-[40px] !px-4 text-sm sm:!min-h-[44px] sm:!px-5"
            >
              Open Hub →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero — side-by-side */}
      <section className="pt-12 sm:pt-16 lg:pt-20 pb-12 sm:pb-16 px-4">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left: copy + CTAs */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-700 bg-violet-100 px-3 py-1.5 rounded-full mb-6">
              Post-purchase event-day intelligence
            </div>
            <h1 className="text-[40px] leading-[1.05] sm:text-5xl lg:text-6xl font-bold tracking-tight mb-5 text-slate-900">
              Discovery <span className="text-slate-900">is solved.</span>
              <br />
              <span className="text-violet-600">Arrival is not.</span>
            </h1>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
              FanFlow AI turns your ticket confirmation into a personalized arrival plan,
              live conditions, and support that actually understands you.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 max-w-md sm:max-w-none mx-auto lg:mx-0">
              <Link
                href="/event/wc2026-final/hub"
                className="btn-primary text-base sm:!min-h-[56px] sm:px-7"
              >
                View Event Day Hub →
              </Link>
              <Link
                href="/event/wc2026-final/readiness"
                className="btn-secondary text-base sm:!min-h-[56px] sm:px-7"
              >
                Start Readiness Check
              </Link>
            </div>

            {/* Trust strip */}
            <div className="mt-10 lg:mt-12 pt-8 border-t border-slate-200">
              <div className="kicker text-center lg:text-left mb-4">
                Trusted by fans. Built for venues.
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-2">
                {TRUST_PARTNERS.map((p) => (
                  <div key={p.title} className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-700 text-base flex-shrink-0">
                      {p.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 leading-tight">
                        {p.title}
                      </div>
                      <div className="text-xs text-slate-500 leading-tight">{p.subtitle}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: chaos → plan animation */}
          <div className="flex justify-center lg:justify-end">
            <HeroPhoneStage />
          </div>
        </div>
      </section>

      {/* Journey prelude — visual storyboard mocking the real StubHub flow
          followed by the FanFlow handoff card. Each card is a static UI
          mockup, not interactive. Tells the story before scrolling further. */}
      <section className="py-12 sm:py-16 px-4 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <div className="kicker mb-3">Your journey to event day</div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 max-w-3xl mx-auto leading-tight">
              StubHub gets you the ticket.{' '}
              <span className="text-violet-700">FanFlow gets you ready.</span>
            </h2>
            <p className="text-slate-600 mt-3 text-sm sm:text-base max-w-2xl mx-auto">
              Available right after ticket confirmation. Included with your ticket experience.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* Card 1 — Browse marketplace */}
            <JourneyCard step={1} label="Browse">
              <div className="bg-white rounded-lg border border-slate-200 p-2.5 space-y-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded bg-violet-600" />
                  <div className="h-1.5 bg-slate-200 rounded flex-1" />
                </div>
                <div className="flex gap-1 flex-wrap">
                  {['NBA', 'NFL', 'World Cup', 'BTS'].map((c) => (
                    <span
                      key={c}
                      className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600"
                    >
                      {c}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div className="aspect-square rounded bg-gradient-to-br from-violet-500 to-violet-700" />
                  <div className="aspect-square rounded bg-slate-200" />
                  <div className="aspect-square rounded bg-slate-200" />
                  <div className="aspect-square rounded bg-slate-200" />
                </div>
              </div>
            </JourneyCard>

            {/* Card 2 — Event detail page */}
            <JourneyCard step={2} label="Open event">
              <div className="bg-white rounded-lg border border-slate-200 p-2.5 space-y-2">
                <div className="aspect-[16/9] rounded bg-gradient-to-br from-violet-600 via-violet-700 to-slate-900 relative overflow-hidden">
                  <div className="absolute bottom-1 left-1.5 text-white">
                    <div className="text-[7px] font-bold tracking-widest opacity-90">
                      🏆 WORLD CUP
                    </div>
                    <div className="text-[9px] font-bold leading-tight">2026 Final</div>
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-slate-900">
                    FIFA World Cup Final
                  </div>
                  <div className="text-[7px] text-slate-500">Jul 19 · MetLife Stadium</div>
                </div>
                <div className="bg-violet-600 text-white text-[8px] font-bold text-center py-1 rounded">
                  See Tickets
                </div>
              </div>
            </JourneyCard>

            {/* Card 3 — Seat map */}
            <JourneyCard step={3} label="Pick seat">
              <div className="bg-white rounded-lg border border-slate-200 p-2.5 space-y-2">
                <div className="text-[7px] font-semibold text-slate-500 uppercase tracking-wider">
                  Section
                </div>
                <svg viewBox="0 0 100 70" className="w-full h-auto">
                  <ellipse cx="50" cy="35" rx="45" ry="28" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.6" />
                  <ellipse cx="50" cy="35" rx="22" ry="12" fill="#bbf7d0" stroke="#22c55e" strokeWidth="0.5" opacity="0.8" />
                  <line x1="50" y1="23" x2="50" y2="47" stroke="#fff" strokeWidth="0.4" />
                  {/* Section 117 highlighted */}
                  <rect x="42" y="52" width="16" height="6" rx="1" fill="#7c3aed" />
                  <text x="50" y="56.4" textAnchor="middle" fontSize="3.5" fill="#fff" fontWeight="700">
                    117
                  </text>
                  {/* Nearby sections */}
                  <rect x="24" y="50" width="14" height="5" rx="1" fill="#e2e8f0" />
                  <rect x="62" y="50" width="14" height="5" rx="1" fill="#e2e8f0" />
                  <rect x="20" y="14" width="12" height="5" rx="1" fill="#e2e8f0" />
                  <rect x="68" y="14" width="12" height="5" rx="1" fill="#e2e8f0" />
                </svg>
                <div className="flex items-center justify-between text-[8px]">
                  <span className="font-semibold text-violet-700">Section 117</span>
                  <span className="font-bold text-slate-900">$1,007</span>
                </div>
              </div>
            </JourneyCard>

            {/* Card 4 — Ticket confirmed */}
            <JourneyCard step={4} label="Confirmed">
              <div className="bg-white rounded-lg border border-slate-200 p-2.5 space-y-2 flex flex-col items-center text-center">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold mt-1">
                  ✓
                </div>
                <div>
                  <div className="text-[9px] font-bold text-slate-900">Ticket Confirmed</div>
                  <div className="text-[7px] text-slate-500 mt-0.5">
                    Section 117 · Row 12 · Seat 4
                  </div>
                </div>
                <div className="w-full border-t border-dashed border-slate-200 pt-1.5">
                  <div className="text-[6px] uppercase tracking-wider text-slate-400 font-semibold">
                    Order #SH-4291
                  </div>
                </div>
              </div>
            </JourneyCard>

            {/* Card 5 — FanFlow begins (accent) */}
            <JourneyCard step={5} label="FanFlow begins" accent>
              <div className="bg-gradient-to-br from-violet-50 to-white rounded-lg border border-violet-200 p-2.5 space-y-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded bg-gradient-to-br from-violet-500 to-violet-700" />
                  <div className="text-[9px] font-bold text-slate-900">FanFlow AI</div>
                </div>
                <div className="text-[8px] font-bold text-violet-900 leading-tight">
                  Your Event Day Guide is ready
                </div>
                <div className="text-[7px] text-slate-600 leading-snug">
                  Tailored arrival, live conditions, and support — all set for your section.
                </div>
                <div className="bg-violet-600 text-white text-[8px] font-bold text-center py-1 rounded">
                  Start Readiness →
                </div>
              </div>
            </JourneyCard>
          </div>

          <p className="text-center mt-6 text-xs text-slate-500 max-w-2xl mx-auto">
            FanFlow appears after ticket confirmation. Your ticket gets you in — FanFlow helps you arrive ready.
          </p>
        </div>
      </section>

      {/* Problem */}
      <section className="py-16 sm:py-20 px-4 page-bg">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <div className="kicker mb-3">The gap</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              The 48 hours nobody owns
            </h2>
            <p className="text-slate-600 mt-3 max-w-2xl mx-auto">
              Between purchase and entry, fans are on their own. We close that gap.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
            {PROBLEMS.map((p, i) => (
              <div
                key={i}
                className="p-6 sm:p-8 card-base hover:border-slate-300 transition"
              >
                <div className="text-violet-600 text-2xl font-bold mb-3">0{i + 1}</div>
                <h3 className="font-bold text-lg sm:text-xl mb-3 text-slate-900">{p.title}</h3>
                <p className="text-slate-600 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — 5-step horizontal timeline */}
      <section className="py-16 sm:py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <div className="kicker mb-3">How it works</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              From ticket to your seat
            </h2>
            <p className="text-slate-600 mt-3 max-w-2xl mx-auto">
              Rules decide the plan. AI only explains it. Staff signals beat fan signals.
            </p>
          </div>

          <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-3">
              {STEPS.map((s, i) => (
                <div key={s.n} className="text-center relative">
                  {/* Dotted connector — desktop only, between cards */}
                  {i < STEPS.length - 1 && (
                    <div
                      className="hidden md:block absolute top-[20px] left-[calc(50%+28px)] right-[calc(-50%+28px)] border-t-2 border-dotted border-violet-300 pointer-events-none"
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative inline-block bg-white px-1.5">
                    <span className="rank-badge">{s.n}</span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm sm:text-base mt-4">
                    {s.n}. {s.title}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-[180px] mx-auto leading-relaxed">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Maria scenario */}
      <section className="py-16 sm:py-20 px-4 page-bg">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <div className="kicker text-violet-700 mb-3">Built around one real fan</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              FanFlow AI is built for every fan.
            </h2>
            <p className="text-slate-600 mt-3 max-w-2xl mx-auto">
              Families · Accessibility · Medical · Sensory · First-Timers · Every Fan.
            </p>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 grid md:grid-cols-2 gap-6 sm:gap-8">
            {/* Left: Maria intro + bullets */}
            <div>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                  M
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-lg">Meet Maria</div>
                  <div className="text-sm text-slate-600">
                    First World Cup visitor from Medellín, attending with her 6-year-old son.
                  </div>
                </div>
              </div>
              <ul className="space-y-2.5 text-sm text-slate-700">
                <li className="flex gap-2.5">
                  <span>👨‍👩‍👧</span>
                  <span>Family entrance, step-free access</span>
                </li>
                <li className="flex gap-2.5">
                  <span>🚆</span>
                  <span>Taking NJ Transit from Manhattan</span>
                </li>
                <li className="flex gap-2.5">
                  <span>🎟️</span>
                  <span>Section 117, Row 12, Seat 4</span>
                </li>
                <li className="flex gap-2.5">
                  <span>🧩</span>
                  <span>Mild crowd anxiety; prefers calm routes</span>
                </li>
              </ul>
            </div>

            {/* Right: purple checklist side panel */}
            <div className="rounded-2xl bg-violet-50 border border-violet-200 p-5 sm:p-6">
              <div className="kicker text-violet-700 mb-3">What FanFlow gives Maria</div>
              <ul className="space-y-2.5 text-sm text-slate-800">
                {MARIA_GIVES.map((item, i) => (
                  <li key={i} className="flex gap-2.5 items-start">
                    <span className="text-violet-600 font-bold mt-0.5 flex-shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Built for reliability */}
      <section className="py-12 sm:py-14 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-5">
              <span className="w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center text-base">
                🛡️
              </span>
              <div>
                <h2 className="font-bold text-slate-900 text-lg">Built for reliability</h2>
                <p className="text-sm text-slate-500">
                  Four principles the architecture is shaped around.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { title: 'Rules decide', body: 'Deterministic engine picks the gate and times.' },
                { title: 'AI explains', body: 'LLM only rewords the explanation. Never the facts.' },
                { title: 'Staff signals win', body: 'Staff updates weighted 3× over fan reports.' },
                { title: 'Fallback first', body: 'Template floor — demo works with zero API keys.' },
              ].map((p) => (
                <div
                  key={p.title}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <div className="font-bold text-slate-900 text-sm">{p.title}</div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Does / Doesn't trust panel */}
      <section className="py-14 sm:py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              What FanFlow does — and doesn't do
            </h2>
            <div className="grid sm:grid-cols-2 gap-6 text-sm">
              <div>
                <div className="font-semibold text-emerald-700 mb-2">Does</div>
                <ul className="space-y-1.5 text-slate-700">
                  <li>✓ Compute a deterministic arrival plan</li>
                  <li>✓ Pick the best gate for your section + needs</li>
                  <li>✓ Surface live staff and fan signals</li>
                  <li>✓ Route you to the right support point</li>
                </ul>
              </div>
              <div>
                <div className="font-semibold text-rose-700 mb-2">Doesn't</div>
                <ul className="space-y-1.5 text-slate-700">
                  <li>✗ Claim guaranteed times or zero waits</li>
                  <li>✗ Predict exact crowd sizes</li>
                  <li>✗ Replace venue signage or staff instructions</li>
                  <li>✗ Give medical or emergency advice — call 911</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer trust statement */}
      <section className="py-12 sm:py-14 px-4 bg-violet-50 border-y border-violet-100">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-flex w-12 h-12 rounded-full bg-violet-600 text-white items-center justify-center text-xl mb-4">
            💌
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
            Fans don't need more data. They need a plan they can trust.
          </h3>
          <p className="text-sm text-violet-700 mt-3 font-semibold">
            FanFlow AI · Clear guidance. Real support. Better arrivals.
          </p>
        </div>
      </section>

      {/* Phase-2 future hint — small, honest, no over-promising */}
      <section className="py-10 sm:py-12 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-sm flex-shrink-0">
                ›
              </span>
              <div>
                <div className="kicker mb-1">Coming later</div>
                <h3 className="font-bold text-slate-900 text-base sm:text-lg leading-tight">
                  Saved preferences, loyalty perks, and premium event-day guidance.
                </h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Future releases could remember calmer-route, family, and accessibility
                  preferences across your StubHub purchases — and offer premium
                  event-day support packages for major venues. None of that is in v1;
                  the prototype focuses on getting one journey right end-to-end.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 px-4 bg-gradient-to-r from-violet-600 to-violet-700 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-5">Experience the prototype</h2>
          <p className="text-lg sm:text-xl mb-8 opacity-90">
            One scenario. One complete journey. Live signals between fans and staff.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-md sm:max-w-none mx-auto">
            <Link
              href="/event/wc2026-final/hub"
              className="inline-flex items-center justify-center min-h-[56px] px-7 rounded-full bg-white text-violet-700 hover:bg-slate-50 active:bg-slate-100 font-bold text-base sm:text-lg transition"
            >
              Enter the Demo →
            </Link>
            <Link
              href="/staff/wc2026-final"
              className="inline-flex items-center justify-center min-h-[56px] px-7 rounded-full bg-violet-800/30 hover:bg-violet-800/50 active:bg-violet-800/60 border border-white/30 text-white font-bold text-base sm:text-lg transition"
            >
              Open Staff Console
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-slate-900 text-slate-100 text-center space-y-2">
        <p className="text-slate-400">
          Built as a product thinking exercise for StubHub's post-purchase journey.
        </p>
        <p className="text-slate-500 text-sm">
          Two-sided demo:{' '}
          <Link href="/event/wc2026-final/hub" className="underline hover:text-white">
            Fan Hub
          </Link>{' '}
          ·{' '}
          <Link href="/event/wc2026-final/readiness" className="underline hover:text-white">
            Readiness Check
          </Link>{' '}
          ·{' '}
          <Link href="/event/wc2026-final/guide" className="underline hover:text-white">
            Arrival Guide
          </Link>{' '}
          ·{' '}
          <Link href="/event/wc2026-final/venue-map" className="underline hover:text-white">
            Venue Map
          </Link>{' '}
          ·{' '}
          <Link href="/staff/wc2026-final" className="underline hover:text-white">
            Staff Console
          </Link>
        </p>
      </footer>
    </div>
  )
}
