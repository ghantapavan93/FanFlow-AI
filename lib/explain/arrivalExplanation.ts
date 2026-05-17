import { z } from 'zod'

export const ExplainRequestSchema = z.object({
  plan: z.object({
    recommended_gate: z.object({
      id: z.string(),
      name: z.string(),
      typical_wait_minutes: z.number().int().nonnegative(),
      accessibility: z.boolean(),
      family_friendly: z.boolean(),
      sections: z.array(z.string()),
    }),
    leave_by_time: z.string(),
    arrival_time: z.string(),
    route_summary: z.string(),
    confidence: z.enum(['high', 'medium', 'low']),
    confidence_reason: z.string(),
    support_points: z
      .array(
        z.object({
          id: z.string(),
          type: z.string(),
          name: z.string(),
        }),
      )
      .max(8),
  }),
  user: z.object({
    transport: z.enum(['transit', 'driving', 'rideshare', 'walking']).nullable(),
    group: z
      .enum(['solo', 'couple', 'family_young_kids', 'family_teens', 'large_group'])
      .nullable(),
    needs: z.array(z.string()).max(8),
    section: z.string(),
  }),
  event: z.object({
    name: z.string(),
    venue: z.string(),
  }),
  conditions: z.object({
    recent_staff_sentiment: z
      .enum(['smooth', 'moderate', 'busy', 'difficult'])
      .nullable(),
    recent_fan_signal_count: z.number().int().nonnegative(),
  }),
})

export type ExplainRequest = z.infer<typeof ExplainRequestSchema>

const SAFETY_NOTE = 'Follow venue signage and staff instructions.'

const BANNED_PATTERNS: { pattern: RegExp; replacement: string }[] = [
  { pattern: /\bguaranteed?\b/gi, replacement: 'recommended' },
  { pattern: /\bwill definitely\b/gi, replacement: 'is expected to' },
  { pattern: /\bdefinitely\b/gi, replacement: 'likely' },
  { pattern: /\bcertainly\b/gi, replacement: 'likely' },
  { pattern: /\b100% (sure|certain)\b/gi, replacement: 'confident' },
  { pattern: /\bno wait\b/gi, replacement: 'short wait' },
  { pattern: /\bzero wait\b/gi, replacement: 'short wait' },
  { pattern: /\bwill not\b/gi, replacement: 'is unlikely to' },
  { pattern: /\bsafe to (drink|take|consume)\b/gi, replacement: 'available' },
  { pattern: /\bemergency\b/gi, replacement: 'urgent issue' },
  { pattern: /\bmedical advice\b/gi, replacement: 'medical assistance on site' },
]

/**
 * Returns true if the text mentions a "Gate N" different from the recommended
 * gate. Used as a hallucination guardrail: if the LLM names the wrong gate,
 * the caller falls back to the deterministic template.
 *
 * Matches both numeric ("Gate 3") and written-out ("Gate three") forms, so
 * a model that spells out the number can't bypass the guard.
 */
const WORD_TO_DIGIT: Record<string, string> = {
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
}

function normalizeGateToken(token: string): string {
  const lower = token.toLowerCase().trim()
  if (/^\d+$/.test(lower)) return lower
  return WORD_TO_DIGIT[lower] ?? lower
}

export function mentionsWrongGate(text: string, recommendedGateName: string): boolean {
  const recMatch = recommendedGateName.match(/gate\s+(\d+)/i)
  if (!recMatch) return false
  const recNum = recMatch[1]

  // Capture either a digit or one of the spelled-out numbers zero..ten
  const pattern = /gate\s+(\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)/gi
  const found = text.match(pattern)
  if (!found) return false
  return found.some((m) => {
    const token = m.replace(/gate\s+/i, '').trim()
    return normalizeGateToken(token) !== recNum
  })
}

