'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { PARKING_STATUS_COLOR } from '@/lib/services/parkingService'
import type { Gate, ParkingLot, SupportPoint, SupportType } from '@/lib/types'

/* ─────────────────────────────────────────────────────────────────────────
   StadiumLeafletMap — a REAL interactive map engine (Leaflet, BSD, no API
   keys, fully offline) rendering OUR stadium. CRS.Simple maps our SVG art
   onto a pannable/zoomable canvas; gates, parking, support, seat are real
   marker layers; the route is an animated polyline. This is honest "real
   tech": the engine is real, the data is our simulated demo data.

   Presentational only — the parent decides which markers/route to show for
   the active layer and supplies click handlers (so the existing detail card
   and source/confidence chips keep working unchanged).
   ───────────────────────────────────────────────────────────────────────── */

const W = 520
const H = 340

// Stadium base art, rendered as an image overlay across the full bounds.
const STADIUM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
  <defs><radialGradient id="f" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="#bbf7d0"/><stop offset="100%" stop-color="#86efac"/>
  </radialGradient></defs>
  <rect width="${W}" height="${H}" fill="#f1f5f9"/>
  <ellipse cx="260" cy="170" rx="220" ry="120" fill="#e9eef5" stroke="#dbe2ea" stroke-width="1.5"/>
  <ellipse cx="260" cy="170" rx="170" ry="85" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5"/>
  <ellipse cx="260" cy="170" rx="120" ry="55" fill="url(#f)" stroke="#22c55e" stroke-width="1.5" opacity="0.85"/>
  <line x1="260" y1="115" x2="260" y2="225" stroke="#fff" stroke-width="1.5"/>
  <circle cx="260" cy="170" r="14" fill="none" stroke="#fff" stroke-width="1.5"/>
  <text x="260" y="28" text-anchor="middle" font-size="10" fill="#94a3b8" font-weight="600">NORTH</text>
  <text x="260" y="320" text-anchor="middle" font-size="10" fill="#94a3b8" font-weight="600">SOUTH</text>
