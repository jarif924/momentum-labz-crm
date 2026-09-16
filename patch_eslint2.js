const fs = require('fs');
let code = fs.readFileSync('src/app/api/leads/ingest/route.ts', 'utf8');
code = code.replace(/catch \(\_\) \{\}/g, "catch {}");
fs.writeFileSync('src/app/api/leads/ingest/route.ts', code);
