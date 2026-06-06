import type {
  ArrivalPlan,
  ConfidenceLevel,
  LiveSignal,
  SourceType,
} from './types'

/* ─────────────────────────────────────────────────────────────────────────
   Next best move — anticipatory guidance.

   Where the AI summary EXPLAINS the plan, this decides the single most useful
   ACTION right now and how urgent it is. Rules decide everything here
   (deterministic, testable); an AI layer would only ever re-word the result.

   As live signals change (e.g. the Game Day simulation pushing a staff "busy"
   signal at the recommended gate), this flips from calm → heads-up on its own,
   which is what makes the companion feel alive.

   Honesty: every move carries the source + confidence of what drove it.
   ───────────────────────────────────────────────────────────────────────── */

export type MoveUrgency = 'calm' | 'soon' | 'heads_up'

export interface NextMove {
  icon: string
  title: string
  detail: string
  urgency: MoveUrgency
  source: SourceType
  confidence: ConfidenceLevel
}

export function deriveNextMove(
  plan: ArrivalPlan,
  signals: LiveSignal[],
  gateLabel: string,
  now: number = Date.now(),
): NextMove {
  const gateId = plan.recommended_gate.id
  const recent = signals.filter(
    (s) => s.gate_id === gateId && now - new Date(s.created_at).getTime() < 60 * 60 * 1000,
  )
  const staffNewest = recent
    .filter((s) => s.source === 'staff')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
  const fanBusy = recent.filter(
    (s) => s.source === 'fan' && (s.sentiment === 'busy' || s.sentiment === 'difficult'),
  )
  const cb = plan.confidence_breakdown

  // 1) Staff verified congestion — highest trust, act on it.
  if (staffNewest && (staffNewest.sentiment === 'busy' || staffNewest.sentiment === 'difficult')) {
    return {
      icon: '⚠️',
      title: `Heads up — ${gateLabel} is busy`,
      detail: 'Staff report delays. Allow extra time, or open the Map for a calmer gate.',
      urgency: 'heads_up',
      source: 'staff_verified',
      confidence: 'verified',
    }
  }

  // 2) Staff vs fans disagree — hold a cautious posture.
  if (cb.hasConflict) {
    return {
      icon: '⚖️',
      title: `Mixed signals at ${gateLabel}`,
      detail: 'Staff and fan reports disagree right now — holding a cautious plan until it clears.',
      urgency: 'heads_up',
      source: 'staff_verified',
      confidence: 'moderate',
    }
  }

  // 3) Fan majority reporting crowding.
  if (fanBusy.length >= 3) {
    return {
      icon: '📈',
      title: `${gateLabel} is filling up`,
      detail: 'Several fans report crowding. Arriving a little earlier will keep entry smooth.',
      urgency: 'heads_up',
      source: 'fan_reported',
      confidence: fanBusy.length >= 6 ? 'high' : 'moderate',
    }
  }

  // 4) Staff verified clear — reassure + leave-by.
  if (staffNewest && staffNewest.sentiment === 'smooth') {
    return {
      icon: '✅',
      title: `${gateLabel} is clear — you're set`,
      detail: `Staff confirm smooth entry. Leave by ${plan.leave_by_time}.`,
      urgency: 'calm',
      source: 'staff_verified',
      confidence: 'verified',
    }
  }

  // 5) Low confidence — plan still settling.
  if (cb.percent < 55) {
    return {
      icon: '🛰️',
      title: 'Plan still settling',
      detail: `Limited live signals — we'll sharpen this as fans arrive. Leave by ${plan.leave_by_time}.`,
      urgency: 'soon',
      source: 'estimated',
      confidence: 'low',
    }
  }

  // 6) Default — calm, head to the gate.
  return {
    icon: '🧭',
    title: `Head to ${gateLabel} — looking smooth`,
    detail: `Leave by ${plan.leave_by_time}, arrive ${plan.arrival_time}. We'll alert you if anything changes.`,
    urgency: 'calm',
    source: 'estimated',
    confidence: cb.percent >= 75 ? 'high' : 'moderate',
  }
}
