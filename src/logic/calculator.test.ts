import { describe, expect, it } from 'vitest'
import { calculateProgress, suggestDailyGoal } from './calculator'

describe('calculateProgress', () => {
  it('calcula progresso parcial e prazo estimado', () => {
    const today = new Date('2026-01-01T00:00:00')
    const result = calculateProgress(300, 100, 20, today)
    expect(result.remainingPages).toBe(200)
    expect(result.percentComplete).toBe(33)
    expect(result.isComplete).toBe(false)
    expect(result.daysRemaining).toBe(10)
    expect(result.estimatedCompletionDate).toBe('2026-01-11')
  })

  it('marca como completo quando pagesRead >= totalPages', () => {
    const result = calculateProgress(300, 300, 20)
    expect(result.isComplete).toBe(true)
    expect(result.percentComplete).toBe(100)
    expect(result.estimatedCompletionDate).toBeNull()
  })

  it('não deixa pagesRead exceder totalPages (entrada inválida)', () => {
    const result = calculateProgress(100, 150, 10)
    expect(result.pagesRead).toBe(100)
    expect(result.isComplete).toBe(true)
  })

  it('não quebra com pagesRead negativo', () => {
    const result = calculateProgress(100, -10, 10)
    expect(result.pagesRead).toBe(0)
    expect(result.remainingPages).toBe(100)
  })

  it('nunca divide por zero mesmo com dailyGoal 0', () => {
    const result = calculateProgress(100, 0, 0)
    expect(result.daysRemaining).toBe(100)
  })

  it('não penaliza dias sem leitura: recalcula sempre a partir de hoje', () => {
    const today = new Date('2026-03-10T00:00:00')
    const result = calculateProgress(200, 50, 10, today)
    expect(result.estimatedCompletionDate).toBe('2026-03-25')
  })
})

describe('suggestDailyGoal', () => {
  it('sugere meta diária para bater uma data-alvo', () => {
    const today = new Date('2026-01-01T00:00:00')
    const target = new Date('2026-01-11T00:00:00')
    expect(suggestDailyGoal(300, 100, target, today)).toBe(20)
  })

  it('retorna pelo menos 1 mesmo com prazo já vencido', () => {
    const today = new Date('2026-01-10T00:00:00')
    const target = new Date('2026-01-01T00:00:00')
    expect(suggestDailyGoal(300, 100, target, today)).toBeGreaterThanOrEqual(1)
  })
})
