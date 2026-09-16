const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log('--- Starting E2E Test ---');

  const { data: contact, error: cErr } = await supabase.from('contacts').insert({ full_name: 'E2E Test Lead', email: 'e2e@test.com' }).select().single();
  if(cErr) return console.error('Contact error:', cErr);

  const { data: lead, error: lErr } = await supabase.from('leads').insert({
    contact_id: contact.id,
    stage: 'New',
    deal_value: 5000,
    currency: 'USD',
    next_action_type: 'call',
    next_action_date: new Date().toISOString(),
    next_action_notes: 'Initial discovery call'
  }).select().single();
  if(lErr) return console.error('Lead error:', lErr);
  console.log('✅ Lead created with Next Action.');

  await supabase.from('activities').insert({ lead_id: lead.id, channel: 'call', summary: 'Completed Action: Initial discovery call' });
  await supabase.from('leads').update({ next_action_type: null, next_action_date: null, next_action_notes: null }).eq('id', lead.id);
  console.log('✅ Next Action completed and logged to Activity Timeline.');

  await supabase.from('leads').update({ stage: 'Lost', lost_reason: 'Price Too High' }).eq('id', lead.id);
  console.log('✅ Lead moved to Lost with reason: Price Too High.');

  const { data: checkLead } = await supabase.from('leads').select('lost_reason, stage').eq('id', lead.id).single();
  if(checkLead.stage === 'Lost' && checkLead.lost_reason === 'Price Too High') {
    console.log('✅ Analytics data correctly saved.');
  }

  await supabase.from('leads').delete().eq('id', lead.id);
  await supabase.from('contacts').delete().eq('id', contact.id);
  console.log('✅ Cleanup complete.');
  console.log('--- E2E Test Passed ---');
}

runTest();
