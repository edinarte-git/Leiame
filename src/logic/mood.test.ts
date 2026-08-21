import { describe, expect, it } from 'vitest'
import { calculateMood } from './mood'

describe('calculateMood', () => {
  it('fica radiante quando a meta de hoje foi batida', () => {
    expect(calculateMood({ goalMetToday: true, daysSinceLastLog: 0 })).toBe('radiante')
  })

  it('fica radiante mesmo sem log de hoje, se a meta já foi batida antes de outro registro', () => {
    // goalMetToday é a fonte da verdade para "hoje"; daysSinceLastLog não sobrepõe.
    expect(calculateMood({ goalMetToday: true, daysSinceLastLog: 2 })).toBe('radiante')
  })

  it('fica neutro quando ainda não leu hoje mas leu ontem', () => {
    expect(calculateMood({ goalMetToday: false, daysSinceLastLog: 1 })).toBe('neutro')
  })

  it('fica neutro quando nunca leu ainda (livro novo, sem histórico)', () => {
    expect(calculateMood({ goalMetToday: false, daysSinceLastLog: null })).toBe('neutro')
  })

  it('fica triste quando pulou 2 dias sem ler', () => {
    expect(calculateMood({ goalMetToday: false, daysSinceLastLog: 2 })).toBe('triste')
  })

  it('fica frustrado quando pulou 3 ou mais dias sem ler', () => {
    expect(calculateMood({ goalMetToday: false, daysSinceLastLog: 3 })).toBe('frustrado')
    expect(calculateMood({ goalMetToday: false, daysSinceLastLog: 10 })).toBe('frustrado')
  })
})
