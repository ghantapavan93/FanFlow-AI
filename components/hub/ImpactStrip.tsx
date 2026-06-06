'use client'

import { motion } from 'framer-motion'
import type { ArrivalPlan } from '@/lib/types'
import { deriveImpact } from '@/lib/impact'

/* Compact "what this plan buys you" strip — the business case, honestly
   hedged ("estimated"). Derived from real plan facts. */

export function ImpactStrip({
  plan,
  avoidsPeak,
}: {
  plan: ArrivalPlan
  avoidsPeak: boolean
}) {
  const impact = deriveImpact(plan, avoidsPeak)
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl bg-white border border-slate-200 p-5"
    >
      <h3 className="font-semibold text-slate-900 text-[15px] leading-snug">
        This plan saves you roughly {impact.minutesSaved} minutes
        <span className="text-slate-400 font-normal"> (estimated)</span>
      </h3>
      <ul className="mt-3 space-y-2">
        {impact.points.map((p) => (
          <li key={p.label} className="flex items-start gap-2.5 text-[13px] text-slate-600">
            <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-300 flex-shrink-0" aria-hidden="true" />
            {p.label}
          </li>
        ))}
      </ul>
      <p className="text-[12px] text-slate-500 mt-3 leading-relaxed">
        Fewer wrong-gate moments means fewer support contacts on event day.
      </p>
    </motion.section>
  )
}
