import type { Incident, LiveSignal } from './types'

/**
 * CSV / spreadsheet exporters.
 *
 * Used by the Staff Operations Console to dump signals + incidents to a
 * spreadsheet-friendly file. The format uses standard RFC 4180 quoting so
 * Excel / Google Sheets / Numbers all open it cleanly.
 *
 * Why CSV not XLSX: the Excel format requires a heavy binary library
 * (~200KB). CSV opens in every spreadsheet app, ships in 0 bytes of
 * dependencies, and is the format ops teams actually exchange.
 */

function escapeCsv(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function rowsToCsv(headers: string[], rows: Array<Array<string | number | boolean | null | undefined>>): string {
  const headerLine = headers.map(escapeCsv).join(',')
  const dataLines = rows.map((r) => r.map(escapeCsv).join(','))
  // BOM ensures Excel reads UTF-8 correctly (otherwise emoji and accents break)
  return '﻿' + [headerLine, ...dataLines].join('\r\n')
}

/**
 * Serialize a list of live signals to CSV.
 *
 *   id, gate_id, source, sentiment, message, created_at, weight
 *
 * The `weight` column makes the rule engine's 3× staff multiplier visible
 * to anyone analyzing the export — same number the audit trail shows.
 */
export function signalsToCSV(signals: LiveSignal[]): string {
  const headers = ['id', 'gate_id', 'source', 'sentiment', 'message', 'created_at', 'weight']
  const rows = signals.map((s) => [
    s.id,
    s.gate_id,
    s.source,
    s.sentiment,
    s.message,
    s.created_at,
    s.source === 'staff' ? 3 : 1,
  ])
  return rowsToCsv(headers, rows)
}

/**
 * Serialize incidents to CSV.
 *
 *   id, type, source, gate_id, status, created_at, updated_at, note, action
 */
export function incidentsToCSV(incidents: Incident[]): string {
  const headers = [
    'id',
    'type',
    'source',
    'gate_id',
    'status',
    'created_at',
    'updated_at',
    'note',
    'action',
  ]
  const rows = incidents.map((i) => [
    i.id,
    i.type,
    i.source,
    i.gate_id,
    i.status,
    i.created_at,
    i.updated_at,
    i.note,
    i.action ?? '',
  ])
  return rowsToCsv(headers, rows)
}

/**
 * Browser-side download trigger. Creates an anchor, programmatically
 * clicks it, then revokes the blob URL. Safe to call from a click handler.
 */
export function downloadCSV(filename: string, csvContent: string): void {
  if (typeof window === 'undefined') return
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Give the browser a tick before revoking so the download actually starts
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

/**
 * Compose a timestamped filename. e.g. signals-2026-05-19T03-45-00.csv
 */
export function timestampedFilename(stem: string, ext = 'csv'): string {
  const iso = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace(/\.\d{3}Z$/, '')
    .replace('T', '_')
  return `${stem}-${iso}.${ext}`
}
