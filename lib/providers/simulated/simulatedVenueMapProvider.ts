/* Simulated VenueMapProvider — serves the demo venue from seed.
   Future adapter: MappedinVenueMapProvider / MapsIndoorsVenueMapProvider. */

import { demoEvent, demoVenue } from '../../seed'
import type {
  RouteRequest,
  RouteResult,
  VenueMap,
  VenueMapProvider,
} from '../types'

export const simulatedVenueMapProvider: VenueMapProvider = {
  async getVenueMap(_eventId: string): Promise<VenueMap> {
    return {
      eventId: demoEvent.id,
      venueName: demoVenue.name,
      gates: demoVenue.gates,
      supportPoints: demoVenue.support_points,
    }
  },

  async getRoute(input: RouteRequest): Promise<RouteResult> {
    return {
      fromGateId: input.fromGateId,
      toSection: input.toSection,
      // Stylized walk estimate — a real adapter would return a wayfinding path.
      walkMinutes: 8,
      source: 'simulated_demo',
      confidence: 'moderate',
    }
  },

  async getPointsOfInterest(_eventId: string) {
    return demoVenue.support_points
  },
}
