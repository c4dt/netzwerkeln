import { describe, expect, it } from 'vitest'
import { parseIcs } from './icsParse'

const lines = (...lines: string[]): string => lines.join('\r\n')

describe('parseIcs', () => {
  it('extracts an event with attendees, dates and a computed duration', () => {
    const parsed = parseIcs(
      lines(
        'BEGIN:VCALENDAR',
        'BEGIN:VEVENT',
        'UID:event-1@example.com',
        'SUMMARY:Team offsite',
        'DTSTART:20260301T090000Z',
        'DTEND:20260301T103000Z',
        'ATTENDEE;CN="Doe, Jane":mailto:jane@example.com',
        'ATTENDEE;CN=John Roe:mailto:john@example.com',
        'END:VEVENT',
        'END:VCALENDAR',
      ),
    )

    expect(parsed.events).toEqual([
      {
        identifier: 'event-1@example.com',
        name: 'Team offsite',
        startDate: '2026-03-01T09:00:00Z',
        endDate: '2026-03-01T10:30:00Z',
        duration: 'PT1H30M',
        attendees: ['jane@example.com', 'john@example.com'],
      },
    ])
    expect(parsed.persons).toEqual([
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

  it('unfolds continuation lines', () => {
    const parsed = parseIcs(
      lines(
        'BEGIN:VEVENT',
        'UID:folded@example.com',
        'SUMMARY:Quarterly pla',
        ' nning day',
      ),
    )

    expect(parsed.events[0]).toMatchObject({ name: 'Quarterly planning day' })
  })

  it('derives the duration of an all-day event from its date range', () => {
    const parsed = parseIcs(
      lines(
        'BEGIN:VEVENT',
        'UID:all-day@example.com',
        'SUMMARY:Conference',
        'DTSTART;VALUE=DATE:20260301',
        'DTEND;VALUE=DATE:20260303',
        'END:VEVENT',
      ),
    )

    expect(parsed.events[0]).toMatchObject({
      startDate: '2026-03-01',
      endDate: '2026-03-03',
      duration: 'P2D',
    })
  })

  it('keeps a provided duration instead of computing one', () => {
    const parsed = parseIcs(
      lines(
        'BEGIN:VEVENT',
        'UID:timed@example.com',
        'DTSTART:20260301T090000Z',
        'DTEND:20260301T113000Z',
        'DURATION:PT45M',
        'END:VEVENT',
      ),
    )

    expect(parsed.events[0]).toMatchObject({ duration: 'PT45M' })
  })

  it('leaves the duration empty when there is no end and no duration', () => {
    const parsed = parseIcs(
      lines(
        'BEGIN:VEVENT',
        'UID:start-only@example.com',
        'DTSTART:20260301T090000Z',
      ),
    )

    expect(parsed.events[0]).toMatchObject({ endDate: '', duration: '' })
  })

  it('keeps floating times as written instead of inventing an offset', () => {
    const parsed = parseIcs(
      lines(
        'BEGIN:VEVENT',
        'UID:tzid@example.com',
        'DTSTART;TZID=Europe/Zurich:20260301T090000',
      ),
    )

    expect(parsed.events[0]).toMatchObject({ startDate: '2026-03-01T09:00:00' })
  })

  it('leaves dates empty when they cannot be read', () => {
    const parsed = parseIcs(
      lines('BEGIN:VEVENT', 'UID:odd@example.com', 'DTSTART:not-a-date'),
    )

    expect(parsed.events[0]).toMatchObject({
      startDate: '',
      endDate: '',
      duration: '',
    })
  })

  it('merges people that share an identifier across events', () => {
    const parsed = parseIcs(
      lines(
        'BEGIN:VEVENT',
        'UID:first@example.com',
        'ATTENDEE:mailto:jane@example.com',
        'END:VEVENT',
        'BEGIN:VEVENT',
        'UID:second@example.com',
        'ATTENDEE;CN="Doe, Jane":mailto:jane@example.com',
        'END:VEVENT',
      ),
    )

    expect(parsed.persons).toEqual([
      {
        identifier: 'jane@example.com',
        givenName: 'Jane',
        familyName: 'Doe',
        email: 'jane@example.com',
      },
    ])
    expect(parsed.events.map((event) => event.attendees)).toEqual([
      ['jane@example.com'],
      ['jane@example.com'],
    ])
  })

  it('derives identifiers from the name or raw value when there is no email', () => {
    const parsed = parseIcs(
      lines(
        'BEGIN:VEVENT',
        'UID:anon@example.com',
        'ATTENDEE;CN=Bob Builder:https://example.com/bob',
        'ATTENDEE:mailto:carol@example.com',
        'END:VEVENT',
      ),
    )

    expect(parsed.persons).toEqual([
      {
        identifier: 'Bob Builder',
        givenName: 'Bob',
        familyName: 'Builder',
        email: '',
      },
      {
        identifier: 'carol@example.com',
        givenName: '',
        familyName: '',
        email: 'carol@example.com',
      },
    ])
  })

  it('handles quoted parameter values containing separators', () => {
    const parsed = parseIcs(
      lines(
        'BEGIN:VEVENT',
        'UID:quoted@example.com',
        'ATTENDEE;CN="Smith; John":mailto:john@example.com',
        'END:VEVENT',
      ),
    )

    expect(parsed.persons).toEqual([
      {
        identifier: 'john@example.com',
        givenName: 'Smith;',
        familyName: 'John',
        email: 'john@example.com',
      },
    ])
  })

  it('treats the organizer as an attendee when they are not listed among the attendees', () => {
    const parsed = parseIcs(
      lines(
        'BEGIN:VEVENT',
        'UID:organized@example.com',
        'ORGANIZER;CN=Alice Orga:mailto:alice@example.com',
        'END:VEVENT',
      ),
    )

    expect(parsed.events[0]).toMatchObject({ attendees: ['alice@example.com'] })
    expect(parsed.persons).toEqual([
      {
        identifier: 'alice@example.com',
        givenName: 'Alice',
        familyName: 'Orga',
        email: 'alice@example.com',
      },
    ])
  })

  it('does not add the organizer twice when they are already an attendee', () => {
    const parsed = parseIcs(
      lines(
        'BEGIN:VEVENT',
        'UID:listed@example.com',
        'ATTENDEE:mailto:alice@example.com',
        'ORGANIZER;CN=Alice Orga:mailto:alice@example.com',
        'END:VEVENT',
      ),
    )

    expect(parsed.events[0]).toMatchObject({ attendees: ['alice@example.com'] })
    expect(parsed.persons).toEqual([
      {
        identifier: 'alice@example.com',
        givenName: 'Alice',
        familyName: 'Orga',
        email: 'alice@example.com',
      },
    ])
  })

  it('skips events without a UID', () => {
    const parsed = parseIcs(lines('BEGIN:VEVENT', 'SUMMARY:No identifier'))

    expect(parsed.events).toEqual([])
    expect(parsed.persons).toEqual([])
  })

  it('replaces an event when the same UID appears again with newer data', () => {
    const parsed = parseIcs(
      lines(
        'BEGIN:VEVENT',
        'UID:updated@example.com',
        'SUMMARY:Old title',
        'DTSTART:20260301T090000Z',
        'END:VEVENT',
        'BEGIN:VEVENT',
        'UID:updated@example.com',
        'SUMMARY:New title',
        'DTSTART:20260302T090000Z',
        'END:VEVENT',
      ),
    )

    expect(parsed.events).toHaveLength(1)
    expect(parsed.events[0]).toMatchObject({
      name: 'New title',
      startDate: '2026-03-02T09:00:00Z',
    })
  })

  it('ignores properties of nested components such as VALARM', () => {
    const parsed = parseIcs(
      lines(
        'BEGIN:VEVENT',
        'UID:alarm@example.com',
        'BEGIN:VALARM',
        'SUMMARY:Alarm',
        'END:VALARM',
      ),
    )

    expect(parsed.events[0]).toMatchObject({ name: '' })
  })

  it('ignores non-event components', () => {
    const parsed = parseIcs(
      lines(
        'BEGIN:VCALENDAR',
        'BEGIN:VTODO',
        'UID:todo@example.com',
        'SUMMARY:A todo',
        'END:VTODO',
        'END:VCALENDAR',
      ),
    )

    expect(parsed).toEqual({ persons: [], events: [] })
  })

  it('returns empty results for empty input', () => {
    expect(parseIcs('')).toEqual({ persons: [], events: [] })
  })
})
