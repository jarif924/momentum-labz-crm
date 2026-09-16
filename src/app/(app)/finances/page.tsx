/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'
import {
  TrendingUp, Clock, AlertTriangle, ArrowUpRight,
  RefreshCw, Receipt, ArrowDownLeft
} from 'lucide-react'
import Link from 'next/link'

function fmt(amount: number, currency: string) {
  if (currency === 'BDT') return `৳${amount.toLocaleString('en-BD')}`
  if (currency === 'AUD') return `A$${amount.toLocaleString('en-AU')}`
  return `$${amount.toLocaleString('en-US')}`
}

function StatCard({ label, value, sub, icon: Icon, accent }: any) {
  return (
    <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-neutral-400">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon size={16} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-semibold text-neutral-900 tabular-nums">{value}</p>
        {sub && <p className="text-xs text-neutral-500 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

export default function FinancesPage() {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [invoices, setInvoices] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [proposals, setProposals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

  async function fetchData() {
    setLoading(true)
    const [invRes, expRes, propRes] = await Promise.all([
      (supabase.from('invoices') as any).select('*, leads(contacts(full_name))').order('created_at', { ascending: false }),
      (supabase.from('expenses') as any).select('*').order('date', { ascending: false }),
      (supabase.from('proposals') as any).select('*').eq('status', 'sent'),
    ])
    if (invRes.data) setInvoices(invRes.data)
    if (expRes.data) setExpenses(expRes.data)
    if (propRes.data) setProposals(propRes.data)
    setLoading(false)
  }

  // Revenue calcs per currency
  const currencies = ['BDT', 'USD', 'AUD']
  const revenueMap: Record<string, number> = {}
  const outstandingMap: Record<string, number> = {}
  const overdueMap: Record<string, number> = {}

  invoices.forEach(inv => {
    const cur = inv.currency || 'BDT'
    const amt = Number(inv.amount) || 0
    if (inv.status === 'paid') revenueMap[cur] = (revenueMap[cur] || 0) + amt
    if (inv.status === 'sent') outstandingMap[cur] = (outstandingMap[cur] || 0) + amt
    if (inv.status === 'overdue') overdueMap[cur] = (overdueMap[cur] || 0) + amt
  })

  const totalExpenses = expenses.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0)
  const pipelineValue = proposals.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0)

  const mrrInvoices = invoices.filter((i: any) => i.is_retainer && i.status === 'paid')
  const mrrBDT = mrrInvoices.filter((i: any) => i.currency === 'BDT').reduce((s: number, i: any) => s + Number(i.amount), 0)

  const recentActivity = [...invoices.slice(0, 5), ...expenses.slice(0, 3)]
    .sort((a: any, b: any) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime())
    .slice(0, 8)

  if (loading) return <div className="p-8 text-center text-neutral-500 animate-pulse text-sm">Loading finances...</div>

  return (
    <div className="flex flex-col max-w-6xl gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Finance Overview</h1>
          <p className="text-sm text-neutral-500 mt-1">Revenue, expenses, retainers, and pipeline — across all currencies.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/invoices" className="flex items-center gap-2 h-9 px-4 rounded-md border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
            <Receipt size={15} /> Invoices
          </Link>
          <Link href="/expenses" className="flex items-center gap-2 h-9 px-4 rounded-md border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
            <ArrowDownLeft size={15} /> Expenses
          </Link>
        </div>
      </div>

      {/* Revenue by currency */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-neutral-400 mb-3">Collected Revenue</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {currencies.map(cur => (
            <StatCard
              key={cur}
              label={`${cur} Revenue`}
              value={fmt(revenueMap[cur] || 0, cur)}
              sub={`${invoices.filter((i:any) => i.currency === cur && i.status === 'paid').length} paid invoices`}
              icon={TrendingUp}
              accent="bg-success-50 text-success-600"
            />
          ))}
        </div>
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Outstanding"
          value={fmt(outstandingMap['BDT'] || 0, 'BDT')}
          sub="Sent, awaiting payment"
          icon={Clock}
          accent="bg-warning-50 text-warning-600"
        />
        <StatCard
          label="Overdue"
          value={fmt(overdueMap['BDT'] || 0, 'BDT')}
          sub="Past due date"
          icon={AlertTriangle}
          accent="bg-error-50 text-error-600"
        />
        <StatCard
          label="MRR (BDT)"
          value={fmt(mrrBDT, 'BDT')}
          sub={`${mrrInvoices.filter((i:any)=>i.currency==='BDT').length} active retainers`}
          icon={RefreshCw}
          accent="bg-accent-50 text-accent-600"
        />
        <StatCard
          label="Pipeline Value"
          value={fmt(pipelineValue, 'BDT')}
          sub={`${proposals.length} open proposals`}
          icon={ArrowUpRight}
          accent="bg-neutral-100 text-neutral-600"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100">
            <h2 className="text-sm font-semibold text-neutral-900">Recent Activity</h2>
          </div>
          <div className="divide-y divide-neutral-100">
            {recentActivity.length === 0 && (
              <div className="p-6 text-center text-sm text-neutral-500">No activity yet.</div>
            )}
            {recentActivity.map((item: any, idx: number) => {
              const isExpense = !!item.category
              return (
                <div key={idx} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isExpense ? 'bg-error-50' : 'bg-success-50'}`}>
                      {isExpense ? <ArrowDownLeft size={13} className="text-error-600" /> : <Receipt size={13} className="text-success-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900 leading-tight">
                        {isExpense ? item.description : (item.invoice_number || 'Invoice')}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {isExpense ? item.category : (item.leads?.contacts?.full_name || 'Client')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold tabular-nums ${isExpense ? 'text-error-600' : 'text-success-600'}`}>
                      {isExpense ? '−' : '+'}{fmt(Number(item.amount), item.currency || 'BDT')}
                    </p>
                    <p className="text-[10px] text-neutral-400">
                      {new Date(item.date || item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900">Expense Breakdown</h2>
            <Link href="/expenses" className="text-xs text-accent-600 hover:underline">View all →</Link>
          </div>
          {expenses.length === 0 ? (
            <div className="p-6 text-center text-sm text-neutral-500">No expenses tracked yet.</div>
          ) : (
            <div className="p-4">
              {(['tools', 'freelancer', 'ad_spend', 'software', 'other'] as const).map(cat => {
                const catExpenses = expenses.filter((e: any) => e.category === cat)
                const total = catExpenses.reduce((s: number, e: any) => s + Number(e.amount), 0)
                if (total === 0) return null
                const pct = totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0
                const labels: Record<string, string> = { tools: 'Tools & Subscriptions', freelancer: 'Freelancers', ad_spend: 'Ad Spend', software: 'Software', other: 'Other' }
                return (
                  <div key={cat} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-neutral-700 font-medium">{labels[cat]}</span>
                      <span className="tabular-nums text-neutral-500">৳{total.toLocaleString()} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-accent-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
              <div className="mt-4 pt-3 border-t border-neutral-100 flex justify-between text-sm">
                <span className="font-semibold text-neutral-900">Total Expenses</span>
                <span className="font-semibold tabular-nums text-neutral-900">৳{totalExpenses.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
