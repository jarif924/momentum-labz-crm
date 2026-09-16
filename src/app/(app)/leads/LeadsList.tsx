/* eslint-disable @typescript-eslint/no-explicit-any */

import { Edit2 } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function LeadsList({ leads, onEdit, onRowClick, selectedIds, onToggleSelect, onToggleSelectAll }: { leads: any[], onEdit: (l: any) => void, onRowClick: (l: any) => void, selectedIds: string[], onToggleSelect: (id: string) => void, onToggleSelectAll: () => void }) {
  return (
    <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] overflow-hidden">
      <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_auto] gap-4 p-4 bg-neutral-50 border-b border-neutral-100 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider items-center">
        <div className="w-5">
          <input 
            type="checkbox" 
            checked={leads.length > 0 && selectedIds.length === leads.length}
            onChange={onToggleSelectAll}
            className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
          />
        </div>
        <div>Contact</div>
        <div>Company</div>
        <div>Stage</div>
        <div>Value</div>
        <div className="text-right">Actions</div>
      </div>
      
      {leads.length === 0 ? (
        <div className="p-8 text-center text-neutral-500 text-sm">No leads found.</div>
      ) : (
        leads.map(lead => (
          <div 
            key={lead.id} 
            className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_auto] gap-4 p-4 border-b border-neutral-100 items-center hover:bg-neutral-50 transition-colors cursor-pointer"
            onClick={() => onRowClick(lead)}
          >
            <div className="w-5">
              <input 
                type="checkbox" 
                checked={selectedIds.includes(lead.id)}
                onChange={() => onToggleSelect(lead.id)}
                onClick={(e) => e.stopPropagation()}
                className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
            </div>
            <div className="font-medium text-sm text-neutral-900">
              {lead.contacts?.full_name || 'Unknown'}
            </div>
            <div className="text-sm text-neutral-500">
              {lead.companies?.name || '-'}
            </div>
            <div>
              <span className="inline-block px-2 py-1 bg-accent-50 text-accent-700 text-[10px] rounded-[6px] truncate max-w-[120px]">
                {lead.stage}
              </span>
            </div>
            <div className="text-sm text-neutral-900 font-medium">
              {lead.deal_value ? `${lead.currency} ${lead.deal_value.toLocaleString()}` : '-'}
            </div>
            <div className="flex justify-end">
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(lead); }}
                className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
              >
                <Edit2 size={14} />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
