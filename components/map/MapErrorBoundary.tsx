'use client'

import { Component, type ReactNode } from 'react'

/* Contains any runtime failure inside the Leaflet map so the flagship Venue
   Map page never breaks. On error it renders a calm fallback inviting the
   user back to the Classic map. */

interface Props {
  children: ReactNode
  onError?: () => void
}
interface State {
  hasError: boolean
}

export class MapErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch() {
    this.props.onError?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[320px] rounded-2xl border border-slate-200 bg-slate-50 grid place-items-center text-center px-6">
          <div>
            <div className="text-sm font-semibold text-slate-700">Live map unavailable</div>
            <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
              Switch to the Classic map below — same gates, routes, and layers.
            </p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
