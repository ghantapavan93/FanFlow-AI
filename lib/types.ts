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

export interface ReadinessPrefs {
  transport: TransportMode
  group: GroupType
  needs: AccessibilityNeed[]
  notes?: string
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

export interface ArrivalPlan {
  recommended_gate: Gate
  leave_by_time: string
  arrival_time: string
  route_summary: string
  confidence: 'high' | 'medium' | 'low'
  confidence_reason: string
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
