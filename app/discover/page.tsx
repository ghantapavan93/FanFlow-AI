'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useState } from 'react'

/**
 * Phase-2 storytelling: mock StubHub discovery surface.
 *
 * This is a STATIC visual mock — no real marketplace. It exists so a
 * recruiter can see the full StubHub-style journey:
 *
 *   /discover → /discover/wc2026-final → /event/[id]/checkout-success → /event/[id]/hub
 *
 * The World Cup card carries a "FanFlow AI included" badge so the wedge —
 * the post-purchase product — is visible BEFORE you click in. Every other
 * event is greyed-not-eligible, sharpening the contrast.
 *
 * Disclaimer banner up top: this is a mock, not a marketplace.
 */
const FILTERS = ['All events', 'Sports', 'Concerts', 'Theater', 'Family', 'Comedy']

const EVENTS = [
  {
    id: 'wc2026-final',
    name: 'FIFA World Cup 2026 Final',
    venue: 'MetLife Stadium, East Rutherford NJ',
    date: 'Sat, Jul 19',
    time: '7:00 PM',
    image: 'https://images.unsplash.com/photo-1579954614171-fd3900acfc42?w=1200&h=630&fit=crop',
    tag: '⚽ Soccer · Final',
    minPrice: 1248,
    eligible: true,
    badge: 'FanFlow AI included',
    trending: true,
  },
  {
    id: 'mock-coldplay',
    name: 'Coldplay · Music of the Spheres',
    venue: 'MetLife Stadium, East Rutherford NJ',
    date: 'Fri, Aug 8',
    time: '8:00 PM',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&h=630&fit=crop',
    tag: '🎵 Concert',
    minPrice: 184,
    eligible: false,
    trending: false,
  },
  {
    id: 'mock-knicks',
    name: 'New York Knicks vs Boston Celtics',
    venue: 'Madison Square Garden, New York NY',
    date: 'Tue, Jul 22',
    time: '7:30 PM',
    image: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=1200&h=630&fit=crop',
    tag: '🏀 Basketball',
    minPrice: 95,
    eligible: false,
    trending: false,
  },
  {
    id: 'mock-hamilton',
    name: 'Hamilton',
    venue: 'Richard Rodgers Theatre, New York NY',
    date: 'Wed, Jul 30',
    time: '8:00 PM',
    image: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=1200&h=630&fit=crop',
    tag: '🎭 Theater',
    minPrice: 142,
    eligible: false,
    trending: false,
  },
]

export default function DiscoverPage() {
  const [activeFilter, setActiveFilter] = useState('All events')

  return (
    <div className="min-h-screen page-bg page-enter">
      {/* Mock StubHub-style top nav */}
      <header className="page-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-violet-600 to-violet-700 rounded-lg" />
            <span className="font-bold text-slate-900 text-sm sm:text-base">StubHub</span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 border border-violet-100 text-[10px] font-bold uppercase tracking-wider text-violet-700">
              + FanFlow AI
            </span>
          </Link>
          {/* Mock search */}
          <div className="hidden sm:flex flex-1 max-w-md items-center gap-2 px-3 h-9 rounded-full bg-slate-100 border border-slate-200 text-sm text-slate-500">
            <span>🔍</span>
            <span className="truncate">Search teams, artists, venues…</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Link href="/" className="btn-ghost !min-h-[36px] text-xs">
              ← Back home
            </Link>
          </div>
        </div>
      </header>

      {/* Mock disclaimer ribbon */}
      <div className="bg-violet-50 border-b border-violet-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-center gap-2 text-[11px] sm:text-xs text-violet-800">
          <span className="font-bold">Demo:</span>
          <span>
            This is a static StubHub-style mock to show where FanFlow AI plugs in. Only the World Cup card is clickable.
          </span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6">
          <div className="kicker mb-2">Events near you</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Find your next event
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            All tickets · Best prices · Now with{' '}
            <span className="font-semibold text-violet-700">FanFlow AI</span> for select events.
          </p>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 mb-6">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={activeFilter === f ? 'chip-active' : 'chip'}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Event grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {EVENTS.map((ev, i) => {
            const Inner = (
              <motion.article
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className={`group relative rounded-2xl border bg-white overflow-hidden ${
                  ev.eligible
                    ? 'border-violet-200 hover:border-violet-300 hover:shadow-lg cursor-pointer'
                    : 'border-slate-200'
                } transition`}
              >
                {/* Cover image */}
                <div
                  className="relative h-44 sm:h-48 bg-cover bg-center"
                  style={{ backgroundImage: `url(${ev.image})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                  {ev.trending && (
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500 text-white text-[10px] font-bold uppercase tracking-wider">
                      🔥 Trending
                    </span>
                  )}

                  {ev.eligible && ev.badge && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.4 + i * 0.08 }}
                      className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 border border-violet-200 text-[10px] font-bold uppercase tracking-wider text-violet-700"
                    >
                      ✨ {ev.badge}
                    </motion.span>
                  )}

                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <div className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-90">
                      {ev.tag}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold leading-tight mt-0.5 line-clamp-2">
                      {ev.name}
                    </h3>
                  </div>
                </div>

                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900">{ev.date}</div>
                      <div className="text-xs text-slate-500">{ev.time}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                        From
                      </div>
                      <div className="text-base font-bold text-slate-900 tabular-nums">
                        ${ev.minPrice.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 mb-3 truncate">{ev.venue}</div>

                  {ev.eligible ? (
                    <div className="rounded-xl bg-violet-50 border border-violet-100 p-2.5 flex items-center gap-2">
                      <span className="text-base">✨</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-bold text-violet-700 leading-tight">
                          FanFlow AI included
                        </div>
                        <div className="text-[10px] text-violet-700/70 leading-tight mt-0.5">
                          Arrival guidance + live signals after purchase
                        </div>
                      </div>
                      <span className="text-violet-600 font-bold text-sm flex-shrink-0">→</span>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 flex items-center gap-2">
                      <span className="text-base opacity-60">⏳</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold text-slate-600 leading-tight">
                          FanFlow AI rolling out
                        </div>
                        <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                          Eligible venues expanding · select Soccer pilot
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.article>
            )

            return ev.eligible ? (
              <Link key={ev.id} href={`/discover/${ev.id}`} className="block">
                {Inner}
              </Link>
            ) : (
              <div key={ev.id}>{Inner}</div>
            )
          })}
        </div>

        {/* Bottom note */}
        <div className="mt-10 pt-6 border-t border-slate-200 text-center text-xs text-slate-500">
          <p>
            FanFlow AI is a StubHub partner pilot. Currently active for select Soccer events
            at MetLife Stadium. <Link href="/" className="text-violet-700 font-semibold hover:underline">Learn more →</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
