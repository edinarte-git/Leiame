import { useState } from 'react'
import { Download, LogOut, Moon, RotateCcw, Sun, Volume2, VolumeX } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { useAuthStore } from '../../store/authStore'
import * as authService from '../../services/authService'
import { isMockMode, resetMockData } from '../../services/firebaseClient'
import { buildBackup } from '../../services/backupService'
import { todayIsoDate } from '../../lib/date'

const CONFIRM_WORD = 'APAGAR'

export function SettingsScreen() {
  const { profile, user, signOut, refreshProfile } = useAuthStore()
  const [dailyGoal, setDailyGoal] = useState(profile?.default_daily_goal ?? 10)
  const [saving, setSaving] = useState(false)
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  async function saveGoal() {
    if (!user) return
    setSaving(true)
    try {
      await authService.updateProfile(user.uid, { default_daily_goal: dailyGoal })
      await refreshProfile()
    } finally {
      setSaving(false)
    }
  }

  async function toggleTheme() {
    if (!user || !profile) return
    const theme = profile.theme === 'dark' ? 'light' : 'dark'
    await authService.updateProfile(user.uid, { theme })
    await refreshProfile()
  }

  async function toggleSound() {
    if (!user || !profile) return
    await authService.updateProfile(user.uid, { sound_enabled: !profile.sound_enabled })
    await refreshProfile()
  }

  async function exportBackup() {
    if (!user) return
    const backup = await buildBackup(user.uid)
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leiame-backup-${todayIsoDate()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4">
      <h2 className="font-display mb-4 text-xl font-semibold text-text">Ajustes</h2>

      <div className="mb-5 card p-4">
        <p className="mb-1 text-sm font-medium text-text">{profile?.name || 'Leitor(a)'}</p>
        <p className="text-xs text-text-muted">{user?.email}</p>
      </div>

      <div className="mb-5 card p-4">
        <Input
          label="Meta diária padrão (páginas)"
          type="number"
          min={1}
          value={dailyGoal}
          onChange={(e) => setDailyGoal(Number(e.target.value))}
        />
        <Button variant="secondary" fullWidth onClick={saveGoal} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar meta padrão'}
        </Button>
      </div>

      <button
        onClick={toggleTheme}
        className="mb-5 flex w-full items-center justify-between card p-4 text-sm text-text"
      >
        <span className="flex items-center gap-2">
          {profile?.theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
          Tema {profile?.theme === 'dark' ? 'escuro' : 'claro'}
        </span>
        <span className="text-text-muted">Alternar</span>
      </button>

      <button
        onClick={toggleSound}
        className="mb-5 flex w-full items-center justify-between card p-4 text-sm text-text"
      >
        <span className="flex items-center gap-2">
          {profile?.sound_enabled ?? true ? <Volume2 size={16} /> : <VolumeX size={16} />}
          Sons do app {profile?.sound_enabled ?? true ? 'ativados' : 'desativados'}
        </span>
        <span className="text-text-muted">Alternar</span>
      </button>

      <Button variant="danger" fullWidth onClick={signOut}>
        <LogOut size={16} /> Sair
      </Button>

      {isMockMode && (
        <>
          <button
            onClick={exportBackup}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border p-3 text-xs text-text hover:border-accent/50"
          >
            <Download size={14} /> Exportar meus dados (backup)
          </button>

          <button
            onClick={() => {
              setConfirmText('')
              setConfirmingClear(true)
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border p-3 text-xs text-text-muted hover:text-text"
          >
            <RotateCcw size={14} /> Limpar dados de teste local
          </button>
        </>
      )}

      <Modal open={confirmingClear} onClose={() => setConfirmingClear(false)} title="Apagar dados de teste">
        <p className="mb-3 text-sm text-text-muted">
          Isso apaga <strong className="text-text">todos</strong> os dados de teste (usuários, livros, streak, XP,
          conquistas) salvos neste navegador, sem volta. Se este é o único lugar onde seu progresso está salvo, ele
          será perdido.
        </p>
        <Input
          label={`Digite "${CONFIRM_WORD}" para confirmar`}
          placeholder={CONFIRM_WORD}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          autoFocus
        />
        <Button
          variant="danger"
          fullWidth
          disabled={confirmText !== CONFIRM_WORD}
          onClick={() => {
            resetMockData()
            window.location.reload()
          }}
        >
          Confirmar e apagar tudo
        </Button>
      </Modal>
    </div>
  )
}
