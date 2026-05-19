/**
 * Operational alert derivation tests.
 *
 * Asserts that computeOperationalAlerts produces the right alerts from
 * combinations of venue + signals + incidents. All 5 rules are exercised:
 *   1. Stale gate (>45 min since last staff update)
 *   2. Staff-vs-fan disagreement
 *   3. Aging open incident (>20 min)
 *   4. Fan-pulse surge (5+ in 10 min, 3+ negative)
 *   5. Coverage gap (<50% gates with recent staff)
 */

import { describe, expect, it } from 'vitest'
import { computeOperationalAlerts } from '@/lib/operationalAlerts'
import { demoVenue } from '@/lib/seed'
import type { Incident, LiveSignal, Venue } from '@/lib/types'

const minsAgo = (n: number) => new Date(Date.now() - n * 60 * 1000).toISOString()

function staffSignal(
  gateId: string,
  sentiment: LiveSignal['sentiment'],
  minsOld: number,
  id?: string,
): LiveSignal {
  return {
    id: id ?? `staff-${gateId}-${minsOld}`,
    gate_id: gateId,
    source: 'staff',
    sentiment,
    message: `Staff: ${sentiment}`,
    created_at: minsAgo(minsOld),
  }
}

function fanSignal(
  gateId: string,
  sentiment: LiveSignal['sentiment'],
  minsOld: number,
  id?: string,
): LiveSignal {
  return {
    id: id ?? `fan-${gateId}-${minsOld}-${Math.random().toString(36).slice(2, 6)}`,
    gate_id: gateId,
    source: 'fan',
    sentiment,
    message: `Fan: ${sentiment}`,
    created_at: minsAgo(minsOld),
  }
}

describe('operational alerts — rule 1: stale gate', () => {
  it('fires when a staff signal is older than 45 minutes', () => {
    const signals: LiveSignal[] = [staffSignal('gate-3', 'smooth', 50)]
    const alerts = computeOperationalAlerts(demoVenue, signals, [])
    const stale = alerts.find((a) => a.id === 'stale-gate-3')
    expect(stale).toBeDefined()
    expect(stale!.severity).toBe('warning')
    expect(stale!.gateId).toBe('gate-3')
  })

  it('does NOT fire when staff signal is recent (< 45 min)', () => {
    const signals: LiveSignal[] = [staffSignal('gate-3', 'smooth', 10)]
    const alerts = computeOperationalAlerts(demoVenue, signals, [])
    expect(alerts.find((a) => a.id === 'stale-gate-3')).toBeUndefined()
  })

  it('does NOT fire when the gate has no staff signals at all', () => {
    const alerts = computeOperationalAlerts(demoVenue, [], [])
    const staleAlerts = alerts.filter((a) => a.id.startsWith('stale-'))
    expect(staleAlerts).toHaveLength(0)
  })
})

describe('operational alerts — rule 2: staff-fan disagreement', () => {
  it('fires when staff says smooth but 3+ fans say busy', () => {
    const signals: LiveSignal[] = [
      staffSignal('gate-1', 'smooth', 5),
      fanSignal('gate-1', 'busy', 10),
      fanSignal('gate-1', 'busy', 12),
      fanSignal('gate-1', 'difficult', 14),
    ]
    const alerts = computeOperationalAlerts(demoVenue, signals, [])
    const conflict = alerts.find((a) => a.id === 'conflict-gate-1')
    expect(conflict).toBeDefined()
    expect(conflict!.severity).toBe('warning')
  })

  it('does NOT fire when staff and fans agree (both positive)', () => {
    const signals: LiveSignal[] = [
      staffSignal('gate-3', 'smooth', 5),
      fanSignal('gate-3', 'smooth', 10),
      fanSignal('gate-3', 'smooth', 12),
      fanSignal('gate-3', 'moderate', 14),
    ]
    const alerts = computeOperationalAlerts(demoVenue, signals, [])
    expect(alerts.find((a) => a.id === 'conflict-gate-3')).toBeUndefined()
  })

  it('does NOT fire with fewer than 3 fan reports', () => {
    const signals: LiveSignal[] = [
      staffSignal('gate-1', 'smooth', 5),
      fanSignal('gate-1', 'busy', 10),
      fanSignal('gate-1', 'busy', 12),
    ]
    const alerts = computeOperationalAlerts(demoVenue, signals, [])
    expect(alerts.find((a) => a.id === 'conflict-gate-1')).toBeUndefined()
  })
})

