/**
 * Depth-feature tests — impact estimate + Ask FanFlow router. Both are pure
 * and deterministic (rules decide; no LLM), so they lock cleanly.
 */

import { describe, expect, it } from 'vitest'
import { deriveImpact } from '@/lib/impact'
import { answerFanQuestion } from '@/lib/askFanflow'
import { deriveArrivalPlan } from '@/lib/seed'

const plan = deriveArrivalPlan(null, undefined)
const gateLabel = plan.recommended_gate.name.split(' (')[0]

describe('deriveImpact', () => {
  it('estimates more saved time when the plan avoids peak', () => {
    expect(deriveImpact(plan, true).minutesSaved).toBe(12)
    expect(deriveImpact(plan, false).minutesSaved).toBe(6)
  })
  it('always returns three honest points', () => {
    expect(deriveImpact(plan, true).points).toHaveLength(3)
  })
})

describe('answerFanQuestion', () => {
  it('routes parking questions to a lot answer', () => {
    const a = answerFanQuestion('where should I park?', plan, [], gateLabel)
    expect(a.topic).toBe('parking')
    expect(a.source).toBe('simulated_demo')
  })
  it('routes restroom questions', () => {
    expect(answerFanQuestion('nearest bathroom', plan, [], gateLabel).topic).toBe('restroom')
  })
  it('routes accessibility questions', () => {
    expect(answerFanQuestion('is it step-free / wheelchair?', plan, [], gateLabel).topic).toBe(
      'accessibility',
    )
  })
  it('routes timing questions', () => {
    const a = answerFanQuestion('when should I leave?', plan, [], gateLabel)
    expect(a.topic).toBe('timing')
    expect(a.answer).toContain(plan.leave_by_time)
  })
  it('routes gate / entry questions', () => {
    expect(answerFanQuestion('where do I enter?', plan, [], gateLabel).topic).toBe('gate')
  })
  it('falls back to general for an unknown question', () => {
    expect(answerFanQuestion('what is the score', plan, [], gateLabel).topic).toBe('general')
  })
})
