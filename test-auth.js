const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://loivivphqzedhutgxzcl.supabase.co', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'sajidhasan.hr@gmail.com',
    password: 'Momentum123!',
  });
  console.log('Result:', JSON.stringify({ data, error }, null, 2));
})();
