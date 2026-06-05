'use client'

import type { SourceType } from '@/lib/types'
import { SOURCE_TONES, formatDerivedAt } from '@/lib/sources'

/**
 * SourceChip — one-line honest-source label.
 *
 * Every parking/gate/crowd/route/restroom/support claim that has a "live"
 * quality must render this chip so the fan knows where the claim came
 * from. The label, icon, and color all come from `SOURCE_TONES` so the
 * chip looks identical wherever it appears.
 *
 * Pass `derivedAt` to append "Updated X min ago" — keep that wired to a
 * real timestamp, never a cosmetic mount time.
 */
export function SourceChip({
  source,
  derivedAt,
  size = 'sm',
  short = false,
}: {
  source: SourceType
  derivedAt?: string
  size?: 'xs' | 'sm'
  short?: boolean
}) {
  const tone = SOURCE_TONES[source]
  const padding = size === 'xs' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wider border whitespace-nowrap ${padding} ${tone.badgeClass}`}
      title={derivedAt ? `${tone.label} · ${formatDerivedAt(derivedAt).toLowerCase()}` : tone.label}
    >
      <span aria-hidden="true">{tone.iconChar}</span>
      <span>{short ? tone.short : tone.label}</span>
      {derivedAt && !short && (
        <span className="opacity-60 normal-case font-normal tracking-normal">
          · {formatDerivedAt(derivedAt).replace('Updated ', '')}
        </span>
      )}
    </span>
  )
}
