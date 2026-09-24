/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { X, Mail, Phone, ExternalLink, FileText, Printer, Calendar, Clock, CheckCircle } from 'lucide-react';
import { Button, Input } from '@/components/ui/Forms';
import { EmptyState } from '@/components/ui/EmptyState';
import { FileText as FileTextIcon, Receipt, Activity } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/supabase';

export function LeadDrawer({ isOpen, onClose, lead }: { isOpen: boolean, onClose: () => void, lead: any }) {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [activities, setActivities] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [newActivity, setNewActivity] = useState('');
  const [newChannel, setNewChannel] = useState('note');
  
  const [loading, setLoading] = useState(false);

  // Next Action State
  const [nextActionType, setNextActionType] = useState(lead?.next_action_type || 'call');
  const [nextActionDate, setNextActionDate] = useState(lead?.next_action_date ? lead.next_action_date.split('T')[0] : '');
  const [nextActionNotes, setNextActionNotes] = useState(lead?.next_action_notes || '');
  const [isEditingAction, setIsEditingAction] = useState(false);


  useEffect(() => {
    if (isOpen && lead?.id) {
      fetchActivities();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, lead?.id]);

  async function handleSaveNextAction() {
    setLoading(true);
    const { error } = await supabase
      .from('leads')
      .update({
        next_action_type: nextActionType,
        next_action_date: nextActionDate || null,
        next_action_notes: nextActionNotes
      })
      .eq('id', lead.id);
    setLoading(false);
    if (!error) setIsEditingAction(false);
  }

  async function handleCompleteAction() {
    setLoading(true);
    // log to activity timeline automatically
    await (supabase.from('activities') as any).insert({
      lead_id: lead.id,
      channel: nextActionType,
      summary: `Completed Action: ${nextActionNotes}`,
      direction: 'outbound'
    });
    
    // clear next action
    await supabase.from('leads').update({
      next_action_type: null,
      next_action_date: null,
      next_action_notes: null
    }).eq('id', lead.id);
    
    setNextActionType('call');
    setNextActionDate('');
    setNextActionNotes('');
    setIsEditingAction(false);
    setLoading(false);
    fetchActivities();
  }

  async function fetchActivities() {
    setLoading(true);
    const { data: acts } = await supabase
      .from('activities')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false });
      
    const { data: props } = await supabase
      .from('proposals')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false });
      
    const { data: invs } = await supabase
      .from('invoices')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false });
    
    if (acts) setActivities(acts);
    if (props) setProposals(props);
    if (invs) setInvoices(invs);
    setLoading(false);
  }

  async function handleAddActivity() {
    if (!newActivity.trim()) return;
    setLoading(true);
    await (supabase.from('activities') as any).insert({
      lead_id: lead.id,
      channel: newChannel,
      summary: newActivity.trim(),
      direction: 'outbound'
    });
    setNewActivity('');
    fetchActivities();
  }

  if (!isOpen || !lead) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-neutral-900/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-neutral-0 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-out border-l border-neutral-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-100">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">{lead.contacts?.full_name}</h2>
            {lead.companies?.name && <p className="text-sm text-neutral-500 mt-1">{lead.companies.name}</p>}
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

          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
          
          
          {/* Next Action Box (Pipedrive Style) */}
          <div className="bg-warning-50 border border-warning-200 p-4 rounded-[8px] -mt-2">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-warning-900 flex items-center gap-1.5"><Calendar size={16} /> Next Action</h3>
              {!isEditingAction && (
                <Button variant="ghost" size="compact" onClick={() => setIsEditingAction(true)}>Edit</Button>
              )}
            </div>
            
            {isEditingAction ? (
              <div className="flex flex-col gap-3 mt-3">
                <div className="flex gap-2">
                  <select 
                    className="flex-1 bg-white border border-neutral-200 rounded-md text-sm p-2"
                    value={nextActionType}
                    onChange={(e) => setNextActionType(e.target.value)}
                  >
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                    <option value="demo">Demo</option>
                    <option value="follow_up">Follow Up</option>
                  </select>
                  <input 
                    type="date" 
                    className="flex-1 bg-white border border-neutral-200 rounded-md text-sm p-2"
                    value={nextActionDate}
                    onChange={(e) => setNextActionDate(e.target.value)}
                  />
                </div>
                <Input 
                  placeholder="Notes about this action..." 
                  value={nextActionNotes} 
                  onChange={(e) => setNextActionNotes(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="compact" onClick={handleSaveNextAction} disabled={loading}>Save Action</Button>
                  <Button variant="ghost" size="compact" onClick={() => setIsEditingAction(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div>
                {lead.next_action_date ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm text-warning-900">
                      <span className="capitalize font-semibold">{lead.next_action_type || 'Follow up'}</span>
                      <span className="text-warning-700">on {new Date(lead.next_action_date).toLocaleDateString()}</span>
                    </div>
                    {lead.next_action_notes && <p className="text-sm text-warning-800">{lead.next_action_notes}</p>}
                    <div className="mt-2">
                      <Button size="compact" variant="secondary" onClick={handleCompleteAction} disabled={loading} className="bg-white hover:bg-success-50 hover:text-success-700 hover:border-success-200 transition-colors">
                        <CheckCircle size={14} className="mr-1" /> Mark as Done
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-warning-700 flex flex-col items-start gap-2">
                    <p>No follow-up action scheduled. High-ticket leads go cold without follow-ups!</p>
                    <Button size="compact" onClick={() => setIsEditingAction(true)}>Schedule Now</Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Info */}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Stage</p>
              <span className="inline-block px-2.5 py-1 bg-accent-50 text-accent-700 text-sm font-medium rounded-full">
                {lead.stage}
              </span>
            </div>
            
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

            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Deal Value</p>
              <p className="text-sm font-semibold text-neutral-900">
                {lead.deal_value ? `${lead.currency} ${lead.deal_value.toLocaleString()}` : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Source</p>
              <p className="text-sm text-neutral-700 capitalize">{lead.source?.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Channel</p>
              <p className="text-sm text-neutral-700 capitalize">{lead.preferred_channel?.replace(/_/g, ' ')}</p>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 mb-3 pb-2 border-b border-neutral-100">Contact Information</h3>
            <div className="space-y-3">
              {lead.contacts?.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail size={16} className="text-neutral-400" />
                  <a href={`mailto:${lead.contacts.email}`} className="text-accent-500 hover:underline">{lead.contacts.email}</a>
                </div>
              )}
              {lead.contacts?.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone size={16} className="text-neutral-400" />
                  <a href={`tel:${lead.contacts.phone}`} className="text-neutral-700 hover:underline">{lead.contacts.phone}</a>
                </div>
              )}
              {lead.companies?.website && (
                <div className="flex items-center gap-3 text-sm">
                  <ExternalLink size={16} className="text-neutral-400" />
                  <a href={lead.companies.website} target="_blank" rel="noreferrer" className="text-accent-500 hover:underline">
                    {lead.companies.website}
                  </a>
                </div>
              )}
            </div>
          </div>


          {/* Custom Fields */}
          {lead.custom_fields && Object.keys(lead.custom_fields).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 mb-3 pb-2 border-b border-neutral-100">Custom Fields</h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(lead.custom_fields).map(([key, value]) => {
                  const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  const isLink = typeof value === 'string' && value.startsWith('http');
                  return (
                    <div key={key}>
                      <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">{label}</p>
                      {isLink ? (
                        <a href={value} target="_blank" rel="noreferrer" className="text-sm text-accent-500 hover:underline break-all">
                          {value}
                        </a>
                      ) : (
                        <p className="text-sm text-neutral-900">{value as React.ReactNode || '-'}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Services */}
          {lead.services?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 mb-3 pb-2 border-b border-neutral-100">Services of Interest</h3>
              <div className="flex flex-wrap gap-2">
                {lead.services.map((s: string) => (
                  <span key={s} className="px-2.5 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          
          {/* Proposals */}
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100">
              <h3 className="text-sm font-semibold text-neutral-900">Proposals</h3>
            </div>
            {proposals.length === 0 ? (
              <EmptyState icon={FileTextIcon} title="No proposals yet" description="Create a proposal to send to this client." />
            ) : (
              <div className="space-y-3">
                {proposals.map(prop => (
                  <div key={prop.id} className="flex justify-between items-center bg-neutral-50 p-3 rounded-[8px] border border-neutral-100">
                    <div>
                      <div className="flex gap-2 items-center mb-1">
                        <span className="font-semibold text-sm text-neutral-900">{prop.currency} {prop.amount.toLocaleString()}</span>
                        <span className={`text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${
                          prop.status === 'accepted' ? 'bg-success-bg text-success-text' :
                          prop.status === 'rejected' ? 'bg-danger-bg text-danger-text' :
                          prop.status === 'sent' ? 'bg-info-bg text-info-text' :
                          'bg-neutral-200 text-neutral-600'
                        }`}>
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


          
          {/* Invoices */}
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100">
              <h3 className="text-sm font-semibold text-neutral-900">Invoices</h3>
            </div>
            {invoices.length === 0 ? (
              <EmptyState icon={Receipt} title="No invoices yet" description="Generate an invoice when the deal is won." />
            ) : (
              <div className="space-y-3">
                {invoices.map(inv => (
                  <div key={inv.id} className="flex justify-between items-center bg-neutral-50 p-3 rounded-[8px] border border-neutral-100">
                    <div>
                      <div className="flex gap-2 items-center mb-1">
                        <span className="font-semibold text-sm text-neutral-900">{inv.currency === 'BDT' ? '৳' : '$'}{inv.amount.toLocaleString()}</span>
                        <span className={`text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${
                          inv.status === 'paid' ? 'bg-success-bg text-success-text' :
                          inv.status === 'overdue' ? 'bg-danger-bg text-danger-text' :
                          inv.status === 'sent' ? 'bg-info-bg text-info-text' :
                          'bg-neutral-200 text-neutral-600'
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-500">#{inv.invoice_number} • {new Date(inv.created_at).toLocaleDateString()}</div>
                    </div>
                    <Button variant="ghost" size="compact" onClick={() => window.open(`/print/invoices/${inv.id}`, '_blank')}>
                      <Printer size={14} /> Print
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>


          {/* Activity Timeline */}
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100">
              <h3 className="text-sm font-semibold text-neutral-900">Activity Timeline</h3>
            </div>
            
            {/* Add Note Form */}
            <div className="mb-4 bg-neutral-50 p-3 rounded-[8px] border border-neutral-100 flex flex-col gap-3">
              <Input 
                placeholder="Write a note..." 
                value={newActivity}
                onChange={e => setNewActivity(e.target.value)}
              />
              <div className="flex justify-between items-center">
                <select 
                  className="bg-transparent text-sm text-neutral-700 border-none outline-none focus:ring-0 p-0"
                  value={newChannel}
                  onChange={e => setNewChannel(e.target.value)}
                >
                  <option value="note">Note</option>
                  <option value="email">Email</option>
                  <option value="call">Call</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="instagram_dm">Instagram</option>
                  <option value="meeting">Meeting</option>
                </select>
                <Button size="compact" onClick={handleAddActivity} disabled={loading || !newActivity.trim()}>
                  Post
                </Button>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-neutral-100 before:to-transparent">
              {activities.length === 0 ? (
                <EmptyState icon={Activity} title="No activity" description="Log a note or complete an action to start the timeline." />
              ) : (
                activities.map(act => (
                  <div key={act.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border border-neutral-0 bg-neutral-100 text-neutral-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <div className="w-2 h-2 rounded-full bg-neutral-400" />
                    </div>
                    <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-[8px] border border-neutral-100 bg-neutral-0 shadow-sm ml-4 md:ml-0">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-semibold text-neutral-900 capitalize">{act.channel}</span>
                        <span className="text-[10px] text-neutral-400">{new Date(act.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-neutral-700">{act.summary}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
