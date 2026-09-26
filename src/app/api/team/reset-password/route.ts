import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authUserIds, canManageTeam, currentAuthUser, getMember, tempPassword } from '@/lib/team'

export const dynamic = 'force-dynamic'

// Owner/admin sets a new temporary password for a team member
export async function POST(req: Request) {
  try {
    const user = await currentAuthUser()
    if (!user) return NextResponse.json({ error: 'Your session has expired. Sign in again.' }, { status: 401 })
    const admin = createAdminClient()
    const me = await getMember(admin, user.id)
    if (!canManageTeam(me?.role)) return NextResponse.json({ error: 'Only owners and admins can reset passwords.' }, { status: 403 })

    const { id } = await req.json().catch(() => ({ id: '' }))
    const target = await getMember(admin, String(id ?? ''))
    if (!target) return NextResponse.json({ error: 'Team member not found.' }, { status: 404 })
    if (target.id === user.id) return NextResponse.json({ error: 'Change your own password in My account.' }, { status: 400 })
    if (target.role === 'owner' && me?.role !== 'owner') return NextResponse.json({ error: "Only an owner can reset an owner's password." }, { status: 403 })

    const password = tempPassword()
    const logins = await authUserIds(admin)
    const { error } = logins.has(target.id)
      ? await admin.auth.admin.updateUserById(target.id, { password })
      : await admin.auth.admin.createUser({ id: target.id, email: target.email, password, email_confirm: true, user_metadata: { full_name: target.full_name } })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ temp_password: password })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
