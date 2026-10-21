import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearEntries, loadEntries } from '../lib/icsStore'
import { ImportPanel } from './ImportPanel'

const ICS = 'BEGIN:VCALENDAR\nEND:VCALENDAR\n'

function icsFile(name: string) {
  return new File([ICS], name, { type: 'text/calendar' })
}

describe('ImportPanel', () => {
  beforeEach(() => {
    clearEntries()
  })

  it('renders the upload field and the URL field', () => {
    render(<ImportPanel />)

    expect(screen.getByLabelText('Upload ICS files')).toBeVisible()
    expect(screen.getByLabelText('Public ICS URL')).toBeVisible()
  })

  it('stores an uploaded file and lists it', async () => {
    const user = userEvent.setup()
    render(<ImportPanel />)

    await user.upload(
      screen.getByLabelText('Upload ICS files'),
      icsFile('friends.ics'),
    )

    expect(await screen.findByText('friends.ics')).toBeVisible()
    await waitFor(() => {
      expect(loadEntries()).toEqual([
        expect.objectContaining({
          name: 'friends.ics',
          source: 'file',
          content: ICS,
        }),
      ])
    })
  })

  it('imports multiple uploaded files and resets the input afterwards', async () => {
    const user = userEvent.setup()
    render(<ImportPanel />)
    const input = screen.getByLabelText<HTMLInputElement>('Upload ICS files')

    await user.upload(input, [icsFile('a.ics'), icsFile('b.ics')])

    expect(await screen.findByText('a.ics')).toBeVisible()
    expect(screen.getByText('b.ics')).toBeVisible()
    expect(input.value).toBe('')
    await waitFor(() => {
      expect(loadEntries()).toHaveLength(2)
    })
  })

  it('fetches a public URL, stores its contents, and resets the field', async () => {
    const fetchMock = vi.fn(async () => new Response(ICS, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    try {
      const user = userEvent.setup()
      render(<ImportPanel />)

      await user.type(
        screen.getByLabelText('Public ICS URL'),
        'https://example.com/calendar.ics',
      )
      await user.click(screen.getByRole('button', { name: 'Add URL' }))

      expect(
        await screen.findByText('https://example.com/calendar.ics'),
      ).toBeVisible()
      expect(screen.getByLabelText('Public ICS URL')).toHaveValue('')
      expect(fetchMock).toHaveBeenCalledWith('https://example.com/calendar.ics')
      await waitFor(() => {
        expect(loadEntries()[0]).toMatchObject({
          name: 'https://example.com/calendar.ics',
          source: 'url',
          content: ICS,
        })
      })
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('shows an error message when fetching fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    try {
      const user = userEvent.setup()
      render(<ImportPanel />)

      await user.type(
        screen.getByLabelText('Public ICS URL'),
        'https://example.com/calendar.ics',
      )
      await user.click(screen.getByRole('button', { name: 'Add URL' }))

      expect(await screen.findByRole('alert')).toBeVisible()
      expect(loadEntries()).toEqual([])
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('explains local storage and clears stored calendars', async () => {
    const user = userEvent.setup()
    render(<ImportPanel />)

    expect(screen.getByText(/never leaves this browser/i)).toBeVisible()
    expect(screen.getByText(/browser\s+settings/i)).toBeVisible()

    await user.upload(
      screen.getByLabelText('Upload ICS files'),
      icsFile('friends.ics'),
    )
    expect(await screen.findByText('friends.ics')).toBeVisible()

    await user.click(
      screen.getByRole('button', { name: /clear stored calendars/i }),
    )

    expect(screen.getByText('Nothing imported yet.')).toBeVisible()
    expect(loadEntries()).toEqual([])
  })
})
