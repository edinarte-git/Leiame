/**
 * Humor do mascote de leitura: reflete se a meta diária de um livro está
 * sendo cumprida, para reforçar visualmente o hábito (como o streak).
 */

export type MoodState = 'radiante' | 'neutro' | 'triste' | 'frustrado'

export interface MoodInput {
  /** true se a meta de hoje já foi atingida para este livro */
  goalMetToday: boolean
  /** dias desde o último registro de leitura deste livro (null = nunca leu) */
  daysSinceLastLog: number | null
}

export function calculateMood({ goalMetToday, daysSinceLastLog }: MoodInput): MoodState {
  if (goalMetToday) return 'radiante'
  if (daysSinceLastLog === null || daysSinceLastLog <= 1) return 'neutro'
  if (daysSinceLastLog === 2) return 'triste'
  return 'frustrado'
}
