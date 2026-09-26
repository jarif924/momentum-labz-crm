export type CustomFieldType = 'text' | 'textarea' | 'number' | 'date' | 'url' | 'select' | 'checkbox'

export interface CustomFieldDef {
  id: string
  name: string
  type: CustomFieldType
  options?: string[]
  required?: boolean
}

export const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'url', label: 'Link' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
]

export const typeLabel = (t: string) => FIELD_TYPES.find(f => f.value === t)?.label ?? 'Text'

const isEmpty = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '')

/** Returns an error message for the first invalid custom field value, or null. */
export function validateCustomFields(schema: CustomFieldDef[], values: Record<string, unknown>): string | null {
  for (const f of schema) {
    const v = values[f.id]
    if (f.required && f.type !== 'checkbox' && isEmpty(v)) return `${f.name} is required.`
    if (isEmpty(v)) continue
    if (f.type === 'number' && !Number.isFinite(Number(v))) return `${f.name} must be a number.`
    if (f.type === 'url') {
      try { new URL(String(v)) } catch { return `${f.name} must be a full link starting with https://` }
    }
    if (f.type === 'select' && f.options?.length && !f.options.includes(String(v))) return `Choose a valid option for ${f.name}.`
  }
  return null
}

/** Human-readable value for display, or null when empty. */
export function formatCustomValue(f: CustomFieldDef, v: unknown): string | null {
  if (f.type === 'checkbox') return v === true || v === 'true' ? 'Yes' : v === false || v === 'false' ? 'No' : null
  if (isEmpty(v)) return null
  if (f.type === 'date') {
    const d = new Date(String(v))
    return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  if (f.type === 'number') return Number(v).toLocaleString()
  return String(v)
}
