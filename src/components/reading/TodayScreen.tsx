import { useEffect, useMemo, useState } from 'react'
import confetti from 'canvas-confetti'
import { Plus, BookOpen, CheckCircle2, Target } from 'lucide-react'
import { BookCoverRing } from '../ui/BookCoverRing'
import { PageStackMeter } from '../ui/PageStackMeter'
import { ReadingMascot } from '../ui/ReadingMascot'
import { Button } from '../ui/Button'
import { RegisterReadingModal } from './RegisterReadingModal'
import { useBooks } from '../../hooks/useBooks'
import { useTodayLog } from '../../hooks/useTodayLog'
import { useAuthStore } from '../../store/authStore'
import { useLogsStore } from '../../store/logsStore'
import { calculateProgress } from '../../logic/calculator'
import { calculateMood } from '../../logic/mood'
import { quoteOfTheDay } from '../../lib/quotes'
import { getBadge } from '../../lib/badges'
import { playChime, playSuccess } from '../../lib/sound'
import { formatDateLong, formatWeekdayDate, greetingForHour, todayIsoDate } from '../../lib/date'
import type { Book, BookStatus } from '../../types'

const STATUS_PILL: Record<BookStatus, { label: string; className: string }> = {
  reading: { label: 'Lendo Agora', className: 'bg-accent/15 text-accent-2 border-accent/30' },
  want_to_read: { label: 'Quero Ler', className: 'bg-surface-2 text-text-muted border-border' },
  paused: { label: 'Pausado', className: 'bg-warning/15 text-warning border-warning/30' },
  completed: { label: 'Concluído', className: 'bg-success/15 text-success border-success/30' },
}

