'use client'

/* ─────────────────────────────────────────────────────────────────────────
   Game Day simulation — a small time engine that makes FanFlow feel ALIVE.

   When started, it steps through a scripted, accelerated event-day timeline
   and publishes real LiveSignals into the SAME store the fan pages subscribe
   to (`publishSignal`). Because every surface already re-renders from that
   store, the entire app reacts on its own: conditions shift, confidence
   moves, the fan pulse fills, smart alerts fire, the AI summary re-words,
   and the rule engine re-scores gates — with no per-page wiring.

   It is a SINGLETON (module-level) so the timeline keeps running as the user
   navigates Hub → Map → Conditions. Honest: this is a *simulated* timeline,
   labeled as such wherever the control appears. Reset clears the signals it
   published.
   ───────────────────────────────────────────────────────────────────────── */

import { publishSignal, clearPublishedSignals } from '../store'
import type { LiveSignal } from '../types'

type Step = {
  clock: string
  signals: Array<Pick<LiveSignal, 'gate_id' | 'source' | 'sentiment' | 'message'>>
}

/** Accelerated event-day arc. Gate 3 (recommended) heats up; Gate 7 emerges
 *  as the calmer alternative — driven entirely by real staff/fan signals. */
const SCRIPT: Step[] = [
  {
    clock: 'Doors open · T‑2:00',
    signals: [{ gate_id: 'gate-3', source: 'staff', sentiment: 'smooth', message: 'All gates open and flowing smoothly' }],
  },
  {
    clock: 'T‑1:30',
    signals: [
      { gate_id: 'gate-3', source: 'fan', sentiment: 'smooth', message: 'Walked right in at Gate 3' },
      { gate_id: 'gate-7', source: 'fan', sentiment: 'smooth', message: 'No wait at Gate 7' },
    ],
  },
  {
    clock: 'T‑1:00',
    signals: [{ gate_id: 'gate-3', source: 'fan', sentiment: 'moderate', message: 'Starting to pick up at Gate 3' }],
  },
  {
    clock: 'T‑0:45 · crowd building',
    signals: [
      { gate_id: 'gate-3', source: 'fan', sentiment: 'busy', message: 'Gate 3 getting crowded' },
      { gate_id: 'gate-3', source: 'fan', sentiment: 'busy', message: 'Long bag-check line at Gate 3' },
    ],
  },
  {
    clock: 'T‑0:30 · staff update',
    signals: [{ gate_id: 'gate-3', source: 'staff', sentiment: 'busy', message: 'Gate 3 bag check delayed — opening a second scanner' }],
  },
  {
    clock: 'T‑0:20',
    signals: [
      { gate_id: 'gate-3', source: 'fan', sentiment: 'busy', message: 'Still backed up at Gate 3' },
      { gate_id: 'gate-7', source: 'fan', sentiment: 'smooth', message: 'Gate 7 is wide open' },
      { gate_id: 'gate-7', source: 'fan', sentiment: 'smooth', message: 'Breezed through Gate 7' },
    ],
  },
  {
    clock: 'T‑0:10 · alternative clear',
    signals: [{ gate_id: 'gate-7', source: 'staff', sentiment: 'smooth', message: 'Gate 7 flowing well — good option for late arrivals' }],
  },
  {
    clock: 'Kickoff',
    signals: [],
  },
]

const STEP_MS = 2600

export interface GameDayState {
  running: boolean
  stepIndex: number
  totalSteps: number
  clock: string
  finished: boolean
}

const initialState: GameDayState = {
  running: false,
  stepIndex: -1,
  totalSteps: SCRIPT.length,
  clock: 'Game day not started',
  finished: false,
}

let state: GameDayState = { ...initialState }
let timer: ReturnType<typeof setInterval> | null = null
const listeners = new Set<(s: GameDayState) => void>()

function emit() {
  const snapshot = { ...state }
  listeners.forEach((cb) => cb(snapshot))
}

function publishStep(i: number) {
  const step = SCRIPT[i]
  if (!step) return
  step.signals.forEach((s, j) => {
    publishSignal({
      id: `sim-${i}-${j}-${state.stepIndex}`,
      gate_id: s.gate_id,
      source: s.source,
      sentiment: s.sentiment,
      message: s.message,
      created_at: new Date().toISOString(),
    })
  })
}

export const gameDaySim = {
  getState(): GameDayState {
    return { ...state }
  },

  subscribe(cb: (s: GameDayState) => void): () => void {
    listeners.add(cb)
    cb({ ...state })
    return () => listeners.delete(cb)
  },

  start() {
    if (typeof window === 'undefined') return
    if (timer) clearInterval(timer)
    state = { ...initialState, running: true, stepIndex: 0, clock: SCRIPT[0].clock }
    publishStep(0)
    emit()
    timer = setInterval(() => {
      const next = state.stepIndex + 1
      if (next >= SCRIPT.length) {
        state = { ...state, running: false, finished: true, clock: 'Kickoff' }
        if (timer) clearInterval(timer)
        timer = null
        emit()
        return
      }
      state = { ...state, stepIndex: next, clock: SCRIPT[next].clock }
      publishStep(next)
      emit()
    }, STEP_MS)
  },

  stop() {
    if (timer) clearInterval(timer)
    timer = null
    state = { ...state, running: false }
    emit()
  },

  /** Stop and clear every signal the simulation (and the user) published. */
  reset() {
    if (timer) clearInterval(timer)
    timer = null
    clearPublishedSignals()
    state = { ...initialState }
    emit()
  },
}
