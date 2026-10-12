/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, Select } from '@/components/ui/Forms';
import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/supabase';
import { useToast } from '@/components/ui/Toast';
import { friendlyError } from '@/lib/errors';
import { CustomFieldInput } from '@/components/ui/CustomFieldInput';
import { validateCustomFields, type CustomFieldDef } from '@/lib/customFields';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function LeadFormModal({ isOpen, onClose, lead, onSave }: { isOpen: boolean, onClose: () => void, lead?: any, onSave: () => void }) {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [formData, setFormData] = useState<any>({
    contact_id: '',
    company_id: '',
    company_name: '',
    company_url: '',
    services: [],
    region: 'international',
    preferred_channel: 'email',
    source: 'cold_outreach',
    stage: 'Prospect Found',
    deal_value: '',
    currency: 'USD',
    niche: '',
    demo_status: '',
    running_meta_ads: false
  });

  const [stages, setStages] = useState<any[]>([]);
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [customFieldsSchema, setCustomFieldsSchema] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [leadSources, setLeadSources] = useState<{ id: string; label: string }[]>([]);
  const [currencyMapping, setCurrencyMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isOpen) {
      fetchData();
      if (lead) {
        setFormData({
          contact_id: lead.contact_id || '',
          company_id: lead.company_id || '',
          company_name: lead.companies?.name || lead.contacts?.full_name || '',
          company_url: lead.companies?.website || '',
          services: lead.services || [],
          region: lead.region || 'international',
          preferred_channel: lead.preferred_channel || 'email',
          source: lead.source || 'cold_outreach',
          stage: lead.stage || 'Prospect Found',
          deal_value: lead.deal_value || '',
        currency: lead.currency || 'USD',
        niche: lead.niche || '',
        demo_status: lead.demo_status || '',
        running_meta_ads: lead.running_meta_ads || false,
          custom_fields: lead.custom_fields || {},
          service_line: lead.service_line || 'web_development',
          // leads are loaded with lead_tags(tags(id, name)), so the id is nested
          tags: (lead.lead_tags || []).map((lt: any) => lt.tag_id ?? lt.tags?.id).filter(Boolean)
        });
      } else {
        setFormData({
          contact_id: '',
          company_id: '',
          company_name: '',
          company_url: '',
          services: [],
          region: 'international',
          preferred_channel: 'email',
          source: 'cold_outreach',
          stage: 'Prospect Found',
          deal_value: '',
          currency: 'USD',
          custom_fields: {},
          service_line: 'web_development',
          tags: [],
          niche: '',
          demo_status: '',
          running_meta_ads: false
        });
      }
    }
  }, [isOpen, lead]);

  async function fetchData() {
    const results = await Promise.all([
      supabase.from('pipeline_stages').select('*').order('sort_order'),
      supabase.from('system_settings').select('services, lead_custom_fields, lead_sources, currency_mapping').eq('id', 1).single(),
      supabase.from('tags').select('*').order('name')
    ]) as any;
    const [{ data: stData }, { data: setData }, { data: tagsData }] = results;
    const loadError = results.find((r: any) => r.error)?.error;
    if (loadError) toast.error(`Couldn't load form options: ${friendlyError(loadError)}`);

    if (stData) setStages(stData);
    if (tagsData) setAvailableTags(tagsData);
    if (setData) {
      setAvailableServices(setData.services || []);
      setCustomFieldsSchema(setData.lead_custom_fields || []);
      setLeadSources(setData.lead_sources || []);
      const mapping = setData.currency_mapping || {};
      setCurrencyMapping(mapping);
      // New leads start in the default currency for their region (Settings > Currency & FX)
      if (!lead) setFormData((f: any) => ({ ...f, currency: mapping[f.region] || f.currency }));
    }
  }

  async function handleSubmit() {
    if (!formData.company_name?.trim()) { toast.error('Enter the company name.'); return; }
    const fieldError = validateCustomFields(customFieldsSchema, formData.custom_fields || {});
    if (fieldError) { toast.error(fieldError); return; }
    if (loading) return;
    setLoading(true);
    try {
      const companyDetails = {
        name: formData.company_name.trim(),
        website: formData.company_url.trim() || null,
      };
      let finalCompanyId = formData.company_id || null;
      if (finalCompanyId) {
        const { error } = await (supabase.from('companies') as any).update(companyDetails).eq('id', finalCompanyId);
        if (error) throw error;
      } else {
        const { data: company, error } = await (supabase.from('companies') as any).insert(companyDetails).select().single();
        if (error || !company) throw error || new Error('Company could not be saved.');
        finalCompanyId = company.id;
        setFormData((f: any) => ({ ...f, company_id: company.id }));
      }

      // The current lead schema requires a contact. Create it automatically
      // using the business name so prospect entry needs only company details.
      let finalContactId = formData.contact_id || null;
      if (!finalContactId) {
        const { data: contact, error } = await (supabase.from('contacts') as any).insert({
          full_name: companyDetails.name,
          company_id: finalCompanyId,
        }).select().single();
        if (error || !contact) throw error || new Error('Lead details could not be saved.');
        finalContactId = contact.id;
        setFormData((f: any) => ({ ...f, contact_id: contact.id }));
      }

      const payload = {
        contact_id: finalContactId,
        company_id: finalCompanyId,
        services: formData.services,
        region: formData.region,
        preferred_channel: formData.preferred_channel,
        source: formData.source || null,
        stage: formData.stage,
        deal_value: formData.deal_value ? parseFloat(formData.deal_value) : null,
      currency: formData.currency,
      niche: formData.niche,
      demo_status: formData.demo_status,
      running_meta_ads: formData.running_meta_ads,
        service_line: formData.service_line,
        custom_fields: formData.custom_fields
      };

      let finalLeadId = lead?.id;
      if (lead?.id) {
        const { error } = await (supabase.from('leads') as any).update(payload).eq('id', lead.id);
        if (error) throw error;
      } else {
        const { data: newLead, error } = await (supabase.from('leads') as any).insert(payload).select().single();
        if (error || !newLead) throw error;
        finalLeadId = newLead.id;
      }

      // Sync tags
      const { error: clearErr } = await (supabase.from('lead_tags') as any).delete().eq('lead_id', finalLeadId);
      if (clearErr) throw clearErr;
      if (formData.tags && formData.tags.length > 0) {
        const tagInserts = formData.tags.map((tId: string) => ({ lead_id: finalLeadId, tag_id: tId }));
        const { error: tagErr } = await (supabase.from('lead_tags') as any).insert(tagInserts);
        if (tagErr) throw tagErr;
      }
      toast.success(lead?.id ? 'Lead updated' : 'Lead added');
      onSave();
    } catch (e) {
      toast.error(`Couldn't save lead: ${friendlyError(e)}`);
    }
    setLoading(false);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={lead ? 'Edit Lead' : 'Add Lead'}>
      <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto p-1">
        
        <Input
          label="Company Name *"
          aria-label="Company Name"
          placeholder="Enter the company name"
          value={formData.company_name}
          onChange={e => setFormData({ ...formData, company_name: e.target.value })}
        />
        <Input
          label="Company URL"
          aria-label="Company URL"
          type="text"
          placeholder="Website or Facebook page URL"
          value={formData.company_url}
          onChange={e => setFormData({ ...formData, company_url: e.target.value })}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Service Line" value={formData.service_line} onChange={e => setFormData({...formData, service_line: e.target.value})}>
            <option value="tech_solutions">Tech Solutions</option>
            <option value="web_development">Web Development</option>
            <option value="marketing">Marketing</option>
          </Select>
          <Select label="Region" value={formData.region} onChange={e => setFormData({
            ...formData,
            region: e.target.value,
            ...(!lead && currencyMapping[e.target.value] ? { currency: currencyMapping[e.target.value] } : {}),
          })}>
            <option value="international">International</option>
            <option value="bangladesh">Bangladesh</option>
          </Select>
          <Select label="Stage" value={formData.stage} onChange={e => setFormData({...formData, stage: e.target.value})}>
            {stages.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Source" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})}>
            <option value="">Not set</option>
            {leadSources.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            {formData.source && !leadSources.some(s => s.id === formData.source) && (
              <option value={formData.source}>{formData.source.replace(/_/g, ' ')} (removed)</option>
            )}
          </Select>
          <Select label="Preferred Channel" value={formData.preferred_channel} onChange={e => setFormData({...formData, preferred_channel: e.target.value})}>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="instagram_dm">Instagram DM</option>
            <option value="call">Call</option>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input 
            label="Niche / Industry" 
            value={formData.niche}
            onChange={(e) => setFormData({...formData, niche: e.target.value})}
            placeholder="e.g. Clinics"
          />
          <Input 
            label="Demo Status" 
            value={formData.demo_status}
            onChange={(e) => setFormData({...formData, demo_status: e.target.value})}
            placeholder="e.g. Ready"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer mt-1 mb-2 text-sm text-neutral-700">
          <input 
            type="checkbox" 
            className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
            checked={formData.running_meta_ads}
            onChange={(e) => setFormData({...formData, running_meta_ads: e.target.checked})}
          />
          Currently running Meta Ads?
        </label>

          <Input label="Deal Value" type="number" value={formData.deal_value} onChange={e => setFormData({...formData, deal_value: e.target.value})} />
          <Select label="Currency" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
            <option value="USD">USD</option>
            <option value="BDT">BDT</option>
            <option value="AUD">AUD</option>
          </Select>
        </div>

        {/* Custom Fields */}
        {customFieldsSchema.length > 0 && (
          <div className="pt-2">
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Custom Fields</label>
            <div className="flex flex-col gap-3">
              {customFieldsSchema.map((field: CustomFieldDef) => (
                <CustomFieldInput
                  key={field.id}
                  field={field}
                  value={formData.custom_fields?.[field.id]}
                  onChange={v => setFormData((f: any) => ({ ...f, custom_fields: { ...f.custom_fields, [field.id]: v } }))}
                />
              ))}
            </div>
          </div>
        )}

        
        {/* Tags Multi-Select */}
        <div>
          <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Tags</label>
          <div className="flex flex-wrap gap-2">
            {availableTags.map(tag => {
              const isSelected = formData.tags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setFormData({...formData, tags: formData.tags.filter((t: string) => t !== tag.id)});
                    } else {
                      setFormData({...formData, tags: [...formData.tags, tag.id]});
                    }
                  }}
                  className={`px-3 py-1.5 text-xs rounded border transition-colors ${isSelected ? 'bg-neutral-900 border-neutral-900 text-neutral-0' : 'bg-neutral-50 border-neutral-200 text-neutral-600'}`}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>


        {/* Services Multi-Select */}
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

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-neutral-100">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !formData.company_name?.trim()}>
            {loading ? 'Saving...' : 'Save Lead'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
