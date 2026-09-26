'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Check, ChevronDown, ChevronUp, GripVertical, Pencil, X, type LucideIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Forms'
import { useToast } from '@/components/ui/Toast'
import { friendlyError } from '@/lib/errors'

// ─── Data ─────────────────────────────────────────────────────

export function useSupabase() {
  return useMemo(() => createClient(), [])
}

export { friendlyError }

/** Loads the single system_settings row and saves partial updates with rollback. */
export function useSystemSettings<T extends Record<string, unknown>>(columns: string) {
  const supabase = useSupabase()
  const toast = useToast()
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const dataRef = useRef<T | null>(null)
  dataRef.current = data

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const { data: row, error } = await supabase.from('system_settings').select(columns).eq('id', 1).single()
    if (error) setLoadError(friendlyError(error))
    else setData(row as unknown as T)
    setLoading(false)
  }, [supabase, columns])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (patch: Partial<T>, successMessage = 'Changes saved') => {
    const previous = dataRef.current
    setData(d => (d ? { ...d, ...patch } : d))
    const values: Record<string, unknown> = { ...patch }
    const { data: rows, error } = await supabase.from('system_settings').update(values).eq('id', 1).select('id')
    if (error || !rows || rows.length === 0) {
      setData(previous)
      toast.error(error ? friendlyError(error) : "Couldn't save: the settings record was not found or you don't have permission.")
      return false
    }
    toast.success(successMessage)
    return true
  }, [supabase, toast])

  return { data, setData, loading, loadError, reload: load, save }
}

// ─── Layout ───────────────────────────────────────────────────

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-h2 text-neutral-900">{title}</h2>
        {description && <p className="mt-1 max-w-xl text-small text-neutral-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function Card({ title, description, action, footer, padded = true, children }: {
  title?: string; description?: string; action?: ReactNode; footer?: ReactNode; padded?: boolean; children: ReactNode
}) {
  return (
    <section className="rounded-lg border border-neutral-100 bg-neutral-0">
      {title && (
        <header className="flex items-start justify-between gap-4 border-b border-neutral-100 px-6 py-4">
          <div>
            <h3 className="text-h3 text-neutral-900">{title}</h3>
            {description && <p className="mt-0.5 text-small text-neutral-500">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={padded ? 'p-6' : ''}>{children}</div>
      {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-neutral-100 px-6 py-4">{footer}</footer>}
    </section>
  )
}

export function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-neutral-100 bg-neutral-0" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-neutral-100 px-6 py-4 last:border-b-0">
          <div className="h-4 w-4 animate-pulse rounded-sm bg-neutral-100" />
          <div className="h-4 flex-1 animate-pulse rounded-sm bg-neutral-100" style={{ maxWidth: `${60 - i * 8}%` }} />
          <div className="h-4 w-16 animate-pulse rounded-sm bg-neutral-100" />
        </div>
      ))}
    </div>
  )
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-neutral-100 bg-neutral-0 p-6">
      <p className="text-body-medium text-danger-text">Couldn&apos;t load this section</p>
      <p className="mt-1 text-small text-neutral-500">{message}</p>
      <Button variant="secondary" size="compact" className="mt-4" onClick={onRetry}>Try again</Button>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <Icon size={48} strokeWidth={1.75} className="text-neutral-200" />
      <p className="mt-4 text-h3 text-neutral-700">{title}</p>
      <p className="mt-1 max-w-sm text-body text-neutral-500">{description}</p>
    </div>
  )
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' }) {
  const styles = tone === 'warning' ? 'bg-warning-bg text-warning-text' : 'bg-info-bg text-info-text'
  return <div className={`rounded-md px-4 py-3 text-small ${styles}`}>{children}</div>
}

// ─── Controls ─────────────────────────────────────────────────

