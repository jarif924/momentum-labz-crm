'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/supabase';
import { Button, Input, Select } from '@/components/ui/Forms';
import { Modal } from '@/components/ui/Modal';
import { Plus, Edit2, Trash2, Users, Building2 } from 'lucide-react';

export default function ContactsPage() {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [activeTab, setActiveTab] = useState<'contacts' | 'companies'>('contacts');
  
  const [contacts, setContacts] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  
  const [editingContact, setEditingContact] = useState<any>(null);
  const [editingCompany, setEditingCompany] = useState<any>(null);

  const [contactData, setContactData] = useState<any>({
    full_name: '', email: '', phone: '', whatsapp: '', instagram_handle: '', company_id: '', is_client: false
  });

  const [companyData, setCompanyData] = useState<any>({
    name: '', region: 'international', country: '', website: ''
  });

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchData() {
    setLoading(true);
    const [ { data: cData }, { data: compData } ] = await Promise.all([
      supabase.from('contacts').select('*, companies(name)').order('full_name', { ascending: true }),
      supabase.from('companies').select('*').order('name', { ascending: true })
    ]) as any;

    if (cData) setContacts(cData);
    if (compData) setCompanies(compData);
    setLoading(false);
  }

  // --- Contact Handlers ---
  function openContactModal(contact?: any) {
    if (contact) {
      setEditingContact(contact);
      setContactData({
        full_name: contact.full_name,
        email: contact.email || '',
        phone: contact.phone || '',
        whatsapp: contact.whatsapp || '',
        instagram_handle: contact.instagram_handle || '',
        company_id: contact.company_id || '',
        is_client: contact.is_client || false
      });
    } else {
      setEditingContact(null);
      setContactData({ full_name: '', email: '', phone: '', whatsapp: '', instagram_handle: '', company_id: '', is_client: false });
    }
    setIsContactModalOpen(true);
  }

  async function saveContact() {
    if (!contactData.full_name) return;
    const payload = {
      ...contactData,
      company_id: contactData.company_id || null
    };

    if (editingContact) {
      await (supabase.from('contacts') as any).update(payload).eq('id', editingContact.id);
    } else {
      await (supabase.from('contacts') as any).insert(payload);
    }
    setIsContactModalOpen(false);
    fetchData();
  }

  async function deleteContact(id: string) {
    if (confirm('Delete this contact?')) {
      await (supabase.from('contacts') as any).delete().eq('id', id);
      fetchData();
    }
  }

  // --- Company Handlers ---
  function openCompanyModal(company?: any) {
    if (company) {
      setEditingCompany(company);
      setCompanyData({
        name: company.name,
        region: company.region || 'international',
        country: company.country || '',
        website: company.website || ''
      });
    } else {
      setEditingCompany(null);
      setCompanyData({ name: '', region: 'international', country: '', website: '' });
    }
    setIsCompanyModalOpen(true);
  }

  async function saveCompany() {
    if (!companyData.name) return;
    if (editingCompany) {
      await (supabase.from('companies') as any).update(companyData).eq('id', editingCompany.id);
    } else {
      await (supabase.from('companies') as any).insert(companyData);
    }
    setIsCompanyModalOpen(false);
    fetchData();
  }

  async function deleteCompany(id: string) {
    if (confirm('Delete this company? Linked contacts will lose their company.')) {
      await (supabase.from('companies') as any).delete().eq('id', id);
      fetchData();
    }
  }

  return (
    <div className="flex flex-col h-full max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Contacts & Companies</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage your network and linked accounts.</p>
        </div>
        <Button onClick={() => activeTab === 'contacts' ? openContactModal() : openCompanyModal()}>
          <Plus size={16} className="mr-2" /> 
          Add {activeTab === 'contacts' ? 'Contact' : 'Company'}
        </Button>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('contacts')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'contacts' ? 'bg-neutral-900 text-neutral-0' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
        >
          <Users size={16} className="inline mr-2" /> Contacts
        </button>
        <button
          onClick={() => setActiveTab('companies')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'companies' ? 'bg-neutral-900 text-neutral-0' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
        >
          <Building2 size={16} className="inline mr-2" /> Companies
        </button>
      </div>

      <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-neutral-500 text-sm animate-pulse">Loading...</div>
        ) : activeTab === 'contacts' ? (
          // Contacts List
          contacts.length === 0 ? (
            <div className="p-12 text-center text-neutral-500">No contacts found.</div>
          ) : (
            <div>
              <div className="grid grid-cols-12 gap-4 p-4 bg-neutral-50 border-b border-neutral-100 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                <div className="col-span-3">Name</div>
                <div className="col-span-3">Company</div>
                <div className="col-span-4">Contact Info</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              {contacts.map(c => (
                <div key={c.id} className="grid grid-cols-12 gap-4 p-4 border-b border-neutral-100 items-center hover:bg-neutral-50">
                  <div className="col-span-3">
                    <p className="font-medium text-sm text-neutral-900">{c.full_name}</p>
                    {c.is_client && <span className="inline-block px-1.5 py-0.5 mt-1 bg-success-50 text-success-600 text-[10px] rounded font-medium uppercase tracking-wide">Client</span>}
                  </div>
                  <div className="col-span-3 text-sm text-neutral-700">{c.companies?.name || '-'}</div>
                  <div className="col-span-4 text-xs text-neutral-500 space-y-0.5">
                    {c.email && <p>Email: {c.email}</p>}
                    {c.phone && <p>Phone: {c.phone}</p>}
                    {c.whatsapp && <p>WA: {c.whatsapp}</p>}
                  </div>
                  <div className="col-span-2 flex justify-end gap-2">
                    <Button variant="ghost" size="compact" onClick={() => openContactModal(c)}><Edit2 size={14} /></Button>
                    <Button variant="ghost" size="compact" className="text-danger-text" onClick={() => deleteContact(c.id)}><Trash2 size={14} /></Button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          // Companies List
          companies.length === 0 ? (
            <div className="p-12 text-center text-neutral-500">No companies found.</div>
          ) : (
            <div>
              <div className="grid grid-cols-12 gap-4 p-4 bg-neutral-50 border-b border-neutral-100 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                <div className="col-span-4">Company Name</div>
                <div className="col-span-3">Region</div>
                <div className="col-span-3">Website</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              {companies.map(comp => (
                <div key={comp.id} className="grid grid-cols-12 gap-4 p-4 border-b border-neutral-100 items-center hover:bg-neutral-50">
                  <div className="col-span-4 font-medium text-sm text-neutral-900">{comp.name}</div>
                  <div className="col-span-3 text-sm text-neutral-700 capitalize">
                    {comp.region} {comp.country ? `(${comp.country})` : ''}
                  </div>
                  <div className="col-span-3 text-sm text-neutral-500">
                    {comp.website ? <a href={comp.website} target="_blank" rel="noreferrer" className="text-accent-500 hover:underline">{comp.website}</a> : '-'}
                  </div>
                  <div className="col-span-2 flex justify-end gap-2">
                    <Button variant="ghost" size="compact" onClick={() => openCompanyModal(comp)}><Edit2 size={14} /></Button>
                    <Button variant="ghost" size="compact" className="text-danger-text" onClick={() => deleteCompany(comp.id)}><Trash2 size={14} /></Button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Contact Modal */}
      <Modal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} title={editingContact ? "Edit Contact" : "Add Contact"}>
        <div className="flex flex-col gap-4">
          <Input label="Full Name *" value={contactData.full_name} onChange={e => setContactData({...contactData, full_name: e.target.value})} />
          <Select label="Company" value={contactData.company_id} onChange={e => setContactData({...contactData, company_id: e.target.value})}>
            <option value="">None</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={contactData.email} onChange={e => setContactData({...contactData, email: e.target.value})} />
            <Input label="Phone" value={contactData.phone} onChange={e => setContactData({...contactData, phone: e.target.value})} />
            <Input label="WhatsApp" value={contactData.whatsapp} onChange={e => setContactData({...contactData, whatsapp: e.target.value})} />
            <Input label="Instagram" value={contactData.instagram_handle} onChange={e => setContactData({...contactData, instagram_handle: e.target.value})} />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input type="checkbox" id="is_client" checked={contactData.is_client} onChange={e => setContactData({...contactData, is_client: e.target.checked})} className="rounded border-neutral-200 text-neutral-900 focus:ring-neutral-900" />
            <label htmlFor="is_client" className="text-sm text-neutral-900 font-medium">Mark as Active Client</label>
          </div>
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-neutral-100">
            <Button variant="secondary" onClick={() => setIsContactModalOpen(false)}>Cancel</Button>
            <Button onClick={saveContact} disabled={!contactData.full_name}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Company Modal */}
      <Modal isOpen={isCompanyModalOpen} onClose={() => setIsCompanyModalOpen(false)} title={editingCompany ? "Edit Company" : "Add Company"}>
        <div className="flex flex-col gap-4">
          <Input label="Company Name *" value={companyData.name} onChange={e => setCompanyData({...companyData, name: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Region" value={companyData.region} onChange={e => setCompanyData({...companyData, region: e.target.value})}>
              <option value="international">International</option>
              <option value="bangladesh">Bangladesh</option>
            </Select>
            <Input label="Country" value={companyData.country} onChange={e => setCompanyData({...companyData, country: e.target.value})} />
          </div>
          <Input label="Website" type="url" value={companyData.website} onChange={e => setCompanyData({...companyData, website: e.target.value})} placeholder="https://" />
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-neutral-100">
            <Button variant="secondary" onClick={() => setIsCompanyModalOpen(false)}>Cancel</Button>
            <Button onClick={saveCompany} disabled={!companyData.name}>Save</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
