const fs = require('fs');
let code = fs.readFileSync('src/app/(app)/page.tsx', 'utf8');

code = code.replace(
  `import { supabase } from '@/lib/supabase';`,
  `import { createBrowserClient } from '@supabase/ssr';`
);

code = code.replace(
  `export default function DashboardPage() {`,
  `export default function DashboardPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );`
);

fs.writeFileSync('src/app/(app)/page.tsx', code);
