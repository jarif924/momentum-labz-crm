import {execFileSync} from 'node:child_process';
export function localEnv(){
 const raw=execFileSync('npx',['supabase','status','-o','env'],{encoding:'utf8'});
 const env=Object.fromEntries(raw.split('\n').map(l=>l.match(/^([A-Z_]+)="(.*)"$/)).filter(Boolean).map(m=>[m[1],m[2]]));
 if(env.API_URL!=='http://127.0.0.1:55321')throw Error('Refusing to run local checks against a non-local database');
 return env;
}
