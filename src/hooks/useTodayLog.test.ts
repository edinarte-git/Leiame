import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useTodayLog } from './useTodayLog'
import { useAuthStore } from '../store/authStore'
import * as logsService from '../services/logsService'
import type { Book } from '../types'
import type { Session } from '@supabase/supabase-js'

vi.mock('../services/logsService')
vi.mock('../services/booksService')
vi.mock('../services/statsService')

const book: Book = {
  id: 'book-1',
  user_id: 'user-1',
  title: 'Duna',
  author: 'Frank Herbert',
  cover_url: null,
  total_pages: 400,
  pages_read: 10,
  daily_goal: 20,
  status: 'reading',
  start_date: '2026-01-01',
  estimated_completion_date: null,
  completed_date: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const fakeSession = { user: { id: 'user-1' } } as unknown as Session

afterEach(() => {
  vi.restoreAllMocks()
  useAuthStore.setState({ session: null })
})

describe('useTodayLog.registerReading', () => {
  it('returns null and exposes an error message when a write fails, instead of throwing', async () => {
    useAuthStore.setState({ session: fakeSession })
    vi.spyOn(logsService, 'upsertTodayLog').mockRejectedValue(new Error('offline'))

    const { result } = renderHook(() => useTodayLog())

    let outcome
    await act(async () => {
      outcome = await result.current.registerReading(book, 10)
    })

    expect(outcome).toBeNull()
    expect(result.current.error).toBe('offline')
    expect(result.current.submitting).toBe(false)
  })
})
