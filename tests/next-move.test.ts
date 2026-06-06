/**
 * Next-best-move tests — lock the anticipatory rules. These are what make the
 * Hub card flip live as the Game Day simulation pushes signals.
 */

import { describe, expect, it } from 'vitest'
import { deriveNextMove } from '@/lib/nextMove'
import { deriveArrivalPlan } from '@/lib/seed'
import type { LiveSignal } from '@/lib/types'

const plan = deriveArrivalPlan(null, undefined)
const gateId = plan.recommended_gate.id
const gateLabel = plan.recommended_gate.name.split(' (')[0]

const now = Date.now()
const minsAgo = (n: number) => new Date(now - n * 60 * 1000).toISOString()

function fan(sentiment: LiveSignal['sentiment'], i: number): LiveSignal {
  return { id: `f${i}`, gate_id: gateId, source: 'fan', sentiment, message: 'x', created_at: minsAgo(5) }
}
function staff(sentiment: LiveSignal['sentiment']): LiveSignal {
  return { id: 's1', gate_id: gateId, source: 'staff', sentiment, message: 'x', created_at: minsAgo(2) }
}

describe('deriveNextMove', () => {
  it('is calm with no signals', () => {
    const m = deriveNextMove(plan, [], gateLabel, now)
    expect(m.urgency).toBe('calm')
    expect(m.title.toLowerCase()).toContain(gateLabel.toLowerCase())
  })

  it('flips to heads-up on a staff busy signal (verified)', () => {
    const m = deriveNextMove(plan, [staff('busy')], gateLabel, now)
    expect(m.urgency).toBe('heads_up')
    expect(m.source).toBe('staff_verified')
    expect(m.confidence).toBe('verified')
  })

  it('reassures on a staff smooth signal', () => {
    const m = deriveNextMove(plan, [staff('smooth')], gateLabel, now)
    expect(m.urgency).toBe('calm')
    expect(m.source).toBe('staff_verified')
  })

  it('raises a heads-up once 3+ fans report busy', () => {
    const two = deriveNextMove(plan, [fan('busy', 1), fan('busy', 2)], gateLabel, now)
    expect(two.urgency).not.toBe('heads_up') // under the majority threshold
    const three = deriveNextMove(plan, [fan('busy', 1), fan('busy', 2), fan('busy', 3)], gateLabel, now)
    expect(three.urgency).toBe('heads_up')
    expect(three.source).toBe('fan_reported')
  })

  it('ignores stale signals (older than 60 min)', () => {
    const stale: LiveSignal = { id: 'old', gate_id: gateId, source: 'staff', sentiment: 'busy', message: 'x', created_at: minsAgo(90) }
    const m = deriveNextMove(plan, [stale], gateLabel, now)
    expect(m.urgency).toBe('calm')
  })
})
