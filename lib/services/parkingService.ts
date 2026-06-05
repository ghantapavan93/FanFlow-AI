/* ─────────────────────────────────────────────────────────────────────────
   Parking Service — thin façade over the parking seed.

   Today this returns the static demoParkingLots list. The shape is what
   a real venue parking feed would look like: a list of lots with status,
   walk time, and recommended gate, each carrying its own source +
   confidence labels so the UI can render an honest chip per lot.
   ───────────────────────────────────────────────────────────────────── */

import { demoParkingLots } from '../seed'
import type { ParkingLot, ParkingStatus } from '../types'

/* Shared traffic-light display tokens for a parking status. Centralized
   here so the Venue Map parking layer and the Parking page render an
   identical color + label for the same status. */
export const PARKING_STATUS_COLOR: Record<ParkingStatus, string> = {
  open: '#10b981',
  filling: '#f59e0b',
  limited: '#f97316',
  full: '#ef4444',
  unknown: '#94a3b8',
}
export const PARKING_STATUS_LABEL: Record<ParkingStatus, string> = {
  open: 'Open',
  filling: 'Filling fast',
  limited: 'Limited',
  full: 'Full',
  unknown: 'Unknown',
}

export function listParkingLots(): ParkingLot[] {
  return demoParkingLots
}

export function getRecommendedLot(
  preferredGateId?: string,
): ParkingLot | undefined {
  const lots = listParkingLots()
  // 1) lot that serves the preferred gate AND is open
  if (preferredGateId) {
    const exact = lots.find(
      (l) => l.recommended_gate_id === preferredGateId && l.status === 'open',
    )
    if (exact) return exact
  }
  // 2) any open lot
  const open = lots.find((l) => l.status === 'open')
  if (open) return open
  // 3) anything not full/unknown
  return lots.find((l) => l.status !== 'full' && l.status !== 'unknown')
}
