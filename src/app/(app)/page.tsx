/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { 
  AlertCircle, AlertTriangle, Clock, Users,
  CheckCircle2, DollarSign, Target, Activity, LayoutDashboard, TrendingUp 
} from 'lucide-react';
import Link from 'next/link';

function getPeriodDates(period: string) {
  const now = new Date();
  let start = new Date(now.getFullYear(), now.getMonth(), 1);
  let end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  let prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  let prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  if (period === 'last_month') {
    start = prevStart;
    end = prevEnd;
    prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
  } else if (period === 'this_quarter') {
    const quarter = Math.floor(now.getMonth() / 3);
    start = new Date(now.getFullYear(), quarter * 3, 1);
    end = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
    prevStart = new Date(now.getFullYear(), quarter * 3 - 3, 1);
    prevEnd = new Date(now.getFullYear(), quarter * 3, 0, 23, 59, 59, 999);
  } else if (period === 'this_year') {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    prevStart = new Date(now.getFullYear() - 1, 0, 1);
    prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
  }
  return { start: start.toISOString(), end: end.toISOString(), prevStart: prevStart.toISOString(), prevEnd: prevEnd.toISOString() };
}

export default async function DashboardPage({ searchParams }: { searchParams: { period?: string } }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  const { data: dbUser } = await supabase.from('users').select('role').eq('id', user.id).single();
  const role = dbUser?.role || 'member';
  const period = searchParams.period || 'this_month';

  const { start, end, prevStart, prevEnd } = getPeriodDates(period);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Build Queries
  let overdueTasksQ = supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('completed', false).lt('due_at', now.toISOString());
  let followupsQ = supabase.from('leads').select('*', { count: 'exact', head: true }).gte('next_action_date', startOfToday).lte('next_action_date', endOfToday);
  let staleLeadsQ = supabase.from('leads').select('*', { count: 'exact', head: true }).lt('updated_at', thirtyDaysAgo).not('stage', 'eq', 'Won').not('stage', 'eq', 'Lost');
  let focusTasksQ = supabase.from('tasks').select('*, leads(contacts(full_name))').eq('completed', false).lte('due_at', endOfToday).order('due_at', { ascending: true }).limit(10);
  let focusLeadsQ = supabase.from('leads').select('*, contacts(full_name)').gte('next_action_date', startOfToday).lte('next_action_date', endOfToday).limit(10);
  let teamTasksQ = supabase.from('tasks').select('assigned_to, completed, due_at').eq('completed', false);
  let teamUsersQ = supabase.from('users').select('id, email, full_name, avatar_url');

  if (role === 'member') {
    overdueTasksQ = overdueTasksQ.eq('assigned_to', user.id);
    followupsQ = followupsQ.eq('assigned_to', user.id);
    staleLeadsQ = staleLeadsQ.eq('assigned_to', user.id);
    focusTasksQ = focusTasksQ.eq('assigned_to', user.id);
    focusLeadsQ = focusLeadsQ.eq('assigned_to', user.id);
    teamTasksQ = teamTasksQ.eq('assigned_to', user.id);
    teamUsersQ = teamUsersQ.eq('id', user.id);
  }

  const [
    { count: overdueInvoices },
    { count: overdueTasks },
    { count: followupsToday },
    { count: staleLeads },
    { data: paidInvoices },
    { data: allInvoices },
    { data: openPipelineData },
    { data: pipelineStages },
    { data: focusTasksData },
    { data: focusLeadsData },
    { data: usersData },
    { data: teamTasksData }
  ] = await Promise.all([
    supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'unpaid').lt('due_date', now.toISOString()),
    overdueTasksQ,
    followupsQ,
    staleLeadsQ,
    supabase.from('invoices').select('amount, paid_at').eq('status', 'paid').gte('paid_at', prevStart).lte('paid_at', end),
    supabase.from('invoices').select('amount, type, status'),
    supabase.from('leads').select('deal_value, stage'),
    supabase.from('pipeline_stages').select('*').order('sort_order'),
    focusTasksQ,
    focusLeadsQ,
    teamUsersQ,
    teamTasksQ
  ]);

  // Aggregate Data
  let cashCurrent = 0;
  let cashPrev = 0;
  if (paidInvoices) {
    paidInvoices.forEach(inv => {
      const dt = new Date(inv.paid_at);
      const val = Number(inv.amount) || 0;
      if (dt >= new Date(start) && dt <= new Date(end)) {
        cashCurrent += val;
      } else if (dt >= new Date(prevStart) && dt <= new Date(prevEnd)) {
        cashPrev += val;
      }
    });
  }
  const cashTrend = cashPrev > 0 ? ((cashCurrent - cashPrev) / cashPrev) * 100 : 0;

  let outstanding = 0;
  let mrr = 0;
  if (allInvoices) {
    allInvoices.forEach(inv => {
      const val = Number(inv.amount) || 0;
      if (inv.status === 'unpaid') outstanding += val;
      if (inv.type === 'recurring') mrr += val;
    });
  }

  let openPipelineVal = 0;
  const pipelineCounts: Record<string, number> = {};
  const activeStages = pipelineStages ? pipelineStages.filter(s => !s.is_won && !s.is_lost) : [];
  activeStages.forEach(s => pipelineCounts[s.name] = 0);

  if (openPipelineData && pipelineStages) {
    const wonLostStages = pipelineStages.filter(s => s.is_won || s.is_lost).map(s => s.name);
    openPipelineData.forEach(l => {
      if (!wonLostStages.includes(l.stage)) {
        openPipelineVal += Number(l.deal_value) || 0;
        if (pipelineCounts[l.stage] !== undefined) pipelineCounts[l.stage]++;
      }
    });
  }

  const teamPulse = (usersData || []).map(u => {
    const uTasks = (teamTasksData || []).filter(t => t.assigned_to === u.id);
    const overdue = uTasks.filter(t => new Date(t.due_at) < now).length;
    return {
      user: u,
      open: uTasks.length,
      overdue
    };
  });

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  const formatStage = (s: string) => s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const pipelineMax = Math.max(...Object.values(pipelineCounts), 1);

  return (
    <div className="flex flex-col h-full max-w-6xl pb-10 gap-8">
      {/* Row 1: Header + Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Welcome back — here&apos;s what needs your attention.
          </p>
        </div>
        <PeriodSelector />
      </div>

      {/* Row 2: Needs Attention Chips */}
      <div className="flex flex-wrap gap-3">
        {(overdueInvoices || 0) > 0 && (
          <Link href="/invoices" className="flex items-center gap-2 px-3 py-1.5 bg-danger-50 text-danger-700 border border-danger-200 rounded-full text-sm font-medium hover:bg-danger-100 transition-colors">
            <AlertCircle size={16} />
            {overdueInvoices} Overdue Invoices
          </Link>
        )}
        {(overdueTasks || 0) > 0 && (
          <Link href="/tasks" className="flex items-center gap-2 px-3 py-1.5 bg-warning-50 text-warning-700 border border-warning-200 rounded-full text-sm font-medium hover:bg-warning-100 transition-colors">
            <AlertTriangle size={16} />
            {overdueTasks} Overdue Tasks
          </Link>
        )}
        {(followupsToday || 0) > 0 && (
          <Link href="/leads" className="flex items-center gap-2 px-3 py-1.5 bg-accent-50 text-accent-700 border border-accent-200 rounded-full text-sm font-medium hover:bg-accent-100 transition-colors">
            <Clock size={16} />
            {followupsToday} Follow-ups Today
          </Link>
        )}
        {(staleLeads || 0) > 0 && (
          <Link href="/leads" className="flex items-center gap-2 px-3 py-1.5 bg-neutral-100 text-neutral-700 border border-neutral-200 rounded-full text-sm font-medium hover:bg-neutral-200 transition-colors">
            <LayoutDashboard size={16} />
            {staleLeads} Stale Leads
          </Link>
        )}
        {((overdueInvoices || 0) === 0 && (overdueTasks || 0) === 0 && (followupsToday || 0) === 0 && (staleLeads || 0) === 0) && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-success-50 text-success-700 border border-success-200 rounded-full text-sm font-medium">
            <CheckCircle2 size={16} />
            All caught up!
          </div>
        )}
      </div>

      {/* Row 3: KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Cash Collected</span>
            <DollarSign size={16} className="text-success-500" />
          </div>
          <div className="text-2xl font-semibold text-neutral-900">{formatCurrency(cashCurrent)}</div>
          <div className={`text-xs mt-1 ${cashTrend >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {cashTrend > 0 ? '+' : ''}{cashTrend.toFixed(1)}% vs prev period
          </div>
        </div>

        <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Outstanding</span>
            <AlertCircle size={16} className="text-danger-500" />
          </div>
          <div className="text-2xl font-semibold text-neutral-900">{formatCurrency(outstanding)}</div>
          <div className="text-xs mt-1 text-neutral-500">Unpaid invoices</div>
        </div>

        <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">MRR</span>
            <TrendingUp size={16} className="text-accent-500" />
          </div>
          <div className="text-2xl font-semibold text-neutral-900">{formatCurrency(mrr)}</div>
          <div className="text-xs mt-1 text-neutral-500">Monthly recurring</div>
        </div>

        <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Open Pipeline</span>
            <Target size={16} className="text-primary-500" />
          </div>
          <div className="text-2xl font-semibold text-neutral-900">{formatCurrency(openPipelineVal)}</div>
          <div className="text-xs mt-1 text-neutral-500">Active deal value</div>
        </div>
      </div>

      {/* Row 4: Focus & Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Today's Focus */}
        <div className="lg:col-span-2 bg-neutral-0 border border-neutral-100 rounded-[16px] flex flex-col">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900">Today&apos;s Focus</h2>
          </div>
          <div className="p-5 flex flex-col gap-4">
            {(!focusTasksData?.length && !focusLeadsData?.length) && (
              <div className="text-sm text-neutral-500 py-4">Nothing scheduled for today.</div>
            )}
            
            {focusTasksData && focusTasksData.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase text-neutral-400 mb-3">Tasks</h3>
                <div className="space-y-3">
                  {focusTasksData.map((t: any) => {
                    const isOverdue = new Date(t.due_at) < now;
                    return (
                      <div key={t.id} className="flex items-start gap-3">
                        <div className="mt-0.5"><CheckCircle2 size={16} className="text-neutral-300" /></div>
                        <div>
                          <p className="text-sm font-medium text-neutral-900">{t.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isOverdue ? 'bg-danger-50 text-danger-700' : 'bg-neutral-100 text-neutral-600'}`}>
                              {isOverdue ? 'Overdue' : 'Today'}
                            </span>
                            {t.leads?.contacts?.full_name && (
                              <span className="text-xs text-neutral-500">{t.leads.contacts.full_name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {focusLeadsData && focusLeadsData.length > 0 && (
              <div className={focusTasksData?.length ? 'pt-4 border-t border-neutral-100' : ''}>
                <h3 className="text-xs font-bold uppercase text-neutral-400 mb-3">Lead Follow-ups</h3>
                <div className="space-y-3">
                  {focusLeadsData.map((l: any) => (
                    <div key={l.id} className="flex items-start gap-3">
                      <div className="mt-0.5"><Activity size={16} className="text-accent-400" /></div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{l.contacts?.full_name || 'Unknown Contact'}</p>
                        <p className="text-xs text-neutral-500 mt-1">{l.company_name} • {formatCurrency(l.deal_value)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pipeline Distribution */}
        <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] flex flex-col">
          <div className="px-5 py-4 border-b border-neutral-100">
            <h2 className="text-base font-semibold text-neutral-900">Pipeline</h2>
          </div>
          <div className="p-5 flex-1 flex items-end gap-2 h-48">
            {activeStages.map((stage) => {
              const count = pipelineCounts[stage.name] || 0;
              const height = `${(count / pipelineMax) * 100}%`;
              return (
                <div key={stage.name} className="flex-1 flex flex-col justify-end items-center group relative h-full">
                  <div className="text-xs text-neutral-400 font-medium mb-2">{count}</div>
                  <div 
                    className="w-full bg-accent-200 group-hover:bg-accent-400 rounded-[4px] transition-all"
                    style={{ height: count > 0 ? height : '4px' }}
                  ></div>
                  <div className="text-[10px] text-neutral-500 mt-2 truncate w-full text-center capitalize">
                    {formatStage(stage.name)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Row 5: Team Pulse */}
      <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] flex flex-col">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900">Team Pulse</h2>
          <span className="text-xs text-neutral-500">Task load</span>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {teamPulse.length === 0 && <div className="text-sm text-neutral-500">No team data.</div>}
          {teamPulse.map(member => (
            <div key={member.user.id} className="flex items-center gap-3 p-3 rounded-[12px] border border-neutral-100 bg-neutral-50/50">
              <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center shrink-0 overflow-hidden">
                {member.user.avatar_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={member.user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Users size={16} className="text-neutral-500" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900 truncate max-w-[120px]">{member.user.full_name || member.user.email || 'Team Member'}</p>
                <div className="flex gap-2 text-xs mt-0.5">
                  <span className="text-neutral-500">{member.open} open</span>
                  {member.overdue > 0 && <span className="text-danger-600 font-medium">{member.overdue} overdue</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
}
