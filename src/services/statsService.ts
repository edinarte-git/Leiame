import { db, doc, collection, getDoc, getDocs, updateDoc, setDoc } from './firebaseClient'
import type { UserBadge, UserStats } from '../types'

// Pressupõe que o documento users/{uid} já existe. Isso é garantido porque
// authStore.init() sempre chama authService.getProfile() (auto-curativo, cria
// o documento se faltar) antes de qualquer tela montar useStats()/fetchStats.
export async function getStats(userId: string): Promise<UserStats> {
  const snapshot = await getDoc(doc(db, 'users', userId))
  const data = snapshot.data() as Record<string, unknown>
  return {
    user_id: userId,
    current_streak: data.current_streak as number,
    longest_streak: data.longest_streak as number,
    total_pages_read: data.total_pages_read as number,
    xp: data.xp as number,
    level: data.level as number,
    last_read_date: (data.last_read_date as string | null) ?? null,
    updated_at: (data.updated_at as string) ?? (data.created_at as string),
  }
}

export async function saveStats(userId: string, patch: Partial<UserStats>): Promise<UserStats> {
  const { user_id: _userId, ...rest } = patch
  await updateDoc(doc(db, 'users', userId), { ...rest, updated_at: new Date().toISOString() })
  return getStats(userId)
}

export async function listEarnedBadges(userId: string): Promise<UserBadge[]> {
  const snapshot = await getDocs(collection(db, 'users', userId, 'badges'))
  return snapshot.docs.map((d) => ({
    user_id: userId,
    badge_code: d.id,
    earned_at: (d.data() as { earned_at: string }).earned_at,
  }))
}

/** Idempotente: conceder de novo uma badge já concedida só sobrescreve com o mesmo conteúdo, sem erro. */
export async function awardBadge(userId: string, badgeCode: string): Promise<void> {
  await setDoc(doc(db, 'users', userId, 'badges', badgeCode), { earned_at: new Date().toISOString() })
}
