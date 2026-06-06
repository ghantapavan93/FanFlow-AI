'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { ArrivalPlan, LiveSignal } from '@/lib/types'
import { answerFanQuestion, type AskAnswer } from '@/lib/askFanflow'
import { SourceChip } from '@/components/shared/SourceChip'
import { ConfidenceChip } from '@/components/shared/ConfidenceChip'

/* ─────────────────────────────────────────────────────────────────────────
   AskFanFlow — conversational answers derived from the plan (no LLM, no
   chatbot). Ties to StubHub's discovery-on-AI direction: FanFlow is the
   conversational *companion* after purchase. Honest: answers come from the
   fan's deterministic plan, labeled with a source.
   ───────────────────────────────────────────────────────────────────────── */

const SUGGESTIONS = [
  'Where do I enter?',
  'Where should I park?',
  'Nearest restroom?',
  'Is it busy?',
  'When should I leave?',
  'How do I get out after?',
]

export function AskFanFlow({
  plan,
  signals,
  gateLabel,
}: {
  plan: ArrivalPlan
  signals: LiveSignal[]
  gateLabel: string
}) {
  const [q, setQ] = useState('')
  const [answer, setAnswer] = useState<AskAnswer | null>(null)

  const ask = (question: string) => {
    const text = question.trim()
    if (!text) return
    setQ(text)
    setAnswer(answerFanQuestion(text, plan, signals, gateLabel))
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl bg-white border border-violet-200/70 p-4 shadow-[0_4px_20px_-10px_rgba(124,58,237,0.16)]"
    >
      <div className="font-semibold text-slate-900 text-[15px] mb-2.5">Ask FanFlow</div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          ask(q)
        }}
        className="flex items-center gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask about your gate, parking, restrooms…"
          className="flex-1 min-w-0 h-11 px-3.5 rounded-full border border-slate-200 bg-slate-50 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
        />
        <button
          type="submit"
          className="h-11 px-4 rounded-full bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition flex-shrink-0"
        >
          Ask
        </button>
      </form>

      {/* Suggestion chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mt-2.5 -mx-1 px-1">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => ask(s)}
            className="flex-shrink-0 px-2.5 py-1 rounded-full bg-violet-50 border border-violet-100 text-[11px] font-semibold text-violet-700 hover:bg-violet-100 transition"
          >
            {s}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {answer && (
          <motion.div
            key={answer.answer}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className="mt-3 rounded-2xl bg-violet-50/60 border border-violet-100 p-3.5"
          >
            <p className="text-[13px] text-slate-800 leading-relaxed">{answer.answer}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <SourceChip source={answer.source} size="xs" />
              <ConfidenceChip level={answer.confidence} short />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-[10px] text-slate-400 mt-2.5 leading-relaxed">
        Answers come from your plan — not a live chatbot. Always follow venue staff and signage.
      </p>
    </motion.section>
  )
}
