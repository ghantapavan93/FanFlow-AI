/* ─────────────────────────────────────────────────────────────────────────
   Alert Service — converts rules/data into a StructuredMessage that any
   UI surface (Hub smart alert, Pulse card, Conditions banner) can render
   identically.

   This is the contract for "AI explains, rules decide": every field
   here is filled by deterministic code. An LLM is only ever allowed to
   author the `body` string downstream — and only when the caller chooses
   to flow this message through the AI Message Service. See Phase B's
   HubAISummary for an example.
   ───────────────────────────────────────────────────────────────────── */

import type {
  ConfidenceLevel,
  MessageSeverity,
  MessageTone,
  SceneId,
  SourceType,
  StructuredMessage,
} from '../types'
import { SOURCE_TONES } from '../sources'

interface BuildMessageInput {
  id: string
  title: string
  body: string
  tone: MessageTone
  severity?: MessageSeverity
  source: SourceType
  confidence: ConfidenceLevel
  recommendedAction?: string
  expiresInMinutes?: number
  showMapFocus?: SceneId
}

/**
 * Route a free-text operational message to the map layer (scene) it should
 * highlight on the fan side. Rules decide the focus from keywords — the same
 * deterministic-first principle as the rest of FanFlow. Defaults to the
 * crowd layer when nothing more specific matches.
 */
export function inferMapFocus(text: string): SceneId {
  const t = text.toLowerCase()
  if (/\b(park|lot|garage)/.test(t)) return 'parking'
  if (/\b(bag|gate|line|entry|entrance)/.test(t)) return 'gate_guidance'
  if (/\b(access|step-free|wheelchair|elevator)/.test(t)) return 'accessibility'
  if (/\b(restroom|toilet|family room)/.test(t)) return 'restrooms'
  return 'crowd_pulse'
}

export function buildMessage(input: BuildMessageInput): StructuredMessage {
  return {
    id: input.id,
    title: input.title,
    body: input.body,
    tone: input.tone,
    severity: input.severity ?? 'info',
    source: input.source,
    confidence: input.confidence,
    sourceLabel: SOURCE_TONES[input.source].label,
    recommendedAction: input.recommendedAction,
    expiresInMinutes: input.expiresInMinutes,
    showMapFocus: input.showMapFocus,
    derivedAt: new Date().toISOString(),
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   Convenience builder for a staff-verified alert — the one shape with a live
   caller today (the Staff Console "fans will see" preview). Pre-fills
   source/tone/severity so the call site stays readable. Add sibling builders
   (fan-reported, simulated-demo, celebration) here when a real caller needs
   them — the buildMessage primitive above already supports every source.
   ───────────────────────────────────────────────────────────────────── */

export function staffVerifiedAlert(args: {
  id: string
  title: string
  body: string
  recommendedAction?: string
  expiresInMinutes?: number
  showMapFocus?: SceneId
}): StructuredMessage {
  return buildMessage({
    ...args,
    tone: 'awareness',
    severity: 'notice',
    source: 'staff_verified',
    confidence: 'verified',
  })
}
