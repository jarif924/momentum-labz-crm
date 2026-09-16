/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'
import { TrendingUp, Users, Target, Clock } from 'lucide-react'

function StatCard({ label, value, sub, icon: Icon, accent }: any) {
  return (
    <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-neutral-400">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon size={16} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-semibold text-neutral-900 tabular-nums">{value}</p>
        {sub && <p className="text-xs text-neutral-500 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<any[]>([])
  const [stages, setStages] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const [leadRes, stageRes] = await Promise.all([
        supabase.from('leads').select('*'),
        supabase.from('pipeline_stages').select('*').order('sort_order')
      ])
      if (leadRes.data) setLeads(leadRes.data)
      if (stageRes.data) setStages(stageRes.data)
      setLoading(false)
    }
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { stats, sourceData, funnelData, lostReasonsData } = useMemo(() => {
    const total = leads.length
    let won = 0, lost = 0, active = 0
    let totalVelocityDays = 0

    // Sources tracking
    const sources: Record<string, { total: number, won: number }> = {}

    // Funnel tracking
    const funnel: Record<string, number> = {}
    stages.forEach((s: any) => funnel[s.name] = 0)

    // Lost Reasons tracking
    const lostReasons: Record<string, number> = {}

    leads.forEach((l: any) => {
      // Funnel
      if (funnel[l.stage] !== undefined) funnel[l.stage]++

      // Lost Reason
      const stageObj = stages.find((s: any) => s.name === l.stage);
      if (stageObj && stageObj.is_lost && l.lost_reason) {
        lostReasons[l.lost_reason] = (lostReasons[l.lost_reason] || 0) + 1;
      }

      // Sources (prefer UTM, fallback to source)
      const s = l.utm_source || l.source || 'direct'
      if (!sources[s]) sources[s] = { total: 0, won: 0 }
      sources[s].total++

      // Stage logic
      const isWon = stages.find(st => st.name === l.stage)?.is_won
      const isLost = stages.find(st => st.name === l.stage)?.is_lost

      if (isWon) {
        won++
        sources[s].won++
        const created = new Date(l.created_at).getTime()
        const updated = new Date(l.updated_at).getTime()
        const diffDays = (updated - created) / (1000 * 3600 * 24)
        if (diffDays > 0) totalVelocityDays += diffDays
      } else if (isLost) {
        lost++
      } else {
        active++
      }
    })

    const winRate = total > 0 ? Math.round((won / (won + lost)) * 100) || 0 : 0
    const avgVelocity = won > 0 ? Math.round(totalVelocityDays / won) : 0

    const sData = Object.keys(sources).map(key => ({
      name: key,
      total: sources[key].total,
      won: sources[key].won,
      rate: sources[key].total > 0 ? Math.round((sources[key].won / sources[key].total) * 100) : 0
    })).sort((a, b) => b.total - a.total).slice(0, 5) // Top 5 sources

    return {
      stats: { total, won, lost, active, winRate, avgVelocity },
      sourceData: sData,
      funnelData: stages.map((s: any) => ({ name: s.name, count: funnel[s.name] || 0 })),
      lostReasonsData: Object.entries(lostReasons).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
    }
  }, [leads, stages])

  if (loading) return <div className="p-8 text-center text-neutral-500 text-sm animate-pulse">Loading analytics...</div>

  return (
    <div className="flex flex-col max-w-6xl gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Analytics & Attribution</h1>
        <p className="text-sm text-neutral-500 mt-1">Measure win rates, channel ROI, and pipeline velocity.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Win Rate"
          value={`${stats.winRate}%`}
          sub={`${stats.won} won vs ${stats.lost} lost`}
          icon={Target}
          accent="bg-success-50 text-success-600"
        />
        <StatCard
          label="Avg Deal Velocity"
          value={`${stats.avgVelocity} Days`}
          sub="From lead to won"
          icon={Clock}
          accent="bg-accent-50 text-accent-600"
        />
        <StatCard
          label="Active Pipeline"
          value={stats.active}
          sub="Leads currently in progress"
          icon={TrendingUp}
          accent="bg-warning-50 text-warning-600"
        />
        <StatCard
          label="Total Leads"
          value={stats.total}
          sub="All time captured"
          icon={Users}
          accent="bg-neutral-100 text-neutral-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Channels */}
        <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100">
            <h2 className="text-sm font-semibold text-neutral-900">Top Acquisition Channels</h2>
          </div>
          <div className="p-5 space-y-5">
            {sourceData.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-4">No source data yet.</p>
            ) : (
              sourceData.map(s => (
                <div key={s.name}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-neutral-900 capitalize">{s.name.replace(/_/g, ' ')}</span>
                    <span className="text-neutral-500">{s.won} won / {s.total} leads ({s.rate}%)</span>
                  </div>
                  <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-accent-500 rounded-full" style={{ width: `${Math.max(s.rate, 2)}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        
        {/* Pipeline Funnel & Lost Reasons Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pipeline Funnel */}
          <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100">
              <h2 className="text-sm font-semibold text-neutral-900">Pipeline Distribution</h2>
            </div>
            <div className="p-5">
              <div className="flex flex-col gap-2">
                {funnelData.map((f) => {
                  const max = Math.max(...funnelData.map(d => d.count), 1)
                  const pct = (f.count / max) * 100
                  return (
                    <div key={f.name} className="flex items-center gap-3">
                      <div className="w-32 text-xs text-neutral-600 text-right truncate">{f.name}</div>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="h-6 bg-neutral-100 rounded-md" style={{ width: `${Math.max(pct, 1)}%` }}>
                          {f.count > 0 && <div className="h-full bg-neutral-800 rounded-md opacity-20" />}
                        </div>
                        <span className="text-xs font-semibold tabular-nums text-neutral-700">{f.count}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Lost Reasons */}
          <div className="bg-neutral-0 border border-neutral-100 rounded-[16px] overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-neutral-900">Lost Reason Breakdown</h2>
            </div>
            <div className="p-5">
              {lostReasonsData.length === 0 ? (
                <div className="text-sm text-neutral-500 italic py-4 text-center">No lost reasons recorded yet.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {lostReasonsData.map((f) => {
                    const max = Math.max(...lostReasonsData.map(d => d.count), 1)
                    const pct = (f.count / max) * 100
                    return (
                      <div key={f.name} className="flex items-center gap-3">
                        <div className="w-32 text-xs text-neutral-600 text-right truncate">{f.name}</div>
                        <div className="flex-1 flex items-center gap-2">
                          <div className="h-6 bg-danger-50 rounded-md" style={{ width: `${Math.max(pct, 1)}%` }}>
                            {f.count > 0 && <div className="h-full bg-danger-500 rounded-md opacity-50" />}
                          </div>
                          <span className="text-xs font-semibold tabular-nums text-danger-700">{f.count}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- End replacement block --- */}
      </div>
    </div>
  )
}
