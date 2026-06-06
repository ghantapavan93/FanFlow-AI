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
  const dot =
    level === 'verified' || level === 'high'
      ? 'bg-emerald-500'
      : level === 'moderate'
        ? 'bg-amber-500'
        : 'bg-rose-500'
  // Restraint: a single dot + label, no pill or progress bar. Pairs cleanly
  // next to a SourceChip without reading as chip-soup.
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${tone.textClass}`}
      title={tone.label}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {short ? tone.short : tone.label}
    </span>
  )
}
