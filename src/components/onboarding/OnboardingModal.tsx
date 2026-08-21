import { useState } from 'react'
import { Target } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useAuthStore } from '../../store/authStore'

export function OnboardingModal() {
  const { completeOnboarding, profile } = useAuthStore()
  const [dailyGoal, setDailyGoal] = useState(profile?.default_daily_goal ?? 10)
  const [submitting, setSubmitting] = useState(false)

  async function handleContinue() {
    setSubmitting(true)
    try {
      await completeOnboarding(dailyGoal)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-center">
        <Target size={36} className="mx-auto mb-3 text-accent" />
        <h2 className="mb-1 text-lg font-semibold text-text">Bem-vindo(a)!</h2>
        <p className="mb-5 text-sm text-text-muted">
          Quantas páginas você quer ler por dia, em média? Você pode ajustar isso a qualquer momento, por livro.
        </p>
        <Input
          label="Meta diária padrão (páginas)"
          type="number"
          min={1}
          value={dailyGoal}
          onChange={(e) => setDailyGoal(Number(e.target.value))}
        />
        <Button fullWidth onClick={handleContinue} disabled={submitting || dailyGoal <= 0}>
          {submitting ? 'Salvando...' : 'Começar a ler'}
        </Button>
      </div>
    </div>
  )
}
