'use client'

/**
 * Synchronous localStorage helpers — the convenience layer the UI uses today.
 *
 * Architecturally this is the body of localFanflowStore (see lib/data/).
 * Each mutator writes to localStorage AND dispatches a custom window event so
 * same-tab listeners refresh immediately. Cross-tab listeners get the same
 * refresh via the native `storage` event — see subscribeToFanflowChanges().
 *
 * When the backend swaps to Supabase, this file is what changes — consumers
 * keep their existing import paths.
 */

import type { Incident, IncidentStatus, LiveSignal, ReadinessPrefs } from './types'
import { demoIncidents, demoLiveSignals } from './seed'

const READINESS_KEY = 'fanflow_readiness'
const SIGNALS_KEY = 'fanflow_published_signals'
const CHECKLIST_KEY = 'fanflow_checklist'
const INCIDENTS_OVERRIDE_KEY = 'fanflow_incidents_overrides'

export type FanflowEvent = 'fanflow:readiness' | 'fanflow:signals' | 'fanflow:incidents'

const STORAGE_KEY_TO_EVENT: Record<string, FanflowEvent> = {
  [READINESS_KEY]: 'fanflow:readiness',
  [SIGNALS_KEY]: 'fanflow:signals',
  [INCIDENTS_OVERRIDE_KEY]: 'fanflow:incidents',
}

/**
 * Write a JSON value to localStorage with hardened error handling.
 *
 * localStorage.setItem can throw in multiple real situations:
 *   - Safari private mode (always quota = 0)
 *   - Firefox tracking protection
 *   - Storage quota exceeded (browser limit, typically 5–10 MB)
 *   - SecurityError when localStorage is disabled by browser/extension
 *
 * Reads have always been guarded; writes were not — that was a silent
 * data-loss bug. This helper logs once and degrades to in-memory only.
 */
let warnedAboutStorage = false
function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch (err) {
    if (!warnedAboutStorage) {
      warnedAboutStorage = true
      console.warn(
        '[FanFlow] localStorage write failed — data will not persist across page loads. ' +
          'Likely cause: private browsing, tracking protection, quota exceeded, or storage disabled. ' +
          `Key: ${key}. Error: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
    return false
  }
}

function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // remove can also throw in restricted modes — silent fail is fine here
  }
}

export function loadReadiness(): ReadinessPrefs | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(READINESS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ReadinessPrefs
  } catch {
    return null
  }
}

export function saveReadiness(prefs: ReadinessPrefs): void {
  if (typeof window === 'undefined') return
  safeSetItem(READINESS_KEY, JSON.stringify(prefs))
  window.dispatchEvent(new Event('fanflow:readiness'))
}

export function clearReadiness(): void {
  if (typeof window === 'undefined') return
  safeRemoveItem(READINESS_KEY)
  window.dispatchEvent(new Event('fanflow:readiness'))
}

export function loadPublishedSignals(): LiveSignal[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(SIGNALS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as LiveSignal[]
  } catch {
    return []
  }
}

export function publishSignal(signal: LiveSignal): void {
  if (typeof window === 'undefined') return
  const existing = loadPublishedSignals()
  const next = [signal, ...existing].slice(0, 30)
  safeSetItem(SIGNALS_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event('fanflow:signals'))
}

export function clearPublishedSignals(): void {
  if (typeof window === 'undefined') return
  safeRemoveItem(SIGNALS_KEY)
  window.dispatchEvent(new Event('fanflow:signals'))
}

export function getAllSignals(): LiveSignal[] {
  return [...loadPublishedSignals(), ...demoLiveSignals].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

type IncidentOverride = {
  status?: IncidentStatus
  action?: string
  updated_at: string
}

function loadIncidentOverrides(): Record<string, IncidentOverride> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(INCIDENTS_OVERRIDE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, IncidentOverride>
  } catch {
    return {}
  }
}

function saveIncidentOverrides(map: Record<string, IncidentOverride>): void {
  if (typeof window === 'undefined') return
  safeSetItem(INCIDENTS_OVERRIDE_KEY, JSON.stringify(map))
  window.dispatchEvent(new Event('fanflow:incidents'))
}

export function loadIncidents(): Incident[] {
  const overrides = loadIncidentOverrides()
  return demoIncidents.map((inc) => {
    const o = overrides[inc.id]
    if (!o) return inc
    return {
      ...inc,
      status: o.status ?? inc.status,
      action: o.action ?? inc.action,
      updated_at: o.updated_at,
    }
  })
}

export function updateIncident(
  id: string,
  patch: { status?: IncidentStatus; action?: string },
): void {
  if (typeof window === 'undefined') return
  const overrides = loadIncidentOverrides()
  overrides[id] = {
    ...overrides[id],
    ...patch,
    updated_at: new Date().toISOString(),
  }
  saveIncidentOverrides(overrides)
}

export function clearIncidentOverrides(): void {
  if (typeof window === 'undefined') return
  safeRemoveItem(INCIDENTS_OVERRIDE_KEY)
  window.dispatchEvent(new Event('fanflow:incidents'))
}

export function loadChecklist(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(CHECKLIST_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, boolean>
  } catch {
    return {}
  }
}

export function saveChecklist(state: Record<string, boolean>): void {
  if (typeof window === 'undefined') return
  safeSetItem(CHECKLIST_KEY, JSON.stringify(state))
}

/**
 * Subscribe to FanFlow data changes from BOTH the current tab and other tabs.
 *
 * Same-tab updates fire via the custom events dispatched by saveReadiness /
 * publishSignal / updateIncident. Cross-tab updates fire via the native
 * `storage` event, which only fires in OTHER tabs when a localStorage key
 * changes — that's exactly the gap the storage listener closes.
 *
 * Returns an unsubscribe function for useEffect cleanup.
 *
 * Usage:
 *   useEffect(() => subscribeToFanflowChanges(
 *     ['fanflow:signals', 'fanflow:readiness'],
 *     refresh,
 *   ), [refresh])
 */
export function subscribeToFanflowChanges(
  events: FanflowEvent[],
  handler: () => void,
): () => void {
  if (typeof window === 'undefined') return () => {}

  const onCustom = () => handler()
  for (const evt of events) window.addEventListener(evt, onCustom)

  const onStorage = (e: StorageEvent) => {
    if (!e.key) return
    const mapped = STORAGE_KEY_TO_EVENT[e.key]
    if (mapped && events.includes(mapped)) handler()
  }
  window.addEventListener('storage', onStorage)

  return () => {
    for (const evt of events) window.removeEventListener(evt, onCustom)
    window.removeEventListener('storage', onStorage)
  }
}
