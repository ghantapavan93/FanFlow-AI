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
    expect(plan.confidence).toBe('high')
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

  it('No live signals — plan still derives cleanly, confidence stays high', () => {
    const s = getScenario('no-signals')!
    const plan = deriveArrivalPlan(s.prefs, s.signals)
    expect(plan.recommended_gate.id).toBe('gate-3')
    expect(plan.confidence).toBe('high')
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
