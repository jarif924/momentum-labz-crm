/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const getName = (relation: any) => {
  const obj = Array.isArray(relation) ? relation[0] : relation;
  if (!obj) return 'Unknown';
  const contacts = Array.isArray(obj.contacts) ? obj.contacts[0] : obj.contacts;
  return contacts?.full_name || 'Unknown';
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const today = new Date().toISOString().split('T')[0]
    
    const { data: overdueInvoices } = await supabase
      .from('invoices')
      .select('id, invoice_number, leads(contacts(full_name))')
      .eq('status', 'sent')
      .lt('due_date', today)

    if (overdueInvoices) {
      for (const inv of overdueInvoices) {
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .like('message', `%${inv.invoice_number}%`)
          .gt('created_at', today)
        
        if (!existing || existing.length === 0) {
          await supabase.from('notifications').insert({
            title: 'Invoice Overdue',
            message: `Invoice ${inv.invoice_number} for ${getName(inv.leads)} is past its due date.`,
            type: 'warning',
            link: '/invoices'
          })
        }
      }
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: stages } = await supabase.from('pipeline_stages').select('name').or('is_won.eq.true,is_lost.eq.true')
    const excludeStages = stages?.map(s => s.name) || []

    let leadsQuery = supabase
      .from('leads')
      .select('id, stage, contacts(full_name)')
      .lt('updated_at', sevenDaysAgo)
    
    if (excludeStages.length > 0) {
      leadsQuery = leadsQuery.not('stage', 'in', `(${excludeStages.join(',')})`)
    }

    const { data: staleLeads } = await leadsQuery

    if (staleLeads) {
      for (const lead of staleLeads) {
        const contactName = Array.isArray((lead as any).contacts) ? (lead as any).contacts[0]?.full_name : (lead as any).contacts?.full_name;
        
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .like('message', `%${contactName}%`)
          .gt('created_at', today)
        
        if (!existing || existing.length === 0) {
          await supabase.from('notifications').insert({
            title: 'Stale Lead Alert',
            message: `Lead ${contactName || 'Unknown'} has been in "${lead.stage}" for over 7 days.`,
            type: 'system',
            link: '/leads'
          })
        }
      }
    }

    return NextResponse.json({ success: true, overdue: overdueInvoices?.length || 0, stale: staleLeads?.length || 0 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
