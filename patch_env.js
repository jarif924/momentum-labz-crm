const fs = require('fs');
let code = fs.readFileSync('.env.local', 'utf8');
code = code.replace(
  'DATABASE_URL="postgresql://postgres.mjvpdvopcxpthultrjpf:kirekikhbr@@$$924@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"',
  'DATABASE_URL="postgresql://postgres.mjvpdvopcxpthultrjpf:kirekikhbr%40%40%24%24924@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"'
);
fs.writeFileSync('.env.local', code);
