'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { demoEvent, demoTicket, demoVenue } from '@/lib/seed'

/**
 * Phase-2 storytelling: event detail + seat-pick mock.
 *
 * Visual mockup ONLY. The seat picker is a tiny grid of representative
 * sections — selecting one shows a fake price quote, and "Continue to
 * checkout" routes to /event/[id]/checkout-success which then auto-routes
 * into the real Hub.
 *
 * The "FanFlow AI included" badge appears in the ticket option panel so the
 * fan sees the wedge clearly BEFORE confirming purchase.
 */

type Section = {
  id: string
  label: string
  tier: 'lower' | 'upper'
  price: number
  accessible: boolean
  family: boolean
  ticketRecommended?: boolean
}

const SECTIONS: Section[] = [
  { id: '117', label: '117', tier: 'lower', price: 1248, accessible: true, family: true, ticketRecommended: true },
  { id: '118', label: '118', tier: 'lower', price: 1180, accessible: true, family: true },
  { id: '119', label: '119', tier: 'lower', price: 1140, accessible: true, family: false },
  { id: '101', label: '101', tier: 'lower', price: 1380, accessible: true, family: false },
  { id: '139', label: '139', tier: 'lower', price: 1020, accessible: false, family: true },
  { id: '217', label: '217', tier: 'upper', price: 580, accessible: true, family: true },
  { id: '218', label: '218', tier: 'upper', price: 540, accessible: true, family: true },
  { id: '239', label: '239', tier: 'upper', price: 490, accessible: false, family: true },
]

