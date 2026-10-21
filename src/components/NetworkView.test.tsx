import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Directory } from '../lib/directoryStore'
import type { CalendarEvent, Person } from '../lib/icsParse'
import { NetworkView } from './NetworkView'

const cytoscapeMock = vi.hoisted(() => vi.fn())

vi.mock('cytoscape', () => ({ default: cytoscapeMock }))

const destroy = vi.fn()

function person(identifier: string, givenName = '', familyName = ''): Person {
  return { identifier, givenName, familyName, email: identifier }
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

describe('NetworkView', () => {
  beforeEach(() => {
    cytoscapeMock.mockReset()
    destroy.mockReset()
    cytoscapeMock.mockReturnValue({ destroy })
  })

  it('shows how to get started when nothing is imported', () => {
    render(<NetworkView directory={{ persons: [], events: [] }} />)

    expect(screen.getByRole('heading', { name: 'Your network' })).toBeVisible()
    expect(screen.getByText(/import an ics calendar/i)).toBeVisible()
    expect(cytoscapeMock).not.toHaveBeenCalled()
  })

  it('renders the directory as a network that only zooms', () => {
    render(
      <NetworkView
        directory={{
          persons: [
            person('jane@example.com', 'Jane', 'Doe'),
            person('john@example.com'),
          ],
          events: [event('e1', ['jane@example.com', 'john@example.com'])],
        }}
      />,
    )

    expect(cytoscapeMock).toHaveBeenCalledTimes(1)
    const options = cytoscapeMock.mock.calls[0][0]
    expect(options).toMatchObject({
      zoomingEnabled: true,
      userZoomingEnabled: true,
      panningEnabled: false,
      boxSelectionEnabled: false,
      autoungrabify: true,
      autounselectify: true,
    })
    expect(options.elements).toEqual([
      { data: { id: 'jane@example.com', label: 'Jane Doe' } },
      { data: { id: 'john@example.com', label: 'john@example.com' } },
      { data: { source: 'jane@example.com', target: 'john@example.com' } },
    ])
  })

  it('rebuilds the network when the directory changes', () => {
    const before: Directory = {
      persons: [person('jane@example.com', 'Jane', 'Doe')],
      events: [],
    }
    const after: Directory = {
      persons: [
        person('jane@example.com', 'Jane', 'Doe'),
        person('john@example.com'),
      ],
      events: [event('e1', ['jane@example.com', 'john@example.com'])],
    }

    const { rerender } = render(<NetworkView directory={before} />)
    rerender(<NetworkView directory={after} />)

    expect(destroy).toHaveBeenCalledTimes(1)
    expect(cytoscapeMock).toHaveBeenCalledTimes(2)
    expect(cytoscapeMock.mock.calls[1][0].elements).toEqual([
      { data: { id: 'jane@example.com', label: 'Jane Doe' } },
      { data: { id: 'john@example.com', label: 'john@example.com' } },
      { data: { source: 'jane@example.com', target: 'john@example.com' } },
    ])
  })

  it('destroys the network when it unmounts', () => {
    const { unmount } = render(
      <NetworkView
        directory={{ persons: [person('jane@example.com')], events: [] }}
      />,
    )

    unmount()

    expect(destroy).toHaveBeenCalledTimes(1)
  })
})
