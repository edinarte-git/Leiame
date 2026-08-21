import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import type { Book } from '../../types'

interface RegisterReadingModalProps {
  book: Book | null
  onClose: () => void
  onSubmit: (pages: number) => Promise<void>
  submitting: boolean
  error?: string | null
}

export function RegisterReadingModal({ book, onClose, onSubmit, submitting, error }: RegisterReadingModalProps) {
  const [pages, setPages] = useState(book?.daily_goal ?? 10)

  if (!book) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onSubmit(pages)
  }

  const remaining = book.total_pages - book.pages_read

  return (
    <Modal open={!!book} onClose={onClose} title={`Registrar leitura`}>
      <p className="mb-4 text-sm text-text-muted">
        <strong className="text-text">{book.title}</strong> — faltam {remaining} páginas
      </p>
      <form onSubmit={handleSubmit}>
        <Input
          label="Páginas lidas hoje"
          type="number"
          min={1}
          max={remaining}
          value={pages}
          onChange={(e) => setPages(Number(e.target.value))}
          autoFocus
        />
        {error && (
          <p className="mb-3 text-sm text-danger">Não foi possível registrar: {error}</p>
        )}
        <Button type="submit" fullWidth disabled={submitting || pages <= 0}>
          {submitting ? 'Registrando...' : 'Registrar'}
        </Button>
      </form>
    </Modal>
  )
}
