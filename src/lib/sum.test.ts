import { describe, expect, it } from 'vitest'
import { sum } from './sum'

describe('sum', () => {
  it('adds two positive numbers', () => {
    expect(sum(1, 2)).toBe(3)
  })

  it('handles negative numbers', () => {
    expect(sum(-1, -2)).toBe(-3)
  })

  it('handles zero', () => {
    expect(sum(0, 0)).toBe(0)
  })
})
