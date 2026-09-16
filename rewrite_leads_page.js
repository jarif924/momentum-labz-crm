const fs = require('fs');

let pageCode = fs.readFileSync('src/app/(app)/leads/page.tsx', 'utf8');

// Add imports
pageCode = pageCode.replace(
  `import { Plus, List, LayoutGrid } from 'lucide-react';`,
  `import { Plus, List, LayoutGrid, Tag } from 'lucide-react';\nimport { Modal } from '@/components/ui/Modal';\nimport { Select } from '@/components/ui/Forms';`
);

// Add states
pageCode = pageCode.replace(
  `const [selectedLead, setSelectedLead] = useState<any>(null);`,
  `const [selectedLead, setSelectedLead] = useState<any>(null);
  
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);
  const [allTags, setAllTags] = useState<any[]>([]);
  const [selectedTagId, setSelectedTagId] = useState('');`
);

// Fetch tags
pageCode = pageCode.replace(
  `{ data: leadsData }
    ] = await Promise.all([
      supabase.from('pipeline_stages').select('*').order('sort_order'),
      supabase.from('leads').select('*, contacts(*), companies(*)').order('created_at', { ascending: false })
    ]);`,
  `{ data: leadsData },
      { data: tagsData }
    ] = await Promise.all([
      supabase.from('pipeline_stages').select('*').order('sort_order'),
      supabase.from('leads').select('*, contacts(*), companies(*)').order('created_at', { ascending: false }),
      supabase.from('tags').select('*').order('name')
    ]);
    if (tagsData) setAllTags(tagsData);`
);

// Bulk tag logic
const bulkTagCode = `
  async function handleBulkTag() {
    if (!selectedTagId || selectedLeadIds.length === 0) return;
    
    // Insert ignoring conflicts
    const inserts = selectedLeadIds.map(id => ({
      lead_id: id,
      tag_id: selectedTagId
    }));
    
    // We just insert, supabase will handle duplicates if we use onConflict or we can just ignore errors.
    // Actually easiest is a loop with upsert but we'll try insert and ignore error.
    for (const insert of inserts) {
      await (supabase.from('lead_tags') as any).insert(insert);
    }
    
    setIsBulkTagModalOpen(false);
    setSelectedLeadIds([]);
    setSelectedTagId('');
    fetchData(); // refresh tags (we might need to fetch lead_tags inside leads)
  }
`;

pageCode = pageCode.replace(
  `return (
    <div className="flex flex-col h-full">`,
  bulkTagCode + `
  return (
    <div className="flex flex-col h-full">`
);

// Action bar
pageCode = pageCode.replace(
  `<div className="flex gap-4 items-center">
          <div className="flex bg-neutral-100 p-1 rounded-[8px]">`,
  `<div className="flex gap-4 items-center">
          {selectedLeadIds.length > 0 && (
            <Button variant="secondary" onClick={() => setIsBulkTagModalOpen(true)}>
              <Tag size={16} className="mr-2" /> Tag ({selectedLeadIds.length})
            </Button>
          )}
          <div className="flex bg-neutral-100 p-1 rounded-[8px]">`
);

// Pass selected to list
pageCode = pageCode.replace(
  `<LeadsList 
            leads={leads} 
            onEdit={(lead) => { setEditingLead(lead); setIsModalOpen(true); }}
            onRowClick={(lead) => { setSelectedLead(lead); setIsDrawerOpen(true); }}
          />`,
  `<LeadsList 
            leads={leads} 
            onEdit={(lead) => { setEditingLead(lead); setIsModalOpen(true); }}
            onRowClick={(lead) => { setSelectedLead(lead); setIsDrawerOpen(true); }}
            selectedIds={selectedLeadIds}
            onToggleSelect={(id) => {
              if (selectedLeadIds.includes(id)) {
                setSelectedLeadIds(selectedLeadIds.filter(i => i !== id));
              } else {
                setSelectedLeadIds([...selectedLeadIds, id]);
              }
            }}
            onToggleSelectAll={() => {
              if (selectedLeadIds.length === leads.length) {
                setSelectedLeadIds([]);
              } else {
                setSelectedLeadIds(leads.map(l => l.id));
              }
            }}
          />`
);

