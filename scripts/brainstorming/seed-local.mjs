import {createClient} from '@supabase/supabase-js';
import {localEnv} from './local-env.mjs';
const env=localEnv(),admin=createClient(env.API_URL,env.SERVICE_ROLE_KEY);
export const password='Local-Brainstorm-Only-42!';
const people=[['owner','owner'],['admin','admin'],['editor','sales'],['teammate','sales'],['viewer','viewer'],['outsider',null]];
const existing=(await admin.auth.admin.listUsers()).data.users;
for(const [name,role] of people){
 const email=`${name}@brainstorm.local`;
 let user=existing.find(u=>u.email===email);
 if(!user){const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true});if(error)throw error;user=data.user;}
 if(role){const {error}=await admin.from('users').upsert({id:user.id,email,full_name:`Audit ${name}`,role});if(error)throw error;}
}
const {data:companies}=await admin.from('companies').select('*').eq('name','Local audit company');
let company=companies?.[0];if(!company){const r=await admin.from('companies').insert({name:'Local audit company',website:'https://example.com'}).select().single();if(r.error)throw r.error;company=r.data;}
const {data:contacts}=await admin.from('contacts').select('*').eq('full_name','Local audit client');
let contact=contacts?.[0];if(!contact){const r=await admin.from('contacts').insert({company_id:company.id,full_name:'Local audit client',is_client:true}).select().single();if(r.error)throw r.error;contact=r.data;}
const {data:leads}=await admin.from('leads').select('*').eq('contact_id',contact.id);
let lead=leads?.[0];if(!lead){const r=await admin.from('leads').insert({contact_id:contact.id,company_id:company.id,services:[],region:'international',stage:'Prospect Found'}).select().single();if(r.error)throw r.error;lead=r.data;}
const {data:projects}=await admin.from('projects').select('*').eq('name','Local audit project');
if(!projects?.length){const r=await admin.from('projects').insert({company_id:company.id,lead_id:lead.id,name:'Local audit project'});if(r.error)throw r.error;}
console.log('Local-only test users and CRM integration fixtures ready. No remote data was changed.');
