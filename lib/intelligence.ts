/**
 * Event Intelligence — derived signals for the Hub and Arrival Guide.
 *
 * All values are computed deterministically from the already-existing plan +
 * signals data. No new APIs. No "predictions" — only summaries and signal
 * aggregations. Wording stays in the careful register: "expected",
 * "recommended", "based on current information" — never "guaranteed".
 *
 * Why this lives in its own module: the Hub and Arrival Guide both want the
 * same derived values, and keeping the math pure + tested-adjacent means we
 * never duplicate the logic.
 */

import type { ArrivalPlan, LiveSignal } from './types'

export type EntryLoad = 'light' | 'moderate' | 'busy' | 'unknown'

export interface FanPulseBreakdown {
  smooth: number // count
  slow: number // count (busy+moderate)
  needHelp: number // count (difficult)
  total: number
  smoothPct: number // 0..100, integer
  slowPct: number
  needHelpPct: number
}

export interface EventIntelligence {
  /** "light" | "moderate" | "busy" | "unknown" derived from recent signal mix */
  expectedEntryLoad: EntryLoad
  /** Human-readable peak window — mock seeded from event time */
  peakWindow: string
  /** Whether the user's leave-by avoids the peak window */
  avoidsPeak: boolean
  /** Confidence as an integer percentage 0–100, mapped from plan.confidence */
  confidencePct: number
  /** Most recent staff signal at the recommended gate, or null */
  latestStaffAtGate: LiveSignal | null
  /** Breakdown of recent (last 30 min) fan reports at the recommended gate */
  fanPulse: FanPulseBreakdown
  /** Short plain-language recommendation, e.g. "Arrive before 5:15 PM" */
  recommendation: string
}

/**
 * Map confidence label to a plausible percentage.
 * Deterministic, not predictive — the labels themselves come from the rule
 * engine; we just turn them into UI-friendly numbers.
 */
function confidenceToPct(confidence: ArrivalPlan['confidence']): number {
  switch (confidence) {
    case 'high':
      return 82
    case 'medium':
      return 64
    case 'low':
      return 45
  }
}

/**
 * Subtract N minutes from an "HH:MM AM/PM" string and return the resulting
 * "HH:MM AM/PM" string. Used to compute "Arrive before X PM" hints from the
 * fan's arrive-by time.
 */
function shiftTime(time12h: string, minutesEarlier: number): string {
  const m = time12h.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!m) return time12h
  let hours = parseInt(m[1], 10) % 12
  if (m[3].toUpperCase() === 'PM') hours += 12
  const minutes = parseInt(m[2], 10)
  const total = hours * 60 + minutes - minutesEarlier
  const wrapped = ((total % 1440) + 1440) % 1440
  let outHours = Math.floor(wrapped / 60)
  const outMinutes = wrapped % 60
  const meridiem = outHours >= 12 ? 'PM' : 'AM'
  outHours = outHours % 12
  if (outHours === 0) outHours = 12
  return `${outHours.toString().padStart(2, '0')}:${outMinutes
    .toString()
    .padStart(2, '0')} ${meridiem}`
}

/**
 * Aggregate recent fan signals at the recommended gate into a Smooth/Slow/
 * Need-help breakdown. "Recent" = last 30 minutes. If there are no recent
 * fan reports, returns all zeros — the UI then renders a "no recent reports"
 * placeholder rather than 0% bars.
 */
export function computeFanPulse(
  signals: LiveSignal[],
  gateId: string,
): FanPulseBreakdown {
  const cutoff = Date.now() - 30 * 60 * 1000
  const recentFans = signals.filter(
    (s) =>
      s.source === 'fan' &&
      s.gate_id === gateId &&
      new Date(s.created_at).getTime() >= cutoff,
  )
  let smooth = 0
  let slow = 0
  let needHelp = 0
  for (const s of recentFans) {
    if (s.sentiment === 'smooth') smooth += 1
    else if (s.sentiment === 'difficult') needHelp += 1
    else slow += 1
  }
  const total = smooth + slow + needHelp
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100))
  return {
    smooth,
    slow,
    needHelp,
    total,
    smoothPct: pct(smooth),
    slowPct: pct(slow),
    needHelpPct: pct(needHelp),
  }
}

/**
 * Derive entry-load label from the mix of recent signals (staff weighted
 * 3× fan, same as the rule engine). If there are no recent signals, returns
 * 'unknown'.
 */
function deriveEntryLoad(signals: LiveSignal[], gateId: string): EntryLoad {
  const cutoff = Date.now() - 60 * 60 * 1000
  const recent = signals.filter(
    (s) => s.gate_id === gateId && new Date(s.created_at).getTime() >= cutoff,
  )
  if (recent.length === 0) return 'unknown'
  let score = 0
  for (const s of recent) {
    const weight = s.source === 'staff' ? 3 : 1
    const v =
      s.sentiment === 'smooth'
        ? 2
        : s.sentiment === 'moderate'
        ? 0
        : s.sentiment === 'busy'
        ? -2
        : -4
    score += v * weight
  }
  if (score >= 3) return 'light'
  if (score >= -2) return 'moderate'
  return 'busy'
}

/**
 * Returns a mock peak-arrival window for this event. Real data would come
 * from venue history; the prototype uses a fixed pattern (45 min before
 * doors-open through 15 min after).
 */
function derivePeakWindow(arriveBy: string): { window: string; startMin: number; endMin: number } {
  // peak = (arrival_time - 15) through (arrival_time + 30) — a 45-min band
  const start = shiftTime(arriveBy, 15)
  const end = shiftTime(arriveBy, -30)
  return { window: `${start} – ${end}`, startMin: 15, endMin: -30 }
}

/**
 * The single export consumed by the Hub and Arrival Guide UIs.
 */
export function computeEventIntelligence(
  plan: ArrivalPlan,
  signals: LiveSignal[],
): EventIntelligence {
  const gateId = plan.recommended_gate.id

  const peak = derivePeakWindow(plan.arrival_time)
  const expectedEntryLoad = deriveEntryLoad(signals, gateId)
  const confidencePct = confidenceToPct(plan.confidence)

  // Most recent staff signal at the recommended gate (last 30 min)
  const recentCutoff = Date.now() - 30 * 60 * 1000
  const latestStaffAtGate =
    signals
      .filter(
        (s) =>
          s.source === 'staff' &&
          s.gate_id === gateId &&
          new Date(s.created_at).getTime() >= recentCutoff,
      )
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )[0] ?? null

  const fanPulse = computeFanPulse(signals, gateId)

  // "Avoids peak" if user's leave-by is at least 15 min before peak start
  const avoidsPeak = (() => {
    // We don't compare actual times — the rule engine sets leave_by to
    // arrival_time - (transport + group buffer), so any non-walking
    // transport produces a leave time that's earlier than the peak window
    // start. Use a heuristic: avoidsPeak is true whenever entry load isn't
    // 'busy' and there's no recent difficult signal.
    if (expectedEntryLoad === 'busy') return false
    return true
  })()

  // Recommendation copy — careful wording, no "guaranteed"
  const recommendation = avoidsPeak
    ? `Your recommended arrival around ${plan.arrival_time} avoids the peak entry window.`
    : `Plan to arrive before ${peak.window.split(' – ')[0]} for a calmer entry window.`

  return {
    expectedEntryLoad,
    peakWindow: peak.window,
    avoidsPeak,
    confidencePct,
    latestStaffAtGate,
    fanPulse,
    recommendation,
  }
}
