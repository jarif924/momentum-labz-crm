import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  ROLES, authUserIds, bootstrapOwner, canManageTeam, currentAuthUser, findAuthUserByEmail, getMember, ownerCount, tempPassword,
  type Member, type Role,
} from '@/lib/team'

export const dynamic = 'force-dynamic'

const fail = (status: number, error: string) => NextResponse.json({ error }, { status })
const errMsg = (e: unknown) => (e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Unknown error')

async function authorize() {
  const user = await currentAuthUser()
  if (!user) return { error: fail(401, 'Your session has expired. Sign in again.') }
  const admin = createAdminClient()
  await bootstrapOwner(admin)
  const me = await getMember(admin, user.id)
  return { user, admin, me }
}

// List team members with whether each has a login
export async function GET() {
  try {
    const ctx = await authorize()
    if ('error' in ctx) return ctx.error
    const { admin, me } = ctx
    const { data, error } = await admin.from('users').select('id, full_name, email, role, avatar_url, created_at').order('created_at')
    if (error) throw error
    const logins = await authUserIds(admin)
    const members = (data as (Member & { created_at: string })[]).map(m => ({
      ...m,
      has_login: logins.has(m.id),
      last_sign_in_at: logins.get(m.id)?.last_sign_in_at ?? null,
    }))
    return NextResponse.json({ me, can_manage: canManageTeam(me?.role), members })
  } catch (e) {
    return fail(500, errMsg(e))
  }
}

// Add a team member and create their login
export async function POST(req: Request) {
  try {
    const ctx = await authorize()
    if ('error' in ctx) return ctx.error
    const { admin, me } = ctx
    if (!canManageTeam(me?.role)) return fail(403, 'Only owners and admins can add team members.')

    const body = await req.json().catch(() => ({}))
    const full_name = String(body.full_name ?? '').trim()
    const email = String(body.email ?? '').trim().toLowerCase()
    const role = String(body.role ?? 'viewer') as Role
    if (full_name.length < 2) return fail(400, 'Enter their full name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, 'Enter a valid email address.')
    if (!ROLES.includes(role)) return fail(400, 'Choose a valid role.')
    if (role === 'owner' && me?.role !== 'owner') return fail(403, 'Only an owner can add another owner.')

    // Case-insensitive exact match; escape LIKE wildcards (underscores are common in emails)
    const { data: existingRow } = await admin.from('users').select('id').ilike('email', email.replace(/[\\%_]/g, m => `\\${m}`)).maybeSingle()
    const logins = await authUserIds(admin)
    if (existingRow && logins.has(existingRow.id)) return fail(409, 'This person is already on the team and has a login.')

    const password = tempPassword()
    let id = existingRow?.id as string | undefined
    let createdLogin = false

    const existingLogin = await findAuthUserByEmail(admin, email)
    if (existingLogin && !existingRow) {
      // They already have a login (e.g. signed up earlier) but were never on the team: just add them
      id = existingLogin.id
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        ...(id ? { id } : {}), // keep an existing directory entry's id so assigned tasks stay linked
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      })
      if (createErr || !created.user) return fail(400, createErr?.message ?? 'Could not create the login.')
      id = created.user.id
      createdLogin = true
    }

    const { error: rowErr } = existingRow
      ? await admin.from('users').update({ full_name, role }).eq('id', id)
      : await admin.from('users').insert({ id, full_name, email, role })
    if (rowErr) {
      if (createdLogin) await admin.auth.admin.deleteUser(id!)
      return fail(400, rowErr.code === '23505' ? 'Someone with this email is already on the team.' : rowErr.message)
    }

    return NextResponse.json({ member: { id, full_name, email, role }, temp_password: createdLogin ? password : null }, { status: 201 })
  } catch (e) {
    return fail(500, errMsg(e))
  }
}

// Change a member's role or name
export async function PATCH(req: Request) {
  try {
    const ctx = await authorize()
    if ('error' in ctx) return ctx.error
    const { admin, me, user } = ctx
    if (!canManageTeam(me?.role)) return fail(403, 'Only owners and admins can change roles.')

    const body = await req.json().catch(() => ({}))
    const target = await getMember(admin, String(body.id ?? ''))
    if (!target) return fail(404, 'Team member not found.')

    const patch: Partial<Member> = {}
    if (body.full_name !== undefined) {
      const n = String(body.full_name).trim()
      if (n.length < 2) return fail(400, 'Enter their full name.')
      patch.full_name = n
    }
    if (body.role !== undefined) {
      const role = String(body.role) as Role
      if (!ROLES.includes(role)) return fail(400, 'Choose a valid role.')
      const touchesOwner = role === 'owner' || target.role === 'owner'
      if (touchesOwner && me?.role !== 'owner') return fail(403, 'Only an owner can grant or remove the Owner role.')
      if (target.role === 'owner' && role !== 'owner' && (await ownerCount(admin)) <= 1) return fail(400, 'The team needs at least one owner.')
      if (target.id === user.id && role !== me?.role && !canManageTeam(role)) return fail(400, "You can't remove your own admin access.")
      patch.role = role
    }

    const { error } = await admin.from('users').update(patch).eq('id', target.id)
    if (error) return fail(400, error.message)
    return NextResponse.json({ member: { ...target, ...patch } })
  } catch (e) {
    return fail(500, errMsg(e))
  }
}

// Remove a member and revoke their login
export async function DELETE(req: Request) {
  try {
    const ctx = await authorize()
    if ('error' in ctx) return ctx.error
    const { admin, me, user } = ctx
    if (!canManageTeam(me?.role)) return fail(403, 'Only owners and admins can remove team members.')

    const id = new URL(req.url).searchParams.get('id') ?? ''
    const target = await getMember(admin, id)
    if (!target) return fail(404, 'Team member not found.')
    if (target.id === user.id) return fail(400, "You can't remove yourself.")
    if (target.role === 'owner' && me?.role !== 'owner') return fail(403, 'Only an owner can remove another owner.')
    if (target.role === 'owner' && (await ownerCount(admin)) <= 1) return fail(400, 'The team needs at least one owner.')

    const { error: rowErr } = await admin.from('users').delete().eq('id', target.id)
    if (rowErr) return fail(400, rowErr.message)
    const logins = await authUserIds(admin)
    if (logins.has(target.id)) {
      const { error: authErr } = await admin.auth.admin.deleteUser(target.id)
      if (authErr) return fail(500, `Removed from the team, but their login could not be revoked: ${authErr.message}`)
    }
    return NextResponse.json({ removed: target.id })
  } catch (e) {
    return fail(500, errMsg(e))
  }
}
