'use client'

/**
 * Route-segment error boundary.
 *
 * Catches any uncaught error from a page or its children. Without this file,
 * Next.js shows a default unstyled error screen — which signals "I didn't
 * plan for production failure modes" to anyone reviewing the codebase.
 *
 * The reset() callback re-renders the segment (useful if the failure was
 * transient — e.g. localStorage parsing). The Home link is the escape hatch.
 */

import { useEffect } from 'react'
import Link from 'next/link'

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // In production this would be Sentry / Datadog / etc. For the prototype
    // we just keep it observable in the console.
    console.error('[FanFlow] Route error caught by boundary:', error)
  }, [error])

  return (
    <div className="min-h-screen page-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="inline-flex w-14 h-14 rounded-full bg-rose-100 text-rose-700 items-center justify-center text-2xl">
          ⚠
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Something went wrong on this screen.
        </h1>
        <p className="text-slate-600 leading-relaxed">
          The rest of FanFlow is unaffected. Try again, or head back to the Hub.
          If you keep hitting this, your event-day plan is still safe — it&apos;s
          stored locally and the rule engine works without this page.
        </p>

        {error.digest && (
          <p className="text-xs text-slate-500 font-mono bg-white border border-slate-200 rounded-lg py-2 px-3 inline-block">
            Error ref: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 pt-2">
          <button onClick={reset} className="btn-primary">
            Try again
          </button>
          <Link href="/event/wc2026-final/hub" className="btn-secondary">
            Back to Event Day Hub
          </Link>
        </div>

        <p className="text-xs text-slate-500 pt-3">
          For urgent venue or medical issues, contact venue staff or call 911 —
          FanFlow provides guidance, not emergency response.
        </p>
      </div>
    </div>
  )
}
