/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/supabase';
import { Briefcase, Mail, Phone, ExternalLink, MessageCircle } from 'lucide-react';

export default function ClientsPage() {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase
      .from('contacts')
      .select('*, companies(*), leads(deal_value, currency, stage)')
      .eq('is_client', true)
      .order('full_name', { ascending: true });

    if (data) setClients(data);
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-full max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Clients</h1>
          <p className="text-sm text-neutral-500 mt-1">Directory of all active and past converted clients.</p>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-neutral-500 text-sm animate-pulse">Loading clients...</div>
      ) : clients.length === 0 ? (
        <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] overflow-hidden p-12 flex flex-col items-center justify-center text-center">
          <Briefcase size={48} className="text-neutral-200 mb-4" />
          <h3 className="text-base font-semibold text-neutral-900 mb-1">No clients yet</h3>
          <p className="text-sm text-neutral-500 max-w-sm">
            Once you win a lead or mark a contact as a client, they will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map(client => {
            // Calculate total LTV from all linked leads
            const ltv = (client.leads || []).reduce((acc: number, l: any) => {
              if (l.stage === 'Won') return acc + (Number(l.deal_value) || 0);
              return acc;
            }, 0);
            
            const currency = client.leads?.[0]?.currency || 'USD';

            return (
              <div key={client.id} className="bg-neutral-0 border border-neutral-100 rounded-[16px] overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6 border-b border-neutral-100">
                  <h3 className="text-lg font-semibold text-neutral-900">{client.full_name}</h3>
                  <p className="text-sm text-neutral-500 mb-4">{client.companies?.name || 'Independent'}</p>
                  
                  <div className="inline-flex flex-col">
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Total LTV</span>
                    <span className="text-sm font-semibold text-success-600 bg-success-50 px-2.5 py-1 rounded-full">
                      {currency} {ltv.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="p-6 bg-neutral-50 flex flex-col gap-3">
                  {client.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail size={16} className="text-neutral-400" />
                      <a href={`mailto:${client.email}`} className="text-neutral-700 hover:text-accent-600">{client.email}</a>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone size={16} className="text-neutral-400" />
                      <a href={`tel:${client.phone}`} className="text-neutral-700 hover:text-accent-600">{client.phone}</a>
                    </div>
                  )}
                  {client.whatsapp && (
                    <div className="flex items-center gap-3 text-sm">
                      <MessageCircle size={16} className="text-success-500" />
                      <a href={`https://wa.me/${client.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="text-neutral-700 hover:text-accent-600">
                        {client.whatsapp}
                      </a>
                    </div>
                  )}
                  {client.companies?.website && (
                    <div className="flex items-center gap-3 text-sm pt-2 mt-2 border-t border-neutral-200">
                      <ExternalLink size={16} className="text-neutral-400" />
                      <a href={client.companies.website} target="_blank" rel="noreferrer" className="text-accent-500 hover:underline">
                        Website
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
