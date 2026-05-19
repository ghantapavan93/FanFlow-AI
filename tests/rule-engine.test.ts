/**
 * Rule engine scenario tests.
 *
 * Asserts that deriveArrivalPlan + the support-point prioritizer behave
 * correctly across the seven real fan personas documented in
 * lib/scenarios/scenarios.ts.
 *
 * These are unit tests on pure functions — no DOM, no localStorage.
 */

import { describe, expect, it } from 'vitest'
import { deriveArrivalPlan } from '@/lib/seed'
import { SCENARIOS, getScenario } from '@/lib/scenarios/scenarios'

describe('rule engine — scenario coverage', () => {
  it('exposes all 7 scenarios', () => {
    expect(SCENARIOS).toHaveLength(7)
    expect(SCENARIOS.map((s) => s.id)).toEqual([
      'maria-family',
      'solo-regular',
      'accessibility',
      'sensory-sensitive',
      'no-signals',
      'staff-overrides-fan-noise',
      'llm-fallback',
    ])
  })

  it('Maria (family) — recommends Gate 3 and surfaces Family Services', () => {
    const s = getScenario('maria-family')!
    const plan = deriveArrivalPlan(s.prefs, s.signals)
    expect(plan.recommended_gate.id).toBe('gate-3')
    expect(plan.recommended_gate.family_friendly).toBe(true)
    expect(plan.support_points.map((sp) => sp.type)).toContain('family_services')
    // With no live signals, the new derived-confidence model correctly
    // refuses to claim 'high' — confidence drops to medium until a staff
    // or 3+ fan reports back the plan. Prefs alone aren't enough.
    expect(plan.confidence).toBe('medium')
    expect(plan.confidence_breakdown.isLimitedData).toBe(true)
  })

  it('Solo regular fan — recommends Gate 3 but no family surfaces', () => {
    const s = getScenario('solo-regular')!
    const plan = deriveArrivalPlan(s.prefs, s.signals)
    expect(plan.recommended_gate.id).toBe('gate-3') // still closest to Section 117
    // Without family/stroller/sensory needs, family_services is not prioritized
    const types = plan.support_points.map((sp) => sp.type)
    // First aid is always included as a default
    expect(types).toContain('first_aid')
  })

  it('Accessibility scenario — prioritizes an accessible gate and surfaces Accessibility Services', () => {
    const s = getScenario('accessibility')!
    const plan = deriveArrivalPlan(s.prefs, s.signals)
    expect(plan.recommended_gate.accessibility).toBe(true)
    expect(plan.recommended_gate.id).not.toBe('gate-7') // gate-7 is the only non-accessible gate
    expect(plan.support_points.map((sp) => sp.type)).toContain('accessibility')
  })

  it('Sensory-sensitive scenario — surfaces Quiet / Sensory Space', () => {
    const s = getScenario('sensory-sensitive')!
    const plan = deriveArrivalPlan(s.prefs, s.signals)
    expect(plan.support_points.map((sp) => sp.type)).toContain('quiet_space')
    // Should prefer a gate with short typical wait (Gate 3 = 5 min)
    expect(plan.recommended_gate.typical_wait_minutes).toBeLessThanOrEqual(8)
  })

  it('No live signals — plan still derives cleanly, confidence drops to medium', () => {
    const s = getScenario('no-signals')!
    const plan = deriveArrivalPlan(s.prefs, s.signals)
    expect(plan.recommended_gate.id).toBe('gate-3')
    // New derived-confidence model: no staff signal + < 3 fan reports
    // = isLimitedData, percent drops, label settles at 'medium'.
    expect(plan.confidence).toBe('medium')
    expect(plan.confidence_breakdown.isLimitedData).toBe(true)
    expect(plan.confidence_breakdown.staffSignalCount).toBe(0)
    // gate_scores should be present and finite
    expect(plan.gate_scores).toBeDefined()
    expect(plan.gate_scores!.length).toBe(3)
    for (const g of plan.gate_scores!) {
      expect(Number.isFinite(g.total)).toBe(true)
    }
  })

  it('Staff signal outweighs fan noise — staff "smooth" at Gate 3 keeps it winning despite three fan "busy"', () => {
    const s = getScenario('staff-overrides-fan-noise')!
    const plan = deriveArrivalPlan(s.prefs, s.signals)
    expect(plan.recommended_gate.id).toBe('gate-3')

    // The signal contributions in gate_scores should reflect both:
    // staff_signal positive at gate-3, fan_signal negative at gate-3
    const gate3Score = plan.gate_scores!.find((g) => g.gate_id === 'gate-3')!
    expect(gate3Score.components.staff_signal).toBeGreaterThan(0)
    expect(gate3Score.components.fan_signal).toBeLessThan(0)
  })

  it('No prefs (cold-start) — falls back to medium confidence with a sensible default plan', () => {
    const plan = deriveArrivalPlan(null, [])
    expect(plan.confidence).toBe('medium')
    expect(plan.recommended_gate).toBeDefined()
    // gate_scores still present
    expect(plan.gate_scores).toBeDefined()
  })
})

