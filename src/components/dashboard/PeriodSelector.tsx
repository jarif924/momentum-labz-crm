'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export function PeriodSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const period = searchParams.get('period') || 'this_month';

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', e.target.value);
    router.push(`/?${params.toString()}`);
  };

  return (
    <select
      value={period}
      onChange={handleChange}
      className="h-10 px-3 bg-neutral-0 border border-neutral-200 rounded-[8px] text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
    >
      <option value="this_month">This month</option>
      <option value="last_month">Last month</option>
      <option value="this_quarter">This quarter</option>
      <option value="this_year">This year</option>
    </select>
  );
}
