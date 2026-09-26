'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { friendlyError } from '@/lib/errors'

type Line = { description?: string; qty?: number; quantity?: number; unit_price?: number }
type Company = { name?: string; email?: string; phone?: string; address?: string; website?: string; tax_id?: string }

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'BDT', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 2 }).format(amount || 0)

const label = 'text-micro text-neutral-400'

export default function InvoicePrintPage() {
  const params = useParams()
  const id = params.id as string
  const supabase = useMemo(() => createClient(), [])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [invoice, setInvoice] = useState<any>(null)
  const [company, setCompany] = useState<Company>({})
  const [footer, setFooter] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [invRes, setRes] = await Promise.all([
        supabase.from('invoices').select('*, leads(contacts(*), companies(*))').eq('id', id).single(),
        supabase.from('system_settings').select('company_profile, invoice_settings').eq('id', 1).maybeSingle(),
      ])
      if (invRes.error || !invRes.data) { setError(invRes.error?.code === 'PGRST116' ? 'Invoice not found.' : friendlyError(invRes.error)); return }
      const settings = setRes.data as { company_profile?: Company; invoice_settings?: { footer_note?: string } } | null
      setCompany(settings?.company_profile ?? {})
      setFooter(settings?.invoice_settings?.footer_note ?? '')
      setInvoice(invRes.data)
      // Open the print dialog once the invoice has rendered
      setTimeout(() => window.print(), 500)
    }
    if (id) load()
  }, [id, supabase])

  if (error) return <div className="p-8 text-small text-danger-text">{error}</div>
  if (!invoice) return <div className="p-8 text-small text-neutral-500">Loading invoice…</div>

  const lead = invoice.leads
  const clientName = lead?.companies?.name || lead?.contacts?.full_name || 'Client'
  const contactName = lead?.companies?.name ? lead?.contacts?.full_name : ''
  const contactEmail = lead?.contacts?.email || ''
  const cur = invoice.currency || 'BDT'

  const items: { description: string; qty: number; unit: number }[] = (invoice.line_items as Line[] | null ?? [])
    .map(l => ({ description: l.description || 'Service', qty: Number(l.qty ?? l.quantity ?? 1), unit: Number(l.unit_price ?? 0) }))
    .filter(l => l.description || l.unit)
  const hasItems = items.length > 0
  // Same formula as the Invoices form: subtotal + tax - flat discount
  const subtotal = hasItems ? items.reduce((s, l) => s + l.qty * l.unit, 0) : Number(invoice.amount)
  const taxRate = Number(invoice.tax_rate) || 0
  const tax = hasItems ? subtotal * (taxRate / 100) : 0
  const discount = hasItems ? Number(invoice.discount_amount) || 0 : 0
  const total = hasItems ? Math.max(0, subtotal + tax - discount) : Number(invoice.amount)
  const date = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="mx-auto max-w-4xl bg-neutral-0 p-12 print:m-0 print:w-full print:p-0">
      <div className="mb-16 flex items-start justify-between border-b border-neutral-100 pb-8">
        <div>
          <h1 className="mb-1 text-display text-neutral-900">INVOICE</h1>
          <p className="text-body-medium text-neutral-500 tabular-nums">#{invoice.invoice_number}</p>
        </div>
        <div className="max-w-xs text-right">
          <h2 className="text-h2 text-neutral-900">{company.name || 'Your company'}</h2>
          {company.address && <p className="mt-1 whitespace-pre-line text-small text-neutral-500">{company.address}</p>}
          {company.email && <p className="text-small text-neutral-500">{company.email}</p>}
          {company.phone && <p className="text-small text-neutral-500">{company.phone}</p>}
          {company.website && <p className="text-small text-neutral-500">{company.website.replace(/^https?:\/\//, '')}</p>}
          {company.tax_id && <p className="text-small text-neutral-500">Tax / BIN: {company.tax_id}</p>}
        </div>
      </div>

      <div className="mb-16 flex justify-between">
        <div>
          <h3 className={`${label} mb-2`}>Bill to</h3>
          <p className="text-body-medium text-neutral-900">{clientName}</p>
          {contactName && <p className="mt-1 text-small text-neutral-700">{contactName}</p>}
          {contactEmail && <p className="text-small text-neutral-700">{contactEmail}</p>}
        </div>
        <div className="flex flex-col gap-2 text-right">
          <div>
            <h3 className={`${label} mb-1`}>Issue date</h3>
            <p className="text-body-medium text-neutral-900 tabular-nums">{date(invoice.created_at)}</p>
          </div>
          {invoice.due_date && (
            <div>
              <h3 className={`${label} mb-1`}>Due date</h3>
              <p className="text-body-medium text-neutral-900 tabular-nums">{date(invoice.due_date)}</p>
            </div>
          )}
        </div>
      </div>

      <table className="mb-12 w-full border-collapse text-left">
        <thead>
          <tr className="border-b-2 border-neutral-900">
            <th className={`${label} py-3 !text-neutral-900`}>Description</th>
            {hasItems && <th className={`${label} py-3 text-right !text-neutral-900`}>Qty</th>}
            {hasItems && <th className={`${label} py-3 text-right !text-neutral-900`}>Unit price</th>}
            <th className={`${label} py-3 text-right !text-neutral-900`}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {hasItems ? items.map((l, i) => (
            <tr key={i} className="border-b border-neutral-100">
              <td className="py-4 text-body text-neutral-900">{l.description}</td>
              <td className="py-4 text-right text-body text-neutral-700 tabular-nums">{l.qty}</td>
              <td className="py-4 text-right text-body text-neutral-700 tabular-nums">{money(l.unit, cur)}</td>
              <td className="py-4 text-right text-body-medium text-neutral-900 tabular-nums">{money(l.qty * l.unit, cur)}</td>
            </tr>
          )) : (
            <tr className="border-b border-neutral-100">
              <td className="py-4 text-body text-neutral-900">{invoice.notes?.split('\n')[0] || 'Professional services'}</td>
              <td className="py-4 text-right text-body-medium text-neutral-900 tabular-nums">{money(Number(invoice.amount), cur)}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="flex items-start justify-between gap-8">
        <div className="w-1/2">
          <h3 className={`${label} mb-2`}>Payment details</h3>
          <p className="text-small text-neutral-900 capitalize"><span className="text-neutral-500">Method: </span>{invoice.gateway?.replace(/_/g, ' ') || '—'}</p>
          {invoice.payment_reference && <p className="mt-1 text-small text-neutral-900"><span className="text-neutral-500">Reference: </span>{invoice.payment_reference}</p>}
          <p className="mt-1 text-small text-neutral-900 capitalize"><span className="text-neutral-500">Status: </span>{invoice.status}</p>
          {hasItems && invoice.notes && <p className="mt-4 whitespace-pre-line text-small text-neutral-600">{invoice.notes}</p>}
        </div>
        <div className="w-full max-w-xs">
          <Row name="Subtotal" value={money(subtotal, cur)} />
          {tax > 0 && <Row name={`Tax (${taxRate}%)`} value={money(tax, cur)} />}
          {discount > 0 && <Row name="Discount" value={`−${money(discount, cur)}`} />}
          <div className="flex justify-between border-b-2 border-neutral-900 py-3">
            <span className="text-h3 text-neutral-900">Total due</span>
            <span className="text-h3 text-neutral-900 tabular-nums">{money(total, cur)}</span>
          </div>
        </div>
      </div>

      {footer && (
        <div className="mt-32 whitespace-pre-line text-center text-small text-neutral-400 print:absolute print:bottom-8 print:w-full">{footer}</div>
      )}

      <div className="mt-12 text-center print:hidden">
        <button onClick={() => window.print()} className="h-10 rounded-md bg-neutral-900 px-4 text-body-medium text-neutral-0 transition-colors duration-120 hover:bg-neutral-800">
          Print / Save PDF
        </button>
      </div>
    </div>
  )
}

function Row({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-neutral-100 py-2">
      <span className="text-small text-neutral-500">{name}</span>
      <span className="text-small text-neutral-900 tabular-nums">{value}</span>
    </div>
  )
}
