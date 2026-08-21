/**
 * Reimplementação mínima da API do supabase-js (auth + query builder)
 * rodando 100% em localStorage. Usada quando VITE_USE_MOCK=true, para
 * testar o app inteiro sem precisar de um projeto Supabase.
 *
 * Cobre só os métodos que os services desta app realmente chamam
 * (select/eq/gte/order/single/maybeSingle/insert/update/delete +
 * auth.signUp/signInWithPassword/signOut/getSession/onAuthStateChange).
 */
import { loadDb, saveDb, uuid, SESSION_KEY, type MockTables } from './mockDb'

type FilterOp = 'eq' | 'gte'
interface Filter {
  col: string
  op: FilterOp
  val: unknown
}

function withDefaults(table: keyof MockTables, row: Record<string, unknown>) {
  const now = new Date().toISOString()
  switch (table) {
    case 'books':
      return {
        id: uuid(),
        pages_read: 0,
        status: 'want_to_read',
        cover_url: null,
        start_date: null,
        estimated_completion_date: null,
        completed_date: null,
        created_at: now,
        updated_at: now,
        ...row,
      }
    case 'reading_logs':
      return { id: uuid(), date: now.slice(0, 10), created_at: now, ...row }
    case 'user_badges':
      return { earned_at: now, ...row }
    case 'profiles':
      return {
        default_daily_goal: 10,
        theme: 'dark',
        sound_enabled: true,
        onboarded: false,
        name: '',
        created_at: now,
        ...row,
      }
    case 'user_stats':
      return {
        current_streak: 0,
        longest_streak: 0,
        total_pages_read: 0,
        xp: 0,
        level: 1,
        last_read_date: null,
        updated_at: now,
        ...row,
      }
    default:
      return { id: uuid(), created_at: now, ...row }
  }
}

function hasUniqueConflict(table: keyof MockTables, existing: any[], row: any): boolean {
  if (table === 'reading_logs') {
    return existing.some((r) => r.user_id === row.user_id && r.book_id === row.book_id && r.date === row.date)
  }
  if (table === 'user_badges') {
    return existing.some((r) => r.user_id === row.user_id && r.badge_code === row.badge_code)
  }
  return false
}

class MockQueryBuilder implements PromiseLike<{ data: any; error: any }> {
  private filters: Filter[] = []
  private orderCol: string | null = null
  private orderAsc = true
  private mode: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private insertRows: any[] | null = null
  private updateValues: Record<string, unknown> | null = null
  private wantSingle = false
  private wantMaybeSingle = false

  private table: keyof MockTables

  constructor(table: keyof MockTables) {
    this.table = table
  }

  select(_cols?: string) {
    return this
  }
  eq(col: string, val: unknown) {
    this.filters.push({ col, op: 'eq', val })
    return this
  }
  gte(col: string, val: unknown) {
    this.filters.push({ col, op: 'gte', val })
    return this
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orderCol = col
    this.orderAsc = opts?.ascending ?? true
    return this
  }
  single() {
    this.wantSingle = true
    return this
  }
  maybeSingle() {
    this.wantMaybeSingle = true
    return this
  }
  insert(rows: Record<string, unknown> | Record<string, unknown>[]) {
    this.mode = 'insert'
    this.insertRows = Array.isArray(rows) ? rows : [rows]
    return this
  }
  update(values: Record<string, unknown>) {
    this.mode = 'update'
    this.updateValues = values
    return this
  }
  delete() {
    this.mode = 'delete'
    return this
  }

  then<TResult1 = { data: any; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    try {
      const result = this.execute()
      return Promise.resolve(onfulfilled ? onfulfilled(result) : (result as unknown as TResult1))
    } catch (err) {
      if (onrejected) return Promise.resolve(onrejected(err))
      return Promise.reject(err)
    }
  }

  private matches(row: any): boolean {
    return this.filters.every((f) => {
      if (f.op === 'eq') return row[f.col] === f.val
      if (f.op === 'gte') return row[f.col] >= (f.val as string | number)
      return true
    })
  }