export function TodayScreen({ onAddBook }: { onAddBook: () => void }) {
  const { books } = useBooks()
  const { registerReading, submitting, error } = useTodayLog()
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const logs = useLogsStore((s) => s.logs)
  const fetchLogs = useLogsStore((s) => s.fetchLogs)
  const [activeBook, setActiveBook] = useState<Book | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (user) fetchLogs(user.uid)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid])

  const activeBooks = useMemo(
    () => books.filter((b) => b.status === 'reading' || b.status === 'want_to_read'),
    [books],
  )

  const today = todayIsoDate()
  const pagesReadTodayByBook = useMemo(() => {
    const map = new Map<string, number>()
    for (const log of logs) {
      if (log.date !== today) continue
      map.set(log.book_id, (map.get(log.book_id) ?? 0) + log.pages_read)
    }
    return map
  }, [logs, today])

  const lastLogDateByBook = useMemo(() => {
    const map = new Map<string, string>()
    for (const log of logs) {
      const current = map.get(log.book_id)
      if (!current || log.date > current) map.set(log.book_id, log.date)
    }
    return map
  }, [logs])

  function daysSinceLastLog(bookId: string): number | null {
    const lastDate = lastLogDateByBook.get(bookId)
    if (!lastDate) return null
    const msPerDay = 1000 * 60 * 60 * 24
    const todayDate = new Date(today + 'T00:00:00')
    const lastDateObj = new Date(lastDate + 'T00:00:00')
    return Math.round((todayDate.getTime() - lastDateObj.getTime()) / msPerDay)
  }

  async function handleRegister(pages: number) {
    if (!activeBook) return
    const result = await registerReading(activeBook, pages)
    if (!result) return // erro fica visível no próprio modal; mantém aberto para permitir nova tentativa
    setActiveBook(null)

    if (result.bookJustCompleted || result.newBadgeCodes.length > 0 || result.leveledUp) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } })
      playSuccess()
    } else {
      playChime()
    }

    const messages: string[] = [`+${result.xpGained} pontos`]
    if (result.bookJustCompleted) messages.push(`🎉 Você concluiu "${result.book.title}"!`)
    if (result.leveledUp) messages.push('Você subiu de nível!')
    for (const code of result.newBadgeCodes) {
      const badge = getBadge(code)
      if (badge) messages.push(`Conquista desbloqueada: ${badge.name}`)
    }
    setToast(messages.join(' · '))
    setTimeout(() => setToast(null), 4000)
  }

  function handleSkipToday() {
    setToast('Sem problema! Seu prazo se ajusta sozinho — é só continuar amanhã. 💪')
    setTimeout(() => setToast(null), 4000)
  }

  const quote = quoteOfTheDay()

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4">
      <div className="mb-5">
        <h1 className="font-display text-[28px] font-semibold leading-tight text-text">
          {greetingForHour()}, {profile?.name?.split(' ')[0] || 'Leitor(a)'} 👋
        </h1>
        <p className="text-sm text-text-muted first-letter:uppercase">{formatWeekdayDate()}</p>
      </div>

      <div className="animate-rise relative mb-5 overflow-hidden rounded-2xl border border-border/60 bg-surface/60 px-5 py-4">
        <span
          aria-hidden="true"
          className="font-display pointer-events-none absolute -top-3 left-2 text-6xl italic leading-none text-accent/20"
        >
          &#8220;
        </span>
        <p className="font-display relative text-[15px] italic leading-snug text-text">{quote.text}</p>
        <p className="relative mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-2">
          — {quote.author}
        </p>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-text">Sua leitura de hoje</h2>
        <button onClick={onAddBook} className="flex items-center gap-1 text-sm text-accent">
          <Plus size={16} /> Livro
        </button>
      </div>

      {activeBooks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-10 text-center">
          <BookOpen className="text-text-muted" />
          <p className="text-sm text-text-muted">Nenhum livro em andamento ainda.</p>
          <Button variant="secondary" onClick={onAddBook}>
            Adicionar meu primeiro livro
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {activeBooks.map((book, index) => {
            const progress = calculateProgress(book.total_pages, book.pages_read, book.daily_goal)
            const pagesToday = pagesReadTodayByBook.get(book.id) ?? 0
            const goalMetToday = pagesToday >= book.daily_goal
            const mood = calculateMood({ goalMetToday, daysSinceLastLog: daysSinceLastLog(book.id) })
            const pill = STATUS_PILL[book.status]

            return (
              <li
                key={book.id}
                className="card animate-rise p-3.5"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <BookCoverRing coverUrl={book.cover_url} size={52} strokeWidth={3} />
                    <div className="absolute -bottom-1.5 -right-1.5 rounded-full bg-surface p-[3px]">
                      <ReadingMascot mood={mood} size={22} />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${pill.className}`}>
                        {pill.label}
                      </span>
                      {goalMetToday && (
                        <span className="flex items-center gap-1 rounded-full border border-success/30 bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">
                          <CheckCircle2 size={11} /> Hoje OK
                        </span>
                      )}
                    </div>
                    <h3 className="truncate text-sm font-semibold text-text">{book.title}</h3>
                    <p className="truncate text-xs text-text-muted">{book.author || 'Autor desconhecido'}</p>
                  </div>
                </div>

                {!goalMetToday && (
                  <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg border border-accent/20 bg-accent/10 px-2.5 py-1">
                    <span className="flex items-center gap-1 text-[11px] text-accent-2">
                      <Target size={11} /> Meta de hoje
                    </span>
                    <span className="text-xs font-semibold text-accent-2">
                      {pagesToday}/{book.daily_goal} págs
                    </span>
                  </div>
                )}

                <div className="mt-3">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-text-muted">
                      {progress.pagesRead} / {book.total_pages} páginas
                    </span>
                    <span className="font-semibold text-accent-2">{progress.percentComplete}%</span>
                  </div>
                  <PageStackMeter percentComplete={progress.percentComplete} />
                </div>

                {!progress.isComplete && (
                  <p className="mt-2.5 border-t border-border pt-2.5 text-xs text-text-muted">
                    Restam <span className="font-medium text-text">{progress.remainingPages} págs</span> · previsão{' '}
                    <span className="font-medium text-text">
                      {progress.estimatedCompletionDate && formatDateLong(progress.estimatedCompletionDate)}
                    </span>
                  </p>
                )}

                <div className="mt-2.5 flex flex-col gap-1.5">
                  <Button fullWidth onClick={() => setActiveBook(book)}>
                    Registrar leitura
                  </Button>
                  {!goalMetToday && (
                    <button
                      onClick={handleSkipToday}
                      className="text-center text-xs text-text-muted hover:text-text"
                    >
                      Não li hoje, vou ler amanhã
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <RegisterReadingModal
        key={activeBook?.id ?? 'none'}
        book={activeBook}
        onClose={() => setActiveBook(null)}
        onSubmit={handleRegister}
        submitting={submitting}
        error={error}
      />

      {toast && (
        <div className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md rounded-2xl border border-accent/50 bg-surface px-4 py-3 text-center text-sm text-text shadow-xl shadow-accent/20">
          {toast}
        </div>
      )}
    </div>
  )
}
