'use client'

import { Input, Select } from '@/components/ui/Forms'
import type { CustomFieldDef } from '@/lib/customFields'

export function CustomFieldInput({ field, value, onChange }: {
  field: CustomFieldDef
  value: unknown
  onChange: (v: unknown) => void
}) {
  const label = field.required && field.type !== 'checkbox' ? `${field.name} *` : field.name
  const str = value === undefined || value === null ? '' : String(value)

  switch (field.type) {
    case 'textarea':
      return (
        <div className="flex flex-col gap-2">
          <label htmlFor={`cf-${field.id}`} className="text-xs font-medium text-neutral-600">{label}</label>
          <textarea
            id={`cf-${field.id}`}
            rows={3}
            value={str}
            onChange={e => onChange(e.target.value)}
            className="rounded-[10px] border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-300 focus:border-neutral-900 focus:outline-none focus:ring-[3px] focus:ring-accent-500/20"
          />
        </div>
      )
    case 'number':
      return <Input label={label} type="number" inputMode="decimal" value={str} onChange={e => onChange(e.target.value === '' ? '' : e.target.value)} />
    case 'date':
      return <Input label={label} type="date" value={str.slice(0, 10)} onChange={e => onChange(e.target.value)} />
    case 'url':
      return <Input label={label} type="url" placeholder="https://..." value={str} onChange={e => onChange(e.target.value)} />
    case 'select':
      return (
        <Select label={label} value={str} onChange={e => onChange(e.target.value)}>
          <option value="">Not set</option>
          {(field.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
          {str && !(field.options ?? []).includes(str) && <option value={str}>{str} (removed option)</option>}
        </Select>
      )
    case 'checkbox':
      return (
        <label className="flex h-10 cursor-pointer items-center gap-3 text-sm text-neutral-900">
          <input
            type="checkbox"
            checked={value === true || value === 'true'}
            onChange={e => onChange(e.target.checked)}
            className="h-[18px] w-[18px] rounded-sm accent-neutral-900"
          />
          {field.name}
        </label>
      )
    default:
      return <Input label={label} value={str} onChange={e => onChange(e.target.value)} />
  }
}
