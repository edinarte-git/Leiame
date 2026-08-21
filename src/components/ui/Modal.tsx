import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
      <div className="max-h-[90svh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 shadow-2xl shadow-black/50 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-text">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-full p-1.5 text-text-muted hover:bg-surface-2 hover:text-text"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
