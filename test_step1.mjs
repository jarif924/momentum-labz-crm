import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log('Testing CRUD on pipeline_stages...');
  
  // Create
  const { data: inserted, error: insertError } = await supabase
    .from('pipeline_stages')
    .insert({ name: 'Test Stage', sort_order: 99, is_won: false, is_lost: false })
    .select()
    .single();
    
  if (insertError) throw new Error(`Insert failed: ${insertError.message}`);
  console.log('Created record:', inserted);
  
  // Edit
  const { data: updated, error: updateError } = await supabase
    .from('pipeline_stages')
    .update({ name: 'Test Stage Edited' })
    .eq('id', inserted.id)
    .select()
    .single();
    
  if (updateError) throw new Error(`Update failed: ${updateError.message}`);
  console.log('Updated record:', updated);
  
  // Delete
  const { error: deleteError } = await supabase
    .from('pipeline_stages')
    .delete()
    .eq('id', updated.id);
    
  if (deleteError) throw new Error(`Delete failed: ${deleteError.message}`);
  console.log('Deleted record!');
  
  // Confirm deletion
  const { data: check } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('id', updated.id)
    .single();
    
  if (!check) console.log('Successfully verified deletion.');
}

run().catch(console.error);
