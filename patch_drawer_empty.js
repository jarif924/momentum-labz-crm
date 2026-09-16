const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/leads/LeadDrawer.tsx', 'utf8');

content = content.replace(
  "import { Button, Input } from '@/components/ui/Forms';",
  "import { Button, Input } from '@/components/ui/Forms';\nimport { EmptyState } from '@/components/ui/EmptyState';\nimport { FileText as FileTextIcon, Receipt, Activity } from 'lucide-react';"
);

// Proposals empty state
content = content.replace(
  /<div className="text-sm text-neutral-500 italic">No proposals yet\.<\/div>/g,
  '<EmptyState icon={FileTextIcon} title="No proposals yet" description="Create a proposal to send to this client." />'
);

// Invoices empty state
content = content.replace(
  /<div className="text-sm text-neutral-500 italic">No invoices yet\.<\/div>/g,
  '<EmptyState icon={Receipt} title="No invoices yet" description="Generate an invoice when the deal is won." />'
);

// Activity empty state
content = content.replace(
  /<div className="text-sm text-neutral-500 italic py-4 text-center">No activity yet\.<\/div>/g,
  '<EmptyState icon={Activity} title="No activity" description="Log a note or complete an action to start the timeline." />'
);

fs.writeFileSync('src/app/(app)/leads/LeadDrawer.tsx', content);
console.log('Patched LeadDrawer empty states');
