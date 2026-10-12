/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button,Input } from '@/components/ui/Forms';
import { useToast } from '@/components/ui/Toast';
import { Member,Note,clearDrafts,statuses,template } from '@/lib/brainstorming/types';
import { NoteSession,SessionHandle } from '@/components/brainstorming/NoteSession';
import { Lightbulb,Plus,Pin,Lock } from 'lucide-react';
import './brainstorming.css';
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
   const directory=await client.from('users').select('id,full_name,role');if(directory.error){setError(directory.error.message);return;}
   setMembers(directory.data||[]);const member=directory.data?.find((m:any)=>m.id===user.id);if(!member){setError('Your account is not a CRM team member.');setLoading(false);return;}setMe(member);
   await loadTags();
   const results=await Promise.all([client.from('projects').select('id,name'),client.from('leads').select('id,companies(name),contacts(full_name)'),client.from('contacts').select('id,full_name').eq('is_client',true)]);
   setLinks([...(results[0].data||[]).map((r:any)=>({id:r.id,name:r.name,kind:'project',href:'/projects/'+r.id})),...(results[1].data||[]).map((r:any)=>({id:r.id,name:r.companies?.name||r.contacts?.full_name||'Lead',kind:'lead',href:'/leads?lead='+r.id})),...(results[2].data||[]).map((r:any)=>({id:r.id,name:r.full_name,kind:'client',href:'/clients#client-'+r.id}))]);
   const id=new URLSearchParams(location.search).get('note');if(id){const {data,error:err}=await client.from('brainstorm_notes').select('*').eq('id',id).maybeSingle();if(data)setSelected(data);else if(err)setError(err.message);else setError('This note is not available to your account.');}
  }
  void init();const {data:{subscription}}=client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){clearDrafts();setSelected(null);setNotes([]);setMe(null);}});return()=>subscription.unsubscribe();
 },[client,loadTags]);
 const load=useCallback(async()=>{
  if(!me)return;const id=++request.current;setLoading(true);let q=client.from('brainstorm_notes').select('*');
  q=filter==='trash'?q.not('deleted_at','is',null):q.is('deleted_at',null);
  if(filter==='active')q=q.neq('status','archived');else if(filter!=='trash')q=q.eq('status',filter);
  if(tag)q=q.contains('tags',[tag]);if(search){const term=JSON.stringify('%'+search.replace(/[\\%_]/g,'\\$&')+'%');q=q.or(`title.ilike.${term},content.ilike.${term}`);}
  const {data,error:err}=await q.order('pinned',{ascending:false}).order(sort,{ascending:sort==='title'}).order('id').range(page*LIMIT,page*LIMIT+LIMIT);
  if(id!==request.current)return;setLoading(false);if(err){setError(err.message);return;}setNotes((data||[]).slice(0,LIMIT));setMore((data||[]).length>LIMIT);
 },[client,filter,me,page,search,sort,tag]);
 useEffect(()=>{void load();},[load]);
 const saved=useCallback((n:Note)=>setNotes(prev=>prev.map(x=>x.id===n.id?n:x)),[]);
 async function choose(n:Note|null){if(switching.current)return;switching.current=true;try{if(session.current&&!await session.current.flush())return;setSelected(n);session.current=null;const url=new URL(location.href);if(n)url.searchParams.set('note',n.id);else url.searchParams.delete('note');url.searchParams.delete('comment');history.replaceState(null,'',url);}finally{switching.current=false;}}
 async function create(name='Blank',copy?:Note){if(creating)return;if(session.current&&!await session.current.flush())return;setCreating(true);const {data,error:err}=await client.rpc('bn_create',{p_title:copy?copy.title+' (copy)':name==='Blank'?'Untitled Note':name,p_document:copy?.document||template(name),p_visibility:copy?.visibility||'team'});setCreating(false);if(err){toast.error(err.message);return;}setFilter('active');setSearch('');setQuery('');setPage(0);await load();await choose(data);}
 return <section className="brainstorming flex h-[calc(100dvh-96px)] min-h-[480px] -m-4 md:-m-6 overflow-hidden bg-neutral-0" aria-label="Brainstorming workspace">
  <aside className={`${selected?'hidden lg:flex':'flex'} w-full lg:w-72 shrink-0 flex-col border-r border-neutral-100 bg-neutral-50 min-h-0`}>
   <div className="p-4 space-y-3 border-b border-neutral-100">
    <h1 className="text-h2 flex gap-2 items-center"><Lightbulb size={20}/>Brainstorming</h1>
    {me?.role!=='viewer'&&me&&<div className="flex gap-2"><Button className="flex-1" disabled={creating} onClick={()=>void create()}><Plus size={16} className="mr-1"/>{creating?'Creating…':'New Note'}</Button><select aria-label="Create from template" value="" className="min-w-0 max-w-24 text-small rounded-md border border-neutral-200 bg-neutral-0" disabled={creating} onChange={e=>void create(e.target.value)}><option value="">Template</option>{['Quick Idea','Project Brainstorm','Meeting Notes'].map(t=><option key={t}>{t}</option>)}</select></div>}
    <Input aria-label="Search notes" placeholder="Search notes…" value={query} onChange={e=>setQuery(e.target.value)}/>
    <div className="grid grid-cols-2 gap-2"><select aria-label="Filter status" value={filter} onChange={e=>{setFilter(e.target.value);setPage(0);}} className="h-10 rounded-md border border-neutral-200 bg-neutral-0 px-2 text-small"><option value="active">Active notes</option>{Object.entries(statuses).map(([v,l])=><option key={v} value={v}>{l}</option>)}<option value="trash">Trash</option></select><select aria-label="Filter tag" value={tag} onChange={e=>{setTag(e.target.value);setPage(0);}} className="h-10 rounded-md border border-neutral-200 bg-neutral-0 px-2 text-small"><option value="">All tags</option>{tags.map(t=><option key={t}>{t}</option>)}</select></div>
    <select aria-label="Sort notes" value={sort} onChange={e=>{setSort(e.target.value);setPage(0);}} className="w-full h-10 rounded-md border border-neutral-200 bg-neutral-0 px-2 text-small"><option value="updated_at">Last edited</option><option value="created_at">Created date</option><option value="title">Title</option></select>
   </div>
   {error&&<div role="alert" className="p-3 text-small text-danger-text">{error}<Button variant="ghost" onClick={()=>{setError('');void load();}}>Retry</Button></div>}
   <div className="flex-1 overflow-y-auto p-2">
    {loading&&<p className="p-4 text-small text-neutral-500">Loading notes…</p>}
    {!loading&&!notes.length&&<div className="p-4 text-center"><p className="text-h3 mb-2">{search||tag?'No matching notes':'No notes here yet'}</p><p className="text-small text-neutral-500 mb-4">{search||tag?'Try another search or capture a new idea.':'Keep an idea, meeting note, or project discussion here.'}</p>{me&&me.role!=='viewer'&&<Button onClick={()=>void create()}>New Note</Button>}</div>}
    {notes.map(n=><button key={n.id} onClick={()=>void choose(n)} className={`w-full text-left p-3 rounded-md mb-1 border ${selected?.id===n.id?'bg-neutral-0 border-neutral-200':'border-transparent hover:bg-neutral-100'}`}>
     <span className="flex items-center gap-1 text-body-medium text-neutral-900"><span className="truncate flex-1">{n.title||'Untitled Note'}</span>{n.pinned&&<Pin size={14} aria-label="Pinned"/>}{n.visibility==='private'&&<Lock size={14} aria-label="Private"/>}</span>
     <span className="block truncate text-small text-neutral-500 mt-1">{n.content||'Start writing…'}</span><span className="block text-micro text-neutral-500 mt-2">{statuses[n.status]} · {members.find(m=>m.id===n.updated_by)?.full_name||'Unknown'}</span><span className="block text-micro text-neutral-500">{new Date(n.updated_at).toLocaleDateString()}</span>
    </button>)}
   </div>
   <div className="p-2 border-t border-neutral-100 flex justify-between items-center"><Button variant="ghost" size="compact" disabled={!page} onClick={()=>setPage(page-1)}>Previous</Button><span className="text-small">Page {page+1}</span><Button variant="ghost" size="compact" disabled={!more} onClick={()=>setPage(page+1)}>Next</Button></div>
  </aside>
  {selected&&me?<NoteSession key={selected.id} initial={selected} me={me} members={members} tags={tags} links={links} onSaved={saved} onBack={()=>void choose(null)} onDuplicate={n=>void create('Blank',n)} onTags={()=>void loadTags()} onRemoved={()=>{setSelected(null);session.current=null;void load();}} handle={session}/>:<div className="hidden lg:flex flex-1 items-center justify-center p-6 text-center"><div><Lightbulb size={48} className="mx-auto text-neutral-200 mb-4"/><h2 className="text-h2 mb-2">Room for your next idea</h2><p className="text-small text-neutral-500">Open a note or choose New Note to start writing.</p></div></div>}
 </section>;
}
