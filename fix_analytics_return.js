const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/analytics/page.tsx', 'utf8');

const regex = /return \{\s*stats: \{ total, won, lost, active, winRate, avgVelocity \},\s*sourceData: sData,\s*funnelData: stages\.map\(s => \(\{ name: s\.name, count: funnel\[s\.name\] \|\| 0 \}\)\)\s*\}/;

const replacement = `return {
      stats: { total, won, lost, active, winRate, avgVelocity },
      sourceData: sData,
      funnelData: stages.map((s: any) => ({ name: s.name, count: funnel[s.name] || 0 })),
      lostReasonsData: Object.entries(lostReasons).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
    }`;

content = content.replace(regex, replacement);

fs.writeFileSync('src/app/(app)/analytics/page.tsx', content);
console.log('Fixed analytics return');
