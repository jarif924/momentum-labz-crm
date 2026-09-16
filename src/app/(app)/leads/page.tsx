/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/supabase';
import { Button } from '@/components/ui/Forms';
import { Plus, List, LayoutGrid, Tag } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Forms';
import { LeadsList } from './LeadsList';
import { LeadsKanban } from './LeadsKanban';
import { LeadFormModal } from './LeadFormModal';
import { LeadDrawer } from './LeadDrawer';

export default function LeadsPage() {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [view, setView] = useState<'list' | 'kanban'>('kanban');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [leads, setLeads] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stages, setStages] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);

  // Lost Reason Modal State
  const [lostReasonModalOpen, setLostReasonModalOpen] = useState(false);
  const [lostReasonLeadId, setLostReasonLeadId] = useState('');
  const [lostReason, setLostReason] = useState('');


  const [isModalOpen, setIsModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingLead, setEditingLead] = useState<any>(null);
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedLead, setSelectedLead] = useState<any>(null);
  
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);
  const [allTags, setAllTags] = useState<any[]>([]);
  const [selectedTagId, setSelectedTagId] = useState('');

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchData() {
    setLoading(true);
    const [
      { data: stagesData },
      { data: leadsData },
      { data: tagsData }
    ] = await Promise.all([
      supabase.from('pipeline_stages').select('*').order('sort_order'),
      supabase.from('leads').select('*, contacts(*), companies(*), lead_tags(tags(id, name))').order('created_at', { ascending: false }),
      supabase.from('tags').select('*').order('name')
    ]);
    if (tagsData) setAllTags(tagsData);

    if (stagesData) setStages(stagesData);
    if (leadsData) setLeads(leadsData);
    setLoading(false);
  }

  
  async function handleStageChange(leadId: string, newStage: string) {
    const stageObj = stages.find(s => s.name === newStage);
    
    // Check if it's a lost stage
    if (stageObj && stageObj.is_lost) {
      setLostReasonLeadId(leadId);
      setLostReasonModalOpen(true);
      return;
    }

    await performStageChange(leadId, newStage);
  }

  async function performStageChange(leadId: string, newStage: string, lostReasonText?: string) {
    const previousLeads = [...leads];
    const targetLead = leads.find(l => l.id === leadId);
    
    // Optimistic update
    setLeads(leads.map(l => l.id === leadId ? { ...l, stage: newStage, lost_reason: lostReasonText || l.lost_reason } : l));
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { stage: newStage };
    if (lostReasonText) updateData.lost_reason = lostReasonText;

    const { error } = await (supabase.from('leads') as any).update(updateData).eq('id', leadId);
    if (error) {
      alert('Failed to move lead');
      setLeads(previousLeads);
      return;
    }

    const stageObj = stages.find(s => s.name === newStage);
    if (stageObj && stageObj.is_won && targetLead) {
      // Must have a company// Must have a company. If it doesn't, we should ideally prompt, but we'll try to find or create one, or just error if schema fails.
      // But let's check if the project already exists to avoid duplicates.
      const { data: existingProject } = await (supabase.from('projects') as any)
        .select('id')
        .eq('lead_id', leadId)
        .single();
        
      if (!existingProject && targetLead.company_id) {
        await (supabase.from('projects') as any).insert({
          company_id: targetLead.company_id,
          lead_id: leadId,
          name: `${targetLead.companies?.name || 'Client'} Project`,
          service_line: targetLead.service_line || 'web_development',
          status: 'planning',
          budget: targetLead.deal_value || 0,
          currency: targetLead.currency || 'BDT'
        });
      } else if (!existingProject && !targetLead.company_id) {
        // Fallback: Create a dummy company for this contact so we satisfy the NOT NULL constraint
        const { data: newComp } = await (supabase.from('companies') as any)
          .insert({ name: `${targetLead.contacts?.full_name || 'Unknown'} Company` })
          .select().single();
          
        if (newComp) {
          // Update the lead to link to this new company
          await (supabase.from('leads') as any).update({ company_id: newComp.id }).eq('id', leadId);
          
          await (supabase.from('projects') as any).insert({
            company_id: newComp.id,
            lead_id: leadId,
            name: `${targetLead.contacts?.full_name || 'Client'} Project`,
            service_line: targetLead.service_line || 'web_development',
            status: 'planning',
            budget: targetLead.deal_value || 0,
            currency: targetLead.currency || 'BDT'
          });
        }
      }
    }
  }

  
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Leads</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Manage your pipeline from Prospect Found to Won.
          </p>
        </div>
        <div className="flex gap-4 items-center">
          {selectedLeadIds.length > 0 && (
            <Button variant="secondary" onClick={() => setIsBulkTagModalOpen(true)}>
              <Tag size={16} className="mr-2" /> Tag ({selectedLeadIds.length})
            </Button>
          )}
          <div className="flex bg-neutral-100 p-1 rounded-[8px]">
            <button 
              onClick={() => setView('kanban')}
              className={`p-1.5 rounded-[6px] transition-colors ${view === 'kanban' ? 'bg-neutral-0 shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button 
              onClick={() => setView('list')}
              className={`p-1.5 rounded-[6px] transition-colors ${view === 'list' ? 'bg-neutral-0 shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              <List size={16} />
            </button>
          </div>
          <Button onClick={() => { setEditingLead(null); setIsModalOpen(true); }}>
            <Plus size={16} className="mr-2" /> Add Lead
          </Button>
        </div>
      </div>

      <div className="flex-1">
        {loading ? (
          <div className="text-sm text-neutral-500 animate-pulse">Loading leads...</div>
        ) : view === 'kanban' ? (
          <LeadsKanban 
            leads={leads} 
            stages={stages} 
            onStageChange={handleStageChange}
            onCardClick={(lead) => { setSelectedLead(lead); setIsDrawerOpen(true); }}
          />
        ) : (
          <LeadsList 
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
          />
        )}
      </div>

      
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

      <LeadFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        lead={editingLead}
        onSave={() => {
          setIsModalOpen(false);
          fetchData();
        }}
      />

      <LeadDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        lead={selectedLead}
      />
    </div>
  );
}
