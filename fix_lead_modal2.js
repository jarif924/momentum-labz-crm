const fs = require('fs');
let code = fs.readFileSync('src/app/(app)/leads/LeadFormModal.tsx', 'utf8');

code = code.replace(
  "service_line: lead.service_line || 'web_development'",
  "service_line: lead.service_line || 'web_development',\n          tags: lead.lead_tags?.map((lt: any) => lt.tag_id) || []"
);

fs.writeFileSync('src/app/(app)/leads/LeadFormModal.tsx', code);
console.log('Fixed tags on if(lead) branch');
