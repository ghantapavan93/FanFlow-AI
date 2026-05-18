'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { demoEvent, demoTicket, demoVenue } from '@/lib/seed'

/**
 * /my-tickets — the saved-tickets surface.
 *
 * A real route (not a vision mock) backed by the seed ticket. The
 * recruiter can land here at any time to see how FanFlow attaches to a
 * StubHub-style "My Tickets" tab — the entry point fans actually use
 * when checking confirmations before an event.
 *
 * Each ticket row carries a "FanFlow AI · Open event day guide" CTA
 * routing to the real working Hub. No backend integration claimed:
 * tickets here are the seeded demo set, mirroring what a real
 * `getMyTickets(userId)` call would return after StubHub OAuth.
 */

const eventDate = new Date(demoEvent.date)

function formatLong(d: Date): string {
  // Locale-independent — avoid hydration mismatch in SSR.
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function formatTime(d: Date): string {
  let h = d.getHours()
  const m = d.getMinutes().toString().padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h.toString().padStart(2, '0')}:${m} ${ampm}`
}

export default function MyTicketsPage() {
  const dateStr = formatLong(eventDate)
  const timeStr = formatTime(eventDate)
  return (
    <div className="min-h-screen bg-slate-50 page-enter">
      {/* Minimal top bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-violet-600 to-violet-800" />
            <span className="font-bold text-slate-900">My Tickets</span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 border border-violet-100 text-[10px] font-bold uppercase tracking-wider text-violet-700">
              + FanFlow AI
            </span>
          </div>
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-700">
            ← Home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
        <div>
          <div className="kicker mb-1">Upcoming events</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Your saved tickets
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tickets you've purchased through StubHub. Eligible events show FanFlow AI guidance.
          </p>
        </div>

        {/* Ticket card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl bg-white border border-slate-200 overflow-hidden"
        >
          {/* Top stub strip with perforation feel */}
          <div className="bg-slate-900 text-white px-4 sm:px-5 py-2.5 flex items-center justify-between text-[10px]">
            <span className="font-bold uppercase tracking-[0.15em] opacity-70">
              FIFA World Cup 2026
            </span>
            <span className="font-mono opacity-70">{dateStr}</span>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 text-lg sm:text-xl leading-tight">
                  {demoEvent.name}
                </div>
                <div className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  {demoVenue.name} · East Rutherford, NJ
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Confirmed
              </span>
            </div>

            {/* Stub fields */}
            <div className="mt-2 pt-3 border-t border-dashed border-slate-200 grid grid-cols-4 gap-2 text-center">
              {[
                { k: 'Date', v: dateStr.split(',')[0] },
                { k: 'Section', v: demoTicket.section },
                { k: 'Row', v: demoTicket.row },
                { k: 'Seat', v: demoTicket.seat },
              ].map((c) => (
                <div key={c.k}>
                  <div className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {c.k}
                  </div>
                  <div className="font-bold text-slate-900 text-sm sm:text-base mt-0.5 font-mono">
                    {c.v}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>Doors open at</span>
              <span className="font-semibold text-slate-900 font-mono">
                {formatTime(new Date(eventDate.getTime() - 2 * 60 * 60 * 1000))}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
              <span>Kickoff</span>
              <span className="font-semibold text-slate-900 font-mono">{timeStr}</span>
            </div>

            {/* FanFlow strip — the real point of this page */}
            <div className="mt-4 rounded-xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-200 p-3">
              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-full bg-violet-600 text-white flex items-center justify-center text-base flex-shrink-0">
                  ✨
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-violet-700">
                    FanFlow AI · ready
                  </div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    Open your event day guide
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed mt-1">
                    Gate, leave-by time, route, support resources, and live entry conditions —
                    personalized to your seat and group.
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                <Link
                  href={`/event/${demoEvent.id}/hub`}
                  className="btn-primary !min-h-[44px] text-sm"
                >
                  Open Event Day Hub →
                </Link>
                <Link
                  href={`/event/${demoEvent.id}/readiness`}
                  className="inline-flex items-center justify-center px-4 min-h-[44px] rounded-full border border-slate-300 text-slate-900 text-sm font-semibold hover:bg-slate-50 transition"
                >
                  Personalize
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Empty / phase-2 note */}
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">More tickets here in Phase 2.</span>{' '}
          Production wiring queries by `user_id` from the StubHub purchase history. The seed
          shows the Maria ticket only for the demo.
        </div>

        {/* Safety + trust */}
        <p className="text-center text-[11px] text-slate-500 pt-2 leading-relaxed max-w-md mx-auto">
          Always follow venue signage and staff instructions. FanFlow provides guidance, not
          emergency response.
        </p>
      </main>
    </div>
  )
}
