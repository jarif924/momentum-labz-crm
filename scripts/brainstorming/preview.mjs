import {spawn,spawnSync} from 'node:child_process';
import {localEnv} from './local-env.mjs';
const vars=localEnv();
const env={...process.env,NEXT_PUBLIC_SUPABASE_URL:vars.API_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY:vars.ANON_KEY,SUPABASE_SERVICE_ROLE_KEY:vars.SERVICE_ROLE_KEY,NEXT_PUBLIC_BYPASS_AUTH:'false',NEXT_DIST_DIR:'.next-brainstorm-preview',CRM_LOCAL_QA:'true'};
if(!process.argv.includes('--skip-build')){
 const result=spawnSync('node',['node_modules/next/dist/bin/next','build'],{stdio:'inherit',env});
 if(result.status!==0)process.exit(result.status||1);
}
const child=spawn('node',['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3002'],{stdio:'inherit',env});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code||0));
