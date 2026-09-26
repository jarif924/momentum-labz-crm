/* eslint-disable @typescript-eslint/no-explicit-any */
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { CheckCircle2, Clock, ExternalLink, Calendar, Video, CreditCard, TrendingUp, Users, DollarSign } from 'lucide-react'
import { PortalTaskApproveButton } from '@/components/portal/PortalTaskApproveButton'
import { createAdminClient } from '@/lib/supabase/admin'

export const revalidate = 0 // always fetch fresh data for the portal
export const runtime = 'edge';

export default async function ClientPortalPage({ params }: { params: { id: string } }) {
  let project: any = null;
  let tasks: any[] = [];
  
  try {
    const admin = createAdminClient();

    const { data: proj, error: projErr } = await admin
      .from('projects')
      .select(`
        id, name, status, target_date, total_ad_spend, leads_generated, cpl,
        roas, staging_url, production_url, repository_url, currency,
        company:companies ( name ),
        lead:leads ( currency, contact:contacts ( full_name ) )
      `)
      .eq('id', params.id)
      .single();

    if (projErr || !proj) {
      console.error('Project not found:', projErr);
      return notFound();
    }

    project = {
      ...proj,
      company_name: Array.isArray(proj.company) ? proj.company[0]?.name : proj.company?.name,
      client_name: Array.isArray(proj.lead?.contact) ? proj.lead?.contact[0]?.full_name : proj.lead?.contact?.full_name,
      lead_currency: proj.lead?.currency,
      est_roi_value: (proj.leads_generated || 0) * 1500
    };

    const { data: tsks, error: taskErr } = await admin
      .from('tasks')
      .select('id, title, description, loom_url, status, needs_client_approval, created_at')
      .eq('project_id', params.id)
      .eq('is_client_visible', true)
      .order('created_at', { ascending: false });

    if (taskErr) throw taskErr;

    tasks = (tsks || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      loom_url: t.loom_url,
      completed: t.status === 'completed',
      requires_client_approval: t.needs_client_approval
    }));

  } catch (err: unknown) {
    console.error('Portal load error:', err);
    return notFound();
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-neutral-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold tracking-tighter text-sm">ML</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-neutral-900">Momentum Labz</h1>
              <p className="text-xs text-neutral-500">Client Portal</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-neutral-900">{project.client_name || 'Client'}</p>
            <p className="text-xs text-neutral-500">{project.company_name || 'Project Overview'}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900">{project.name}</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs font-medium border border-neutral-200">
              <span className="w-1.5 h-1.5 rounded-full bg-success-500"></span> Live
            </span>
          </div>
          <p className="text-neutral-500">
            {project.target_date ? (
              <span className="flex items-center gap-1.5">
                <Calendar size={16} /> Target completion: {new Date(project.target_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            ) : 'Welcome to your active project portal.'}
          </p>
        </div>

        {/* Marketing / ROI Widget */}
        {(project.total_ad_spend > 0 || project.leads_generated > 0) && (
          <div className="mb-12 bg-neutral-900 rounded-[20px] p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10"><TrendingUp size={120} /></div>
            <div className="relative z-10">
              <h2 className="text-lg font-semibold text-white/90 flex items-center gap-2 mb-6">
                <TrendingUp size={20} className="text-accent-400" />
                Campaign ROI Snapshot
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
                <div className="pt-4 sm:pt-0">
                  <p className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1 flex items-center gap-1.5"><DollarSign size={14}/> Total Ad Spend</p>
                  <p className="text-3xl font-light">${Number(project.total_ad_spend).toLocaleString()}</p>
                </div>
                <div className="pt-4 sm:pt-0 sm:pl-6">
                  <p className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1 flex items-center gap-1.5"><Users size={14}/> Leads Generated</p>
                  <p className="text-3xl font-light">{project.leads_generated}</p>
                </div>
                <div className="pt-4 sm:pt-0 sm:pl-6">
                  <p className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1 flex items-center gap-1.5 text-accent-300"><TrendingUp size={14}/> Est. Value to You</p>
                  <p className="text-3xl font-light text-accent-400">${Number(project.est_roi_value).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Smart Payment Routing */}
        <div className="mb-12 bg-white border border-neutral-200 rounded-[16px] p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
              <CreditCard size={20} className="text-neutral-400" /> Payment & Billing
            </h2>
            <p className="text-sm text-neutral-500 mt-1">
              {project.currency === 'BDT' ? 'Pay locally via bKash or Bank Transfer.' : 'Pay securely via Stripe or Wire Transfer.'}
            </p>
          </div>
          <button className="px-5 py-2.5 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors">
            {project.currency === 'BDT' ? 'Pay with bKash' : 'Pay via Stripe'}
          </button>
        </div>

        {/* Actionable Links */}
        {(project.staging_url || project.production_url || project.repository_url) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
            {project.staging_url && (
              <a href={project.staging_url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-white border border-neutral-200 rounded-lg hover:shadow-sm transition-all group">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">Staging Environment</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">View the latest build</p>
                </div>
                <ExternalLink size={18} className="text-neutral-400 group-hover:text-accent-500 transition-colors" />
              </a>
            )}
            {project.repository_url && (
              <a href={project.repository_url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-white border border-neutral-200 rounded-lg hover:shadow-sm transition-all group">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">Figma / Assets</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">View design files</p>
                </div>
                <ExternalLink size={18} className="text-neutral-400 group-hover:text-accent-500 transition-colors" />
              </a>
            )}
          </div>
        )}

        <div className="bg-white border border-neutral-200 rounded-[16px] overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-neutral-100 bg-neutral-50/50">
            <h2 className="text-lg font-semibold text-neutral-900">Project Milestones</h2>
            <p className="text-sm text-neutral-500 mt-1">Track the progress of your build.</p>
          </div>
          
          <div className="p-6">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 text-sm">
                No active milestones are currently visible.
              </div>
            ) : (
              <div className="relative border-l-2 border-neutral-100 ml-4 space-y-8 pb-4">
                {tasks.map((task) => {
                  return (
                    <div key={task.id} className="relative pl-8">
                      <div className={`absolute -left-[11px] top-1 w-5 h-5 rounded-full border-[3px] border-white flex items-center justify-center ${task.completed ? 'bg-success-500' : 'bg-neutral-200'}`}>
                        {task.completed && <CheckCircle2 size={12} className="text-white absolute" />}
                      </div>

                      <div className="bg-white border border-neutral-100 rounded-lg p-5 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div>
                            <h3 className={`text-base font-semibold ${task.completed ? 'text-neutral-500 line-through' : 'text-neutral-900'}`}>
                              {task.title}
                            </h3>
                            
                            {task.loom_url && (
                              <div className="mt-4 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-50 p-2">
                                <div className="flex items-center gap-2 mb-2 px-2 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                                  <Video size={14} className="text-accent-500" /> Visual Update
                                </div>
                                <div className="aspect-video relative rounded-md overflow-hidden bg-black">
                                  <iframe src={task.loom_url.replace('/share/', '/embed/')} frameBorder="0" allowFullScreen className="absolute inset-0 w-full h-full"></iframe>
                                </div>
                              </div>
                            )}

                            {task.description && (
                              <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">{task.description}</p>
                            )}
                          </div>
                          
                          <div className="shrink-0 flex flex-col sm:items-end gap-2">
                            {task.completed ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-success-50 text-success-700 text-xs font-semibold">
                                <CheckCircle2 size={14} /> Completed
                              </span>
                            ) : task.requires_client_approval ? (
                              <PortalTaskApproveButton projectId={project.id} taskId={task.id} />
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-600 text-xs font-semibold">
                                <Clock size={14} /> In Progress
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  )
}