export function IconButton({ label, tone = 'neutral', children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string; tone?: 'neutral' | 'danger'
}) {
  const toneClass = tone === 'danger'
    ? 'hover:bg-danger-bg hover:text-danger-text'
    : 'hover:bg-neutral-50 hover:text-neutral-900'
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-neutral-400 transition-colors duration-120 disabled:pointer-events-none disabled:opacity-40 md:h-8 md:w-8 ${toneClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150 disabled:opacity-40 ${checked ? 'bg-neutral-900' : 'bg-neutral-200'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-neutral-0 shadow-sm transition-transform duration-150 ${checked ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
    </button>
  )
}

/** Text that turns into an input on edit. Enter saves, Escape cancels. */
export function EditableText({ value, onSave, label, className = '' }: {
  value: string; onSave: (next: string) => Promise<boolean>; label: string; className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (!editing) setDraft(value) }, [value, editing])

  async function commit() {
    const next = draft.trim()
    if (!next || next === value) { setEditing(false); setDraft(value); return }
    setSaving(true)
    const ok = await onSave(next)
    setSaving(false)
    if (ok) setEditing(false)
  }

  if (!editing) {
    return (
      <div className={`group flex min-w-0 items-center gap-1 ${className}`}>
        <span className="truncate text-body-medium text-neutral-900">{value}</span>
        <IconButton label={`Rename ${label}`} onClick={() => setEditing(true)} className="md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100">
          <Pencil size={14} strokeWidth={1.75} />
        </IconButton>
      </div>
    )
  }

  return (
    <div className={`flex min-w-0 flex-1 items-center gap-1 ${className}`}>
      <input
        autoFocus
        aria-label={`New name for ${label}`}
        value={draft}
        disabled={saving}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') { setEditing(false); setDraft(value) }
        }}
        className="h-8 min-w-0 flex-1 rounded-md border border-neutral-900 bg-neutral-0 px-2 text-body text-neutral-900 focus:outline-none focus:ring-[3px] focus:ring-accent-500/20"
      />
      <IconButton label="Save name" onClick={commit} disabled={saving}><Check size={16} strokeWidth={1.75} /></IconButton>
      <IconButton label="Cancel rename" onClick={() => { setEditing(false); setDraft(value) }} disabled={saving}><X size={16} strokeWidth={1.75} /></IconButton>
    </div>
  )
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', destructive = true, busy, onConfirm, onCancel, children }: {
  open: boolean; title: string; message: ReactNode; confirmLabel?: string; destructive?: boolean; busy?: boolean
  onConfirm: () => void; onCancel: () => void; children?: ReactNode
}) {
  return (
    <Modal isOpen={open} onClose={busy ? () => {} : onCancel} title={title} maxWidth="md">
      <div className="text-body text-neutral-600">{message}</div>
      {children && <div className="mt-4">{children}</div>}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button variant={destructive ? 'destructive' : 'primary'} onClick={onConfirm} disabled={busy}>
          {busy ? 'Working…' : confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

// ─── Reordering (native drag via handle + keyboard/touch buttons) ─

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function useDragReorder(onMove: (from: number, to: number) => void) {
  const [armed, setArmed] = useState<number | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  function reset() { setArmed(null); setDragIndex(null); setOverIndex(null) }

  const rowProps = (i: number) => ({
    draggable: armed === i,
    onDragStart: (e: React.DragEvent) => { setDragIndex(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)) },
    onDragOver: (e: React.DragEvent) => { if (dragIndex === null) return; e.preventDefault(); if (overIndex !== i) setOverIndex(i) },
    onDrop: (e: React.DragEvent) => { e.preventDefault(); if (dragIndex !== null && dragIndex !== i) onMove(dragIndex, i); reset() },
    onDragEnd: reset,
  })

  const handleProps = (i: number) => ({
    onMouseDown: () => setArmed(i),
    onMouseUp: () => { if (dragIndex === null) setArmed(null) },
  })

  return { rowProps, handleProps, dragIndex, overIndex }
}

export function ReorderControls({ index, count, onMove, handleProps, name }: {
  index: number; count: number; onMove: (from: number, to: number) => void
  handleProps: { onMouseDown: () => void; onMouseUp: () => void }; name: string
}) {
  return (
    <div className="flex items-center">
      <span {...handleProps} className="hidden h-8 w-6 cursor-grab items-center justify-center text-neutral-300 hover:text-neutral-600 active:cursor-grabbing md:inline-flex" aria-hidden="true">
        <GripVertical size={16} strokeWidth={1.75} />
      </span>
      <div className="flex flex-col">
        <button type="button" aria-label={`Move ${name} up`} disabled={index === 0} onClick={() => onMove(index, index - 1)}
          className="flex h-5 w-8 items-center justify-center rounded-sm text-neutral-400 hover:bg-neutral-50 hover:text-neutral-900 disabled:opacity-30 md:w-6">
          <ChevronUp size={14} strokeWidth={1.75} />
        </button>
        <button type="button" aria-label={`Move ${name} down`} disabled={index === count - 1} onClick={() => onMove(index, index + 1)}
          className="flex h-5 w-8 items-center justify-center rounded-sm text-neutral-400 hover:bg-neutral-50 hover:text-neutral-900 disabled:opacity-30 md:w-6">
          <ChevronDown size={14} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  )
}

export function rowDragClass(i: number, dragIndex: number | null, overIndex: number | null) {
  if (dragIndex === i) return 'opacity-40'
  if (overIndex === i && dragIndex !== null) return 'bg-accent-50'
  return ''
}
