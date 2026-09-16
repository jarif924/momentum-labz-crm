const fs = require('fs');
let code = fs.readFileSync('src/app/(app)/page.tsx', 'utf8');

// Add revenue stats to state
code = code.replace(
  `services: {} as Record<string, number>
  });`,
  `services: {} as Record<string, number>,
    mrrUSD: 0,
    mrrBDT: 0,
    oneTimeUSD: 0,
    oneTimeBDT: 0
  });`
);

// Fetch invoices
code = code.replace(
  `{ data: activitiesData }
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
      ]) as any;`,
  `{ data: activitiesData },
        { data: invoicesData }
      ] = await Promise.all([
        supabase.from('leads').select('stage, region, service_line, deal_value, currency'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('completed', false),
        supabase.from('tasks').select('*, leads(contacts(full_name))')
          .eq('completed', false)
          .order('due_at', { ascending: true })
          .limit(10), 
        supabase.from('activities').select('*, leads(contacts(full_name))')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('invoices').select('amount, currency, type, status').eq('status', 'paid')
      ]) as any;`
);

// Calculate revenue
code = code.replace(
  `setStats({
          totalLeads,
          openTasks: tasksCount || 0,
          wonValue: totalWon,
          currency,
          pipeline,
          bd,
          intl,
          services
        });`,
  `
        let mrrUSD = 0;
        let mrrBDT = 0;
        let oneTimeUSD = 0;
        let oneTimeBDT = 0;
        
        if (invoicesData) {
          invoicesData.forEach((inv: any) => {
            if (inv.type === 'recurring') {
              if (inv.currency === 'USD' || inv.currency === 'AUD') mrrUSD += Number(inv.amount);
              else if (inv.currency === 'BDT') mrrBDT += Number(inv.amount);
            } else if (inv.type === 'one-time') {
              if (inv.currency === 'USD' || inv.currency === 'AUD') oneTimeUSD += Number(inv.amount);
              else if (inv.currency === 'BDT') oneTimeBDT += Number(inv.amount);
            }
          });
        }

        setStats({
          totalLeads,
          openTasks: tasksCount || 0,
          wonValue: totalWon,
          currency,
          pipeline,
          bd,
          intl,
          services,
          mrrUSD,
          mrrBDT,
          oneTimeUSD,
          oneTimeBDT
        });`
);

// Add DollarSign icon to import
if (!code.includes('DollarSign')) {
  code = code.replace(`TrendingUp, Calendar, Activity, BarChart, PieChart, Globe`, `TrendingUp, Calendar, Activity, BarChart, PieChart, Globe, DollarSign, Repeat`);
}

// Render Revenue Widget before the main grid
const revenueWidget = `
          {/* Revenue Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] p-6 flex flex-col justify-between h-32">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent-50 text-accent-600 flex items-center justify-center shrink-0">
                  <Repeat size={16} />
                </div>
                <h3 className="text-sm font-semibold text-neutral-900">Monthly Recurring Revenue (MRR)</h3>
              </div>
              <div className="flex gap-8">
                <div>
                  <p className="text-2xl font-semibold text-neutral-900 tabular-nums">${"$"}{stats.mrrUSD.toLocaleString()}</p>
                  <p className="text-xs text-neutral-500 uppercase font-semibold mt-1">USD/AUD</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-neutral-900 tabular-nums">৳{stats.mrrBDT.toLocaleString()}</p>
                  <p className="text-xs text-neutral-500 uppercase font-semibold mt-1">BDT</p>
                </div>
              </div>
            </div>
            
            <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] p-6 flex flex-col justify-between h-32">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-success-bg text-success-text flex items-center justify-center shrink-0">
                  <DollarSign size={16} />
                </div>
                <h3 className="text-sm font-semibold text-neutral-900">Total Revenue (One-Time)</h3>
              </div>
              <div className="flex gap-8">
                <div>
                  <p className="text-2xl font-semibold text-neutral-900 tabular-nums">${"$"}{stats.oneTimeUSD.toLocaleString()}</p>
                  <p className="text-xs text-neutral-500 uppercase font-semibold mt-1">USD/AUD</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-neutral-900 tabular-nums">৳{stats.oneTimeBDT.toLocaleString()}</p>
                  <p className="text-xs text-neutral-500 uppercase font-semibold mt-1">BDT</p>
                </div>
              </div>
            </div>
          </div>
`;

code = code.replace(
  `<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">`,
  revenueWidget + `\n          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">`
);

fs.writeFileSync('src/app/(app)/page.tsx', code);
