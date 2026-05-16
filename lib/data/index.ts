/**
 * FanflowStore factory.
 *
 * The default is localFanflowStore (zero config, works in the demo).
 * If both NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are present,
 * supabaseFanflowStore is selected — but its body is still a stub until you
 * wire it in (see lib/data/supabaseFanflowStore.ts).
 *
 * This is the single seam between the rest of the app and the data layer.
 */

import type { FanflowStore } from './fanflowStore'
import { localFanflowStore } from './localFanflowStore'
import { supabaseFanflowStore } from './supabaseFanflowStore'

export type { FanflowStore } from './fanflowStore'
export { DEMO_SESSION_ID, DEMO_EVENT_ID } from './fanflowStore'

let cached: FanflowStore | null = null

export function getFanflowStore(): FanflowStore {
  if (cached) return cached

  const hasSupabase =
    typeof process !== 'undefined' &&
    !!process.env?.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    !!process.env?.SUPABASE_SERVICE_ROLE_KEY?.trim()

  cached = hasSupabase ? supabaseFanflowStore : localFanflowStore
  return cached
}
