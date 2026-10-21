import type { IcsEntry } from './icsStore'
import {
  mergeParsed,
  parseIcs,
  type CalendarEvent,
  type Person,
} from './icsParse'

/**
 * Persons and events extracted from the raw ICS entries, using the schema.org
 * shapes defined by the parser. Stored alongside the raw entries so network
 * construction does not have to re-parse the calendars on every use.
 */
export interface Directory {
  persons: Person[]
  events: CalendarEvent[]
}

const STORAGE_KEY = 'netzwerkeln:directory'

function isPerson(value: unknown): value is Person {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    typeof record.identifier === 'string' &&
    typeof record.givenName === 'string' &&
    typeof record.familyName === 'string' &&
    typeof record.email === 'string'
  )
}

function isCalendarEvent(value: unknown): value is CalendarEvent {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    typeof record.identifier === 'string' &&
    typeof record.name === 'string' &&
    typeof record.startDate === 'string' &&
    typeof record.endDate === 'string' &&
    typeof record.duration === 'string' &&
    Array.isArray(record.attendees) &&
    record.attendees.every((attendee) => typeof attendee === 'string')
  )
}

/** Read the extracted directory; returns an empty directory when nothing (valid) is stored. */
export function loadDirectory(): Directory {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) {
      return { persons: [], events: [] }
    }
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) {
      return { persons: [], events: [] }
    }
    const record = parsed as Record<string, unknown>
    return {
      persons: Array.isArray(record.persons)
        ? record.persons.filter(isPerson)
        : [],
      events: Array.isArray(record.events)
        ? record.events.filter(isCalendarEvent)
        : [],
    }
  } catch {
    return { persons: [], events: [] }
  }
}

/** Overwrite the stored directory. */
export function saveDirectory(directory: Directory): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(directory))
}

/** Remove the stored directory entirely. */
export function clearDirectory(): void {
  window.localStorage.removeItem(STORAGE_KEY)
}

/**
 * Rebuild the directory from the raw ICS entries and store it. Called whenever
 * the raw entries change so the extracted data always matches them: events
 * with the same identifier follow the newest statement, person fields are
 * merged so information scattered across calendars is not lost.
 */
export function rebuildDirectory(entries: readonly IcsEntry[]): Directory {
  const directory = mergeParsed(entries.map((entry) => parseIcs(entry.content)))
  saveDirectory(directory)
  return directory
}
