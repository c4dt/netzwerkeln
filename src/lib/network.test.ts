import { describe, expect, it } from 'vitest'
import type { Directory } from './directoryStore'
import type { CalendarEvent, Person } from './icsParse'
import { buildNetwork, personLabel } from './network'

function person(identifier: string, givenName = '', familyName = ''): Person {
  return {
    identifier,
    givenName,
    familyName,
    email: identifier.includes('@') ? identifier : '',
  }
}

function event(identifier: string, attendees: string[]): CalendarEvent {
  return {
    identifier,
    name: '',
    startDate: '',
    endDate: '',
    duration: '',
    attendees,
  }
}

function directory(persons: Person[], events: CalendarEvent[]): Directory {
  return { persons, events }
}

describe('personLabel', () => {
  it('joins the given and family name', () => {
    expect(personLabel(person('jane@example.com', 'Jane', 'Doe'))).toBe(
      'Jane Doe',
    )
  })

  it('keeps the parts that exist', () => {
    expect(personLabel(person('jane@example.com', 'Jane'))).toBe('Jane')
    expect(personLabel(person('jane@example.com', '', 'Doe'))).toBe('Doe')
  })

  it('falls back to the identifier when the person has no name', () => {
    expect(personLabel(person('jane@example.com'))).toBe('jane@example.com')
  })
})

describe('buildNetwork', () => {
  it('creates one node per person with a derived label', () => {
    const graph = buildNetwork(
      directory([person('jane@example.com', 'Jane', 'Doe')], []),
    )

    expect(graph).toEqual({
      nodes: [{ id: 'jane@example.com', label: 'Jane Doe' }],
      edges: [],
    })
  })

  it('connects all persons that attended an event together', () => {
    const graph = buildNetwork(
      directory(
        [person('jane@example.com'), person('john@example.com')],
        [event('e1', ['jane@example.com', 'john@example.com'])],
      ),
    )

    expect(graph.edges).toEqual([
      { source: 'jane@example.com', target: 'john@example.com' },
    ])
  })

  it('creates a single edge when two persons share several events', () => {
    const graph = buildNetwork(
      directory(
        [person('jane@example.com'), person('john@example.com')],
        [
          event('e1', ['jane@example.com', 'john@example.com']),
          event('e2', ['john@example.com', 'jane@example.com']),
        ],
      ),
    )

    expect(graph.edges).toEqual([
      { source: 'jane@example.com', target: 'john@example.com' },
    ])
  })

  it('connects every pair of attendees of a larger meeting', () => {
    const graph = buildNetwork(
      directory(
        [
          person('jane@example.com'),
          person('john@example.com'),
          person('carol@example.com'),
        ],
        [
          event('e1', [
            'jane@example.com',
            'john@example.com',
            'carol@example.com',
          ]),
        ],
      ),
    )

    expect(graph.edges).toEqual([
      { source: 'carol@example.com', target: 'jane@example.com' },
      { source: 'carol@example.com', target: 'john@example.com' },
      { source: 'jane@example.com', target: 'john@example.com' },
    ])
  })

  it('keeps persons without shared events as isolated nodes', () => {
    const graph = buildNetwork(
      directory(
        [person('jane@example.com'), person('john@example.com')],
        [event('e1', ['jane@example.com'])],
      ),
    )

    expect(graph.nodes).toEqual([
      { id: 'jane@example.com', label: 'jane@example.com' },
      { id: 'john@example.com', label: 'john@example.com' },
    ])
    expect(graph.edges).toEqual([])
  })

  it('ignores attendees that are not in the directory', () => {
    const graph = buildNetwork(
      directory(
        [person('jane@example.com')],
        [event('e1', ['jane@example.com', 'stranger@example.com'])],
      ),
    )

    expect(graph.nodes).toEqual([
      { id: 'jane@example.com', label: 'jane@example.com' },
    ])
    expect(graph.edges).toEqual([])
  })

  it('builds an empty network for an empty directory', () => {
    expect(buildNetwork(directory([], []))).toEqual({ nodes: [], edges: [] })
  })
})
