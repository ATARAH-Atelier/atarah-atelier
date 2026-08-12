import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl) {
  throw new Error(
    'Falta la variable VITE_SUPABASE_URL en el archivo .env.local',
  )
}

if (!supabasePublishableKey) {
  throw new Error(
    'Falta la variable VITE_SUPABASE_PUBLISHABLE_KEY en el archivo .env.local',
  )
}

export function createBrowserSupabaseClient(storageKey = 'atarah-auth') {
  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
      storageKey,
    },
  })
}

export const supabase = createBrowserSupabaseClient('atarah-main-auth')