export function sanitizeExplanation(raw: string): string {
  let text = raw.trim()

  text = text.replace(/^["']|["']$/g, '')
  text = text.replace(/\s+/g, ' ')

  for (const { pattern, replacement } of BANNED_PATTERNS) {
    text = text.replace(pattern, replacement)
  }

  if (!text.toLowerCase().includes('venue signage') && !text.toLowerCase().includes('staff instructions')) {
    text = `${text.replace(/\s*$/, '')} ${SAFETY_NOTE}`.trim()
  }

  if (text.length > 450) {
    const slice = text.slice(0, 450)
    const lastPeriod = slice.lastIndexOf('.')
    text = lastPeriod > 200 ? slice.slice(0, lastPeriod + 1) : slice.trimEnd() + '…'
    if (
      !text.toLowerCase().includes('venue signage') &&
      !text.toLowerCase().includes('staff instructions')
    ) {
      const room = 450 - text.length - 1
      if (room >= SAFETY_NOTE.length + 1) {
        text = `${text} ${SAFETY_NOTE}`
      }
    }
  }

  return text.trim()
}

function describeTransport(t: ExplainRequest['user']['transport']): string {
  switch (t) {
    case 'transit':
      return 'public transit'
    case 'driving':
      return 'car'
    case 'rideshare':
      return 'rideshare'
    case 'walking':
      return 'foot'
    default:
      // NOTE: The template prepends "your " before this string, so this must
      // NOT start with "your". Previous bug: returned "your chosen route"
      // which produced "your your chosen route" in the rendered explanation.
      return 'chosen route'
  }
}

function describeGroup(g: ExplainRequest['user']['group']): string {
  switch (g) {
    case 'solo':
      return 'solo'
    case 'couple':
      return 'a small group of two'
    case 'family_young_kids':
      return 'young children'
    case 'family_teens':
      return 'older kids or teens'
    case 'large_group':
      return 'a larger group'
    default:
      return 'your group'
  }
}

function gateReasons(req: ExplainRequest): string[] {
  const reasons: string[] = []
  const { plan, user } = req
  const gate = plan.recommended_gate

  if (gate.sections.includes(user.section)) {
    reasons.push(`it is the closest entrance to Section ${user.section}`)
  }
  if (user.needs.includes('wheelchair') && gate.accessibility) {
    reasons.push('it has step-free accessible entry')
  }
  if (user.needs.includes('stroller') && gate.family_friendly) {
    reasons.push('it has stroller-friendly lanes')
  }
  if (
    (user.group === 'family_young_kids' || user.group === 'family_teens') &&
    gate.family_friendly
  ) {
    reasons.push('the family-friendly lane tends to move faster')
  }
  if (gate.typical_wait_minutes <= 6) {
    reasons.push(`typical wait is short (~${gate.typical_wait_minutes} min)`)
  }
  if (req.conditions.recent_staff_sentiment === 'smooth') {
    reasons.push('staff just reported smooth entry')
  }

  return reasons
}

export function buildTemplateExplanation(req: ExplainRequest): string {
  const { plan, user, conditions } = req
  const transport = describeTransport(user.transport)
  const group = describeGroup(user.group)
  const reasons = gateReasons(req)

  const reasonClause =
    reasons.length === 0
      ? 'based on current information'
      : reasons.length === 1
      ? `because ${reasons[0]}`
      : `because ${reasons.slice(0, -1).join(', ')}, and ${reasons[reasons.length - 1]}`

  const conditionClause =
    conditions.recent_staff_sentiment && conditions.recent_staff_sentiment !== 'smooth'
      ? ` Recent staff reports show ${conditions.recent_staff_sentiment} conditions — leave on time.`
      : ''

  const raw = `Based on current information, ${plan.recommended_gate.name} is recommended for your ${transport} arrival with ${group} — ${reasonClause}. Plan to leave by ${plan.leave_by_time} and arrive around ${plan.arrival_time}.${conditionClause} ${SAFETY_NOTE}`

  return sanitizeExplanation(raw)
}

export function buildLLMPrompt(req: ExplainRequest, template: string): {
  system: string
  user: string
} {
  const system = [
    'You rewrite arrival-plan explanations for sports fans in a warm, calm, plain-English tone.',
    'STRICT RULES:',
    '- Do not change the recommended gate, leave-by time, arrive-by time, support points, or confidence.',
    '- Do not invent venue facts, gate names, or wait times beyond what is provided.',
    '- Never say "guaranteed", "definitely", "100%", "will not", "no wait", "zero wait".',
    '- Use "recommended", "suggested", or "based on current information".',
    '- Never give medical or emergency advice. Direct people to staff or 911 for those.',
    '- Always end with or include: "Follow venue signage and staff instructions."',
    '- Output a single paragraph, plain text, under 450 characters. No markdown, no bullet points, no quotes.',
  ].join('\n')

  const user = [
    `Event: ${req.event.name} at ${req.event.venue}.`,
    `Ticket section: ${req.user.section}.`,
    `Transport: ${req.user.transport ?? 'unspecified'}.`,
    `Group: ${req.user.group ?? 'unspecified'}.`,
    `Needs: ${req.user.needs.length ? req.user.needs.join(', ') : 'none'}.`,
    `Recommended gate: ${req.plan.recommended_gate.name} (typical wait ~${req.plan.recommended_gate.typical_wait_minutes} min, accessibility: ${req.plan.recommended_gate.accessibility}, family-friendly: ${req.plan.recommended_gate.family_friendly}).`,
    `Leave by: ${req.plan.leave_by_time}. Arrive by: ${req.plan.arrival_time}. Route: ${req.plan.route_summary}.`,
    `Confidence: ${req.plan.confidence}.`,
    `Recent staff sentiment: ${req.conditions.recent_staff_sentiment ?? 'none'}. Fan signals in last window: ${req.conditions.recent_fan_signal_count}.`,
    '',
    'Here is the deterministic template explanation — rewrite it in a warmer, more human tone WITHOUT changing any facts:',
    '',
    template,
  ].join('\n')

  return { system, user }
}
