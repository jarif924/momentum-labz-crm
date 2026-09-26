'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button, Input, Select } from '@/components/ui/Forms'
import { useToast } from '@/components/ui/Toast'
import { Card, LoadError, SectionHeader, Skeleton, Toggle, useSupabase, useSystemSettings } from './ui'

/** Local editable copy of a settings object with dirty tracking. */
function useDraft<T>(source: T | undefined) {
  const [draft, setDraft] = useState<T | undefined>(source)
  useEffect(() => { setDraft(source) }, [source])
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(source), [draft, source])
  return { draft, setDraft, dirty, reset: () => setDraft(source) }
}

function SaveBar({ dirty, saving, onSave, onReset }: { dirty: boolean; saving: boolean; onSave: () => void; onReset: () => void }) {
  return (
    <>
      <Button variant="secondary" onClick={onReset} disabled={!dirty || saving}>Discard</Button>
      <Button onClick={onSave} disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
    </>
  )
}

function TextArea({ id, label, value, onChange, rows = 3, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs font-medium text-neutral-600">{label}</label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="rounded-[10px] border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-300 focus:border-neutral-900 focus:outline-none focus:ring-[3px] focus:ring-accent-500/20"
      />
    </div>
  )
}

// ─── Company profile ──────────────────────────────────────────

type Company = { name: string; email: string; phone: string; address: string; website: string; tax_id: string }
const EMPTY_COMPANY: Company = { name: '', email: '', phone: '', address: '', website: '', tax_id: '' }

export function CompanySection() {
  const toast = useToast()
  const { data, loading, loadError, reload, save } = useSystemSettings<{ company_profile: Company }>('company_profile')
  const source = useMemo(() => ({ ...EMPTY_COMPANY, ...(data?.company_profile ?? {}) }), [data])
  const { draft, setDraft, dirty, reset } = useDraft<Company>(source)
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!draft) return
    const clean = Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, String(v ?? '').trim()])) as Company
    if (!clean.name) { toast.error('Enter your company name.'); return }
    if (clean.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)) { toast.error('Enter a valid email address.'); return }
    if (clean.website && !/^https?:\/\//i.test(clean.website)) clean.website = `https://${clean.website}`
    setSaving(true)
    await save({ company_profile: clean }, 'Company profile saved')
    setSaving(false)
  }

  if (loading) return <><SectionHeader title="Company profile" /><Skeleton rows={5} /></>
  if (loadError || !draft) return <><SectionHeader title="Company profile" /><LoadError message={loadError ?? 'No data'} onRetry={reload} /></>

  const set = (k: keyof Company) => (e: { target: { value: string } }) => setDraft({ ...draft, [k]: e.target.value })

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Company profile" description="Your business details. They are printed on every invoice." />
      <Card footer={<SaveBar dirty={dirty} saving={saving} onSave={submit} onReset={reset} />}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Input label="Company name *" value={draft.name} onChange={set('name')} /></div>
          <Input label="Email" type="email" value={draft.email} onChange={set('email')} placeholder="hello@yourcompany.com" />
          <Input label="Phone" type="tel" value={draft.phone} onChange={set('phone')} placeholder="+880 1XXX XXXXXX" />
          <Input label="Website" value={draft.website} onChange={set('website')} placeholder="https://yourcompany.com" />
          <Input label="Tax / BIN number" value={draft.tax_id} onChange={set('tax_id')} placeholder="Optional" />
          <div className="sm:col-span-2"><TextArea id="company-address" label="Address" value={draft.address} onChange={v => setDraft({ ...draft, address: v })} placeholder={'House, Road\nCity, Country'} /></div>
        </div>
      </Card>
    </div>
  )
}

// ─── Currency & FX ────────────────────────────────────────────

type Currency = {
  currency_mapping: Record<string, string>
  fx_rates: Record<string, number>
  fx_rates_updated_at: string | null
}
const LEAD_CURRENCIES = ['BDT', 'USD', 'AUD']
const FX_CURRENCIES = ['USD', 'AUD', 'EUR']

