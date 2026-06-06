/* Simulated CrowdIntelligenceProvider — derives gate pressure + zone density
   from staff/fan signals via crowdService. Future adapter:
   WaitTimeCrowdProvider / VenueAnalyticsCrowdProvider. */

import { demoVenue } from '../../seed'
import { getGateCrowd, type GateCrowdState } from '../../services/crowdService'
import type {
  CrowdDensity,
  CrowdIntelligenceProvider,
  CrowdZoneStatus,
} from '../types'

function pressureToDensity(p: GateCrowdState['pressure']): CrowdDensity {
  if (p === 'busy') return 'high'
  if (p === 'moderate') return 'moderate'
  if (p === 'smooth') return 'low'
  return 'unknown'
}

export const simulatedCrowdProvider: CrowdIntelligenceProvider = {
  async getGatePressure(_eventId: string): Promise<GateCrowdState[]> {
    return demoVenue.gates.map((g) => getGateCrowd(g.id))
  },

  async getZoneCrowdStatus(_eventId: string): Promise<CrowdZoneStatus[]> {
    return demoVenue.gates.map((g) => {
      const c = getGateCrowd(g.id)
      return {
        zoneId: g.id,
        label: g.name.split(' (')[0],
        density: pressureToDensity(c.pressure),
        source: c.source,
        confidence: c.confidence,
        derivedAt: c.derivedAt,
      }
    })
  },
}
