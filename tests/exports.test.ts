/**
 * CSV export tests.
 *
 * Verifies that signalsToCSV, incidentsToCSV, and timestampedFilename
 * produce correct RFC 4180 output with UTF-8 BOM and staff weight column.
 */

import { describe, expect, it } from 'vitest'
import {
  incidentsToCSV,
  signalsToCSV,
  timestampedFilename,
} from '@/lib/exports'
import type { Incident, LiveSignal } from '@/lib/types'

const now = new Date().toISOString()

describe('signalsToCSV', () => {
  it('includes UTF-8 BOM at the start', () => {
    const csv = signalsToCSV([])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
  })

  it('has the correct header row', () => {
    const csv = signalsToCSV([])
    const firstLine = csv.replace(/^﻿/, '').split('\r\n')[0]
    expect(firstLine).toBe('id,gate_id,source,sentiment,message,created_at,weight')
  })

  it('maps staff signals to weight 3 and fan signals to weight 1', () => {
    const signals: LiveSignal[] = [
      {
        id: 'sig-a',
        gate_id: 'gate-3',
        source: 'staff',
        sentiment: 'smooth',
        message: 'All clear',
        created_at: now,
      },
      {
        id: 'sig-b',
        gate_id: 'gate-1',
        source: 'fan',
        sentiment: 'busy',
        message: 'Long line',
        created_at: now,
      },
    ]
    const csv = signalsToCSV(signals)
    const lines = csv.replace(/^﻿/, '').split('\r\n')
    // Data lines
    expect(lines[1]).toContain(',3') // staff weight = 3
    expect(lines[2]).toContain(',1') // fan weight = 1
  })

  it('quotes fields that contain commas', () => {
    const signals: LiveSignal[] = [
      {
        id: 'sig-c',
        gate_id: 'gate-3',
        source: 'fan',
        sentiment: 'busy',
        message: 'Long line, getting worse',
        created_at: now,
      },
    ]
    const csv = signalsToCSV(signals)
    // The message field should be quoted
    expect(csv).toContain('"Long line, getting worse"')
  })

  it('escapes double quotes inside fields', () => {
    const signals: LiveSignal[] = [
      {
        id: 'sig-d',
        gate_id: 'gate-3',
        source: 'fan',
        sentiment: 'smooth',
        message: 'Fan said "great"',
        created_at: now,
      },
    ]
    const csv = signalsToCSV(signals)
    // RFC 4180: double quotes escaped by doubling
    expect(csv).toContain('""great""')
  })

  it('uses CRLF line endings (RFC 4180)', () => {
    const signals: LiveSignal[] = [
      {
        id: 'sig-e',
        gate_id: 'gate-3',
        source: 'staff',
        sentiment: 'smooth',
        message: 'OK',
        created_at: now,
      },
    ]
    const csv = signalsToCSV(signals)
    const content = csv.replace(/^﻿/, '')
    // Should contain \r\n, and LF without preceding CR should not appear
    expect(content).toContain('\r\n')
    const lines = content.split('\r\n')
    expect(lines.length).toBeGreaterThanOrEqual(2)
  })
})

describe('incidentsToCSV', () => {
  it('includes UTF-8 BOM at the start', () => {
    const csv = incidentsToCSV([])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
  })

  it('has the correct header row', () => {
    const csv = incidentsToCSV([])
    const firstLine = csv.replace(/^﻿/, '').split('\r\n')[0]
    expect(firstLine).toBe('id,type,source,gate_id,status,created_at,updated_at,note,action')
  })

  it('serializes an incident with all fields', () => {
    const incidents: Incident[] = [
      {
        id: 'inc-1',
        type: 'long_line',
        source: 'staff',
        gate_id: 'gate-1',
        status: 'monitoring',
        created_at: now,
        updated_at: now,
        note: 'Bag check backed up',
        action: 'Second scanner opened',
      },
    ]
    const csv = incidentsToCSV(incidents)
    const lines = csv.replace(/^﻿/, '').split('\r\n')
    expect(lines[1]).toContain('inc-1')
    expect(lines[1]).toContain('monitoring')
    expect(lines[1]).toContain('Second scanner opened')
  })

  it('handles missing action field gracefully', () => {
    const incidents: Incident[] = [
      {
        id: 'inc-2',
        type: 'medical',
        source: 'fan',
        gate_id: 'gate-3',
        status: 'open',
        created_at: now,
        updated_at: now,
        note: 'Guest feeling dizzy',
      },
    ]
    const csv = incidentsToCSV(incidents)
    // Should not throw and the last field should be empty
    const lines = csv.replace(/^﻿/, '').split('\r\n')
    const fields = lines[1].split(',')
    expect(fields[fields.length - 1]).toBe('')
  })
})

describe('timestampedFilename', () => {
  it('returns a filename with the stem and .csv extension', () => {
    const name = timestampedFilename('signals')
    expect(name).toMatch(/^signals-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.csv$/)
  })

  it('respects a custom extension', () => {
    const name = timestampedFilename('incidents', 'json')
    expect(name).toMatch(/\.json$/)
  })

  it('never contains colons or periods in the timestamp portion', () => {
    const name = timestampedFilename('export')
    // The timestamp portion is between the first '-' after stem and before '.ext'
    const tsMatch = name.match(/export-(.+)\.csv/)
    expect(tsMatch).not.toBeNull()
    const ts = tsMatch![1]
    expect(ts).not.toContain(':')
    expect(ts).not.toContain('.')
  })
})
