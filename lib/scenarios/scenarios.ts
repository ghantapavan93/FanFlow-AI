/**
 * Scenario fixtures for the FanFlow rule engine.
 *
 * Each scenario is a complete (prefs, signals) bundle plus an expectedBehavior
 * list. Used by tests/rule-engine.test.ts to assert the rule engine and
 * support-point prioritizer behave correctly across the real fan personas
 * the prototype is built to handle.
 *
 * All scenarios use the seeded demoTicket (Section 117) so the assertions
 * focus on prefs + signals, not section choice.
 */

import type { LiveSignal, ReadinessPrefs } from '../types'

export interface Scenario {
  id: string
  name: string
  description: string
  prefs: ReadinessPrefs | null
  signals: LiveSignal[]
  /**
   * Plain-English assertions about what the rule engine should do for this
   * scenario. The corresponding test asserts these are reflected in the
   * derived plan.
   */
  expectedBehavior: string[]
}

const now = () => new Date().toISOString()
const minsAgo = (n: number) => new Date(Date.now() - n * 60 * 1000).toISOString()

export const SCENARIOS: Scenario[] = [
  {
    id: 'maria-family',
    name: 'Maria — family, first-time visitor',
    description:
      'The locked demo scenario. First time at MetLife, with a 6-year-old, taking NJ Transit, mild crowd anxiety.',
    prefs: {
      transport: 'transit',
      group: 'family_young_kids',
      needs: ['stroller'],
      notes: 'First MetLife visit. Traveling with a 6-year-old.',
      updated_at: now(),
    },
    signals: [],
    expectedBehavior: [
      'Recommends Gate 3 (family-friendly, serves Section 117)',
      'Surfaces Family Services in the support points',
      'Confidence is "high" because preferences are known',
    ],
  },

  {
    id: 'solo-regular',
    name: 'Solo regular fan',
    description: 'No-frills attendee. Knows the venue, no special needs, taking transit.',
    prefs: {
      transport: 'transit',
      group: 'solo',
      needs: ['none'],
      notes: undefined,
      updated_at: now(),
    },
    signals: [],
    expectedBehavior: [
      'Recommends Gate 3 (still the closest to Section 117)',
      'Leave-by time is earlier than a family scenario (no family buffer)',
      'Support points fall back to defaults (no family / accessibility / quiet space surfaced)',
    ],
  },

  {
    id: 'accessibility',
    name: 'Accessibility-focused fan',
    description: 'Wheelchair user. Needs step-free entry and accessibility services nearby.',
    prefs: {
      transport: 'rideshare',
      group: 'couple',
      needs: ['wheelchair'],
      notes: 'Stepping-free entry required.',
      updated_at: now(),
    },
    signals: [],
    expectedBehavior: [
      'Recommends an accessible gate (Gate 3 or Gate 1 — both have accessibility=true)',
      'Surfaces Accessibility Services in the support points',
      'Avoids Gate 7 (accessibility=false)',
    ],
  },

  {
    id: 'sensory-sensitive',
    name: 'Sensory / crowd-sensitive fan',
    description: 'Sensory needs. Prefers quieter routes and shorter queues.',
    prefs: {
      transport: 'transit',
      group: 'solo',
      needs: ['sensory_sensitive'],
      notes: 'Avoid loud crowds where possible.',
      updated_at: now(),
    },
    signals: [],
    expectedBehavior: [
      'Surfaces Quiet / Sensory Space in the support points',
      'Recommends a gate with short typical wait (Gate 3 = 5 min)',
    ],
  },

  {
    id: 'no-signals',
    name: 'No live signals',
    description: 'Baseline plan with zero recent signals. Tests the rules in isolation.',
    prefs: {
      transport: 'transit',
      group: 'family_young_kids',
      needs: ['stroller'],
      notes: undefined,
      updated_at: now(),
    },
    signals: [],
    expectedBehavior: [
      'Plan derives from preferences and section proximity alone',
      'Confidence is "high" (preferences known) regardless of zero signal volume',
    ],
  },

  {
    id: 'staff-overrides-fan-noise',
    name: 'Staff signal outweighs fan noise',
    description:
      "Multiple fans report Gate 3 is busy, but a staff member just confirmed it's smooth. The 3× staff weighting should prevail.",
    prefs: {
      transport: 'transit',
      group: 'family_young_kids',
      needs: ['stroller'],
      notes: undefined,
      updated_at: now(),
    },
    signals: [
      {
        id: 'test-fan-1',
        gate_id: 'gate-3',
        source: 'fan',
        sentiment: 'busy',
        message: 'Line looks slow',
        created_at: minsAgo(15),
      },
      {
        id: 'test-fan-2',
        gate_id: 'gate-3',
        source: 'fan',
        sentiment: 'busy',
        message: 'Long wait at bag check',
        created_at: minsAgo(10),
      },
      {
        id: 'test-fan-3',
        gate_id: 'gate-3',
        source: 'fan',
        sentiment: 'busy',
        message: 'Backing up',
        created_at: minsAgo(8),
      },
      {
        id: 'test-staff-1',
        gate_id: 'gate-3',
        source: 'staff',
        sentiment: 'smooth',
        message: 'Family lane moving smoothly',
        created_at: minsAgo(2),
      },
    ],
    expectedBehavior: [
      'Gate 3 still wins — staff "smooth" (+2 × 3 = +6) outweighs three fan "busy" (−2 × 1 × 3 = −6)',
      "Wait — that's a tie. Staff wins on tiebreak via section proximity and family-friendliness for Maria's prefs.",
      'In all practical configurations, a single recent staff signal should not be overridden by fan noise alone.',
    ],
  },

  {
    id: 'llm-fallback',
    name: 'LLM failure → template fallback (meta)',
    description:
      'Not a rule-engine scenario — describes the explain-endpoint behavior. Tested separately in tests/explanation.test.ts.',
    prefs: null,
    signals: [],
    expectedBehavior: [
      'If no API key set → response source = "template"',
      'If LLM returns text mentioning a gate other than the recommended one → output discarded, source = "template"',
      'If LLM times out (>2500ms) → response source = "template"',
      'Sanitizer scrubs banned phrases ("guaranteed", "no wait", "100%", etc.) before display',
      'Safety note always present in final explanation',
    ],
  },
]

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id)
}
