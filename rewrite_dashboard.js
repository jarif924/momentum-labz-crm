const fs = require('fs');

const code = `
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Users, CheckCircle2, TrendingUp, Calendar, Activity, BarChart, PieChart, Globe } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalLeads: 0,
    openTasks: 0,
    wonValue: 0,
    currency: 'USD',
    pipeline: {} as Record<string, number>,
    bd: 0,
    intl: 0,
    services: {} as Record<string, number>
  });
  const [tasksToday, setTasksToday] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const [
        { data: allLeadsData },
        { count: tasksCount },
        { data: todayTasksData },
        { data: activitiesData }
      ] = await Promise.all([
        supabase.from('leads').select('stage, region, service_line, deal_value, currency'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('completed', false),
        supabase.from('tasks').select('*, leads(contacts(full_name))')
          .eq('completed', false)
          .order('due_at', { ascending: true })
          .limit(10), 
        supabase.from('activities').select('*, leads(contacts(full_name))')
          .order('created_at', { ascending: false })
          .limit(5)
      ]) as any;

      if (allLeadsData) {
        const totalLeads = allLeadsData.length;
        const wonLeads = allLeadsData.filter((l: any) => l.stage === 'Won');
        const totalWon = wonLeads.reduce((acc: number, l: any) => acc + (Number(l.deal_value) || 0), 0);
        const currency = wonLeads.length > 0 ? (wonLeads[0].currency || 'USD') : 'USD';

        const pipelineStages = ['prospect_found', 'contacted', 'meeting_set', 'proposal_sent', 'negotiation', 'Won', 'Lost'];
        const pipeline: Record<string, number> = {};
        pipelineStages.forEach(s => pipeline[s] = 0);
        allLeadsData.forEach((l: any) => {
          if (pipeline[l.stage] !== undefined) pipeline[l.stage]++;
        });

        let bd = 0;
        let intl = 0;
        allLeadsData.forEach((l: any) => {
          if (l.region === 'bangladesh') bd++;
          if (l.region === 'international') intl++;
        });

        const services: Record<string, number> = { 'tech_solutions': 0, 'web_development': 0, 'marketing': 0 };
        allLeadsData.forEach((l: any) => {
          if (l.service_line && services[l.service_line] !== undefined) services[l.service_line]++;
        });

        setStats({
          totalLeads,
          openTasks: tasksCount || 0,
          wonValue: totalWon,
          currency,
          pipeline,
          bd,
          intl,
          services
        });
      }

      if (todayTasksData) {
        setTasksToday(todayTasksData.filter((t: any) => {
          const due = new Date(t.due_at);
          return due <= todayEnd; // Overdue or today
        }));
      }
      if (activitiesData) setRecentActivities(activitiesData);
      
      setLoading(false);
    }

    fetchDashboard();
  }, []);

  const formatStage = (s: string) => s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const pipelineMax = Math.max(...Object.values(stats.pipeline), 1);

  return (
    <div className="flex flex-col h-full max-w-6xl pb-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Welcome back — here&apos;s a quick overview of your pipeline.
          </p>
        </div>
        <Link
          href="/leads"
          className="inline-flex items-center h-10 px-4 bg-neutral-900 text-neutral-0 rounded-[8px] text-sm font-medium hover:bg-neutral-800 transition-colors"
        >
          View Leads
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-neutral-0 h-32 rounded-[16px] border border-neutral-100 animate-pulse"></div>
          <div className="bg-neutral-0 h-32 rounded-[16px] border border-neutral-100 animate-pulse"></div>
          <div className="bg-neutral-0 h-32 rounded-[16px] border border-neutral-100 animate-pulse"></div>
        </div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] p-6 flex flex-col">
              <div className="flex items-center gap-3 text-neutral-500 mb-4">
                <div className="p-2 bg-neutral-50 rounded-[8px]"><Users size={20} /></div>
                <span className="text-sm font-semibold uppercase tracking-wider">Total Leads</span>
              </div>
              <div className="text-3xl font-semibold text-neutral-900">{stats.totalLeads}</div>
            </div>
            
            <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] p-6 flex flex-col">
              <div className="flex items-center gap-3 text-neutral-500 mb-4">
                <div className="p-2 bg-neutral-50 rounded-[8px]"><CheckCircle2 size={20} /></div>
                <span className="text-sm font-semibold uppercase tracking-wider">Open Tasks</span>
              </div>
              <div className="text-3xl font-semibold text-neutral-900">{stats.openTasks}</div>
            </div>

            <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] p-6 flex flex-col">
              <div className="flex items-center gap-3 text-neutral-500 mb-4">
                <div className="p-2 bg-success-50 text-success-600 rounded-[8px]"><TrendingUp size={20} /></div>
                <span className="text-sm font-semibold uppercase tracking-wider">Total Won Value</span>
              </div>
              <div className="text-3xl font-semibold text-neutral-900">
                {stats.currency} {stats.wonValue.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Pipeline Chart */}
            <div className="lg:col-span-2 bg-neutral-0 border border-neutral-100 rounded-[16px] p-6">
              <div className="flex items-center gap-2 mb-6">
                <BarChart size={18} className="text-neutral-400" />
                <h2 className="text-base font-semibold text-neutral-900">Pipeline Stages</h2>
              </div>
              <div className="flex items-end gap-2 h-48 mt-4">
                {Object.entries(stats.pipeline).map(([stage, count]) => {
                  const height = \`\${(count / pipelineMax) * 100}%\`;
                  return (
                    <div key={stage} className="flex-1 flex flex-col justify-end items-center group relative">
                      <div className="text-xs text-neutral-400 font-medium mb-2">{count}</div>
                      <div 
                        className="w-full bg-accent-200 group-hover:bg-accent-400 rounded-t-[4px] transition-all"
                        style={{ height: count > 0 ? height : '4px' }}
                      ></div>
                      <div className="text-[10px] text-neutral-500 mt-2 truncate w-full text-center capitalize">{formatStage(stage)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Split Stats */}
            <div className="flex flex-col gap-6">
              <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] p-6 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-4">
                  <Globe size={18} className="text-neutral-400" />
                  <h2 className="text-base font-semibold text-neutral-900">Region Split</h2>
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-neutral-600">Bangladesh</span>
                      <span className="font-semibold">{stats.bd}</span>
                    </div>
                    <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-accent-500" style={{ width: \`\${stats.totalLeads ? (stats.bd/stats.totalLeads)*100 : 0}%\`}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-neutral-600">International</span>
                      <span className="font-semibold">{stats.intl}</span>
                    </div>
                    <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-neutral-800" style={{ width: \`\${stats.totalLeads ? (stats.intl/stats.totalLeads)*100 : 0}%\`}}></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] p-6 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-4">
                  <PieChart size={18} className="text-neutral-400" />
                  <h2 className="text-base font-semibold text-neutral-900">Service Lines</h2>
                </div>
                <div className="space-y-3">
                  {Object.entries(stats.services).map(([service, count]) => (
                    <div key={service}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-neutral-600 capitalize">{formatStage(service)}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tasks Widget */}
            <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] flex flex-col h-full">
              <div className="p-5 border-b border-neutral-100 flex items-center gap-2">
                <Calendar size={18} className="text-neutral-400" />
                <h2 className="text-base font-semibold text-neutral-900">Follow-ups (Today & Overdue)</h2>
              </div>
              <div className="p-5 flex-1">
                {tasksToday.length === 0 ? (
                  <div className="text-center text-neutral-500 text-sm py-8">No tasks due today. Awesome!</div>
                ) : (
                  <div className="space-y-4">
                    {tasksToday.map(task => {
                      const isOverdue = new Date(task.due_at) < new Date(new Date().setHours(0,0,0,0));
                      return (
                        <div key={task.id} className="flex flex-col gap-1 pb-4 border-b border-neutral-100 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-neutral-900">{task.title}</span>
                            <span className={\`text-[10px] font-medium px-2 py-1 rounded \${isOverdue ? 'bg-danger-50 text-danger-600 border border-danger-200' : 'bg-neutral-100 text-neutral-500'}\`}>
                              {isOverdue ? 'OVERDUE' : new Date(task.due_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                          {task.leads?.contacts?.full_name && (
                            <span className="text-xs text-neutral-500">Lead: {task.leads.contacts.full_name}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-neutral-100 bg-neutral-50 text-center rounded-b-[16px]">
                <Link href="/tasks" className="text-sm font-medium text-accent-600 hover:text-accent-700">View All Tasks &rarr;</Link>
              </div>
            </div>

            {/* Activity Widget */}
            <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] flex flex-col h-full">
              <div className="p-5 border-b border-neutral-100 flex items-center gap-2">
                <Activity size={18} className="text-neutral-400" />
                <h2 className="text-base font-semibold text-neutral-900">Recent Activity</h2>
              </div>
              <div className="p-5 flex-1">
                {recentActivities.length === 0 ? (
                  <div className="text-center text-neutral-500 text-sm py-8">No recent activity.</div>
                ) : (
                  <div className="space-y-5">
                    {recentActivities.map(act => (
                      <div key={act.id} className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0 border border-neutral-200 text-neutral-500">
                          <Activity size={14} />
                        </div>
                        <div>
                          <p className="text-sm text-neutral-900">
                            <span className="font-medium capitalize">{act.channel}</span> activity on{' '}
                            <span className="font-medium">{act.leads?.contacts?.full_name || 'Unknown Lead'}</span>
                          </p>
                          <p className="text-xs text-neutral-500 mt-1 truncate max-w-sm">{act.summary}</p>
                          <p className="text-[10px] text-neutral-400 mt-1">
                            {new Date(act.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
`;

fs.writeFileSync('src/app/(app)/page.tsx', code);
