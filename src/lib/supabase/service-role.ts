import { createClient } from '@supabase/supabase-js'

// Service role client - bypasses RLS completely
// ONLY use this in server-side code (Server Components, API Routes, Server Actions)
// NEVER use this in client-side code
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
