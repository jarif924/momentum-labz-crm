'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function InvoicePrintPage() {
  const params = useParams()
  const id = params.id as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [invoice, setInvoice] = useState<any>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('invoices')
        .select('*, leads(contacts(*), companies(*))')
        .eq('id', id)
        .single()
      if (data) {
        setInvoice(data)
        // Automatically open print dialog after brief delay for rendering
        setTimeout(() => window.print(), 500)
      }
    }
    if (id) load()
  }, [id, supabase])

  if (!invoice) return <div className="p-8 text-sm">Loading invoice data...</div>

  const lead = invoice.leads
  const companyName = lead?.companies?.name || 'Client'
  const contactName = lead?.contacts?.full_name || ''
  const contactEmail = lead?.contacts?.email || ''

  return (
    <div className="max-w-4xl mx-auto p-12 bg-white print:p-0 print:m-0 print:w-full">
      {/* Brand & Document Header */}
      <div className="flex justify-between items-start mb-16 border-b pb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 mb-1">INVOICE</h1>
          <p className="text-sm text-neutral-500 font-medium">#{invoice.invoice_number}</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-neutral-900">Momentum Labz</h2>
          <p className="text-sm text-neutral-500 mt-1">Dhaka, Bangladesh</p>
          <p className="text-sm text-neutral-500">hello@momentumlabz.com</p>
        </div>
      </div>

      {/* Bill To & Details */}
      <div className="flex justify-between mb-16">
        <div>
          <h3 className="text-[10px] uppercase font-bold tracking-[0.04em] text-neutral-400 mb-2">Bill To</h3>
          <p className="font-semibold text-neutral-900">{companyName}</p>
          {contactName && <p className="text-sm text-neutral-700 mt-1">{contactName}</p>}
          {contactEmail && <p className="text-sm text-neutral-700">{contactEmail}</p>}
        </div>
        <div className="text-right flex flex-col gap-2">
          <div>
            <h3 className="text-[10px] uppercase font-bold tracking-[0.04em] text-neutral-400 mb-1">Issue Date</h3>
            <p className="text-sm font-medium text-neutral-900">{new Date(invoice.created_at).toLocaleDateString()}</p>
          </div>
          {invoice.due_date && (
            <div>
              <h3 className="text-[10px] uppercase font-bold tracking-[0.04em] text-neutral-400 mb-1">Due Date</h3>
              <p className="text-sm font-medium text-neutral-900">{new Date(invoice.due_date).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Line Items */}
      <div className="mb-16">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-neutral-900">
              <th className="py-3 text-[10px] uppercase font-bold tracking-[0.04em] text-neutral-900">Description</th>
              <th className="py-3 text-right text-[10px] uppercase font-bold tracking-[0.04em] text-neutral-900">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-neutral-100">
              <td className="py-4">
                <p className="font-medium text-sm text-neutral-900 capitalize">{invoice.type} Services</p>
                <p className="text-xs text-neutral-500 mt-1">Professional services rendered as per agreement.</p>
              </td>
              <td className="py-4 text-right font-medium text-neutral-900 tabular-nums">
                {invoice.currency === 'BDT' ? '৳' : '$'}{invoice.amount.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Totals & Payment */}
      <div className="flex justify-between items-start">
        <div className="w-1/2">
          <h3 className="text-[10px] uppercase font-bold tracking-[0.04em] text-neutral-400 mb-2">Payment Details</h3>
          <p className="text-sm text-neutral-900 capitalize"><strong>Method:</strong> {invoice.gateway?.replace('_', ' ')}</p>
          <p className="text-sm text-neutral-900 capitalize mt-1"><strong>Status:</strong> {invoice.status}</p>
        </div>
        <div className="w-1/3">
          <div className="flex justify-between py-2 border-b border-neutral-100">
            <span className="text-sm text-neutral-500">Subtotal</span>
            <span className="text-sm font-medium tabular-nums">{invoice.currency === 'BDT' ? '৳' : '$'}{invoice.amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-3 border-b-2 border-neutral-900">
            <span className="text-base font-bold text-neutral-900">Total Due</span>
            <span className="text-base font-bold text-neutral-900 tabular-nums">{invoice.currency === 'BDT' ? '৳' : '$'}{invoice.amount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-32 text-center text-xs text-neutral-400 print:absolute print:bottom-8 print:w-full">
        Thank you for your business. Momentum Labz — Conversion Infrastructure.
      </div>

      {/* Non-print controls */}
      <div className="mt-12 text-center print:hidden">
        <button 
          onClick={() => window.print()}
          className="px-4 py-2 bg-neutral-900 text-white rounded-md text-sm font-medium hover:bg-neutral-800 transition"
        >
          Print / Save PDF
        </button>
      </div>
    </div>
  )
}