export function CurrencySection() {
  const toast = useToast()
  const { data, loading, loadError, reload, save } = useSystemSettings<Currency>('currency_mapping, fx_rates, fx_rates_updated_at')
  const mappingSource = useMemo(() => ({ bangladesh: 'BDT', international: 'USD', ...(data?.currency_mapping ?? {}) }), [data])
  const ratesSource = useMemo(() => Object.fromEntries(FX_CURRENCIES.map(c => [c, String(data?.fx_rates?.[c] ?? '')])), [data])
  const mapping = useDraft<Record<string, string>>(mappingSource)
  const rates = useDraft<Record<string, string>>(ratesSource)
  const [savingMap, setSavingMap] = useState(false)
  const [savingRates, setSavingRates] = useState(false)

  async function saveRates() {
    const parsed: Record<string, number> = {}
    for (const c of FX_CURRENCIES) {
      const n = Number(rates.draft?.[c])
      if (!Number.isFinite(n) || n <= 0) { toast.error(`Enter a positive rate for ${c}.`); return }
      parsed[c] = Math.round(n * 10000) / 10000
    }
    setSavingRates(true)
    await save({ fx_rates: parsed, fx_rates_updated_at: new Date().toISOString() }, 'Exchange rates saved')
    setSavingRates(false)
  }

  if (loading) return <><SectionHeader title="Currency & FX" /><Skeleton rows={5} /></>
  if (loadError || !mapping.draft || !rates.draft) return <><SectionHeader title="Currency & FX" /><LoadError message={loadError ?? 'No data'} onRetry={reload} /></>

  const updated = data?.fx_rates_updated_at ? new Date(data.fx_rates_updated_at) : null

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Currency & FX" description="Default currencies for new leads, and the rates used to show pipeline totals in Taka." />
      <Card
        title="Default currency by region"
        description="When you choose a region on a new lead, its currency is set to this."
        footer={<SaveBar dirty={mapping.dirty} saving={savingMap} onReset={mapping.reset} onSave={async () => { setSavingMap(true); await save({ currency_mapping: mapping.draft! }, 'Default currencies saved'); setSavingMap(false) }} />}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[['bangladesh', 'Bangladesh'], ['international', 'International']].map(([key, label]) => (
            <Select key={key} label={label} value={mapping.draft![key]} onChange={e => mapping.setDraft({ ...mapping.draft!, [key]: e.target.value })}>
              {LEAD_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          ))}
        </div>
      </Card>
      <Card
        title="Exchange rates"
        description={updated ? `Taka per 1 unit of each currency. Last updated ${updated.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}.` : 'Taka per 1 unit of each currency.'}
        footer={<SaveBar dirty={rates.dirty} saving={savingRates} onReset={rates.reset} onSave={saveRates} />}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {FX_CURRENCIES.map(c => (
            <Input key={c} label={`1 ${c} = ৳`} type="number" inputMode="decimal" min="0" step="0.01" value={rates.draft![c]} onChange={e => rates.setDraft({ ...rates.draft!, [c]: e.target.value })} />
          ))}
        </div>
        <p className="mt-4 text-small text-neutral-500">Used only for the Taka totals on the Leads board. Invoices and reports always keep each currency separate.</p>
      </Card>
    </div>
  )
}

// ─── Invoicing ────────────────────────────────────────────────

type InvoiceSettings = {
  prefix: string
  include_year: boolean
  default_tax_rate: number
  payment_terms_days: number | null
  default_gateway: string
  footer_note: string
}
const GATEWAYS = [
  { value: 'bkash', label: 'bKash' }, { value: 'nagad', label: 'Nagad' }, { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'stripe', label: 'Stripe' }, { value: 'cash', label: 'Cash' },
]
type InvoiceDraft = { prefix: string; include_year: boolean; default_tax_rate: string; payment_terms_days: string; default_gateway: string; footer_note: string }

