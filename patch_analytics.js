const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/analytics/page.tsx', 'utf8');

// 1. Add lostReasons tracking
const useMemoStart = `const { stats, sourceData, funnelData } = useMemo(() => {`;
const useMemoNew = `const { stats, sourceData, funnelData, lostReasonsData } = useMemo(() => {`;
content = content.replace(useMemoStart, useMemoNew);

const funnelTracking = `    // Funnel tracking
    const funnel: Record<string, number> = {}
    stages.forEach((s: any) => funnel[s.name] = 0)`;
const funnelNew = `    // Funnel tracking
    const funnel: Record<string, number> = {}
    stages.forEach((s: any) => funnel[s.name] = 0)

    // Lost Reasons tracking
    const lostReasons: Record<string, number> = {}`;
content = content.replace(funnelTracking, funnelNew);

const leadLoop = `      // Sources (prefer UTM, fallback to source)`;
const leadLoopNew = `      // Lost Reason
      const stageObj = stages.find((s: any) => s.name === l.stage);
      if (stageObj && stageObj.is_lost && l.lost_reason) {
        lostReasons[l.lost_reason] = (lostReasons[l.lost_reason] || 0) + 1;
      }

      // Sources (prefer UTM, fallback to source)`;
content = content.replace(leadLoop, leadLoopNew);

const returnObj = `    return {
      stats: {
        total,
        won,
        lost,
        active,
        winRate: total > 0 ? (won / (won + lost) * 100).toFixed(1) : '0.0',
        avgVelocity: won > 0 ? Math.round(totalVelocityDays / won) : 0
      },
      sourceData: Object.entries(sources)
        .map(([name, data]) => ({ name, count: data.total, won: data.won }))
        .sort((a, b) => b.count - a.count),
      funnelData: Object.entries(funnel).map(([name, count]) => ({ name, count }))
    }
  }, [leads, stages])`;

const returnObjNew = `    return {
      stats: {
        total,
        won,
        lost,
        active,
        winRate: total > 0 && (won + lost) > 0 ? (won / (won + lost) * 100).toFixed(1) : '0.0',
        avgVelocity: won > 0 ? Math.round(totalVelocityDays / won) : 0
      },
      sourceData: Object.entries(sources)
        .map(([name, data]) => ({ name, count: data.total, won: data.won }))
        .sort((a, b) => b.count - a.count),
      funnelData: Object.entries(funnel).map(([name, count]) => ({ name, count })),
      lostReasonsData: Object.entries(lostReasons).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
    }
  }, [leads, stages])`;
content = content.replace(returnObj, returnObjNew);

const pipelineFunnel = `{/* Pipeline Funnel */}`;
const newGrid = `
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
                        <div className="h-6 bg-neutral-100 rounded-md" style={{ width: \`\${Math.max(pct, 1)}%\` }}>
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
                          <div className="h-6 bg-danger-50 rounded-md" style={{ width: \`\${Math.max(pct, 1)}%\` }}>
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

        {/* --- End replacement block --- */}`;

const replaceFunnelRegex = /\{\/\* Pipeline Funnel \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
content = content.replace(replaceFunnelRegex, newGrid);

fs.writeFileSync('src/app/(app)/analytics/page.tsx', content);
console.log('Analytics patched');