describe('operational alerts — rule 3: aging open incident', () => {
  it('fires for an open incident older than 20 minutes', () => {
    const incidents: Incident[] = [
      {
        id: 'inc-aging',
        type: 'long_line',
        source: 'staff',
        gate_id: 'gate-1',
        status: 'open',
        created_at: minsAgo(30),
        updated_at: minsAgo(25),
        note: 'Long line persisting',
      },
    ]
    const alerts = computeOperationalAlerts(demoVenue, [], incidents)
    const aging = alerts.find((a) => a.id === 'incident-inc-aging')
    expect(aging).toBeDefined()
    expect(aging!.severity).toBe('critical')
  })

  it('does NOT fire for a resolved incident even if old', () => {
    const incidents: Incident[] = [
      {
        id: 'inc-resolved',
        type: 'long_line',
        source: 'staff',
        gate_id: 'gate-1',
        status: 'resolved',
        created_at: minsAgo(60),
        updated_at: minsAgo(55),
        note: 'Was a long line, resolved',
      },
    ]
    const alerts = computeOperationalAlerts(demoVenue, [], incidents)
    expect(alerts.find((a) => a.id === 'incident-inc-resolved')).toBeUndefined()
  })

  it('does NOT fire for a recently-updated open incident', () => {
    const incidents: Incident[] = [
      {
        id: 'inc-fresh',
        type: 'family_assistance',
        source: 'fan',
        gate_id: 'gate-3',
        status: 'open',
        created_at: minsAgo(10),
        updated_at: minsAgo(5),
        note: 'Family needs help',
      },
    ]
    const alerts = computeOperationalAlerts(demoVenue, [], incidents)
    expect(alerts.find((a) => a.id === 'incident-inc-fresh')).toBeUndefined()
  })
})

describe('operational alerts — rule 4: fan-pulse surge', () => {
  it('fires when 5+ fan signals in 10 min with 3+ negative', () => {
    const signals: LiveSignal[] = [
      fanSignal('gate-7', 'busy', 2, 'surge-1'),
      fanSignal('gate-7', 'difficult', 3, 'surge-2'),
      fanSignal('gate-7', 'busy', 4, 'surge-3'),
      fanSignal('gate-7', 'difficult', 5, 'surge-4'),
      fanSignal('gate-7', 'busy', 6, 'surge-5'),
    ]
    const alerts = computeOperationalAlerts(demoVenue, signals, [])
    const surge = alerts.find((a) => a.id === 'surge-gate-7')
    expect(surge).toBeDefined()
    expect(surge!.severity).toBe('critical')
  })

  it('does NOT fire when 5+ fan signals but only 2 are negative', () => {
    const signals: LiveSignal[] = [
      fanSignal('gate-7', 'smooth', 2, 'mix-1'),
      fanSignal('gate-7', 'smooth', 3, 'mix-2'),
      fanSignal('gate-7', 'smooth', 4, 'mix-3'),
      fanSignal('gate-7', 'busy', 5, 'mix-4'),
      fanSignal('gate-7', 'busy', 6, 'mix-5'),
    ]
    const alerts = computeOperationalAlerts(demoVenue, signals, [])
    expect(alerts.find((a) => a.id === 'surge-gate-7')).toBeUndefined()
  })
})

describe('operational alerts — rule 5: coverage gap', () => {
  it('fires when fewer than half of gates have recent staff signals', () => {
    // 3 gates total, 0 with staff signals → coverage gap
    const alerts = computeOperationalAlerts(demoVenue, [], [])
    const gap = alerts.find((a) => a.id === 'coverage-gap')
    expect(gap).toBeDefined()
    expect(gap!.severity).toBe('info')
  })

  it('does NOT fire when 2+ of 3 gates have recent staff signals', () => {
    const signals: LiveSignal[] = [
      staffSignal('gate-3', 'smooth', 10),
      staffSignal('gate-1', 'moderate', 20),
    ]
    const alerts = computeOperationalAlerts(demoVenue, signals, [])
    expect(alerts.find((a) => a.id === 'coverage-gap')).toBeUndefined()
  })
})

describe('operational alerts — sort order', () => {
  it('returns critical before warning before info', () => {
    const signals: LiveSignal[] = [
      staffSignal('gate-3', 'smooth', 50), // stale → warning
    ]
    const incidents: Incident[] = [
      {
        id: 'inc-old',
        type: 'medical',
        source: 'fan',
        gate_id: 'gate-1',
        status: 'open',
        created_at: minsAgo(40),
        updated_at: minsAgo(30),
        note: 'Medical issue open 30 min',
      },
    ]
    // coverage gap (info) fires too since only 1 gate has staff
    const alerts = computeOperationalAlerts(demoVenue, signals, incidents)
    expect(alerts.length).toBeGreaterThanOrEqual(2)

    // Verify ordering
    for (let i = 1; i < alerts.length; i++) {
      const order = { critical: 0, warning: 1, info: 2 }
      expect(order[alerts[i].severity]).toBeGreaterThanOrEqual(order[alerts[i - 1].severity])
    }
  })
})
