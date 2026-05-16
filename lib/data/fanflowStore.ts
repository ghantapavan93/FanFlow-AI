/**
 * FanflowStore — the single seam between FanFlow's UI/rule-engine and its data layer.
 *
 * The prototype ships with a localStorage implementation (default). A Supabase
 * implementation is stubbed alongside; swapping is a one-line change in
 * lib/data/index.ts.
 *
 * Signatures are async on purpose — the local impl wraps localStorage in
 * Promise.resolve() so consumers don't need to change shape when the backend
 * swaps for a real database.
 */

import type { Incident, IncidentStatus, LiveSignal, ReadinessPrefs } from '../types'

export const DEMO_SESSION_ID = 'demo-session'
export const DEMO_EVENT_ID = 'wc2026-final'

export interface FanflowStore {
  getReadiness(sessionId: string): Promise<ReadinessPrefs | null>
  saveReadiness(sessionId: string, prefs: ReadinessPrefs): Promise<void>

  getSignals(eventId: string): Promise<LiveSignal[]>
  publishSignal(signal: LiveSignal): Promise<void>

  getIncidents(eventId: string): Promise<Incident[]>
  updateIncident(
    id: string,
    patch: { status?: IncidentStatus; action?: string },
  ): Promise<void>
}
