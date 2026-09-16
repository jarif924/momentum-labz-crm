const fs = require('fs');
let content = fs.readFileSync('src/app/portal/[id]/page.tsx', 'utf8');

// Fix double braces on leads generated
content = content.replace(/\{\{project\.leads_generated\}\}/g, "{project.leads_generated}");
content = content.replace(/\{\{task\.loom_url\.replace\('\/share\/', '\/embed\/'\)\}\}/g, "{task.loom_url.replace('/share/', '/embed/')}");

fs.writeFileSync('src/app/portal/[id]/page.tsx', content);