</svg>`

const SUPPORT_META: Record<SupportType, { emoji: string; tone: string }> = {
  first_aid: { emoji: '➕', tone: '#dc2626' },
  family_services: { emoji: '👶', tone: '#7c3aed' },
  accessibility: { emoji: '♿', tone: '#0ea5e9' },
  restroom: { emoji: '🚻', tone: '#475569' },
  guest_services: { emoji: 'ℹ️', tone: '#0891b2' },
  quiet_space: { emoji: '🧩', tone: '#16a34a' },
  concessions: { emoji: '🍿', tone: '#ea580c' },
}

interface Props {
  gates: Gate[]
  parkingLots: ParkingLot[]
  supportPoints: SupportPoint[]
  seat: { x: number; y: number; label: string }
  route: { from: { x: number; y: number }; to: { x: number; y: number }; color: string } | null
  recommendedGateId: string
  /** Optional per-gate fill (crowd layer). */
  gateColors?: Record<string, string>
  onSelectGate?: (g: Gate) => void
  onSelectSupport?: (s: SupportPoint) => void
  onSelectParking?: (l: ParkingLot) => void
}

export function StadiumLeafletMap(props: Props) {
  const elRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  // Keep latest props for the click handlers without re-initializing the map.
  const propsRef = useRef(props)
  propsRef.current = props

  // CRS.Simple: y axis points up, our art's y points down → flip.
  const toLatLng = (x: number, y: number) => L.latLng(H - y, x)

  // Init the map once.
  useEffect(() => {
    if (!elRef.current || mapRef.current) return
    const bounds = L.latLngBounds([0, 0], [H, W])
    const map = L.map(elRef.current, {
      crs: L.CRS.Simple,
      minZoom: -1,
      maxZoom: 2,
      zoomControl: true,
      attributionControl: false,
      maxBounds: bounds.pad(0.25),
      maxBoundsViscosity: 0.8,
    })
    L.imageOverlay(
      `data:image/svg+xml;base64,${btoa(STADIUM_SVG)}`,
      bounds,
    ).addTo(map)
    map.fitBounds(bounds)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    // Container is sized by CSS after mount — make Leaflet recompute.
    setTimeout(() => map.invalidateSize(), 0)
    draw()
    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Redraw markers + route whenever the active-layer inputs change.
  useEffect(() => {
    draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    props.gates,
    props.parkingLots,
    props.supportPoints,
    props.route,
    props.gateColors,
    props.recommendedGateId,
  ])

  function draw() {
    const map = mapRef.current
    const group = layerRef.current
    if (!map || !group) return
    group.clearLayers()
    const p = propsRef.current

    // Route — glow underlay + animated dashed line.
    if (p.route) {
      const pts = [toLatLng(p.route.from.x, p.route.from.y), toLatLng(p.route.to.x, p.route.to.y)]
      L.polyline(pts, { color: p.route.color, weight: 10, opacity: 0.15 }).addTo(group)
      L.polyline(pts, {
        color: p.route.color,
        weight: 4,
        opacity: 0.85,
        dashArray: '6 8',
        className: 'route-trail',
      }).addTo(group)
    }

    // Seat marker — always shown.
    L.marker(toLatLng(p.seat.x, p.seat.y), {
      icon: L.divIcon({
        className: '',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        html: `<div style="width:16px;height:16px;border-radius:9999px;background:#7c3aed;border:2px solid #fff;box-shadow:0 0 0 4px rgba(124,58,237,0.25)"></div>`,
      }),
    })
      .addTo(group)
      .bindTooltip(p.seat.label, { direction: 'bottom', offset: [0, 8], className: 'ff-leaflet-tip' })

    // Parking markers.
    p.parkingLots.forEach((lot) => {
      const color = PARKING_STATUS_COLOR[lot.status]
      const m = L.marker(toLatLng(lot.map_x ?? 0, lot.map_y ?? 0), {
        icon: L.divIcon({
          className: '',
          iconSize: [26, 22],
          iconAnchor: [13, 11],
          html: `<div style="width:26px;height:22px;border-radius:6px;background:${color};border:2px solid #fff;color:#fff;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,0.25)">P</div>`,
        }),
      }).addTo(group)
      m.on('click', () => propsRef.current.onSelectParking?.(lot))
      m.bindTooltip(lot.name.replace(' (Recommended)', ''), { direction: 'top', offset: [0, -10], className: 'ff-leaflet-tip' })
    })

    // Support markers.
    p.supportPoints.forEach((sp) => {
      const meta = SUPPORT_META[sp.type]
      const m = L.marker(toLatLng(sp.map_x ?? 0, sp.map_y ?? 0), {
        icon: L.divIcon({
          className: '',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          html: `<div style="width:24px;height:24px;border-radius:9999px;background:${meta.tone};border:2px solid #fff;color:#fff;font-size:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,0.25)">${meta.emoji}</div>`,
        }),
      }).addTo(group)
      m.on('click', () => propsRef.current.onSelectSupport?.(sp))
      m.bindTooltip(sp.name, { direction: 'top', offset: [0, -12], className: 'ff-leaflet-tip' })
    })

    // Gate markers.
    p.gates.forEach((g) => {
      const recommended = g.id === p.recommendedGateId
      const fill = p.gateColors?.[g.id] ?? (recommended ? '#7c3aed' : '#1e293b')
      const num = g.name.match(/Gate (\d+)/)?.[1] ?? '?'
      const m = L.marker(toLatLng(g.map_x ?? 0, g.map_y ?? 0), {
        icon: L.divIcon({
          className: recommended ? 'glow-violet' : '',
          iconSize: [32, 24],
          iconAnchor: [16, 12],
          html: `<div style="width:32px;height:24px;border-radius:6px;background:${fill};border:2px solid #fff;color:#fff;font-weight:800;font-size:11px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,0.25)">${num}</div>`,
        }),
      }).addTo(group)
      m.on('click', () => propsRef.current.onSelectGate?.(g))
      m.bindTooltip(g.name.split(' (')[0], { direction: 'top', offset: [0, -12], className: 'ff-leaflet-tip' })
    })
  }

  return <div ref={elRef} className="h-[340px] w-full rounded-2xl overflow-hidden" />
}
