const fs = require('fs');
let code = fs.readFileSync('src/app/api/leads/ingest/route.ts', 'utf8');
code = code.replace(/kirekikhbr@@\$924/g, "kirekikhbr@@$$$$924"); // $$$$ becomes $$ in replace
fs.writeFileSync('src/app/api/leads/ingest/route.ts', code);
