import { beforeEach, describe, expect, it } from 'vitest'
import { loadDirectory } from './directoryStore'
import { clearEntries, createEntry, loadEntries, saveEntries } from './icsStore'

function icsCalendarWithEvent(uid: string, summary: string): string {
  return [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `SUMMARY:${summary}`,
    'DTSTART:20260302T090000Z',
    'DTEND:20260302T100000Z',
    'ATTENDEE;CN=Jane Doe:mailto:jane@example.com',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

describe('icsStore', () => {
  beforeEach(() => {
    clearEntries()
  })

  it('starts empty when nothing is stored', () => {
    expect(loadEntries()).toEqual([])
  })

  it('persists entries in local storage', () => {
    const entry = createEntry({
      name: 'calendar.ics',
      source: 'file',
      content: 'BEGIN:VCALENDAR\nEND:VCALENDAR',
    })
    saveEntries([entry])

    expect(loadEntries()).toEqual([entry])
  })

  it('returns an empty list for corrupted stored data', () => {
    window.localStorage.setItem('netzwerkeln:ics-entries', 'not json')

    expect(loadEntries()).toEqual([])
  })

  it('filters out malformed stored entries', () => {
    window.localStorage.setItem(
      'netzwerkeln:ics-entries',
      JSON.stringify([{ nope: true }, null]),
    )

    expect(loadEntries()).toEqual([])
  })

  it('creates entries with unique ids and an import timestamp', () => {
    const first = createEntry({ name: 'a.ics', source: 'file', content: '' })
    const second = createEntry({
      name: 'https://example.com/b.ics',
      source: 'url',
      content: '',
    })

    expect(first.id).not.toBe(second.id)
    expect(first.source).toBe('file')
    expect(second.source).toBe('url')
    expect(new Date(first.importedAt).getTime()).not.toBeNaN()
  })

  it('rebuilds the extracted directory when raw entries change', () => {
    saveEntries([
      createEntry({
        name: 'a.ics',
        source: 'file',
        content: icsCalendarWithEvent('event-1', 'Old title'),
      }),
    ])
    expect(loadDirectory().events).toHaveLength(1)
    expect(loadDirectory().events[0]).toMatchObject({
      identifier: 'event-1',
      name: 'Old title',
    })

    saveEntries([
      createEntry({
        name: 'a.ics',
        source: 'file',
        content: icsCalendarWithEvent('event-1', 'New title'),
      }),
    ])

    expect(loadDirectory().events).toHaveLength(1)
    expect(loadDirectory().events[0]).toMatchObject({ name: 'New title' })
  })

  it('clears the extracted directory when raw entries are cleared', () => {
    saveEntries([
      createEntry({
        name: 'a.ics',
        source: 'file',
        content: icsCalendarWithEvent('event-1', 'Title'),
      }),
    ])

    clearEntries()

    expect(loadDirectory()).toEqual({ persons: [], events: [] })
  })
})
