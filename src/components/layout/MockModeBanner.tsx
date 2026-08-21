import { FlaskConical } from 'lucide-react'
import { isMockMode } from '../../services/firebaseClient'

export function MockModeBanner() {
  if (!isMockMode) return null
  return (
    <div className="flex items-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-2 text-xs text-warning">
      <FlaskConical size={14} className="shrink-0" />
      Modo de teste local — seus dados ficam só neste navegador, nenhum Firebase é usado.
    </div>
  )
}
