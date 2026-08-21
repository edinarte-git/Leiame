import { useRef, useState } from 'react'
import { Camera, ImageUp, BookOpen, X } from 'lucide-react'
import { fileToCompressedDataUrl } from '../../lib/image'

interface CoverPickerProps {
  value: string | null
  onChange: (dataUrl: string | null) => void
}

export function CoverPicker({ value, onChange }: CoverPickerProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      const dataUrl = await fileToCompressedDataUrl(file)
      onChange(dataUrl)
    } catch (err) {
      setError((err as Error).message || 'Não foi possível processar a foto.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-3">
      <span className="mb-2 block text-sm text-text-muted">Capa do livro</span>
      <div className="flex items-center gap-3">
        <div className="flex h-20 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-2">
          {value ? (
            <img src={value} alt="Capa selecionada" className="h-full w-full object-cover" />
          ) : (
            <BookOpen size={20} className="text-text-muted" />
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2 py-2 text-xs text-text hover:border-accent disabled:opacity-50"
            >
              <Camera size={14} /> Tirar foto
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => galleryInputRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2 py-2 text-xs text-text hover:border-accent disabled:opacity-50"
            >
              <ImageUp size={14} /> Galeria
            </button>
          </div>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="flex items-center gap-1 self-start text-xs text-text-muted hover:text-danger"
            >
              <X size={12} /> Remover capa
            </button>
          )}
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  )
}
