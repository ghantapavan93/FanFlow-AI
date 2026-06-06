/* Simulated ParkingProvider — serves demo lots from seed via parkingService.
   Future adapter: SpotHeroParkingProvider / VenueParkingProvider. */

import { listParkingLots } from '../../services/parkingService'
import type { ParkingProvider, ParkingStatusResult } from '../types'

export const simulatedParkingProvider: ParkingProvider = {
  async getParkingOptions(_eventId: string) {
    return listParkingLots()
  },

  async getParkingStatus(lotId: string): Promise<ParkingStatusResult | null> {
    const lot = listParkingLots().find((l) => l.id === lotId)
    if (!lot) return null
    return {
      lotId: lot.id,
      status: lot.status,
      source: lot.status_source,
      confidence: lot.status_confidence,
      derivedAt: lot.derivedAt,
    }
  },
}
