'use client'

import type { Incident, IncidentStatus, LiveSignal, ReadinessPrefs } from './types'
import { demoIncidents, demoLiveSignals } from './seed'

const READINESS_KEY = 'fanflow_readiness'
const SIGNALS_KEY = 'fanflow_published_signals'
const CHECKLIST_KEY = 'fanflow_checklist'
const INCIDENTS_OVERRIDE_KEY = 'fanflow_incidents_overrides'

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
  window.localStorage.setItem(READINESS_KEY, JSON.stringify(prefs))
  window.dispatchEvent(new Event('fanflow:readiness'))
}

export function clearReadiness(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(READINESS_KEY)
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
  window.localStorage.setItem(SIGNALS_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event('fanflow:signals'))
}

export function clearPublishedSignals(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(SIGNALS_KEY)
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
  window.localStorage.setItem(INCIDENTS_OVERRIDE_KEY, JSON.stringify(map))
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
  window.localStorage.removeItem(INCIDENTS_OVERRIDE_KEY)
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
  window.localStorage.setItem(CHECKLIST_KEY, JSON.stringify(state))
}
