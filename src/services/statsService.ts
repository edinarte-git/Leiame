import { supabase } from './supabaseClient'
import type { UserBadge, UserStats } from '../types'

export async function getStats(userId: string): Promise<UserStats> {
  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error) throw error
  return data as UserStats
}

export async function saveStats(userId: string, patch: Partial<UserStats>): Promise<UserStats> {
  const { data, error } = await supabase
    .from('user_stats')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error
  return data as UserStats
}

export async function listEarnedBadges(userId: string): Promise<UserBadge[]> {
  const { data, error } = await supabase.from('user_badges').select('*').eq('user_id', userId)
  if (error) throw error
  return data as UserBadge[]
}

export async function awardBadge(userId: string, badgeCode: string): Promise<void> {
  const { error } = await supabase
    .from('user_badges')
    .insert({ user_id: userId, badge_code: badgeCode })
  if (error && error.code !== '23505') throw error // ignora conflito de badge já concedida
}
