/**
 * Minimal ICS (RFC 5545) parser that extracts the persons and events needed
 * for network construction. The extracted fields follow the schema.org
 * Person/Event properties from issue #6 and are never invented: when a value
 * cannot be found or derived from the calendar, the field is left empty.
 */

/** A person, using the schema.org/Person properties relevant here. */
export interface Person {
  /** Unique identifier: the email when known, otherwise the calendar's own label for the person. */
  identifier: string
  givenName: string
  familyName: string
  email: string
}

/** An event, using the schema.org/Event properties relevant here. */
export interface CalendarEvent {
  /** Unique identifier: the ICS UID. */
  identifier: string
  name: string
  /** ISO 8601 date or date-time, as written in the calendar (UTC keeps its `Z`). */
  startDate: string
  endDate: string
  /** ISO 8601 duration; computed from the start and end when the calendar provides none. */
  duration: string
  /** Identifiers of the attending persons (schema.org/Event.attendee). */
  attendees: string[]
}

/** Persons and events extracted from ICS contents. */
export interface ParsedIcs {
  persons: Person[]
  events: CalendarEvent[]
}

interface IcsProperty {
  name: string
  params: Record<string, string>
  value: string
}

const DATE_TIME_PATTERN = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/
const DATE_ONLY_PATTERN = /^(\d{4})(\d{2})(\d{2})$/
const NORMALIZED_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z?$/
const NORMALIZED_DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const DURATION_PATTERN =
  /^[+-]?P(?=\d|T\d)(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$/i

/** Parse one raw ICS calendar into persons and events. */
export function parseIcs(content: string): ParsedIcs {
  const persons: Person[] = []
  const events: CalendarEvent[] = []
  for (const properties of eventPropertyBlocks(unfold(content))) {
    const parsed = parseEvent(properties)
    if (parsed === null) {
      continue
    }
    events.push(parsed.event)
    persons.push(...parsed.attendees)
  }
  return { persons: mergePersons(persons), events: latestEvents(events) }
}

/**
 * Combine parsed calendars into one directory view. Events with the same
 * identifier follow the newest statement (later calendars replace earlier
 * ones), while person fields are merged so information scattered across
 * events and calendars is not lost.
 */
export function mergeParsed(parsed: ParsedIcs[]): ParsedIcs {
  const persons: Person[] = []
  const events: CalendarEvent[] = []
  for (const single of parsed) {
    persons.push(...single.persons)
    events.push(...single.events)
  }
  return { persons: mergePersons(persons), events: latestEvents(events) }
}

/**
 * Join RFC 5545 continuation lines (starting with a space or tab) back into
 * their parent line.
 */
function unfold(content: string): string[] {
  const lines: string[] = []
  let current: string | undefined
  for (const rawLine of content.split(/\r?\n/)) {
    if (
      (rawLine.startsWith(' ') || rawLine.startsWith('\t')) &&
      current !== undefined
    ) {
      current += rawLine.slice(1)
    } else {
      if (current !== undefined) {
        lines.push(current)
      }
      current = rawLine
    }
  }
  if (current !== undefined) {
    lines.push(current)
  }
  return lines
}

/** Split on a separator, ignoring separators inside double-quoted values. */
function splitUnquoted(source: string, separator: string): string[] {
  const parts: string[] = []
  let current = ''
  let inQuotes = false
  for (const character of source) {
    if (character === '"') {
      inQuotes = !inQuotes
    } else if (character === separator && !inQuotes) {
      parts.push(current)
      current = ''
      continue
    }
    current += character
  }
  parts.push(current)
  return parts
}

/** Parse a content line like `ATTENDEE;CN="Doe, Jane":mailto:jane@x` into its parts. */
function parseProperty(line: string): IcsProperty | null {
  let separatorIndex = -1
  let inQuotes = false
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"') {
      inQuotes = !inQuotes
    } else if (character === ':' && !inQuotes) {
      separatorIndex = index
      break
    }
  }
  if (separatorIndex === -1) {
    return null
  }
  const [name, ...paramParts] = splitUnquoted(
    line.slice(0, separatorIndex),
    ';',
  )
  const params: Record<string, string> = {}
  for (const part of paramParts) {
    const equalsIndex = part.indexOf('=')
    if (equalsIndex === -1) {
      continue
    }
    const key = part.slice(0, equalsIndex).trim().toUpperCase()
    const value = part
      .slice(equalsIndex + 1)
      .trim()
      .replace(/^"(.*)"$/, '$1')
    if (key !== '') {
      params[key] = value
    }
  }
  return {
    name: name.trim().toUpperCase(),
    params,
    value: line.slice(separatorIndex + 1),
  }
}

