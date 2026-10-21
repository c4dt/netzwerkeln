import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the headline', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: /get started/i }),
    ).toBeVisible()
  })

  it('increments the counter when the button is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /count is 0/i }))

    expect(screen.getByRole('button', { name: /count is 1/i })).toBeVisible()
  })
})
