/**
 * Explanation endpoint guardrail tests.
 *
 * Covers the sanitizer + the gate-mismatch fallback guard. The endpoint itself
 * isn't HTTP-tested (would need a server); we test the pure functions that
 * make the endpoint's safety guarantees real.
 */

import { describe, expect, it } from 'vitest'
import {
  buildTemplateExplanation,
  mentionsWrongGate,
  sanitizeExplanation,
  type ExplainRequest,
} from '@/lib/explain/arrivalExplanation'

const baseReq: ExplainRequest = {
  plan: {
    recommended_gate: {
      id: 'gate-3',
      name: 'Gate 3 (Budweiser Plaza)',
      typical_wait_minutes: 5,
      accessibility: true,
      family_friendly: true,
      sections: ['117', '118'],
    },
    leave_by_time: '11:39 PM',
    arrival_time: '12:24 AM',
    route_summary: 'NJ Transit → 8 min walk to Gate 3',
    confidence: 'high',
    confidence_reason: 'Based on preferences and recent signals',
    support_points: [
      { id: 'sp-2', type: 'family_services', name: 'Family Services' },
    ],
  },
  user: {
    transport: 'transit',
    group: 'family_young_kids',
    needs: ['stroller'],
    section: '117',
  },
  event: { name: 'FIFA World Cup 2026 Final', venue: 'MetLife Stadium' },
  conditions: { recent_staff_sentiment: 'smooth', recent_fan_signal_count: 0 },
}

describe('sanitizeExplanation', () => {
  it('replaces banned phrases', () => {
    const raw =
      'Gate 3 is guaranteed to have no wait. You will definitely get through 100% sure.'
    const out = sanitizeExplanation(raw)
    expect(out.toLowerCase()).not.toContain('guaranteed')
    expect(out.toLowerCase()).not.toContain('no wait')
    expect(out.toLowerCase()).not.toContain('definitely')
    expect(out.toLowerCase()).not.toContain('100%')
  })

  it('appends the safety note if missing', () => {
    const raw = 'Gate 3 is recommended for your family.'
    const out = sanitizeExplanation(raw)
    expect(out.toLowerCase()).toMatch(/venue signage|staff instructions/)
  })

  it('preserves the safety note if already present', () => {
    const raw =
      'Gate 3 is recommended. Follow venue signage and staff instructions.'
    const out = sanitizeExplanation(raw)
    const occurrences = (out.toLowerCase().match(/staff instructions/g) || []).length
    expect(occurrences).toBe(1)
  })

  it('hard-caps output at 450 characters', () => {
    const raw = 'Recommended. '.repeat(60) // ~780 chars
    const out = sanitizeExplanation(raw)
    expect(out.length).toBeLessThanOrEqual(450)
  })

  it('strips surrounding quotes', () => {
    const raw = '"Gate 3 is recommended for your family."'
    const out = sanitizeExplanation(raw)
    expect(out.startsWith('"')).toBe(false)
    expect(out.endsWith('"')).toBe(false)
  })

  it('redirects emergency / medical-advice phrasing', () => {
    const raw =
      'For any emergency, follow this medical advice and call the front desk.'
    const out = sanitizeExplanation(raw)
    expect(out.toLowerCase()).not.toContain('emergency')
    expect(out.toLowerCase()).not.toContain('medical advice')
  })
})

describe('mentionsWrongGate', () => {
  it('returns false when only the recommended gate is mentioned', () => {
    const text =
      'Gate 3 is recommended because it serves your section. Follow venue signage and staff instructions.'
    expect(mentionsWrongGate(text, 'Gate 3 (Budweiser Plaza)')).toBe(false)
  })

  it('returns true when a different gate is mentioned', () => {
    const text =
      'Gate 1 is recommended because it serves your section. Follow venue signage and staff instructions.'
    expect(mentionsWrongGate(text, 'Gate 3 (Budweiser Plaza)')).toBe(true)
  })

  it('returns true when both the recommended and a wrong gate are mentioned', () => {
    const text =
      'Gate 3 is recommended, but Gate 7 may be faster. Follow venue signage and staff instructions.'
    expect(mentionsWrongGate(text, 'Gate 3 (Budweiser Plaza)')).toBe(true)
  })

  it('is case-insensitive', () => {
    const text = 'gate 1 is closer.'
    expect(mentionsWrongGate(text, 'Gate 3 (Budweiser Plaza)')).toBe(true)
  })

  it('returns false for text with no gate references', () => {
    const text = 'Leave early. Follow venue signage and staff instructions.'
    expect(mentionsWrongGate(text, 'Gate 3 (Budweiser Plaza)')).toBe(false)
  })
})

describe('buildTemplateExplanation', () => {
  it('always includes the recommended gate name', () => {
    const out = buildTemplateExplanation(baseReq)
    expect(out).toContain('Gate 3')
  })

  it('always ends with or contains the safety note', () => {
    const out = buildTemplateExplanation(baseReq)
    expect(out.toLowerCase()).toMatch(/venue signage|staff instructions/)
  })

  it('respects the 450-char cap', () => {
    const out = buildTemplateExplanation(baseReq)
    expect(out.length).toBeLessThanOrEqual(450)
  })

  it('mentions leave-by and arrive-by times', () => {
    const out = buildTemplateExplanation(baseReq)
    expect(out).toContain('11:39 PM')
    expect(out).toContain('12:24 AM')
  })

  it('does not contain banned phrases out of the box', () => {
    const out = buildTemplateExplanation(baseReq).toLowerCase()
    expect(out).not.toContain('guaranteed')
    expect(out).not.toContain('definitely')
    expect(out).not.toContain('no wait')
  })
})
