/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button,Input } from '@/components/ui/Forms';
import { useToast } from '@/components/ui/Toast';
import { Member,Note,clearDrafts,statuses,template } from '@/lib/brainstorming/types';
import { NoteSession,SessionHandle } from '@/components/brainstorming/NoteSession';
import { Lightbulb,Plus,Pin,Lock,Search,FileText,MessageSquare,ArrowUpDown } from 'lucide-react';
import './brainstorming.css';
import { copyNoteImages } from '@/lib/brainstorming/images';
const LIMIT=25;
export default function BrainstormingPage(){
 const client=useRef(createClient()).current,toast=useToast();
 const [me,setMe]=useState<Member|null>(null),[members,setMembers]=useState<Member[]>([]),[notes,setNotes]=useState<Note[]>([]),[selected,setSelected]=useState<Note|null>(null),[tags,setTags]=useState<string[]>([]),[links,setLinks]=useState<any[]>([]),[query,setQuery]=useState(''),[search,setSearch]=useState(''),[filter,setFilter]=useState('active'),[tag,setTag]=useState(''),[sort,setSort]=useState('updated_at'),[page,setPage]=useState(0),[more,setMore]=useState(false),[loading,setLoading]=useState(true),[creating,setCreating]=useState(false),[error,setError]=useState('');
 const session=useRef<SessionHandle|null>(null),switching=useRef(false),request=useRef(0);
 useEffect(()=>{const t=setTimeout(()=>{setSearch(query);setPage(0);},300);return()=>clearTimeout(t);},[query]);
 const loadTags=useCallback(async()=>{const {data}=await client.from('brainstorm_tags').select('name').order('name');setTags((data||[]).map((t:any)=>t.name));},[client]);
 useEffect(()=>{
  async function init(){
   const {data:{user}}=await client.auth.getUser();if(!user){setError('Please sign in to use Brainstorming.');setLoading(false);return;}
   const directory=await client.from('users').select('id,full_name,role');if(directory.error){setError(directory.error.message);setLoading(false);return;}
   setMembers(directory.data||[]);const member=directory.data?.find((m:any)=>m.id===user.id);if(!member){setError('Your account is not a CRM team member.');setLoading(false);return;}setMe(member);
   await loadTags();
   const results=await Promise.all([client.from('projects').select('id,name'),client.from('leads').select('id,companies(name),contacts(full_name)'),client.from('contacts').select('id,full_name').eq('is_client',true)]);
   setLinks([...(results[0].data||[]).map((r:any)=>({id:r.id,name:r.name,kind:'project',href:'/projects/'+r.id})),...(results[1].data||[]).map((r:any)=>({id:r.id,name:r.companies?.name||r.contacts?.full_name||'Lead',kind:'lead',href:'/leads?lead='+r.id})),...(results[2].data||[]).map((r:any)=>({id:r.id,name:r.full_name,kind:'client',href:'/clients#client-'+r.id}))]);
   const id=new URLSearchParams(location.search).get('note');if(id){const {data,error:err}=await client.from('brainstorm_notes').select('*').eq('id',id).maybeSingle();if(data)setSelected(data);else if(err)setError(err.message);else setError('This note is not available to your account.');}
  }
  void init();const {data:{subscription}}=client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){clearDrafts();setSelected(null);setNotes([]);setMe(null);}});return()=>subscription.unsubscribe();
 },[client,loadTags]);
 const load=useCallback(async(showLoading=true)=>{
  if(!me)return;const id=++request.current;if(showLoading)setLoading(true);let q=client.from('brainstorm_notes').select('*');
  q=filter==='trash'?q.not('deleted_at','is',null):q.is('deleted_at',null);
  if(filter==='active')q=q.neq('status','archived');else if(filter!=='trash')q=q.eq('status',filter);
  if(tag)q=q.contains('tags',[tag]);if(search){const term=JSON.stringify('%'+search.replace(/[\\%_]/g,'\\$&')+'%');q=q.or(`title.ilike.${term},content.ilike.${term}`);}
  const {data,error:err}=await q.order('pinned',{ascending:false}).order(sort,{ascending:sort==='title'}).order('id').range(page*LIMIT,page*LIMIT+LIMIT);
  if(id!==request.current)return;setLoading(false);if(err){setError(err.message);setNotes([]);setMore(false);return;}setError('');setNotes((data||[]).slice(0,LIMIT));setMore((data||[]).length>LIMIT);
 },[client,filter,me,page,search,sort,tag]);
 useEffect(()=>{void load();},[load]);
 const saved=useCallback((n:Note)=>{setNotes(prev=>prev.map(x=>x.id===n.id?n:x));void load(false);},[load]);
 async function choose(n:Note|null){if(switching.current)return;switching.current=true;try{if(session.current&&!await session.current.flush())return;setSelected(n);session.current=null;const url=new URL(location.href);if(n)url.searchParams.set('note',n.id);else url.searchParams.delete('note');url.searchParams.delete('comment');history.replaceState(null,'',url);}finally{switching.current=false;}}
 async function create(name='Blank',copy?:Note){if(creating)return;if(session.current&&!await session.current.flush())return;setCreating(true);const {data,error:err}=copy?await client.rpc('bn_duplicate',{p_note:copy.id}):await client.rpc('bn_create',{p_title:name==='Blank'?'Untitled Note':name,p_document:template(name),p_visibility:'team'});if(err){setCreating(false);toast.error(err.message);return;}
  if(copy){const token=crypto.randomUUID();try{const lock=await client.rpc('bn_lock',{p_note:data.id,p_token:token});if(lock.error)throw lock.error;const document=await copyNoteImages(data.id,data.document);const result=await client.rpc('bn_save',{p_note:data.id,p_token:token,p_version:data.version,p_patch:{document}});if(result.error)throw result.error;Object.assign(data,result.data);}catch(e:any){await client.rpc('bn_manage',{p_note:data.id,p_action:'trash',p_version:data.version});setCreating(false);toast.error('Could not finish copying the note. The incomplete copy is in Trash. '+e.message);return;}finally{await client.rpc('bn_lock',{p_note:data.id,p_token:token,p_release:true});}}
  setCreating(false);setFilter('active');setSearch('');setQuery('');setPage(0);await load();await choose(data);}
 return <section className="brainstorming flex h-[calc(100dvh-64px)] min-h-[540px] -m-6 overflow-hidden bg-neutral-0" aria-label="Brainstorming workspace">
  <aside className={`${selected?'hidden lg:flex':'flex'} w-full lg:w-80 shrink-0 flex-col border-r border-neutral-100 bg-neutral-50 min-h-0`}>
   <div className="p-5 space-y-4 border-b border-neutral-100">
    <div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-neutral-0"><Lightbulb size={18} strokeWidth={1.75}/></span><div><h1 className="text-h2 leading-tight">Brainstorming</h1><p className="text-micro text-neutral-500">Team ideas & notes</p></div></div>
    {me?.role!=='viewer'&&me&&<div className="flex gap-2"><Button className="flex-1" disabled={creating} onClick={()=>void create()}><Plus size={16} className="mr-1"/>{creating?'Creating…':'New Note'}</Button><select aria-label="Create from template" value="" className="h-10 min-w-0 w-28 px-2 text-small rounded-md border border-neutral-200 bg-neutral-0" disabled={creating} onChange={e=>void create(e.target.value)}><option value="">Template</option>{['Quick Idea','Project Brainstorm','Meeting Notes'].map(t=><option key={t}>{t}</option>)}</select></div>}
    <div className="relative"><Search size={16} className="absolute left-3 top-3 text-neutral-400"/><Input aria-label="Search notes" className="pl-9" placeholder="Search notes…" value={query} onChange={e=>setQuery(e.target.value)}/></div>
    <div className="grid grid-cols-2 gap-2"><select aria-label="Filter status" value={filter} onChange={e=>{setFilter(e.target.value);setPage(0);}} className="h-10 min-w-0 rounded-md border border-neutral-200 bg-neutral-0 px-2 text-small"><option value="active">Active notes</option>{Object.entries(statuses).map(([v,l])=><option key={v} value={v}>{l}</option>)}<option value="trash">Trash</option></select><select aria-label="Filter tag" value={tag} onChange={e=>{setTag(e.target.value);setPage(0);}} className="h-10 min-w-0 rounded-md border border-neutral-200 bg-neutral-0 px-2 text-small"><option value="">All tags</option>{tags.map(t=><option key={t}>{t}</option>)}</select></div>
    <div className="flex items-center gap-2 text-neutral-500"><ArrowUpDown size={14}/><select aria-label="Sort notes" value={sort} onChange={e=>{setSort(e.target.value);setPage(0);}} className="flex-1 min-w-0 h-9 rounded-md border border-neutral-200 bg-neutral-0 px-2 text-small"><option value="updated_at">Last edited</option><option value="created_at">Created date</option><option value="title">Title</option></select></div>
   </div>
   {error&&<div role="alert" className="m-3 rounded-md border border-danger-text/30 bg-danger-bg p-3 text-small text-danger-text"><p>{error}</p><Button variant="ghost" size="compact" className="mt-2" onClick={()=>{setError('');void load();}}>Retry notes</Button></div>}
   <div className="flex-1 overflow-y-auto p-3">
    {loading&&<div className="space-y-2" aria-label="Loading notes">{[1,2,3].map(i=><div key={i} className="h-20 rounded-md border border-neutral-100 bg-neutral-0"/>)}</div>}
    {!loading&&!error&&!notes.length&&<div className="rounded-md border border-neutral-100 bg-neutral-0 px-4 py-8 text-center"><FileText size={24} className="mx-auto mb-3 text-neutral-400"/><p className="text-h3 mb-2">{search||tag?'No matching notes':'No notes yet'}</p><p className="text-small text-neutral-500 mb-4">{search||tag?'Try another search or filter.':'Capture the first idea for your team.'}</p>{me&&me.role!=='viewer'&&<Button size="compact" onClick={()=>void create()}>Create a note</Button>}</div>}
    {!loading&&!error&&notes.map(n=><button key={n.id} onClick={()=>void choose(n)} className={`w-full text-left p-3 rounded-md mb-1 border transition-colors ${selected?.id===n.id?'bg-neutral-0 border-neutral-200':'border-transparent hover:bg-neutral-100'}`}>
     <span className="flex items-center gap-1 text-body-medium text-neutral-900"><span className="truncate flex-1">{n.title||'Untitled Note'}</span>{n.pinned&&<Pin size={14} aria-label="Pinned"/>}{n.visibility==='private'&&<Lock size={14} aria-label="Private"/>}</span>
     <span className="block truncate text-small text-neutral-500 mt-1">{n.content||'Start writing…'}</span><span className="block text-micro text-neutral-500 mt-2">{statuses[n.status]} · Edited by {members.find(m=>m.id===n.updated_by)?.full_name||'Unknown'}</span><span className="block text-micro text-neutral-500">{new Date(n.updated_at).toLocaleString()}</span><span className="block text-micro text-neutral-500">Created by {members.find(m=>m.id===n.created_by)?.full_name||'Unknown'}</span>
    </button>)}
   </div>
   <div className="p-2 border-t border-neutral-100 flex justify-between items-center"><Button variant="ghost" size="compact" disabled={!page} onClick={()=>setPage(page-1)}>Previous</Button><span className="text-small text-neutral-500">Page {page+1}</span><Button variant="ghost" size="compact" disabled={!more} onClick={()=>setPage(page+1)}>Next</Button></div>
  </aside>
  {selected&&me?<NoteSession key={selected.id} initial={selected} me={me} members={members} tags={tags} links={links} onSaved={saved} onBack={()=>void choose(null)} onDuplicate={n=>void create('Blank',n)} onTags={()=>void loadTags()} onRemoved={()=>{setSelected(null);session.current=null;const url=new URL(location.href);url.searchParams.delete('note');url.searchParams.delete('comment');history.replaceState(null,'',url);void load();}} handle={session}/>:<div className="hidden lg:flex flex-1 min-w-0 items-center justify-center bg-neutral-0 p-8"><div className="w-full max-w-lg"><span className="mb-6 flex h-14 w-14 items-center justify-center rounded-lg border border-neutral-100 bg-neutral-50"><Lightbulb size={28} strokeWidth={1.75} className="text-neutral-400"/></span><p className="text-micro text-neutral-500 mb-2">YOUR WORKSPACE</p><h2 className="text-h1 text-neutral-900 mb-3">Give an idea room to grow.</h2><p className="text-body text-neutral-500 mb-7">Write a quick thought, plan a project, or keep meeting decisions together. Choose a note from the list to continue.</p>{me&&me.role!=='viewer'&&<div className="flex flex-wrap gap-2"><Button onClick={()=>void create()}><Plus size={16} className="mr-2"/>Blank note</Button><Button variant="secondary" onClick={()=>void create('Meeting Notes')}><MessageSquare size={16} className="mr-2"/>Meeting notes</Button></div>}</div></div>}
 </section>;
}
