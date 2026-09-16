const fs = require('fs');

// Fix invoices/page.tsx
let inv = fs.readFileSync('src/app/(app)/invoices/page.tsx', 'utf8');
inv = inv.replace(
  "import { Button, Input, Select, Modal } from '@/components/ui/Forms';",
  "import { Button, Input, Select } from '@/components/ui/Forms';\nimport { Modal } from '@/components/ui/Modal';"
);
inv = inv.replace("const [proposals, setProposals] = useState<any[]>([]);\n", "");
inv = inv.replace("if (pData) setProposals(pData);", "");
inv = inv.replace("const [ { data: invData }, { data: lData }, { data: pData } ] = await Promise.all([", "const [ { data: invData }, { data: lData } ] = await Promise.all([");
inv = inv.replace("      supabase.from('proposals').select('*').order('created_at', { ascending: false })\n    ]);", "    ]);");
fs.writeFileSync('src/app/(app)/invoices/page.tsx', inv);

// Fix LeadDrawer.tsx
let lead = fs.readFileSync('src/app/(app)/leads/LeadDrawer.tsx', 'utf8');
lead = lead.replace("FileText, Receipt, Printer", "FileText, Printer");
fs.writeFileSync('src/app/(app)/leads/LeadDrawer.tsx', lead);

// Fix print/invoices/[id]/page.tsx
let printPage = fs.readFileSync('src/app/print/invoices/[id]/page.tsx', 'utf8');
printPage = printPage.replace("const [invoice, setInvoice] = useState<any>(null)", "// eslint-disable-next-line @typescript-eslint/no-explicit-any\n  const [invoice, setInvoice] = useState<any>(null)");
fs.writeFileSync('src/app/print/invoices/[id]/page.tsx', printPage);

