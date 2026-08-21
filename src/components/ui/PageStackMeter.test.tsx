import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageStackMeter } from './PageStackMeter'

describe('PageStackMeter', () => {
  it('exposes the clamped percentage as an accessible progressbar value', () => {
    render(<PageStackMeter percentComplete={45} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '45')
  })

  it('clamps values outside the 0-100 range', () => {
    render(<PageStackMeter percentComplete={150} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  })

  it('clamps negative values to 0', () => {
    render(<PageStackMeter percentComplete={-10} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })
})