export default function DiscoverDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const eventId = params?.id ?? 'wc2026-final'

  // Maria's section by default — keeps the demo coherent end-to-end
  const [selected, setSelected] = useState<Section>(
    SECTIONS.find((s) => s.id === demoTicket.section) ?? SECTIONS[0],
  )
  const [checkingOut, setCheckingOut] = useState(false)

  const handleCheckout = () => {
    setCheckingOut(true)
    // Brief "processing" beat for credibility — then route to the
    // cinematic checkout-success page which carries the FanFlow handoff.
    setTimeout(() => {
      router.push(`/event/${eventId}/checkout-success`)
    }, 1200)
  }

  return (
    <div className="min-h-screen page-bg page-enter">
      {/* Mock StubHub top nav */}
      <header className="page-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-violet-600 to-violet-700 rounded-lg" />
            <span className="font-bold text-slate-900 text-sm sm:text-base">StubHub</span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 border border-violet-100 text-[10px] font-bold uppercase tracking-wider text-violet-700">
              + FanFlow AI
            </span>
          </div>
          <Link href="/discover" className="btn-ghost !min-h-[36px] text-xs">
            ← All events
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-7">
        {/* Event hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl bg-white border border-slate-200 overflow-hidden mb-5 sm:mb-6"
        >
          <div
            className="relative h-44 sm:h-56 bg-cover bg-center"
            style={{ backgroundImage: `url(${demoEvent.image_url})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500 text-white text-[10px] font-bold uppercase tracking-wider">
              🔥 Trending
            </div>
            <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 border border-violet-200 text-[10px] font-bold uppercase tracking-wider text-violet-700">
              ✨ FanFlow AI included
            </div>
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <div className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-90 mb-1">
                ⚽ FIFA World Cup 2026 · Final
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight">
                {demoEvent.name}
              </h1>
            </div>
          </div>
          <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">{demoVenue.name}</div>
              <div className="text-xs text-slate-500">East Rutherford, NJ</div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100">
                📅 Sat, Jul 19
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100">
                ⏰ 7:00 PM
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700">
                🌤 72°F
              </span>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
          {/* Left: simulated seat map */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="kicker">Pick your section</div>
                <h2 className="font-bold text-slate-900 text-base mt-0.5">
                  MetLife Stadium · seat map
                </h2>
              </div>
              <span className="text-[11px] text-slate-500">Mocked tiers</span>
            </div>

            {/* Pitch graphic — top-down view */}
            <div className="relative bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 overflow-hidden">
              {/* Pitch field */}
              <div className="relative mx-auto w-full max-w-md aspect-[3/2] bg-emerald-600 rounded-lg border-2 border-white">
                {/* Center circle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-2 border-white/80 rounded-full" />
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/80 -translate-y-1/2" />
                {/* Goal boxes */}
                <div className="absolute top-1/2 -translate-y-1/2 left-0 w-8 h-20 border-2 border-l-0 border-white/80" />
                <div className="absolute top-1/2 -translate-y-1/2 right-0 w-8 h-20 border-2 border-r-0 border-white/80" />
                {/* Selected section indicator */}
                {selected && (
                  <motion.div
                    key={selected.id}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-violet-600 text-white text-[10px] font-bold whitespace-nowrap"
                  >
                    Your view from {selected.label}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Section tier toggle */}
            {(['lower', 'upper'] as const).map((tier) => (
              <div key={tier} className="mb-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  {tier === 'lower' ? '100-level (lower bowl)' : '200-level (upper bowl)'}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {SECTIONS.filter((s) => s.tier === tier).map((s) => {
                    const active = s.id === selected.id
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelected(s)}
                        className={`relative rounded-xl border p-2.5 text-left transition ${
                          active
                            ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-200'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        {s.ticketRecommended && !active && (
                          <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-violet-600 text-white text-[9px] font-bold">
                            ★
                          </span>
                        )}
                        <div
                          className={`font-bold text-base font-mono tabular-nums ${
                            active ? 'text-violet-700' : 'text-slate-900'
                          }`}
                        >
                          {s.label}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          From ${s.price.toLocaleString()}
                        </div>
                        <div className="flex gap-0.5 mt-1">
                          {s.accessible && (
                            <span className="text-[9px]" title="Accessible">♿</span>
                          )}
                          {s.family && (
                            <span className="text-[9px]" title="Family friendly">👶</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            <div className="text-[11px] text-slate-500 leading-relaxed">
              <span className="text-violet-700 font-semibold">★ Recommended</span> — based on
              FanFlow-eligible gates and family-friendly sections near Section{' '}
              {demoTicket.section}.
            </div>
          </motion.div>

          {/* Right: ticket option panel */}
          <motion.aside
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 h-fit lg:sticky lg:top-20"
          >
            <div className="kicker mb-2">Your seat</div>
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <div className="font-bold text-slate-900 text-xl">Section {selected.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Row {demoTicket.row} · Seat {demoTicket.seat} · 1 ticket
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Price
                </div>
                <div className="font-bold text-slate-900 text-xl tabular-nums">
                  ${selected.price.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3 mb-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Ticket</span>
                <span className="tabular-nums">${selected.price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Service fee</span>
                <span className="tabular-nums">$0</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Prices include all fees</span>
                <span>✓</span>
              </div>
            </div>

            {/* FanFlow callout */}
            <div className="rounded-xl bg-gradient-to-br from-violet-50 via-white to-white border border-violet-200 p-3 mb-4">
              <div className="flex items-start gap-2.5">
                <span className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center text-sm flex-shrink-0">
                  ✨
                </span>
                <div className="min-w-0">
                  <div className="font-bold text-violet-900 text-xs">
                    FanFlow AI · Free
                  </div>
                  <p className="text-[11px] text-violet-800/80 mt-0.5 leading-relaxed">
                    Unlocks the moment you confirm. Personalized arrival plan, live signals,
                    and a smarter way to get to your seat.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              className="btn-primary w-full !min-h-[52px] text-base relative"
            >
              {checkingOut ? (
                <span className="flex items-center gap-2">
                  <motion.span
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                  />
                  Processing…
                </span>
              ) : (
                <>Continue to checkout · ${selected.price.toLocaleString()}</>
              )}
            </button>

            <p className="text-[10px] text-slate-400 text-center mt-2">
              Mock checkout — no payment is taken. Routes into the FanFlow handoff.
            </p>
          </motion.aside>
        </div>

        {/* What you get section — anchors the FanFlow value */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 rounded-2xl bg-slate-900 text-white p-5 sm:p-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">✨</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-violet-200">
              Included with this StubHub ticket
            </span>
          </div>
          <h3 className="font-bold text-lg sm:text-xl tracking-tight mb-4">
            FanFlow AI · arrives the moment your ticket does
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              { icon: '🎟️', title: 'Event Day Hub', body: 'Countdown, plan, live signals at a glance.' },
              { icon: '🧭', title: 'Personalized arrival', body: 'Best gate · leave-by time · transit route.' },
              { icon: '🗺️', title: 'Venue map', body: 'Family services, accessibility, quiet spaces.' },
              { icon: '📡', title: 'Live signals', body: 'Staff weighted 3× over fan reports.' },
            ].map((b) => (
              <div key={b.title} className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-full bg-violet-600/20 border border-violet-400/30 flex items-center justify-center text-base flex-shrink-0">
                  {b.icon}
                </span>
                <div className="min-w-0">
                  <div className="font-semibold text-white text-sm">{b.title}</div>
                  <div className="text-xs text-slate-300 mt-0.5 leading-snug">{b.body}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Processing overlay */}
      <AnimatePresence>
        {checkingOut && (
          <motion.div
            className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl"
            >
              <motion.div
                className="w-12 h-12 mx-auto mb-3 border-4 border-violet-200 border-t-violet-600 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
              />
              <div className="font-bold text-slate-900 text-sm">Confirming your ticket…</div>
              <div className="text-xs text-slate-500 mt-1">Unlocking FanFlow AI in a moment.</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
