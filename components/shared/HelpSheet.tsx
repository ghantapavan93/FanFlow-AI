'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { demoEvent, demoTicket, demoVenue } from '@/lib/seed'
import type { ArrivalPlan, SupportPoint, SupportType } from '@/lib/types'

const SUPPORT_TONE: Record<SupportType, string> = {
  first_aid: '#dc2626',
  family_services: '#7c3aed',
  accessibility: '#0ea5e9',
  restroom: '#475569',
  guest_services: '#0891b2',
  quiet_space: '#16a34a',
  concessions: '#ea580c',
}
const SUPPORT_EMOJI: Record<SupportType, string> = {
  first_aid: '➕',
  family_services: '👶',
  accessibility: '♿',
  restroom: '🚻',
  guest_services: 'ℹ️',
  quiet_space: '🧩',
  concessions: '🍿',
}
const SUPPORT_META_LABELS: Record<SupportType, string> = {
  first_aid: 'First Aid',
  family_services: 'Family Services',
  accessibility: 'Accessible Entry',
  restroom: 'Restroom',
  guest_services: 'Guest Services',
  quiet_space: 'Quiet Space',
  concessions: 'Concessions',
}

type CategoryId =
  | 'wrong_gate'
  | 'running_late'
  | 'accessibility'
  | 'medical_family'
  | 'ticket_issue'
  | 'calmer_route'

const CATEGORIES: { id: CategoryId; label: string; emoji: string }[] = [
  { id: 'wrong_gate', label: 'I am at the wrong gate', emoji: '🚪' },
  { id: 'running_late', label: 'I am running late', emoji: '⏰' },
  { id: 'accessibility', label: 'I need accessibility support', emoji: '♿' },
  { id: 'medical_family', label: 'I need medical or family support', emoji: '➕' },
  { id: 'ticket_issue', label: 'My ticket or transfer is not ready', emoji: '🎟️' },
  { id: 'calmer_route', label: 'I need a calmer route', emoji: '🧩' },
]

function findSupport(
  plan: ArrivalPlan,
  fallback: SupportPoint[],
  ...types: SupportType[]
): SupportPoint | undefined {
  for (const t of types) {
    const inPlan = plan.support_points.find((s) => s.type === t)
    if (inPlan) return inPlan
    const inAll = fallback.find((s) => s.type === t)
    if (inAll) return inAll
  }
  return undefined
}

function suggestion(
  cat: CategoryId,
  plan: ArrivalPlan,
): { headline: string; body: string; mapHighlight?: SupportType } {
  const gate = plan.recommended_gate
  switch (cat) {
    case 'wrong_gate': {
      return {
        headline: `Walk to ${gate.name}`,
        body: `Your recommended entrance is ${gate.name}. Follow signs for that gate — staff at any entrance can point you there. Your mobile ticket works at all gates, but ${gate.name} is closest to your seat.`,
      }
    }
    case 'running_late': {
      return {
        headline: 'Walk briskly, do not run',
        body: `Head straight to ${gate.name}. Have your mobile ticket open before you arrive. If you miss the start, staff can direct you to a nearby standing area until a natural break.`,
      }
    }
    case 'accessibility': {
      const sp = findSupport(plan, demoVenue.support_points, 'accessibility')
      return {
        headline: sp ? `Closest: ${sp.name}` : 'Ask any staff member',
        body: sp
          ? `${sp.description}${sp.walk_time_minutes ? ` Approximately ${sp.walk_time_minutes} min from your seat.` : ''} Any staff member can also radio for a wheelchair escort.`
          : 'Any staff member can radio for an accessibility escort. Look for high-visibility vests at entrances.',
        mapHighlight: 'accessibility',
      }
    }
    case 'medical_family': {
      const family = findSupport(plan, demoVenue.support_points, 'family_services')
      const firstAid = findSupport(plan, demoVenue.support_points, 'first_aid')
      return {
        headline: 'For urgent medical issues, call 911',
        body: `For non-urgent medical needs, First Aid${
          firstAid?.walk_time_minutes ? ` is ~${firstAid.walk_time_minutes} min away` : ' is on the main concourse'
        }. For nursing, stroller storage, or a family meetup point, head to ${
          family?.name ?? 'Family Services'
        }. Tell any staff member you need help — they will radio for support.`,
        mapHighlight: 'first_aid',
      }
    }
    case 'ticket_issue': {
      const guest = findSupport(plan, demoVenue.support_points, 'guest_services')
      return {
        headline: 'Verify in the StubHub app first',
        body: `Open the StubHub app and check your transfer status. If it is still pending, go to ${
          guest?.name ?? 'Guest Services'
        }${guest?.walk_time_minutes ? ` (~${guest.walk_time_minutes} min)` : ''} — they can look up your order ID.`,
        mapHighlight: 'guest_services',
      }
    }
    case 'calmer_route': {
      const quiet = findSupport(plan, demoVenue.support_points, 'quiet_space')
      return {
        headline: quiet ? `Quiet space: ${quiet.name}` : 'Take a moment',
        body: quiet
          ? `${quiet.description}${quiet.walk_time_minutes ? ` Approximately ${quiet.walk_time_minutes} min walk.` : ''} Plenty of fans need a calmer pause — staff can also escort you there.`
          : 'Step away from the main concourse to a quieter area near the back rows. Staff can help you find a low-traffic route.',
        mapHighlight: 'quiet_space',
      }
    }
  }
}

