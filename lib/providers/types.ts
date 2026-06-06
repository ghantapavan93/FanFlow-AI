/* ─────────────────────────────────────────────────────────────────────────
   Provider interfaces — FanFlow's integration seam.

   FanFlow is the fan-facing ORCHESTRATION layer. Mapping, parking, and crowd
   intelligence are real product categories owned by specialized platforms
   (Mappedin, MapsIndoors, SpotHero, WaitTime, venue ops systems). FanFlow
   does not replace them — it composes them into one event-day companion.

   These interfaces are the contract a real adapter would implement. Today
   every method is fulfilled by a *simulated* implementation over our demo
   seed + localStorage store. The signatures are async on purpose so swapping
   in a real networked adapter later is a one-line change in the registry,
   with no UI rewrite.

   Honesty rule carried through every result: each "live" datum keeps a
   `source` (simulated_demo / estimated / fan_reported / staff_verified /
   official) and a `confidence` so the UI never overclaims.
   ───────────────────────────────────────────────────────────────────────── */

import type {
  Gate,
  SupportPoint,
  ParkingLot,
  ParkingStatus,
  LiveSignal,
  SourceType,
  ConfidenceLevel,
} from '../types'
import type { GateCrowdState } from '../services/crowdService'
import type { FanPulseBreakdown } from '../intelligence'

/* ── Venue map / wayfinding ───────────────────────────────────────────────
   Future adapters: Mappedin, MapsIndoors, or a custom venue map service. */

export interface VenueMap {
  eventId: string
  venueName: string
  gates: Gate[]
  supportPoints: SupportPoint[]
}

export interface RouteRequest {
  eventId: string
  fromGateId: string
  toSection: string
}

export interface RouteResult {
  fromGateId: string
  toSection: string
  walkMinutes: number
  source: SourceType
  confidence: ConfidenceLevel
}

export interface VenueMapProvider {
  getVenueMap(eventId: string): Promise<VenueMap>
  getRoute(input: RouteRequest): Promise<RouteResult>
  getPointsOfInterest(eventId: string): Promise<SupportPoint[]>
}

/* ── Parking ──────────────────────────────────────────────────────────────
   Future adapter: SpotHero developer platform or a venue parking API. */

export interface ParkingStatusResult {
  lotId: string
  status: ParkingStatus
  source: SourceType
  confidence: ConfidenceLevel
  derivedAt: string
}

export interface ParkingProvider {
  getParkingOptions(eventId: string): Promise<ParkingLot[]>
  getParkingStatus(lotId: string): Promise<ParkingStatusResult | null>
}

/* ── Crowd intelligence ───────────────────────────────────────────────────
   Future adapter: WaitTime-style crowd intelligence or venue analytics.
   Honesty rule: gate pressure comes from staff/fan/simulated signals — never
   from ticket sales or seat capacity, which estimate demand, not live load. */

export type CrowdDensity = 'low' | 'moderate' | 'high' | 'unknown'

export interface CrowdZoneStatus {
  zoneId: string
  label: string
  density: CrowdDensity
  source: SourceType
  confidence: ConfidenceLevel
  derivedAt: string
}

export interface CrowdIntelligenceProvider {
  getZoneCrowdStatus(eventId: string): Promise<CrowdZoneStatus[]>
  getGatePressure(eventId: string): Promise<GateCrowdState[]>
}

/* ── Staff signals ────────────────────────────────────────────────────────
   Future adapter: a venue operations console / realtime backend. Today:
   localStorage + the cross-tab store. */

export interface StaffSignalProvider {
  publishSignal(signal: LiveSignal): Promise<void>
  getRecentSignals(eventId: string): Promise<LiveSignal[]>
  /** Subscribe to signal changes; returns an unsubscribe function. */
  subscribe(onChange: () => void): () => void
}

/* ── Fan pulse ────────────────────────────────────────────────────────────
   Future adapter: a realtime fan-signal backend. Today: localStorage store
   + the deterministic computeFanPulse threshold (≥3 fans = majority). */

export interface FanPulseProvider {
  publishReport(report: LiveSignal): Promise<void>
  getPulse(eventId: string, gateId: string): Promise<FanPulseBreakdown>
}

/* ── Registry ─────────────────────────────────────────────────────────────
   The single swap point. Repoint any field at a real adapter later without
   touching the orchestration services or UI. */

export interface ProviderRegistry {
  venueMap: VenueMapProvider
  parking: ParkingProvider
  crowd: CrowdIntelligenceProvider
  staff: StaffSignalProvider
  fanPulse: FanPulseProvider
}
