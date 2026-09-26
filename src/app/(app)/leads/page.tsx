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
import { useToast } from '@/components/ui/Toast';
import { friendlyError } from '@/lib/errors';

const DEFAULT_LOST_REASONS = ['Price too high', 'Bad timing', 'Went with a competitor', 'Went cold', 'Other'];

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
  const [lostStageName, setLostStageName] = useState('');
  const [lostDetails, setLostDetails] = useState('');
  const [lostReasons, setLostReasons] = useState<string[]>(DEFAULT_LOST_REASONS);
  const [savingLost, setSavingLost] = useState(false);
  const [fx, setFx] = useState<{ rates: Record<string, number>; updatedAt: string | null }>({ rates: {}, updatedAt: null });
  const toast = useToast();


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
      { data: stagesData, error: stagesErr },
      { data: leadsData, error: leadsErr },
      { data: tagsData, error: tagsErr },
      { data: settingsData }
    ] = await Promise.all([
      supabase.from('pipeline_stages').select('*').order('sort_order'),
      supabase.from('leads').select('*, contacts(*), companies(*), lead_tags(tags(id, name))').order('created_at', { ascending: false }),
      supabase.from('tags').select('*').order('name'),
      supabase.from('system_settings').select('lost_reasons, fx_rates, fx_rates_updated_at').eq('id', 1).maybeSingle()
    ]);
    const loadError = stagesErr || leadsErr || tagsErr;
    if (loadError) toast.error(`Couldn't load leads: ${friendlyError(loadError)}`);
    const reasons = (settingsData as any)?.lost_reasons;
    if (Array.isArray(reasons) && reasons.length > 0) setLostReasons(reasons);
    setFx({ rates: (settingsData as any)?.fx_rates ?? {}, updatedAt: (settingsData as any)?.fx_rates_updated_at ?? null });
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
      setLostStageName(newStage);
      setLostReason('');
      setLostDetails('');
      setLostReasonModalOpen(true);
      return;
    }

    await performStageChange(leadId, newStage);
  }

  async function confirmLost() {
    if (!lostReason) { toast.error('Choose why this lead was lost.'); return; }
    setSavingLost(true);
    const text = lostDetails.trim() ? `${lostReason}: ${lostDetails.trim()}` : lostReason;
    const ok = await performStageChange(lostReasonLeadId, lostStageName, text);
    setSavingLost(false);
    if (ok) setLostReasonModalOpen(false);
  }

  // Won creates the delivery project and marks the contact as a client
  async function handleWon(leadId: string, targetLead: any) {
    if (targetLead.contact_id) {
      const { error: clientErr } = await (supabase.from('contacts') as any).update({ is_client: true }).eq('id', targetLead.contact_id);
      if (clientErr) toast.error(`Couldn't mark the contact as a client: ${friendlyError(clientErr)}`);
    }

    const { data: existingProject, error: findErr } = await (supabase.from('projects') as any)
      .select('id').eq('lead_id', leadId).maybeSingle();
    if (findErr) { toast.error(`Couldn't check for an existing project: ${friendlyError(findErr)}`); return; }
    if (existingProject) return;

    let companyId = targetLead.company_id;
    let companyName = targetLead.companies?.name;
    if (!companyId) {
      // projects.company_id is required; create a company named after the contact
      const { data: newComp, error: compErr } = await (supabase.from('companies') as any)
        .insert({ name: `${targetLead.contacts?.full_name || 'Unknown'} Company` })
        .select().single();
      if (compErr || !newComp) { toast.error(`Couldn't create a company for the project: ${friendlyError(compErr)}`); return; }
      const { error: linkErr } = await (supabase.from('leads') as any).update({ company_id: newComp.id }).eq('id', leadId);
      if (linkErr) { toast.error(`Couldn't link the new company: ${friendlyError(linkErr)}`); return; }
      companyId = newComp.id;
      companyName = targetLead.contacts?.full_name;
    }

    const { error: projErr } = await (supabase.from('projects') as any).insert({
      company_id: companyId,
      lead_id: leadId,
      name: `${companyName || 'Client'} Project`,
      service_line: targetLead.service_line || 'web_development',
      status: 'planning',
      budget: targetLead.deal_value || 0,
      currency: targetLead.currency || 'BDT'
    });
    if (projErr) { toast.error(`Lead won, but the project couldn't be created: ${friendlyError(projErr)}`); return; }
    toast.success(`Won! Project "${companyName || 'Client'} Project" created`);
  }

  async function performStageChange(leadId: string, newStage: string, lostReasonText?: string): Promise<boolean> {
    const previousLeads = [...leads];
    const targetLead = leads.find(l => l.id === leadId);

    // Optimistic update
    setLeads(leads.map(l => l.id === leadId ? { ...l, stage: newStage, lost_reason: lostReasonText || l.lost_reason } : l));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { stage: newStage };
    if (lostReasonText) updateData.lost_reason = lostReasonText;

    const { error } = await (supabase.from('leads') as any).update(updateData).eq('id', leadId);
    if (error) {
      toast.error(`Couldn't move lead: ${friendlyError(error)}`);
      setLeads(previousLeads);
      return false;
    }

    const stageObj = stages.find(s => s.name === newStage);
    if (stageObj?.is_won && targetLead) {
      await handleWon(leadId, targetLead);
      fetchData();
    } else if (stageObj?.is_lost) {
      toast.success(`Marked as ${newStage}`);
    }
    return true;
  }

  
  async function handleBulkTag() {
    if (!selectedTagId || selectedLeadIds.length === 0) return;
    
    // Insert ignoring conflicts
    const inserts = selectedLeadIds.map(id => ({
      lead_id: id,
      tag_id: selectedTagId
    }));
    
    // Leads that already have the tag are skipped rather than failing the whole batch
    const { error } = await (supabase.from('lead_tags') as any)
      .upsert(inserts, { onConflict: 'lead_id,tag_id', ignoreDuplicates: true });
    if (error) {
      toast.error(`Couldn't tag leads: ${friendlyError(error)}`);
      return;
    }
    toast.success(`Tagged ${inserts.length} lead${inserts.length === 1 ? '' : 's'}`);

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
              aria-label="Board view"
              title="Board view"
              className={`p-1.5 rounded-[6px] transition-colors ${view === 'kanban' ? 'bg-neutral-0 shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button 
              onClick={() => setView('list')}
              aria-label="List view"
              title="List view"
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
            fxRates={fx.rates}
            fxUpdatedAt={fx.updatedAt}
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

      <Modal
        isOpen={lostReasonModalOpen}
        onClose={() => { if (!savingLost) setLostReasonModalOpen(false); }}
        title={`Why was this lead lost?`}
        maxWidth="md"
      >
        <div className="flex flex-col gap-4">
          <p className="text-small text-neutral-500">
            The reason is saved on the lead and shown in Analytics. You can edit the list in Settings &gt; Pipeline.
          </p>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Lost reason">
            {lostReasons.map(reason => (
              <label
                key={reason}
                className={`flex h-10 cursor-pointer items-center gap-3 rounded-md border px-3 text-body transition-colors duration-120 ${
                  lostReason === reason ? 'border-neutral-900 bg-neutral-50 text-neutral-900' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <input
                  type="radio"
                  name="lost-reason"
                  value={reason}
                  checked={lostReason === reason}
                  onChange={() => setLostReason(reason)}
                  className="accent-neutral-900"
                />
                {reason}
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="lost-details" className="text-xs font-medium text-neutral-600">Details (optional)</label>
            <textarea
              id="lost-details"
              rows={3}
              value={lostDetails}
              onChange={e => setLostDetails(e.target.value)}
              placeholder="Anything worth remembering for next time"
              className="rounded-[10px] border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-300 focus:border-neutral-900 focus:outline-none focus:ring-[3px] focus:ring-accent-500/20"
            />
          </div>
          <div className="mt-2 flex justify-end gap-3 border-t border-neutral-100 pt-4">
            <Button variant="secondary" onClick={() => setLostReasonModalOpen(false)} disabled={savingLost}>Cancel</Button>
            <Button onClick={confirmLost} disabled={!lostReason || savingLost}>
              {savingLost ? 'Saving…' : `Move to ${lostStageName}`}
            </Button>
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
