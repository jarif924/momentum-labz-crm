const fs = require('fs');

let code = fs.readFileSync('src/app/(app)/leads/LeadDrawer.tsx', 'utf8');

// Add proposals to query if we were doing it there, but LeadDrawer takes `lead` as a prop.
// So we should update `LeadsPage` to fetch `proposals` as well, or fetch proposals inside `LeadDrawer`.
// Since LeadDrawer is just a component, we can fetch proposals inside LeadDrawer.
// Wait, actually `page.tsx` fetches leads. I'll just fetch proposals inside `LeadDrawer` to keep the initial load lighter.

code = code.replace(
  `const [activities, setActivities] = useState<any[]>([]);`,
  `const [activities, setActivities] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);`
);

code = code.replace(
  `supabase.from('activities').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false }).then(({data}) => {
        if (data) setActivities(data);
      });`,
  `supabase.from('activities').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false }).then(({data}) => {
        if (data) setActivities(data);
      });
      supabase.from('proposals').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false }).then(({data}) => {
        if (data) setProposals(data);
      });`
);

// We need an icon for FileText
if (!code.includes('FileText')) {
  code = code.replace(`import { X, Mail, Phone, ExternalLink }`, `import { X, Mail, Phone, ExternalLink, FileText }`);
}

// Add Proposals Section before Activity Timeline
const proposalsSection = `
          {/* Proposals */}
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100">
              <h3 className="text-sm font-semibold text-neutral-900">Proposals</h3>
            </div>
            {proposals.length === 0 ? (
              <div className="text-sm text-neutral-500 italic">No proposals yet.</div>
            ) : (
              <div className="space-y-3">
                {proposals.map(prop => (
                  <div key={prop.id} className="flex justify-between items-center bg-neutral-50 p-3 rounded-[8px] border border-neutral-100">
                    <div>
                      <div className="flex gap-2 items-center mb-1">
                        <span className="font-semibold text-sm text-neutral-900">{prop.currency} {prop.amount.toLocaleString()}</span>
                        <span className={\`text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded \${
                          prop.status === 'accepted' ? 'bg-success-bg text-success-text' :
                          prop.status === 'rejected' ? 'bg-danger-bg text-danger-text' :
                          prop.status === 'sent' ? 'bg-info-bg text-info-text' :
                          'bg-neutral-200 text-neutral-600'
                        }\`}>
                          {prop.status}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-500">{new Date(prop.created_at).toLocaleDateString()}</div>
                    </div>
                    {prop.document_url && (
                      <Button variant="ghost" size="compact" onClick={() => window.open(prop.document_url, '_blank')}>
                        <FileText size={14} /> View
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
`;

code = code.replace(
  `{/* Activity Timeline */}`,
  proposalsSection + `\n\n          {/* Activity Timeline */}`
);

fs.writeFileSync('src/app/(app)/leads/LeadDrawer.tsx', code);
