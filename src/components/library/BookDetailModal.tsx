import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { BookCoverRing } from '../ui/BookCoverRing'
import { PageStackMeter } from '../ui/PageStackMeter'
import { calculateProgress } from '../../logic/calculator'
import { formatDateLong, todayIsoDate } from '../../lib/date'
import { useBooksStore } from '../../store/booksStore'
import { useAuthStore } from '../../store/authStore'
import type { Book, BookStatus } from '../../types'

const STATUS_LABEL: Record<BookStatus, string> = {
  want_to_read: 'Quero ler',
  reading: 'Lendo',
  paused: 'Pausado',
  completed: 'Concluído',
}

interface BookDetailModalProps {
  book: Book | null
  onClose: () => void
  onEdit: (book: Book) => void
}

export function BookDetailModal({ book, onClose, onEdit }: BookDetailModalProps) {
  const editBook = useBooksStore((s) => s.editBook)
  const removeBook = useBooksStore((s) => s.removeBook)
  const user = useAuthStore((s) => s.user)
  const [busy, setBusy] = useState(false)

  if (!book) return null

  const progress = calculateProgress(book.total_pages, book.pages_read, book.daily_goal)

  async function setStatus(status: BookStatus) {
    if (!book || !user) return
    setBusy(true)
    try {
      await editBook(user.uid, book.id, {
        status,
        start_date: status === 'reading' && !book.start_date ? todayIsoDate() : book.start_date,
      })
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!book || !user) return
    if (!confirm(`Remover "${book.title}" da sua biblioteca?`)) return
    setBusy(true)
    try {
      await removeBook(user.uid, book.id)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={!!book} onClose={onClose} title={book.title}>
      <div className="mb-4 flex items-center gap-4">
        <BookCoverRing coverUrl={book.cover_url} size={64} strokeWidth={5} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-text-muted">{book.author || 'Autor desconhecido'}</p>
          <p className="text-sm text-text">
            {book.pages_read}/{book.total_pages} páginas
          </p>
          {progress.estimatedCompletionDate && (
            <p className="text-xs text-text-muted">Previsão: {formatDateLong(progress.estimatedCompletionDate)}</p>
          )}
        </div>
        <button
          onClick={() => onEdit(book)}
          aria-label="Editar livro"
          className="shrink-0 rounded-full p-2 text-text-muted hover:bg-surface-2 hover:text-text"
        >
          <Pencil size={16} />
        </button>
      </div>

      <div className="mb-4">
        <PageStackMeter percentComplete={progress.percentComplete} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(STATUS_LABEL) as BookStatus[]).map((status) => (
          <button
            key={status}
            disabled={busy}
            onClick={() => setStatus(status)}
            className={`rounded-full border px-3 py-1.5 text-xs ${
              book.status === status
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border text-text-muted hover:text-text'
            }`}
          >
            {STATUS_LABEL[status]}
          </button>
        ))}
      </div>

      <Button variant="danger" fullWidth onClick={handleDelete} disabled={busy}>
        Remover livro
      </Button>
    </Modal>
  )
}
