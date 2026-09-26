'use client'

import { useCallback, useEffect, useState } from 'react'
import { Briefcase, Megaphone, Plus, Tag, Trash2 } from 'lucide-react'
import { Button, Input } from '@/components/ui/Forms'
import { useToast } from '@/components/ui/Toast'
import {
  Card, ConfirmDialog, EditableText, EmptyState, IconButton, LoadError, ReorderControls, SectionHeader, Skeleton,
  friendlyError, moveItem, rowDragClass, useDragReorder, useSupabase, useSystemSettings,
} from './ui'

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function AddRow({ label, placeholder, button, onAdd }: { label: string; placeholder: string; button: string; onAdd: (v: string) => Promise<boolean> }) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="flex flex-col gap-3 border-t border-neutral-100 px-4 py-4 sm:flex-row sm:items-end sm:px-6"
      onSubmit={async e => {
        e.preventDefault()
        if (!value.trim() || busy) return
        setBusy(true)
        if (await onAdd(value.trim())) setValue('')
        setBusy(false)
      }}
    >
      <div className="flex-1"><Input label={label} placeholder={placeholder} value={value} onChange={e => setValue(e.target.value)} /></div>
      <Button type="submit" disabled={busy || !value.trim()}>
        <Plus size={16} strokeWidth={1.75} className="mr-1.5" /> {busy ? 'Adding…' : button}
      </Button>
    </form>
  )
}

// ─── Lead sources ─────────────────────────────────────────────

type Source = { id: string; label: string }

function slugify(label: string) {
  return label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'source'
}