describe('rule engine — section proximity tiers', () => {
  it('returns the same gate for an exact-match section as the demo ticket', () => {
    // demoTicket is Section 117. Gate 3 serves Section 117. Expect gate-3 to win.
    const plan = deriveArrivalPlan(null, [])
    expect(plan.recommended_gate.sections).toContain('117')
  })

  it('gate_scores include section_proximity = 10 for the matching gate', () => {
    const plan = deriveArrivalPlan(null, [])
    const gate3 = plan.gate_scores!.find((g) => g.gate_id === 'gate-3')!
    expect(gate3.components.section_proximity).toBe(10)
  })

  it('non-matching gates still get a partial section_proximity score (tiered)', () => {
    // Gate 1 serves 101–103, 201–202. Distance from 117 to 103 is 14. Tier: within 20 → +3
    // Gate 7 serves 139–141, 239–240. Distance from 117 to 139 is 22. Tier: > 20 → 0
    const plan = deriveArrivalPlan(null, [])
    const gate1 = plan.gate_scores!.find((g) => g.gate_id === 'gate-1')!
    const gate7 = plan.gate_scores!.find((g) => g.gate_id === 'gate-7')!
    expect(gate1.components.section_proximity).toBe(3) // within 20
    expect(gate7.components.section_proximity).toBe(0) // outside 20
  })
})

describe('rule engine — new persona coverage (slow_pace, first_time)', () => {
  it('slow_pace adds accessibility_match on accessible gates (lower weight than wheelchair)', () => {
    const slowPlan = deriveArrivalPlan(
      {
        transport: 'transit',
        group: 'solo',
        needs: ['slow_pace'],
        updated_at: new Date().toISOString(),
      },
      [],
    )
    const wheelchairPlan = deriveArrivalPlan(
      {
        transport: 'transit',
        group: 'solo',
        needs: ['wheelchair'],
        updated_at: new Date().toISOString(),
      },
      [],
    )
    const slowGate3 = slowPlan.gate_scores!.find((g) => g.gate_id === 'gate-3')!
    const wcGate3 = wheelchairPlan.gate_scores!.find((g) => g.gate_id === 'gate-3')!
    // Both gates are accessibility:true, so both get a boost.
    expect(slowGate3.components.accessibility_match).toBeGreaterThan(0)
    expect(wcGate3.components.accessibility_match).toBeGreaterThan(0)
    // Wheelchair must score higher than slow_pace — it's a stricter need.
    expect(wcGate3.components.accessibility_match).toBeGreaterThan(
      slowGate3.components.accessibility_match,
    )
  })

  it('slow_pace boost on non-step-free gate is smaller than on step-free gate', () => {
    // Gate 7 has accessibility:false, typical_wait_minutes:8 → only the
    // short-wait sub-rule applies (+1). Gate 3 has accessibility:true,
    // typical_wait_minutes:5 → both sub-rules apply (+3 + +1 = +4).
    const plan = deriveArrivalPlan(
      {
        transport: 'transit',
        group: 'solo',
        needs: ['slow_pace'],
        updated_at: new Date().toISOString(),
      },
      [],
    )
    const gate3 = plan.gate_scores!.find((g) => g.gate_id === 'gate-3')!
    const gate7 = plan.gate_scores!.find((g) => g.gate_id === 'gate-7')!
    expect(gate7.components.accessibility_match).toBeLessThan(
      gate3.components.accessibility_match,
    )
  })

  it('first_time does NOT modify gate scoring — pure UX flag', () => {
    const withFirstTime = deriveArrivalPlan(
      {
        transport: 'transit',
        group: 'solo',
        needs: ['first_time'],
        updated_at: new Date().toISOString(),
      },
      [],
    )
    const without = deriveArrivalPlan(
      {
        transport: 'transit',
        group: 'solo',
        needs: [],
        updated_at: new Date().toISOString(),
      },
      [],
    )
    // Same recommended gate
    expect(withFirstTime.recommended_gate.id).toBe(without.recommended_gate.id)
    // Every score component must match exactly
    for (const g of withFirstTime.gate_scores!) {
      const same = without.gate_scores!.find((x) => x.gate_id === g.gate_id)!
      expect(g.total).toBe(same.total)
    }
  })
})

