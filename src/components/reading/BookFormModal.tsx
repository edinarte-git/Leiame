import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { CoverPicker } from './CoverPicker'
import { useBooksStore } from '../../store/booksStore'
import { useAuthStore } from '../../store/authStore'
import type { Book, NewBook } from '../../types'

interface BookFormModalProps {
  open: boolean
  book?: Book | null
  onClose: () => void
}

export function BookFormModal({ open, book, onClose }: BookFormModalProps) {
  const session = useAuthStore((s) => s.session)
  const profile = useAuthStore((s) => s.profile)
  const addBook = useBooksStore((s) => s.addBook)
  const editBook = useBooksStore((s) => s.editBook)
  const isEditing = !!book

  const [title, setTitle] = useState(book?.title ?? '')
  const [author, setAuthor] = useState(book?.author ?? '')
  const [totalPages, setTotalPages] = useState(book?.total_pages ?? 200)
  const [dailyGoal, setDailyGoal] = useState(book?.daily_goal ?? profile?.default_daily_goal ?? 10)
  const [coverUrl, setCoverUrl] = useState<string | null>(book?.cover_url ?? null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setTitle('')
    setAuthor('')
    setTotalPages(200)
    setDailyGoal(profile?.default_daily_goal ?? 10)
    setCoverUrl(null)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session) return
    setSubmitting(true)
    setError(null)
    try {
      if (isEditing && book) {
        await editBook(book.id, {
          title,
          author,
          total_pages: totalPages,
          daily_goal: dailyGoal,
          cover_url: coverUrl,
        })
      } else {
        const newBook: NewBook = {
          title,
          author,
          total_pages: totalPages,
          daily_goal: dailyGoal,
          cover_url: coverUrl,
          status: 'reading',
        }
        await addBook(session.user.id, newBook)
        reset()
      }
      onClose()
    } catch (err) {
      setError((err as Error).message || 'Não foi possível salvar o livro.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar livro' : 'Adicionar livro'}>
      <form onSubmit={handleSubmit}>
        <CoverPicker value={coverUrl} onChange={setCoverUrl} />
        <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Input label="Autor" value={author} onChange={(e) => setAuthor(e.target.value)} />
        <Input
          label="Total de páginas"
          type="number"
          min={1}
          value={totalPages}
          onChange={(e) => setTotalPages(Number(e.target.value))}
          required
        />
        <Input
          label="Meta diária (páginas)"
          type="number"
          min={1}
          value={dailyGoal}
          onChange={(e) => setDailyGoal(Number(e.target.value))}
          required
        />
        {error && <p className="mb-3 text-sm text-danger">{error}</p>}
        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Adicionar à biblioteca'}
        </Button>
      </form>
    </Modal>
  )
}
