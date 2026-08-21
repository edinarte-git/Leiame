import type { BadgeDef } from '../types'

export const BADGES: BadgeDef[] = [
  { code: 'first_log', name: 'Primeira Página', description: 'Registrou sua primeira leitura.', icon: 'BookOpen' },
  { code: 'streak_3', name: 'Pegando o Ritmo', description: '3 dias seguidos de leitura.', icon: 'Flame' },
  { code: 'streak_7', name: 'Semana Completa', description: '7 dias seguidos de leitura.', icon: 'Flame' },
  { code: 'streak_30', name: 'Hábito Formado', description: '30 dias seguidos de leitura.', icon: 'Flame' },
  { code: 'streak_100', name: 'Leitor Lendário', description: '100 dias seguidos de leitura.', icon: 'Flame' },
  { code: 'first_book', name: 'Primeira Conquista', description: 'Concluiu seu primeiro livro.', icon: 'Trophy' },
  { code: 'books_5', name: 'Estante Cheia', description: 'Concluiu 5 livros.', icon: 'Library' },
  { code: 'books_10', name: 'Colecionador de Histórias', description: 'Concluiu 10 livros.', icon: 'Library' },
  { code: 'pages_100', name: 'Cem Páginas', description: 'Leu 100 páginas ao todo.', icon: 'Sparkles' },
  { code: 'pages_500', name: 'Meio Milhar', description: 'Leu 500 páginas ao todo.', icon: 'Sparkles' },
  { code: 'pages_1000', name: 'Milhar de Páginas', description: 'Leu 1.000 páginas ao todo.', icon: 'Sparkles' },
  { code: 'pages_5000', name: 'Devorador de Livros', description: 'Leu 5.000 páginas ao todo.', icon: 'Sparkles' },
  { code: 'mind_5', name: 'Mente Afiada', description: 'Alcançou o nível 5 em Mente.', icon: 'Brain' },
  { code: 'writing_5', name: 'Pena Afiada', description: 'Alcançou o nível 5 em Escrita.', icon: 'PenLine' },
  { code: 'speaking_5', name: 'Voz Confiante', description: 'Alcançou o nível 5 em Oratória.', icon: 'Mic' },
  { code: 'knowledge_5', name: 'Sabedoria em Expansão', description: 'Alcançou o nível 5 em Conhecimento.', icon: 'GraduationCap' },
]

export function getBadge(code: string): BadgeDef | undefined {
  return BADGES.find((b) => b.code === code)
}
