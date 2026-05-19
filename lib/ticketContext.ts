'use client'

/**
 * Selected demo ticket context.
 *
 * The vision route's seat picker (and the real /discover seat picker) write
 * a tiny ticket selection here when the user clicks Continue to Checkout.
 * Downstream routes (checkout-success, building-plan, hub) read it as the
 * "user's selected ticket" so a recruiter who picks Section 118 actually
 * sees Section 118 reflected on the Hub.
 *
 * Falls back to `lib/seed.ts:demoTicket` when nothing is selected — that's
 * the existing behavior for users who land on the Hub directly via a
 * bookmarked link.
 *
 * Session-scoped via lib/session.ts:sessionKey so two demo visitors don't
 * collide on the same browser. Survives reload within the same session id.
 */

import type { Ticket } from './types'
import { demoTicket } from './seed'
import { sessionKey } from './session'

const KEY_SUFFIX = 'selected_ticket'

export interface SelectedTicketContext extends Ticket {
  /** ISO timestamp when the user picked this seat. Used for UI freshness copy. */
  selected_at: string
  /** Event the ticket is for (currently always wc2026-final in the demo). */
  event_id: string
}

/**
 * Lazily build the key — the session id can change at runtime (URL
 * `?session=` override, reset chip), so never cache the resolved key.
 */
function key(): string {
  return sessionKey(KEY_SUFFIX)
}

export function loadSelectedTicket(): SelectedTicketContext | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key())
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SelectedTicketContext>
    // Light shape check — accept anything that has a section
    if (!parsed || typeof parsed.section !== 'string') return null
    return {
      id: parsed.id ?? `demo-${parsed.section}`,
      section: parsed.section,
      row: parsed.row ?? demoTicket.row,
      seat: parsed.seat ?? demoTicket.seat,
      selected_at: parsed.selected_at ?? new Date().toISOString(),
      event_id: parsed.event_id ?? 'wc2026-final',
    }
  } catch {
    return null
  }
}

export function saveSelectedTicket(t: {
  section: string
  row?: string
  seat?: string
  qty?: number
  event_id?: string
}): void {
  if (typeof window === 'undefined') return
  const payload: SelectedTicketContext = {
    id: `demo-${t.section}`,
    section: t.section,
    row: t.row ?? demoTicket.row,
    seat: t.seat ?? demoTicket.seat,
    selected_at: new Date().toISOString(),
    event_id: t.event_id ?? 'wc2026-final',
  }
  try {
    window.localStorage.setItem(key(), JSON.stringify(payload))
  } catch {
    // Private mode / quota — silent fail, downstream falls back to demoTicket
  }
}

export function clearSelectedTicket(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key())
  } catch {}
}

/**
 * Resolve the effective ticket for downstream routes. Selected ticket from
 * session storage wins; otherwise fall back to the seed demoTicket so the
 * Hub never breaks for direct-link visitors.
 */
export function effectiveTicket(): Ticket {
  const selected = loadSelectedTicket()
  if (selected) {
    return {
      id: selected.id,
      section: selected.section,
      row: selected.row,
      seat: selected.seat,
    }
  }
  return demoTicket
}
