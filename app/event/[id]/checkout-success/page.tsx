'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { demoEvent, demoTicket, demoVenue } from '@/lib/seed'

/**
 * Checkout-success cinematic handoff.
 *
 * The literal post-purchase moment, shown as a short (~5-6s) cinematic
 * sequence. Mirrors the StubHub confirmation aesthetic, then transitions
 * into the FanFlow unlock — anchoring FanFlow as something that begins
 * the second checkout ends.
 *
 * Sequence:
 *   0.0s — Stripe-style checkmark stamp ("Ticket confirmed")
 *   0.8s — Ticket-receipt card reveals (section, row, seat, total)
 *   1.8s — Divider draws across, kicker "Next, a StubHub benefit"
 *   2.4s — "FanFlow AI" wordmark fades in
 *   3.0s — 4 module cards stagger in (Hub, Guide, Map, Live)
 *   5.0s — CTA appears; auto-route after 1.5s if user hasn't clicked
 *
 * Respects prefers-reduced-motion (renders the static end state without
 * the cinematic delay, auto-redirect kept).
 */
export default function CheckoutSuccessPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const reduced = useReducedMotion()
  const eventId = params?.id ?? 'wc2026-final'

  const [autoCountdown, setAutoCountdown] = useState<number | null>(null)

  // After the cinematic reveal completes, start a soft auto-route timer so
  // the demo is hands-off if the recruiter doesn't click. User can cancel
  // by clicking either CTA.
  useEffect(() => {
    const cinemaDuration = reduced ? 800 : 5500
    const t = setTimeout(() => setAutoCountdown(3), cinemaDuration)
    return () => clearTimeout(t)
  }, [reduced])

  useEffect(() => {
    if (autoCountdown === null) return
    if (autoCountdown <= 0) {
      // Route into the thinking screen rather than straight to the Hub —
      // the rule engine reveal sits between unlock and Hub.
      router.push(`/event/${eventId}/building-plan`)
      return
    }
    const t = setTimeout(() => setAutoCountdown((n) => (n === null ? null : n - 1)), 1000)
    return () => clearTimeout(t)
  }, [autoCountdown, eventId, router])

  const reveal = (delay: number) =>
    reduced
      ? { initial: false, animate: { opacity: 1, y: 0 } }
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
        }

  return (
    <div className="min-h-screen page-bg page-enter">
      {/* Soft top bar — confirmation receipt feel */}
      <div className="page-header px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="dot bg-emerald-500" />
          <h1 className="font-bold text-slate-900 text-sm">Order #SH-{demoTicket.id.slice(-6).toUpperCase()}</h1>
        </div>
        <span className="text-xs text-slate-500">StubHub</span>
      </div>

      <div className="container-mobile px-4 py-6 sm:py-8 space-y-5 safe-bottom">
        {/* === Beat 1: Stripe-style checkmark stamp === */}
        <motion.div
          className="flex flex-col items-center text-center pt-2 pb-1"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            className="relative w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-200 flex items-center justify-center mb-3"
            initial={reduced ? false : { scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Pulsing ring */}
            {!reduced && (
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-emerald-400"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 1.8, repeat: 2, ease: 'easeOut', delay: 0.2 }}
              />
            )}
            <motion.svg
              viewBox="0 0 24 24"
              className="w-10 h-10 text-emerald-600"
              initial={reduced ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
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
            className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight"
            {...reveal(0.4)}
          >
            Ticket confirmed
          </motion.h2>
          <motion.p
            className="text-sm text-slate-500 mt-1"
            {...reveal(0.55)}
          >
            Your seat is locked in. A receipt was sent to your email.
          </motion.p>
        </motion.div>

        {/* === Beat 2: Ticket-receipt card === */}
        <motion.div
          className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm"
          {...reveal(0.85)}
        >
          {/* Top stub strip with perforation feel */}
          <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-70">
                FIFA World Cup 2026
              </span>
            </div>
            <span className="text-[10px] font-mono opacity-70">{new Date().toLocaleDateString()}</span>
          </div>
          <div className="p-5">
            <div className="font-bold text-slate-900 text-lg leading-tight">
              {demoEvent.name}
            </div>
            <div className="text-sm text-slate-500 mt-0.5">
              {demoVenue.name} · East Rutherford, NJ
            </div>

            <div className="mt-4 pt-4 border-t border-dashed border-slate-200 grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Section</div>
                <div className="font-bold text-slate-900 text-lg mt-0.5 font-mono">{demoTicket.section}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Row</div>
                <div className="font-bold text-slate-900 text-lg mt-0.5 font-mono">{demoTicket.row}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Seat</div>
                <div className="font-bold text-slate-900 text-lg mt-0.5 font-mono">{demoTicket.seat}</div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between text-sm">
              <span className="text-slate-500">Total paid</span>
              <span className="font-bold text-slate-900 tabular-nums">$1,248.00</span>
            </div>
          </div>
        </motion.div>

        {/* === Beat 3: Divider + benefit kicker === */}
        <motion.div
          className="flex items-center gap-3 pt-1"
          {...reveal(1.6)}
        >
          <motion.div
            className="flex-1 h-px bg-gradient-to-r from-transparent via-violet-300 to-violet-300"
            initial={reduced ? false : { scaleX: 0, transformOrigin: 'left' }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.7, delay: 1.8, ease: [0.16, 1, 0.3, 1] }}
          />
          <span className="kicker text-violet-700 whitespace-nowrap">
            Next, a StubHub benefit
          </span>
          <motion.div
            className="flex-1 h-px bg-gradient-to-l from-transparent via-violet-300 to-violet-300"
            initial={reduced ? false : { scaleX: 0, transformOrigin: 'right' }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.7, delay: 1.8, ease: [0.16, 1, 0.3, 1] }}
          />
        </motion.div>

        {/* === Beat 4: FanFlow unlock wordmark === */}
        <motion.div
          className="text-center py-2"
          {...reveal(2.2)}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-50 border border-violet-200 mb-3"
            initial={reduced ? false : { scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 2.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.span
              className="text-base"
              animate={reduced ? undefined : { rotate: [0, -10, 10, -6, 0] }}
              transition={reduced ? undefined : { duration: 1.2, delay: 2.5, ease: 'easeInOut' }}
            >
              ✨
            </motion.span>
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-violet-700">
              FanFlow AI · Unlocked
            </span>
          </motion.div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight px-4">
            Your Event Day Guide is being prepared
          </h3>
          <p className="text-sm text-slate-500 mt-1 px-4">
            Because you booked through StubHub, you get personalized arrival guidance — free.
          </p>
        </motion.div>

        {/* === Beat 5: Four module cards stagger in === */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            {
              icon: '🎟️',
              title: 'Event Day Hub',
              sub: 'Countdown · plan · live signals',
              tone: 'from-violet-50 to-white border-violet-200',
              iconBg: 'bg-violet-600',
            },
            {
              icon: '🧭',
              title: 'Arrival Guide',
              sub: 'Best gate · leave time · route',
              tone: 'from-emerald-50 to-white border-emerald-200',
              iconBg: 'bg-emerald-600',
            },
            {
              icon: '🗺️',
              title: 'Venue Map',
              sub: 'Section walk · support nearby',
              tone: 'from-sky-50 to-white border-sky-200',
              iconBg: 'bg-sky-600',
            },
            {
              icon: '📡',
              title: 'Live Updates',
              sub: 'Staff signals · fan pulse',
              tone: 'from-amber-50 to-white border-amber-200',
              iconBg: 'bg-amber-600',
            },
          ].map((m, i) => (
            <motion.div
              key={m.title}
              className={`relative rounded-2xl border bg-gradient-to-br ${m.tone} p-3.5 overflow-hidden`}
              initial={reduced ? false : { opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.5,
                delay: reduced ? 0 : 3.0 + i * 0.18,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div className={`w-9 h-9 rounded-full ${m.iconBg} text-white flex items-center justify-center text-base mb-2`}>
                {m.icon}
              </div>
              <div className="font-bold text-sm text-slate-900 leading-tight">{m.title}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{m.sub}</div>
              {/* Shimmer sweep on reveal */}
              {!reduced && (
                <motion.span
                  className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none"
                  initial={{ x: '-100%', opacity: 0 }}
                  animate={{ x: '350%', opacity: [0, 1, 0] }}
                  transition={{ duration: 0.9, delay: 3.0 + i * 0.18 + 0.2, ease: 'easeOut' }}
                />
              )}
            </motion.div>
          ))}
        </div>

        {/* === Beat 6: CTA strip === */}
        <motion.div
          className="rounded-2xl bg-slate-900 text-white p-4 sm:p-5"
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: reduced ? 0 : 4.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-3">
            <motion.div
              className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center text-base flex-shrink-0"
              animate={reduced ? undefined : { scale: [1, 1.08, 1] }}
              transition={reduced ? undefined : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              ✦
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm">Build my event day plan</div>
              <div className="text-xs text-slate-300 mt-0.5">
                {autoCountdown !== null
                  ? `Starting in ${autoCountdown}s…`
                  : 'See how FanFlow picks your gate, leave-by time, and route.'}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 mt-4">
            <Link
              href={`/event/${eventId}/building-plan`}
              onClick={() => setAutoCountdown(null)}
              className="inline-flex items-center justify-center gap-1 min-h-[44px] px-5 rounded-full bg-white text-slate-900 font-bold text-sm hover:bg-slate-100 transition"
            >
              Build my event day plan →
            </Link>
            <Link
              href={`/event/${eventId}/readiness`}
              onClick={() => setAutoCountdown(null)}
              className="inline-flex items-center justify-center gap-1 min-h-[44px] px-5 rounded-full bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 transition"
            >
              Personalize first
            </Link>
          </div>
        </motion.div>

        <motion.p
          className="text-center text-[11px] text-slate-400 pt-2"
          {...reveal(reduced ? 0 : 5.0)}
        >
          FanFlow AI is included free with every StubHub ticket purchase.
        </motion.p>
      </div>
    </div>
  )
}