// Add Modal
const bulkModalUI = `
      <Modal isOpen={isBulkTagModalOpen} onClose={() => setIsBulkTagModalOpen(false)} title="Bulk Tag Leads" maxWidth="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-neutral-600">
            Apply a tag to {selectedLeadIds.length} selected lead(s).
          </p>
          <Select label="Select Tag" value={selectedTagId} onChange={e => setSelectedTagId(e.target.value)}>
            <option value="">-- Choose Tag --</option>
            {allTags.map(tag => (
              <option key={tag.id} value={tag.id}>{tag.name}</option>
            ))}
          </Select>
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100 mt-2">
            <Button variant="secondary" onClick={() => setIsBulkTagModalOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkTag}>Apply Tag</Button>
          </div>
        </div>
      </Modal>
`;

pageCode = pageCode.replace(
  `<LeadFormModal`,
  bulkModalUI + `\n      <LeadFormModal`
);

fs.writeFileSync('src/app/(app)/leads/page.tsx', pageCode);

// ---- Update LeadsList.tsx ----
let listCode = fs.readFileSync('src/app/(app)/leads/LeadsList.tsx', 'utf8');

listCode = listCode.replace(
  `export function LeadsList({ leads, onEdit, onRowClick }: { leads: any[], onEdit: (l: any) => void, onRowClick: (l: any) => void }) {`,
  `export function LeadsList({ leads, onEdit, onRowClick, selectedIds, onToggleSelect, onToggleSelectAll }: { leads: any[], onEdit: (l: any) => void, onRowClick: (l: any) => void, selectedIds: string[], onToggleSelect: (id: string) => void, onToggleSelectAll: () => void }) {`
);

listCode = listCode.replace(
  `<div className="grid grid-cols-12 gap-4 p-4 bg-neutral-50 border-b border-neutral-100 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
        <div className="col-span-3">Contact</div>`,
  `<div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_auto] gap-4 p-4 bg-neutral-50 border-b border-neutral-100 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider items-center">
        <div className="w-5">
          <input 
            type="checkbox" 
            checked={leads.length > 0 && selectedIds.length === leads.length}
            onChange={onToggleSelectAll}
            className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
          />
        </div>
        <div>Contact</div>`
);

listCode = listCode.replace(
  `{leads.length === 0 ? (
        <div className="p-8 text-center text-neutral-500 text-sm">No leads found.</div>
      ) : (
        leads.map(lead => (
          <div 
            key={lead.id} 
            className="grid grid-cols-12 gap-4 p-4 border-b border-neutral-100 items-center hover:bg-neutral-50 transition-colors cursor-pointer"
            onClick={() => onRowClick(lead)}
          >
            <div className="col-span-3 font-medium text-sm text-neutral-900">`,
  `{leads.length === 0 ? (
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
            <div className="font-medium text-sm text-neutral-900">`
);

listCode = listCode.replace(
  `</div>
            <div className="col-span-3 text-sm text-neutral-500">`,
  `</div>
            <div className="text-sm text-neutral-500">`
);

listCode = listCode.replace(
  `</div>
            <div className="col-span-2">`,
  `</div>
            <div>`
);

listCode = listCode.replace(
  `</div>
            <div className="col-span-2 text-sm text-neutral-900 font-medium">`,
  `</div>
            <div className="text-sm text-neutral-900 font-medium">`
);

listCode = listCode.replace(
  `</div>
            <div className="col-span-2 flex justify-end">`,
  `</div>
            <div className="flex justify-end">`
);

// We need to also replace the headers
listCode = listCode.replace(
  `<div className="col-span-3">Company</div>
        <div className="col-span-2">Stage</div>
        <div className="col-span-2">Value</div>
        <div className="col-span-2 text-right">Actions</div>`,
  `<div>Company</div>
        <div>Stage</div>
        <div>Value</div>
        <div className="text-right">Actions</div>`
);

fs.writeFileSync('src/app/(app)/leads/LeadsList.tsx', listCode);

