import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SettingsScreen } from './SettingsScreen'
import * as mockDb from '../../services/mockDb'

vi.mock('../../services/firebaseClient', () => ({ isMockMode: true, auth: {}, db: {} }))
vi.mock('../../services/mockDb')
vi.mock('../../services/authService')

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SettingsScreen - limpar dados de teste', () => {
  it('não apaga nada só com o clique inicial no botão', () => {
    render(<SettingsScreen />)

    fireEvent.click(screen.getByText('Limpar dados de teste local'))

    expect(mockDb.resetMockData).not.toHaveBeenCalled()
  })

  it('só apaga depois de digitar a palavra de confirmação e confirmar', () => {
    const reload = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    })
    render(<SettingsScreen />)

    fireEvent.click(screen.getByText('Limpar dados de teste local'))
    fireEvent.change(screen.getByPlaceholderText('APAGAR'), { target: { value: 'APAGAR' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    expect(mockDb.resetMockData).toHaveBeenCalled()
  })
})
