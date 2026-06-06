/* ─────────────────────────────────────────────────────────────────────────
   Provider registry — the single swap point between FanFlow's orchestration
   layer and the systems that supply venue maps, parking, crowd intelligence,
   and signals.

   Today every field points at a simulated implementation over our demo seed
   + localStorage store. To integrate a real platform later, implement the
   matching interface (e.g. MappedinVenueMapProvider, SpotHeroParkingProvider,
   WaitTimeCrowdProvider) and repoint the field here — no UI or service change.

   See docs/INTEGRATION_ADAPTERS.md for the full map of today vs. tomorrow.
   ───────────────────────────────────────────────────────────────────────── */

import type { ProviderRegistry } from './types'
import { simulatedVenueMapProvider } from './simulated/simulatedVenueMapProvider'
import { simulatedParkingProvider } from './simulated/simulatedParkingProvider'
import { simulatedCrowdProvider } from './simulated/simulatedCrowdProvider'
import { localStaffSignalProvider } from './simulated/localStaffSignalProvider'
import { localFanPulseProvider } from './simulated/localFanPulseProvider'

export const providers: ProviderRegistry = {
  venueMap: simulatedVenueMapProvider,
  parking: simulatedParkingProvider,
  crowd: simulatedCrowdProvider,
  staff: localStaffSignalProvider,
  fanPulse: localFanPulseProvider,
}

export * from './types'
