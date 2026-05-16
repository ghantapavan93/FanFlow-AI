'use client'

import type { ArrivalPlan, LiveSignal, ReadinessPrefs } from '@/lib/types'

interface ImpactCardsProps {
  plan: ArrivalPlan
  prefs: ReadinessPrefs | null
  signals: LiveSignal[]
}

/**
 * Two small cards that surface, in plain English, what changed because of:
 *   (1) the fan's readiness preferences
 *   (2) recent staff signals
 *
 * Both are derived from data already present on the plan and signals — no new
 * state, no async, no UI rebuild. If a card has no relevant reasons, it
 * doesn't render. If neither has reasons, nothing renders.
 */
export function ImpactCards({ plan, prefs, signals }: ImpactCardsProps) {
  const personalization = computePersonalizationReasons(plan, prefs)
  const staffImpact = computeStaffSignalReasons(plan, signals)

  if (personalization.length === 0 && staffImpact.length === 0) return null

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {personalization.length > 0 && (
        <ImpactCard
          tone="violet"
          icon="✨"
          title="Tailored to you"
          subtitle="What changed because of your preferences"
          reasons={personalization}
        />
      )}
      {staffImpact.length > 0 && (
        <ImpactCard
          tone="emerald"
          icon="👮"
          title="Refined by staff signals"
          subtitle="What changed because staff just updated conditions"
          reasons={staffImpact}
        />
      )}
    </div>
  )
}

function ImpactCard({
  tone,
  icon,
  title,
  subtitle,
  reasons,
}: {
  tone: 'violet' | 'emerald'
  icon: string
  title: string
  subtitle: string
  reasons: string[]
}) {
  const toneClasses =
    tone === 'violet'
      ? 'bg-violet-50 border-violet-200'
      : 'bg-emerald-50 border-emerald-200'
  const iconBg = tone === 'violet' ? 'bg-violet-600' : 'bg-emerald-600'
  const titleColor = tone === 'violet' ? 'text-violet-900' : 'text-emerald-900'
  const subtitleColor = tone === 'violet' ? 'text-violet-700' : 'text-emerald-700'
  const reasonColor = tone === 'violet' ? 'text-violet-900/90' : 'text-emerald-900/90'

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${toneClasses}`}>
      <div className="flex items-center gap-2.5 mb-3">
        <span
          className={`w-8 h-8 rounded-full ${iconBg} text-white flex items-center justify-center text-sm flex-shrink-0`}
        >
          {icon}
        </span>
        <div>
          <div className={`font-bold text-sm ${titleColor}`}>{title}</div>
          <div className={`text-xs ${subtitleColor}`}>{subtitle}</div>
        </div>
      </div>
      <ul className={`space-y-1.5 text-sm ${reasonColor}`}>
        {reasons.map((r, i) => (
          <li key={i} className="flex gap-2">
            <span className="flex-shrink-0">•</span>
            <span className="leading-snug">{r}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function computePersonalizationReasons(
  plan: ArrivalPlan,
  prefs: ReadinessPrefs | null,
): string[] {
  if (!prefs) return []
  const reasons: string[] = []
  const gate = plan.recommended_gate

  if (prefs.needs.includes('wheelchair') && gate.accessibility) {
    reasons.push(`${shortGateName(gate.name)} picked for step-free accessible entry.`)
  }
  if (prefs.needs.includes('stroller') && gate.family_friendly) {
    reasons.push('Stroller-friendly lane prioritized.')
  }
  if (
    (prefs.group === 'family_young_kids' || prefs.group === 'family_teens') &&
    gate.family_friendly
  ) {
    reasons.push('Family-friendly entrance favored for your group.')
  }
  if (prefs.needs.includes('sensory_sensitive')) {
    const quiet = plan.support_points.find((sp) => sp.type === 'quiet_space')
    if (quiet) reasons.push(`Quiet space surfaced: ${quiet.name}.`)
  }
  if (prefs.transport) {
    const bufLabel: Record<typeof prefs.transport, string> = {
      transit: 'transit timing buffer applied (~45 min)',
      driving: 'driving + parking buffer applied (~60 min)',
      rideshare: 'rideshare timing buffer applied (~35 min)',
      walking: 'short walk-up buffer applied (~25 min)',
    }
    reasons.push(`Leave-by time tuned: ${bufLabel[prefs.transport]}.`)
  }
  if (prefs.group === 'family_young_kids') {
    reasons.push('Extra 20-min family buffer added to leave-by time.')
  }

  return reasons.slice(0, 4)
}

function computeStaffSignalReasons(plan: ArrivalPlan, signals: LiveSignal[]): string[] {
  const recentStaff = signals
    .filter(
      (s) =>
        s.source === 'staff' &&
        Date.now() - new Date(s.created_at).getTime() < 30 * 60 * 1000,
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  if (recentStaff.length === 0) return []

  const reasons: string[] = []
  const recGateId = plan.recommended_gate.id

  for (const s of recentStaff.slice(0, 3)) {
    if (s.gate_id === recGateId) {
      reasons.push(
        `Staff reports your gate is ${s.sentiment}${s.message ? ` — "${s.message}"` : ''}.`,
      )
    } else if (s.sentiment === 'difficult' || s.sentiment === 'busy') {
      reasons.push(
        `Staff flagged a different gate (${shortGateId(s.gate_id)}) as ${s.sentiment} — your gate avoids it.`,
      )
    }
  }

  return reasons.slice(0, 3)
}

function shortGateName(name: string): string {
  // "Gate 3 (Budweiser Plaza)" → "Gate 3"
  return name.replace(/\s*\(.*\)\s*$/, '').trim()
}

function shortGateId(id: string): string {
  // "gate-3" → "Gate 3"
  const m = id.match(/gate-(\d+)/i)
  return m ? `Gate ${m[1]}` : id
}
