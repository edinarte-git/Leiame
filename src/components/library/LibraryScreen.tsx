import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useBooks } from '../../hooks/useBooks'
import { BookCoverRing } from '../ui/BookCoverRing'
import { PageStackMeter } from '../ui/PageStackMeter'
import { BookDetailModal } from './BookDetailModal'
import { calculateProgress } from '../../logic/calculator'
import type { Book, BookStatus } from '../../types'

const TABS: { value: BookStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'reading', label: 'Lendo' },
  { value: 'want_to_read', label: 'Quero ler' },
  { value: 'paused', label: 'Pausados' },
  { value: 'completed', label: 'Concluídos' },
]

interface LibraryScreenProps {
  onAddBook: () => void
  onEditBook: (book: Book) => void
}

export function LibraryScreen({ onAddBook, onEditBook }: LibraryScreenProps) {
  const { books, error } = useBooks()
  const [tab, setTab] = useState<BookStatus | 'all'>('all')
  const [selected, setSelected] = useState<Book | null>(null)

  const filtered = useMemo(
    () => (tab === 'all' ? books : books.filter((b) => b.status === tab)),
    [books, tab],
  )

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-text">Biblioteca</h2>
        <button onClick={onAddBook} className="flex items-center gap-1 text-sm text-accent">
          <Plus size={16} /> Livro
        </button>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs ${
              tab === t.value ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          Não foi possível carregar seus livros: {error}
        </p>
      )}

      {filtered.length === 0 && !error ? (
        <p className="py-10 text-center text-sm text-text-muted">Nenhum livro nessa categoria ainda.</p>
      ) : filtered.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {filtered.map((book, index) => {
            const progress = calculateProgress(book.total_pages, book.pages_read, book.daily_goal)
            return (
              <li key={book.id} className="animate-rise" style={{ animationDelay: `${index * 50}ms` }}>
                <button
                  onClick={() => setSelected(book)}
                  className="flex w-full items-center gap-3 card p-3 text-left"
                >
                  <BookCoverRing coverUrl={book.cover_url} size={44} strokeWidth={4} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">{book.title}</p>
                    <p className="truncate text-xs text-text-muted">{book.author || 'Autor desconhecido'}</p>
                    <div className="mt-1.5">
                      <PageStackMeter percentComplete={progress.percentComplete} barCount={20} heightPx={12} />
                    </div>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}

      <BookDetailModal
        book={selected}
        onClose={() => setSelected(null)}
        onEdit={(book) => {
          setSelected(null)
          onEditBook(book)
        }}
      />
    </div>
  )
}
