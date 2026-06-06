import type { ConfidenceLevel, SourceType } from './types'

/* ─────────────────────────────────────────────────────────────────────────
   Source + confidence display tokens.

   Every UI surface that shows a live-style claim (parking, gate, crowd,
   route, restroom, support) reads from these maps so the chip label,
   icon, and tint are identical wherever a fact appears. Centralizing
   here also means we can rename "simulated demo" → "demo data" once
   without sweeping every page.
   ───────────────────────────────────────────────────────────────────── */

export interface SourceTone {
  label: string
  short: string
  badgeClass: string
  dotClass: string
  iconChar: string
}

export const SOURCE_TONES: Record<SourceType, SourceTone> = {
  simulated_demo: {
    label: 'Simulated demo data',
    short: 'Demo',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-400',
    iconChar: '◌',
  },
  estimated: {
    label: 'Estimated from context',
    short: 'Estimated',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    dotClass: 'bg-sky-400',
    iconChar: '≈',
  },
  fan_reported: {
    label: 'Fan reported',
    short: 'Fan',
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
    dotClass: 'bg-violet-400',
    iconChar: '♥',
  },
  staff_verified: {
    label: 'Staff verified',
    short: 'Staff',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
    iconChar: '✓',
  },
  official: {
    label: 'Official venue notice',
    short: 'Official',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-500',
    iconChar: '★',
  },
}

export interface ConfidenceTone {
  label: string
  short: string
  textClass: string
}

export const CONFIDENCE_TONES: Record<ConfidenceLevel, ConfidenceTone> = {
  low: {
    label: 'Low confidence',
    short: 'Low',
    textClass: 'text-rose-700',
  },
  moderate: {
    label: 'Moderate confidence',
    short: 'Moderate',
    textClass: 'text-amber-700',
  },
  high: {
    label: 'High confidence',
    short: 'High',
    textClass: 'text-emerald-700',
  },
  verified: {
    label: 'Staff verified',
    short: 'Verified',
    textClass: 'text-emerald-700',
  },
}

/**
 * Format an ISO timestamp as "Updated X min ago" / "just now". Always
 * derived from a real `derivedAt`, never from mount time.
 */
export function formatDerivedAt(iso: string, now: number = Date.now()): string {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return 'Updated recently'
  const diffSec = Math.max(0, Math.floor((now - t) / 1000))
  if (diffSec < 45) return 'Updated just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `Updated ${diffMin} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `Updated ${diffHr}h ago`
  return 'Updated earlier today'
}
