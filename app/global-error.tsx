'use client'

/**
 * Root-level error boundary.
 *
 * Catches errors thrown in the root layout itself (where the regular
 * app/error.tsx can't run because the layout is still mounting).
 *
 * Must include <html> and <body> — Next.js does not wrap this in the
 * normal RootLayout.
 */

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[FanFlow] Root error caught by global boundary:', error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          background: '#f6f6f8',
          color: '#0f172a',
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
        }}
      >
        <div style={{ maxWidth: '28rem', width: '100%', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              width: '3.5rem',
              height: '3.5rem',
              borderRadius: '50%',
              background: '#fee2e2',
              color: '#b91c1c',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              marginBottom: '1.25rem',
            }}
          >
            ⚠
          </div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              marginBottom: '0.75rem',
            }}
          >
            FanFlow couldn&apos;t start.
          </h1>
          <p
            style={{
              color: '#475569',
              lineHeight: 1.6,
              marginBottom: '1.5rem',
            }}
          >
            Something went wrong loading the app shell. Try again — your event
            data is still safe locally.
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: '0.75rem',
                color: '#64748b',
                fontFamily: 'monospace',
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                padding: '0.5rem 0.75rem',
                display: 'inline-block',
                marginBottom: '1.25rem',
              }}
            >
              Error ref: {error.digest}
            </p>
          )}
          <div>
            <button
              onClick={reset}
              style={{
                background: '#7c3aed',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: '9999px',
                cursor: 'pointer',
                minHeight: '48px',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
