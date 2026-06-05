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

        {/* === Beats 4–6: Cinematic FanFlow Unlocked moment =============
            One dark, glowing card that does the whole transition: badge,
            event context, route line drawing from "you" to the venue,
            module strip, and the single primary CTA. */}
        <motion.div
          className="relative overflow-hidden rounded-3xl text-white p-5 sm:p-6 mt-2"
          style={{
            background:
              'radial-gradient(circle at 75% 12%, rgba(167,139,250,0.30), transparent 55%),' +
              'radial-gradient(circle at 18% 95%, rgba(236,72,153,0.22), transparent 55%),' +
              'linear-gradient(160deg, #0b0820 0%, #1a0f3d 55%, #150b35 100%)',
          }}
          initial={reduced ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: reduced ? 0 : 2.0, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Stadium-energy background — soft scan beam + drifting orbs */}
          {!reduced && (
            <>
              <motion.div
                aria-hidden="true"
                className="absolute -top-20 -left-10 w-60 h-60 rounded-full bg-violet-500/20 blur-3xl"
                animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
                transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                aria-hidden="true"
                className="absolute -bottom-16 -right-10 w-72 h-72 rounded-full bg-fuchsia-500/15 blur-3xl"
                animate={{ x: [0, -25, 0], y: [0, -15, 0] }}
                transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                aria-hidden="true"
                className="absolute inset-x-0 top-1/3 h-px bg-gradient-to-r from-transparent via-violet-300/70 to-transparent"
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: [0, 0.7, 0], scaleX: [0, 1, 1] }}
                transition={{ duration: 2.2, delay: 2.4, ease: 'easeInOut' }}
              />
            </>
          )}

          <div className="relative">
            {/* Status badge */}
            <motion.div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm"
              initial={reduced ? false : { scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: reduced ? 0 : 2.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="relative flex w-2.5 h-2.5">
                <span className="absolute inset-0 rounded-full bg-violet-300 animate-ping opacity-60" />
                <span className="relative inline-block w-2.5 h-2.5 rounded-full bg-violet-400" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-200">
                FanFlow AI · Unlocked
              </span>
            </motion.div>

            {/* Cinematic title */}
            <motion.h3
              className="text-[26px] sm:text-3xl font-extrabold tracking-tight leading-[1.05] mt-3"
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: reduced ? 0 : 2.45, ease: [0.16, 1, 0.3, 1] }}
            >
              Your ticket just became
              <br className="hidden sm:block" />
              an event-day companion.
            </motion.h3>

            {/* Event context line */}
            <motion.p
              className="text-[12px] text-violet-200/80 mt-2 leading-relaxed"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: reduced ? 0 : 2.65 }}
            >
              {demoEvent.name} · {demoVenue.name} · Section {demoTicket.section}
            </motion.p>

            {/* Route line — fan → venue, drawing in */}
            <motion.div
              className="mt-5 flex items-center gap-3"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45, delay: reduced ? 0 : 2.9 }}
            >
              <div className="flex flex-col items-center">
                <span className="w-8 h-8 rounded-full bg-white/10 border border-white/30 backdrop-blur flex items-center justify-center text-sm">
                  📍
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-violet-300 mt-1">
                  You
                </span>
              </div>

              <div className="flex-1 relative h-[3px]">
                {/* Static track */}
                <div className="absolute inset-0 rounded-full bg-white/10" />
                {/* Animated route fill */}
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-300 shadow-[0_0_12px_rgba(167,139,250,0.5)]"
                  initial={reduced ? { width: '100%' } : { width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: reduced ? 0 : 1.6, delay: reduced ? 0 : 3.05, ease: [0.16, 1, 0.3, 1] }}
                />
                {/* Travelling pulse */}
                {!reduced && (
                  <motion.span
                    className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]"
                    initial={{ left: '0%' }}
                    animate={{ left: ['0%', '100%'] }}
                    transition={{ duration: 1.6, delay: 3.05, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
              </div>

              <div className="flex flex-col items-center">
                <span className="w-8 h-8 rounded-full bg-violet-500/30 border border-violet-300/50 backdrop-blur flex items-center justify-center text-sm">
                  🏟
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-violet-200 mt-1">
                  Venue
                </span>
              </div>
            </motion.div>

            {/* Module pills — what FanFlow unlocks */}
            <motion.div
              className="grid grid-cols-4 gap-1.5 mt-5"
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: reduced ? 0 : 3.6 }}
            >
              {[
                { icon: '🧭', label: 'Plan' },
                { icon: '🅿️', label: 'Parking' },
                { icon: '🗺️', label: 'Map' },
                { icon: '🚪', label: 'Exit' },
              ].map((m, i) => (
                <motion.div
                  key={m.label}
                  className="rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm px-2 py-2 text-center"
                  initial={reduced ? false : { opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.35,
                    delay: reduced ? 0 : 3.7 + i * 0.08,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <div className="text-base">{m.icon}</div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-violet-200 mt-0.5">
                    {m.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Primary CTA */}
            <motion.div
              className="mt-5"
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: reduced ? 0 : 4.2 }}
            >
              <Link
                href={`/event/${eventId}/building-plan`}
                onClick={() => setAutoCountdown(null)}
                className="group relative inline-flex w-full items-center justify-center gap-2 min-h-[52px] px-5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white font-bold text-base shadow-[0_8px_24px_-6px_rgba(167,139,250,0.55)] transition overflow-hidden"
              >
                <span className="relative z-10">Build My Event Day Plan</span>
                <span className="relative z-10 transition-transform group-hover:translate-x-0.5">→</span>
                {!reduced && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:translate-x-full transition-transform duration-1000"
                  />
                )}
              </Link>
              <div className="flex items-center justify-between gap-2 mt-3 text-[11px] text-violet-200/80">
                <Link
                  href={`/event/${eventId}/readiness`}
                  onClick={() => setAutoCountdown(null)}
                  className="hover:text-white underline-offset-2 hover:underline transition"
                >
                  Personalize first
                </Link>
                <span>
                  {autoCountdown !== null
                    ? `Starting in ${autoCountdown}s…`
                    : 'Included free with your StubHub ticket'}
                </span>
              </div>
            </motion.div>
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
