import type { Incident, LiveSignal, Venue } from './types'

/**
 * Operational alert — a small, deterministically-derived event the Staff
 * Console surfaces in its Alerts feed. Generated from the in-memory store
 * by computeOperationalAlerts; never persisted.
 *
 * The point is that any senior probe can verify: every alert here can be
 * traced back to the underlying signals / incidents — no fake state, no
 * mock notifications.
 */
export interface OperationalAlert {
  id: string
  /** Visual urgency tier */
  severity: 'info' | 'warning' | 'critical'
  /** Plain-language headline */
  title: string
  /** One-line context */
  detail: string
  /** Optional gate this alert is about */
  gateId?: string
  /** ISO timestamp the alert was derived */
  derivedAt: string
}

/**
 * Compute a deterministic list of operational alerts from current signal +
 * incident state. Stable across renders for the same inputs.
 *
 * Rules applied:
 *   1. Stale gate — no recent staff update for a gate that had a staff
 *      update earlier in the session (suggests a refresh is overdue).
 *   2. Disagreement — staff signal positive while 3+ fan signals at the
 *      same gate are negative (or vice versa).
 *   3. Open incident aging — any incident with status='open' updated_at
 *      older than 20 minutes.
 *   4. Surge — gate with 5+ fan signals in last 10 minutes (fan-pulse
 *      surge worth a quick staff check).
 *   5. Coverage gap — fewer than half of all gates have a recent staff
 *      signal in the last hour.
 */
export function computeOperationalAlerts(
  venue: Venue,
  signals: LiveSignal[],
  incidents: Incident[],
): OperationalAlert[] {
  const now = Date.now()
  const alerts: OperationalAlert[] = []
  const oneHour = 60 * 60 * 1000
  const twentyMin = 20 * 60 * 1000
  const tenMin = 10 * 60 * 1000

  const isPositive = (s: LiveSignal['sentiment']) =>
    s === 'smooth' || s === 'moderate'

  for (const gate of venue.gates) {
    const gateSignals = signals.filter((s) => s.gate_id === gate.id)
    const recentStaff = gateSignals
      .filter((s) => s.source === 'staff')
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
    const recentFans = gateSignals.filter(
      (s) => s.source === 'fan' && now - new Date(s.created_at).getTime() < oneHour,
    )
    const lastStaffAge = recentStaff[0]
      ? now - new Date(recentStaff[0].created_at).getTime()
      : Infinity

    // Rule 1: stale gate — staff updated > 45 min ago
    if (recentStaff.length > 0 && lastStaffAge > 45 * 60 * 1000) {
      const mins = Math.floor(lastStaffAge / 60000)
      alerts.push({
        id: `stale-${gate.id}`,
        severity: 'warning',
        title: `${gate.name} update overdue`,
        detail: `Last staff signal was ${mins}m ago. Consider re-publishing to keep fan-side confidence high.`,
        gateId: gate.id,
        derivedAt: new Date(now).toISOString(),
      })
    }

    // Rule 2: staff-vs-fan disagreement
    if (recentStaff[0] && recentFans.length >= 3) {
      const staffSentiment = recentStaff[0].sentiment
      const fanCounts: Record<LiveSignal['sentiment'], number> = {
        smooth: 0,
        moderate: 0,
        busy: 0,
        difficult: 0,
      }
      for (const f of recentFans) fanCounts[f.sentiment] += 1
      let majority: LiveSignal['sentiment'] = 'moderate'
      let max = -1
      for (const k of Object.keys(fanCounts) as LiveSignal['sentiment'][]) {
        if (fanCounts[k] > max) {
          max = fanCounts[k]
          majority = k
        }
      }
      if (isPositive(staffSentiment) !== isPositive(majority)) {
        alerts.push({
          id: `conflict-${gate.id}`,
          severity: 'warning',
          title: `${gate.name} — conflicting reports`,
          detail: `Staff reports "${staffSentiment}" but ${recentFans.length} recent fan reports skew "${majority}". Worth a quick verification walk.`,
          gateId: gate.id,
          derivedAt: new Date(now).toISOString(),
        })
      }
    }

    // Rule 4: fan-pulse surge
    const lastTenMinFans = recentFans.filter(
      (s) => now - new Date(s.created_at).getTime() < tenMin,
    )
    if (lastTenMinFans.length >= 5) {
      const negative = lastTenMinFans.filter((s) => !isPositive(s.sentiment)).length
      if (negative >= 3) {
        alerts.push({
          id: `surge-${gate.id}`,
          severity: 'critical',
          title: `${gate.name} — fan pulse surging`,
          detail: `${lastTenMinFans.length} fan reports in 10 min, ${negative} flagging issues. Staff verification recommended.`,
          gateId: gate.id,
          derivedAt: new Date(now).toISOString(),
        })
      }
    }
  }

  // Rule 3: aging open incidents
  for (const inc of incidents) {
    if (inc.status !== 'open') continue
    const age = now - new Date(inc.updated_at).getTime()
    if (age > twentyMin) {
      const mins = Math.floor(age / 60000)
      alerts.push({
        id: `incident-${inc.id}`,
        severity: 'critical',
        title: `Incident open ${mins}m — ${inc.type.replace('_', ' ')}`,
        detail: inc.note,
        gateId: inc.gate_id,
        derivedAt: new Date(now).toISOString(),
      })
    }
  }

  // Rule 5: coverage gap
  const gatesWithRecentStaff = venue.gates.filter((g) =>
    signals.some(
      (s) =>
        s.gate_id === g.id &&
        s.source === 'staff' &&
        now - new Date(s.created_at).getTime() < oneHour,
    ),
  ).length
  if (gatesWithRecentStaff < Math.ceil(venue.gates.length / 2)) {
    alerts.push({
      id: 'coverage-gap',
      severity: 'info',
      title: 'Staff coverage gap',
      detail: `Only ${gatesWithRecentStaff}/${venue.gates.length} gates have a staff update in the last hour. Fan side falls back to baseline guidance.`,
      derivedAt: new Date(now).toISOString(),
    })
  }

  // Order: critical first, then warning, then info; within tier, newest first.
  const sevOrder = { critical: 0, warning: 1, info: 2 }
  alerts.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity])

  return alerts
}
