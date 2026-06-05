export interface Event {
  id: string
  name: string
  date: string
  image_url?: string
  venue_id: string
}

export interface Venue {
  id: string
  name: string
  gates: Gate[]
  support_points: SupportPoint[]
}

export interface Gate {
  id: string
  name: string
  sections: string[]
  accessibility: boolean
  family_friendly: boolean
  typical_wait_minutes: number
  map_x?: number
  map_y?: number
}

export interface Ticket {
  id: string
  section: string
  row?: string
  seat?: string
}

export type SupportType =
  | 'first_aid'
  | 'family_services'
  | 'accessibility'
  | 'restroom'
  | 'guest_services'
  | 'quiet_space'
  | 'concessions'

export interface SupportPoint {
  id: string
  type: SupportType
  name: string
  description: string
  walk_time_minutes?: number
  map_x?: number
  map_y?: number
}

export type TransportMode = 'transit' | 'driving' | 'rideshare' | 'walking'
export type GroupType = 'solo' | 'couple' | 'family_young_kids' | 'family_teens' | 'large_group'
export type AccessibilityNeed =
  | 'wheelchair'
  | 'slow_pace'
  | 'stroller'
  | 'hearing'
  | 'visual'
  | 'sensory_sensitive'
  | 'first_time'
  | 'none'

/** When the fan wants to arrive relative to the event. */
export type ArrivalPreference = 'early' | 'on_time' | 'last_minute'

/** What matters most to this fan on event day. */
export type FanPriority = 'fastest_entry' | 'calmest_route' | 'closest_seat' | 'family_friendly'

/** What the fan is bringing through security. */
export type BringingItem = 'nothing' | 'small_bag' | 'large_bag' | 'medical_equipment'

/** How familiar the fan is with this venue. */
export type VenueExperience = 'first_time' | 'been_before' | 'regular'

export interface ReadinessPrefs {
  transport: TransportMode
  group: GroupType
  needs: AccessibilityNeed[]
  notes?: string
  /** When they want to arrive. Optional — added in expanded personalization. */
  arrival_preference?: ArrivalPreference
  /** What matters most to them. Optional. */
  priority?: FanPriority
  /** What they're bringing through security. Optional. */
  bringing?: BringingItem
  /** How well they know this venue. Optional. */
  venue_experience?: VenueExperience
  updated_at: string
}

export interface GateScoreComponents {
  section_proximity: number
  accessibility_match: number
  family_match: number
  sensory_match: number
  wait_penalty: number
  staff_signal: number
  fan_signal: number
}

export interface GateScoreBreakdown {
  gate_id: string
  gate_name: string
  components: GateScoreComponents
  total: number
  is_recommended: boolean
}

/**
 * Derived confidence object. Replaces the older binary high/medium/low
 * label as the load-bearing field; the string `confidence` remains on
 * ArrivalPlan for backward compatibility with existing UI and is now
 * derived from `confidence_breakdown.percent`.
 *
 * `hasConflict` is true when staff and fan reports disagree on the same
 * gate (e.g. staff says smooth, 3+ fans say busy). When true, the rule
 * engine takes a conservative posture and the Hub surfaces a banner.
 *
 * `isStale` is true when the newest signal for the recommended gate is
 * older than 60 minutes — the score still applies (filter is 2h), but
 * the UI should communicate freshness.
 */
export interface ConfidenceBreakdown {
  percent: number // 25..95, clamped
  reasons: string[]
  signalCount: number
  staffSignalCount: number
  fanSignalCount: number
  hasConflict: boolean
  isLimitedData: boolean
  isStale: boolean
  derivedAt: string // ISO timestamp
}

export interface ArrivalPlan {
  recommended_gate: Gate
  leave_by_time: string
  arrival_time: string
  route_summary: string
  confidence: 'high' | 'medium' | 'low'
  confidence_reason: string
  /** Rich confidence breakdown. Always populated. */
  confidence_breakdown: ConfidenceBreakdown
  explanation_text?: string
  support_points: SupportPoint[]
  gate_scores?: GateScoreBreakdown[]
}

