'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { gameDaySim, type GameDayState } from '@/lib/simulation/gameDaySim'

/* ─────────────────────────────────────────────────────────────────────────
   GameDayControl — a floating "▶ Run game day" control that drives the
   simulation. Mounted on the surfaces that visibly react (Hub, Conditions,
   Venue Map). Because it reads/writes the shared singleton, starting it on
   one page keeps the timeline running as the user navigates.

   Honest: clearly labeled a *simulated* timeline. "Reset" clears the signals
   it published so the demo can be re-run clean.
   ───────────────────────────────────────────────────────────────────────── */

export function GameDayControl() {
  const [s, setS] = useState<GameDayState>(() => gameDaySim.getState())

  useEffect(() => gameDaySim.subscribe(setS), [])

  const active = s.running || s.finished || s.stepIndex >= 0
  const pct = s.totalSteps > 1 ? Math.round(((s.stepIndex + 1) / s.totalSteps) * 100) : 0

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md px-0"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 4.5rem)' }}
    >
      <AnimatePresence initial={false}>
        {active && (
          <motion.div
            key="clock"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3 }}
            className="surface-night mb-2 rounded-2xl px-3.5 py-2.5 text-white shadow-[0_10px_30px_-12px_rgba(76,29,149,0.6)]"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex w-2 h-2 flex-shrink-0">
                  {s.running && (
                    <span className="absolute inset-0 rounded-full bg-emerald-300 animate-ping opacity-70" />
                  )}
                  <span
                    className={`relative inline-block w-2 h-2 rounded-full ${
                      s.finished ? 'bg-violet-300' : 'bg-emerald-300'
                    }`}
                  />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-violet-200 truncate">
                  {s.clock}
                </span>
              </div>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-violet-200/70 flex-shrink-0">
                Simulated timeline
              </span>
            </div>
            {/* progress rail */}
            <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400"
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2">
        {!s.running ? (
          <button
            onClick={() => gameDaySim.start()}
            className="flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-sm shadow-lg shadow-violet-500/30 transition"
          >
            <span aria-hidden="true">▶</span>
            {s.finished ? 'Replay game day' : 'Run game day'}
          </button>
        ) : (
          <button
            onClick={() => gameDaySim.stop()}
            className="flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] rounded-full bg-white border border-violet-200 text-violet-700 font-bold text-sm shadow transition"
          >
            <span aria-hidden="true">⏸</span>
            Pause
          </button>
        )}
        {active && (
          <button
            onClick={() => gameDaySim.reset()}
            className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-full bg-white/90 border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-white transition"
            title="Clear simulated signals"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  )
}
