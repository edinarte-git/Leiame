export function formatDateLong(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00')
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

export function formatWeekdayDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
}

export function greetingForHour(date: Date = new Date()): string {
  const hour = date.getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

/** Formata uma data como YYYY-MM-DD usando os componentes locais (não UTC). */
export function localIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayIsoDate(date: Date = new Date()): string {
  return localIsoDate(date)
}
