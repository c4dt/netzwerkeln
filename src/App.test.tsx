import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { clearEntries } from './lib/icsStore'
import App from './App'

describe('App', () => {
  beforeEach(() => {
    clearEntries()
  })

  it('renders the headline and the ICS import panel', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'netzwerkeln' }),
    ).toBeVisible()
    expect(
      screen.getByRole('heading', { level: 2, name: /import calendars/i }),
    ).toBeVisible()
    expect(screen.getByLabelText('Upload ICS files')).toBeVisible()
  })

  it('shows how to get started when nothing is imported yet', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 2, name: /your network/i }),
    ).toBeVisible()
    expect(screen.getByText(/import an ics calendar/i)).toBeVisible()
  })
})
