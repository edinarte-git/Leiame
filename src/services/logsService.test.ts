import { afterEach, describe, expect, it } from 'vitest'
import { listLogs, upsertTodayLog } from './logsService'
import { resetMockFirestore } from './mockFirestore'
import { todayIsoDate } from '../lib/date'

afterEach(() => {
  resetMockFirestore()
})

describe('logsService.upsertTodayLog', () => {
  it('cria o log de hoje na primeira chamada', async () => {
    const log = await upsertTodayLog('user-1', 'book-1', 10)
    expect(log.pages_read).toBe(10)
    expect(log.date).toBe(todayIsoDate())
    expect(log.book_id).toBe('book-1')
  })

  it('soma páginas em chamadas repetidas no mesmo dia (atômico via increment)', async () => {
    await upsertTodayLog('user-1', 'book-1', 10)
    const second = await upsertTodayLog('user-1', 'book-1', 5)
    expect(second.pages_read).toBe(15)
  })

  it('duas chamadas concorrentes não perdem incremento', async () => {
    await Promise.all([
      upsertTodayLog('user-1', 'book-1', 10),
      upsertTodayLog('user-1', 'book-1', 10),
    ])
    const [log] = await listLogs('user-1')
    expect(log.pages_read).toBe(20)
  })
})

describe('logsService.listLogs', () => {
  it('lista só os logs do usuário informado, ordenados por data', async () => {
    await upsertTodayLog('user-1', 'book-1', 10)
    await upsertTodayLog('user-2', 'book-9', 99)
    const logs = await listLogs('user-1')
    expect(logs).toHaveLength(1)
    expect(logs[0].pages_read).toBe(10)
  })
})
