'use client'

import { useState } from 'react'
import { Pencil, Plus, SlidersHorizontal, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button, Input, Select } from '@/components/ui/Forms'
import { useToast } from '@/components/ui/Toast'
import { FIELD_TYPES, typeLabel, type CustomFieldDef, type CustomFieldType } from '@/lib/customFields'
import {
  Card, ConfirmDialog, EmptyState, IconButton, LoadError, ReorderControls, SectionHeader, Skeleton, Toggle,
  moveItem, rowDragClass, useDragReorder, useSystemSettings,
} from './ui'

type Draft = { name: string; type: CustomFieldType; options: string; required: boolean }
const EMPTY: Draft = { name: '', type: 'text', options: '', required: false }

function slug(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'field'
}

export function CustomFieldsSection() {
  const toast = useToast()
  const { data, loading, loadError, reload, save } = useSystemSettings<{ lead_custom_fields: CustomFieldDef[] }>('lead_custom_fields')
  const fields = data?.lead_custom_fields ?? []
  const [editing, setEditing] = useState<CustomFieldDef | 'new' | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState<CustomFieldDef | null>(null)

  const drag = useDragReorder((from, to) => save({ lead_custom_fields: moveItem(fields, from, to) }, 'Order saved'))

  function openNew() { setDraft(EMPTY); setEditing('new') }
  function openEdit(f: CustomFieldDef) {
    setDraft({ name: f.name, type: (f.type as CustomFieldType) || 'text', options: (f.options ?? []).join('\n'), required: !!f.required })
    setEditing(f)
  }

  async function submit() {
    const name = draft.name.trim()
    if (!name) { toast.error('Enter a field name.'); return }
    const current = editing === 'new' ? null : editing
    if (fields.some(f => f.id !== current?.id && f.name.toLowerCase() === name.toLowerCase())) { toast.error(`A field called "${name}" already exists.`); return }
    const options = draft.options.split('\n').map(o => o.trim()).filter(Boolean)
    if (draft.type === 'select' && options.length < 2) { toast.error('Add at least two options, one per line.'); return }

    const def: CustomFieldDef = {
      id: current?.id ?? (() => { let id = slug(name); while (fields.some(f => f.id === id)) id = `${id}_2`; return id })(),
      name,
      type: draft.type,
      ...(draft.type === 'select' ? { options: Array.from(new Set(options)) } : {}),
      ...(draft.required && draft.type !== 'checkbox' ? { required: true } : {}),
    }
    setSaving(true)
    const next = current ? fields.map(f => (f.id === current.id ? def : f)) : [...fields, def]
    const ok = await save({ lead_custom_fields: next }, current ? `Updated "${name}"` : `Added "${name}"`)
    setSaving(false)
    if (ok) setEditing(null)
  }

  if (loading) return <><SectionHeader title="Custom fields" /><Skeleton rows={4} /></>
  if (loadError) return <><SectionHeader title="Custom fields" /><LoadError message={loadError} onRetry={reload} /></>

  const current = editing && editing !== 'new' ? editing : null
  const typeChanged = !!current && current.type !== draft.type

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Custom fields"
        description="Extra details you track on every lead. They appear in the lead form and the lead drawer, in this order."
        action={<Button onClick={openNew}><Plus size={16} strokeWidth={1.75} className="mr-1.5" />Add field</Button>}
      />
      <Card padded={false}>
        {fields.length === 0 ? (
          <EmptyState icon={SlidersHorizontal} title="No custom fields" description="Add fields such as Niche, Budget or Launch date to capture what matters for your leads." />
        ) : (
          <ul className="divide-y divide-neutral-100">
            {fields.map((f, i) => (
              <li key={f.id} {...drag.rowProps(i)} className={`flex items-center gap-3 px-4 py-3 sm:px-6 ${rowDragClass(i, drag.dragIndex, drag.overIndex)}`}>
                <ReorderControls index={i} count={fields.length} onMove={(a, b) => b >= 0 && b < fields.length && save({ lead_custom_fields: moveItem(fields, a, b) }, 'Order saved')} handleProps={drag.handleProps(i)} name={f.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-medium text-neutral-900">{f.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex h-[22px] items-center rounded-sm bg-neutral-100 px-2 text-micro text-neutral-600">{typeLabel(f.type)}</span>
                    {f.required && <span className="inline-flex h-[22px] items-center rounded-sm bg-accent-50 px-2 text-micro text-accent-700">Required</span>}
                    {f.type === 'select' && f.options?.length ? (
                      <span className="truncate text-small text-neutral-500">{f.options.join(' · ')}</span>
                    ) : null}
                  </div>
                </div>
                <IconButton label={`Edit field ${f.name}`} onClick={() => openEdit(f)}><Pencil size={16} strokeWidth={1.75} /></IconButton>
                <IconButton label={`Delete field ${f.name}`} tone="danger" onClick={() => setToDelete(f)}><Trash2 size={16} strokeWidth={1.75} /></IconButton>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal isOpen={!!editing} onClose={() => !saving && setEditing(null)} title={current ? `Edit "${current.name}"` : 'Add custom field'} maxWidth="md">
        <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); submit() }}>
          <Input label="Field name" placeholder="e.g. Launch date" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} autoFocus />
          <Select label="Type" value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value as CustomFieldType })}>
            {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
          {typeChanged && (
            <p className="text-small text-warning-text">Existing values stay on leads. Values that don&apos;t fit the new type may need fixing.</p>
          )}
          {draft.type === 'select' && (
            <div className="flex flex-col gap-2">
              <label htmlFor="cf-options" className="text-xs font-medium text-neutral-600">Options (one per line)</label>
              <textarea
                id="cf-options"
                rows={4}
                value={draft.options}
                onChange={e => setDraft({ ...draft, options: e.target.value })}
                placeholder={'Not started\nIn progress\nSent'}
                className="rounded-[10px] border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-300 focus:border-neutral-900 focus:outline-none focus:ring-[3px] focus:ring-accent-500/20"
              />
            </div>
          )}
          {draft.type !== 'checkbox' && (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-body-medium text-neutral-900">Required</p>
                <p className="text-small text-neutral-500">A lead can&apos;t be saved without it.</p>
              </div>
              <Toggle checked={draft.required} onChange={v => setDraft({ ...draft, required: v })} label="Required" />
            </div>
          )}
          <div className="mt-2 flex justify-end gap-2 border-t border-neutral-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving || !draft.name.trim()}>{saving ? 'Saving…' : current ? 'Save field' : 'Add field'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title={`Delete "${toDelete?.name}"?`}
        message="The field disappears from the lead form and drawer. Values already saved on leads are kept, so adding a field with the same name later brings them back."
        confirmLabel="Delete field"
        onConfirm={async () => { if (await save({ lead_custom_fields: fields.filter(f => f.id !== toDelete!.id) }, `Deleted "${toDelete!.name}"`)) setToDelete(null) }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
