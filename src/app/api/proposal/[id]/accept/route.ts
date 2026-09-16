/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const { signature } = await req.json()
    const proposalId = params.id

    const { data: proposal, error: propErr } = await supabase
      .from('proposals')
      .select('*, leads(id, stage)')
      .eq('id', proposalId)
      .single()

    if (propErr || !proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })

    const { error: updateErr } = await supabase
      .from('proposals')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        notes: (proposal.notes || '') + `\n\nDigitally signed by: ${signature}`
      })
      .eq('id', proposalId)

    if (updateErr) throw updateErr

    if (proposal.leads && (proposal.leads as any).stage !== 'Won') {
      await supabase.from('leads').update({ stage: 'Won' }).eq('id', (proposal.leads as any).id)
    }

    const { error: invErr } = await supabase
      .from('invoices')
      .insert({
        lead_id: proposal.lead_id,
        proposal_id: proposalId,
        amount: proposal.amount,
        currency: proposal.currency,
        type: 'one_time',
        status: 'draft',
        gateway: 'bank_transfer',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        line_items: proposal.line_items || [],
        tax_rate: proposal.tax_rate || 0,
        discount_amount: proposal.discount_amount || 0,
        notes: `Automatically generated from accepted Proposal ${proposal.title || ''}`,
        is_retainer: false
      })

    if (invErr) throw invErr

    await supabase.from('notifications').insert({
      title: 'Proposal Accepted 🎉',
      message: `${signature} just signed the proposal! An invoice has been automatically generated.`,
      type: 'success',
      link: '/invoices'
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
