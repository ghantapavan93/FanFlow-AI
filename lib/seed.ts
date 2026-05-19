import type {
  Event,
  Venue,
  Gate,
  Ticket,
  LiveSignal,
  ReadinessPrefs,
  ArrivalPlan,
  Incident,
  GateScoreBreakdown,
  GateScoreComponents,
} from './types'

// Event date: 6 days from "now" pinned to 7:00 PM local time so the
// derived "Leave by" / "Arrive at" / "Kickoff" times land on realistic
// evening values (e.g. 4:25 PM / 5:30 PM / 7:00 PM) instead of inheriting
// whatever wall-clock minute the dev server happened to boot at.
// Previously this used Date.now() + 6 days raw, which produced times
// like "Leave by 12:57 AM, Kickoff 03:32 AM" when the server started
// in the middle of the night — useful for nobody.
const eventDate = (() => {
  const d = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)
  d.setHours(19, 0, 0, 0)
  return d.toISOString()
})()

export const demoEvent: Event = {
  id: 'wc2026-final',
  name: 'FIFA World Cup 2026 Final',
  date: eventDate,
  image_url:
    'https://images.unsplash.com/photo-1579954614171-fd3900acfc42?w=1200&h=630&fit=crop',
  venue_id: 'metlife-stadium',
}

export const demoVenue: Venue = {
  id: 'metlife-stadium',
  name: 'MetLife Stadium',
  gates: [
    {
      id: 'gate-3',
      name: 'Gate 3 (Budweiser Plaza)',
      sections: ['117', '118', '119', '217', '218'],
      accessibility: true,
      family_friendly: true,
      typical_wait_minutes: 5,
      map_x: 260,
      map_y: 90,
    },
    {
      id: 'gate-1',
      name: 'Gate 1 (MetLife Gate)',
      sections: ['101', '102', '103', '201', '202'],
      accessibility: true,
      family_friendly: false,
      typical_wait_minutes: 12,
      map_x: 90,
      map_y: 210,
    },
    {
      id: 'gate-7',
      name: 'Gate 7 (Toyota Gate)',
      sections: ['139', '140', '141', '239', '240'],
      accessibility: false,
      family_friendly: true,
      typical_wait_minutes: 8,
      map_x: 430,
      map_y: 210,
    },
  ],
  support_points: [
    {
      id: 'sp-1',
      type: 'first_aid',
      name: 'First Aid Station',
      description: 'Medical assistance available',
      walk_time_minutes: 3,
      map_x: 230,
      map_y: 175,
    },
    {
      id: 'sp-2',
      type: 'family_services',
      name: 'Family Services',
      description: 'Nursing, stroller storage, family meetup',
      walk_time_minutes: 2,
      map_x: 290,
      map_y: 175,
    },
    {
      id: 'sp-3',
      type: 'accessibility',
      name: 'Accessibility Services',
      description: 'Wheelchair escorts, hearing assistance',
      walk_time_minutes: 1,
      map_x: 200,
      map_y: 245,
    },
    {
      id: 'sp-4',
      type: 'restroom',
      name: 'Family Restroom',
      description: 'Changing tables, accessible stalls',
      walk_time_minutes: 4,
      map_x: 320,
      map_y: 245,
    },
    {
      id: 'sp-5',
      type: 'guest_services',
      name: 'Guest Services',
      description: 'Ticket issues, lost items, assistance',
      walk_time_minutes: 5,
      map_x: 360,
      map_y: 145,
    },
    {
      id: 'sp-6',
      type: 'quiet_space',
      name: 'Quiet / Sensory Space',
      description: 'Low-stimulation room for sensory breaks',
      walk_time_minutes: 4,
      map_x: 170,
      map_y: 145,
    },
  ],
}

export const demoTicket: Ticket = {
  id: 'tk-maria-001',
  section: '117',
  row: '12',
  seat: '4',
}

