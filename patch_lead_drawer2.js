const fs = require('fs');
let code = fs.readFileSync('src/app/(app)/leads/LeadDrawer.tsx', 'utf8');

const newFieldsUI = `
            {/* New Lead Fields */}
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Niche</p>
              <p className="text-sm font-medium text-neutral-900">{lead.niche || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Demo Status</p>
              <p className="text-sm font-medium text-neutral-900">
                {lead.demo_status ? <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-xs">{lead.demo_status}</span> : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Running Meta Ads</p>
              <p className="text-sm font-medium text-neutral-900">
                {lead.running_meta_ads ? <span className="text-green-600 font-semibold">Yes</span> : <span className="text-neutral-500">No</span>}
              </p>
            </div>
`;

code = code.replace(
  /<div>\s*<p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Deal Value<\/p>/,
  `${newFieldsUI}\n            <div>\n              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Deal Value</p>`
);

fs.writeFileSync('src/app/(app)/leads/LeadDrawer.tsx', code);
console.log('Patched LeadDrawer');
