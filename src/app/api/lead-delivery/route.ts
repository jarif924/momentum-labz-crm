import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Job = {
  id: string
  enquiry_id: string
  kind: 'visitor_confirmation' | 'team_alert'
  status: string
  attempts: number
  next_attempt_at: string
}
type Enquiry = {
  id: string
  full_name: string
  email: string
  company_name: string | null
  phone: string | null
  interest: string
  project_goal: string
  crm_lead_id: string | null
}

// Service-to-service authentication. Both apps already have the same Supabase
// project service secret on the server. The raw secret is never sent over HTTP.
function validSignature(value: string, timestamp: number, id: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret || !Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 5 * 60_000) return false
  const expected = createHmac('sha256', secret).update(`${timestamp}.${id}`).digest('hex')
  if (!/^[0-9a-f]{64}$/i.test(value)) return false
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(value, 'hex'))
}

async function processJobs(enquiryId?: string) {
  const db = createAdminClient() as unknown as SupabaseClient
  let query = db.from('momentumlabzz_lead_delivery').select('*')
    .in('status', ['pending', 'failed', 'sending'])
    .lte('next_attempt_at', new Date().toISOString())
    .order('created_at', { ascending: true }).limit(12)
  if (enquiryId) query = query.eq('enquiry_id', enquiryId)

  const { data, error } = await query
  if (error) throw new Error('Email delivery queue lookup failed')
  let sent = 0, failed = 0, skipped = 0

  for (const pending of (data || []) as Job[]) {
    // Compare-and-swap: only one worker can claim a delivery attempt.
    const { data: claimed, error: claimError } = await db.from('momentumlabzz_lead_delivery')
      .update({
        status: 'sending',
        attempts: pending.attempts + 1,
        next_attempt_at: new Date(Date.now() + 10 * 60_000).toISOString()
      })
      .eq('id', pending.id)
      .eq('status', pending.status)
      .eq('next_attempt_at', pending.next_attempt_at)
      .select('*').maybeSingle()
    if (claimError || !claimed) { skipped++; continue }

    try {
      const { data: enq, error: enqError } = await db
        .from('momentumlabzz_contact_enquiries')
        .select('id,full_name,email,company_name,phone,interest,project_goal,crm_lead_id')
        .eq('id', pending.enquiry_id).single()
      if (enqError || !enq) throw new Error('Enquiry record unavailable')
      const enquiry = enq as Enquiry
      const alertTo = process.env.LEAD_ALERT_TO || process.env.SMTP_USER
      const isTeam = pending.kind === 'team_alert'
      if (isTeam && !alertTo) throw new Error('Team destination not configured')

      const subject = isTeam
        ? `New Momentum Labz enquiry: ${enquiry.interest}`
        : 'Your Momentum Labz enquiry is received'
      const text = isTeam
        ? [
            'New website enquiry',
            `Name: ${enquiry.full_name}`,
            `Email: ${enquiry.email}`,
            `Company: ${enquiry.company_name || 'Not provided'}`,
            `Phone: ${enquiry.phone || 'Not provided'}`,
            `Service: ${enquiry.interest}`,
            `Project goal:\n${enquiry.project_goal}`,
            `Review in CRM: https://crm.momentumlabzz.com/leads?lead=${enquiry.crm_lead_id || ''}`,
          ].join('\n\n')
        : [
            `Hello ${enquiry.full_name.split(' ')[0]},`,
            'Thank you for contacting Momentum Labz. We have received your project enquiry.',
            'Our team will review your request and follow up using the contact details you shared.',
            'Prefer to talk? Book here: https://calendly.com/momentumlabz/web-development-consultation-1',
            'Momentum Labz | Dhaka, Bangladesh',
          ].join('\n\n')
      const delivered = await sendEmail({ to: isTeam ? alertTo! : enquiry.email, subject, text })
      if (!delivered?.messageId) throw new Error('Email service did not confirm delivery')
      const { error: doneError } = await db.from('momentumlabzz_lead_delivery').update({
        status: 'sent', sent_at: new Date().toISOString(), last_error: null
      }).eq('id', pending.id)
      if (doneError) throw new Error('Delivery status update failed')
      sent++
    } catch (cause) {
      failed++
      const reason = cause instanceof Error ? cause.message : 'Email delivery failed'
      // Keep the job durable and retry with capped exponential backoff.
      const minutes = Math.min(12 * 60, Math.pow(2, Math.min(8, pending.attempts)) * 5)
      await db.from('momentumlabzz_lead_delivery').update({
        status: 'failed', last_error: reason.slice(0, 180),
        next_attempt_at: new Date(Date.now() + minutes * 60_000).toISOString()
      }).eq('id', pending.id)
      console.warn('Enquiry email queued for retry', pending.id)
    }
  }

  return { sent, failed, skipped }
}

export async function POST(request: Request) {
  try {
    const raw = await request.text()
    if (raw.length > 2048) return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    const payload = JSON.parse(raw)
    const id = String(payload?.enquiry_id || '')
    const timestamp = Number(payload?.timestamp)
    if (!/^[a-f0-9-]{36}$/i.test(id) ||
      !validSignature(request.headers.get('x-momentum-signature') || '', timestamp, id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const result = await processJobs(id)
    return NextResponse.json({ ok: true, ...result })
  } catch {
    return NextResponse.json({ error: 'Dispatch failed' }, { status: 503 })
  }
}

// Vercel Cron uses CRON_SECRET. This recovers emails if the immediate request
// failed, SMTP was temporarily unavailable, or the worker timed out.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try { return NextResponse.json({ ok: true, ...await processJobs() }) }
  catch { return NextResponse.json({ error: 'Recovery dispatch failed' }, { status: 503 }) }
}
