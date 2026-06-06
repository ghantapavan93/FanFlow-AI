import type { ArrivalPlan } from './types'

/* ─────────────────────────────────────────────────────────────────────────
   Impact estimate — the business case, honestly hedged.

   Derives a few "what this plan buys you" points from REAL plan facts
   (peak avoidance, step-free routing, gate fit). Numbers are explicitly
   estimated and labeled as such in the UI — never presented as measured.
   This is the line a StubHub product leader cares about: less wrong-gate
   friction → fewer support contacts and FanProtect-style claims.
   ───────────────────────────────────────────────────────────────────────── */

export interface ImpactPoint {
  icon: string
  label: string
}

export interface ImpactEstimate {
  minutesSaved: number
  points: ImpactPoint[]
}

export function deriveImpact(plan: ArrivalPlan, avoidsPeak: boolean): ImpactEstimate {
  const stepFree = plan.recommended_gate.accessibility
  return {
    minutesSaved: avoidsPeak ? 12 : 6,
    points: [
      {
        icon: '🎯',
        label: avoidsPeak ? 'Avoids the peak-entry crush' : 'Timed to current entry flow',
      },
      {
        icon: stepFree ? '♿' : '🚶',
        label: stepFree ? 'Step-free routing applied' : 'Shortest route to your section',
      },
      { icon: '🤝', label: 'Fewer wrong-gate & support moments' },
    ],
  }
}
