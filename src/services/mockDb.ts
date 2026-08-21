/**
 * "Banco de dados" local para o modo de teste sem Supabase.
 * Tudo fica salvo no localStorage do navegador — nada sai da sua máquina.
 */

export interface MockAuthUser {
  id: string
  email: string
  password: string
  name: string
}

export interface MockTables {
  profiles: any[]
  books: any[]
  reading_logs: any[]
  user_stats: any[]
  user_badges: any[]
  auth_users: MockAuthUser[]
}

const DB_KEY = 'leiame_mock_db_v1'
export const SESSION_KEY = 'leiame_mock_session_v1'

function emptyDb(): MockTables {
  return { profiles: [], books: [], reading_logs: [], user_stats: [], user_badges: [], auth_users: [] }
}

export function loadDb(): MockTables {
  const raw = localStorage.getItem(DB_KEY)
  if (!raw) return emptyDb()
  try {
    return { ...emptyDb(), ...JSON.parse(raw) }
  } catch {
    return emptyDb()
  }
}

export function saveDb(db: MockTables) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

export function resetMockData() {
  localStorage.removeItem(DB_KEY)
  localStorage.removeItem(SESSION_KEY)
}

export function uuid(): string {
  return crypto.randomUUID()
}
