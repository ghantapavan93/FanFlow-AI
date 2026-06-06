/**
 * Provider contract tests — exercise every simulated provider against its
 * interface so the integration seam is proven, not dead code. These also
 * document the shape a real adapter (Mappedin / SpotHero / WaitTime / venue
 * ops) must satisfy to drop in.
 *
 * Store-backed providers (staff / fan pulse) run without a `window` here, so
 * the store returns empty — we assert the contract shape, not signal content.
 */

import { describe, expect, it } from 'vitest'
import { providers } from '@/lib/providers'
import { demoVenue } from '@/lib/seed'

describe('VenueMapProvider (simulated)', () => {
  it('returns the venue with gates and support points', async () => {
    const map = await providers.venueMap.getVenueMap('wc2026-final')
    expect(map.venueName).toBe(demoVenue.name)
    expect(map.gates.length).toBeGreaterThan(0)
    expect(map.supportPoints.length).toBeGreaterThan(0)
  })

  it('returns a labeled route estimate', async () => {
    const route = await providers.venueMap.getRoute({
      eventId: 'wc2026-final',
      fromGateId: 'gate-3',
      toSection: '117',
    })
    expect(route.fromGateId).toBe('gate-3')
    expect(typeof route.walkMinutes).toBe('number')
    expect(route.source).toBe('simulated_demo')
  })
})

describe('ParkingProvider (simulated)', () => {
  it('lists every demo lot', async () => {
    const lots = await providers.parking.getParkingOptions('wc2026-final')
    expect(lots.length).toBeGreaterThanOrEqual(4)
  })

  it('returns an honest status for a known lot and null for an unknown one', async () => {
    const ok = await providers.parking.getParkingStatus('lot-c')
    expect(ok?.status).toBe('open')
    expect(ok?.source).toBe('simulated_demo')
    expect(await providers.parking.getParkingStatus('nope')).toBeNull()
  })
})

describe('CrowdIntelligenceProvider (simulated)', () => {
  it('returns pressure for every gate with a source + confidence', async () => {
    const pressure = await providers.crowd.getGatePressure('wc2026-final')
    expect(pressure.length).toBe(demoVenue.gates.length)
    for (const p of pressure) {
      expect(['low', 'moderate', 'high', 'unknown', 'smooth', 'busy']).toContain(p.pressure)
      expect(typeof p.source).toBe('string')
    }
  })

  it('maps gate pressure to zone density', async () => {
    const zones = await providers.crowd.getZoneCrowdStatus('wc2026-final')
    expect(zones.length).toBe(demoVenue.gates.length)
    for (const z of zones) {
      expect(['low', 'moderate', 'high', 'unknown']).toContain(z.density)
    }
  })
})

describe('Staff + Fan providers (simulated)', () => {
  it('staff provider resolves recent signals as an array', async () => {
    const signals = await providers.staff.getRecentSignals('wc2026-final')
    expect(Array.isArray(signals)).toBe(true)
  })

  it('staff subscribe returns an unsubscribe function', () => {
    const unsub = providers.staff.subscribe(() => {})
    expect(typeof unsub).toBe('function')
    unsub()
  })

  it('fan pulse provider resolves a breakdown with a total', async () => {
    const pulse = await providers.fanPulse.getPulse('wc2026-final', 'gate-3')
    expect(typeof pulse.total).toBe('number')
  })
})
