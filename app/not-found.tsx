import Link from 'next/link'

/**
 * Branded 404 page. Replaces the default Next.js not-found screen with
 * a FanFlow-styled handoff that nudges visitors back into the journey.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen page-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="inline-flex w-14 h-14 rounded-full bg-violet-100 text-violet-700 items-center justify-center text-2xl">
          🎟️
        </div>
        <div>
          <div className="kicker mb-2">404</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            That page isn&apos;t part of the journey.
          </h1>
        </div>
        <p className="text-slate-600 leading-relaxed">
          FanFlow covers one scenario end-to-end: the FIFA World Cup 2026 Final at
          MetLife Stadium. Try one of the entry points below.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 pt-2">
          <Link href="/" className="btn-secondary">
            Home
          </Link>
          <Link href="/event/wc2026-final/hub" className="btn-primary">
            Open Event Day Hub →
          </Link>
        </div>

        <div className="pt-4 text-xs text-slate-500">
          <p>
            Looking for the demo control surface?{' '}
            <Link
              href="/debug"
              className="underline hover:text-violet-700"
            >
              /debug
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
