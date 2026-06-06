'use client'

import { MotionConfig } from 'framer-motion'
import type { ReactNode } from 'react'

/* App-wide motion config. `reducedMotion="user"` makes every Framer Motion
   component honor the OS "reduce motion" setting automatically — transform
   and layout animations are disabled for those users, opacity crossfades
   kept. This covers the many ambient/looping animations (drifting orbs,
   pulse rings, the Game Day sim, route dots) in one place, satisfying the
   accessibility requirement without per-component guards. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
