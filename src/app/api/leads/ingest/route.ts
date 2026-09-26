import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'edge';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-crm-api-key',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    // 1. API Key Validation
    const apiKey = req.headers.get('x-crm-api-key');
    const expectedKey = process.env.CRM_INGEST_API_KEY;
    if (!apiKey || !expectedKey || apiKey !== expectedKey) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
    }

    // 2. Parse Payload
    const payload = await req.json();
    const contactData = payload.contact;
    const projectData = payload.project_details;
    const attrData = payload.attribution;

    if (!contactData || !contactData.full_name || !contactData.email) {
      return NextResponse.json({ success: false, error: 'Missing required contact fields' }, { status: 400, headers: CORS_HEADERS });
    }
    
    const safeProjectData = projectData || {};
    const admin = createAdminClient();

    // 3. Deduplication Check
    const sixtySecondsAgo = new Date(Date.now() - 60000).toISOString();
    
    let contactId = null;
    const { data: contactMatches } = await admin.from('contacts').select('id').eq('email', contactData.email).limit(1);
    
    if (contactMatches && contactMatches.length > 0) {
      contactId = contactMatches[0].id;
      const { data: recentLeads } = await admin.from('leads').select('id').eq('contact_id', contactId).gte('created_at', sixtySecondsAgo).limit(1);
      if (recentLeads && recentLeads.length > 0) {
        return NextResponse.json({ success: true, status: 'duplicate_suppressed' }, { status: 200, headers: CORS_HEADERS });
      }
    }

    // 4. Upsert Company
    let companyId = null;
    if (contactData.company_name) {
      const { data: compMatches } = await admin.from('companies').select('id').eq('name', contactData.company_name).limit(1);
      if (compMatches && compMatches.length > 0) {
        companyId = compMatches[0].id;
      } else {
        const { data: newComp } = await admin.from('companies').insert({
          name: contactData.company_name,
          website: contactData.website_url || null
        }).select('id').single();
        if (newComp) companyId = newComp.id;
      }
    }

    // 5. Upsert Contact
    if (contactId) {
      await admin.from('contacts').update({
        full_name: contactData.full_name,
        phone: contactData.phone || null,
        company_id: companyId
      }).eq('id', contactId);
    } else {
      const { data: newContact } = await admin.from('contacts').insert({
        full_name: contactData.full_name,
        email: contactData.email,
        phone: contactData.phone || null,
        company_id: companyId
      }).select('id').single();
      if (newContact) contactId = newContact.id;
    }

    // 6. Lead Scoring
    let score = 0;
    const bt = safeProjectData.budget_tier || 'unknown';
    if (bt === '10k_plus') score += 50;
    else if (bt === '5k_to_10k') score += 40;
    else if (bt === '3k_to_5k') score += 25;
    else if (bt === '1k_to_3k') score += 10;
    
    const tm = safeProjectData.timeline;
    if (tm === 'immediate') score += 25;
    else if (tm === 'within_1_month') score += 15;
    else if (tm === '1_to_3_months') score += 5;
    
    if (contactData.company_name) score += 10;
    if (contactData.phone) score += 10;
    if (safeProjectData.message && safeProjectData.message.length > 50) score += 5;

    // 7. Map Service Line
    const si = safeProjectData.service_interest || 'general_inquiry';
    let serviceLine = 'tech_solutions';
    if (['paid_ads', 'full_funnel_growth', 'branding'].includes(si)) serviceLine = 'marketing';
    else if (si === 'web_development') serviceLine = 'web_development';
    const region = 'international';

    // 8. Create Lead
    const { data: newLead, error: leadError } = await admin.from('leads').insert({
      contact_id: contactId,
      company_id: companyId,
      services: [si],
      service_line: serviceLine,
      region: region,
      source: 'inbound_form',
      stage: 'Prospect Found',
      lead_score: score,
      budget_tier: bt,
      timeline: tm || null,
      landing_page: attrData?.landing_page || null,
      submission_url: attrData?.submission_url || null,
      raw_payload: payload,
      utm_source: attrData?.utm_source || null,
      utm_medium: attrData?.utm_medium || null,
      utm_campaign: attrData?.utm_campaign || null,
      utm_content: attrData?.utm_content || null,
      utm_term: attrData?.utm_term || null,
      gclid: attrData?.gclid || null,
      fbclid: attrData?.fbclid || null,
      ttclid: attrData?.ttclid || null,
      referrer_url: attrData?.referrer_url || null,
      client_ip: attrData?.client_ip || null
    }).select('id').single();

    if (leadError || !newLead) throw leadError || new Error('Failed to create lead');
    const leadId = newLead.id;

    // 9. Auto-Tagging
    let tagString = '';
    if (score >= 70) tagString = 'PRIORITY_LEAD';
    else if (score >= 40) tagString = 'STANDARD_LEAD';
    else tagString = 'LOW_INTENT_OR_DOWNSELL';

    let tagId = null;
    const { data: tagMatches } = await admin.from('tags').select('id').eq('name', tagString).limit(1);
    
    if (tagMatches && tagMatches.length > 0) {
      tagId = tagMatches[0].id;
    } else {
      const { data: newTag } = await admin.from('tags').insert({ name: tagString }).select('id').single();
      if (newTag) tagId = newTag.id;
    }
    
    if (tagId) {
      await admin.from('lead_tags').insert({ lead_id: leadId, tag_id: tagId });
    }

    // 10. Notification Stub
    if (tagString === 'PRIORITY_LEAD') {
      console.log(`🚀 [WEBHOOK STUB] Sending PRIORITY_LEAD alert to Slack/WhatsApp for Lead ID: ${leadId} | Score: ${score}`);
    }

    return NextResponse.json({
      success: true,
      lead_id: leadId,
      message: 'Lead ingested and prioritized successfully'
    }, { status: 201, headers: CORS_HEADERS });

  } catch (err: unknown) {
    console.error('Ingest error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500, headers: CORS_HEADERS });
  }
}
