import type {
  ArrivalPlan,
  ConfidenceLevel,
  LiveSignal,
  SourceType,
  SupportPoint,
  SupportType,
} from './types'
import { demoVenue } from './seed'
import { getRecommendedLot } from './services/parkingService'

/* ─────────────────────────────────────────────────────────────────────────
   Ask FanFlow — a conversational answer derived DETERMINISTICALLY from the
   fan's plan. Not a chatbot, no LLM: a keyword router maps a question to a
   rules-derived answer (gate, parking, restroom, accessibility, crowd, exit).
   This is the "conversational companion" half of StubHub's discovery-on-AI
   story — answered honestly from real plan data, with a source label.
   ───────────────────────────────────────────────────────────────────────── */

export type AskTopic =
  | 'gate'
  | 'parking'
  | 'restroom'
  | 'accessibility'
  | 'family'
  | 'crowd'
  | 'timing'
  | 'exit'
  | 'support'
  | 'general'

export interface AskAnswer {
  topic: AskTopic
  answer: string
  source: SourceType
  confidence: ConfidenceLevel
}

function findSupport(plan: ArrivalPlan, ...types: SupportType[]): SupportPoint | undefined {
  for (const t of types) {
    const inPlan = plan.support_points.find((s) => s.type === t)
    if (inPlan) return inPlan
    const inAll = demoVenue.support_points.find((s) => s.type === t)
    if (inAll) return inAll
  }
  return undefined
}

export function answerFanQuestion(
  question: string,
  plan: ArrivalPlan,
  signals: LiveSignal[],
  gateLabel: string,
  now: number = Date.now(),
): AskAnswer {
  const q = question.toLowerCase()
  const has = (...words: string[]) => words.some((w) => q.includes(w))

  // Parking
  if (has('park', 'lot', 'garage', 'car', 'drive')) {
    const lot = getRecommendedLot(plan.recommended_gate.id)
    return {
      topic: 'parking',
      answer: lot
        ? `Head for ${lot.name.replace(' (Recommended)', '')} — about ${lot.walk_time_to_gate_minutes} min on foot to ${gateLabel}. Status is ${lot.status} (simulated demo).`
        : `Parking guidance opens on the Parking page, with a recommended lot and walk time.`,
      source: 'simulated_demo',
      confidence: 'moderate',
    }
  }

  // Restroom / facilities
  if (has('restroom', 'bathroom', 'toilet', 'washroom')) {
    const r = findSupport(plan, 'restroom', 'family_services')
    return {
      topic: 'restroom',
      answer: r
        ? `Closest is ${r.name}${r.walk_time_minutes ? ` — about ${r.walk_time_minutes} min from your seat` : ''}. Family and accessible options are on the Map's Restrooms layer.`
        : `Restrooms are marked on the Map's Restrooms layer, including family and accessible options.`,
      source: 'estimated',
      confidence: 'moderate',
    }
  }

  // Accessibility
  if (has('access', 'wheelchair', 'step-free', 'step free', 'elevator', 'lift')) {
    const a = findSupport(plan, 'accessibility', 'guest_services')
    return {
      topic: 'accessibility',
      answer: `${plan.recommended_gate.accessibility ? `${gateLabel} is step-free.` : 'Ask staff for the nearest step-free entrance.'} ${a ? `${a.name} can help with escorts and lifts${a.walk_time_minutes ? ` (~${a.walk_time_minutes} min)` : ''}.` : 'Guest Services can arrange an escort.'} The Map's Accessibility layer shows the step-free route.`,
      source: 'estimated',
      confidence: 'moderate',
    }
  }

  // Family
  if (has('family', 'kid', 'child', 'stroller', 'baby', 'nursing')) {
    const f = findSupport(plan, 'family_services')
    return {
      topic: 'family',
      answer: f
        ? `${f.name}${f.walk_time_minutes ? ` (~${f.walk_time_minutes} min)` : ''} has nursing, stroller storage, and a family meetup point.`
        : `Family Services offers nursing, stroller storage, and a meetup point — see the Map's Support layer.`,
      source: 'estimated',
      confidence: 'moderate',
    }
  }

  // Crowd / wait
  if (has('crowd', 'busy', 'wait', 'line', 'queue', 'packed')) {
    const recentStaff = signals.find(
      (s) =>
        s.source === 'staff' &&
        s.gate_id === plan.recommended_gate.id &&
        now - new Date(s.created_at).getTime() < 60 * 60 * 1000,
    )
    return {
      topic: 'crowd',
      answer: recentStaff
        ? `Latest staff word at ${gateLabel}: "${recentStaff.message}". Check the Conditions page for the live picture.`
        : `${gateLabel} is expected to flow normally. The Conditions and Pulse pages show live fan + staff signals.`,
      source: recentStaff ? 'staff_verified' : 'estimated',
      confidence: recentStaff ? 'verified' : 'low',
    }
  }

  // Timing
  if (has('leave', 'when', 'what time', 'arrive', 'early', 'late')) {
    return {
      topic: 'timing',
      answer: `Leave by ${plan.leave_by_time} and you'll arrive around ${plan.arrival_time} — tuned to your group and current signals.`,
      source: 'estimated',
      confidence: plan.confidence_breakdown.percent >= 75 ? 'high' : 'moderate',
    }
  }

  // Exit
  if (has('exit', 'leave after', 'get out', 'after the', 'go home', 'pickup', 'pick up')) {
    return {
      topic: 'exit',
      answer: `When the match ends, open ExitFlow — it maps your way back by how you arrived (car, rideshare, transit) and flags the heaviest egress window.`,
      source: 'estimated',
      confidence: 'moderate',
    }
  }

  // Support / help
  if (has('help', 'lost', 'support', 'medical', 'first aid', 'emergency', 'ticket issue')) {
    const aid = findSupport(plan, 'first_aid', 'guest_services')
    return {
      topic: 'support',
      answer: `For urgent issues, contact venue staff or call 911. For non-urgent help, ${aid ? aid.name : 'Guest Services'} is nearby — or tap Help for options mapped to your gate. FanFlow provides guidance, not emergency response.`,
      source: 'estimated',
      confidence: 'moderate',
    }
  }

  // Gate / general direction
  if (has('gate', 'enter', 'entrance', 'where', 'how do i get in', 'which way')) {
    return {
      topic: 'gate',
      answer: `Enter via ${gateLabel} — it's your best fit for Section ${plan.recommended_gate.sections[0] ?? 'your seat'}. Leave by ${plan.leave_by_time}.`,
      source: 'estimated',
      confidence: plan.confidence_breakdown.percent >= 75 ? 'high' : 'moderate',
    }
  }

  return {
    topic: 'general',
    answer: `I can help from your plan — try asking about your gate, parking, restrooms, accessibility, crowd levels, timing, or the exit.`,
    source: 'estimated',
    confidence: 'low',
  }
}
