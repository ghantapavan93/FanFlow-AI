'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import type {
  AccessibilityNeed,
  GroupType,
  ReadinessPrefs,
  TransportMode,
} from '@/lib/types'
import { saveReadiness } from '@/lib/store'

type OptionCardProps = {
  selected: boolean
  onClick: () => void
  emoji: string
  title: string
  subtitle?: string
}

function OptionCard({ selected, onClick, emoji, title, subtitle }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left min-h-[64px] p-4 rounded-2xl border transition flex items-center gap-3 active:scale-[0.99] ${
        selected
          ? 'border-violet-600 bg-violet-50'
          : 'border-slate-200 bg-white hover:border-slate-300 active:bg-slate-50'
      }`}
    >
      <span className="text-2xl leading-none flex-shrink-0">{emoji}</span>
      <span className="flex-1 min-w-0">
        <span className="block font-semibold text-slate-900 text-base">{title}</span>
        {subtitle && <span className="block text-sm text-slate-600 mt-0.5">{subtitle}</span>}
      </span>
      {selected && (
        <span className="text-white bg-violet-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
          ✓
        </span>
      )}
    </button>
  )
}

const TRANSPORT_OPTIONS: { value: TransportMode; emoji: string; title: string; subtitle: string }[] = [
  { value: 'transit', emoji: '🚆', title: 'Public transit', subtitle: 'Train, bus, subway' },
  { value: 'driving', emoji: '🚗', title: 'Driving', subtitle: 'Parking onsite or nearby' },
  { value: 'rideshare', emoji: '🚕', title: 'Rideshare', subtitle: 'Uber, Lyft, taxi' },
  { value: 'walking', emoji: '🚶', title: 'Walking', subtitle: 'Local to the venue' },
]

const GROUP_OPTIONS: { value: GroupType; emoji: string; title: string; subtitle: string }[] = [
  { value: 'solo', emoji: '🧍', title: 'Just me', subtitle: 'Solo entry' },
  { value: 'couple', emoji: '👥', title: 'Two of us', subtitle: 'With one other adult' },
  { value: 'family_young_kids', emoji: '👨‍👩‍👧', title: 'Family with young kids', subtitle: 'Children under 12' },
  { value: 'family_teens', emoji: '👨‍👩‍👦', title: 'Family with older kids', subtitle: 'Teens or older' },
  { value: 'large_group', emoji: '👫👬', title: 'Larger group', subtitle: '4+ people' },
]

const NEED_OPTIONS: { value: AccessibilityNeed; emoji: string; title: string }[] = [
  { value: 'wheelchair', emoji: '♿', title: 'Wheelchair / step-free entry' },
  { value: 'stroller', emoji: '🍼', title: 'Stroller-friendly entry' },
  { value: 'hearing', emoji: '🦻', title: 'Hearing assistance' },
  { value: 'visual', emoji: '👁️', title: 'Visual assistance' },
  { value: 'sensory_sensitive', emoji: '🧩', title: 'Sensory-sensitive (quieter route)' },
]

export default function ReadinessPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const eventId = params?.id ?? 'wc2026-final'

  const [showIntro, setShowIntro] = useState(true)
  const [step, setStep] = useState(0)
  const [transport, setTransport] = useState<TransportMode | null>(null)
  const [group, setGroup] = useState<GroupType | null>(null)
  const [needs, setNeeds] = useState<AccessibilityNeed[]>([])
  const [notes, setNotes] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [celebrating, setCelebrating] = useState(false)

  const totalSteps = 4
  const progress = ((step + 1) / totalSteps) * 100

  // Auto-dismiss the calm micro-feedback toast after 1.6s
  useEffect(() => {
    if (!feedback) return
    const t = setTimeout(() => setFeedback(null), 1600)
    return () => clearTimeout(t)
  }, [feedback])

  const pickTransport = (t: TransportMode) => {
    setTransport(t)
    const msg: Record<TransportMode, string> = {
      transit: "Got it. Transit buffer added to your plan.",
      driving: "Got it. Parking + walk buffer added to your plan.",
      rideshare: "Got it. Rideshare timing buffer added.",
      walking: "Got it. We'll treat this as a short walk-up.",
    }
    setFeedback(msg[t])
  }

  const pickGroup = (g: GroupType) => {
    setGroup(g)
    const msg: Record<GroupType, string> = {
      solo: "Got it. Streamlined solo entry planned.",
      couple: "Got it. We'll plan for the two of you.",
      family_young_kids: "Got it. We'll account for your young family.",
      family_teens: "Got it. We'll account for your group.",
      large_group: "Got it. Extra buffer added for a larger group.",
    }
    setFeedback(msg[g])
  }

  const toggleNeed = (n: AccessibilityNeed) => {
    const wasSelected = needs.includes(n)
    setNeeds((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]))
    if (!wasSelected) {
      const msg: Record<AccessibilityNeed, string> = {
        wheelchair: 'Accessibility-aware routing enabled.',
        stroller: 'Stroller-friendly support added.',
        hearing: 'Hearing-assistance resources surfaced.',
        visual: 'Visual-assistance resources surfaced.',
        sensory_sensitive: 'Calmer route preference saved.',
        none: 'Preferences updated.',
      }
      setFeedback(msg[n])
    }
  }

  const canAdvance = () => {
    if (step === 0) return transport !== null
    if (step === 1) return group !== null
    return true
  }

  const finish = () => {
    setCelebrating(true)
    // Save immediately; redirect after the brief celebration so the user sees it
    setTimeout(() => router.push(`/event/${eventId}/hub`), 1400)
    const prefs: ReadinessPrefs = {
      transport: transport ?? 'transit',
      group: group ?? 'solo',
      needs: needs.length ? needs : ['none'],
      notes: notes.trim() || undefined,
      updated_at: new Date().toISOString(),
    }
    saveReadiness(prefs)
  }

  return (
    <div className="min-h-screen page-bg page-enter">
      <div className="page-header px-4 h-14 flex items-center justify-between">
        <h1 className="font-bold text-slate-900">Personalize your plan</h1>
        <Link
          href={`/event/${eventId}/hub`}
          className="btn-ghost !min-h-[40px] text-sm text-slate-500"
        >
          Skip
        </Link>
      </div>

      {/* Intro overlay — anchors the readiness flow as a StubHub benefit before
          asking for input. Dismissed by Continue or Skip; not gating after that. */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="max-w-md mx-auto px-4 pt-6 pb-32"
          >
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="card-base p-6 sm:p-7"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="w-11 h-11 rounded-full bg-violet-600 text-white flex items-center justify-center text-lg flex-shrink-0">
                  ✨
                </span>
                <div>
                  <div className="kicker text-violet-700">Personalize your plan</div>
                  <h2 className="font-bold text-slate-900 text-xl leading-tight mt-0.5">
                    A few quick questions.
                  </h2>
                </div>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Answer a few quick questions so FanFlow can adjust your arrival
                window, gate recommendation, and support resources.
              </p>
              <ul className="mt-5 space-y-2.5 text-sm text-slate-700">
                {[
                  'Group-aware route',
                  'Support points near your section',
                  'Calmer route option when available',
                  'Transit or rideshare timing buffer',
                  'Help context if you need support',
                ].map((b, i) => (
                  <motion.li
                    key={b}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: 0.2 + i * 0.06 }}
                    className="flex items-start gap-2.5"
                  >
                    <span className="text-violet-600 font-bold mt-0.5 flex-shrink-0">✓</span>
                    <span>{b}</span>
                  </motion.li>
                ))}
              </ul>
              <p className="text-xs text-slate-500 mt-5 leading-relaxed">
                Takes under 90 seconds. You can skip any question — FanFlow falls back to
                sensible defaults when something isn&apos;t set.
              </p>
            </motion.div>

            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={() => setShowIntro(false)}
                className="btn-primary w-full"
              >
                Get started →
              </button>
              <Link
                href={`/event/${eventId}/hub`}
                className="btn-ghost w-full text-sm text-slate-500"
              >
                Skip for now
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showIntro && (
      <div className="max-w-md mx-auto px-4 pt-3 pb-2">
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-600 transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-slate-500 mt-2 font-medium">
          Step {step + 1} of {totalSteps}
        </div>
      </div>
      )}

      {!showIntro && (
      <div className="max-w-md mx-auto px-4 py-5 space-y-4 pb-40">
        {step === 0 && (
          <>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">How are you getting there?</h2>
              <p className="text-slate-600 mt-1">We'll time your leave-by and pick the right gate.</p>
            </div>
            <div className="space-y-2">
              {TRANSPORT_OPTIONS.map((opt) => (
                <OptionCard
                  key={opt.value}
                  selected={transport === opt.value}
                  onClick={() => pickTransport(opt.value)}
                  emoji={opt.emoji}
                  title={opt.title}
                  subtitle={opt.subtitle}
                />
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Who's coming with you?</h2>
              <p className="text-slate-600 mt-1">Group size shapes timing and gate choice.</p>
            </div>
            <div className="space-y-2">
              {GROUP_OPTIONS.map((opt) => (
                <OptionCard
                  key={opt.value}
                  selected={group === opt.value}
                  onClick={() => pickGroup(opt.value)}
                  emoji={opt.emoji}
                  title={opt.title}
                  subtitle={opt.subtitle}
                />
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Any accessibility needs?</h2>
              <p className="text-slate-600 mt-1">
                Pick anything that applies. We'll route you to the right gate and support points.
              </p>
            </div>
            <div className="space-y-2">
              {NEED_OPTIONS.map((opt) => (
                <OptionCard
                  key={opt.value}
                  selected={needs.includes(opt.value)}
                  onClick={() => toggleNeed(opt.value)}
                  emoji={opt.emoji}
                  title={opt.title}
                />
              ))}
            </div>
            <p className="text-xs text-slate-500 px-1">You can change this anytime.</p>
          </>
        )}

        {step === 3 && (
          <>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Anything else we should know?</h2>
              <p className="text-slate-600 mt-1">Optional. Free-form notes for the day.</p>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. First MetLife visit. Traveling with a 6-year-old."
              className="w-full rounded-2xl border-2 border-slate-200 focus:border-violet-600 focus:outline-none p-4 min-h-32 text-slate-900 text-base resize-none transition"
              maxLength={300}
            />
            <div className="text-xs text-slate-500 text-right">{notes.length} / 300</div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 mt-4">
              <div className="kicker mb-3">Your profile</div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-600">Transport</dt>
                  <dd className="font-semibold text-slate-900 capitalize">{transport}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-600">Group</dt>
                  <dd className="font-semibold text-slate-900">
                    {GROUP_OPTIONS.find((g) => g.value === group)?.title ?? '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-600">Needs</dt>
                  <dd className="font-semibold text-slate-900 text-right">
                    {needs.length
                      ? needs
                          .map((n) => NEED_OPTIONS.find((o) => o.value === n)?.title ?? n)
                          .join(', ')
                      : 'None'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Future-ready preference memory card — Phase 2 hint */}
            <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Coming later
              </div>
              <div className="text-sm font-semibold text-slate-800">
                Save preferences for future tickets.
              </div>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                In a future release, FanFlow will remember calmer-route, family,
                accessibility, transit, and quiet-space preferences across your
                StubHub purchases. For this prototype, prefs live in this browser only.
              </p>
            </div>
          </>
        )}
      </div>
      )}

      {!showIntro && (
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-slate-200 px-4 pt-3 safe-bottom">
        <div className="max-w-md mx-auto flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="btn-secondary flex-1"
            >
              Back
            </button>
          )}
          {step < totalSteps - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance()}
              className="btn-primary flex-1"
            >
              Continue →
            </button>
          ) : (
            <button onClick={finish} className="btn-primary flex-1">
              Finish & see my plan →
            </button>
          )}
        </div>
      </div>
      )}

      {/* Completion celebration — brief, restrained confetti before redirect */}
      <AnimatePresence>
        {celebrating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
            aria-hidden="true"
          >
            {/* Soft center halo */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1.4, opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="absolute w-40 h-40 rounded-full bg-violet-300/30 blur-2xl"
            />
            {/* Center check */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="relative bg-violet-600 text-white w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-2xl"
            >
              ✓
            </motion.div>
            {/* Particles */}
            {Array.from({ length: 10 }).map((_, i) => {
              const angle = (i / 10) * Math.PI * 2
              const distance = 90 + (i % 3) * 20
              const dx = Math.cos(angle) * distance
              const dy = Math.sin(angle) * distance
              const colors = ['bg-violet-500', 'bg-emerald-400', 'bg-violet-400', 'bg-violet-600']
              return (
                <motion.span
                  key={i}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
                  animate={{ x: dx, y: dy, opacity: [0, 1, 0], scale: 1 }}
                  transition={{
                    duration: 1.1,
                    delay: 0.1 + (i % 4) * 0.04,
                    ease: 'easeOut',
                  }}
                  className={`absolute w-2 h-2 rounded-full ${colors[i % colors.length]}`}
                />
              )
            })}
            {/* Caption */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="absolute top-[58%] text-sm font-semibold text-slate-900 bg-white/95 px-3 py-1.5 rounded-full shadow-md border border-slate-200"
            >
              Your plan is ready
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calm micro-feedback toast after selections */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              <span>{feedback}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
