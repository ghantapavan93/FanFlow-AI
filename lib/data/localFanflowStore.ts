/**
 * localFanflowStore — the default FanflowStore implementation.
 *
 * Reads and writes through lib/store.ts (localStorage + custom window events).
 * The async signatures wrap synchronous localStorage calls in Promise.resolve()
 * so the interface matches Supabase reality.
 *
 * The sessionId / eventId parameters are accepted but ignored — the prototype
 * is single-user, single-event by design. They exist so the call sites already
 * carry the right arguments when a real backend is wired in.
 */

import type { FanflowStore } from './fanflowStore'
import {
  getAllSignals,
  loadIncidents,
  loadReadiness,
  publishSignal as _publishSignal,
  saveReadiness as _saveReadiness,
  updateIncident as _updateIncident,
} from '../store'

export const localFanflowStore: FanflowStore = {
  async getReadiness(_sessionId) {
    return loadReadiness()
  },

  async saveReadiness(_sessionId, prefs) {
    _saveReadiness(prefs)
  },

  async getSignals(_eventId) {
    return getAllSignals()
  },

  async publishSignal(signal) {
    _publishSignal(signal)
  },

  async getIncidents(_eventId) {
    return loadIncidents()
  },

  async updateIncident(id, patch) {
    _updateIncident(id, patch)
  },
}
