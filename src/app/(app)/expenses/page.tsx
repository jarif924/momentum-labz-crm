/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'
import { Plus, Edit2, Trash2, ArrowDownLeft } from 'lucide-react'
import { Button, Input, Select } from '@/components/ui/Forms'
import { Modal } from '@/components/ui/Modal'

const CATEGORIES = [
  { value: 'tools', label: 'Tools & Subscriptions' },
  { value: 'freelancer', label: 'Freelancer Payment' },
  { value: 'ad_spend', label: 'Ad Spend (Meta/Google)' },
  { value: 'software', label: 'Software / SaaS' },
  { value: 'domain_hosting', label: 'Domain & Hosting' },
  { value: 'other', label: 'Other' },
]

const PAYMENT_METHODS = ['bkash', 'nagad', 'bank_transfer', 'stripe', 'cash', 'card']

const EMPTY_FORM = {
  date: new Date().toISOString().split('T')[0],
  description: '', amount: '', currency: 'BDT',
  category: 'tools', vendor: '', payment_method: 'bkash',
  notes: '', is_billable: false, lead_id: ''
}

function fmt(amount: number, currency: string) {
  if (currency === 'BDT') return `৳${amount.toLocaleString('en-BD')}`
  if (currency === 'AUD') return `A$${amount.toLocaleString()}`
  return `$${amount.toLocaleString()}`
}

export default function ExpensesPage() {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [expenses, setExpenses] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>(EMPTY_FORM)
  const [filterCat, setFilterCat] = useState('all')

  useEffect(() => { fetchData() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

  async function fetchData() {
    setLoading(true)
    const [expRes, leadRes] = await Promise.all([
      (supabase.from('expenses') as any).select('*, leads(contacts(full_name))').order('date', { ascending: false }),
      supabase.from('leads').select('id, contacts(full_name)')
    ])
    if (expRes.data) setExpenses(expRes.data)
    if (leadRes.data) setLeads(leadRes.data as any)
    setLoading(false)
  }

  function openModal(exp?: any) {
    if (exp) {
      setEditing(exp)
      setForm({ ...exp, amount: String(exp.amount), lead_id: exp.lead_id || '' })
    } else {
      setEditing(null)
      setForm(EMPTY_FORM)
    }
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.description || !form.amount) return
    const payload = {
      date: form.date, description: form.description,
      amount: parseFloat(form.amount), currency: form.currency,
      category: form.category, vendor: form.vendor || null,
      payment_method: form.payment_method, notes: form.notes || null,
      is_billable: form.is_billable, lead_id: form.lead_id || null
    }
    if (editing) {
      await (supabase.from('expenses') as any).update(payload).eq('id', editing.id)
    } else {
      await (supabase.from('expenses') as any).insert(payload)
    }
    setModalOpen(false)
    fetchData()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this expense?')) return
    await (supabase.from('expenses') as any).delete().eq('id', id)
    fetchData()
  }

  const filtered = filterCat === 'all' ? expenses : expenses.filter((e: any) => e.category === filterCat)
  const totalFiltered = filtered.reduce((s: number, e: any) => s + Number(e.amount), 0)

  return (
    <div className="flex flex-col max-w-5xl gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Expenses</h1>
          <p className="text-sm text-neutral-500 mt-1">Track tools, freelancers, ad spend, and all outgoing costs.</p>
        </div>
        <Button onClick={() => openModal()}>
          <Plus size={16} className="mr-2" /> Add Expense
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {[{ value: 'all', label: 'All' }, ...CATEGORIES].map(cat => (
          <button
            key={cat.value}
            onClick={() => setFilterCat(cat.value)}
            className={`h-8 px-3 rounded-full text-xs font-semibold transition-colors ${filterCat === cat.value ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-12 gap-3 p-4 bg-neutral-50 border-b border-neutral-100 text-[10px] font-bold text-neutral-400 uppercase tracking-[0.04em]">
          <div className="col-span-2">Date</div>
          <div className="col-span-3">Description</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-2">Vendor</div>
          <div className="col-span-1">Method</div>
          <div className="col-span-1 text-right">Amount</div>
          <div className="col-span-1"></div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-neutral-500 text-sm animate-pulse">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <ArrowDownLeft size={40} className="text-neutral-200 mb-3" />
            <h3 className="text-base font-semibold text-neutral-900 mb-1">No expenses yet</h3>
            <p className="text-sm text-neutral-500">Start tracking your costs — tools, freelancers, ad spend.</p>
          </div>
        ) : (
          <>
            {filtered.map((exp: any) => {
              const catLabel = CATEGORIES.find(c => c.value === exp.category)?.label || exp.category
              return (
                <div key={exp.id} className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-neutral-100 items-center hover:bg-neutral-50 transition-colors">
                  <div className="col-span-2 text-xs text-neutral-600 tabular-nums">{exp.date?.slice(0,10)}</div>
                  <div className="col-span-3">
                    <p className="text-sm font-medium text-neutral-900 truncate">{exp.description}</p>
                    {exp.leads?.contacts?.full_name && (
                      <p className="text-[10px] text-accent-600">Client: {exp.leads.contacts.full_name}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                      {catLabel}
                    </span>
                  </div>
                  <div className="col-span-2 text-xs text-neutral-600 truncate">{exp.vendor || '—'}</div>
                  <div className="col-span-1 text-[10px] text-neutral-500 uppercase">{exp.payment_method?.replace('_',' ')}</div>
                  <div className="col-span-1 text-right text-sm font-semibold text-neutral-900 tabular-nums">
                    {fmt(Number(exp.amount), exp.currency)}
                  </div>
                  <div className="col-span-1 flex justify-end gap-1">
                    <button onClick={() => openModal(exp)} className="p-1.5 text-neutral-400 hover:text-neutral-900 transition-colors">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => handleDelete(exp.id)} className="p-1.5 text-neutral-400 hover:text-error-600 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
            {/* Total row */}
            <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-neutral-50 items-center">
              <div className="col-span-11 text-sm font-semibold text-neutral-700">Total ({filterCat === 'all' ? 'All categories' : CATEGORIES.find(c=>c.value===filterCat)?.label})</div>
              <div className="col-span-1 text-right text-sm font-bold text-neutral-900 tabular-nums">৳{totalFiltered.toLocaleString()}</div>
            </div>
          </>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Expense' : 'Add Expense'}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date *" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
            <Input label="Amount *" type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
          </div>
          <Input label="Description *" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="e.g. Antigravity Pro subscription" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
            <Select label="Currency" value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}>
              <option value="BDT">BDT (৳)</option>
              <option value="USD">USD ($)</option>
              <option value="AUD">AUD (A$)</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Vendor / Payee" value={form.vendor} onChange={e => setForm({...form, vendor: e.target.value})} placeholder="e.g. Meta, Vercel..." />
            <Select label="Payment Method" value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})}>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace('_',' ')}</option>)}
            </Select>
          </div>
          <Select label="Link to Client (optional)" value={form.lead_id} onChange={e => setForm({...form, lead_id: e.target.value})}>
            <option value="">— Not client-specific —</option>
            {leads.map((l:any) => <option key={l.id} value={l.id}>{(l.contacts as any)?.full_name}</option>)}
          </Select>
          <Input label="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Optional notes..." />
          <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
            <input type="checkbox" checked={form.is_billable} onChange={e => setForm({...form, is_billable: e.target.checked})} />
            This expense is billable to the client
          </label>
          <div className="flex justify-end gap-3 pt-3 border-t border-neutral-100">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.description || !form.amount}>Save Expense</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
