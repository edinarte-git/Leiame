import { createClient } from '@supabase/supabase-js'
import { mockSupabase } from './mockSupabase'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const explicitMock = import.meta.env.VITE_USE_MOCK === 'true'

/** Modo de teste local: nenhuma credencial Supabase configurada (ou VITE_USE_MOCK=true). */
export const isMockMode = explicitMock || !url || !anonKey

export const supabase: any = isMockMode ? mockSupabase : createClient(url!, anonKey!)
