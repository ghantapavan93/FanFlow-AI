'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { saveReadiness } from '@/lib/store'
import type { ReadinessPrefs } from '@/lib/types'

/* ─────────────────────────────────────────────────────────────────────────
   PersonaSwitcher — the "watch it adapt to a different human" moment.

   Tapping a persona writes that person's readiness preferences through the
   real store (`saveReadiness`), which the rule engine re-reads to recompute
   the entire plan — gate, leave-by, route, support, confidence — and every
   subscribed page reshapes. No special-casing: it just feeds different
   inputs to the same deterministic engine, proving FanFlow handles real
   fan diversity (families, accessibility, solo speed, first-timers).

   Honest: a demo affordance, labeled as such.
   ───────────────────────────────────────────────────────────────────────── */

interface Persona {
  id: string
  name: string
  emoji: string
  tag: string
  prefs: Omit<ReadinessPrefs, 'updated_at'>
}

const PERSONAS: Persona[] = [
  {
    id: 'maria',
    name: 'Maria',
    emoji: '👩‍👧',
    tag: 'Family · transit',
    prefs: {
      transport: 'transit',
      group: 'family_young_kids',
      needs: ['stroller'],
      priority: 'family_friendly',
      arrival_preference: 'early',
      venue_experience: 'been_before',
    },
  },
  {
    id: 'alex',
    name: 'Alex',
    emoji: '🏃',
    tag: 'Solo · fastest in',
    prefs: {
      transport: 'rideshare',
      group: 'solo',
      needs: ['none'],
      priority: 'fastest_entry',
      arrival_preference: 'last_minute',
      venue_experience: 'regular',
    },
  },
  {
    id: 'sam',
    name: 'Sam',
    emoji: '♿',
    tag: 'Step-free · driving',
    prefs: {
      transport: 'driving',
      group: 'couple',
      needs: ['wheelchair', 'slow_pace'],
      priority: 'calmest_route',
      arrival_preference: 'early',
      venue_experience: 'been_before',
    },
  },
  {
    id: 'priya',
    name: 'Priya',
    emoji: '🌍',
    tag: 'First-timer · calm',
    prefs: {
      transport: 'transit',
      group: 'couple',
      needs: ['first_time'],
      priority: 'calmest_route',
      arrival_preference: 'on_time',
      venue_experience: 'first_time',
    },
  },
]

export function PersonaSwitcher() {
  const [activeId, setActiveId] = useState<string | null>(null)

  const pick = (p: Persona) => {
    setActiveId(p.id)
    saveReadiness({ ...p.prefs, updated_at: new Date().toISOString() })
  }

  return (
    <section className="pt-1">
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-violet-700">
          Viewing as
        </div>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
          Demo persona · reshapes the plan
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {PERSONAS.map((p) => {
          const active = activeId === p.id
          return (
            <motion.button
              key={p.id}
              onClick={() => pick(p)}
              whileTap={{ scale: 0.96 }}
              className={`flex-shrink-0 inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-left transition ${
                active
                  ? 'bg-violet-600 border-violet-500 text-white glow-violet'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-violet-300'
              }`}
            >
              <span className="text-lg leading-none">{p.emoji}</span>
              <span className="min-w-0">
                <span className="block text-[13px] font-bold leading-tight">{p.name}</span>
                <span
                  className={`block text-[10px] leading-tight ${
                    active ? 'text-violet-100' : 'text-slate-500'
                  }`}
                >
                  {p.tag}
                </span>
              </span>
            </motion.button>
          )
        })}
      </div>
    </section>
  )
}
