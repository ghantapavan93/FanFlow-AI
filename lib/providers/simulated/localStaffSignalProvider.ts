/* localStorage StaffSignalProvider — wraps the cross-tab store. Future
   adapter: VenueOpsStaffSignalProvider over a realtime backend (WebSocket /
   Supabase Realtime). The store's storage-event sync already mimics that. */

import {
  getAllSignals,
  publishSignal,
  subscribeToFanflowChanges,
} from '../../store'
import type { LiveSignal } from '../../types'
import type { StaffSignalProvider } from '../types'

export const localStaffSignalProvider: StaffSignalProvider = {
  async publishSignal(signal: LiveSignal) {
    publishSignal(signal)
  },

  async getRecentSignals(_eventId: string): Promise<LiveSignal[]> {
    return getAllSignals().filter((s) => s.source === 'staff')
  },

  subscribe(onChange: () => void) {
    return subscribeToFanflowChanges(['fanflow:signals'], onChange)
  },
}
