const fs = require('fs');
let code = fs.readFileSync('src/app/api/leads/ingest/route.ts', 'utf8');
code = code.replace(
  /if \(\!apiKey/,
  "console.log('Received API Key:', apiKey, 'Expected:', process.env.CRM_INGEST_API_KEY);\n    if (!apiKey"
);
fs.writeFileSync('src/app/api/leads/ingest/route.ts', code);
