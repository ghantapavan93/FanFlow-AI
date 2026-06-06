/* localStorage FanPulseProvider — wraps the store + the deterministic
   computeFanPulse threshold. Future adapter: RealtimeFanPulseProvider over a
   fan-signal backend. The ≥3-fan majority rule stays in computeFanPulse so
   the "live" qualifier is honest regardless of transport. */

import { getAllSignals, publishSignal } from '../../store'
import { computeFanPulse } from '../../intelligence'
import type { LiveSignal } from '../../types'
import type { FanPulseProvider } from '../types'

export const localFanPulseProvider: FanPulseProvider = {
  async publishReport(report: LiveSignal) {
    publishSignal(report)
  },

  async getPulse(_eventId: string, gateId: string) {
    return computeFanPulse(getAllSignals(), gateId)
  },
}
