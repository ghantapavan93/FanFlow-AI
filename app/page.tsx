'use client'

import Link from 'next/link'

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

          {/* Right: phone preview */}
          <div className="flex justify-center lg:justify-end">
            <PhonePreview />
          </div>
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
