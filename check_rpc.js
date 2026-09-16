const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://mjvpdvopcxpthultrjpf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdnBkdm9wY3hwdGh1bHRyanBmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTM3Njk2NCwiZXhwIjoyMTA0OTUyOTY0fQ.k2SMUAp7ZXh64F2mIbPtP58ouACcqiOPfduOgwcQg-s'
);
async function check() {
  const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
  console.log({data, error});
}
check();
