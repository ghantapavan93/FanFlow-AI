/* ─────────────────────────────────────────────────────────────────────────
   Crowd Service — thin façade over the live signals store. Derives a gate
   "pressure" + honest source/confidence from staff & fan signals so
   consumers don't need to know the storage backend.

   Important honesty rule: gate "pressure" labels here come from staff
   and fan signals, never from ticket sales or seat capacity. The same
   threshold the fan pulse uses (≥3 fans = majority, staff weighted 3×) is
   the only source of truth for the "live" qualifier.
   ───────────────────────────────────────────────────────────────────── */

import { getAllSignals } from '../store'
import type { LiveSignal, SourceType, ConfidenceLevel } from '../types'

export interface GateCrowdState {
  gate_id: string
  pressure: 'smooth' | 'moderate' | 'busy' | 'unknown'
  fan_reports: number
  staff_verified: boolean
  source: SourceType
  confidence: ConfidenceLevel
  derivedAt: string
}

/**
 * Returns the crowd state for a single gate, derived from current signals.
 *
 * Pass `signals` when the caller already holds them in state (e.g. a React
 * component subscribed to the store) — this avoids re-reading + re-parsing
 * localStorage on every render. Omit it only in non-render contexts where a
 * one-off live read is acceptable.
 */
export function getGateCrowd(gateId: string, signals?: LiveSignal[]): GateCrowdState {
  const all = signals ?? getAllSignals()
  const recent = all.filter(
    (s) =>
      s.gate_id === gateId &&
      Date.now() - new Date(s.created_at).getTime() < 60 * 60 * 1000,
  )
  const staff = recent.filter((s) => s.source === 'staff')
  const fan = recent.filter((s) => s.source === 'fan')

  // Staff signal wins. Otherwise rely on fan majority threshold.
  let pressure: GateCrowdState['pressure'] = 'unknown'
  if (staff.length > 0) {
    pressure = sentimentToPressure(staff[0].sentiment)
  } else if (fan.length >= 3) {
    pressure = sentimentToPressure(majoritySentiment(fan))
  }

  let source: SourceType
  let confidence: ConfidenceLevel
  if (staff.length > 0) {
    source = 'staff_verified'
    confidence = 'verified'
  } else if (fan.length >= 3) {
    source = 'fan_reported'
    confidence = fan.length >= 6 ? 'high' : 'moderate'
  } else if (fan.length > 0) {
    source = 'fan_reported'
    confidence = 'low'
  } else {
    source = 'estimated'
    confidence = 'low'
  }

  return {
    gate_id: gateId,
    pressure,
    fan_reports: fan.length,
    staff_verified: staff.length > 0,
    source,
    confidence,
    derivedAt: new Date().toISOString(),
  }
}

function sentimentToPressure(s: LiveSignal['sentiment']): GateCrowdState['pressure'] {
  if (s === 'smooth') return 'smooth'
  if (s === 'moderate') return 'moderate'
  return 'busy'
}

function majoritySentiment(signals: LiveSignal[]): LiveSignal['sentiment'] {
  const counts: Record<LiveSignal['sentiment'], number> = {
    smooth: 0,
    moderate: 0,
    busy: 0,
    difficult: 0,
  }
  for (const s of signals) counts[s.sentiment] += 1
  return (Object.entries(counts) as [LiveSignal['sentiment'], number][])
    .sort((a, b) => b[1] - a[1])[0][0]
}