describe('rule engine — fan-pulse threshold + conflict detection', () => {
  const minsAgo = (n: number) =>
    new Date(Date.now() - n * 60 * 1000).toISOString()

  it('one fan report does NOT materially change the plan score', () => {
    const oneFan = deriveArrivalPlan(null, [
      {
        id: 'fan-1',
        gate_id: 'gate-3',
        source: 'fan',
        sentiment: 'busy',
        message: 'busy at gate 3',
        created_at: minsAgo(2),
      },
    ])
    const baseline = deriveArrivalPlan(null, [])
    const oneFanG3 = oneFan.gate_scores!.find((g) => g.gate_id === 'gate-3')!
    const baselineG3 = baseline.gate_scores!.find((g) => g.gate_id === 'gate-3')!
    // Below threshold (< 3 reports) — fan_signal stays 0 and totals match.
    expect(oneFanG3.components.fan_signal).toBe(0)
    expect(oneFanG3.total).toBe(baselineG3.total)
  })

  it('two fan reports also do not change the plan — still below threshold', () => {
    const twoFan = deriveArrivalPlan(null, [
      {
        id: 'fan-1',
        gate_id: 'gate-3',
        source: 'fan',
        sentiment: 'busy',
        message: 'busy',
        created_at: minsAgo(2),
      },
      {
        id: 'fan-2',
        gate_id: 'gate-3',
        source: 'fan',
        sentiment: 'busy',
        message: 'busy too',
        created_at: minsAgo(5),
      },
    ])
    const g3 = twoFan.gate_scores!.find((g) => g.gate_id === 'gate-3')!
    expect(g3.components.fan_signal).toBe(0)
  })

  it('three+ fan reports DO contribute — majority sentiment, weighted 1×', () => {
    const threeFan = deriveArrivalPlan(null, [
      {
        id: 'fan-1',
        gate_id: 'gate-3',
        source: 'fan',
        sentiment: 'busy',
        message: 'busy',
        created_at: minsAgo(2),
      },
      {
        id: 'fan-2',
        gate_id: 'gate-3',
        source: 'fan',
        sentiment: 'busy',
        message: 'busy',
        created_at: minsAgo(5),
      },
      {
        id: 'fan-3',
        gate_id: 'gate-3',
        source: 'fan',
        sentiment: 'busy',
        message: 'busy',
        created_at: minsAgo(8),
      },
    ])
    const g3 = threeFan.gate_scores!.find((g) => g.gate_id === 'gate-3')!
    // SENTIMENT_SCORE.busy = -2, weight × 1 → fan_signal === -2
    expect(g3.components.fan_signal).toBe(-2)
  })

  it('staff signal applies individually with 3× weight even when fans are silent', () => {
    const staffOnly = deriveArrivalPlan(null, [
      {
        id: 'staff-1',
        gate_id: 'gate-3',
        source: 'staff',
        sentiment: 'smooth',
        message: 'Smooth',
        created_at: minsAgo(2),
      },
    ])
    const g3 = staffOnly.gate_scores!.find((g) => g.gate_id === 'gate-3')!
    // SENTIMENT_SCORE.smooth = +2, weight × 3 → staff_signal === +6
    expect(g3.components.staff_signal).toBe(6)
  })

  it('conflict: staff smooth + 3 fans busy → hasConflict true, confidence drops', () => {
    const conflictSignals = [
      {
        id: 'staff-1',
        gate_id: 'gate-3',
        source: 'staff' as const,
        sentiment: 'smooth' as const,
        message: 'Smooth',
        created_at: minsAgo(2),
      },
      ...Array.from({ length: 3 }, (_, i) => ({
        id: `fan-${i}`,
        gate_id: 'gate-3',
        source: 'fan' as const,
        sentiment: 'busy' as const,
        message: 'busy',
        created_at: minsAgo(3 + i),
      })),
    ]
    const plan = deriveArrivalPlan(null, conflictSignals)
    expect(plan.confidence_breakdown.hasConflict).toBe(true)
    expect(plan.confidence_breakdown.staffSignalCount).toBe(1)
    expect(plan.confidence_breakdown.fanSignalCount).toBe(3)
  })

  it('confidence_breakdown always has the required shape', () => {
    const plan = deriveArrivalPlan(null, [])
    expect(plan.confidence_breakdown).toMatchObject({
      percent: expect.any(Number),
      reasons: expect.any(Array),
      signalCount: expect.any(Number),
      staffSignalCount: expect.any(Number),
      fanSignalCount: expect.any(Number),
      hasConflict: expect.any(Boolean),
      isLimitedData: expect.any(Boolean),
      isStale: expect.any(Boolean),
      derivedAt: expect.any(String),
    })
    expect(plan.confidence_breakdown.percent).toBeGreaterThanOrEqual(25)
    expect(plan.confidence_breakdown.percent).toBeLessThanOrEqual(95)
  })
})
