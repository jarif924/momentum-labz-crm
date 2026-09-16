const fs = require('fs');
let code = fs.readFileSync('src/middleware.ts', 'utf8');
code = code.replace("'/api/leads/ingest'", "'/api/leads/ingest', '/api/debug-env'");
fs.writeFileSync('src/middleware.ts', code);
