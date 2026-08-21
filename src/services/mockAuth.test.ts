import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  resetMockAuth,
  signInWithEmailAndPassword,
  signInWithGoogleRedirect,
  signOutUser,
} from './mockAuth'

afterEach(() => {
  resetMockAuth()
})

describe('mockAuth', () => {
  it('cria um usuário novo e inicia a sessão', async () => {
    const { user } = await createUserWithEmailAndPassword({}, 'ana@example.com', 'senha123')
    expect(user.email).toBe('ana@example.com')
    expect(user.uid).toBeTruthy()
  })

  it('rejeita cadastro com e-mail já usado', async () => {
    await createUserWithEmailAndPassword({}, 'ana@example.com', 'senha123')
    await expect(createUserWithEmailAndPassword({}, 'ana@example.com', 'outrasenha')).rejects.toThrow(
      'já está cadastrado',
    )
  })

  it('faz login com e-mail e senha corretos', async () => {
    await createUserWithEmailAndPassword({}, 'ana@example.com', 'senha123')
    const { user } = await signInWithEmailAndPassword({}, 'ana@example.com', 'senha123')
    expect(user.email).toBe('ana@example.com')
  })

  it('rejeita login com senha errada', async () => {
    await createUserWithEmailAndPassword({}, 'ana@example.com', 'senha123')
    await expect(signInWithEmailAndPassword({}, 'ana@example.com', 'errada')).rejects.toThrow('inválidos')
  })

  it('onAuthStateChanged dispara com o usuário atual e depois com null após signOut', async () => {
    await createUserWithEmailAndPassword({}, 'ana@example.com', 'senha123')
    const callback = vi.fn()
    onAuthStateChanged({}, callback)
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ email: 'ana@example.com' }))

    await signOutUser({})
    expect(callback).toHaveBeenLastCalledWith(null)
  })

  it('signInWithGoogleRedirect rejeita com uma mensagem amigável (não simulável em mock)', async () => {
    await expect(signInWithGoogleRedirect({})).rejects.toThrow('não está disponível no modo de teste local')
  })
})
