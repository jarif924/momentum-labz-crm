import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type Named = { contacts?: { full_name?: string } | { full_name?: string }[] | null } | null
const contactName = (rel: Named | Named[]) => {
  const obj = Array.isArray(rel) ? rel[0] : rel
  const c = Array.isArray(obj?.contacts) ? obj?.contacts[0] : obj?.contacts
  return c?.full_name || 'Unknown'
}

// True if a notification mentioning `needle` was created in the last 24 hours.
// A failed lookup counts as "already notified" so an outage never causes a flood of duplicates.
async function notifiedRecently(supabase: SupabaseClient, needle: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase.from('notifications').select('id').like('message', `%${needle}%`).gte('created_at', since).limit(1)
  return error ? true : (data?.length ?? 0) > 0
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  try {
    const today = new Date().toISOString().split('T')[0]
    let created = 0

    const { data: overdueInvoices, error: invErr } = await supabase
      .from('invoices')
      .select('id, invoice_number, leads(contacts(full_name))')
      .eq('status', 'sent')
      .lt('due_date', today)
    if (invErr) throw invErr

    for (const inv of overdueInvoices ?? []) {
      if (await notifiedRecently(supabase, `Invoice ${inv.invoice_number} `)) continue
      const { error } = await supabase.from('notifications').insert({
        title: 'Invoice Overdue',
        message: `Invoice ${inv.invoice_number} for ${contactName(inv.leads as Named)} is past its due date.`,
        type: 'warning',
        link: '/invoices',
      })
      if (!error) created++
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: closedStages, error: stageErr } = await supabase.from('pipeline_stages').select('name').or('is_won.eq.true,is_lost.eq.true')
    if (stageErr) throw stageErr

    let leadsQuery = supabase.from('leads').select('id, stage, contacts(full_name)').lt('updated_at', sevenDaysAgo)
    const closed = (closedStages ?? []).map(s => `"${String(s.name).replace(/"/g, '\\"')}"`)
    if (closed.length > 0) leadsQuery = leadsQuery.not('stage', 'in', `(${closed.join(',')})`)
    const { data: staleLeads, error: leadsErr } = await leadsQuery
    if (leadsErr) throw leadsErr

    for (const lead of staleLeads ?? []) {
      const name = contactName(lead as Named)
      const message = `Lead ${name} has been in "${lead.stage}" for over 7 days.`
      if (await notifiedRecently(supabase, message)) continue
      const { error } = await supabase.from('notifications').insert({ title: 'Stale Lead Alert', message, type: 'system', link: '/leads' })
      if (!error) created++
    }

    return NextResponse.json({ success: true, overdue: overdueInvoices?.length ?? 0, stale: staleLeads?.length ?? 0, created })
  } catch (err) {
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
