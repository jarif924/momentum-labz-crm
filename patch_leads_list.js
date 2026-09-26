const fs = require('fs');

const code = `import { Edit2, ExternalLink } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function LeadsList({ leads, onEdit, onRowClick, selectedIds, onToggleSelect, onToggleSelectAll }: { leads: any[], onEdit: (l: any) => void, onRowClick: (l: any) => void, selectedIds: string[], onToggleSelect: (id: string) => void, onToggleSelectAll: () => void }) {
  return (
    <div className="bg-neutral-0 border border-neutral-100 rounded-lg overflow-x-auto shadow-sm">
      <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-100 text-neutral-500 font-medium">
            <th className="p-3 w-10 text-center">
              <input 
                type="checkbox" 
                checked={leads.length > 0 && selectedIds.length === leads.length}
                onChange={onToggleSelectAll}
                className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
            </th>
            <th className="p-3">Company Name</th>
            <th className="p-3">Service</th>
            <th className="p-3">Running Meta Ads</th>
            <th className="p-3">Niche</th>
            <th className="p-3">Demo Status</th>
            <th className="p-3">Link</th>
            <th className="p-3">Status</th>
            <th className="p-3">Contact Info</th>
            <th className="p-3">Follow-up Date</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.length === 0 ? (
            <tr>
              <td colSpan={11} className="p-8 text-center text-neutral-400">
                No leads found. Create one to get started.
              </td>
            </tr>
          ) : (
            leads.map(lead => (
              <tr 
                key={lead.id} 
                className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors group cursor-pointer"
                onClick={() => onRowClick(lead)}
              >
                <td className="p-3 text-center">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(lead.id)}
                    onChange={() => onToggleSelect(lead.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                  />
                </td>
                <td className="p-3 font-medium text-neutral-900">
                  {lead.companies?.name || '-'}
                </td>
                <td className="p-3 text-neutral-600">
                  <div className="flex gap-1 flex-wrap max-w-[150px]">
                    {lead.services && lead.services.length > 0 ? (
                      lead.services.map((s: string, idx: number) => (
                        <span key={idx} className="bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded text-[11px] truncate">{s}</span>
                      ))
                    ) : '-'}
                  </div>
                </td>
                <td className="p-3 text-center">
                  <span className={\`inline-block w-2 h-2 rounded-full \${lead.running_meta_ads ? 'bg-green-500' : 'bg-neutral-300'}\`}></span>
                </td>
                <td className="p-3 text-neutral-600 truncate max-w-[120px]">
                  {lead.niche || '-'}
                </td>
                <td className="p-3 text-neutral-600">
                  {lead.demo_status ? (
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-xs font-medium">{lead.demo_status}</span>
                  ) : '-'}
                </td>
                <td className="p-3">
                  {lead.demo_url ? (
                    <a href={lead.demo_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-neutral-500 hover:text-blue-600 inline-flex items-center gap-1 transition-colors">
                      <span className="truncate max-w-[100px] inline-block">{lead.demo_url.replace(/^https?:\\/\\//, '')}</span>
                      <ExternalLink size={12} />
                    </a>
                  ) : '-'}
                </td>
                <td className="p-3">
                  <span className="inline-block px-2 py-1 bg-accent-50 text-accent-700 text-[11px] font-medium rounded-md truncate max-w-[120px]">
                    {lead.stage.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="p-3 text-neutral-600 text-xs">
                  <div className="truncate max-w-[140px]">{lead.contacts?.full_name || 'No Contact'}</div>
                  <div className="text-neutral-400 truncate max-w-[140px]">{lead.contacts?.email || lead.contacts?.phone || ''}</div>
                </td>
                <td className="p-3 text-neutral-600 text-xs">
                  {lead.next_follow_up_at ? new Date(lead.next_follow_up_at).toLocaleDateString() : '-'}
                </td>
                <td className="p-3 text-right">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEdit(lead); }}
                    className="p-1.5 text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-neutral-900 hover:bg-neutral-200 rounded-md transition-all"
                  >
                    <Edit2 size={14} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
`;
fs.writeFileSync('src/app/(app)/leads/LeadsList.tsx', code);
console.log('Patched LeadsList.tsx');
