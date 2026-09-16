const fs = require('fs');

function fix(path) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/const supabase = createClient\(supabaseUrl, supabaseServiceKey\)/g, '');
  content = content.replace(/export async function (POST|GET)\(.*\) \{/g, (match, method) => {
    return `${match}\n  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "");\n`;
  });
  fs.writeFileSync(path, content);
}

fix('src/app/api/proposal/[id]/accept/route.ts');
fix('src/app/api/cron/reminders/route.ts');
