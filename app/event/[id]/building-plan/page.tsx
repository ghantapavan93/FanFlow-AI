'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { animate, motion, useReducedMotion } from 'framer-motion'
import { demoTicket, demoVenue, deriveArrivalPlan } from '@/lib/seed'
import { loadReadiness, getAllSignals } from '@/lib/store'
import type { ArrivalPlan, ReadinessPrefs, LiveSignal } from '@/lib/types'
import { SCENES } from '@/lib/scenes/scenes'

/**
 * Building Plan — the FanFlow "thinking" screen.
 *
 * A 4-6 second cinematic that exposes the rule engine working step by
 * step between checkout-success and the Event Day Hub. The goal is
 * architectural credibility: rules decide, AI explains.
 *
 * Every value rendered here comes from `deriveArrivalPlan` (the same
 * function the Hub uses). Score numbers count up, the winning gate
 * highlights, and a final "AI is wording the explanation" beat makes
 * the LLM's bounded role explicit.
 *
 * No auto-route — recruiter clicks "Open Event Day Hub" when ready.
 */

const STEP_DELAYS = [0, 0.7, 1.4, 2.1, 3.3, 4.0]
const FINAL_DELAY = 4.7

function CheckTick({ delay, visible }: { delay: number; visible: boolean }) {
  const reduced = useReducedMotion()
  return (
    <motion.span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white flex-shrink-0"
      initial={reduced ? false : { scale: 0, opacity: 0 }}
      animate={visible ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
      transition={{ duration: 0.35, delay: reduced ? 0 : delay, ease: [0.16, 1, 0.3, 1] }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12.5l5 5L20 6.5" />
      </svg>
    </motion.span>
  )
}

function CountUp({ value, duration = 0.9, decimals = 1, delay = 0 }: { value: number; duration?: number; decimals?: number; delay?: number }) {
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(reduced ? value : 0)
  useEffect(() => {
    if (reduced) {
      setDisplay(value)
      return
    }
    const controls = animate(0, value, {
      duration,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(latest),
    })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduced])
  return <span className="tabular-nums">{display.toFixed(decimals)}</span>
}

function Step({
  index,
  title,
  delay,
  visible,
  children,
}: {
  index: number
  title: string
  delay: number
  visible: boolean
  children?: React.ReactNode
}) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
      transition={{ duration: 0.45, delay: reduced ? 0 : delay, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-start gap-3"
    >
      <CheckTick delay={delay + 0.05} visible={visible} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-bold text-slate-400 tabular-nums">0{index}</span>
          <span className="font-semibold text-slate-900 text-sm">{title}</span>
        </div>
        {children && <div className="mt-1 text-xs text-slate-600 leading-relaxed">{children}</div>}
      </div>
    </motion.div>
  )
}

export default function BuildingPlanPage() {
  const params = useParams<{ id: string }>()
  const eventId = params?.id ?? 'wc2026-final'
  const reduced = useReducedMotion()

  const [prefs, setPrefs] = useState<ReadinessPrefs | null>(null)
  const [signals, setSignals] = useState<LiveSignal[]>([])
  const [tick, setTick] = useState(reduced ? 6 : 0)

  // Read live state once on mount (kept stable for the reveal)
  useEffect(() => {
    setPrefs(loadReadiness())
    setSignals(getAllSignals())
  }, [])

  // Drive the step reveal — one step per ~0.7s. We DO NOT auto-route
  // at the end; the recruiter clicks through when ready.
  useEffect(() => {
    if (reduced) return
    const timers = STEP_DELAYS.map((d, i) =>
      setTimeout(() => setTick(i + 1), d * 1000),
    )
    return () => timers.forEach(clearTimeout)
  }, [reduced])

  // Use the SAME rule engine the Hub uses — credibility comes from
  // showing actual computed values, not invented ones.
  const plan: ArrivalPlan = useMemo(
    () => deriveArrivalPlan(prefs, signals.length ? signals : undefined),
    [prefs, signals],
  )

  // Group context summary — derives from stored readiness, otherwise
  // a sensible Maria-style default that matches the demo scenario.
  const groupContext = useMemo(() => {
    const parts: string[] = []
    if (prefs?.group === 'family_young_kids') parts.push('family with young kids')
    else if (prefs?.group === 'family_teens') parts.push('family with teens')
    else if (prefs?.group === 'large_group') parts.push('larger group')
    else if (prefs?.group === 'couple') parts.push('group of 2')
    else if (prefs?.group === 'solo') parts.push('solo entry')
    else parts.push('family with young kids')

    if (prefs?.transport === 'driving') parts.push('driving in')
    else if (prefs?.transport === 'rideshare') parts.push('rideshare drop-off')
    else if (prefs?.transport === 'walking') parts.push('walk-up')
    else parts.push('NJ Transit')

    if (prefs?.needs.includes('stroller')) parts.push('stroller')
    if (prefs?.needs.includes('wheelchair')) parts.push('step-free needed')
    if (prefs?.needs.includes('sensory_sensitive')) parts.push('calmer route preferred')

    return parts.join(' · ')
  }, [prefs])

  // Pre-compute the gate scores sorted high → low, with the winner first.
  const scores = useMemo(() => {
    if (!plan.gate_scores) return []
    return [...plan.gate_scores].sort((a, b) => b.total - a.total)
  }, [plan.gate_scores])

  const groupSize: number =
    prefs?.group === 'family_young_kids' || prefs?.group === 'family_teens'
      ? 3
      : prefs?.group === 'couple'
        ? 2
        : prefs?.group === 'large_group'
          ? 6
          : prefs?.group === 'solo'
            ? 1
            : 3

  const stepDone = (i: number) => tick >= i
  const showFinal = tick >= STEP_DELAYS.length

  const scene = SCENES.fanflow_unlocked

  return (
    <div className={`min-h-screen ${scene.backgroundClass}`}>
      {/* Minimal header — receipt feel, mirrors checkout-success */}
      <div className="border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-600 text-white text-xs">
              ✦
            </span>
            <span className="font-bold text-slate-900">FanFlow AI</span>
            <span className="text-slate-400">·</span>
            <span className="text-xs text-slate-500">Building your plan</span>
          </div>
          <span className="text-[11px] text-slate-400">Rules decide · AI explains</span>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Headline */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-8 sm:mb-10"
        >
          <div className="kicker text-violet-700 mb-2">Personalizing your arrival</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            FanFlow is building your plan
          </h1>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
            Based on your ticket, group, venue context, and staff/fan signals.
            This usually takes a couple of seconds.
          </p>
        </motion.div>

        {/* The reveal card */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {/* Subtle top accent */}
          <div className="h-1 bg-gradient-to-r from-violet-500 via-violet-600 to-violet-500" />

          <div className="p-5 sm:p-7 space-y-5">
            {/* === Step 1: Reading ticket === */}
            <Step index={1} title="Reading your ticket" delay={STEP_DELAYS[0]} visible={stepDone(1)}>
              <span className="font-mono">
                Section {demoTicket.section} · Row {demoTicket.row} · {groupSize} {groupSize === 1 ? 'ticket' : 'tickets'} together
              </span>
            </Step>

            {/* === Step 2: Mapping venue === */}
            <Step index={2} title="Mapping MetLife Stadium" delay={STEP_DELAYS[1]} visible={stepDone(2)}>
              {demoVenue.gates.length} gates · {demoVenue.support_points.length} support points · venue route context
            </Step>

            {/* === Step 3: Group context === */}
            <Step index={3} title="Applying your group context" delay={STEP_DELAYS[2]} visible={stepDone(3)}>
              {groupContext}
            </Step>

            {/* === Step 4: Scoring gates — the star of the show === */}
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={stepDone(4) ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.45, delay: reduced ? 0 : STEP_DELAYS[3], ease: [0.16, 1, 0.3, 1] }}
              className="flex items-start gap-3"
            >
              <CheckTick delay={STEP_DELAYS[3] + 0.05} visible={stepDone(4)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] font-bold text-slate-400 tabular-nums">04</span>
                  <span className="font-semibold text-slate-900 text-sm">
                    Scoring gate candidates
                  </span>
                </div>
                <div className="mt-2 space-y-1.5">
                  {scores.map((s, i) => {
                    const won = s.is_recommended
                    const rowDelay = STEP_DELAYS[3] + 0.25 + i * 0.18
                    return (
                      <motion.div
                        key={s.gate_id}
                        initial={reduced ? false : { opacity: 0, x: -6 }}
                        animate={stepDone(4) ? { opacity: 1, x: 0 } : { opacity: 0, x: -6 }}
                        transition={{ duration: 0.4, delay: reduced ? 0 : rowDelay, ease: [0.16, 1, 0.3, 1] }}
                        className={`flex items-center justify-between rounded-xl px-3 py-2 border ${
                          won
                            ? 'bg-violet-50 border-violet-300'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <span
                          className={`text-sm font-semibold ${
                            won ? 'text-violet-800' : 'text-slate-700'
                          }`}
                        >
                          {s.gate_name.replace(/\s*\(.*\)\s*$/, '')}
                          {won && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0 rounded-full bg-violet-600 text-white text-[9px] font-bold uppercase tracking-wider align-middle">
                              Winner
                            </span>
                          )}
                        </span>
                        <span
                          className={`text-base font-bold font-mono ${
                            won ? 'text-violet-700' : 'text-slate-600'
                          }`}
                        >
                          {stepDone(4) ? (
                            <CountUp value={s.total} delay={rowDelay + 0.1} duration={0.7} />
                          ) : (
                            '0.0'
                          )}
                        </span>
                      </motion.div>
                    )
                  })}
                </div>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  Higher = better fit. Score combines section proximity, group needs, typical
                  wait, and recent staff/fan signals.
                </p>
              </div>
            </motion.div>

            {/* === Step 5: Selecting plan === */}
            <Step index={5} title="Selecting arrival plan" delay={STEP_DELAYS[4]} visible={stepDone(5)}>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1.5">
                  <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
                    Gate
                  </div>
                  <div className="text-xs font-bold text-violet-700 mt-0.5">
                    {plan.recommended_gate.name.replace(/\s*\(.*\)\s*$/, '')}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1.5">
                  <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
                    Leave by
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5 font-mono">
                    {plan.leave_by_time}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1.5">
                  <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
                    Arrive at
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5 font-mono">
                    {plan.arrival_time}
                  </div>
                </div>
              </div>
            </Step>

            {/* === Step 6: AI wording — bounded LLM moment === */}
            <Step index={6} title="Wording the explanation" delay={STEP_DELAYS[5]} visible={stepDone(6)}>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  Rules picked the plan
                </span>
                <span className="text-slate-300">→</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-[10px] font-bold uppercase tracking-wider text-violet-700">
                  AI only explains it
                </span>
              </div>
            </Step>
          </div>
        </div>

        {/* Final ready state — appears after the sequence */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={showFinal ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.55, delay: reduced ? 0 : 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 sm:mt-8 rounded-2xl bg-gradient-to-br from-violet-50 via-white to-white border border-violet-200 p-5 sm:p-6"
        >
          <div className="flex items-start gap-3 mb-4">
            <motion.span
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-violet-600 text-white flex-shrink-0"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={showFinal ? { scale: 1, opacity: 1 } : { scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12.5l5 5L20 6.5" />
              </svg>
            </motion.span>
            <div className="min-w-0">
              <div className="kicker text-violet-700">Plan ready</div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-0.5">
                Your event day plan is ready.
              </h2>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                {plan.recommended_gate.name.replace(/\s*\(.*\)\s*$/, '')} ·{' '}
                Leave by {plan.leave_by_time} · Arrive at {plan.arrival_time}.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-[1fr_auto] gap-2">
            <Link
              href={`/event/${eventId}/hub`}
              className="btn-primary !min-h-[52px] w-full text-base"
            >
              Open Event Day Hub →
            </Link>
            <Link
              href={`/event/${eventId}/guide`}
              className="btn-secondary !min-h-[52px] w-full sm:w-auto text-sm"
            >
              View score breakdown
            </Link>
          </div>

          <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
            Always follow venue signage and staff instructions.
          </p>
        </motion.div>
      </main>
    </div>
  )
}