export function LeadSourcesSection() {
  const supabase = useSupabase()
  const toast = useToast()
  const { data, loading, loadError, reload, save } = useSystemSettings<{ lead_sources: Source[] }>('lead_sources')
  const [usage, setUsage] = useState<Record<string, number>>({})
  const [toDelete, setToDelete] = useState<Source | null>(null)
  const sources = data?.lead_sources ?? []

  useEffect(() => {
    supabase.from('leads').select('source').then(({ data: rows }) => {
      const u: Record<string, number> = {}
      for (const r of (rows ?? []) as { source: string | null }[]) if (r.source) u[r.source] = (u[r.source] ?? 0) + 1
      setUsage(u)
    })
  }, [supabase])

  const drag = useDragReorder((from, to) => save({ lead_sources: moveItem(sources, from, to) }, 'Order saved'))

  async function add(label: string) {
    if (sources.some(s => s.label.toLowerCase() === label.toLowerCase())) { toast.error(`"${label}" already exists.`); return false }
    let id = slugify(label)
    while (sources.some(s => s.id === id)) id = `${id}_2`
    return save({ lead_sources: [...sources, { id, label }] }, `Added "${label}"`)
  }

  if (loading) return <><SectionHeader title="Lead sources" /><Skeleton rows={6} /></>
  if (loadError) return <><SectionHeader title="Lead sources" /><LoadError message={loadError} onRetry={reload} /></>

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Lead sources" description="Where your leads come from. These appear in the lead form and power the source breakdown in Analytics. Renaming keeps existing leads linked." />
      <Card padded={false}>
        {sources.length === 0 ? (
          <EmptyState icon={Megaphone} title="No lead sources" description="Add where your leads come from, for example Referral or Instagram DM." />
        ) : (
          <ul className="divide-y divide-neutral-100">
            {sources.map((s, i) => (
              <li key={s.id} {...drag.rowProps(i)} className={`flex items-center gap-3 px-4 py-3 sm:px-6 ${rowDragClass(i, drag.dragIndex, drag.overIndex)}`}>
                <ReorderControls index={i} count={sources.length} onMove={(f, t) => t >= 0 && t < sources.length && save({ lead_sources: moveItem(sources, f, t) }, 'Order saved')} handleProps={drag.handleProps(i)} name={s.label} />
                <div className="min-w-0 flex-1">
                  <EditableText
                    value={s.label}
                    label={`source ${s.label}`}
                    onSave={async next => {
                      if (sources.some(x => x.id !== s.id && x.label.toLowerCase() === next.toLowerCase())) { toast.error(`"${next}" already exists.`); return false }
                      return save({ lead_sources: sources.map(x => (x.id === s.id ? { ...x, label: next } : x)) }, 'Source renamed')
                    }}
                  />
                  <p className="text-small text-neutral-500">{plural(usage[s.id] ?? 0, 'lead')}</p>
                </div>
                <IconButton label={`Remove source ${s.label}`} tone="danger" onClick={() => setToDelete(s)}><Trash2 size={16} strokeWidth={1.75} /></IconButton>
              </li>
            ))}
          </ul>
        )}
        <AddRow label="New source" placeholder="e.g. LinkedIn" button="Add source" onAdd={add} />
      </Card>
      <ConfirmDialog
        open={!!toDelete}
        title={`Remove "${toDelete?.label}"?`}
        message={(usage[toDelete?.id ?? ''] ?? 0) > 0
          ? `${plural(usage[toDelete!.id], 'lead')} use this source. They keep it, but it can no longer be chosen for new leads.`
          : 'It will no longer be available in the lead form.'}
        confirmLabel="Remove source"
        onConfirm={async () => { if (await save({ lead_sources: sources.filter(x => x.id !== toDelete!.id) }, `Removed "${toDelete!.label}"`)) setToDelete(null) }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}

// ─── Services ─────────────────────────────────────────────────

export function ServicesSection() {
  const supabase = useSupabase()
  const toast = useToast()
  const { data, setData, loading, loadError, reload, save } = useSystemSettings<{ services: string[] }>('services')
  const [usage, setUsage] = useState<Record<string, number>>({})
  const [toDelete, setToDelete] = useState<string | null>(null)
  const services = data?.services ?? []

  const loadUsage = useCallback(async () => {
    const { data: rows } = await supabase.from('leads').select('services')
    const u: Record<string, number> = {}
    for (const r of (rows ?? []) as { services: string[] | null }[]) for (const s of r.services ?? []) u[s] = (u[s] ?? 0) + 1
    setUsage(u)
  }, [supabase])
  useEffect(() => { loadUsage() }, [loadUsage])

  const drag = useDragReorder((from, to) => save({ services: moveItem(services, from, to) }, 'Order saved'))

  async function add(name: string) {
    if (services.some(s => s.toLowerCase() === name.toLowerCase())) { toast.error(`"${name}" already exists.`); return false }
    return save({ services: [...services, name] }, `Added "${name}"`)
  }

  async function rename(old: string, next: string) {
    const { error } = await supabase.rpc('rename_service', { p_old: old, p_new: next })
    if (error) { toast.error(friendlyError(error)); return false }
    setData(d => (d ? { ...d, services: d.services.map(s => (s === old ? next : s)) } : d))
    toast.success(`Renamed to "${next}"${usage[old] ? `; updated on ${plural(usage[old], 'lead')}` : ''}`)
    loadUsage()
    return true
  }

  if (loading) return <><SectionHeader title="Services" /><Skeleton rows={4} /></>
  if (loadError) return <><SectionHeader title="Services" /><LoadError message={loadError} onRetry={reload} /></>

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Services" description="What you sell. Leads and proposals pick from this list. Renaming a service updates every lead and proposal that uses it." />
      <Card padded={false}>
        {services.length === 0 ? (
          <EmptyState icon={Briefcase} title="No services yet" description="Add the services you offer, for example Web Development." />
        ) : (
          <ul className="divide-y divide-neutral-100">
            {services.map((s, i) => (
              <li key={s} {...drag.rowProps(i)} className={`flex items-center gap-3 px-4 py-3 sm:px-6 ${rowDragClass(i, drag.dragIndex, drag.overIndex)}`}>
                <ReorderControls index={i} count={services.length} onMove={(f, t) => t >= 0 && t < services.length && save({ services: moveItem(services, f, t) }, 'Order saved')} handleProps={drag.handleProps(i)} name={s} />
                <div className="min-w-0 flex-1">
                  <EditableText value={s} label={`service ${s}`} onSave={next => rename(s, next)} />
                  <p className="text-small text-neutral-500">{plural(usage[s] ?? 0, 'lead')}</p>
                </div>
                <IconButton label={`Remove service ${s}`} tone="danger" onClick={() => setToDelete(s)}><Trash2 size={16} strokeWidth={1.75} /></IconButton>
              </li>
            ))}
          </ul>
        )}
        <AddRow label="New service" placeholder="e.g. SEO Audit" button="Add service" onAdd={add} />
      </Card>
      <ConfirmDialog
        open={!!toDelete}
        title={`Remove "${toDelete}"?`}
        message={(usage[toDelete ?? ''] ?? 0) > 0
          ? `${plural(usage[toDelete!], 'lead')} use this service. They keep it, but it can no longer be chosen.`
          : 'It will no longer be available on leads and proposals.'}
        confirmLabel="Remove service"
        onConfirm={async () => { if (await save({ services: services.filter(x => x !== toDelete) }, `Removed "${toDelete}"`)) setToDelete(null) }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}

// ─── Tags ─────────────────────────────────────────────────────

type TagRow = { id: string; name: string; lead_tags: { count: number }[] }

export function TagsSection() {
  const supabase = useSupabase()
  const toast = useToast()
  const [tags, setTags] = useState<TagRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<TagRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const { data, error } = await supabase.from('tags').select('id, name, lead_tags(count)').order('name')
    if (error) setLoadError(friendlyError(error))
    else setTags(data as TagRow[])
    setLoading(false)
  }, [supabase])
  useEffect(() => { load() }, [load])

  const countOf = (t: TagRow) => t.lead_tags?.[0]?.count ?? 0

  async function add(name: string) {
    if (tags.some(t => t.name.toLowerCase() === name.toLowerCase())) { toast.error(`"${name}" already exists.`); return false }
    const { data, error } = await supabase.from('tags').insert({ name }).select('id, name').single()
    if (error) { toast.error(friendlyError(error)); return false }
    setTags(prev => [...prev, { ...(data as { id: string; name: string }), lead_tags: [{ count: 0 }] }].sort((a, b) => a.name.localeCompare(b.name)))
    toast.success(`Added "${name}"`)
    return true
  }

  async function rename(tag: TagRow, name: string) {
    if (tags.some(t => t.id !== tag.id && t.name.toLowerCase() === name.toLowerCase())) { toast.error(`"${name}" already exists.`); return false }
    const { error } = await supabase.from('tags').update({ name }).eq('id', tag.id)
    if (error) { toast.error(friendlyError(error)); return false }
    setTags(prev => prev.map(t => (t.id === tag.id ? { ...t, name } : t)).sort((a, b) => a.name.localeCompare(b.name)))
    toast.success('Tag renamed')
    return true
  }

  async function confirmDelete() {
    if (!toDelete) return
    setDeleting(true)
    const { error } = await supabase.from('tags').delete().eq('id', toDelete.id)
    setDeleting(false)
    if (error) { toast.error(friendlyError(error)); return }
    setTags(prev => prev.filter(t => t.id !== toDelete.id))
    toast.success(`Deleted "${toDelete.name}"`)
    setToDelete(null)
  }

  if (loading) return <><SectionHeader title="Tags" /><Skeleton rows={4} /></>
  if (loadError) return <><SectionHeader title="Tags" /><LoadError message={loadError} onRetry={load} /></>

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Tags" description="Labels you can put on leads, for example Hot or Referral. Use the Tag button on the Leads page to tag many leads at once." />
      <Card padded={false}>
        {tags.length === 0 ? (
          <EmptyState icon={Tag} title="No tags yet" description="Create tags here, then add them to leads from the lead form or the Leads page." />
        ) : (
          <ul className="divide-y divide-neutral-100">
            {tags.map(t => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3 sm:px-6">
                <Tag size={16} strokeWidth={1.75} className="shrink-0 text-neutral-400" />
                <div className="min-w-0 flex-1">
                  <EditableText value={t.name} label={`tag ${t.name}`} onSave={name => rename(t, name)} />
                  <p className="text-small text-neutral-500">{plural(countOf(t), 'lead')}</p>
                </div>
                <IconButton label={`Delete tag ${t.name}`} tone="danger" onClick={() => setToDelete(t)}><Trash2 size={16} strokeWidth={1.75} /></IconButton>
              </li>
            ))}
          </ul>
        )}
        <AddRow label="New tag" placeholder="e.g. Hot lead" button="Add tag" onAdd={add} />
      </Card>
      <ConfirmDialog
        open={!!toDelete}
        title={`Delete "${toDelete?.name}"?`}
        message={toDelete && countOf(toDelete) > 0
          ? `It will be removed from ${plural(countOf(toDelete), 'lead')}. The leads themselves are not affected.`
          : 'This tag is not used on any lead.'}
        confirmLabel="Delete tag"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
