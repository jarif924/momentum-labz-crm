'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/supabase';
import { Button, Input, Select } from '@/components/ui/Forms';
import { Modal } from '@/components/ui/Modal';
import { Plus, Edit2, Trash2, FileText } from 'lucide-react';

export default function ProposalsPage() {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [ proposals, setProposals] = useState<any[]>([]);
  const [ leads, setLeads] = useState<any[]>([]);
  const [ availableServices, setAvailableServices] = useState<string[]>([]);
  const [ loading, setLoading] = useState(true);

  const [ isModalOpen, setIsModalOpen] = useState(false);
  const [ editingProp, setEditingProp] = useState<any>(null);
  
  const [ formData, setFormData] = useState<any>({
    lead_id: '',
    amount: '',
    currency: 'USD',
    services: [],
    status: 'draft',
    document_url: ''
  });

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchData() {
    setLoading(true);
    const [ 
      { data: pData },
      { data: lData },
      { data: sData }
    ] = await Promise.all([
      supabase.from('proposals').select('*, leads(contacts(full_name))').order('created_at', { ascending: false }),
      supabase.from('leads').select('id, contacts(full_name)'),
      supabase.from('system_settings').select('services').eq('id', 1).single()
    ]) as any;

    if (pData) setProposals(pData);
    if (lData) setLeads(lData);
    if (sData?.services) setAvailableServices(sData.services);
    setLoading(false);
  }

  function openModal(prop?: any) {
    if (prop) {
      setEditingProp(prop);
      setFormData({
        lead_id: prop.lead_id,
        amount: prop.amount,
        currency: prop.currency,
        services: prop.services || [],
        status: prop.status,
        document_url: prop.document_url || ''
      });
    } else {
      setEditingProp(null);
      setFormData({
        lead_id: '',
        amount: '',
        currency: 'USD',
        services: [],
        status: 'draft',
        document_url: ''
      });
    }
    setIsModalOpen(true);
  }

  async function handleSave() {
    if (!formData.lead_id || !formData.amount) return;

    const payload = {
      lead_id: formData.lead_id,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      services: formData.services,
      status: formData.status,
      document_url: formData.document_url || null
    };

    if (editingProp) {
      await (supabase.from('proposals') as any).update(payload).eq('id', editingProp.id);
    } else {
      await (supabase.from('proposals') as any).insert(payload);
    }
    
    setIsModalOpen(false);
    fetchData();
  }

  async function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this proposal?')) {
      await (supabase.from('proposals') as any).delete().eq('id', id);
      fetchData();
    }
  }

  return (
    <div className="flex flex-col h-full max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Proposals</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage quotes and documents tied to leads.</p>
        </div>
        <Button onClick={() => openModal()}>
          <Plus size={16} className="mr-2" /> Add Proposal
        </Button>
      </div>

      <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 bg-neutral-50 border-b border-neutral-100 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
          <div className="col-span-3">Lead / Contact</div>
          <div className="col-span-2">Value</div>
          <div className="col-span-3">Services</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-neutral-500 text-sm animate-pulse">Loading...</div>
        ) : proposals.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <FileText size={48} className="text-neutral-200 mb-4" />
            <h3 className="text-base font-semibold text-neutral-900 mb-1">No proposals yet</h3>
            <p className="text-sm text-neutral-500">Create one to start tracking sent quotes.</p>
          </div>
        ) : (
          proposals.map(prop => (
            <div key={prop.id} className="grid grid-cols-12 gap-4 p-4 border-b border-neutral-100 items-center hover:bg-neutral-50 transition-colors">
              <div className="col-span-3 font-medium text-sm text-neutral-900">
                {prop.leads?.contacts?.full_name || 'Unknown'}
              </div>
              <div className="col-span-2 text-sm text-neutral-900 font-medium">
                {prop.currency} {prop.amount.toLocaleString()}
              </div>
              <div className="col-span-3">
                <div className="flex flex-wrap gap-1">
                  {prop.services?.map((s: string) => (
                    <span key={s} className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">{s}</span>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <span className={`inline-block px-2 py-1 text-[10px] uppercase font-semibold rounded-[6px] tracking-wide ${
                  prop.status === 'accepted' ? 'bg-success-bg text-success-text' :
                  prop.status === 'rejected' ? 'bg-danger-bg text-danger-text' :
                  prop.status === 'sent' ? 'bg-info-bg text-info-text' :
                  'bg-neutral-100 text-neutral-600'
                }`}>
                  {prop.status}
                </span>
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                {prop.document_url && (
                  <Button variant="ghost" size="compact" onClick={() => window.open(prop.document_url, '_blank')}>
                    <FileText size={14} />
                  </Button>
                )}
                <Button variant="ghost" size="compact" onClick={() => openModal(prop)}>
                  <Edit2 size={14} />
                </Button>
                <Button variant="ghost" size="compact" className="text-danger-text" onClick={() => handleDelete(prop.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProp ? "Edit Proposal" : "Add Proposal"}>
        <div className="flex flex-col gap-4">
          <Select label="Linked Lead *" value={formData.lead_id} onChange={e => setFormData({...formData, lead_id: e.target.value})}>
            <option value="">Select a lead...</option>
            {leads.map(l => (
              <option key={l.id} value={l.id}>{l.contacts?.full_name}</option>
            ))}
          </Select>
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="Amount *" type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
            <Select label="Currency" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
              <option value="USD">USD</option>
              <option value="BDT">BDT</option>
              <option value="AUD">AUD</option>
            </Select>
          </div>

          <Select label="Status" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </Select>

          <div>
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Services</label>
            <div className="flex flex-wrap gap-2">
              {availableServices.map(srv => {
                const isSelected = formData.services.includes(srv);
                return (
                  <button
                    key={srv}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setFormData({...formData, services: formData.services.filter((s: string) => s !== srv)});
                      } else {
                        setFormData({...formData, services: [...formData.services, srv]});
                      }
                    }}
                    className={`px-3 py-1.5 text-xs rounded-full border ${isSelected ? 'bg-accent-50 border-accent-500 text-accent-700' : 'bg-neutral-0 border-neutral-200 text-neutral-500'}`}
                  >
                    {srv}
                  </button>
                );
              })}
            </div>
          </div>

          <Input label="Document URL" value={formData.document_url} onChange={e => setFormData({...formData, document_url: e.target.value})} placeholder="https://docs.google.com/..." />

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-neutral-100">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formData.lead_id || !formData.amount}>Save Proposal</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