export const demoLiveSignals: LiveSignal[] = [
  {
    id: 'sig-1',
    gate_id: 'gate-3',
    source: 'staff',
    sentiment: 'smooth',
    message: 'Family entrance clear, moving smoothly',
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: 'sig-2',
    gate_id: 'gate-1',
    source: 'fan',
    sentiment: 'busy',
    message: 'Long line for bag check',
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: 'sig-3',
    gate_id: 'gate-7',
    source: 'fan',
    sentiment: 'smooth',
    message: 'Moving fast!',
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
]

export const demoIncidents: Incident[] = [
  {
    id: 'inc-1',
    type: 'family_assistance',
    source: 'fan',
    gate_id: 'gate-3',
    status: 'open',
    created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    note: 'Family with young child needs assistance near Gate 3 entrance.',
  },
  {
    id: 'inc-2',
    type: 'long_line',
    source: 'staff',
    gate_id: 'gate-1',
    status: 'monitoring',
    created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    note: 'Bag check line backing up at Gate 1.',
    action: 'Second bag scanner opened; line moving.',
  },
  {
    id: 'inc-3',
    type: 'accessibility_question',
    source: 'fan',
    gate_id: 'gate-3',
    status: 'open',
    created_at: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    note: 'Guest near Section 117 asking for step-free route to seats.',
  },
]

const SENTIMENT_SCORE: Record<LiveSignal['sentiment'], number> = {
  smooth: 2,
  moderate: 0,
  busy: -2,
  difficult: -4,
}

function transportBufferMinutes(mode: ReadinessPrefs['transport']): number {
  switch (mode) {
    case 'transit':
      return 45
    case 'driving':
      return 60
    case 'rideshare':
      return 35
    case 'walking':
      return 25
  }
}

function groupBufferMinutes(group: ReadinessPrefs['group']): number {
  switch (group) {
    case 'solo':
      return 0
    case 'couple':
      return 5
    case 'family_young_kids':
      return 20
    case 'family_teens':
      return 10
    case 'large_group':
      return 15
  }
}

function transitSummary(mode: ReadinessPrefs['transport'], gateName: string): string {
  switch (mode) {
    case 'transit':
      return `NJ Transit to Meadowlands Rail Station → 8 min walk to ${gateName}`
    case 'driving':
      return `Drive to MetLife Lot K → 12 min walk to ${gateName}`
    case 'rideshare':
      return `Rideshare drop-off at MetLife East Lot → 6 min walk to ${gateName}`
    case 'walking':
      return `Local walk-up → arrive directly at ${gateName}`
  }
}

function sectionProximityScore(gateSections: string[], ticketSection: string): number {
  if (gateSections.includes(ticketSection)) return 10
  const target = parseInt(ticketSection, 10)
  if (Number.isNaN(target)) return 0
  let minDist = Infinity
  for (const s of gateSections) {
    const n = parseInt(s, 10)
    if (Number.isNaN(n)) continue
    minDist = Math.min(minDist, Math.abs(n - target))
  }
  if (minDist <= 10) return 6
  if (minDist <= 20) return 3
  return 0
}

function scoreGateBreakdown(
  gate: Gate,
  ticket: Ticket,
  prefs: ReadinessPrefs | null,
  signals: LiveSignal[],
): { components: GateScoreComponents; total: number } {
  const components: GateScoreComponents = {
    section_proximity: 0,
    accessibility_match: 0,
    family_match: 0,
    sensory_match: 0,
    wait_penalty: 0,
    staff_signal: 0,
    fan_signal: 0,
  }

  components.section_proximity = sectionProximityScore(gate.sections, ticket.section)

  if (prefs) {
    if (prefs.needs.includes('wheelchair') && gate.accessibility) {
      components.accessibility_match += 6
    }
    // slow_pace covers pregnancy / post-surgery / cane / older adult — anyone
    // who prefers a shorter walk without needing full step-free routing.
    // Lower weight than wheelchair (+3 vs +6) and additionally prefers gates
    // with shorter typical waits so they don't stand in long lines.
    if (prefs.needs.includes('slow_pace')) {
      if (gate.accessibility) components.accessibility_match += 3
      if (gate.typical_wait_minutes <= 8) components.accessibility_match += 1
    }
    if (prefs.needs.includes('stroller') && gate.family_friendly) {
      components.family_match += 4
    }
    if (
      (prefs.group === 'family_young_kids' || prefs.group === 'family_teens') &&
      gate.family_friendly
    ) {
      components.family_match += 3
    }
    if (prefs.needs.includes('sensory_sensitive') && gate.typical_wait_minutes <= 6) {
      components.sensory_match += 2
    }
    // first_time intentionally does NOT modify scoring — it surfaces an
    // orientation card on the Hub instead. Keeps the rule engine free of
    // soft UX flags.
  }

  components.wait_penalty = -gate.typical_wait_minutes / 3

  const recent = signals.filter(
    (s) =>
      s.gate_id === gate.id &&
      Date.now() - new Date(s.created_at).getTime() < 2 * 60 * 60 * 1000,
  )

  // Staff signals: applied individually with 3× weight. Each verified
  // staff update from this gate moves the score directly.
  for (const s of recent) {
    if (s.source === 'staff') {
      components.staff_signal += SENTIMENT_SCORE[s.sentiment] * 3
    }
  }

  // Fan signals: threshold-based aggregation. One fan vote does NOT
  // change the plan — production trust model. We require ≥ 3 recent
  // fan reports at this gate; only then does the MAJORITY sentiment
  // contribute (once, not per-signal). Staff still always dominates
  // because their per-signal weight is 3× and applied for every staff
  // update.
  const fanReports = recent.filter((s) => s.source === 'fan')
  if (fanReports.length >= 3) {
    const counts: Record<LiveSignal['sentiment'], number> = {
      smooth: 0,
      moderate: 0,
      busy: 0,
      difficult: 0,
    }
    for (const s of fanReports) counts[s.sentiment] += 1
    let majority: LiveSignal['sentiment'] = 'moderate'
    let max = -1
    for (const key of Object.keys(counts) as LiveSignal['sentiment'][]) {
      if (counts[key] > max) {
        max = counts[key]
        majority = key
      }
    }
    components.fan_signal = SENTIMENT_SCORE[majority] * 1
  }

  const total =
    components.section_proximity +
    components.accessibility_match +
    components.family_match +
    components.sensory_match +
    components.wait_penalty +
    components.staff_signal +
    components.fan_signal

  return { components, total }
}

function scoreGate(
  gate: Gate,
  ticket: Ticket,
  prefs: ReadinessPrefs | null,
  signals: LiveSignal[],
): number {
  return scoreGateBreakdown(gate, ticket, prefs, signals).total
}

function buildExplanation(
  gate: Gate,
  prefs: ReadinessPrefs | null,
  ticket: Ticket,
): string {
  if (!prefs) {
    return `${gate.name} is the closest entrance to Section ${ticket.section}. Personalize your plan to tailor times to your group and transport.`
  }

  const parts: string[] = []
  if (gate.sections.includes(ticket.section)) {
    parts.push(`closest entrance to Section ${ticket.section}`)
  }
  if (prefs.needs.includes('wheelchair') && gate.accessibility) {
    parts.push('step-free accessible entry')
  }
  if (
    prefs.needs.includes('slow_pace') &&
    !prefs.needs.includes('wheelchair') &&
    gate.accessibility
  ) {
    parts.push('shorter walk preferred')
  }
  if (prefs.needs.includes('stroller') && gate.family_friendly) {
    parts.push('stroller-friendly lanes')
  }
  if (
    (prefs.group === 'family_young_kids' || prefs.group === 'family_teens') &&
    gate.family_friendly
  ) {
    parts.push('family-friendly entry with shorter queues')
  }
  if (gate.typical_wait_minutes <= 6) {
    parts.push(`fast typical wait (~${gate.typical_wait_minutes} min)`)
  }

  const reasonList = parts.length ? parts.join(', ') : 'a balanced fit for your needs'
  return `Because you're arriving by ${prefs.transport} with ${describeGroup(prefs.group)}, ${gate.name} is recommended — ${reasonList}.`
}

function describeGroup(group: ReadinessPrefs['group']): string {
  switch (group) {
    case 'solo':
      return 'solo entry'
    case 'couple':
      return 'a small group of 2'
    case 'family_young_kids':
      return 'young children'
    case 'family_teens':
      return 'older kids or teens'
    case 'large_group':
      return 'a larger group'
  }
}

/**
 * Locale-independent time formatter.
 *
 * Avoids `toLocaleTimeString` because it produces different output between
 * Node (server) and the browser depending on the system locale — e.g.
 * "07:55 pm" on one and "07:55 PM" on the other, which causes a Next.js
 * hydration mismatch error during SSR.
 *
 * Always returns "HH:MM AM" or "HH:MM PM" with uppercase meridiem.
 */
function fmtTime(d: Date): string {
  let hours = d.getHours()
  const minutes = d.getMinutes().toString().padStart(2, '0')
  const meridiem = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  if (hours === 0) hours = 12
  return `${hours.toString().padStart(2, '0')}:${minutes} ${meridiem}`
}

export function deriveArrivalPlan(
  prefs: ReadinessPrefs | null = null,
  signals: LiveSignal[] = demoLiveSignals,
): ArrivalPlan {
  const eventDate = new Date(demoEvent.date)
  const doorsOpen = new Date(eventDate.getTime() - 2 * 60 * 60 * 1000)
  const targetArrival = new Date(doorsOpen.getTime() + 30 * 60 * 1000)

  const transportBuf = transportBufferMinutes(prefs?.transport ?? 'transit')
  const groupBuf = groupBufferMinutes(prefs?.group ?? 'family_young_kids')
  const leaveBy = new Date(
    targetArrival.getTime() - (transportBuf + groupBuf) * 60 * 1000,
  )

  const ranked = [...demoVenue.gates]
    .map((g) => {
      const { components, total } = scoreGateBreakdown(g, demoTicket, prefs, signals)
      return { gate: g, components, total }
    })
    .sort((a, b) => b.total - a.total)

  const recommendedGate = ranked[0].gate

  const gate_scores: GateScoreBreakdown[] = ranked.map((r) => ({
    gate_id: r.gate.id,
    gate_name: r.gate.name,
    components: r.components,
    total: r.total,
    is_recommended: r.gate.id === recommendedGate.id,
  }))

  const supportPoints = (() => {
    const all = demoVenue.support_points
    if (!prefs) return all.slice(0, 3)
    const prioritized: typeof all = []
    if (prefs.needs.includes('wheelchair') || prefs.needs.includes('hearing') || prefs.needs.includes('visual')) {
      const sp = all.find((s) => s.type === 'accessibility')
      if (sp) prioritized.push(sp)
    }
    if (prefs.group === 'family_young_kids' || prefs.needs.includes('stroller')) {
      const sp = all.find((s) => s.type === 'family_services')
      if (sp) prioritized.push(sp)
    }
    if (prefs.needs.includes('sensory_sensitive')) {
      const sp = all.find((s) => s.type === 'quiet_space')
      if (sp && !prioritized.includes(sp)) prioritized.push(sp)
    }
    const firstAid = all.find((s) => s.type === 'first_aid')
    if (firstAid && !prioritized.includes(firstAid)) prioritized.push(firstAid)
    for (const sp of all) {
      if (prioritized.length >= 3) break
      if (!prioritized.includes(sp)) prioritized.push(sp)
    }
    return prioritized.slice(0, 3)
  })()

  // === Derived confidence breakdown ====================================
  // Compute a numeric percent from real inputs: signal counts, recency,
  // staff/fan mix, conflict, prefs presence. The string `confidence`
  // label is mapped from the percent so older UI keeps working.
  const recommendedSignals = signals.filter(
    (s) =>
      s.gate_id === recommendedGate.id &&
      Date.now() - new Date(s.created_at).getTime() < 2 * 60 * 60 * 1000,
  )
  const staffSignals = recommendedSignals.filter((s) => s.source === 'staff')
  const fanSignals = recommendedSignals.filter((s) => s.source === 'fan')

  // Conflict: latest staff says one thing, fan majority says the opposite
  const detectConflict = (): boolean => {
    if (staffSignals.length === 0 || fanSignals.length < 3) return false
    const staffLatest = [...staffSignals].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0]
    const fanCounts: Record<LiveSignal['sentiment'], number> = {
      smooth: 0,
      moderate: 0,
      busy: 0,
      difficult: 0,
    }
    for (const s of fanSignals) fanCounts[s.sentiment] += 1
    let majority: LiveSignal['sentiment'] = 'moderate'
    let max = -1
    for (const k of Object.keys(fanCounts) as LiveSignal['sentiment'][]) {
      if (fanCounts[k] > max) {
        max = fanCounts[k]
        majority = k
      }
    }
    const positive = (s: LiveSignal['sentiment']) =>
      s === 'smooth' || s === 'moderate'
    return positive(staffLatest.sentiment) !== positive(majority)
  }
  const hasConflict = detectConflict()

  // Stale: newest signal for this gate is > 60 min old
  const isStale = (() => {
    if (recommendedSignals.length === 0) return false
    const newest = recommendedSignals.reduce((acc, s) =>
      new Date(s.created_at).getTime() > new Date(acc.created_at).getTime() ? s : acc,
    )
    return Date.now() - new Date(newest.created_at).getTime() > 60 * 60 * 1000
  })()

  const isLimitedData = staffSignals.length === 0 && fanSignals.length < 3

  // Build the percent
  const reasons: string[] = []
  let percent = prefs ? 72 : 60
  if (prefs) reasons.push('Personalized to your group and route')
  else reasons.push('Baseline plan from ticket and venue context')

  if (staffSignals.length > 0) {
    percent += Math.min(15, staffSignals.length * 5)
    reasons.push(
      staffSignals.length === 1
        ? '1 recent staff update applied (weighted 3×)'
        : `${staffSignals.length} recent staff updates applied (weighted 3×)`,
    )
  }
  if (fanSignals.length >= 3) {
    percent += 5
    reasons.push(`${fanSignals.length} fan reports aggregated`)
  } else if (fanSignals.length > 0) {
    reasons.push(
      `${fanSignals.length} fan report${fanSignals.length === 1 ? '' : 's'} (below threshold — not affecting plan)`,
    )
  }
  if (isStale) {
    percent -= 10
    reasons.push('No recent staff update — showing baseline venue guidance')
  }
  if (hasConflict) {
    percent -= 10
    reasons.push('Mixed reports detected — keeping recommendation conservative')
  }
  if (isLimitedData && !isStale) {
    percent -= 5
    reasons.push('Limited live data — leaning on venue baseline')
  }

  percent = Math.max(25, Math.min(95, percent))

  const confidence: ArrivalPlan['confidence'] =
    percent >= 75 ? 'high' : percent >= 55 ? 'medium' : 'low'
  const confidence_reason =
    reasons[0] ??
    (prefs
      ? 'Based on your preferences, official venue data, and recent staff confirmation'
      : 'Based on venue layout and ticket section — personalize to raise confidence')

  const confidence_breakdown = {
    percent,
    reasons,
    signalCount: recommendedSignals.length,
    staffSignalCount: staffSignals.length,
    fanSignalCount: fanSignals.length,
    hasConflict,
    isLimitedData,
    isStale,
    derivedAt: new Date().toISOString(),
  }

  return {
    recommended_gate: recommendedGate,
    leave_by_time: fmtTime(leaveBy),
    arrival_time: fmtTime(targetArrival),
    route_summary: transitSummary(prefs?.transport ?? 'transit', recommendedGate.name),
    confidence,
    confidence_reason,
    confidence_breakdown,
    explanation_text: buildExplanation(recommendedGate, prefs, demoTicket),
    support_points: supportPoints,
    gate_scores,
  }
}

/**
 * Same function as deriveArrivalPlan — exported under a debug-friendly name
 * so call sites that want the score breakdown read self-documentingly.
 *
 *   const { gate_scores, ...plan } = deriveArrivalPlanWithDebug(prefs, signals)
 *
 * The breakdown is always populated; the alias just makes the intent explicit.
 */
export const deriveArrivalPlanWithDebug = deriveArrivalPlan