export interface LiveSignal {
  id: string
  gate_id: string
  source: 'staff' | 'fan'
  sentiment: 'smooth' | 'moderate' | 'busy' | 'difficult'
  message: string
  created_at: string
}

export type IncidentStatus = 'open' | 'monitoring' | 'resolved'

export type IncidentType =
  | 'family_assistance'
  | 'long_line'
  | 'accessibility_question'
  | 'lost_ticket'
  | 'medical'
  | 'lost_person'
  | 'other'

export interface Incident {
  id: string
  type: IncidentType
  source: 'staff' | 'fan'
  gate_id: string
  status: IncidentStatus
  created_at: string
  updated_at: string
  note: string
  action?: string
}

/* ─────────────────────────────────────────────────────────────────────────
   Honest-source + confidence model
   ─────────────────────────────────────────────────────────────────────────

   FanFlow shows live-style guidance derived from a mix of staff signals,
   fan reports, ticket/venue context, and stylized demo data. Every surface
   that renders a "live" claim must label *where* that claim came from and
   how strongly we stand behind it. These types are the contract for
   <SourceChip> / <ConfidenceChip> so the label is identical wherever a
   given fact appears.

   Important rule from the product spec: ticket sales and seat capacity
   can estimate demand, but they do NOT prove live gate pressure. Live
   gate/parking/crowd state must come from `staff_verified`, `fan_reported`,
   or `simulated_demo` — never `official` unless explicitly modeled.
   ───────────────────────────────────────────────────────────────────── */

export type SourceType =
  | 'simulated_demo'
  | 'estimated'
  | 'fan_reported'
  | 'staff_verified'
  | 'official'

export type ConfidenceLevel = 'low' | 'moderate' | 'high' | 'verified'

/* ─────────────────────────────────────────────────────────────────────────
   Scene engine

   A SceneId names a coherent UI moment (parking, gate guidance, exit,
   etc.) so that background tone, motion accent, map focus, and copy
   tone stay aligned wherever a scene is rendered.
   ───────────────────────────────────────────────────────────────────── */

export type SceneId =
  | 'ticket_confirmed'
  | 'fanflow_unlocked'
  | 'personalization'
  | 'parking'
  | 'gate_guidance'
  | 'crowd_pulse'
  | 'restrooms'
  | 'accessibility'
  | 'support'
  | 'exit'

/* ─────────────────────────────────────────────────────────────────────────
   Structured message contract

   Used by the AI Message Service. Rules/data populate every field except
   the human-readable `body` — that's the only part an LLM is ever allowed
   to author. Keeps facts deterministic and language polished.
   ───────────────────────────────────────────────────────────────────── */

export type MessageTone =
  | 'celebration'
  | 'helpful'
  | 'awareness'
  | 'support'
  | 'official'

export type MessageSeverity = 'info' | 'notice' | 'warning'

export interface StructuredMessage {
  id: string
  title: string
  body: string
  tone: MessageTone
  severity: MessageSeverity
  source: SourceType
  confidence: ConfidenceLevel
  sourceLabel: string
  recommendedAction?: string
  expiresInMinutes?: number
  showMapFocus?: SceneId
  derivedAt: string
}

/* ─────────────────────────────────────────────────────────────────────────
   Parking

   ParkingStatus uses the traffic-light vocabulary the UI renders directly.
   `status_source` and `status_confidence` follow the same honest-labeling
   rule as live signals.
   ───────────────────────────────────────────────────────────────────── */

export type ParkingStatus = 'open' | 'filling' | 'limited' | 'full' | 'unknown'

export interface ParkingLot {
  id: string
  name: string
  status: ParkingStatus
  walk_time_to_gate_minutes: number
  recommended_gate_id: string
  capacity_label: string
  notes?: string
  map_x?: number
  map_y?: number
  status_source: SourceType
  status_confidence: ConfidenceLevel
  derivedAt: string
}
