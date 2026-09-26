const fs = require('fs');
let code = fs.readFileSync('.env.local', 'utf8');
code = code.replace(
  'DATABASE_URL=process.env.DATABASE_URL',
  'DATABASE_URL=process.env.DATABASE_URL'
);
fs.writeFileSync('.env.local', code);
