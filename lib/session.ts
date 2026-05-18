'use client'

/**
 * Demo session isolation.
 *
 * Each visitor gets a session id that all FanFlow demo state is scoped under:
 *
 *   fanflow:<sessionId>:readiness
 *   fanflow:<sessionId>:signals
 *   fanflow:<sessionId>:incidents
 *   fanflow:<sessionId>:checklist
 *
 * Resolution order:
 *   1. URL `?session=<id>` — pinned/sharable demo (also written to localStorage
 *      so other tabs in the same browser converge on it, which is what makes
 *      the Hub ↔ Staff Console cross-tab demo continue to work)
 *   2. localStorage `fanflow:session-id` — the persistent default
 *   3. Freshly generated short id (crypto.randomUUID first 8 chars, falling
 *      back to a base-36 random suffix when crypto.randomUUID is unavailable)
 *
 * Production mapping: in the Supabase swap, sessionId is replaced by
 *   `user_id` for readiness profiles and personal state, and by
 *   `event_id` / `gate_id` for shared truth (live_signals, incidents).
 *   The prototype scopes EVERYTHING by sessionId because the demo has no
 *   notion of a separate event truth shared across visitors — each demo
 *   visitor IS their own world.
 *
 * SSR safety: getSessionId() returns `'ssr'` server-side so the function
 * is safe to call from any client component. The real lookup happens on
 * the first client render.
 */

const SESSION_KEY = 'fanflow:session-id'

/**
 * Constrain externally-supplied session ids to a safe alphabet to prevent
 * weird localStorage keys (e.g. someone passing `?session=../foo`).
 */
function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'default'
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    // Use the first 8 chars — collision risk is fine for a single-browser demo
    // and the short form is easier to read on the visible session chip.
    return crypto.randomUUID().slice(0, 8)
  }
  return Math.random().toString(36).slice(2, 10)
}

export function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr'

  // 1. URL override — pin a session via ?session=<id>
  try {
    const params = new URLSearchParams(window.location.search)
    const fromUrl = params.get('session')
    if (fromUrl && fromUrl.trim()) {
      const clean = sanitize(fromUrl)
      try {
        window.localStorage.setItem(SESSION_KEY, clean)
      } catch {
        // private mode / quota — fall through, return id anyway
      }
      return clean
    }
  } catch {
    // URLSearchParams shouldn't throw, but guard anyway
  }

  // 2. localStorage default
  try {
    const saved = window.localStorage.getItem(SESSION_KEY)
    if (saved && saved.trim()) return saved
  } catch {
    // private mode — proceed to generate (won't persist, fine for one tab)
  }

  // 3. Fresh
  const fresh = generateId()
  try {
    window.localStorage.setItem(SESSION_KEY, fresh)
  } catch {}
  return fresh
}

/**
 * Wipe every localStorage key belonging to the current session, then
 * generate a fresh session id. Returns the new id.
 *
 * Used by the visible "Reset session" link on the Hub footer.
 */
export function resetSession(): string {
  if (typeof window === 'undefined') return 'ssr'
  const current = getSessionId()
  const prefix = `fanflow:${current}:`
  try {
    const toRemove: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k && k.startsWith(prefix)) toRemove.push(k)
    }
    for (const k of toRemove) window.localStorage.removeItem(k)
  } catch {}
  const fresh = generateId()
  try {
    window.localStorage.setItem(SESSION_KEY, fresh)
  } catch {}
  // Notify any open listeners so the UI re-renders against an empty state
  window.dispatchEvent(new Event('fanflow:readiness'))
  window.dispatchEvent(new Event('fanflow:signals'))
  window.dispatchEvent(new Event('fanflow:incidents'))
  return fresh
}

/**
 * Build a session-scoped storage key. Always reads the current session id
 * lazily — never cache the prefix at module load time, because the
 * session id can change at runtime (URL override, reset).
 */
export function sessionKey(suffix: string): string {
  return `fanflow:${getSessionId()}:${suffix}`
}
