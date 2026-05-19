/**
 * Event intelligence derivation tests.
 *
 * Covers computeFanPulse and computeEventIntelligence — the pure functions
 * that transform plan + signals into the UI-facing intelligence summary.
 */

import { describe, expect, it } from 'vitest'
import { computeEventIntelligence, computeFanPulse } from '@/lib/intelligence'
import { deriveArrivalPlan } from '@/lib/seed'
import type { LiveSignal } from '@/lib/types'

const minsAgo = (n: number) => new Date(Date.now() - n * 60 * 1000).toISOString()

function makeFanSignal(
  gateId: string,
  sentiment: LiveSignal['sentiment'],
  minsOld: number,
): LiveSignal {
  return {
    id: `fan-${gateId}-${minsOld}-${Math.random().toString(36).slice(2, 6)}`,
    gate_id: gateId,
    source: 'fan',
    sentiment,
    message: `Fan: ${sentiment}`,
    created_at: minsAgo(minsOld),
  }
}

function makeStaffSignal(
  gateId: string,
  sentiment: LiveSignal['sentiment'],
  minsOld: number,
): LiveSignal {
  return {
    id: `staff-${gateId}-${minsOld}`,
    gate_id: gateId,
    source: 'staff',
    sentiment,
    message: `Staff: ${sentiment}`,
    created_at: minsAgo(minsOld),
  }
}

describe('computeFanPulse', () => {
  it('returns zeros when no fan signals exist', () => {
    const pulse = computeFanPulse([], 'gate-3')
    expect(pulse.total).toBe(0)
    expect(pulse.smooth).toBe(0)
    expect(pulse.slow).toBe(0)
    expect(pulse.needHelp).toBe(0)
    expect(pulse.smoothPct).toBe(0)
  })

  it('ignores staff signals — only counts fan source', () => {
    const signals: LiveSignal[] = [
      makeStaffSignal('gate-3', 'smooth', 5),
      makeStaffSignal('gate-3', 'busy', 10),
    ]
    const pulse = computeFanPulse(signals, 'gate-3')
    expect(pulse.total).toBe(0)
  })

  it('ignores fan signals at other gates', () => {
    const signals: LiveSignal[] = [
      makeFanSignal('gate-1', 'smooth', 5),
      makeFanSignal('gate-7', 'busy', 10),
    ]
    const pulse = computeFanPulse(signals, 'gate-3')
    expect(pulse.total).toBe(0)
  })

  it('ignores fan signals older than 30 minutes', () => {
    const signals: LiveSignal[] = [makeFanSignal('gate-3', 'smooth', 35)]
    const pulse = computeFanPulse(signals, 'gate-3')
    expect(pulse.total).toBe(0)
  })

  it('categorizes sentiments correctly: smooth, moderate→slow, busy→slow, difficult→needHelp', () => {
    const signals: LiveSignal[] = [
      makeFanSignal('gate-3', 'smooth', 5),
      makeFanSignal('gate-3', 'moderate', 8),
      makeFanSignal('gate-3', 'busy', 10),
      makeFanSignal('gate-3', 'difficult', 12),
    ]
    const pulse = computeFanPulse(signals, 'gate-3')
    expect(pulse.smooth).toBe(1)
    expect(pulse.slow).toBe(2) // moderate + busy
    expect(pulse.needHelp).toBe(1) // difficult
    expect(pulse.total).toBe(4)
  })

  it('calculates percentages correctly', () => {
    const signals: LiveSignal[] = [
      makeFanSignal('gate-3', 'smooth', 5),
      makeFanSignal('gate-3', 'smooth', 8),
      makeFanSignal('gate-3', 'busy', 10),
      makeFanSignal('gate-3', 'difficult', 12),
    ]
    const pulse = computeFanPulse(signals, 'gate-3')
    expect(pulse.smoothPct).toBe(50) // 2/4
    expect(pulse.slowPct).toBe(25) // 1/4
    expect(pulse.needHelpPct).toBe(25) // 1/4
    // Percentages should sum to 100
    expect(pulse.smoothPct + pulse.slowPct + pulse.needHelpPct).toBe(100)
  })
})

