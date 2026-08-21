export interface Quote {
  text: string
  author: string
}

export const MOTIVATIONAL_QUOTES: Quote[] = [
  { text: 'Um leitor vive mil vidas antes de morrer.', author: 'George R. R. Martin' },
  { text: 'Hoje um leitor, amanhã um líder.', author: 'Margaret Fuller' },
  { text: 'Não é sobre terminar rápido, é sobre não parar.', author: 'Leiame' },
  { text: 'Livros são um lampejo silencioso que ilumina as noites de leitura.', author: 'Victor Hugo' },
  { text: 'Ler é sonhar de mãos dadas com um autor.', author: 'Leiame' },
  { text: 'Quem lê muito e anda muito, vê muito e sabe muito.', author: 'Miguel de Cervantes' },
  { text: 'O hábito da leitura é criar para nós um paraíso inacessível ao tédio.', author: 'W. Somerset Maugham' },
  { text: 'Pequenos passos todo dia constroem grandes leitores.', author: 'Leiame' },
]

export function quoteOfTheDay(date: Date = new Date()): Quote {
  const dayIndex = Math.floor(date.getTime() / (1000 * 60 * 60 * 24))
  return MOTIVATIONAL_QUOTES[dayIndex % MOTIVATIONAL_QUOTES.length]
}
