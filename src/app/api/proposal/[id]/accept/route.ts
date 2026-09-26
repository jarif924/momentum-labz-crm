import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

// Same numbering as the Invoices page: prefix (+ year) + next number after the highest existing one
async function nextInvoiceNumber(supabase: SupabaseClient) {
  const { data: settings } = await supabase.from('system_settings').select('invoice_settings').eq('id', 1).maybeSingle()
  const inv = (settings?.invoice_settings ?? {}) as { prefix?: string; include_year?: boolean }
  const prefix = `${inv.prefix ?? 'ML-'}${inv.include_year === false ? '' : `${new Date().getFullYear()}-`}`
  const { data: existing } = await supabase.from('invoices').select('invoice_number').like('invoice_number', `${prefix}%`)
  const max = (existing ?? []).reduce((m, r) => {
    const n = parseInt(String(r.invoice_number).slice(prefix.length), 10)
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient()

  try {
    const body = await req.json().catch(() => ({}))
    const signature = typeof body.signature === 'string' ? body.signature.trim() : ''
    if (signature.length < 2 || signature.length > 120) {
      return NextResponse.json({ error: 'Please type your full name to sign.' }, { status: 400 })
    }

    const { data: proposal, error: propErr } = await supabase
      .from('proposals')
      .select('*, leads(id, stage, contact_id, company_id, service_line, deal_value, currency, contacts(full_name), companies(name))')
      .eq('id', params.id)
      .single()
    if (propErr || !proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    if (proposal.status === 'accepted') {
      return NextResponse.json({ error: 'This proposal has already been accepted.' }, { status: 409 })
    }

    const invoiceNumber = await nextInvoiceNumber(supabase)
    const { error: invErr } = await supabase.from('invoices').insert({
      lead_id: proposal.lead_id,
      proposal_id: proposal.id,
      invoice_number: invoiceNumber,
      amount: proposal.amount,
      currency: proposal.currency,
      type: 'one-time',
      status: 'draft',
      gateway: 'bank_transfer',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      line_items: proposal.line_items || [],
      tax_rate: proposal.tax_rate || 0,
      discount_amount: proposal.discount_amount || 0,
      notes: `Automatically generated from accepted proposal${proposal.title ? ` "${proposal.title}"` : ''}`,
      is_retainer: false,
    })
    if (invErr) throw invErr

    const { error: updateErr } = await supabase
      .from('proposals')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        notes: (proposal.notes || '') + `\n\nDigitally signed by: ${signature}`,
      })
      .eq('id', proposal.id)
    if (updateErr) throw updateErr

    // Move the lead to the Won stage and do what the Leads board does on Won
    const lead = proposal.leads as {
      id: string; stage: string; contact_id: string | null; company_id: string | null; service_line: string | null
      deal_value: number | null; currency: string | null; contacts: { full_name: string } | null; companies: { name: string } | null
    } | null
    if (lead) {
      const { data: wonStage } = await supabase.from('pipeline_stages').select('name').eq('is_won', true).order('sort_order').limit(1).maybeSingle()
      if (wonStage && lead.stage !== wonStage.name) {
        await supabase.from('leads').update({ stage: wonStage.name }).eq('id', lead.id)
      }
      if (lead.contact_id) await supabase.from('contacts').update({ is_client: true }).eq('id', lead.contact_id)

      const { data: existingProject } = await supabase.from('projects').select('id').eq('lead_id', lead.id).maybeSingle()
      if (!existingProject) {
        let companyId = lead.company_id
        let companyName = lead.companies?.name
        if (!companyId) {
          const { data: newComp } = await supabase.from('companies').insert({ name: `${lead.contacts?.full_name || 'Client'} Company` }).select('id').single()
          if (newComp) {
            companyId = newComp.id
            companyName = lead.contacts?.full_name
            await supabase.from('leads').update({ company_id: companyId }).eq('id', lead.id)
          }
        }
        if (companyId) {
          await supabase.from('projects').insert({
            company_id: companyId,
            lead_id: lead.id,
            name: `${companyName || 'Client'} Project`,
            service_line: lead.service_line || 'web_development',
            status: 'planning',
            budget: proposal.amount || lead.deal_value || 0,
            currency: proposal.currency || lead.currency || 'BDT',
          })
        }
      }
    }

    await supabase.from('notifications').insert({
      title: 'Proposal accepted',
      message: `${signature} signed the proposal. Draft invoice ${invoiceNumber} was created.`,
      type: 'success',
      link: '/invoices',
    })

    return NextResponse.json({ success: true, invoice_number: invoiceNumber })
  } catch (err) {
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
