// Server-only: uses the service-role client and request cookies
import { randomBytes } from 'crypto'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const ROLES = ['owner', 'admin', 'sales', 'viewer'] as const
export type Role = (typeof ROLES)[number]
export type Member = { id: string; full_name: string; email: string; role: Role }

export const canManageTeam = (role?: string | null) => role === 'owner' || role === 'admin'

export function tempPassword() {
  return randomBytes(9).toString('base64url')
}

export async function currentAuthUser(): Promise<User | null> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function listAuthUsers(admin: SupabaseClient) {
  const all: User[] = []
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    all.push(...data.users)
    if (data.users.length < 1000) break
  }
  return all
}

export async function authUserIds(admin: SupabaseClient) {
  return new Map((await listAuthUsers(admin)).map(u => [u.id, u]))
}

export async function findAuthUserByEmail(admin: SupabaseClient, email: string) {
  return (await listAuthUsers(admin)).find(u => u.email?.toLowerCase() === email.toLowerCase()) ?? null
}

/**
 * First run: when nobody is on the team yet, the earliest-created login becomes the Owner.
 * Deterministic, so it doesn't matter who happens to load a page first.
 */
export async function bootstrapOwner(admin: SupabaseClient) {
  const { count, error } = await admin.from('users').select('id', { count: 'exact', head: true })
  if (error) throw error
  if ((count ?? 0) > 0) return
  const first = (await listAuthUsers(admin)).sort((a, b) => a.created_at.localeCompare(b.created_at))[0]
  if (!first?.email) return
  const meta = (first.user_metadata ?? {}) as { full_name?: string }
  await admin.from('users').insert({
    id: first.id,
    email: first.email,
    full_name: meta.full_name || first.email.split('@')[0],
    role: 'owner',
  })
}

export async function getMember(admin: SupabaseClient, id: string): Promise<Member | null> {
  const { data } = await admin.from('users').select('id, full_name, email, role').eq('id', id).maybeSingle()
  return (data as Member | null) ?? null
}

export async function ownerCount(admin: SupabaseClient) {
  const { count } = await admin.from('users').select('id', { count: 'exact', head: true }).eq('role', 'owner')
  return count ?? 0
}
