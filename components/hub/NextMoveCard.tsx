'use client'

import { motion } from 'framer-motion'
import type { ArrivalPlan, LiveSignal } from '@/lib/types'
import { deriveNextMove } from '@/lib/nextMove'
import { SourceChip } from '@/components/shared/SourceChip'
import { ConfidenceChip } from '@/components/shared/ConfidenceChip'

/* ─────────────────────────────────────────────────────────────────────────
   NextMoveCard — the single most useful ACTION right now, derived by rules
   and re-rendered live as signals change (Game Day sim flips it on its own).
   Anticipatory, not explanatory. Honest source + confidence chips.
   ───────────────────────────────────────────────────────────────────────── */

const URGENCY_STYLE: Record<
  ReturnType<typeof deriveNextMove>['urgency'],
  { ring: string; dot: string; chip: string; label: string }
> = {
  calm: {
    ring: 'border-emerald-200',
    dot: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    label: 'On track',
  },
  soon: {
    ring: 'border-sky-200',
    dot: 'bg-sky-500',
    chip: 'bg-sky-50 text-sky-700 border-sky-200',
    label: 'Settling',
  },
  heads_up: {
    ring: 'border-amber-300',
    dot: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-800 border-amber-200',
    label: 'Heads up',
  },
}

export function NextMoveCard({
  plan,
  signals,
  gateLabel,
}: {
  plan: ArrivalPlan
  signals: LiveSignal[]
  gateLabel: string
}) {
  const move = deriveNextMove(plan, signals, gateLabel)
  const s = URGENCY_STYLE[move.urgency]

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={`relative overflow-hidden rounded-2xl bg-white border ${s.ring}`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
            Your next move
          </div>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.chip}`}
          >
            {s.label}
          </span>
        </div>

        {/* key forces a re-mount + fade when the move changes (live reaction) */}
        <motion.div
          key={move.title}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-start gap-2.5">
            <span className="text-xl leading-none mt-0.5 flex-shrink-0">{move.icon}</span>
            <div className="min-w-0">
              <div className="font-extrabold text-slate-900 text-[15px] leading-tight">
                {move.title}
              </div>
              <p className="text-[12px] text-slate-600 mt-1 leading-relaxed">{move.detail}</p>
            </div>
          </div>
        </motion.div>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <SourceChip source={move.source} size="xs" />
          <ConfidenceChip level={move.confidence} short />
        </div>
      </div>
    </motion.section>
  )
}
