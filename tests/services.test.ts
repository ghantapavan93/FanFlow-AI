/**
 * Service-layer tests — lock in the Phase A–F honest-source + crowd logic.
 *
 * These mirror the load-bearing fan-pulse rules (staff weighted over fans,
 * ≥3 fan reports = majority) at the service boundary that the new Venue Map
 * layers, Parking page, and Conditions chip rely on. Pure functions only —
 * crowdService.getGateCrowd accepts signals directly so no store mocking is
 * needed.
 */

import { describe, expect, it } from 'vitest'
import { getGateCrowd } from '@/lib/services/crowdService'
import { getRecommendedLot, listParkingLots } from '@/lib/services/parkingService'
import { inferMapFocus, staffVerifiedAlert } from '@/lib/services/alertService'
import { formatDerivedAt } from '@/lib/sources'
import type { LiveSignal } from '@/lib/types'

const minsAgo = (n: number) => new Date(Date.now() - n * 60 * 1000).toISOString()

function fan(gateId: string, sentiment: LiveSignal['sentiment'], minsOld = 5): LiveSignal {
  return {
    id: `fan-${gateId}-${minsOld}-${Math.random().toString(36).slice(2, 7)}`,
    gate_id: gateId,
    source: 'fan',
    sentiment,
    message: `Fan: ${sentiment}`,
    created_at: minsAgo(minsOld),
  }
}
function staff(gateId: string, sentiment: LiveSignal['sentiment'], minsOld = 5): LiveSignal {
  return {
    id: `staff-${gateId}-${minsOld}-${Math.random().toString(36).slice(2, 7)}`,
    gate_id: gateId,
    source: 'staff',
    sentiment,
    message: `Staff: ${sentiment}`,
    created_at: minsAgo(minsOld),
  }
}

describe('crowdService.getGateCrowd', () => {
  it('returns estimated/low confidence when there are no signals', () => {
    const c = getGateCrowd('gate-3', [])
    expect(c.pressure).toBe('unknown')
    expect(c.source).toBe('estimated')
    expect(c.confidence).toBe('low')
    expect(c.staff_verified).toBe(false)
  })

  it('treats fewer than 3 fan reports as low-confidence fan-reported, not a majority', () => {
    const c = getGateCrowd('gate-3', [fan('gate-3', 'busy'), fan('gate-3', 'busy')])
    expect(c.source).toBe('fan_reported')
    expect(c.confidence).toBe('low')
    // Under the threshold, pressure stays unknown (no majority yet).
    expect(c.pressure).toBe('unknown')
    expect(c.fan_reports).toBe(2)
  })

  it('forms a majority at 3+ fan reports', () => {
    const c = getGateCrowd('gate-3', [
      fan('gate-3', 'busy'),
      fan('gate-3', 'busy'),
      fan('gate-3', 'smooth'),
    ])
    expect(c.source).toBe('fan_reported')
    expect(c.confidence).toBe('moderate')
    expect(c.pressure).toBe('busy') // majority sentiment
  })

  it('escalates fan confidence to high at 6+ reports', () => {
    const signals = Array.from({ length: 6 }, () => fan('gate-3', 'smooth'))
    const c = getGateCrowd('gate-3', signals)
    expect(c.confidence).toBe('high')
    expect(c.pressure).toBe('smooth')
  })

  it('lets a single staff signal override fan noise (3x trust → verified)', () => {
    const c = getGateCrowd('gate-3', [
      fan('gate-3', 'busy'),
      fan('gate-3', 'busy'),
      fan('gate-3', 'busy'),
      staff('gate-3', 'smooth'),
    ])
    expect(c.staff_verified).toBe(true)
    expect(c.source).toBe('staff_verified')
    expect(c.confidence).toBe('verified')
    expect(c.pressure).toBe('smooth') // staff wins
  })

  it('ignores signals for other gates', () => {
    const c = getGateCrowd('gate-3', [staff('gate-1', 'difficult')])
    expect(c.source).toBe('estimated')
    expect(c.pressure).toBe('unknown')
  })

  it('ignores stale signals older than 60 minutes', () => {
    const c = getGateCrowd('gate-3', [
      fan('gate-3', 'busy', 90),
      fan('gate-3', 'busy', 90),
      fan('gate-3', 'busy', 90),
    ])
    expect(c.source).toBe('estimated')
    expect(c.pressure).toBe('unknown')
  })
})

describe('parkingService.getRecommendedLot', () => {
  it('prefers an open lot that serves the requested gate', () => {
    const lot = getRecommendedLot('gate-3')
    expect(lot).toBeDefined()
    expect(lot!.status).toBe('open')
    expect(lot!.recommended_gate_id).toBe('gate-3')
  })

  it('always returns a non-full, non-unknown lot as a fallback', () => {
    const lot = getRecommendedLot('does-not-exist')
    expect(lot).toBeDefined()
    expect(['full', 'unknown']).not.toContain(lot!.status)
  })

  it('every seeded lot carries an honest source + confidence label', () => {
    for (const lot of listParkingLots()) {
      expect(lot.status_source).toBe('simulated_demo')
      expect(['low', 'moderate', 'high', 'verified']).toContain(lot.status_confidence)
      expect(typeof lot.derivedAt).toBe('string')
    }
  })
})

describe('alertService', () => {
  it('inferMapFocus routes keywords to the right map layer', () => {
    expect(inferMapFocus('North Garage filling fast')).toBe('parking')
    expect(inferMapFocus('Lot C is open')).toBe('parking')
    expect(inferMapFocus('Bag check line backing up at the gate')).toBe('gate_guidance')
    expect(inferMapFocus('Step-free elevator out of service')).toBe('accessibility')
    expect(inferMapFocus('Family restroom near section 117')).toBe('restrooms')
  })

  it('inferMapFocus falls back to the crowd layer when nothing matches', () => {
    expect(inferMapFocus('Everything looks great tonight')).toBe('crowd_pulse')
  })

  it('staffVerifiedAlert stamps the verified source label + focus', () => {
    const msg = staffVerifiedAlert({
      id: 'a1',
      title: 'Gate update',
      body: 'Gate 5 is smoother',
      showMapFocus: inferMapFocus('Gate 5 is smoother'),
    })
    expect(msg.source).toBe('staff_verified')
    expect(msg.confidence).toBe('verified')
    expect(msg.sourceLabel).toBe('Staff verified')
    expect(msg.showMapFocus).toBe('gate_guidance')
    expect(typeof msg.derivedAt).toBe('string')
  })
})

describe('sources.formatDerivedAt', () => {
  const now = Date.now()
  it('reports "just now" under 45 seconds', () => {
    expect(formatDerivedAt(new Date(now - 10 * 1000).toISOString(), now)).toBe('Updated just now')
  })
  it('reports minutes for recent timestamps', () => {
    expect(formatDerivedAt(new Date(now - 7 * 60 * 1000).toISOString(), now)).toBe('Updated 7 min ago')
  })
  it('reports hours past 60 minutes', () => {
    expect(formatDerivedAt(new Date(now - 2 * 60 * 60 * 1000).toISOString(), now)).toBe('Updated 2h ago')
  })
  it('degrades gracefully on an invalid timestamp', () => {
    expect(formatDerivedAt('not-a-date', now)).toBe('Updated recently')
  })
})