export function InvoicingSection() {
  const toast = useToast()
  const supabase = useSupabase()
  const { data, loading, loadError, reload, save } = useSystemSettings<{ invoice_settings: InvoiceSettings }>('invoice_settings')
  const source = useMemo<InvoiceDraft>(() => {
    const s = data?.invoice_settings
    return {
      prefix: s?.prefix ?? 'ML-',
      include_year: s?.include_year ?? true,
      default_tax_rate: String(s?.default_tax_rate ?? 0),
      payment_terms_days: s?.payment_terms_days == null ? '' : String(s.payment_terms_days),
      default_gateway: s?.default_gateway ?? 'bkash',
      footer_note: s?.footer_note ?? '',
    }
  }, [data])
  const { draft, setDraft, dirty, reset } = useDraft<InvoiceDraft>(source)
  const [saving, setSaving] = useState(false)
  const [existing, setExisting] = useState<string[]>([])

  useEffect(() => {
    supabase.from('invoices').select('invoice_number').then(({ data: rows }) => setExisting((rows ?? []).map(r => String(r.invoice_number))))
  }, [supabase])

  const preview = useMemo(() => {
    if (!draft) return ''
    const prefix = `${draft.prefix}${draft.include_year ? `${new Date().getFullYear()}-` : ''}`
    const max = existing.reduce((m, n) => {
      const v = n.startsWith(prefix) ? parseInt(n.slice(prefix.length), 10) : NaN
      return Number.isFinite(v) && v > m ? v : m
    }, 0)
    return `${prefix}${String(max + 1).padStart(3, '0')}`
  }, [draft, existing])

  async function submit() {
    if (!draft) return
    const prefix = draft.prefix.trim()
    if (!/^[A-Za-z0-9/_-]{0,12}$/.test(prefix)) { toast.error('Prefix can use letters, numbers and - _ / (max 12).'); return }
    const tax = Number(draft.default_tax_rate)
    if (!Number.isFinite(tax) || tax < 0 || tax > 100) { toast.error('Default tax must be between 0 and 100.'); return }
    let terms: number | null = null
    if (draft.payment_terms_days.trim() !== '') {
      terms = Number(draft.payment_terms_days)
      if (!Number.isInteger(terms) || terms < 0 || terms > 365) { toast.error('Payment terms must be 0 to 365 days, or empty.'); return }
    }
    setSaving(true)
    await save({ invoice_settings: { prefix, include_year: draft.include_year, default_tax_rate: tax, payment_terms_days: terms, default_gateway: draft.default_gateway, footer_note: draft.footer_note.trim() } }, 'Invoice settings saved')
    setSaving(false)
  }

  if (loading) return <><SectionHeader title="Invoicing" /><Skeleton rows={5} /></>
  if (loadError || !draft) return <><SectionHeader title="Invoicing" /><LoadError message={loadError ?? 'No data'} onRetry={reload} /></>

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Invoicing" description="Numbering and the defaults every new invoice starts with. You can still change any of them on a single invoice." />
      <Card title="Invoice numbers" footer={<SaveBar dirty={dirty} saving={saving} onSave={submit} onReset={reset} />}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Prefix" value={draft.prefix} onChange={e => setDraft({ ...draft, prefix: e.target.value })} placeholder="ML-" />
          <div className="flex items-end justify-between gap-4 rounded-md border border-neutral-100 px-3 py-2 sm:py-0">
            <div className="py-2">
              <p className="text-body-medium text-neutral-900">Include year</p>
              <p className="text-small text-neutral-500">Numbering restarts each year.</p>
            </div>
            <div className="py-3"><Toggle checked={draft.include_year} onChange={v => setDraft({ ...draft, include_year: v })} label="Include year" /></div>
          </div>
        </div>
        <p className="mt-4 text-small text-neutral-500">Next invoice number: <span className="font-medium tabular-nums text-neutral-900">{preview}</span></p>

        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-neutral-100 pt-6 sm:grid-cols-3">
          <Input label="Default tax (%)" type="number" inputMode="decimal" min="0" max="100" step="0.01" value={draft.default_tax_rate} onChange={e => setDraft({ ...draft, default_tax_rate: e.target.value })} />
          <Input label="Payment terms (days)" type="number" inputMode="numeric" min="0" max="365" value={draft.payment_terms_days} onChange={e => setDraft({ ...draft, payment_terms_days: e.target.value })} placeholder="No default" />
          <Select label="Default payment method" value={draft.default_gateway} onChange={e => setDraft({ ...draft, default_gateway: e.target.value })}>
            {GATEWAYS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
          </Select>
        </div>
        <div className="mt-4">
          <TextArea id="invoice-footer" label="Footer note (printed on invoices)" value={draft.footer_note} onChange={v => setDraft({ ...draft, footer_note: v })} rows={2} placeholder="Thank you for your business." />
        </div>
      </Card>
    </div>
  )
}
