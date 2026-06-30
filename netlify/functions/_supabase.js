import { createClient } from '@supabase/supabase-js'

let client = null

function required(name) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Variable manquante: ${name}`)
  }

  return value
}

export function getSupabase() {
  if (client) return client

  const url = required('SUPABASE_URL')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY

  if (!key) {
    throw new Error('Variable manquante: SUPABASE_SERVICE_ROLE_KEY')
  }

  client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return client
}