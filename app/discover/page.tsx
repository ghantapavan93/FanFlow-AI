'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useState, type ReactNode } from 'react'

/**
 * Phase-2 storytelling: full StubHub-replica discovery surface.
 *
 * Mirrors the structure of stubhub.com's logged-in home: hero carousel,
 * location + date filters, Spotify-style connect banner, multiple
 * horizontal scroll sections (Recently viewed, Recommended, Trending,
 * Last-minute, Concerts, Sports, Theatre, Comedy), app banner, email
 * signup, footer with FanProtect.
 *
 * The wedge: only the World Cup card carries the "+ FanFlow AI" badge
 * AND is clickable. Every other tile is a static visual mock — clicks
 * fire a tiny toast that says "Demo card — only World Cup is wired up".
 *
 * Every section is faithful to StubHub's layout so the recruiter sees
 * exactly where FanFlow plugs into the existing marketplace.
 */

type EventCard = {
  id: string
  name: string
  date?: string
  time?: string
  venue?: string
  views?: string
  rank?: number
  bg: string
  /** Optional inline brand text rendered on the gradient (e.g. WORLD CUP). */
  brand?: string
  /** Image URL. If set, used instead of bg gradient. */
  img?: string
  eligible?: boolean
  trending?: boolean
}

// === Hero carousel — 4 large square cards =====================
const HERO: EventCard[] = [
  {
    id: 'nba-playoffs',
    name: 'NBA Playoffs',
    date: '17 May - 19 Jun',
    bg: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900',
    brand: 'Playoffs',
  },
  {
    id: 'nfl',
    name: 'NFL',
    bg: 'bg-gradient-to-br from-amber-700 via-amber-800 to-stone-900',
    img: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=600&h=600&fit=crop',
  },
  {
    id: 'wc2026-final',
    name: 'World Cup',
    date: '11 Jun - 19 Jul',
    bg: 'bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800',
    brand: 'WORLD\nCUP',
    eligible: true,
  },
  {
    id: 'bts',
    name: 'BTS',
    date: '17 May - 31 Oct',
    bg: 'bg-gradient-to-br from-rose-500 via-pink-600 to-fuchsia-700',
    img: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&h=600&fit=crop',
  },
]

