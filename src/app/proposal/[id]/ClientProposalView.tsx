/* eslint-disable @typescript-eslint/no-explicit-any */

'use client'

import { useState } from 'react'
import { CheckCircle2, ChevronRight, FileText } from 'lucide-react'

export function ClientProposalView({ proposal }: { proposal: any }) {
  const [signature, setSignature] = useState('')
  const [loading, setLoading] = useState(false)
  const [accepted, setAccepted] = useState(proposal.status === 'accepted')
  const [error, setError] = useState('')

  const subtotal = (proposal.line_items || []).reduce((acc: number, item: any) => acc + (Number(item.qty) * Number(item.unit_price)), 0)
  const discount = Number(proposal.discount_amount) || 0
  const tax = Number(proposal.tax_rate) > 0 ? (subtotal - discount) * (Number(proposal.tax_rate) / 100) : 0
  const total = subtotal - discount + tax

  async function handleAccept() {
    if (!signature.trim()) {
      setError('Please type your full name to sign.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/proposal/${proposal.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature })
      })
      const data = await res.json()
      if (data.success) {
        setAccepted(true)
      } else {
        setError(data.error || 'Failed to accept proposal')
      }
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="bg-neutral-0 rounded-[24px] shadow-sm border border-neutral-100 overflow-hidden">
      <div className="p-8 md:p-12 border-b border-neutral-100 bg-neutral-900 text-neutral-0">
        <div className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{proposal.title || 'Project Proposal'}</h1>
            <p className="text-neutral-400 mt-2">Proposal #{proposal.id.split('-')[0].toUpperCase()}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold tracking-tight">Momentum Labz</h2>
            <p className="text-neutral-400 text-sm mt-1">Growth Systems Architect</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 text-sm">
          <div>
            <p className="text-neutral-500 mb-1">Prepared For:</p>
            <p className="font-medium text-neutral-100">{proposal.leads?.contacts?.full_name}</p>
            <p className="text-neutral-400">{proposal.leads?.companies?.name}</p>
          </div>
          <div className="text-right">
            <p className="text-neutral-500 mb-1">Valid Until:</p>
            <p className="font-medium text-neutral-100">{proposal.valid_until || 'No expiry'}</p>
          </div>
        </div>
      </div>

      <div className="p-8 md:p-12">
        <h3 className="text-lg font-semibold text-neutral-900 mb-6 flex items-center gap-2">
          <FileText size={20} className="text-neutral-400" />
          Investment Summary
        </h3>

        <div className="border border-neutral-100 rounded-[12px] overflow-hidden mb-8">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-100 text-neutral-500">
              <tr>
                <th className="py-3 px-4 font-medium">Description</th>
                <th className="py-3 px-4 font-medium w-24 text-right">Qty</th>
                <th className="py-3 px-4 font-medium w-32 text-right">Price</th>
                <th className="py-3 px-4 font-medium w-32 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {(proposal.line_items || []).map((item: any, idx: number) => (
                <tr key={idx}>
                  <td className="py-4 px-4 text-neutral-900">{item.description}</td>
                  <td className="py-4 px-4 text-neutral-500 text-right">{item.qty}</td>
                  <td className="py-4 px-4 text-neutral-500 text-right">{proposal.currency} {Number(item.unit_price).toLocaleString()}</td>
                  <td className="py-4 px-4 text-neutral-900 font-medium text-right">{proposal.currency} {(item.qty * item.unit_price).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mb-12">
          <div className="w-full max-w-sm space-y-3 text-sm">
            <div className="flex justify-between text-neutral-500">
              <span>Subtotal</span>
              <span>{proposal.currency} {subtotal.toLocaleString()}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-danger-500">
                <span>Discount</span>
                <span>-{proposal.currency} {discount.toLocaleString()}</span>
              </div>
            )}
            {tax > 0 && (
              <div className="flex justify-between text-neutral-500">
                <span>Tax ({proposal.tax_rate}%)</span>
                <span>{proposal.currency} {tax.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold text-neutral-900 pt-3 border-t border-neutral-100">
              <span>Total Investment</span>
              <span>{proposal.currency} {total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {accepted ? (
          <div className="bg-success-50 border border-success-200 rounded-[16px] p-8 text-center flex flex-col items-center">
            <CheckCircle2 size={48} className="text-success-500 mb-4" />
            <h3 className="text-xl font-semibold text-success-900 mb-2">Proposal Accepted</h3>
            <p className="text-success-700">Thank you! This proposal has been digitally signed and accepted. We will be in touch shortly.</p>
          </div>
        ) : (
          <div className="bg-neutral-50 border border-neutral-200 rounded-[16px] p-8">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Sign & Accept</h3>
            <p className="text-sm text-neutral-500 mb-6">By typing your name below and clicking accept, you agree to the terms outlined in this proposal.</p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Type your full name as digital signature..."
                value={signature}
                onChange={e => setSignature(e.target.value)}
                className="flex-1 bg-neutral-0 border border-neutral-200 rounded-[8px] px-4 py-3 text-sm focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all"
                disabled={loading}
              />
              <button
                onClick={handleAccept}
                disabled={loading}
                className="bg-neutral-900 hover:bg-neutral-800 text-neutral-0 px-6 py-3 rounded-[8px] text-sm font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Accept Proposal'}
                {!loading && <ChevronRight size={16} />}
              </button>
            </div>
            {error && <p className="text-sm text-danger-500 mt-3">{error}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
