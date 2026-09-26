import { createClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase client with the service-role key (bypasses RLS).
 * Next.js caches server-side fetch() by default, and supabase-js uses fetch,
 * so every request is forced to no-store or queries return stale rows.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    {
      auth: { persistSession: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    }
  )
}
