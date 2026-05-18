'use client'

import { useEffect, useState } from 'react'
import { getSessionId, resetSession } from '@/lib/session'

/**
 * Visible session indicator + reset link.
 *
 * Mounts on the Hub (and anywhere else worth surfacing) so the recruiter
 * can SEE that demo state is session-scoped. Clicking Reset wipes every
 * `fanflow:<currentSession>:*` key, generates a new session id, and
 * dispatches the same custom events the Hub already listens for, so the
 * UI refreshes against an empty state without a page reload.
 *
 * Hydration: getSessionId() returns 'ssr' during server render and the
 * real value after the first effect, so the chip stays empty server-side
 * to avoid a hydration mismatch.
 */
export function SessionChip({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const [id, setId] = useState<string | null>(null)
  const [justReset, setJustReset] = useState(false)

  useEffect(() => {
    setId(getSessionId())
  }, [])

  // Visible-confirmation pulse for the Reset click. Without this the
  // button feels broken — the underlying state DOES clear, but the
  // user only sees the id shift, which is easy to miss.
  useEffect(() => {
    if (!justReset) return
    const t = setTimeout(() => setJustReset(false), 1800)
    return () => clearTimeout(t)
  }, [justReset])

  const onReset = () => {
    const fresh = resetSession()
    setId(fresh)
    setJustReset(true)
  }

  if (!id) return null

  const cls =
    tone === 'dark'
      ? 'bg-slate-800/70 border-slate-700 text-slate-300'
      : 'bg-slate-100 border-slate-200 text-slate-600'
  const valueCls = tone === 'dark' ? 'text-white' : 'text-slate-900'
  const linkCls =
    tone === 'dark'
      ? 'text-violet-300 hover:text-violet-200'
      : 'text-violet-700 hover:text-violet-800'
  const sepCls = tone === 'dark' ? 'text-slate-600' : 'text-slate-300'

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-[10px] font-mono transition-colors ${
        justReset
          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
          : cls
      }`}
      role="status"
      aria-live="polite"
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          justReset ? 'bg-emerald-500' : 'bg-violet-500'
        }`}
      />
      {justReset ? (
        <span className="font-semibold">Session reset · new id {id.slice(0, 8)}</span>
      ) : (
        <>
          Session
          <span className={`font-bold ${valueCls}`}>{id.slice(0, 8)}</span>
          <span className={sepCls}>·</span>
          <button
            onClick={onReset}
            className={`font-semibold ${linkCls}`}
            title="Wipe this session's readiness, signals, incidents, and checklist. Generates a new session id."
          >
            Reset
          </button>
        </>
      )}
    </div>
  )
}