// === Recently viewed ==========================================
const RECENTLY_VIEWED: EventCard[] = [
  { id: 'wc-rv', name: 'World Cup', views: '60.7k', bg: 'bg-gradient-to-br from-violet-600 to-indigo-800', brand: 'WORLD\nCUP', eligible: true },
  { id: 'bottlerock', name: 'BottleRock Napa Valley', views: '5.3k', bg: 'bg-gradient-to-br from-lime-400 to-sky-400', brand: 'B' },
  { id: 'tcu', name: 'TCU Horned Frogs Football', views: '285', bg: 'bg-gradient-to-br from-amber-700 to-stone-900', img: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=400&h=400&fit=crop' },
  { id: 'rangers-rv', name: 'Texas Rangers', views: '31.9k', bg: 'bg-gradient-to-br from-blue-700 to-blue-900', brand: 'T' },
]

// === Recommended for you ======================================
const RECOMMENDED: (EventCard & { sub?: string })[] = [
  { id: 'cowboys', name: 'Dallas Cowboys', views: '59.2k', date: '11 Aug - 03 Jan 2027', sub: '10 events near you', bg: 'bg-gradient-to-br from-blue-700 to-blue-900', brand: '🏈' },
  { id: 'rangers', name: 'Texas Rangers', views: '31.9k', date: '25 May - 24 Sep', sub: '60 events near you', bg: 'bg-gradient-to-br from-blue-700 to-blue-900', brand: 'T' },
  { id: 'sooners', name: 'Oklahoma Sooners Football', views: '1.4k', date: 'Sat, 10 Oct · 1:00 PM', sub: '1 event near you', bg: '', img: 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?w=400&h=400&fit=crop' },
  { id: 'nate', name: 'Nate Bargatze', views: '25.3k', date: 'Sat, 06 Jun · 3:00 PM', sub: '2 events near you', bg: '', img: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&h=400&fit=crop' },
]

// === Trending events near Denton — numbered ===================
const TRENDING: EventCard[] = [
  { id: 'bts-t', name: 'BTS', rank: 1, date: 'Sat, 15 Aug · 8:00 PM', venue: 'AT&T Stadium', bg: '', img: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&h=400&fit=crop' },
  { id: 'wc-t', name: 'Netherlands vs Japan - World Cup - Group F (Match 11)', rank: 2, date: 'Sun, 14 Jun · 3:00 PM', venue: 'AT&T Stadium', bg: 'bg-gradient-to-br from-violet-600 to-indigo-800', brand: 'WORLD\nCUP', eligible: true },
  { id: 'usher', name: 'Usher and Chris Brown', rank: 3, date: 'Thu, 10 Sep · 7:00 PM', venue: 'AT&T Stadium', bg: '', img: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop' },
  { id: 'forrest', name: 'Forrest Frank', rank: 4, date: 'Sat, 01 Aug · 7:00 PM', venue: 'Globe Life Field', bg: '', img: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=400&fit=crop' },
]

// === Last-minute deals ========================================
const DEALS: EventCard[] = [
  { id: 'behemoth', name: 'Behemoth', date: 'Mon, 18 May · 18:30', venue: 'The Bomb Factory', bg: '', img: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=400&h=400&fit=crop' },
  { id: 'mystics', name: 'Washington Mystics at Dallas Wings', date: 'Mon, 18 May · 19:00', venue: 'College Park Center', bg: '', img: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=400&fit=crop' },
  { id: 'pubchoir', name: 'Pub Choir', date: 'Mon, 18 May · 19:00', venue: 'Texas Theatre', bg: '', img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop' },
  { id: 'sanantonio', name: 'San Antonio Missions at Frisco Roughriders', date: 'Tue, 19 May · 11:05', venue: 'Riders Field', bg: '', img: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400&h=400&fit=crop' },
]

// === Concerts =================================================
const CONCERTS: EventCard[] = [
  { id: 'ella', name: 'Ella Langley', views: '5.6k', date: 'Sat, 15 Aug · 7:00 PM', venue: '1 event near you', bg: '', img: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&h=400&fit=crop' },
  { id: 'bts-c', name: 'BTS', views: '54.9k', date: '15 Aug - 16 Aug', venue: '2 events near you', bg: '', img: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&h=400&fit=crop' },
  { id: 'zach', name: 'Zach Bryan', views: '79.8k', date: 'Sat, 22 Aug · 7:00 PM', venue: '1 event near you', bg: '', img: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=400&fit=crop' },
  { id: 'ty', name: 'Ty Myers', views: '3.8k', date: 'Sat, 21 Nov · 7:30 PM', venue: '1 event near you', bg: '', img: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=400&h=400&fit=crop' },
]

// === Sports ===================================================
const SPORTS: EventCard[] = [
  { id: 'cowboys-s', name: 'Dallas Cowboys', views: '59.2k', date: '11 Aug - 03 Jan 2027', venue: '10 events near you', bg: 'bg-gradient-to-br from-blue-700 to-blue-900', brand: '🏈' },
  { id: 'stars', name: 'Dallas Stars', views: '13.1k', date: 'Sat, 20 Feb · 7:00 PM', venue: '1 event near you', bg: '', img: 'https://images.unsplash.com/photo-1515703407324-5f51c2ed299b?w=400&h=400&fit=crop' },
  { id: 'rangers-s', name: 'Texas Rangers', views: '31.9k', date: '25 May - 24 Sep', venue: '60 events near you', bg: 'bg-gradient-to-br from-blue-700 to-blue-900', brand: 'T' },
  { id: 'sooners-s', name: 'Oklahoma Sooners Football', views: '1.4k', date: 'Sat, 10 Oct · 1:00 PM', venue: '1 event near you', bg: '', img: 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?w=400&h=400&fit=crop' },
]

// === Theatre ==================================================
const THEATRE: EventCard[] = [
  { id: 'phantom', name: 'The Phantom of the Opera', views: '6.2k', date: 'Sat, 14 Mar · 8:00 PM', venue: 'Majestic Theatre', bg: 'bg-gradient-to-br from-rose-700 to-rose-900', brand: '🎭' },
  { id: 'hamilton', name: 'Hamilton', views: '33.3k', date: 'Wed, 30 Jul · 8:00 PM', venue: 'Music Hall at Fair Park', bg: '', img: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=400&h=400&fit=crop' },
  { id: 'mormon', name: 'The Book of Mormon', views: '12.4k', date: 'Fri, 05 Sep · 8:00 PM', venue: 'Winspear Opera House', bg: 'bg-gradient-to-br from-sky-600 to-indigo-700', brand: '✝️' },
  { id: 'outsiders', name: 'The Outsiders', views: '5.8k', date: 'Sat, 27 Sep · 8:00 PM', venue: 'AT&T Performing Arts', bg: 'bg-gradient-to-br from-amber-700 to-stone-900', brand: 'O' },
]

// === Comedy ===================================================
const COMEDY: EventCard[] = [
  { id: 'nate-c', name: 'Nate Bargatze', views: '25.3k', date: 'Sat, 06 Jun · 3:00 PM', venue: '2 events near you', bg: '', img: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&h=400&fit=crop' },
  { id: 'dude', name: 'Dude Perfect', views: '884', date: '10 Jul - 11 Jul', venue: '2 events near you', bg: '', img: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=400&h=400&fit=crop' },
  { id: 'max', name: 'Max Amini', views: '1.3k', date: 'Mon, 13 Jul · 8:30 PM', venue: '1 event near you', bg: '', img: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=400&h=400&fit=crop' },
  { id: 'gary', name: 'Gary Owen', views: '4.6k', date: 'Thu, 31 Dec · 9:30 PM', venue: '1 event near you', bg: 'bg-gradient-to-br from-amber-500 to-orange-700', brand: '🎤' },
]

const FILTERS = ['All types', 'Sports', 'Concerts', 'Theatre & Comedy']

function HeartBtn({ views }: { views?: string }) {
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
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-3.5 h-3.5">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>
    </div>
  )
}

function BrandTile({ ev, size = 'md' }: { ev: EventCard; size?: 'lg' | 'md' | 'sm' }) {
  const sizeCls = size === 'lg' ? 'aspect-square text-[44px]' : 'aspect-square text-2xl'
  if (ev.img) {
    return (
      <div
        className={`relative ${sizeCls} rounded-2xl bg-cover bg-center overflow-hidden`}
        style={{ backgroundImage: `url(${ev.img})` }}
      />
    )
  }
  return (
    <div
      className={`relative ${sizeCls} rounded-2xl overflow-hidden flex items-center justify-center ${ev.bg}`}
    >
      {ev.brand && (
        <div className="text-white font-bold leading-[0.9] tracking-tighter whitespace-pre-line text-center">
          {ev.brand}
        </div>
      )}
      {/* Subtle geometric overlay for "designed" feel */}
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.3),transparent_60%),radial-gradient(circle_at_80%_70%,rgba(0,0,0,0.3),transparent_60%)]" />
    </div>
  )
}

function FanflowBadge() {
  return (
    <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/95 text-[9px] font-bold uppercase tracking-wider text-violet-700 z-10 shadow-sm">
      ✨ FanFlow AI
    </span>
  )
}

function SectionRow({
  title,
  cta,
  children,
}: {
  title: string
  cta?: string
  children: ReactNode
}) {
  return (
    <section className="mt-10 sm:mt-12">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>
        {cta && (
          <button className="text-sm font-semibold text-sky-600 hover:underline">{cta}</button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {children}
      </div>
    </section>
  )
}

function CompactCard({ ev, onMockClick }: { ev: EventCard & { sub?: string }; onMockClick: () => void }) {
  const Inner = (
    <div className="group">
      <div className="relative">
        <HeartBtn views={ev.views} />
        {ev.eligible && <FanflowBadge />}
        <BrandTile ev={ev} />
      </div>
      <div className="mt-2.5 px-0.5">
        <div className="font-bold text-slate-900 text-sm leading-tight line-clamp-2">{ev.name}</div>
        {ev.date && <div className="text-xs text-slate-600 mt-1">{ev.date}</div>}
        {ev.sub && <div className="text-xs text-slate-500 mt-0.5">{ev.sub}</div>}
        {ev.venue && !ev.sub && <div className="text-xs text-slate-500 mt-0.5">{ev.venue}</div>}
      </div>
    </div>
  )
  return ev.eligible ? (
    <Link href="/discover/wc2026-final" className="block focus:outline-none focus:ring-2 focus:ring-violet-400 rounded-2xl">
      {Inner}
    </Link>
  ) : (
    <button onClick={onMockClick} className="text-left focus:outline-none focus:ring-2 focus:ring-slate-300 rounded-2xl">
      {Inner}
    </button>
  )
}

function NumberedCard({ ev, onMockClick }: { ev: EventCard; onMockClick: () => void }) {
  const Inner = (
    <div className="group">
      <div className="relative">
        <HeartBtn />
        {ev.eligible && <FanflowBadge />}
        <span className="absolute top-2.5 left-2.5 inline-flex items-center justify-center w-7 h-7 rounded-full bg-violet-600 text-white text-xs font-bold z-10">
          #{ev.rank}
        </span>
        <BrandTile ev={ev} />
      </div>
      <div className="mt-2.5 px-0.5">
        <div className="font-bold text-slate-900 text-sm leading-tight line-clamp-2">{ev.name}</div>
        {ev.date && <div className="text-xs text-slate-600 mt-1">{ev.date}</div>}
        {ev.venue && <div className="text-xs text-slate-500 mt-0.5">{ev.venue}</div>}
      </div>
    </div>
  )
  return ev.eligible ? (
    <Link href="/discover/wc2026-final" className="block focus:outline-none focus:ring-2 focus:ring-violet-400 rounded-2xl">
      {Inner}
    </Link>
  ) : (
    <button onClick={onMockClick} className="text-left focus:outline-none focus:ring-2 focus:ring-slate-300 rounded-2xl">
      {Inner}
    </button>
  )
}

export default function DiscoverPage() {
  const [activeFilter, setActiveFilter] = useState('All types')
  const [toast, setToast] = useState<string | null>(null)

  const mockClick = () => {
    setToast('Demo card — only the World Cup is wired up to the FanFlow flow.')
    setTimeout(() => setToast(null), 2400)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* === Top nav — StubHub replica =================== */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="bg-violet-700 text-white font-bold text-base px-3 py-1.5 rounded-lg leading-none">
                Stub<span className="font-extrabold">Hub</span>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 border border-violet-100 text-[10px] font-bold uppercase tracking-wider text-violet-700">
                + FanFlow AI
              </span>
            </Link>
            <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-slate-700">
              <button className="hover:text-slate-900">Sports</button>
              <button className="hover:text-slate-900">Concerts</button>
              <button className="hover:text-slate-900">Theatre</button>
              <button className="hover:text-slate-900">Festivals</button>
              <button className="hover:text-slate-900">Top Cities</button>
            </nav>
          </div>
          <div className="flex items-center gap-3 sm:gap-5 text-sm font-semibold text-slate-700">
            <button className="hidden md:inline hover:text-slate-900">Explore</button>
            <button className="hidden md:inline hover:text-slate-900">Sell</button>
            <button className="hidden md:inline hover:text-slate-900">Favourites</button>
            <button className="hidden md:inline hover:text-slate-900">My Tickets</button>
            <Link href="/" className="text-xs text-slate-500 hover:text-slate-700 hidden sm:inline">
              ← Back to FanFlow
            </Link>
            <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-bold">
              P
            </div>
          </div>
        </div>
      </header>

      {/* === FanFlow disclaimer ribbon ==================== */}
      <div className="bg-violet-50 border-b border-violet-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-center gap-2 text-[11px] sm:text-xs text-violet-800 text-center">
          <span className="font-bold">Demo:</span>
          <span>
            StubHub-replica surface showing where FanFlow AI plugs in. Only the{' '}
            <span className="font-semibold underline">World Cup</span> card is clickable.
          </span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* === Search bar ================================= */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search events, artists, teams and more"
            className="w-full h-12 sm:h-14 pl-12 pr-4 rounded-full border border-slate-200 bg-white text-sm sm:text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
          />
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
        </div>

        {/* === Hero carousel — 4 large cards =============== */}
        <section className="mt-6 sm:mt-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {HERO.map((ev, i) => {
              const Inner = (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  className="relative group cursor-pointer"
                >
                  <div className="relative">
                    <HeartBtn />
                    {ev.eligible && <FanflowBadge />}
                    <BrandTile ev={ev} size="lg" />
                  </div>
                  <div className="mt-3 px-1">
                    <div className="font-bold text-slate-900 text-lg sm:text-xl tracking-tight">
                      {ev.name}
                    </div>
                    {ev.date && (
                      <div className="text-xs sm:text-sm text-slate-600 mt-0.5">{ev.date}</div>
                    )}
                  </div>
                </motion.div>
              )
              return ev.eligible ? (
                <Link key={ev.id} href="/discover/wc2026-final" className="block">
                  {Inner}
                </Link>
              ) : (
                <button key={ev.id} onClick={mockClick} className="text-left">
                  {Inner}
                </button>
              )
            })}
          </div>
        </section>

        {/* === Location + dates + filter chips ============ */}
        <section className="mt-6 sm:mt-8 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 rounded-full bg-violet-100 hover:bg-violet-200 flex items-center justify-center transition">
              📍
            </button>
            <button className="chip font-semibold !text-slate-700">
              <span>📌</span>
              Denton
              <span className="text-slate-400">▾</span>
            </button>
            <button className="chip font-semibold !text-slate-700">
              <span>📅</span>
              All dates
              <span className="text-slate-400">▾</span>
            </button>
          </div>
          <div className="hidden sm:block h-6 w-px bg-slate-200" />
          <div className="flex flex-wrap gap-2">
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
        </section>

        {/* === Spotify-style connect banner ================ */}
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

        {/* === Recently viewed ============================ */}
        <SectionRow title="Recently viewed" cta="Edit">
          {RECENTLY_VIEWED.map((ev) => (
            <CompactCard key={ev.id} ev={ev} onMockClick={mockClick} />
          ))}
        </SectionRow>

        {/* === Recommended for you ======================== */}
        <SectionRow title="Recommended for you">
          {RECOMMENDED.map((ev) => (
            <CompactCard key={ev.id} ev={ev} onMockClick={mockClick} />
          ))}
        </SectionRow>

        {/* === Trending Events near Denton ================ */}
        <SectionRow title="Trending Events near Denton">
          {TRENDING.map((ev) => (
            <NumberedCard key={ev.id} ev={ev} onMockClick={mockClick} />
          ))}
        </SectionRow>

        {/* === Last-minute deals ========================== */}
        <SectionRow title="Last-minute deals">
          {DEALS.map((ev) => (
            <CompactCard key={ev.id} ev={ev} onMockClick={mockClick} />
          ))}
        </SectionRow>

        {/* === Concerts =================================== */}
        <SectionRow title="Concerts" cta="Explore Concerts →">
          {CONCERTS.map((ev) => (
            <CompactCard key={ev.id} ev={ev} onMockClick={mockClick} />
          ))}
        </SectionRow>

        {/* === Sports ===================================== */}
        <SectionRow title="Sports" cta="Explore Sports →">
          {SPORTS.map((ev) => (
            <CompactCard key={ev.id} ev={ev} onMockClick={mockClick} />
          ))}
        </SectionRow>

        {/* === Theatre ==================================== */}
        <SectionRow title="Theatre" cta="Explore Theatre →">
          {THEATRE.map((ev) => (
            <CompactCard key={ev.id} ev={ev} onMockClick={mockClick} />
          ))}
        </SectionRow>

        {/* === Comedy ===================================== */}
        <SectionRow title="Comedy" cta="Explore Comedy →">
          {COMEDY.map((ev) => (
            <CompactCard key={ev.id} ev={ev} onMockClick={mockClick} />
          ))}
        </SectionRow>

        {/* === Download app banner ======================== */}
        <section className="mt-12 rounded-2xl bg-violet-100 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Download the StubHub app
            </h3>
            <p className="text-sm text-slate-700 mt-1">Discover your favourite events with ease</p>
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
            <div className="w-16 h-16 bg-white border border-slate-200 rounded-lg flex items-center justify-center">
              <div className="grid grid-cols-5 gap-px">
                {Array.from({ length: 25 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 ${
                      [0, 2, 4, 6, 8, 11, 13, 17, 19, 22, 24].includes(i)
                        ? 'bg-slate-900'
                        : 'bg-transparent'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* === Email signup =============================== */}
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

      {/* === Footer =================================== */}
      <footer className="border-t border-slate-200 mt-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-violet-700">🛡️</span>
                <span className="font-bold text-slate-900">FanProtect</span>
              </div>
              <ul className="text-xs text-slate-600 space-y-2">
                <li className="flex items-center gap-2">
                  <span>✓</span>Buy and sell with confidence
                </li>
                <li className="flex items-center gap-2">
                  <span>✓</span>Customer service all the way to your seat
                </li>
                <li className="flex items-center gap-2">
                  <span>✓</span>Every order is 100% guaranteed
                </li>
              </ul>
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 mb-3">Our Company</div>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>About Us</li>
                <li>Open Distribution</li>
                <li>Affiliate Programme</li>
                <li>Investors</li>
                <li>Newsroom</li>
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
              <div className="text-sm font-bold text-slate-900 mb-3">Live events all over the world</div>
              <div className="border border-slate-200 rounded-xl p-3 text-sm space-y-1">
                <div className="flex items-center gap-2">🇺🇸 United States</div>
                <div className="text-slate-500 text-xs">A English (UK)</div>
                <div className="text-slate-500 text-xs">US$ United States Dollar</div>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
            © 2000–2026 StubHub. All Rights Reserved. Use of this website signifies your agreement
            to our User Agreement, Privacy Notice and Cookie Notice. You are buying tickets from a
            third party; StubHub is not the ticket seller. Prices are set by sellers and may be
            above face value.
            <span className="block mt-2 text-violet-700 font-semibold">
              Demo: this is a static replica. FanFlow AI is the post-purchase product layer added on top.
            </span>
          </div>
        </div>
      </footer>

      {/* === Mock toast =================================== */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] max-w-[90vw]"
        >
          <div className="bg-slate-900 text-white text-sm px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 max-w-md">
            <span className="text-violet-300 flex-shrink-0">ℹ️</span>
            <span>{toast}</span>
          </div>
        </motion.div>
      )}
    </div>
  )
}
