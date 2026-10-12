import {spawn,execFileSync} from 'node:child_process';
const raw=execFileSync('npx',['supabase','status','-o','env'],{encoding:'utf8'});
const vars=Object.fromEntries(raw.split('\n').map(l=>l.match(/^([A-Z_]+)="(.*)"$/)).filter(Boolean).map(m=>[m[1],m[2]]));
if(!vars.API_URL?.startsWith('http://127.0.0.1:55321'))throw Error('Expected the isolated local CRM Supabase instance on 55321');
const child=spawn('node',['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3002'],{stdio:'inherit',env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:vars.API_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY:vars.ANON_KEY,SUPABASE_SERVICE_ROLE_KEY:vars.SERVICE_ROLE_KEY,NEXT_PUBLIC_BYPASS_AUTH:'false',NEXT_DIST_DIR:'.next-brainstorm'}});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code||0));