  private finalize(rows: any[]) {
    if (this.wantSingle || this.wantMaybeSingle) return rows[0] ?? null
    return rows
  }

  private execute(): { data: any; error: any } {
    const db = loadDb()
    const rows = db[this.table] as any[]

    if (this.mode === 'insert') {
      const created = this.insertRows!.map((r) => withDefaults(this.table, r))
      for (const row of created) {
        if (hasUniqueConflict(this.table, rows, row)) {
          return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } }
        }
      }
      rows.push(...created)
      db[this.table] = rows
      saveDb(db)
      return { data: this.finalize(created), error: null }
    }

    if (this.mode === 'update') {
      const matched = rows.filter((r) => this.matches(r))
      for (const row of matched) Object.assign(row, this.updateValues)
      db[this.table] = rows
      saveDb(db)
      return { data: this.finalize(matched), error: null }
    }

    if (this.mode === 'delete') {
      db[this.table] = rows.filter((r) => !this.matches(r))
      saveDb(db)
      return { data: null, error: null }
    }

    let matched = rows.filter((r) => this.matches(r))
    if (this.orderCol) {
      const col = this.orderCol
      matched = [...matched].sort((a, b) => {
        if (a[col] === b[col]) return 0
        const cmp = a[col] > b[col] ? 1 : -1
        return this.orderAsc ? cmp : -cmp
      })
    }
    return { data: this.finalize(matched), error: null }
  }
}

// ---------------------------------------------------------------------
// auth
// ---------------------------------------------------------------------
interface MockSession {
  user: { id: string; email: string; user_metadata?: { name?: string } }
  access_token: string
}

type AuthChangeCallback = (event: string, session: MockSession | null) => void
const listeners: AuthChangeCallback[] = []

function readSession(): MockSession | null {
  const raw = localStorage.getItem(SESSION_KEY)
  return raw ? JSON.parse(raw) : null
}

function writeSession(session: MockSession | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  else localStorage.removeItem(SESSION_KEY)
  listeners.forEach((cb) => cb(session ? 'SIGNED_IN' : 'SIGNED_OUT', session))
}

async function signUp({
  email,
  password,
  options,
}: {
  email: string
  password: string
  options?: { data?: { name?: string } }
}) {
  const db = loadDb()
  if (db.auth_users.some((u) => u.email === email)) {
    return { data: null, error: { message: 'Este e-mail já está cadastrado (modo de teste local).' } }
  }
  const id = uuid()
  const name = options?.data?.name ?? ''
  db.auth_users.push({ id, email, password, name })
  db.profiles.push(withDefaults('profiles', { id, name }))
  db.user_stats.push(withDefaults('user_stats', { user_id: id }))
  saveDb(db)

  const session: MockSession = { user: { id, email, user_metadata: { name } }, access_token: `mock-${id}` }
  writeSession(session)
  return { data: { session, user: session.user }, error: null }
}

async function signInWithPassword({ email, password }: { email: string; password: string }) {
  const db = loadDb()
  const user = db.auth_users.find((u) => u.email === email)
  if (!user || user.password !== password) {
    return { data: null, error: { message: 'E-mail ou senha inválidos.' } }
  }
  const session: MockSession = {
    user: { id: user.id, email: user.email, user_metadata: { name: user.name } },
    access_token: `mock-${user.id}`,
  }
  writeSession(session)
  return { data: { session, user: session.user }, error: null }
}

async function signOut() {
  writeSession(null)
  return { error: null }
}

async function getSession() {
  return { data: { session: readSession() }, error: null }
}

function onAuthStateChange(cb: AuthChangeCallback) {
  listeners.push(cb)
  return {
    data: {
      subscription: {
        unsubscribe: () => {
          const i = listeners.indexOf(cb)
          if (i >= 0) listeners.splice(i, 1)
        },
      },
    },
  }
}

export const mockSupabase = {
  auth: { signUp, signInWithPassword, signOut, getSession, onAuthStateChange },
  from: (table: keyof MockTables) => new MockQueryBuilder(table),
}