/**
 * Collect the properties of every VEVENT. Properties of components nested
 * inside an event (e.g. VALARM) are skipped so they are not mistaken for
 * event properties.
 */
function eventPropertyBlocks(lines: string[]): IcsProperty[][] {
  const blocks: IcsProperty[][] = []
  let current: IcsProperty[] | undefined
  let nesting = 0
  for (const line of lines) {
    const property = parseProperty(line)
    if (property === null) {
      continue
    }
    if (
      property.name === 'BEGIN' &&
      property.value.trim().toUpperCase() === 'VEVENT'
    ) {
      current = []
      nesting = 0
    } else if (current === undefined) {
      continue
    } else if (property.name === 'BEGIN') {
      nesting += 1
    } else if (property.name === 'END') {
      if (nesting > 0) {
        nesting -= 1
      } else {
        blocks.push(current)
        current = undefined
      }
    } else if (nesting === 0) {
      current.push(property)
    }
  }
  // Tolerate a missing END:VEVENT rather than losing the event.
  if (current !== undefined) {
    blocks.push(current)
  }
  return blocks
}

function firstValue(properties: IcsProperty[], name: string): string {
  const property = properties.find((candidate) => candidate.name === name)
  return property === undefined ? '' : property.value.trim()
}

function parseEvent(properties: IcsProperty[]): {
  event: CalendarEvent
  attendees: Person[]
} | null {
  const identifier = firstValue(properties, 'UID')
  // RFC 5545 requires a UID; without one there is no honest unique
  // identifier, so the event is skipped.
  if (identifier === '') {
    return null
  }
  const startDate = normalizeDate(firstValue(properties, 'DTSTART'))
  const endDate = normalizeDate(firstValue(properties, 'DTEND'))
  const providedDuration = normalizeDuration(firstValue(properties, 'DURATION'))
  const duration =
    providedDuration !== ''
      ? providedDuration
      : durationFromRange(startDate, endDate)

  // Only ATTENDEE maps to schema.org's attendee; the organizer is a distinct
  // iCalendar property and is deliberately not treated as an attendee.
  const attendees: Person[] = []
  const attendeeIdentifiers: string[] = []
  for (const property of properties) {
    if (property.name !== 'ATTENDEE') {
      continue
    }
    const person = personFromAttendee(property)
    if (person === null) {
      continue
    }
    attendees.push(person)
    if (!attendeeIdentifiers.includes(person.identifier)) {
      attendeeIdentifiers.push(person.identifier)
    }
  }

  return {
    event: {
      identifier,
      name: firstValue(properties, 'SUMMARY'),
      startDate,
      endDate,
      duration,
      attendees: attendeeIdentifiers,
    },
    attendees,
  }
}

function personFromAttendee(property: IcsProperty): Person | null {
  const rawValue = property.value.trim()
  let email = ''
  if (rawValue.toLowerCase().startsWith('mailto:')) {
    email = rawValue.slice('mailto:'.length)
  } else if (rawValue.includes('@')) {
    email = rawValue
  }
  const name = property.params.CN ?? ''
  const identifier = email !== '' ? email : name !== '' ? name : rawValue
  if (identifier === '') {
    return null
  }
  return { identifier, ...splitName(name), email }
}

/**
 * Derive given and family name from a person label. "Last, First" is treated
 * as the comma form, otherwise the first word is the given name; anything
 * that cannot be split stays in the given name.
 */
