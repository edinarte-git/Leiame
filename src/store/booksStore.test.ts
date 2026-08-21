import { afterEach, describe, expect, it, vi } from 'vitest'
import { useBooksStore } from './booksStore'
import * as booksService from '../services/booksService'

vi.mock('../services/booksService')

afterEach(() => {
  vi.restoreAllMocks()
  useBooksStore.setState({ books: [], loading: false, error: null })
})

describe('booksStore.fetchBooks', () => {
  it('records an error message instead of throwing when the fetch fails', async () => {
    vi.spyOn(booksService, 'listBooks').mockRejectedValue(new Error('offline'))

    await useBooksStore.getState().fetchBooks('user-1')

    expect(useBooksStore.getState().error).toBe('offline')
    expect(useBooksStore.getState().loading).toBe(false)
  })

  it('clears a previous error once a fetch succeeds', async () => {
    useBooksStore.setState({ error: 'offline' })
    vi.spyOn(booksService, 'listBooks').mockResolvedValue([])

    await useBooksStore.getState().fetchBooks('user-1')

    expect(useBooksStore.getState().error).toBeNull()
  })
})
