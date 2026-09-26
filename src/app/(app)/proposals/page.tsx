'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/supabase';
import { Button, Input, Select } from '@/components/ui/Forms';
import { Modal } from '@/components/ui/Modal';
import { Plus, Edit2, Trash2, FileText, FileSignature, CheckCircle, Clock, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { friendlyError } from '@/lib/errors';

export default function ProposalsPage() {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [ proposals, setProposals] = useState<any[]>([]);
  const [ leads, setLeads] = useState<any[]>([]);
  const [ availableServices, setAvailableServices] = useState<string[]>([]);
  const [ loading, setLoading] = useState(true);
  const [ saving, setSaving] = useState(false);
  const toast = useToast();

  const [ isModalOpen, setIsModalOpen] = useState(false);
  const [ editingProp, setEditingProp] = useState<any>(null);
  
  const [ formData, setFormData] = useState<any>({
    lead_id: '',
    amount: '',
    currency: 'USD',
    services: [],
    status: 'draft',
    document_url: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchData() {
    setLoading(true);
    const [propRes, leadsRes, settingsRes] = await Promise.all([
      supabase.from('proposals').select('*, leads(*, contacts(*, companies(*)))').order('created_at', { ascending: false }),
      supabase.from('leads').select('*, contacts(*, companies(*))'),
      supabase.from('system_settings').select('*').single()
    ]);
    const loadError = propRes.error || leadsRes.error || settingsRes.error;
    if (loadError) toast.error(`Couldn't load proposals: ${friendlyError(loadError)}`);
    if (propRes.data) setProposals(propRes.data);
    if (leadsRes.data) setLeads(leadsRes.data);
    if (settingsRes.data?.services) setAvailableServices(settingsRes.data.services);
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
        document_url: prop.document_url || '',
        notes: prop.notes || ''
      });
    } else {
      setEditingProp(null);
      setFormData({
        lead_id: '',
        amount: '',
        currency: 'USD',
        services: [],
        status: 'draft',
        document_url: '',
        notes: ''
      });
    }
    setIsModalOpen(true);
  }

  async function handleSave() {
    if (!formData.lead_id) {
      toast.error('Choose the lead this proposal is for.');
      return;
    }
    const amount = parseFloat(formData.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error('Enter the proposal amount.');
      return;
    }
    if (saving) return;
    const payload = {
      lead_id: formData.lead_id,
      amount,
      currency: formData.currency,
      services: formData.services,
      status: formData.status,
      document_url: formData.document_url || null,
      notes: formData.notes || null
    };

    setSaving(true);
    const { error } = editingProp
      ? await supabase.from('proposals').update(payload).eq('id', editingProp.id)
      : await supabase.from('proposals').insert(payload);
    setSaving(false);
    if (error) {
      toast.error(`Couldn't save proposal: ${friendlyError(error)}`);
      return;
    }
    toast.success(editingProp ? 'Proposal updated' : 'Proposal created');
    setIsModalOpen(false);
    fetchData();
  }

  async function handleDelete(id: string) {
    if (confirm('Delete this proposal?')) {
      const { error } = await supabase.from('proposals').delete().eq('id', id);
      if (error) {
        toast.error(`Couldn't delete proposal: ${friendlyError(error)}`);
        return;
      }
      toast.success('Proposal deleted');
      fetchData();
    }
  }

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Proposals Hub</h1>
          <p className="text-sm text-neutral-500 mt-1">Design, manage, and track your high-ticket quotes.</p>
        </div>
        <Button onClick={() => openModal()} className="shadow-sm">
          <Plus size={16} className="mr-2" /> Create Proposal
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Quick Stats Banner */}
        <div className="bg-white rounded-[16px] border border-neutral-100 p-5 shadow-sm flex items-center gap-4">
           <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
             <FileSignature size={24} />
           </div>
           <div>
             <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total Sent</p>
             <p className="text-2xl font-bold text-neutral-900">{proposals.filter(p => p.status === 'sent').length}</p>
           </div>
        </div>
        <div className="bg-white rounded-[16px] border border-neutral-100 p-5 shadow-sm flex items-center gap-4">
           <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
             <CheckCircle size={24} />
           </div>
           <div>
             <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Accepted</p>
             <p className="text-2xl font-bold text-neutral-900">{proposals.filter(p => p.status === 'accepted').length}</p>
           </div>
        </div>
        <div className="bg-white rounded-[16px] border border-neutral-100 p-5 shadow-sm flex items-center gap-4">
           <div className="h-12 w-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
             <Clock size={24} />
           </div>
           <div>
             <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Drafts</p>
             <p className="text-2xl font-bold text-neutral-900">{proposals.filter(p => p.status === 'draft').length}</p>
           </div>
        </div>
      </div>

      <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] overflow-hidden shadow-sm">
        <div className="grid grid-cols-12 gap-4 p-5 bg-neutral-50 border-b border-neutral-100 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider items-center">
          <div className="col-span-3">Client details</div>
          <div className="col-span-2">Value</div>
          <div className="col-span-3">Scope of Work</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Manage</div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-neutral-500 text-sm animate-pulse">Loading amazing things...</div>
        ) : proposals.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center bg-neutral-0">
            <div className="h-20 w-20 bg-neutral-50 rounded-full flex items-center justify-center mb-6">
              <FileText size={32} className="text-neutral-300" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 mb-2">No active proposals</h3>
            <p className="text-sm text-neutral-500 max-w-sm mb-6">You haven&apos;t generated any quotes yet. Close your next deal by creating a highly-converting proposal.</p>
            <Button onClick={() => openModal()}><Plus size={16} className="mr-2"/> Create First Proposal</Button>
          </div>
        ) : (
          proposals.map(prop => (
            <div key={prop.id} className="grid grid-cols-12 gap-4 p-5 border-b border-neutral-100 items-center hover:bg-neutral-50/50 transition-all">
              <div className="col-span-3">
                <div className="font-semibold text-sm text-neutral-900">{prop.leads?.contacts?.full_name || 'Unknown'}</div>
                <div className="text-xs text-neutral-400 mt-0.5">{prop.leads?.contacts?.companies?.name || 'No Company'}</div>
              </div>
              <div className="col-span-2 text-sm text-neutral-900 font-bold bg-neutral-50 py-1.5 px-3 rounded-lg inline-flex w-fit items-center border border-neutral-100">
                <span className="text-neutral-400 mr-1.5 text-xs">{prop.currency}</span> 
                {prop.amount.toLocaleString()}
              </div>
              <div className="col-span-3">
                <div className="flex flex-wrap gap-1.5">
                  {prop.services?.map((s: string) => (
                    <span key={s} className="text-[11px] bg-neutral-100 border border-neutral-200 text-neutral-700 px-2 py-0.5 rounded-full font-medium shadow-sm">{s}</span>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold uppercase rounded-md tracking-wider ${
                  prop.status === 'accepted' ? 'bg-green-100 text-green-700 border border-green-200' :
                  prop.status === 'rejected' ? 'bg-red-100 text-red-700 border border-red-200' :
                  prop.status === 'sent' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                  'bg-neutral-100 text-neutral-600 border border-neutral-200'
                }`}>
                  {prop.status === 'accepted' && <CheckCircle size={12} />}
                  {prop.status === 'sent' && <FileSignature size={12} />}
                  {prop.status === 'draft' && <Clock size={12} />}
                  {prop.status === 'rejected' && <X size={12} />}
                  {prop.status}
                </span>
              </div>
              <div className="col-span-2 flex justify-end gap-1.5">
                {prop.document_url && (
                  <button onClick={() => window.open(prop.document_url, '_blank')} className="p-2 bg-neutral-50 hover:bg-blue-50 text-neutral-500 hover:text-blue-600 rounded-lg transition-colors border border-neutral-100" title="Open Document">
                    <FileText size={16} />
                  </button>
                )}
                <button onClick={() => openModal(prop)} className="p-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 rounded-lg transition-colors border border-neutral-100" title="Edit Proposal">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(prop.id)} className="p-2 bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 rounded-lg transition-colors border border-red-50" title="Delete">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProp ? "Update Proposal" : "Create New Proposal"} maxWidth="lg">
        <div className="flex flex-col gap-5 mt-2">
          
          {/* Top Section */}
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
            <Select label="Assign to Client / Lead" value={formData.lead_id} onChange={e => setFormData({...formData, lead_id: e.target.value})}>
              <option value="">Search for a lead...</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>{l.contacts?.full_name} {l.contacts?.companies?.name ? `(${l.contacts.companies.name})` : ''}</option>
              ))}
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-5">
            <div className="col-span-2 sm:col-span-1">
              <Input label="Total Value" type="number" placeholder="e.g. 5000" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Select label="Currency" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="BDT">BDT (৳) - Taka</option>
                <option value="AUD">AUD ($) - Aussie Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-900 mb-2">Scope of Services (Select all that apply)</label>
            <div className="flex flex-wrap gap-2 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
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
                    className={`px-3 py-1.5 text-[13px] font-medium rounded-lg transition-all ${isSelected ? 'bg-neutral-900 text-white shadow-md' : 'bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-400'}`}
                  >
                    {srv}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="col-span-2 sm:col-span-1">
              <Select label="Pipeline Status" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="draft">📝 Draft (Working on it)</option>
                <option value="sent">✈️ Sent (Waiting on client)</option>
                <option value="accepted">✅ Accepted (Won)</option>
                <option value="rejected">❌ Rejected (Lost)</option>
              </Select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Input label="Document Link (G-Docs, Notion)" value={formData.document_url} onChange={e => setFormData({...formData, document_url: e.target.value})} placeholder="https://..." />
            </div>
          </div>

          <div>
             <label className="block text-xs font-semibold text-neutral-900 mb-1.5">Internal Notes & Terms</label>
             <textarea 
               className="w-full bg-neutral-0 border border-neutral-200 text-neutral-900 text-sm rounded-xl focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 block p-3 outline-none min-h-[80px]"
               placeholder="Deposit requirements, timeframe, deliverables..."
               value={formData.notes}
               onChange={e => setFormData({...formData, notes: e.target.value})}
             />
          </div>

          <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-neutral-100">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Discard</Button>
            <Button onClick={handleSave} disabled={!formData.lead_id || !formData.amount || saving}>
              {saving ? 'Saving…' : editingProp ? 'Update Proposal' : 'Finalize & Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
