import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (client) return client

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://loivivphqzedhutgxzcl.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_HM3t_f-GG4h9_CjPSWxsUw_7Lq04gic'
  
  client = createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  )
  return client
}
