import { beforeEach, describe, expect, it } from 'vitest'
import { clearEntries, createEntry, loadEntries, saveEntries } from './icsStore'

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
})
