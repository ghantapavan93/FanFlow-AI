'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useState } from 'react'

/**
 * Phase-2 World Cup tickets listing — StubHub replica.
 *
 * Mirrors stubhub.com/world-cup-tickets/grouping/... — a list of World
 * Cup matches with date column, team flags, match number, time, venue,
 * status tag (Only 3% left / Selling fast), and a "See tickets" CTA.
 *
 * The wedge is here: every match row carries an "✨ FanFlow AI included"
 * tag right next to the "Only X% left" status tag, making the wedge
 * visible BEFORE the user clicks into seat selection.
 *
 * "See tickets" → /discover/[id]/seats (the seat picker)
 * → checkout-success cinematic → Hub.
 */

type Match = {
  id: string
  date: { day: string; dayOfWeek: string }
  monthShort: string
  teamA: { name: string; flag: string }
  teamB: { name: string; flag: string }
  matchNo: string
  group: string
  time: string
  venue: string
  status: { label: string; tone: 'urgent' | 'warm' } | null
  isMaria?: boolean
}

const MATCHES: Match[] = [
  {
    id: 'match-11',
    date: { day: '14', dayOfWeek: 'Sun' },
    monthShort: 'Jun',
    teamA: { name: 'Netherlands', flag: '🇳🇱' },
    teamB: { name: 'Japan', flag: '🇯🇵' },
    matchNo: 'Match 11',
    group: 'Group F',
    time: '3:00 PM',
    venue: 'Arlington, TX, US · AT&T Stadium',
    status: { label: 'Only 3% of tickets left', tone: 'urgent' },
  },
  {
    id: 'match-22',
    date: { day: '17', dayOfWeek: 'Wed' },
    monthShort: 'Jun',
    teamA: { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    teamB: { name: 'Croatia', flag: '🇭🇷' },
    matchNo: 'Match 22',
    group: 'Group L',
    time: '3:00 PM',
    venue: 'Arlington, TX, US · AT&T Stadium',
    status: { label: 'Only 4% of tickets left', tone: 'urgent' },
  },
  {
    id: 'match-43',
    date: { day: '22', dayOfWeek: 'Mon' },
    monthShort: 'Jun',
    teamA: { name: 'Argentina', flag: '🇦🇷' },
    teamB: { name: 'Austria', flag: '🇦🇹' },
    matchNo: 'Match 43',
    group: 'Group J',
    time: '12:00 PM',
    venue: 'Arlington, TX, US · AT&T Stadium',
    status: { label: 'Selling fast', tone: 'warm' },
  },
  {
    id: 'match-57',
    date: { day: '25', dayOfWeek: 'Thu' },
    monthShort: 'Jun',
    teamA: { name: 'Japan', flag: '🇯🇵' },
    teamB: { name: 'Sweden', flag: '🇸🇪' },
    matchNo: 'Match 57',
    group: 'Group F',
    time: '6:00 PM',
    venue: 'Arlington, TX, US · AT&T Stadium',
    status: { label: 'Selling fast', tone: 'warm' },
  },
  {
    id: 'match-70',
    date: { day: '27', dayOfWeek: 'Sat' },
    monthShort: 'Jun',
    teamA: { name: 'Jordan', flag: '🇯🇴' },
    teamB: { name: 'Argentina', flag: '🇦🇷' },
    matchNo: 'Match 70',
    group: 'Group J',
    time: '9:00 PM',
    venue: 'Arlington, TX, US · AT&T Stadium',
    status: { label: 'Only 4% of tickets left', tone: 'urgent' },
  },
  {
    id: 'match-78',
    date: { day: '30', dayOfWeek: 'Tue' },
    monthShort: 'Jun',
    teamA: { name: 'TBD', flag: '⚽' },
    teamB: { name: 'TBD', flag: '⚽' },
    matchNo: 'Match 78',
    group: 'Round of 32',
    time: '12:00 PM',
    venue: 'Arlington, TX, US · AT&T Stadium',
    status: null,
  },
  {
    id: 'match-final',
    date: { day: '19', dayOfWeek: 'Sat' },
    monthShort: 'Jul',
    teamA: { name: 'Champion', flag: '🏆' },
    teamB: { name: 'Champion', flag: '🏆' },
    matchNo: 'Match 104',
    group: 'Final',
    time: '7:00 PM',
    venue: 'East Rutherford, NJ, US · MetLife Stadium',
    status: { label: 'Only 2% of tickets left', tone: 'urgent' },
    isMaria: true,
  },
]

const FILTERS = ['Denton', 'Team', 'All Rounds', 'All dates', 'Parking', 'Price']

function StatusTag({
  tone,
  label,
}: {
  tone: 'urgent' | 'warm'
  label: string
}) {
  const cls =
    tone === 'urgent'
      ? 'bg-rose-50 border-rose-200 text-rose-700'
      : 'bg-amber-50 border-amber-200 text-amber-700'
  const icon = tone === 'urgent' ? '🔥' : '⚡'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold ${cls}`}>
      <span className="text-[10px]">{icon}</span>
      {label}
    </span>
  )
}

function FanflowTag() {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 text-[11px] font-bold text-violet-700"
      title="FanFlow AI is included free with this ticket — personalized arrival plan after purchase."
    >
      <span className="text-[10px]">✨</span>
      FanFlow AI included
    </motion.span>
  )
}

export default function WorldCupTicketsPage() {
  const [activeFilter, setActiveFilter] = useState('Denton')

  return (
    <div className="min-h-screen bg-slate-50">
      {/* === StubHub top nav ============================== */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/discover" className="flex items-center gap-2 flex-shrink-0">
            <div className="bg-violet-700 text-white font-bold text-base px-3 py-1.5 rounded-lg leading-none">
              Stub<span className="font-extrabold">Hub</span>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 border border-violet-100 text-[10px] font-bold uppercase tracking-wider text-violet-700">
              + FanFlow AI
            </span>
          </Link>
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <input
                type="text"
                placeholder="Search events, artists, teams and more"
                className="w-full h-10 pl-10 pr-4 rounded-full border border-slate-200 bg-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-5 text-sm font-semibold text-slate-700">
            <button className="hidden md:inline hover:text-slate-900">Explore</button>
            <button className="hidden md:inline hover:text-slate-900">Sell</button>
            <button className="hidden md:inline hover:text-slate-900">Favourites</button>
            <button className="hidden md:inline hover:text-slate-900">My Tickets</button>
            <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-bold">
              P
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid lg:grid-cols-[1fr_360px] gap-6 lg:gap-8">
          {/* === LEFT: Match listing ====================== */}
          <div>
            {/* Title row */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                  World Cup Tickets
                </h1>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 text-sm font-bold text-slate-800">
                  60.7k
                  <span className="text-rose-500">♥</span>
                </span>
                <button
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"
                  aria-label="Share"
                >
                  <span className="text-base">↗</span>
                </button>
              </div>
            </div>

            {/* Social proof banner */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="rounded-2xl bg-sky-50 border border-sky-100 px-4 py-3 flex items-center gap-2 mb-5"
            >
              <span className="text-sky-700">👥</span>
              <span className="text-sm text-slate-700">
                <span className="font-semibold">70,962 people</span> viewed World Cup events in the
                past hour
              </span>
            </motion.div>

            {/* Filter row */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <button className="w-9 h-9 rounded-full bg-violet-100 hover:bg-violet-200 flex items-center justify-center transition flex-shrink-0">
                📍
              </button>
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={
                    activeFilter === f
                      ? 'inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-violet-50 border border-violet-300 text-sm font-semibold text-violet-700'
                      : 'inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:border-slate-300'
                  }
                >
                  {f}
                  <span className="text-slate-400">▾</span>
                </button>
              ))}
            </div>

            <div className="text-sm font-semibold text-slate-700 mb-4">
              {MATCHES.length} events near you
            </div>

            {/* Match list */}
            <div className="space-y-3">
              {MATCHES.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  className={`relative rounded-2xl bg-white border ${
                    m.isMaria ? 'border-violet-300 ring-2 ring-violet-100' : 'border-slate-200'
                  } p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:border-slate-300 transition`}
                >
                  {/* "The Maria match" highlight ribbon */}
                  {m.isMaria && (
                    <span className="absolute -top-2 left-4 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-600 text-white text-[10px] font-bold uppercase tracking-wider">
                      ⭐ Demo flow — Maria's seat
                    </span>
                  )}

                  {/* Date column */}
                  <div className="flex sm:flex-col items-baseline sm:items-center sm:justify-center gap-2 sm:gap-0 sm:w-16 flex-shrink-0 sm:border-r border-slate-100 sm:pr-4">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {m.monthShort}
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-slate-900 leading-none">
                      {m.date.day}
                    </div>
                    <div className="text-xs text-slate-500">{m.date.dayOfWeek}</div>
                  </div>

                  {/* Match content */}
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-base sm:text-lg font-bold text-slate-900">
                        {m.teamA.flag} {m.teamA.name}
                      </span>
                      <span className="text-sm text-slate-500">vs.</span>
                      <span className="text-base sm:text-lg font-bold text-slate-900">
                        {m.teamB.flag} {m.teamB.name}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      {m.matchNo} - {m.group}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2">
                      <span className="font-mono">{m.time}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">🇺🇸 {m.venue}</span>
                    </div>

                    {/* Status + FanFlow tag row — THIS is the wedge */}
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {m.status && <StatusTag tone={m.status.tone} label={m.status.label} />}
                      <FanflowTag />
                    </div>
                  </div>

                  {/* See tickets CTA */}
                  <Link
                    href={`/discover/wc2026-final/seats?match=${m.id}`}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-full border-2 border-violet-600 text-violet-700 hover:bg-violet-50 active:bg-violet-100 font-bold text-sm transition flex-shrink-0 self-stretch sm:self-center min-h-[40px] w-full sm:w-auto"
                  >
                    See tickets
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2 mt-6">
              <button className="w-9 h-9 rounded-full border border-slate-200 text-slate-400 disabled:opacity-40" disabled>
                ←
              </button>
              <button className="w-9 h-9 rounded-full bg-violet-600 text-white font-bold text-sm">
                1
              </button>
              <button className="w-9 h-9 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-slate-300 font-bold text-sm">
                2
              </button>
              <button className="w-9 h-9 rounded-full border border-slate-200 text-slate-700 hover:border-slate-300">
                →
              </button>
            </div>
          </div>

          {/* === RIGHT: World Cup hero + FanProtect ======= */}
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            {/* World Cup brand hero */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 flex items-center justify-center"
            >
              <div className="text-white font-bold text-[64px] sm:text-[88px] leading-[0.85] tracking-tighter text-center whitespace-pre">
                {`WORLD\nCUP`}
              </div>
              <div className="absolute top-4 left-4 w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center text-3xl shadow-lg">
                🏆
              </div>
              <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.3),transparent_60%),radial-gradient(circle_at_80%_70%,rgba(0,0,0,0.4),transparent_60%)]" />
              <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 border border-violet-200 text-[10px] font-bold uppercase tracking-wider text-violet-700">
                ✨ FanFlow AI included
              </span>
            </motion.div>

            {/* Description */}
            <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5">
              <p className="text-sm text-slate-700 leading-relaxed">
                Get ready for the ultimate soccer spectacle of 2026, spanning the United States,
                Canada, and Mexico, where 48 nations will compete across 104 matches in 39
                unforgettable days. The tournament kicks off on June 11, 2026, at the legendary
                Estadio Azteca in Mexico City.
              </p>
              <button className="text-sm font-semibold text-violet-700 hover:underline mt-2">
                See more
              </button>
            </div>

            {/* FanProtect */}
            <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-base flex-shrink-0">
                🛡️
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">FanProtect™</div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  We back every order so you can buy and sell tickets with 100% confidence.
                </p>
              </div>
            </div>

            {/* What FanFlow unlocks after purchase */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="rounded-2xl bg-white border border-violet-200 p-4 sm:p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">✨</span>
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-violet-700">
                  What FanFlow unlocks after checkout
                </div>
              </div>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-2">
                {[
                  { icon: '🧭', label: 'Personalized arrival plan' },
                  { icon: '🅿️', label: 'Parking & gate guidance' },
                  { icon: '🗺️', label: 'Venue map & route' },
                  { icon: '🚻', label: 'Restrooms & facilities' },
                  { icon: '♿', label: 'Accessibility support' },
                  { icon: '✅', label: 'Staff-verified updates' },
                  { icon: '📊', label: 'Live crowd pulse' },
                  { icon: '🚗', label: 'Post-event exit help' },
                ].map((item) => (
                  <li key={item.label} className="flex items-center gap-1.5">
                    <span className="text-sm flex-shrink-0">{item.icon}</span>
                    <span className="text-[11px] text-slate-700 leading-tight">{item.label}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
                Included free the moment you confirm — no extra app, no extra cost.
              </p>
            </motion.div>

            {/* FanFlow why-this-matters callout */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-200 p-4 sm:p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">✨</span>
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-violet-700">
                  Why "FanFlow AI included"?
                </div>
              </div>
              <p className="text-xs text-violet-900/80 leading-relaxed">
                StubHub gets you the ticket. FanFlow takes over after checkout — best gate for your
                section, leave-by time tuned to your group, parking, and live signals from staff and
                fans. Especially powerful for massive venues like the World Cup final.
              </p>
            </motion.div>
          </aside>
        </div>
      </main>
    </div>
  )
}
