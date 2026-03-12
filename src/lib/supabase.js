import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios')
}

// Client com service_role: ignora RLS, usado no backend (server.js, jobs/)
// NUNCA expor essa chave no frontend
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

// Verifica conexão com o banco
export async function checkConnection() {
  const { error } = await supabase.from('tenants').select('id').limit(1)
  if (error) throw new Error(`Supabase connection failed: ${error.message}`)
  return true
}
