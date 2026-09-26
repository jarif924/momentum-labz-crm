'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, KeyRound, Trash2, UserPlus, Users } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button, Input, Select } from '@/components/ui/Forms'
import { useToast } from '@/components/ui/Toast'
import { Card, ConfirmDialog, EmptyState, IconButton, LoadError, Notice, SectionHeader, Skeleton, useSupabase } from './ui'

type Role = 'owner' | 'admin' | 'sales' | 'viewer'
type Member = { id: string; full_name: string; email: string; role: Role; has_login: boolean; last_sign_in_at: string | null; avatar_url?: string | null }
type Me = { id: string; full_name: string; email: string; role: Role; avatar_url?: string | null } | null

const ROLE_INFO: Record<Role, { label: string; hint: string }> = {
  owner: { label: 'Owner', hint: 'Full control, including other owners' },
  admin: { label: 'Admin', hint: 'Manages the team and settings' },
  sales: { label: 'Sales', hint: 'Day-to-day CRM work' },
  viewer: { label: 'Viewer', hint: 'Day-to-day CRM work' },
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } })
  const isJson = res.headers.get('content-type')?.includes('application/json')
  if (!isJson) throw new Error('Your session has expired. Sign in again.')
  const body = await res.json()
  if (!res.ok) throw new Error(body.error || 'Something went wrong.')
  return body as T
}

const since = (iso: string | null) => (iso ? `Last signed in ${new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` : 'Has not signed in yet')



import { Avatar } from '@/components/ui/Avatar'
import { AvatarUploader } from '@/components/ui/AvatarUploader'

