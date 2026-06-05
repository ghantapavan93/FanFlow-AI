import type { MessageTone, SceneId } from '../types'

/* ─────────────────────────────────────────────────────────────────────────
   Scene engine — a SceneSpec describes how a given product moment looks
   and sounds. Pages and components read their own scene from here so the
   tone of copy, the background gradient, the motion accent, and the map
   focus all align without each surface inventing its own treatment.

   Adding a new scene is one entry in SCENES. No new keyframes or palette
   constants needed — each scene references the existing globals.css
   tokens (lavender bg, shimmer overlay, pulse rings).
   ───────────────────────────────────────────────────────────────────── */

export interface SceneSpec {
  id: SceneId
  /** Human-readable label, e.g. "Parking & arrival". */
  title: string
  /** One-line subtitle suitable for a page eyebrow. */
  eyebrow: string
  /** Tailwind classes for the page background. */
  backgroundClass: string
  /** Accent color used by motion (route lines, pulse rings, badges). */
  accentClass: string
  /** Default tone for any structured message rendered in this scene. */
  copyTone: MessageTone
  /**
   * Hint for the map module — which layer to focus when this scene
   * activates. The map page is free to ignore this on first paint and
   * let the user choose, but scene transitions can use it.
   */
  mapFocus?:
    | 'route'
    | 'parking'
    | 'gates'
    | 'crowd'
    | 'restrooms'
    | 'accessibility'
    | 'support'
    | 'exit'
}

export const SCENES: Record<SceneId, SceneSpec> = {
  ticket_confirmed: {
    id: 'ticket_confirmed',
    title: 'Ticket confirmed',
    eyebrow: 'Your seat is locked in',
    backgroundClass: 'bg-gradient-to-b from-emerald-100/60 via-violet-50/30 to-white',
    accentClass: 'text-emerald-600',
    copyTone: 'celebration',
  },
  fanflow_unlocked: {
    id: 'fanflow_unlocked',
    title: 'FanFlow unlocked',
    eyebrow: 'Your ticket is now an event-day companion',
    backgroundClass: 'bg-gradient-to-b from-violet-200/70 via-violet-100/40 to-white',
    accentClass: 'text-violet-600',
    copyTone: 'celebration',
  },
  personalization: {
    id: 'personalization',
    title: 'Personalize your plan',
    eyebrow: 'A few quick taps tailor the rest',
    backgroundClass: 'bg-gradient-to-b from-violet-100/60 via-violet-50/20 to-white',
    accentClass: 'text-violet-600',
    copyTone: 'helpful',
  },
  parking: {
    id: 'parking',
    title: 'Parking & arrival',
    eyebrow: 'Park smart, walk less',
    backgroundClass: 'bg-gradient-to-b from-sky-100/50 via-violet-50/20 to-white',
    accentClass: 'text-sky-600',
    copyTone: 'helpful',
    mapFocus: 'parking',
  },
  gate_guidance: {
    id: 'gate_guidance',
    title: 'Your gate',
    eyebrow: 'The cleanest path to your seat',
    backgroundClass: 'bg-gradient-to-b from-violet-100/60 via-violet-50/20 to-white',
    accentClass: 'text-violet-600',
    copyTone: 'helpful',
    mapFocus: 'gates',
  },
  crowd_pulse: {
    id: 'crowd_pulse',
    title: 'Crowd pulse',
    eyebrow: 'Live community sense',
    backgroundClass: 'bg-gradient-to-b from-fuchsia-100/50 via-violet-50/20 to-white',
    accentClass: 'text-fuchsia-600',
    copyTone: 'awareness',
    mapFocus: 'crowd',
  },
  restrooms: {
    id: 'restrooms',
    title: 'Restrooms & facilities',
    eyebrow: 'Closest, family, accessible',
    backgroundClass: 'bg-gradient-to-b from-violet-100/60 via-violet-50/20 to-white',
    accentClass: 'text-violet-600',
    copyTone: 'helpful',
    mapFocus: 'restrooms',
  },
  accessibility: {
    id: 'accessibility',
    title: 'Accessibility',
    eyebrow: 'Step-free and supported',
    backgroundClass: 'bg-gradient-to-b from-sky-100/50 via-violet-50/20 to-white',
    accentClass: 'text-sky-700',
    copyTone: 'support',
    mapFocus: 'accessibility',
  },
  support: {
    id: 'support',
    title: 'Support nearby',
    eyebrow: 'Verified help points first',
    backgroundClass: 'bg-gradient-to-b from-rose-100/40 via-violet-50/20 to-white',
    accentClass: 'text-rose-600',
    copyTone: 'support',
    mapFocus: 'support',
  },
  exit: {
    id: 'exit',
    title: 'ExitFlow',
    eyebrow: 'Smoothest path back',
    backgroundClass: 'bg-gradient-to-b from-slate-100/70 via-violet-50/20 to-white',
    accentClass: 'text-slate-700',
    copyTone: 'helpful',
    mapFocus: 'exit',
  },
}

export function getScene(id: SceneId): SceneSpec {
  return SCENES[id]
}
