import { afterEach, describe, expect, it } from 'vitest'
import { getProfile, signUp, updateProfile } from './authService'
import { resetMockAuth } from './mockAuth'
import { resetMockFirestore } from './mockFirestore'

afterEach(() => {
  resetMockAuth()
  resetMockFirestore()
})

describe('authService.getProfile', () => {
  it('cria o documento com valores padrão se ainda não existir (1º login, ex.: Google)', async () => {
    const profile = await getProfile('user-x', 'Convidado do Google')
    expect(profile).toEqual({
      id: 'user-x',
      name: 'Convidado do Google',
      default_daily_goal: 10,
      theme: 'dark',
      sound_enabled: true,
      onboarded: false,
      created_at: expect.any(String),
    })
  })

  it('retorna o documento existente sem sobrescrever', async () => {
    await updateProfile('user-x', { name: 'Nome já salvo', onboarded: true })
    // getProfile deve ter criado o doc por baixo dos panos na chamada acima (updateProfile chama getProfile
    // internamente); confirme que a segunda leitura preserva o que foi salvo.
    const profile = await getProfile('user-x')
    expect(profile.name).toBe('Nome já salvo')
    expect(profile.onboarded).toBe(true)
  })
})

describe('authService.signUp', () => {
  it('cria a conta e o documento de usuário com o nome do formulário', async () => {
    const user = await signUp('ana@example.com', 'senha123', 'Ana')
    expect(user.email).toBe('ana@example.com')
    const profile = await getProfile(user.uid)
    expect(profile.name).toBe('Ana')
  })
})
