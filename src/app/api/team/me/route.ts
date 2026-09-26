import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { bootstrapOwner, currentAuthUser, getMember } from '@/lib/team'

export const dynamic = 'force-dynamic'

// The signed-in person's team profile (used by the top bar and My account)
export async function GET() {
  try {
    const user = await currentAuthUser()
    if (!user) return NextResponse.json({ error: 'Your session has expired. Sign in again.' }, { status: 401 })
    const admin = createAdminClient()
    await bootstrapOwner(admin)
    const member = await getMember(admin, user.id)
    return NextResponse.json({
      id: user.id,
      email: user.email,
      full_name: member?.full_name ?? (user.user_metadata as { full_name?: string })?.full_name ?? user.email?.split('@')[0] ?? '',
      role: member?.role ?? null,
      avatar_url: member?.avatar_url ?? null,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}

// Update your own display name and avatar
export async function PATCH(req: Request) {
  try {
    const user = await currentAuthUser()
    if (!user) return NextResponse.json({ error: 'Your session has expired. Sign in again.' }, { status: 401 })
    const body = await req.json().catch(() => ({}))
    
    const admin = createAdminClient()
    const member = await getMember(admin, user.id)
    if (!member) return NextResponse.json({ error: "You're not on the team yet. Ask an owner to add you." }, { status: 403 })

    const updates: Record<string, string | null> = {}
    if (body.full_name !== undefined) {
      const name = String(body.full_name ?? '').trim()
      if (name.length < 2 || name.length > 80) return NextResponse.json({ error: 'Enter your full name (2 to 80 characters).' }, { status: 400 })
      updates.full_name = name
    }
    if (body.avatar_url !== undefined) {
      updates.avatar_url = body.avatar_url || null
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await admin.from('users').update(updates).eq('id', user.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      if (updates.full_name) {
        await admin.auth.admin.updateUserById(user.id, { user_metadata: { full_name: updates.full_name } })
      }
    }
    
    return NextResponse.json({ ...member, ...updates })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
