const fs = require('fs');

let code = fs.readFileSync('src/app/(app)/leads/LeadDrawer.tsx', 'utf8');

// Add invoices state
code = code.replace(
  `const [proposals, setProposals] = useState<any[]>([]);`,
  `const [proposals, setProposals] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);`
);

// Fetch invoices
code = code.replace(
  `const { data: props } = await supabase
      .from('proposals')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false });`,
  `const { data: props } = await supabase
      .from('proposals')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false });
      
    const { data: invs } = await supabase
      .from('invoices')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false });`
);

code = code.replace(
  `if (props) setProposals(props);`,
  `if (props) setProposals(props);
    if (invs) setInvoices(invs);`
);

// Add Icon
if (!code.includes('Receipt')) {
  code = code.replace(`FileText } from 'lucide-react'`, `FileText, Receipt, Printer } from 'lucide-react'`);
} else if (!code.includes('Printer')) {
  code = code.replace(`Receipt } from 'lucide-react'`, `Receipt, Printer } from 'lucide-react'`);
}

const invoicesSection = `
          {/* Invoices */}
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100">
              <h3 className="text-sm font-semibold text-neutral-900">Invoices</h3>
            </div>
            {invoices.length === 0 ? (
              <div className="text-sm text-neutral-500 italic">No invoices yet.</div>
            ) : (
              <div className="space-y-3">
                {invoices.map(inv => (
                  <div key={inv.id} className="flex justify-between items-center bg-neutral-50 p-3 rounded-[8px] border border-neutral-100">
                    <div>
                      <div className="flex gap-2 items-center mb-1">
                        <span className="font-semibold text-sm text-neutral-900">{inv.currency === 'BDT' ? '৳' : '$'}{inv.amount.toLocaleString()}</span>
                        <span className={\`text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded \${
                          inv.status === 'paid' ? 'bg-success-bg text-success-text' :
                          inv.status === 'overdue' ? 'bg-danger-bg text-danger-text' :
                          inv.status === 'sent' ? 'bg-info-bg text-info-text' :
                          'bg-neutral-200 text-neutral-600'
                        }\`}>
                          {inv.status}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-500">#{inv.invoice_number} • {new Date(inv.created_at).toLocaleDateString()}</div>
                    </div>
                    <Button variant="ghost" size="compact" onClick={() => window.open(\`/print/invoices/\${inv.id}\`, '_blank')}>
                      <Printer size={14} /> Print
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
`;

code = code.replace(
  `{/* Activity Timeline */}`,
  invoicesSection + `\n\n          {/* Activity Timeline */}`
);

fs.writeFileSync('src/app/(app)/leads/LeadDrawer.tsx', code);
