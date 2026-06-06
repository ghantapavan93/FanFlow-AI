'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { PARKING_STATUS_COLOR } from '@/lib/services/parkingService'
import type { Gate, ParkingLot, SupportPoint, SupportType } from '@/lib/types'

/* ─────────────────────────────────────────────────────────────────────────
   SatelliteVenueMap — the "outdoor → our markers" look, completely FREE.

   Uses Leaflet + Esri World Imagery satellite tiles (publicly available, no
   API key — attribution required and shown). Centered on the real venue,
   with our gates / parking / support / seat / route placed on top. This is
   NOT Google Maps or MapsIndoors (both need paid keys/licenses) — it's a
   free, honest equivalent. Marker positions are approximate, simulated demo
   data spread around the venue footprint, clearly labeled in the UI.
   ───────────────────────────────────────────────────────────────────────── */

// Real venue center — MetLife Stadium, East Rutherford NJ.
const CENTER = { lat: 40.8135, lng: -74.0745 }
// Spread our 520×340 art space across a ~1km box around the stadium.
const SPAN_LAT = 0.011
const SPAN_LNG = 0.018

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
  gateColors?: Record<string, string>
  onSelectGate?: (g: Gate) => void
  onSelectSupport?: (s: SupportPoint) => void
  onSelectParking?: (l: ParkingLot) => void
}

export function SatelliteVenueMap(props: Props) {
  const elRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const propsRef = useRef(props)
  propsRef.current = props

  // Map our art coords (0..520, 0..340) onto real lat/lng around the venue.
  const toLatLng = (x: number, y: number) =>
    L.latLng(
      CENTER.lat + ((170 - y) / 340) * SPAN_LAT,
      CENTER.lng + ((x - 260) / 520) * SPAN_LNG,
    )

  useEffect(() => {
    if (!elRef.current || mapRef.current) return
    const map = L.map(elRef.current, { zoomControl: true, attributionControl: true }).setView(
      [CENTER.lat, CENTER.lng],
      16,
    )
    // Free Esri World Imagery satellite tiles (no key; attribution required).
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles © Esri', maxZoom: 19 },
    ).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    setTimeout(() => map.invalidateSize(), 0)
    draw()
    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

    if (p.route) {
      const pts = [toLatLng(p.route.from.x, p.route.from.y), toLatLng(p.route.to.x, p.route.to.y)]
      L.polyline(pts, { color: p.route.color, weight: 10, opacity: 0.2 }).addTo(group)
      L.polyline(pts, {
        color: p.route.color,
        weight: 4,
        opacity: 0.9,
        dashArray: '6 8',
        className: 'route-trail',
      }).addTo(group)
    }

    L.marker(toLatLng(p.seat.x, p.seat.y), {
      icon: L.divIcon({
        className: '',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        html: `<div style="width:16px;height:16px;border-radius:9999px;background:#7c3aed;border:2px solid #fff;box-shadow:0 0 0 4px rgba(124,58,237,0.3)"></div>`,
      }),
    })
      .addTo(group)
      .bindTooltip(p.seat.label, { direction: 'bottom', offset: [0, 8] })

    p.parkingLots.forEach((lot) => {
      const color = PARKING_STATUS_COLOR[lot.status]
      const m = L.marker(toLatLng(lot.map_x ?? 0, lot.map_y ?? 0), {
        icon: L.divIcon({
          className: '',
          iconSize: [26, 22],
          iconAnchor: [13, 11],
          html: `<div style="width:26px;height:22px;border-radius:6px;background:${color};border:2px solid #fff;color:#fff;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 6px rgba(0,0,0,0.4)">P</div>`,
        }),
      }).addTo(group)
      m.on('click', () => propsRef.current.onSelectParking?.(lot))
      m.bindTooltip(lot.name.replace(' (Recommended)', ''), { direction: 'top', offset: [0, -10] })
    })

    p.supportPoints.forEach((sp) => {
      const meta = SUPPORT_META[sp.type]
      const m = L.marker(toLatLng(sp.map_x ?? 0, sp.map_y ?? 0), {
        icon: L.divIcon({
          className: '',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          html: `<div style="width:24px;height:24px;border-radius:9999px;background:${meta.tone};border:2px solid #fff;color:#fff;font-size:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 6px rgba(0,0,0,0.4)">${meta.emoji}</div>`,
        }),
      }).addTo(group)
      m.on('click', () => propsRef.current.onSelectSupport?.(sp))
      m.bindTooltip(sp.name, { direction: 'top', offset: [0, -12] })
    })

    p.gates.forEach((g) => {
      const recommended = g.id === p.recommendedGateId
      const fill = p.gateColors?.[g.id] ?? (recommended ? '#7c3aed' : '#1e293b')
      const num = g.name.match(/Gate (\d+)/)?.[1] ?? '?'
      const m = L.marker(toLatLng(g.map_x ?? 0, g.map_y ?? 0), {
        icon: L.divIcon({
          className: recommended ? 'glow-violet' : '',
          iconSize: [32, 24],
          iconAnchor: [16, 12],
          html: `<div style="width:32px;height:24px;border-radius:6px;background:${fill};border:2px solid #fff;color:#fff;font-weight:800;font-size:11px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 6px rgba(0,0,0,0.4)">${num}</div>`,
        }),
      }).addTo(group)
      m.on('click', () => propsRef.current.onSelectGate?.(g))
      m.bindTooltip(g.name.split(' (')[0], { direction: 'top', offset: [0, -12] })
    })
  }

  return <div ref={elRef} className="h-[340px] w-full rounded-2xl overflow-hidden" />
}
