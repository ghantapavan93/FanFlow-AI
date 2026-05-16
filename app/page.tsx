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
  {
    n: '1',
    title: 'Confirm',
    body: 'Right after checkout, the confirmation becomes an Event Day Hub — countdown, gate, leave-by time.',
  },
  {
    n: '2',
    title: 'Personalize',
    body: 'A 90-second Readiness Check captures transport, group, and accessibility needs.',
  },
  {
    n: '3',
    title: 'Arrive',
    body: 'Rules engine derives the plan. AI writes a calm explanation. Staff and fan signals refine it in real time.',
  },
]

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
            <Link href="/event/wc2026-final/hub" className="btn-primary !min-h-[40px] !px-4 text-sm sm:!min-h-[44px] sm:!px-5">
              Open Hub →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-16 sm:pt-20 pb-20 sm:pb-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-700 bg-violet-100 px-3 py-1.5 rounded-full mb-6">
            Post-purchase event-day intelligence
          </div>
          <h1 className="text-[40px] leading-[1.05] sm:text-5xl md:text-6xl font-bold tracking-tight mb-5 text-slate-900">
            From ticket confirmed to
            <span className="text-violet-600"> venue ready</span>.
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto">
            FanFlow AI is the layer that picks up where StubHub's ChatGPT discovery ends —
            turning a ticket confirmation into a personalized arrival plan, live conditions,
            and support that actually understands the fan.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-md sm:max-w-none mx-auto">
            <Link href="/event/wc2026-final/hub" className="btn-primary text-base sm:text-lg sm:!min-h-[56px] sm:px-7">
              See the Demo →
            </Link>
            <Link href="/event/wc2026-final/readiness" className="btn-secondary text-base sm:text-lg sm:!min-h-[56px] sm:px-7">
              Start with Readiness Check
            </Link>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="py-16 sm:py-20 px-4 page-bg">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <div className="kicker mb-3">The gap</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">The 48 hours nobody owns</h2>
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

      {/* Maria scenario */}
      <section className="py-16 sm:py-20 px-4 bg-gradient-to-b from-violet-50 to-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <div className="kicker text-violet-700 mb-3">Built around one real scenario</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Meet Maria</h2>
            <p className="text-slate-600 mt-3 max-w-2xl mx-auto">
              FIFA World Cup 2026 Final · MetLife Stadium · Section 117. We picked one fan with a real
              stack of friction and built the entire prototype around her.
            </p>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 grid md:grid-cols-2 gap-6 sm:gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white font-bold text-xl">
                  M
                </div>
                <div>
                  <div className="font-bold text-slate-900">Maria, 34</div>
                  <div className="text-sm text-slate-600">Medellín, Colombia</div>
                </div>
              </div>
              <ul className="space-y-2.5 text-sm text-slate-700">
                <li className="flex gap-2"><span>🌎</span> First World Cup, first time at MetLife</li>
                <li className="flex gap-2"><span>👦</span> Attending with her 6-year-old son</li>
                <li className="flex gap-2"><span>🚆</span> Taking NJ Transit from Manhattan</li>
                <li className="flex gap-2"><span>🎟️</span> Section 117, Row 12, Seat 4</li>
                <li className="flex gap-2"><span>🧩</span> Mild crowd anxiety; values family-friendly entry</li>
              </ul>
            </div>
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                What FanFlow gives Maria
              </div>
              <ul className="space-y-2 text-sm text-slate-800">
                <li>✓ Gate 3 (Budweiser Plaza) — closest to her seat, family-friendly, step-free</li>
                <li>✓ Leave-by time tuned for NJ Transit + family buffer</li>
                <li>✓ Quiet space + family services pre-surfaced</li>
                <li>✓ Live gate signals from staff and other fans</li>
                <li>✓ Plain-language explanation of why this plan</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 sm:py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">How it works</h2>
            <p className="text-slate-600 mt-3 max-w-2xl mx-auto">
              Rules decide the plan. AI only explains it. Staff signals beat fan signals.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
            {STEPS.map((s) => (
              <div key={s.n} className="p-6 card-base hover:border-slate-300 transition">
                <span className="rank-badge mb-4">#{s.n}</span>
                <h3 className="font-bold text-lg text-slate-900 mb-2">{s.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-14 sm:py-16 px-4 page-bg">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">What FanFlow does — and doesn't do</h2>
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