function PasswordReveal({ open, name, email, password, onClose }: { open: boolean; name: string; email: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const text = `Momentum Labz CRM\nSign in at: ${typeof window !== 'undefined' ? window.location.origin : ''}/login\nEmail: ${email}\nTemporary password: ${password}\nPlease change it in Settings > My account after signing in.`
  return (
    <Modal isOpen={open} onClose={onClose} title={`Login ready for ${name}`} maxWidth="md">
      <div className="flex flex-col gap-4">
        <p className="text-body text-neutral-600">Share these details privately (for example on WhatsApp). The password is shown only once.</p>
        <div className="rounded-md border border-neutral-100 bg-neutral-50 p-4">
          <p className="text-micro text-neutral-400">Email</p>
          <p className="text-body-medium text-neutral-900">{email}</p>
          <p className="mt-3 text-micro text-neutral-400">Temporary password</p>
          <p className="font-mono text-h3 tracking-wide text-neutral-900">{password}</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={async () => {
              try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* the details stay visible to copy by hand */ }
            }}
          >
            {copied ? <Check size={16} strokeWidth={1.75} className="mr-1.5" /> : <Copy size={16} strokeWidth={1.75} className="mr-1.5" />}
            {copied ? 'Copied' : 'Copy login details'}
          </Button>
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Team ─────────────────────────────────────────────────────

export function TeamSection() {
  const toast = useToast()
  const [members, setMembers] = useState<Member[]>([])
  const [me, setMe] = useState<Me>(null)
  const [canManage, setCanManage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [form, setForm] = useState({ full_name: '', email: '', role: 'sales' as Role })
  const [adding, setAdding] = useState(false)
  const [reveal, setReveal] = useState<{ name: string; email: string; password: string } | null>(null)
  const [toRemove, setToRemove] = useState<Member | null>(null)
  const [toReset, setToReset] = useState<Member | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await api<{ me: Me; can_manage: boolean; members: Member[] }>('/api/team')
      setMembers(data.members)
      setMe(data.me)
      setCanManage(data.can_manage)
    } catch (e) {
      setLoadError((e as Error).message)
    }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function add() {
    setAdding(true)
    try {
      const res = await api<{ member: Member; temp_password: string | null }>('/api/team', { method: 'POST', body: JSON.stringify(form) })
      toast.success(`${form.full_name} added to the team`)
      if (res.temp_password) setReveal({ name: form.full_name, email: form.email.trim().toLowerCase(), password: res.temp_password })
      setForm({ full_name: '', email: '', role: 'sales' })
      load()
    } catch (e) {
      toast.error((e as Error).message)
    }
    setAdding(false)
  }

  async function changeRole(m: Member, role: Role) {
    const previous = members
    setMembers(prev => prev.map(x => (x.id === m.id ? { ...x, role } : x)))
    try {
      await api('/api/team', { method: 'PATCH', body: JSON.stringify({ id: m.id, role }) })
      toast.success(`${m.full_name} is now ${ROLE_INFO[role].label}`)
    } catch (e) {
      setMembers(previous)
      toast.error((e as Error).message)
    }
  }

  async function remove() {
    if (!toRemove) return
    setBusy(true)
    try {
      await api(`/api/team?id=${encodeURIComponent(toRemove.id)}`, { method: 'DELETE' })
      toast.success(`${toRemove.full_name} removed; they can no longer sign in`)
      setMembers(prev => prev.filter(x => x.id !== toRemove.id))
      setToRemove(null)
    } catch (e) {
      toast.error((e as Error).message)
    }
    setBusy(false)
  }

  async function resetPassword() {
    if (!toReset) return
    setBusy(true)
    try {
      const res = await api<{ temp_password: string }>('/api/team/reset-password', { method: 'POST', body: JSON.stringify({ id: toReset.id }) })
      setReveal({ name: toReset.full_name, email: toReset.email, password: res.temp_password })
      setToReset(null)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    }
    setBusy(false)
  }

  if (loading) return <><SectionHeader title="Team" /><Skeleton rows={4} /></>
  if (loadError) return <><SectionHeader title="Team" /><LoadError message={loadError} onRetry={load} /></>

  const roleChoices = (Object.keys(ROLE_INFO) as Role[]).filter(r => r !== 'owner' || me?.role === 'owner')

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Team" description="Everyone who can sign in to the CRM. Adding someone creates their login with a temporary password you share with them." />

      <Notice>
        Roles decide who can manage the team: Owners and Admins can add, change and remove people. Right now every member can see and edit all CRM data, including finance; finer permissions are not set up yet.
      </Notice>

      {canManage ? (
        <Card title="Add a team member">
          <form className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_160px_auto] sm:items-end" onSubmit={e => { e.preventDefault(); if (!adding) add() }}>
            <Input label="Full name" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="e.g. Sajid Hasan" />
            <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@company.com" />
            <Select label="Role" value={form.role} onChange={e => setForm({ ...form, role: e.target.value as Role })}>
              {roleChoices.map(r => <option key={r} value={r}>{ROLE_INFO[r].label}</option>)}
            </Select>
            <Button type="submit" disabled={adding || !form.full_name.trim() || !form.email.trim()}>
              <UserPlus size={16} strokeWidth={1.75} className="mr-1.5" /> {adding ? 'Adding…' : 'Add member'}
            </Button>
          </form>
          <p className="mt-3 text-small text-neutral-500">{ROLE_INFO[form.role].label}: {ROLE_INFO[form.role].hint}.</p>
        </Card>
      ) : (
        <Notice tone="warning">Only Owners and Admins can add or change team members.</Notice>
      )}

      <Card title={`Members (${members.length})`} padded={false}>
        {members.length === 0 ? (
          <EmptyState icon={Users} title="No team members yet" description="Add the people who work in the CRM with you." />
        ) : (
          <ul className="divide-y divide-neutral-100">
            {members.map(m => {
              const isMe = m.id === me?.id
              const ownerLocked = m.role === 'owner' && me?.role !== 'owner'
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:px-6">
                  <Avatar name={m.full_name} url={m.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-medium text-neutral-900">
                      {m.full_name}{isMe && <span className="ml-2 inline-flex h-[22px] items-center rounded-sm bg-neutral-100 px-2 align-middle text-micro text-neutral-600">You</span>}
                    </p>
                    <p className="truncate text-small text-neutral-500">{m.email} · {m.has_login ? since(m.last_sign_in_at) : 'No login yet'}</p>
                  </div>
                  {canManage && !isMe && !ownerLocked ? (
                    <div className="w-32">
                      <Select aria-label={`Role for ${m.full_name}`} value={m.role} onChange={e => changeRole(m, e.target.value as Role)}>
                        {(Object.keys(ROLE_INFO) as Role[]).filter(r => r !== 'owner' || me?.role === 'owner').map(r => <option key={r} value={r}>{ROLE_INFO[r].label}</option>)}
                      </Select>
                    </div>
                  ) : (
                    <span className="inline-flex h-[22px] items-center rounded-sm bg-neutral-100 px-2 text-micro text-neutral-600">{ROLE_INFO[m.role]?.label ?? m.role}</span>
                  )}
                  {canManage && !isMe && !ownerLocked && (
                    <>
                      <IconButton label={m.has_login ? `Reset password for ${m.full_name}` : `Create login for ${m.full_name}`} onClick={() => setToReset(m)}>
                        <KeyRound size={16} strokeWidth={1.75} />
                      </IconButton>
                      <IconButton label={`Remove ${m.full_name}`} tone="danger" onClick={() => setToRemove(m)}>
                        <Trash2 size={16} strokeWidth={1.75} />
                      </IconButton>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={!!toRemove}
        title={`Remove ${toRemove?.full_name}?`}
        message="They will be signed out and can no longer sign in. Tasks and leads assigned to them become unassigned."
        confirmLabel="Remove from team"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setToRemove(null)}
      />
      <ConfirmDialog
        open={!!toReset}
        title={toReset?.has_login ? `Reset ${toReset?.full_name}'s password?` : `Create a login for ${toReset?.full_name}?`}
        message={toReset?.has_login ? 'Their current password stops working. You will get a new temporary password to share.' : 'You will get a temporary password to share with them.'}
        confirmLabel={toReset?.has_login ? 'Reset password' : 'Create login'}
        destructive={false}
        busy={busy}
        onConfirm={resetPassword}
        onCancel={() => setToReset(null)}
      />
      <PasswordReveal open={!!reveal} name={reveal?.name ?? ''} email={reveal?.email ?? ''} password={reveal?.password ?? ''} onClose={() => setReveal(null)} />
    </div>
  )
}

// ─── My account ───────────────────────────────────────────────

export function AccountSection() {
  const toast = useToast()
  const supabase = useSupabase()
  const [me, setMe] = useState<{ full_name: string; email: string; role: Role | null; avatar_url?: string | null } | null>(null)
  const [name, setName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [savingName, setSavingName] = useState(false)
  const [pw, setPw] = useState({ next: '', confirm: '' })
  const [savingPw, setSavingPw] = useState(false)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const data = await api<{ full_name: string; email: string; role: Role | null; avatar_url?: string | null }>('/api/team/me')
      setMe(data)
      setName(data.full_name)
      setAvatarUrl(data.avatar_url ?? null)
    } catch (e) {
      setLoadError((e as Error).message)
    }
  }, [])
  useEffect(() => { load() }, [load])

  async function handleAvatarUpload(url: string | null) {
    try {
      const res = await api<{ avatar_url: string | null }>('/api/team/me', { method: 'PATCH', body: JSON.stringify({ avatar_url: url }) })
      setMe(m => (m ? { ...m, avatar_url: res.avatar_url } : m))
      setAvatarUrl(res.avatar_url)
      toast.success(url ? 'Profile photo updated' : 'Profile photo removed')
      window.dispatchEvent(new Event('profile-updated'))
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function saveName() {
    setSavingName(true)
    try {
      const res = await api<{ full_name: string }>('/api/team/me', { method: 'PATCH', body: JSON.stringify({ full_name: name }) })
      setMe(m => (m ? { ...m, full_name: res.full_name } : m))
      toast.success('Name updated')
      window.dispatchEvent(new Event('profile-updated'))
    } catch (e) {
      toast.error((e as Error).message)
    }
    setSavingName(false)
  }

  async function savePassword() {
    if (pw.next.length < 8) { toast.error('Use at least 8 characters.'); return }
    if (pw.next !== pw.confirm) { toast.error("The two passwords don't match."); return }
    setSavingPw(true)
    const { error } = await supabase.auth.updateUser({ password: pw.next })
    setSavingPw(false)
    if (error) { toast.error(error.message); return }
    setPw({ next: '', confirm: '' })
    toast.success('Password changed')
  }

  if (loadError) return <><SectionHeader title="My account" /><LoadError message={loadError} onRetry={load} /></>
  if (!me) return <><SectionHeader title="My account" /><Skeleton rows={3} /></>

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="My account" description="Your name and photo as shown to the team, and your password." />
      <Card
        title="Profile"
        footer={<Button onClick={saveName} disabled={savingName || name.trim() === me.full_name || name.trim().length < 2}>{savingName ? 'Saving…' : 'Save name'}</Button>}
      >
        <div className="mb-6">
          <AvatarUploader url={avatarUrl} name={name} onUpload={handleAvatarUpload} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Full name" value={name} onChange={e => setName(e.target.value)} />
          <Input label="Email" value={me.email} disabled />
        </div>
        <p className="mt-3 text-small text-neutral-500">Role: {me.role ? ROLE_INFO[me.role].label : 'Not on the team yet'}</p>
      </Card>
      <Card
        title="Change password"
        footer={<Button onClick={savePassword} disabled={savingPw || !pw.next || !pw.confirm}>{savingPw ? 'Saving…' : 'Change password'}</Button>}
      >
        <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); savePassword() }}>
          <Input label="New password" type="password" autoComplete="new-password" value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} />
          <Input label="Confirm new password" type="password" autoComplete="new-password" value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} />
        </form>
        <p className="mt-3 text-small text-neutral-500">At least 8 characters.</p>
      </Card>
    </div>
  )
}
