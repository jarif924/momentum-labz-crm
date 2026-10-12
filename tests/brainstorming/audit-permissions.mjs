import assert from 'node:assert/strict';
import {expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {launch,api,admin,env,base,password} from './helpers.mjs';
const results=[]; const check=async(name,fn)=>{try{await fn();results.push({name,pass:true});console.log('PASS',name);}catch(e){results.push({name,pass:false,error:e.message});console.error('FAIL',name,e.message);}};
const clients={};for(const name of ['owner','admin','editor','teammate','viewer','outsider'])clients[name]=await api(name);
const ids=Object.fromEntries(await Promise.all(Object.entries(clients).map(async([name,c])=>[name,(await c.auth.getUser()).data.user.id])));
const anon=createClient(env.API_URL,env.ANON_KEY,{auth:{persistSession:false}});
const doc=[{id:randomUUID(),type:'paragraph',content:[{type:'text',text:'Audit3 team body',styles:{}}],children:[]}];
async function ok(p){const r=await p;if(r.error)throw Error(r.error.message);return r.data;}
async function denied(p){const r=await p;assert.ok(r.error,'Expected permission rejection');return r.error;}
async function invisible(c,t,id){const r=await c.from(t).select('*').eq('id',id);assert.ok(r.error||r.data.length===0,'Protected row leaked');}
const team=await ok(clients.editor.rpc('bn_create',{p_title:'Audit3 team '+Date.now(),p_document:doc,p_visibility:'team'}));
const priv=await ok(clients.editor.rpc('bn_create',{p_title:'Audit3 private '+Date.now(),p_document:doc,p_visibility:'private'}));
const token=randomUUID();
await check('One writer, even a second session of same user, and stale save rejection',async()=>{
 await ok(clients.editor.rpc('bn_lock',{p_note:team.id,p_token:token}));
 await denied(clients.teammate.rpc('bn_lock',{p_note:team.id,p_token:randomUUID()}));
 await denied(clients.editor.rpc('bn_lock',{p_note:team.id,p_token:randomUUID()}));
 await denied(clients.owner.rpc('bn_save',{p_note:team.id,p_token:token,p_version:team.version,p_patch:{title:'Bypass'}}));
 const saved=await ok(clients.editor.rpc('bn_save',{p_note:team.id,p_token:token,p_version:team.version,p_patch:{title:team.title+' saved'}}));
 await denied(clients.editor.rpc('bn_save',{p_note:team.id,p_token:token,p_version:team.version,p_patch:{title:'STALE'}}));
 assert.equal(saved.version,team.version+1);
});
await check('Expired writer lock allows another writer, old token cannot save',async()=>{
 await ok(admin.from('brainstorm_locks').update({expires_at:new Date(Date.now()-1000).toISOString()}).eq('note_id',team.id));
 const next=randomUUID();await ok(clients.teammate.rpc('bn_lock',{p_note:team.id,p_token:next}));
 await denied(clients.editor.rpc('bn_save',{p_note:team.id,p_token:token,p_version:2,p_patch:{title:'Expired'}}));
 await ok(clients.teammate.rpc('bn_lock',{p_note:team.id,p_token:next,p_release:true}));
});
await check('Private creator only: owners admins sales viewer outsider and anon cannot read or mutate',async()=>{
 for(const name of ['owner','admin','teammate','viewer','outsider']){
  await invisible(clients[name],'brainstorm_notes',priv.id);
  await denied(clients[name].rpc('bn_lock',{p_note:priv.id,p_token:randomUUID()}));
  await denied(clients[name].rpc('bn_comment',{p_note:priv.id,p_body:'Bypass'}));
 }
 await invisible(anon,'brainstorm_notes',priv.id);
 assert.equal((await ok(clients.editor.from('brainstorm_notes').select('id').eq('id',priv.id))).length,1);
});
await check('Viewer reads and comments, cannot create/edit/lock/trash; outsider and anonymous blocked',async()=>{
 assert.equal((await ok(clients.viewer.from('brainstorm_notes').select('id').eq('id',team.id))).length,1);
 await ok(clients.viewer.rpc('bn_comment',{p_note:team.id,p_body:'Viewer API comment'}));
 for(const c of [clients.viewer,clients.outsider,anon]){
  await denied(c.rpc('bn_create',{p_title:'Bypass',p_document:doc}));
  await denied(c.rpc('bn_lock',{p_note:team.id,p_token:randomUUID()}));
  await denied(c.rpc('bn_manage',{p_note:team.id,p_action:'trash',p_version:2}));
 }
 await invisible(clients.outsider,'brainstorm_notes',team.id);await invisible(anon,'brainstorm_notes',team.id);
 await denied(clients.outsider.rpc('bn_comment',{p_note:team.id,p_body:'Bypass'}));await denied(anon.rpc('bn_comment',{p_note:team.id,p_body:'Bypass'}));
});
let comment;
await check('Comments replies edit ownership admin moderation and resolve/reopen',async()=>{
 comment=await ok(clients.editor.rpc('bn_comment',{p_note:team.id,p_body:'Audit3 mention @Local viewer',p_mentions:[ids.viewer]}));
 const reply=await ok(clients.viewer.rpc('bn_comment',{p_note:team.id,p_body:'Audit3 reply',p_parent:comment.id}));assert.equal(reply.parent_id,comment.id);
 await denied(clients.teammate.rpc('bn_comment',{p_note:team.id,p_body:'Unauthorized edit',p_id:comment.id}));
 await denied(clients.teammate.rpc('bn_comment',{p_note:team.id,p_body:'',p_id:comment.id,p_action:'delete'}));
 await ok(clients.editor.rpc('bn_comment',{p_note:team.id,p_body:'Edited own comment',p_id:comment.id}));
 assert.equal((await ok(clients.viewer.rpc('bn_comment',{p_note:team.id,p_body:'',p_id:comment.id,p_action:'resolve'}))).resolved,true);
 assert.equal((await ok(clients.viewer.rpc('bn_comment',{p_note:team.id,p_body:'',p_id:comment.id,p_action:'reopen'}))).resolved,false);
 await ok(clients.admin.rpc('bn_comment',{p_note:team.id,p_body:'Admin moderated',p_id:comment.id}));
 await ok(clients.admin.rpc('bn_comment',{p_note:team.id,p_body:'',p_id:reply.id,p_action:'delete'}));
 await denied(clients.editor.from('brainstorm_comments').update({author_id:ids.owner}).eq('id',comment.id));
});
await check('Mention recipient notification deep link and no leakage; private mentions skip unauthorized recipients',async()=>{
 const notification=await ok(clients.viewer.from('notifications').select('*').eq('brainstorm_note_id',team.id).eq('user_id',ids.viewer));assert.ok(notification.length);assert.ok(notification[0].link.includes('&comment='+comment.id));
 const other=await ok(clients.teammate.from('notifications').select('*').eq('id',notification[0].id));assert.equal(other.length,0);
 await ok(clients.viewer.from('notifications').update({is_read:true}).eq('id',notification[0].id));
 await denied(clients.viewer.from('notifications').update({message:'Forged',user_id:ids.teammate}).eq('id',notification[0].id));
 await denied(clients.viewer.from('notifications').insert({title:'Spoof',user_id:ids.owner}));
 await ok(clients.editor.rpc('bn_comment',{p_note:priv.id,p_body:'Private mention',p_mentions:[ids.owner,ids.viewer]}));
 const privateNotifications=await ok(admin.from('notifications').select('id').eq('brainstorm_note_id',priv.id));assert.equal(privateNotifications.length,0);
});
await check('No self role elevation or unauthorized direct note/lock/history mutation',async()=>{
 await denied(clients.viewer.from('users').update({role:'owner'}).eq('id',ids.viewer));
 await denied(clients.outsider.from('users').insert({id:ids.outsider,role:'owner',email:'outsider@brainstorm.local'}));
 await denied(clients.editor.from('brainstorm_notes').update({visibility:'team'}).eq('id',priv.id));
 await denied(clients.editor.from('brainstorm_locks').delete().eq('note_id',team.id));
 await denied(clients.editor.from('brainstorm_versions').insert({note_id:team.id,title:'spoof',document:doc,content:'spoof',version:1}));
 await denied(clients.teammate.rpc('bn_save',{p_note:priv.id,p_token:randomUUID(),p_version:1,p_patch:{visibility:'team'}}));
});
const privateToken=randomUUID();await ok(clients.editor.rpc('bn_lock',{p_note:priv.id,p_token:privateToken}));
let imagePath=priv.id+'/'+randomUUID()+'.png';const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=','base64');
await check('Private image protected through download/public URL/signed URL; only locked editor uploads',async()=>{
 await ok(clients.editor.storage.from('brainstorm-images').upload(imagePath,png,{contentType:'image/png'}));
 assert.ok((await ok(clients.editor.storage.from('brainstorm-images').download(imagePath))).size>0);
 for(const c of [clients.owner,clients.admin,clients.viewer,clients.outsider,anon]){
  await denied(c.storage.from('brainstorm-images').download(imagePath));await denied(c.storage.from('brainstorm-images').createSignedUrl(imagePath,60));
  await denied(c.storage.from('brainstorm-images').upload(priv.id+'/'+randomUUID()+'.png',png,{contentType:'image/png'}));
 }
 const r=await fetch(env.API_URL+'/storage/v1/object/public/brainstorm-images/'+imagePath);assert.ok(!r.ok,'Public image leaked');
});
await check('Private task creator only, including other admins and after note permanent deletion',async()=>{
 const tid=await ok(clients.editor.rpc('bn_task',{p_note:priv.id,p_title:'Audit3 private task',p_assignee:ids.editor,p_due:new Date(Date.now()+86400000).toISOString()}));
 for(const name of ['owner','admin','teammate','viewer','outsider'])await invisible(clients[name],'tasks',tid);
 await denied(clients.editor.rpc('bn_task',{p_note:priv.id,p_title:'Wrong assignee',p_assignee:ids.viewer,p_due:new Date().toISOString()}));
 assert.equal((await ok(clients.editor.from('tasks').select('id').eq('id',tid))).length,1);
 // Creator is regular sales: no permanent-delete privileges.
 const trashed=await ok(clients.editor.rpc('bn_manage',{p_note:priv.id,p_action:'trash',p_version:1}));
 await denied(clients.editor.rpc('bn_manage',{p_note:priv.id,p_action:'delete',p_version:trashed.version}));
 await ok(clients.editor.rpc('bn_manage',{p_note:priv.id,p_action:'restore_trash',p_version:trashed.version}));
 // Simulate authorized deletion by service role because private note cannot be read by another admin.
 await ok(admin.from('brainstorm_notes').delete().eq('id',priv.id));
 for(const name of ['owner','admin','teammate','viewer','outsider'])await invisible(clients[name],'tasks',tid);
});
async function login(browser,name){
 console.log('Browser login',name);const context=await browser.newContext();const page=await context.newPage();page.setDefaultTimeout(90000);page.setDefaultNavigationTimeout(90000);
 await page.goto(base+'/login',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>{const e=document.querySelector('#email');return e&&Object.keys(e).some(k=>k.startsWith('__reactProps$'));});await page.getByLabel('Email address').fill(name+'@brainstorm.local');await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(base+'/',{waitUntil:'domcontentloaded'});await page.goto(base+'/brainstorming',{waitUntil:'domcontentloaded'});if(name==='outsider')await page.getByText('Your account is not a CRM team member.').waitFor();else await page.getByLabel('Search notes').waitFor();return {context,page};
}
const browser=await launch();
let editorUI,viewerUI,teammateUI;
await check('Browser: two writers lock, viewer read-only and comment UI, replies resolution and mention UI',async()=>{
 editorUI=await login(browser,'editor'); viewerUI=await login(browser,'viewer');teammateUI=await login(browser,'teammate');
 for(const ui of [editorUI,viewerUI,teammateUI]){await ui.page.goto(base+'/brainstorming?note='+team.id);console.log('Opened note context');}
 await editorUI.page.getByLabel('Note title').waitFor(); await editorUI.page.getByLabel('Note title').waitFor({state:'visible'});
 console.log('Editor saving');await editorUI.page.getByLabel('Note title').fill(team.title+' browser');await editorUI.page.getByRole('button',{name:'Save',exact:true}).click();
 await teammateUI.page.getByText('is editing. You can read and comment.',{exact:false}).waitFor();
 assert.equal(await teammateUI.page.getByLabel('Note title').isEditable(),false);assert.equal(await viewerUI.page.getByLabel('Note title').isEditable(),false);
 assert.equal(await viewerUI.page.getByRole('button',{name:'New Note',exact:true}).count(),0);
 console.log('Discussion opening');await viewerUI.page.getByRole('button',{name:'Discussion',exact:true}).click();
 console.log('Mention typing');await viewerUI.page.getByLabel('Write a comment').fill('Audit3 browser viewer @');
 const members=await ok(admin.from('users').select('full_name,id').eq('id',ids.editor));
 await viewerUI.page.getByRole('listbox',{name:'Mention teammate'}).getByRole('button',{name:members[0].full_name,exact:true}).click();
 await viewerUI.page.getByRole('button',{name:'Post comment',exact:true}).click();
 await viewerUI.page.getByText('Audit3 browser viewer @'+members[0].full_name,{exact:false}).waitFor();
 console.log('Comment posted');const article=viewerUI.page.locator('article').filter({hasText:'Audit3 browser viewer @'});await article.getByRole('button',{name:'Reply',exact:true}).click();
 await viewerUI.page.getByLabel('Write a comment').fill('Audit3 browser reply');await viewerUI.page.getByRole('button',{name:'Post comment',exact:true}).click();await viewerUI.page.getByText('Audit3 browser reply',{exact:true}).waitFor();
 console.log('Reply posted resolving');await article.getByRole('button',{name:'Resolve',exact:true}).click();await viewerUI.page.getByText('Resolved discussions (1)').click();await article.getByRole('button',{name:'Reopen',exact:true}).click();await expect(article.getByRole('button',{name:'Resolve',exact:true})).toBeVisible();
 await viewerUI.page.screenshot({path:'test-results/audit3-discussion.png',fullPage:true});
});
await check('Browser: mention deep link opens discussion and addressed comment',async()=>{
 const notification=(await ok(clients.viewer.from('notifications').select('*').eq('brainstorm_note_id',team.id).eq('user_id',ids.viewer)))[0];
 await viewerUI.page.goto(base+notification.link,{waitUntil:'domcontentloaded'});
 await viewerUI.page.getByLabel('Write a comment').waitFor();await viewerUI.page.locator('#comment-'+comment.id).waitFor();
});
await check('Browser: two-minute inactivity pauses first writer and second writer can resume',async()=>{
 assert.ok(editorUI&&teammateUI,'Browser sessions unavailable');
 await editorUI.page.clock.install();await editorUI.page.clock.fastForward(130000);
 await expect(editorUI.page.getByLabel('Note title')).not.toBeEditable({timeout:15000});
 await teammateUI.page.getByRole('button',{name:'Resume editing',exact:true}).click();
 await teammateUI.page.getByLabel('Note title').fill(team.title+' after inactivity');
 await teammateUI.page.getByRole('button',{name:'Save',exact:true}).click();
 await teammateUI.page.getByRole('status').filter({hasText:'Saved'}).waitFor();
 await editorUI.page.clock.resume();
});
await check('Browser: private note hidden from other admin, outsider and signed-out login boundary',async()=>{
 const pn=await ok(clients.editor.rpc('bn_create',{p_title:'Audit3 browser private',p_document:doc,p_visibility:'private'}));
 const a=await login(browser,'admin');await a.page.goto(base+'/brainstorming?note='+pn.id);await a.page.getByLabel('Search notes').waitFor();assert.equal(await a.page.getByLabel('Note title').count(),0);
 const out=await login(browser,'outsider');await out.page.getByText('Your account is not a CRM team member.').waitFor();
 const guest=await browser.newPage();await guest.goto(base+'/brainstorming?note='+team.id);await guest.waitForURL('**/login**');await guest.close();await a.context.close();await out.context.close();
});
await browser.close();
await fs.writeFile('BRAINSTORM_AUDIT_PERMISSIONS.md','# Brainstorming independent audit 3: collaboration and permissions\n\nLocal-only Supabase 55321 and localhost 3002. Direct API checks and independent Playwright browser contexts.\n\n'+results.map(r=>`- ${r.pass?'PASS':'FAIL'}: ${r.name}${r.error?' — '+r.error:''}`).join('\n')+'\n\nScreenshot: `test-results/audit3-discussion.png`.\n');
console.log(JSON.stringify(results));process.exitCode=results.some(r=>!r.pass)?1:0;
