import { afterEach, describe, expect, it, vi } from 'vitest'
import { useLogsStore } from './logsStore'
import * as logsService from '../services/logsService'

vi.mock('../services/logsService')

afterEach(() => {
  vi.restoreAllMocks()
  useLogsStore.setState({ logs: [], loading: false, error: null })
})

describe('logsStore.fetchLogs', () => {
  it('records an error message instead of throwing when the fetch fails', async () => {
    vi.spyOn(logsService, 'listLogs').mockRejectedValue(new Error('offline'))

    await useLogsStore.getState().fetchLogs('user-1')

    expect(useLogsStore.getState().error).toBe('offline')
    expect(useLogsStore.getState().loading).toBe(false)
  })

  it('clears a previous error once a fetch succeeds', async () => {
    useLogsStore.setState({ error: 'offline' })
    vi.spyOn(logsService, 'listLogs').mockResolvedValue([])

    await useLogsStore.getState().fetchLogs('user-1')

    expect(useLogsStore.getState().error).toBeNull()
  })
})