describe('computeEventIntelligence', () => {
  it('returns a complete EventIntelligence shape', () => {
    const plan = deriveArrivalPlan(null, [])
    const intel = computeEventIntelligence(plan, [])
    expect(intel).toMatchObject({
      expectedEntryLoad: expect.any(String),
      peakWindow: expect.any(String),
      avoidsPeak: expect.any(Boolean),
      confidencePct: expect.any(Number),
      fanPulse: expect.any(Object),
      recommendation: expect.any(String),
    })
  })

  it('uses the continuous confidence percent from plan.confidence_breakdown', () => {
    // With no signals and no prefs, confidence starts at 60 base, minus 5 for limited data = 55
    const plan = deriveArrivalPlan(null, [])
    const intel = computeEventIntelligence(plan, [])
    // The key assertion: confidencePct should match the plan's breakdown percent,
    // NOT the old fixed mapping (82/64/45)
    expect(intel.confidencePct).toBe(plan.confidence_breakdown.percent)
  })

  it('expected entry load is "unknown" with no signals', () => {
    const plan = deriveArrivalPlan(null, [])
    const intel = computeEventIntelligence(plan, [])
    expect(intel.expectedEntryLoad).toBe('unknown')
  })

  it('expected entry load reflects staff signals at the recommended gate', () => {
    const signals: LiveSignal[] = [makeStaffSignal('gate-3', 'smooth', 5)]
    const plan = deriveArrivalPlan(null, signals)
    const intel = computeEventIntelligence(plan, signals)
    // Staff smooth (weight 3, score +2) → net +6 → 'light'
    expect(intel.expectedEntryLoad).toBe('light')
  })

  it('expected entry load reflects busy conditions', () => {
    // Use a single staff 'busy' signal so gate-3 still wins on proximity
    // (one busy = -2 × 3 = -6 — not enough to flip the recommendation
    // away from gate-3's +10 section proximity). The entry load derivation
    // sees the negative signal and reports moderate or busy.
    const signals: LiveSignal[] = [makeStaffSignal('gate-3', 'busy', 5)]
    const plan = deriveArrivalPlan(null, signals)
    // Verify gate-3 is still recommended (proximity outweighs one signal)
    expect(plan.recommended_gate.id).toBe('gate-3')
    const intel = computeEventIntelligence(plan, signals)
    // busy: score = -2 × 3 = -6 → ≤ -2 threshold → 'busy'
    expect(intel.expectedEntryLoad).toBe('busy')
  })

  it('latestStaffAtGate finds the most recent staff signal within 30 min', () => {
    const signals: LiveSignal[] = [
      makeStaffSignal('gate-3', 'busy', 20),
      makeStaffSignal('gate-3', 'smooth', 5), // more recent
    ]
    const plan = deriveArrivalPlan(null, signals)
    const intel = computeEventIntelligence(plan, signals)
    expect(intel.latestStaffAtGate).not.toBeNull()
    expect(intel.latestStaffAtGate!.sentiment).toBe('smooth')
  })

  it('latestStaffAtGate is null when no staff signals exist within 30 min', () => {
    const signals: LiveSignal[] = [makeStaffSignal('gate-3', 'smooth', 35)]
    const plan = deriveArrivalPlan(null, signals)
    const intel = computeEventIntelligence(plan, signals)
    expect(intel.latestStaffAtGate).toBeNull()
  })

  it('peakWindow is a non-empty string with a dash separator', () => {
    const plan = deriveArrivalPlan(null, [])
    const intel = computeEventIntelligence(plan, [])
    expect(intel.peakWindow).toMatch(/–/)
    expect(intel.peakWindow.length).toBeGreaterThan(5)
  })

  it('recommendation string is always non-empty and mentions a time', () => {
    const plan = deriveArrivalPlan(null, [])
    const intel = computeEventIntelligence(plan, [])
    expect(intel.recommendation.length).toBeGreaterThan(10)
    // Should reference AM or PM
    expect(intel.recommendation).toMatch(/AM|PM/)
  })
})
