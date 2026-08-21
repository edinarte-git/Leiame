import { useState } from 'react'
import { BookMarked } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { GoogleIcon } from '../ui/GoogleIcon'
import { useAuthStore } from '../../store/authStore'
import { isMockMode } from '../../services/firebaseClient'

export function AuthScreen() {
  const { signIn, signUp, signInWithGoogle } = useAuthStore()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [googleSubmitting, setGoogleSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        await signUp(email, password, name)
      } else {
        await signIn(email, password)
      }
    } catch (err) {
      setError((err as Error).message || 'Algo deu errado. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleSignIn() {
    setError(null)
    setGoogleSubmitting(true)
    try {
      await signInWithGoogle()
      // Em caso de sucesso, a página redireciona para o Google — não há o que fazer depois daqui.
    } catch (err) {
      setError((err as Error).message || 'Não foi possível continuar com o Google.')
      setGoogleSubmitting(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <BookMarked size={40} className="text-accent" />
        <h1 className="font-display text-3xl font-semibold text-text">Leiame</h1>
        <p className="text-sm text-text-muted">Leia um pouco todo dia. Sem culpa, sem pressa.</p>
      </div>

      {!isMockMode && (
        <Button
          variant="secondary"
          fullWidth
          onClick={handleGoogleSignIn}
          disabled={googleSubmitting}
          className="mb-4"
        >
          <GoogleIcon />
          {googleSubmitting ? 'Aguarde...' : 'Continuar com Google'}
        </Button>
      )}

      {error && !isMockMode && <p className="mb-3 text-sm text-danger">{error}</p>}

      {isMockMode && (
        <>
          <div className="mb-4 flex items-center gap-3 text-xs text-text-muted">
            <div className="h-px flex-1 bg-border" />
            login por e-mail/senha (modo de teste local)
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="w-full">
            {mode === 'signup' && (
              <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
            )}
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />

            {error && <p className="mb-3 text-sm text-danger">{error}</p>}

            <Button type="submit" fullWidth disabled={submitting}>
              {submitting ? 'Aguarde...' : mode === 'signup' ? 'Criar conta' : 'Entrar'}
            </Button>
          </form>

          <button
            onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
            className="mt-4 text-center text-sm text-text-muted hover:text-text"
          >
            {mode === 'signup' ? 'Já tem conta? Entrar' : 'Ainda não tem conta? Criar conta'}
          </button>
        </>
      )}
    </div>
  )
}
