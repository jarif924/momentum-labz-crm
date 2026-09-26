/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'
import { Button, Input, Select } from '@/components/ui/Forms'
import { Modal } from '@/components/ui/Modal'
import { Plus, Edit2, Trash2, Receipt, Printer, X, RefreshCw } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { friendlyError } from '@/lib/errors'

type LineItem = { description: string; qty: number; unit_price: number }

// Next number after the highest existing one for this prefix, so deletions never cause collisions
function nextInvoiceNumber(existing: { invoice_number?: string }[], prefix: string) {
  const max = existing.reduce((m, inv) => {
    const n = inv.invoice_number?.startsWith(prefix) ? parseInt(inv.invoice_number.slice(prefix.length), 10) : NaN
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}

const EMPTY_LINE: LineItem = { description: '', qty: 1, unit_price: 0 }

function fmt(amount: number, currency: string) {
  if (currency === 'BDT') return `৳${amount.toLocaleString('en-BD')}`
  if (currency === 'AUD') return `A$${amount.toLocaleString()}`
  return `$${amount.toLocaleString()}`
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: 'bg-success-50 text-success-700',
    sent: 'bg-accent-50 text-accent-700',
    overdue: 'bg-error-50 text-error-700',
    draft: 'bg-neutral-100 text-neutral-600',
    cancelled: 'bg-neutral-100 text-neutral-400',
  }
  return (
    <span className={`inline-block px-2 py-0.5 text-[10px] uppercase font-bold rounded-full tracking-wider ${styles[status] || 'bg-neutral-100 text-neutral-600'}`}>
      {status}
    </span>
  )
}

export default function InvoicesPage() {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [invoices, setInvoices] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [saving, setSaving] = useState(false)
  const toast = useToast()
  // Settings > Invoicing; these defaults reproduce the previous hardcoded behaviour
  const [invSettings, setInvSettings] = useState<{ prefix: string; include_year: boolean; default_tax_rate: number; payment_terms_days: number | null; default_gateway: string }>({
    prefix: 'ML-', include_year: true, default_tax_rate: 0, payment_terms_days: null, default_gateway: 'bkash',
  })
  const numberPrefix = (s = invSettings) => `${s.prefix}${s.include_year ? `${new Date().getFullYear()}-` : ''}`
  const defaultDueDate = (s = invSettings) =>
    s.payment_terms_days == null ? '' : new Date(Date.now() + s.payment_terms_days * 86400000).toISOString().slice(0, 10)

  const [form, setForm] = useState<any>({
    lead_id: '', invoice_number: '', currency: 'BDT',
    type: 'one-time', status: 'draft', gateway: 'bkash',
    due_date: '', notes: '', tax_rate: 0, discount_amount: 0,
    is_retainer: false, retainer_month: '', payment_reference: '',
    line_items: [{ ...EMPTY_LINE }]
  })

  useEffect(() => { fetchData() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

  async function fetchData() {
    setLoading(true)
    const [invRes, leadRes, settingsRes] = await Promise.all([
      (supabase.from('invoices') as any).select('*, leads(contacts(full_name), companies(name))').order('created_at', { ascending: false }),
      supabase.from('leads').select('id, contacts(full_name)'),
      supabase.from('system_settings').select('invoice_settings').eq('id', 1).maybeSingle()
    ])
    const s = { ...invSettings, ...((settingsRes.data as any)?.invoice_settings ?? {}) }
    setInvSettings(s)
    const prefix = numberPrefix(s)
    if (invRes.error || leadRes.error) toast.error(`Couldn't load invoices: ${friendlyError(invRes.error || leadRes.error)}`)
    if (invRes.data) setInvoices(invRes.data)
    if (leadRes.data) setLeads(leadRes.data as any)

    setForm((f: any) => ({ ...f, invoice_number: nextInvoiceNumber(invRes.data || [], prefix) }))
    setLoading(false)
  }

  function openModal(inv?: any) {
    if (inv) {
      setEditing(inv)
      setForm({
        lead_id: inv.lead_id || '',
        invoice_number: inv.invoice_number || '',
        currency: inv.currency || 'BDT',
        type: inv.type || 'one-time',
        status: inv.status || 'draft',
        gateway: inv.gateway || 'bkash',
        due_date: inv.due_date || '',
        notes: inv.notes || '',
        tax_rate: inv.tax_rate || 0,
        discount_amount: inv.discount_amount || 0,
        is_retainer: inv.is_retainer || false,
        retainer_month: inv.retainer_month || '',
        payment_reference: inv.payment_reference || '',
        line_items: inv.line_items?.length ? inv.line_items : [{ ...EMPTY_LINE }]
      })
    } else {
      setEditing(null)
      setForm({
        lead_id: '', invoice_number: nextInvoiceNumber(invoices, numberPrefix()),
        currency: 'BDT', type: 'one-time', status: 'draft',
        gateway: invSettings.default_gateway, due_date: defaultDueDate(), notes: '', tax_rate: invSettings.default_tax_rate,
        discount_amount: 0, is_retainer: false, retainer_month: '',
        payment_reference: '', line_items: [{ ...EMPTY_LINE }]
      })
    }
    setModalOpen(true)
  }

  function calcTotal(items: LineItem[], taxRate: number, discount: number) {
    const subtotal = items.reduce((s, i) => s + (i.qty * i.unit_price), 0)
    const tax = subtotal * (taxRate / 100)
    return Math.max(0, subtotal + tax - discount)
  }

  function updateLine(idx: number, field: keyof LineItem, value: string | number) {
    const newItems = [...form.line_items]
    newItems[idx] = { ...newItems[idx], [field]: field === 'description' ? value : Number(value) }
    setForm({ ...form, line_items: newItems })
  }

  function addLine() {
    setForm({ ...form, line_items: [...form.line_items, { ...EMPTY_LINE }] })
  }

  function removeLine(idx: number) {
    if (form.line_items.length === 1) return
    setForm({ ...form, line_items: form.line_items.filter((_: any, i: number) => i !== idx) })
  }

  async function handleSave() {
    if (!form.lead_id) { toast.error('Choose the client (lead) this invoice is for.'); return }
    if (!form.invoice_number?.trim()) { toast.error('Enter an invoice number.'); return }
    if (saving) return
    const total = calcTotal(form.line_items, Number(form.tax_rate), Number(form.discount_amount))
    const payload: any = {
      lead_id: form.lead_id, invoice_number: form.invoice_number,
      amount: total, currency: form.currency, type: form.type,
      status: form.status, gateway: form.gateway,
      due_date: form.due_date || null, notes: form.notes || null,
      tax_rate: Number(form.tax_rate) || 0,
      discount_amount: Number(form.discount_amount) || 0,
      is_retainer: form.is_retainer,
      retainer_month: form.retainer_month || null,
      payment_reference: form.payment_reference || null,
      line_items: form.line_items
    }
    if (form.status === 'paid' && (!editing || editing.status !== 'paid')) {
      payload.paid_at = new Date().toISOString()
    } else if (form.status !== 'paid') {
      payload.paid_at = null
    }
    setSaving(true)
    const { error } = editing
      ? await (supabase.from('invoices') as any).update(payload).eq('id', editing.id)
      : await (supabase.from('invoices') as any).insert(payload)
    setSaving(false)
    if (error) {
      toast.error(error.code === '23505'
        ? `Invoice number ${form.invoice_number} already exists. Use a different number.`
        : `Couldn't save invoice: ${friendlyError(error)}`)
      return
    }
    toast.success(editing ? 'Invoice updated' : 'Invoice created')
    setModalOpen(false)
    fetchData()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this invoice?')) return
    const { error } = await (supabase.from('invoices') as any).delete().eq('id', id)
    if (error) {
      toast.error(`Couldn't delete invoice: ${friendlyError(error)}`)
      return
    }
    toast.success('Invoice deleted')
    fetchData()
  }

  const statuses = ['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled']
  const filtered = filterStatus === 'all' ? invoices : invoices.filter((i: any) => i.status === filterStatus)
  const totalPaid = invoices.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + Number(i.amount), 0)
  const totalOutstanding = invoices.filter((i: any) => i.status === 'sent').reduce((s: number, i: any) => s + Number(i.amount), 0)

  return (
    <div className="flex flex-col max-w-5xl gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Invoices</h1>
          <p className="text-sm text-neutral-500 mt-1">Track all billing — projects, retainers, and milestone payments.</p>
        </div>
        <Button onClick={() => openModal()}>
          <Plus size={16} className="mr-2" /> New Invoice
        </Button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Collected', value: fmt(totalPaid, 'BDT'), color: 'text-success-700' },
          { label: 'Outstanding', value: fmt(totalOutstanding, 'BDT'), color: 'text-warning-700' },
          { label: 'Total Invoices', value: String(invoices.length), color: 'text-neutral-900' },
        ].map(s => (
          <div key={s.label} className="bg-neutral-0 border border-neutral-100 rounded-[16px] px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.04em] text-neutral-400 mb-1">{s.label}</p>
            <p className={`text-xl font-semibold tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {statuses.map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`h-8 px-3 rounded-full text-xs font-semibold capitalize transition-colors ${filterStatus === s ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] overflow-hidden">
        <div className="grid grid-cols-12 gap-3 p-4 bg-neutral-50 border-b border-neutral-100 text-[10px] font-bold text-neutral-400 uppercase tracking-[0.04em]">
          <div className="col-span-2">Invoice #</div>
          <div className="col-span-3">Client</div>
          <div className="col-span-2">Amount</div>
          <div className="col-span-1">Type</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1">Due</div>
          <div className="col-span-1"></div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-neutral-500 text-sm animate-pulse">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <Receipt size={40} className="text-neutral-200 mb-3" />
            <h3 className="text-base font-semibold text-neutral-900 mb-1">No invoices yet</h3>
            <p className="text-sm text-neutral-500">Create your first invoice above.</p>
          </div>
        ) : filtered.map((inv: any) => (
          <div key={inv.id} className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-neutral-100 items-center hover:bg-neutral-50 transition-colors">
            <div className="col-span-2 font-medium text-sm text-neutral-900 flex items-center gap-1.5">
              {inv.is_retainer && <RefreshCw size={12} className="text-accent-500 shrink-0" />}
              {inv.invoice_number}
            </div>
            <div className="col-span-3 text-sm text-neutral-700 truncate">
              {inv.leads?.contacts?.full_name || inv.leads?.companies?.name || '—'}
            </div>
            <div className="col-span-2 text-sm font-semibold text-neutral-900 tabular-nums">
              {fmt(Number(inv.amount), inv.currency)}
            </div>
            <div className="col-span-1">
              <span className="text-[10px] text-neutral-500 capitalize">{inv.type}</span>
            </div>
            <div className="col-span-2"><StatusBadge status={inv.status} /></div>
            <div className="col-span-1 text-xs text-neutral-500 tabular-nums">
              {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-GB', { day:'2-digit', month:'short' }) : '—'}
            </div>
            <div className="col-span-1 flex justify-end gap-1">
              <button onClick={() => window.open(`/print/invoices/${inv.id}`, '_blank')} className="p-1.5 text-neutral-400 hover:text-neutral-900 transition-colors">
                <Printer size={13} />
              </button>
              <button onClick={() => openModal(inv)} className="p-1.5 text-neutral-400 hover:text-neutral-900 transition-colors">
                <Edit2 size={13} />
              </button>
              <button onClick={() => handleDelete(inv.id)} className="p-1.5 text-neutral-400 hover:text-error-600 transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Invoice' : 'New Invoice'}>
        <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Invoice Number *" value={form.invoice_number} onChange={e => setForm({...form, invoice_number: e.target.value})} />
            <Select label="Client *" value={form.lead_id} onChange={e => setForm({...form, lead_id: e.target.value})}>
              <option value="">Select client...</option>
              {leads.map((l: any) => <option key={l.id} value={l.id}>{(l.contacts as any)?.full_name}</option>)}
            </Select>
          </div>

          {/* Line items */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-2">Line Items</label>
            <div className="border border-neutral-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-neutral-50 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                <div className="col-span-6">Description</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-3">Unit Price</div>
                <div className="col-span-1"></div>
              </div>
              {form.line_items.map((item: LineItem, idx: number) => (
                <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-neutral-100 items-center">
                  <div className="col-span-6">
                    <input
                      className="w-full text-sm border-0 bg-transparent focus:outline-none text-neutral-900 placeholder-neutral-400"
                      value={item.description}
                      placeholder="Service description..."
                      onChange={e => updateLine(idx, 'description', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number" min="1"
                      className="w-full text-sm border-0 bg-transparent focus:outline-none text-center text-neutral-900 tabular-nums"
                      value={item.qty}
                      onChange={e => updateLine(idx, 'qty', e.target.value)}
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number" min="0"
                      className="w-full text-sm border-0 bg-transparent focus:outline-none text-neutral-900 tabular-nums"
                      value={item.unit_price}
                      onChange={e => updateLine(idx, 'unit_price', e.target.value)}
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => removeLine(idx)} className="text-neutral-400 hover:text-error-600">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <div className="px-3 py-2 border-t border-neutral-100">
                <button onClick={addLine} className="text-xs font-semibold text-accent-600 hover:text-accent-700 flex items-center gap-1">
                  <Plus size={13} /> Add line item
                </button>
              </div>
            </div>
          </div>

          {/* Totals preview */}
          <div className="bg-neutral-50 rounded-lg px-4 py-3 text-sm">
            {(() => {
              const sub = form.line_items.reduce((s: number, i: LineItem) => s + i.qty * i.unit_price, 0)
              const tax = sub * (Number(form.tax_rate) / 100)
              const total = Math.max(0, sub + tax - Number(form.discount_amount))
              const cur = form.currency
              return (
                <div className="space-y-1">
                  <div className="flex justify-between text-neutral-600"><span>Subtotal</span><span className="tabular-nums">{fmt(sub, cur)}</span></div>
                  {Number(form.tax_rate) > 0 && <div className="flex justify-between text-neutral-600"><span>Tax ({form.tax_rate}%)</span><span className="tabular-nums">{fmt(tax, cur)}</span></div>}
                  {Number(form.discount_amount) > 0 && <div className="flex justify-between text-neutral-600"><span>Discount</span><span className="tabular-nums">−{fmt(Number(form.discount_amount), cur)}</span></div>}
                  <div className="flex justify-between font-bold text-neutral-900 pt-1 border-t border-neutral-200"><span>Total</span><span className="tabular-nums">{fmt(total, cur)}</span></div>
                </div>
              )
            })()}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input label="Tax Rate (%)" type="number" value={form.tax_rate} onChange={e => setForm({...form, tax_rate: e.target.value})} />
            <Input label="Discount (flat)" type="number" value={form.discount_amount} onChange={e => setForm({...form, discount_amount: e.target.value})} />
            <Select label="Currency" value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}>
              <option value="BDT">BDT (৳)</option>
              <option value="USD">USD ($)</option>
              <option value="AUD">AUD (A$)</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Status" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </Select>
            <Select label="Payment Gateway" value={form.gateway} onChange={e => setForm({...form, gateway: e.target.value})}>
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="stripe">Stripe</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Due Date" type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
            <Input label="Payment Reference" value={form.payment_reference} onChange={e => setForm({...form, payment_reference: e.target.value})} placeholder="TrxID, reference #..." />
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
            <input type="checkbox" checked={form.is_retainer} onChange={e => setForm({...form, is_retainer: e.target.checked})} />
            <RefreshCw size={14} className="text-accent-500" />
            This is a monthly retainer invoice
          </label>

          {form.is_retainer && (
            <Input label="Retainer Month" type="month" value={form.retainer_month} onChange={e => setForm({...form, retainer_month: e.target.value + '-01'})} />
          )}

          <Input label="Notes (shown on invoice)" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Payment instructions, thank you message..." />

          <div className="flex justify-end gap-3 pt-3 border-t border-neutral-100">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.lead_id || !form.invoice_number || saving}>{saving ? 'Saving…' : 'Save Invoice'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