function splitName(name: string): { givenName: string; familyName: string } {
  const trimmed = name.trim()
  const commaIndex = trimmed.indexOf(',')
  if (commaIndex !== -1) {
    return {
      familyName: trimmed.slice(0, commaIndex).trim(),
      givenName: trimmed.slice(commaIndex + 1).trim(),
    }
  }
  const spaceIndex = trimmed.indexOf(' ')
  if (spaceIndex !== -1) {
    return {
      givenName: trimmed.slice(0, spaceIndex).trim(),
      familyName: trimmed.slice(spaceIndex + 1).trim(),
    }
  }
  return { givenName: trimmed, familyName: '' }
}

/** Merge people that share an identifier, filling in fields that are still empty. */
function mergePersons(persons: Person[]): Person[] {
  const byIdentifier = new Map<string, Person>()
  for (const person of persons) {
    const existing = byIdentifier.get(person.identifier)
    if (existing === undefined) {
      byIdentifier.set(person.identifier, person)
      continue
    }
    byIdentifier.set(person.identifier, {
      identifier: existing.identifier,
      givenName:
        existing.givenName !== '' ? existing.givenName : person.givenName,
      familyName:
        existing.familyName !== '' ? existing.familyName : person.familyName,
      email: existing.email !== '' ? existing.email : person.email,
    })
  }
  return [...byIdentifier.values()]
}

/** Keep only the newest statement per event identifier, preserving order. */
function latestEvents(events: CalendarEvent[]): CalendarEvent[] {
  const byIdentifier = new Map<string, CalendarEvent>()
  for (const event of events) {
    byIdentifier.set(event.identifier, event)
  }
  return [...byIdentifier.values()]
}

/**
 * Normalize an ICS date or date-time to ISO 8601. UTC times keep their `Z`;
 * floating times are kept without an offset because the calendar's time zone
 * offset cannot be known for sure.
 */
function normalizeDate(value: string): string {
  const trimmed = value.trim()
  const dateTime = DATE_TIME_PATTERN.exec(trimmed)
  if (dateTime !== null) {
    const [, year, month, day, hours, minutes, seconds, utcMarker] = dateTime
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${utcMarker ?? ''}`
  }
  const dateOnly = DATE_ONLY_PATTERN.exec(trimmed)
  if (dateOnly !== null) {
    const [, year, month, day] = dateOnly
    return `${year}-${month}-${day}`
  }
  return ''
}

/** Keep a provided ISO 8601 duration as-is; anything else cannot be trusted and stays empty. */
function normalizeDuration(value: string): string {
  const trimmed = value.trim()
  return DURATION_PATTERN.test(trimmed) ? trimmed : ''
}

/** Compute the duration between a start and an end date, or return '' if impossible. */
function durationFromRange(startDate: string, endDate: string): string {
  const startMs = dateToMs(startDate)
  const endMs = dateToMs(endDate)
  if (startMs === null || endMs === null || endMs < startMs) {
    return ''
  }
  return formatDuration(endMs - startMs)
}

/**
 * Convert a normalized date or date-time to milliseconds. Floating times are
 * treated as UTC; differences between two values from the same calendar
 * remain correct either way.
 */
function dateToMs(value: string): number | null {
  const dateTime = NORMALIZED_DATE_TIME_PATTERN.exec(value)
  if (dateTime !== null) {
    const [, year, month, day, hours, minutes, seconds] = dateTime
    return Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds),
    )
  }
  const dateOnly = NORMALIZED_DATE_ONLY_PATTERN.exec(value)
  if (dateOnly !== null) {
    const [, year, month, day] = dateOnly
    return Date.UTC(Number(year), Number(month) - 1, Number(day))
  }
  return null
}

/** Format milliseconds as an ISO 8601 duration, omitting empty components. */
function formatDuration(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const datePart = days > 0 ? `${days}D` : ''
  const timePart = `${hours > 0 ? `${hours}H` : ''}${minutes > 0 ? `${minutes}M` : ''}${seconds > 0 ? `${seconds}S` : ''}`
  if (datePart === '' && timePart === '') {
    return 'PT0S'
  }
  return `P${datePart}${timePart === '' ? '' : `T${timePart}`}`
}
