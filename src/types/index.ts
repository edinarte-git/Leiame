export type BookStatus = 'want_to_read' | 'reading' | 'paused' | 'completed'

export interface Profile {
  id: string
  name: string
  default_daily_goal: number
  theme: 'dark' | 'light'
  sound_enabled: boolean
  onboarded: boolean
  created_at: string
}

export interface Book {
  id: string
  user_id: string
  title: string
  author: string
  cover_url: string | null
  total_pages: number
  pages_read: number
  daily_goal: number
  status: BookStatus
  start_date: string | null
  estimated_completion_date: string | null
  completed_date: string | null
  created_at: string
  updated_at: string
}

export type NewBook = Pick<
  Book,
  'title' | 'author' | 'total_pages' | 'daily_goal' | 'cover_url' | 'status'
>

export interface ReadingLog {
  id: string
  user_id: string
  book_id: string
  date: string
  pages_read: number
  created_at: string
}

export interface UserStats {
  user_id: string
  current_streak: number
  longest_streak: number
  total_pages_read: number
  xp: number
  level: number
  last_read_date: string | null
  updated_at: string
}

export interface UserBadge {
  user_id: string
  badge_code: string
  earned_at: string
}

export interface BadgeDef {
  code: string
  name: string
  description: string
  icon: string
}
