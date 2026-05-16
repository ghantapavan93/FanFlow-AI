/**
 * supabaseFanflowStore — STUB implementation, not wired by default.
 *
 * The real implementation would use @supabase/supabase-js and read from
 * the tables defined in supabase/schema.sql.
 *
 * This file exists to:
 *   1. Document the swap path so it's not theoretical.
 *   2. Type-check against the FanflowStore interface, ensuring the local
 *      implementation and the future Supabase implementation stay aligned.
 *   3. Provide a safe no-op fallback if env vars are unset.
 *
 * To activate:
 *   1. npm install @supabase/supabase-js
 *   2. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to env
 *   3. Apply supabase/schema.sql to your project
 *   4. Fill in the bodies below using `createClient(...)`
 *   5. Switch lib/data/index.ts to return supabaseFanflowStore
 *
 * Until that's done, this stub returns empty data and logs a one-time warning
 * — never throws — so the app stays demo-stable.
 */

import type { FanflowStore } from './fanflowStore'

let warned = false
function warnOnce() {
  if (warned || typeof window === 'undefined') return
  warned = true
  console.warn(
    '[FanFlow] supabaseFanflowStore is a stub. Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY and complete the implementation to activate.',
  )
}

export const supabaseFanflowStore: FanflowStore = {
  async getReadiness(_sessionId) {
    warnOnce()
    return null
  },

  async saveReadiness(_sessionId, _prefs) {
    warnOnce()
  },

  async getSignals(_eventId) {
    warnOnce()
    return []
  },

  async publishSignal(_signal) {
    warnOnce()
  },

  async getIncidents(_eventId) {
    warnOnce()
    return []
  },

  async updateIncident(_id, _patch) {
    warnOnce()
  },
}
