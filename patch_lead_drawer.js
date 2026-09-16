const fs = require('fs');

let pageCode = fs.readFileSync('src/app/(app)/leads/page.tsx', 'utf8');

// Fetch tags for leads
pageCode = pageCode.replace(
  `supabase.from('leads').select('*, contacts(*), companies(*)').order('created_at', { ascending: false })`,
  `supabase.from('leads').select('*, contacts(*), companies(*), lead_tags(tags(id, name))').order('created_at', { ascending: false })`
);

fs.writeFileSync('src/app/(app)/leads/page.tsx', pageCode);

let drawerCode = fs.readFileSync('src/app/(app)/leads/LeadDrawer.tsx', 'utf8');

const tagRenderCode = `
          {/* Tags */}
          {lead.lead_tags && lead.lead_tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {lead.lead_tags.map((lt: any) => lt.tags && (
                <span key={lt.tags.id} className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-neutral-900 text-neutral-0 rounded-[4px]">
                  {lt.tags.name}
                </span>
              ))}
            </div>
          )}
`;

drawerCode = drawerCode.replace(
  `{lead.companies?.name && <p className="text-sm text-neutral-500 mt-1">{lead.companies.name}</p>}`,
  `{lead.companies?.name && <p className="text-sm text-neutral-500 mt-1">{lead.companies.name}</p>}` + tagRenderCode
);

fs.writeFileSync('src/app/(app)/leads/LeadDrawer.tsx', drawerCode);
