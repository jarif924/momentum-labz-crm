'use client'

import { useCallback, useEffect, useState } from 'react'
import { Columns3, Plus, Trash2 } from 'lucide-react'
import { Button, Input, Select } from '@/components/ui/Forms'
import { useToast } from '@/components/ui/Toast'
import {
  Card, ConfirmDialog, EditableText, EmptyState, IconButton, LoadError, Notice, ReorderControls, SectionHeader, Skeleton,
  friendlyError, moveItem, rowDragClass, useDragReorder, useSupabase, useSystemSettings,
} from './ui'

type Stage = { id: string; name: string; sort_order: number; is_won: boolean | null; is_lost: boolean | null }
type Kind = 'open' | 'won' | 'lost'

const kindOf = (s: Stage): Kind => (s.is_won ? 'won' : s.is_lost ? 'lost' : 'open')

export function PipelineSection() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Pipeline"
        description="The stages a lead moves through. Leads keep their stage when you rename it. Mark which stage means Won and which means Lost; Won creates a project, Lost asks for a reason."
      />
      <StagesCard />
      <LostReasonsCard />
    </div>
  )
}

function StagesCard() {
  const supabase = useSupabase()
  const toast = useToast()
  const [stages, setStages] = useState<Stage[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [toDelete, setToDelete] = useState<Stage | null>(null)
  const [moveTo, setMoveTo] = useState('')
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const [stageRes, leadRes] = await Promise.all([
      supabase.from('pipeline_stages').select('*').order('sort_order'),
      supabase.from('leads').select('stage'),
    ])
    const error = stageRes.error || leadRes.error
    if (error) setLoadError(friendlyError(error))
    else {
      setStages(stageRes.data as Stage[])
      const c: Record<string, number> = {}
      for (const l of leadRes.data as { stage: string }[]) c[l.stage] = (c[l.stage] ?? 0) + 1
      setCounts(c)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function addStage() {
    const name = newName.trim()
    if (!name) { toast.error('Enter a stage name.'); return }
    if (stages.some(s => s.name.toLowerCase() === name.toLowerCase())) { toast.error(`A stage called "${name}" already exists.`); return }
    setAdding(true)
    const sort_order = stages.reduce((m, s) => Math.max(m, s.sort_order), 0) + 1
    const { data, error } = await supabase.from('pipeline_stages').insert({ name, sort_order, is_won: false, is_lost: false }).select().single()
    setAdding(false)
    if (error) { toast.error(friendlyError(error)); return }
    setStages([...stages, data as Stage])
    setNewName('')
    toast.success(`Stage "${name}" added`)
  }

  async function rename(stage: Stage, name: string) {
    if (stages.some(s => s.id !== stage.id && s.name.toLowerCase() === name.toLowerCase())) {
      toast.error(`A stage called "${name}" already exists.`)
      return false
    }
    const { error } = await supabase.from('pipeline_stages').update({ name }).eq('id', stage.id)
    if (error) { toast.error(friendlyError(error)); return false }
    setStages(prev => prev.map(s => (s.id === stage.id ? { ...s, name } : s)))
    setCounts(prev => {
      const next = { ...prev }
      if (next[stage.name] !== undefined) { next[name] = next[stage.name]; delete next[stage.name] }
      return next
    })
    toast.success(`Renamed to "${name}"${counts[stage.name] ? `; ${counts[stage.name]} lead(s) moved with it` : ''}`)
    return true
  }

  async function setKind(stage: Stage, kind: Kind) {
    if (kindOf(stage) === kind) return
    const patch = { is_won: kind === 'won', is_lost: kind === 'lost' }
    const previous = stages
    setStages(prev => prev.map(s => (s.id === stage.id ? { ...s, ...patch } : s)))
    const { error } = await supabase.from('pipeline_stages').update(patch).eq('id', stage.id)
    if (error) { setStages(previous); toast.error(friendlyError(error)); return }
    toast.success(`"${stage.name}" is now ${kind === 'open' ? 'an open stage' : `a ${kind === 'won' ? 'Won' : 'Lost'} stage`}`)
  }

  async function reorder(from: number, to: number) {
    if (to < 0 || to >= stages.length || from === to) return
    const previous = stages
    const next = moveItem(stages, from, to).map((s, i) => ({ ...s, sort_order: i + 1 }))
    setStages(next)
    const { error } = await supabase.rpc('reorder_pipeline_stages', { p_ids: next.map(s => s.id) })
    if (error) { setStages(previous); toast.error(`Couldn't save the new order: ${friendlyError(error)}`) }
  }

  function askDelete(stage: Stage) {
    setToDelete(stage)
    setMoveTo(stages.find(s => s.id !== stage.id && !s.is_won && !s.is_lost)?.name ?? stages.find(s => s.id !== stage.id)?.name ?? '')
  }

  async function confirmDelete() {
    if (!toDelete) return
    const leadCount = counts[toDelete.name] ?? 0
    setDeleting(true)
    const { error } = await supabase.rpc('delete_pipeline_stage', { p_stage_id: toDelete.id, p_move_to: leadCount > 0 ? moveTo : null })
    setDeleting(false)
    if (error) { toast.error(friendlyError(error)); return }
    toast.success(leadCount > 0 ? `Deleted "${toDelete.name}" and moved ${leadCount} lead(s) to "${moveTo}"` : `Deleted "${toDelete.name}"`)
    setToDelete(null)
    load()
  }

  const drag = useDragReorder(reorder)
  const hasWon = stages.some(s => s.is_won)
  const hasLost = stages.some(s => s.is_lost)

  if (loading) return <Skeleton rows={6} />
  if (loadError) return <LoadError message={loadError} onRetry={load} />

  const deleteCount = toDelete ? counts[toDelete.name] ?? 0 : 0

  return (
    <Card title="Stages" description="Drag the handle or use the arrows to reorder. The order here is the order of the board columns." padded={false}>
      {(!hasWon || !hasLost) && stages.length > 0 && (
        <div className="px-6 pt-4">
          <Notice tone="warning">
            {!hasWon && !hasLost ? 'No stage is marked Won or Lost.' : !hasWon ? 'No stage is marked Won.' : 'No stage is marked Lost.'}{' '}
            Win and loss reporting, projects and lost reasons rely on these.
          </Notice>
        </div>
      )}

      {stages.length === 0 ? (
        <EmptyState icon={Columns3} title="No stages yet" description="Add the first stage of your sales process below, for example Prospect Found." />
      ) : (
        <ul className="divide-y divide-neutral-100">
          {stages.map((stage, i) => (
            <li
              key={stage.id}
              {...drag.rowProps(i)}
              className={`flex flex-wrap items-center gap-3 px-4 py-3 transition-colors duration-120 sm:flex-nowrap sm:px-6 ${rowDragClass(i, drag.dragIndex, drag.overIndex)}`}
            >
              <ReorderControls index={i} count={stages.length} onMove={reorder} handleProps={drag.handleProps(i)} name={stage.name} />
              {/* On phones the name keeps most of the row and the controls wrap below it */}
              <div className="min-w-[60%] flex-1 sm:min-w-0">
                <EditableText value={stage.name} label={`stage ${stage.name}`} onSave={name => rename(stage, name)} />
                <p className="text-small text-neutral-500">{counts[stage.name] ?? 0} lead{(counts[stage.name] ?? 0) === 1 ? '' : 's'}</p>
              </div>
              <KindPicker value={kindOf(stage)} onChange={k => setKind(stage, k)} name={stage.name} />
              <IconButton label={`Delete stage ${stage.name}`} tone="danger" onClick={() => askDelete(stage)} disabled={stages.length <= 1}>
                <Trash2 size={16} strokeWidth={1.75} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      <form
        className="flex flex-col gap-3 border-t border-neutral-100 px-4 py-4 sm:flex-row sm:items-end sm:px-6"
        onSubmit={e => { e.preventDefault(); addStage() }}
      >
        <div className="flex-1">
          <Input label="New stage" placeholder="e.g. Follow Up" value={newName} onChange={e => setNewName(e.target.value)} />
        </div>
        <Button type="submit" disabled={adding || !newName.trim()}>
          <Plus size={16} strokeWidth={1.75} className="mr-1.5" /> {adding ? 'Adding…' : 'Add stage'}
        </Button>
      </form>

      <ConfirmDialog
        open={!!toDelete}
        title={`Delete "${toDelete?.name}"?`}
        message={deleteCount > 0
          ? <>This stage has <strong className="text-neutral-900">{deleteCount} lead{deleteCount === 1 ? '' : 's'}</strong>. Choose where to move {deleteCount === 1 ? 'it' : 'them'} before deleting.</>
          : 'No leads are in this stage. This cannot be undone.'}
        confirmLabel={deleteCount > 0 ? 'Move leads and delete' : 'Delete stage'}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      >
        {deleteCount > 0 && (
          <Select label="Move leads to" value={moveTo} onChange={e => setMoveTo(e.target.value)}>
            {stages.filter(s => s.id !== toDelete?.id).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </Select>
        )}
      </ConfirmDialog>
    </Card>
  )
}

function KindPicker({ value, onChange, name }: { value: Kind; onChange: (k: Kind) => void; name: string }) {
  const options: { id: Kind; label: string; active: string }[] = [
    { id: 'open', label: 'Open', active: 'bg-neutral-100 text-neutral-900' },
    { id: 'won', label: 'Won', active: 'bg-success-bg text-success-text' },
    { id: 'lost', label: 'Lost', active: 'bg-danger-bg text-danger-text' },
  ]
  return (
    <div role="radiogroup" aria-label={`Type of stage ${name}`} className="ml-auto flex shrink-0 rounded-md border border-neutral-200 p-0.5 sm:ml-0">
      {options.map(o => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`h-7 rounded-sm px-2.5 text-micro transition-colors duration-120 ${value === o.id ? o.active : 'text-neutral-500 hover:text-neutral-900'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function LostReasonsCard() {
  const { data, loading, loadError, reload, save } = useSystemSettings<{ lost_reasons: string[] }>('lost_reasons')
  const toast = useToast()
  const [draft, setDraft] = useState('')
  const reasons = data?.lost_reasons ?? []

  async function add() {
    const r = draft.trim()
    if (!r) return
    if (reasons.some(x => x.toLowerCase() === r.toLowerCase())) { toast.error(`"${r}" is already in the list.`); return }
    if (await save({ lost_reasons: [...reasons, r] }, `Added "${r}"`)) setDraft('')
  }

  const drag = useDragReorder((from, to) => save({ lost_reasons: moveItem(reasons, from, to) }, 'Order saved'))

  if (loading) return <Skeleton rows={4} />
  if (loadError) return <LoadError message={loadError} onRetry={reload} />

  return (
    <Card title="Lost reasons" description="The choices shown when a lead is moved to a Lost stage. They feed the Lost Reasons chart in Analytics." padded={false}>
      {reasons.length === 0 ? (
        <EmptyState icon={Columns3} title="No lost reasons" description="Add a few common reasons, for example Price too high or Went cold." />
      ) : (
        <ul className="divide-y divide-neutral-100">
          {reasons.map((r, i) => (
            <li key={r} {...drag.rowProps(i)} className={`flex items-center gap-3 px-4 py-2.5 sm:px-6 ${rowDragClass(i, drag.dragIndex, drag.overIndex)}`}>
              <ReorderControls index={i} count={reasons.length} onMove={(f, t) => t >= 0 && t < reasons.length && save({ lost_reasons: moveItem(reasons, f, t) }, 'Order saved')} handleProps={drag.handleProps(i)} name={r} />
              <div className="min-w-0 flex-1">
                <EditableText
                  value={r}
                  label={`reason ${r}`}
                  onSave={async next => {
                    if (reasons.some((x, j) => j !== i && x.toLowerCase() === next.toLowerCase())) { toast.error(`"${next}" is already in the list.`); return false }
                    return save({ lost_reasons: reasons.map((x, j) => (j === i ? next : x)) }, 'Reason renamed')
                  }}
                />
              </div>
              <IconButton label={`Remove reason ${r}`} tone="danger" onClick={() => save({ lost_reasons: reasons.filter((_, j) => j !== i) }, `Removed "${r}"`)}>
                <Trash2 size={16} strokeWidth={1.75} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      <form className="flex flex-col gap-3 border-t border-neutral-100 px-4 py-4 sm:flex-row sm:items-end sm:px-6" onSubmit={e => { e.preventDefault(); add() }}>
        <div className="flex-1">
          <Input label="New reason" placeholder="e.g. No budget this year" value={draft} onChange={e => setDraft(e.target.value)} />
        </div>
        <Button type="submit" variant="secondary" disabled={!draft.trim()}>
          <Plus size={16} strokeWidth={1.75} className="mr-1.5" /> Add reason
        </Button>
      </form>
    </Card>
  )
}
