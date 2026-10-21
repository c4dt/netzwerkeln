import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearDirectory,
  loadDirectory,
  rebuildDirectory,
  saveDirectory,
} from './directoryStore'
import type { IcsEntry } from './icsStore'

function icsCalendar(...veventLines: string[]): string {
  return [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    ...veventLines,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

function entry(id: string, content: string): IcsEntry {
  return {
    id,
    name: `${id}.ics`,
    source: 'file',
    content,
    importedAt: '2026-10-21T12:00:00.000Z',
  }
}

describe('directoryStore', () => {
  beforeEach(() => {
    clearDirectory()
  })

  it('starts empty when nothing is stored', () => {
    expect(loadDirectory()).toEqual({ persons: [], events: [] })
  })

  it('rebuilds persons and events from the raw entries', () => {
    rebuildDirectory([
      entry(
        'a',
        icsCalendar(
          'UID:e1@example.com',
          'SUMMARY:Standup',
          'DTSTART:20260302T090000Z',
          'DTEND:20260302T091500Z',
          'ATTENDEE;CN=Jane Doe:mailto:jane@example.com',
        ),
      ),
      entry(
        'b',
        icsCalendar(
          'UID:e2@example.com',
          'SUMMARY:Retro',
          'DTSTART:20260302T140000Z',
          'DTEND:20260302T150000Z',
          'ATTENDEE:mailto:jane@example.com',
          'ATTENDEE;CN=John Roe:mailto:john@example.com',
        ),
      ),
    ])

    const directory = loadDirectory()
    expect(directory.events.map((event) => event.identifier)).toEqual([
      'e1@example.com',
      'e2@example.com',
    ])
    expect(directory.persons).toEqual([
      {
        identifier: 'jane@example.com',
        givenName: 'Jane',
        familyName: 'Doe',
        email: 'jane@example.com',
      },
      {
        identifier: 'john@example.com',
        givenName: 'John',
        familyName: 'Roe',
        email: 'john@example.com',
      },
    ])
  })

  it('replaces events when a newer entry restates the same identifier', () => {
    rebuildDirectory([
      entry(
        'a',
        icsCalendar(
          'UID:e1@example.com',
          'SUMMARY:Old',
          'DTSTART:20260302T090000Z',
        ),
      ),
    ])
    rebuildDirectory([
      entry(
        'b',
        icsCalendar(
          'UID:e1@example.com',
          'SUMMARY:New',
          'DTSTART:20260302T100000Z',
        ),
      ),
    ])

    expect(loadDirectory().events).toEqual([
      {
        identifier: 'e1@example.com',
        name: 'New',
        startDate: '2026-03-02T10:00:00Z',
        endDate: '',
        duration: '',
        attendees: [],
      },
    ])
  })

  it('returns an empty directory for corrupted stored data', () => {
    window.localStorage.setItem('netzwerkeln:directory', 'not json')

    expect(loadDirectory()).toEqual({ persons: [], events: [] })
  })

  it('drops malformed stored persons and events', () => {
    window.localStorage.setItem(
      'netzwerkeln:directory',
      JSON.stringify({
        persons: [
          {
            identifier: 'p1',
            givenName: 'Jane',
            familyName: 'Doe',
            email: 'jane@example.com',
          },
          { nope: true },
          null,
        ],
        events: [
          {
            identifier: 'e1',
            name: '',
            startDate: '',
            endDate: '',
            duration: '',
            attendees: ['p1'],
          },
          { identifier: 42 },
        ],
      }),
    )

    expect(loadDirectory()).toEqual({
      persons: [
        {
          identifier: 'p1',
          givenName: 'Jane',
          familyName: 'Doe',
          email: 'jane@example.com',
        },
      ],
      events: [
        {
          identifier: 'e1',
          name: '',
          startDate: '',
          endDate: '',
          duration: '',
          attendees: ['p1'],
        },
      ],
    })
  })

  it('round-trips a saved directory', () => {
    const directory = {
      persons: [
        {
          identifier: 'p1',
          givenName: 'Jane',
          familyName: 'Doe',
          email: 'jane@example.com',
        },
      ],
      events: [
        {
          identifier: 'e1',
          name: 'Standup',
          startDate: '2026-03-02T09:00:00Z',
          endDate: '2026-03-02T09:15:00Z',
          duration: 'PT15M',
          attendees: ['p1'],
        },
      ],
    }
    saveDirectory(directory)

    expect(loadDirectory()).toEqual(directory)
  })
})