interface HelpSheetProps {
  open: boolean
  onClose: () => void
  plan: ArrivalPlan
  eventId: string
}

export function HelpSheet({ open, onClose, plan, eventId }: HelpSheetProps) {
  const [category, setCategory] = useState<CategoryId | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open) setCategory(null)
  }, [open])

  const action = useMemo(() => (category ? suggestion(category, plan) : null), [category, plan])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-sheet-title"
    >
      <button
        aria-label="Close help"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <div className="relative w-full sm:max-w-lg bg-white sm:rounded-2xl rounded-t-3xl shadow-2xl max-h-[92vh] overflow-hidden flex flex-col animate-in">
        {/* Mobile drag handle */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="px-5 py-3.5 sm:py-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div>
            <h2 id="help-sheet-title" className="font-bold text-slate-900 text-lg">
              Need help?
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {demoEvent.name} · Section {demoTicket.section}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-700 active:text-slate-900 text-2xl leading-none w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 transition"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-4 space-y-5 flex-1">
          {/* === Nearby support FIRST — proactive, not reactive ========= */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">📍</span>
              <div className="kicker text-violet-700">Nearby support for your location</div>
            </div>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              Based on your gate ({plan.recommended_gate.name.replace(/\s*\(.*\)/, '')}) and Section {demoTicket.section}. Tap to view on map.
            </p>
            <div className="space-y-2">
              {plan.support_points.map((sp) => (
                <Link
                  key={sp.id}
                  href={`/event/${eventId}/venue-map`}
                  onClick={onClose}
                  className="list-row min-h-[56px]"
                >
                  <span
                    className="thumb-circle"
                    style={{ background: SUPPORT_TONE[sp.type] ?? '#7c3aed' }}
                    aria-hidden="true"
                  >
                    {SUPPORT_EMOJI[sp.type] ?? '📍'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">{sp.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {sp.walk_time_minutes ? `~${sp.walk_time_minutes} min walk · ` : ''}
                      {SUPPORT_META_LABELS[sp.type] ?? sp.type}
                    </div>
                  </div>
                  <span className="text-slate-300 flex-shrink-0">›</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Plan context */}
          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
            <div className="kicker text-violet-700">Your plan right now</div>
            <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-slate-500 text-xs">Gate</div>
                <div className="font-semibold text-slate-900">{plan.recommended_gate.name.replace(/\s*\(.*\)/, '')}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs">Leave by</div>
                <div className="font-semibold text-slate-900">{plan.leave_by_time}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs">Arrive at</div>
                <div className="font-semibold text-slate-900">{plan.arrival_time}</div>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div>
            <div className="kicker mb-2">What is going on?</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`text-left min-h-[56px] p-3 rounded-2xl border transition flex items-center gap-3 ${
                    category === c.id
                      ? 'border-violet-600 bg-violet-50'
                      : 'border-slate-200 hover:border-slate-300 active:bg-slate-50 bg-white'
                  }`}
                >
                  <span className="text-xl leading-none flex-shrink-0">{c.emoji}</span>
                  <span className="text-sm font-semibold text-slate-900 leading-snug">
                    {c.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Suggestion — animated reveal when a category is picked */}
          <AnimatePresence mode="wait">
            {action && (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
              >
                <div className="kicker text-emerald-700">Suggested next step</div>
                <div className="font-bold text-emerald-900 mt-1">{action.headline}</div>
                <p className="text-sm text-emerald-900/90 mt-2 leading-relaxed">{action.body}</p>
                {action.mapHighlight && (
                  <Link
                    href={`/event/${eventId}/venue-map`}
                    onClick={onClose}
                    className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-emerald-700 hover:underline"
                  >
                    View on map ›
                  </Link>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Safety wording */}
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-900 leading-relaxed">
            <strong>For urgent medical or safety issues, contact venue staff or local emergency services (911).</strong>{' '}
            FanFlow provides guidance, not emergency response.
          </div>

          {/* StubHub fallback — visible but secondary */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                SH
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-700">
                  Can&apos;t find what you need?
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  StubHub Support is available for ticket and account issues.
                </div>
              </div>
              <a
                href="https://www.stubhub.com/help"
                target="_blank"
                rel="noreferrer noopener"
                className="text-[11px] font-bold text-violet-700 hover:underline flex-shrink-0"
              >
                Contact ›
              </a>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t border-slate-200 px-4 pt-3 safe-bottom grid grid-cols-2 gap-2">
          <Link
            href={`/event/${eventId}/venue-map`}
            onClick={onClose}
            className="btn-primary text-sm !min-h-[44px] !px-4"
          >
            View on map
          </Link>
          <button
            onClick={onClose}
            className="btn-ghost text-sm !min-h-[44px] !px-4 border-2 border-slate-200"
          >
            Back to guide
          </button>
        </div>
      </div>
    </div>
  )
}
