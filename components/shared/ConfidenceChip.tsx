'use client'

import type { ConfidenceLevel } from '@/lib/types'
import { CONFIDENCE_TONES } from '@/lib/sources'

/**
 * ConfidenceChip — one-line confidence label paired with a SourceChip.
 *
 * The bar visualization is intentionally tiny and tone-matched to the
 * level so the chip works in tight spaces (next to a parking lot card,
 * a gate row, an alert headline). For the bigger circular-ring treatment
 * keep using the inline CircularProgress on the Hub.
 */
export function ConfidenceChip({
  level,
  short = false,
}: {
  level: ConfidenceLevel
  short?: boolean
}) {
  const tone = CONFIDENCE_TONES[level]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-semibold ${tone.textClass}`}
      title={tone.label}
    >
      <span className="relative w-6 h-1 rounded-full bg-slate-100 overflow-hidden">
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${
            level === 'verified'
              ? 'bg-emerald-500'
              : level === 'high'
                ? 'bg-emerald-400'
                : level === 'moderate'
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
          }`}
          style={{ width: `${tone.percent}%` }}
        />
      </span>
      <span className="uppercase tracking-wider">{short ? tone.short : tone.label}</span>
    </span>
  )
}
