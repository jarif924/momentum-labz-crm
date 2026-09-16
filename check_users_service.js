const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n');
const supabaseUrl = env.find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL')).split('=')[1];
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdnBkdm9wY3hwdGh1bHRyanBmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTM3Njk2NCwiZXhwIjoyMTA0OTUyOTY0fQ.k2SMUAp7ZXh64F2mIbPtP58ouACcqiOPfduOgwcQg-s';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('users').select('*');
  console.log('Users (Service Role):', data);
}
check();
