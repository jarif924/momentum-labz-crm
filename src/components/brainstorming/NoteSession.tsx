/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Button,Input,Select } from '@/components/ui/Forms';
import { Modal } from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';
import { draftKey,Member,Note,Revision,statuses } from '@/lib/brainstorming/types';
import { Comments } from './Comments';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft,History,MessageSquare,Pin,Save,Trash2,Copy } from 'lucide-react';
const NoteEditor=dynamic(()=>import('./NoteEditor'),{ssr:false,loading:()=> <p className="p-6 text-small">Loading editor…</p>});
export type SessionHandle={flush:()=>Promise<boolean>};
export function NoteSession({initial,me,members,tags,links,onSaved,onBack,onDuplicate,onTags,onRemoved,handle}:{initial:Note;me:Member;members:Member[];tags:string[];links:any[];onSaved:(n:Note)=>void;onBack:()=>void;onDuplicate:(n:Note)=>void;onTags:()=>void;onRemoved:()=>void;handle:React.MutableRefObject<SessionHandle|null>}){
 const client=useRef(createClient()).current,toast=useToast();
 const [note,setNote]=useState(initial),[status,setStatus]=useState('Saved'),[error,setError]=useState(''),[editable,setEditable]=useState(false),[lockOwner,setLockOwner]=useState(''),[comments,setComments]=useState(false),[epoch,setEpoch]=useState(0),[denied,setDenied]=useState(false);
 const [recovery,setRecovery]=useState<any>(null),[versions,setVersions]=useState<Revision[]|null>(null),[preview,setPreview]=useState<Revision|null>(null),[task,setTask]=useState<{title:string;assigned_to:string;due:string}|null>(null),[taskSaving,setTaskSaving]=useState(false),[newTag,setNewTag]=useState(''),[confirmAction,setConfirmAction]=useState('');
 const current=useRef(initial),version=useRef(initial.version),generation=useRef(0),saved=useRef(0),flight=useRef<Promise<boolean>|null>(null),timer=useRef<ReturnType<typeof setTimeout>>(),token=useRef<string>(''),active=useRef(true),lastActivity=useRef(Date.now());
 if(!token.current){const lockKey=`momentum-brainstorm-lock:${me.id}:${initial.id}`;try{token.current=sessionStorage.getItem(lockKey)||crypto.randomUUID();sessionStorage.setItem(lockKey,token.current);}catch{token.current=crypto.randomUUID();}}
 const key=draftKey(me.id,initial.id),isAdmin=['owner','admin'].includes(me.role),canWrite=me.role!=='viewer'&&!note.deleted_at;
 const flush=useCallback(async():Promise<boolean>=>{
  if(flight.current)return flight.current;
  if(generation.current===saved.current)return true;
  clearTimeout(timer.current);
  flight.current=(async()=>{
   setStatus('Saving');setError('');
   try{
    const lock=await client.rpc('bn_lock',{p_note:initial.id,p_token:token.current}).abortSignal(AbortSignal.timeout(15000));if(lock.error)throw lock.error;
    while(generation.current>saved.current){
     const g=generation.current,n=current.current;
     const patch={title:n.title,document:n.document,status:n.status,visibility:n.visibility,tags:n.tags,pinned:n.pinned,client_id:n.client_id,lead_id:n.lead_id,project_id:n.project_id};
     const {data,error:err}=await client.rpc('bn_save',{p_note:initial.id,p_token:token.current,p_version:version.current,p_patch:patch}).abortSignal(AbortSignal.timeout(15000));if(err)throw err;
     version.current=data.version;saved.current=g;
     current.current={...current.current,version:data.version,updated_at:data.updated_at,updated_by:data.updated_by};
     if(active.current){setNote(current.current);onSaved(data);}
    }
    localStorage.removeItem(key);if(active.current)setStatus('Saved');return true;
   }catch(e:any){if(active.current){setStatus('Save failed');setError(e.message||'Could not save. Your browser draft is kept.');}return false;
   }finally{flight.current=null;}
  })();return flight.current;
 },[client,initial.id,key,onSaved]);
 handle.current={flush};
 function change(patch:Partial<Note>){if(!editable)return;lastActivity.current=Date.now();current.current={...current.current,...patch};generation.current++;setNote(current.current);setStatus('Unsaved changes');
  try{localStorage.setItem(key,JSON.stringify({note:current.current,baseVersion:version.current}));}catch{setError('Browser storage is full. Keep this page open until the server saves.');}
  clearTimeout(timer.current);timer.current=setTimeout(()=>void flush(),1500);
 }
 async function acquire(){
  try{
   const {data:latest,error:fetchError}=await client.from('brainstorm_notes').select('*').eq('id',initial.id).single();if(fetchError)throw fetchError;
   if(generation.current===saved.current){current.current=latest;version.current=latest.version;setNote(latest);setEpoch(v=>v+1);}
   const {error:err}=await client.rpc('bn_lock',{p_note:initial.id,p_token:token.current});if(err)throw err;
   setEditable(true);setLockOwner('');setError('');lastActivity.current=Date.now();
  }catch(e:any){setEditable(false);const {data}=await client.from('brainstorm_locks').select('*').eq('note_id',initial.id).maybeSingle();setLockOwner(members.find(m=>m.id===data?.user_id)?.full_name||'A teammate');if(!data)setError(e.message);}
 }
 useEffect(()=>{
  active.current=true;
  const sessionToken=token.current;
  try{const raw=localStorage.getItem(key);if(raw)setRecovery(JSON.parse(raw));}catch{setError('Could not read the saved browser draft.');}
  if(canWrite)void acquire();
  if(new URLSearchParams(location.search).get('comment'))setComments(true);
  const unload=(e:BeforeUnloadEvent)=>{if(generation.current>saved.current){e.preventDefault();e.returnValue='';}};
  const keys=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();void flush();}};
  const navigate=(e:MouseEvent)=>{const a=(e.target as HTMLElement).closest('a');if(a&&generation.current>saved.current&&a.href!==location.href&&!window.confirm('This note has unsaved changes. Leave with a browser draft saved?')){e.preventDefault();e.stopPropagation();}};
  window.addEventListener('beforeunload',unload);window.addEventListener('keydown',keys);document.addEventListener('click',navigate,true);
  const poll=setInterval(async()=>{
   if(lastActivity.current<Date.now()-120000){setEditable(false);await client.rpc('bn_lock',{p_note:initial.id,p_token:token.current,p_release:true});}
   if(canWrite&&lastActivity.current>Date.now()-120000){const {data:l}=await client.from('brainstorm_locks').select('token,expires_at').eq('note_id',initial.id).maybeSingle();if(l?.token===sessionToken&&new Date(l.expires_at).getTime()>Date.now())await client.rpc('bn_lock',{p_note:initial.id,p_token:sessionToken});}
   const {data:latest,error:readError}=await client.from('brainstorm_notes').select('*').eq('id',initial.id).maybeSingle();
   if(!readError&&!latest){setDenied(true);setEditable(false);return;}
   if(latest&&latest.version!==version.current&&generation.current===saved.current&&!flight.current){version.current=latest.version;current.current=latest;setNote(latest);setEpoch(v=>v+1);onSaved(latest);}
   const {data:l}=await client.from('brainstorm_locks').select('*').eq('note_id',initial.id).maybeSingle();
   if(l&&l.token!==token.current&&new Date(l.expires_at).getTime()>Date.now()){setEditable(false);setLockOwner(members.find(m=>m.id===l.user_id)?.full_name||'A teammate');}else setLockOwner('');
  },10000);
  return()=>{active.current=false;clearInterval(poll);clearTimeout(timer.current);window.removeEventListener('beforeunload',unload);window.removeEventListener('keydown',keys);document.removeEventListener('click',navigate,true);void client.rpc('bn_lock',{p_note:initial.id,p_token:sessionToken,p_release:true});};
 // The session is mounted once per note; save requests always capture its immutable id.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 async function manage(action:string,revision?:string){
  if(!await flush())return;
  if(action==='delete'){try{const response=await fetch('/api/brainstorming/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({noteId:initial.id,version:version.current})});const result=await response.json();if(!response.ok)throw Error(result.error);setConfirmAction('');onRemoved();if(result.cleanupPending)toast.success('Note deleted. Image cleanup will retry during maintenance.');}catch(e:any){toast.error(e.message);}return;}
  const {data,error:err}=await client.rpc('bn_manage',{p_note:initial.id,p_action:action,p_token:token.current,p_version:version.current,p_revision:revision||null});
  if(err){toast.error(err.message);return;}setConfirmAction('');
  if(action==='restore_version'){version.current=data.version;current.current=data;setNote(data);setEpoch(v=>v+1);onSaved(data);setPreview(null);setVersions(null);toast.success('Version restored');}else onRemoved();
 }
 async function loadHistory(){const {data,error:err}=await client.from('brainstorm_versions').select('*').eq('note_id',initial.id).order('created_at',{ascending:false}).limit(50);if(err)toast.error(err.message);else setVersions(data||[]);}
 async function createTask(){if(!task||taskSaving)return;setTaskSaving(true);const {error:err}=await client.rpc('bn_task',{p_note:initial.id,p_title:task.title,p_assignee:task.assigned_to||null,p_due:task.due?new Date(task.due+'T12:00:00').toISOString():null});setTaskSaving(false);if(err)toast.error(err.message);else{setTask(null);toast.success('Task created. Open Tasks & Follow-ups to see it.');}}
 async function createTag(){if(!newTag.trim())return;const {error:err}=await client.rpc('bn_tag',{p_name:newTag.trim()});if(err)toast.error(err.message);else{change({tags:Array.from(new Set([...note.tags,newTag.trim()]))});setNewTag('');onTags();}}
 const person=(id:string|null)=>members.find(m=>m.id===id)?.full_name||'Unknown';
 if(denied)return <div className="p-6"><p>This note is no longer available to you.</p><Button onClick={onBack}>Back to notes</Button></div>;
 const linked=links.find(l=>l.id===(note.project_id||note.lead_id||note.client_id));
 return <div className="flex min-w-0 flex-1 flex-col">
  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 p-3">
   <Button variant="ghost" size="compact" onClick={onBack} title="Back to notes"><ArrowLeft size={16} className="mr-1"/>Notes</Button>
   <div role="status" className={`text-small ${status==='Save failed'?'text-danger-text':'text-neutral-500'}`}>{status}</div>
   <div className="flex flex-wrap gap-1">
    {canWrite&&<Button variant="ghost" size="compact" disabled={!editable||status==='Saving'} title="Save note (Ctrl/Cmd+S)" onClick={()=>void flush()}><Save size={16} className="mr-1"/>Save</Button>}
    {!note.deleted_at&&<Button variant="ghost" size="compact" title="Open discussion" onClick={()=>setComments(!comments)}><MessageSquare size={16} className="mr-1"/>Discussion</Button>}
    <details className="relative"><summary className="cursor-pointer text-small p-2 rounded-md hover:bg-neutral-50">More</summary><div className="absolute right-0 top-full z-20 bg-neutral-0 border border-neutral-100 shadow-md rounded-md p-2 w-44 flex flex-col gap-1">
     {canWrite&&<><Button variant="ghost" size="compact" onClick={()=>change({pinned:!note.pinned})} disabled={!editable}><Pin size={16} className="mr-2"/>{note.pinned?'Unpin':'Pin'}</Button><Button variant="ghost" size="compact" onClick={async()=>{if(await flush())onDuplicate(current.current);}}><Copy size={16} className="mr-2"/>Duplicate</Button></>}
     {isAdmin&&<Button variant="ghost" size="compact" onClick={loadHistory}><History size={16} className="mr-2"/>Version history</Button>}
     {(isAdmin||me.id===note.created_by)&&me.role!=='viewer'&&<Button variant="ghost" size="compact" onClick={()=>setConfirmAction(note.deleted_at?'restore_trash':'trash')}><Trash2 size={16} className="mr-2"/>{note.deleted_at?'Restore note':'Move to Trash'}</Button>}
     {isAdmin&&note.deleted_at&&<Button variant="destructive" size="compact" onClick={()=>setConfirmAction('delete')}>Delete permanently</Button>}
    </div></details>
   </div>
  </div>
  {error&&<div role="alert" className="p-3 bg-danger-bg text-danger-text text-small">{error}{status==='Save failed'&&<Button variant="ghost" size="compact" onClick={()=>void flush()}>Retry</Button>}</div>}
  {recovery&&<div className="p-3 bg-warning-bg text-small"><p>A browser draft is available.{recovery.baseVersion!==version.current?' The server note has changed since this draft was written. Restoring it will replace the saved writing and organization settings.':''}</p><Button variant="secondary" size="compact" disabled={!editable} onClick={()=>{change({title:recovery.note.title,document:recovery.note.document,status:recovery.note.status??note.status,tags:recovery.note.tags??note.tags,visibility:recovery.note.visibility??note.visibility,pinned:recovery.note.pinned??note.pinned,client_id:recovery.note.client_id??null,lead_id:recovery.note.lead_id??null,project_id:recovery.note.project_id??null});setEpoch(v=>v+1);setRecovery(null);}}>Restore draft</Button><Button variant="ghost" size="compact" onClick={()=>{localStorage.removeItem(key);setRecovery(null);}}>Discard draft</Button></div>}
  {!editable&&canWrite&&<div className="p-3 bg-neutral-50 text-small">{lockOwner?`${lockOwner} is editing. You can read and comment.`:'Editing paused.'}<Button variant="secondary" size="compact" className="ml-2" onClick={acquire}>Resume editing</Button></div>}
  {note.deleted_at&&<div className="p-3 bg-warning-bg text-small">This note is in Trash.</div>}
  <div className="flex min-h-0 flex-1 min-w-0">
   <div className={`flex-1 min-w-0 overflow-y-auto ${comments?'hidden xl:block':''}`}>
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
     <input aria-label="Note title" placeholder="Untitled Note" value={note.title} readOnly={!editable} onChange={e=>change({title:e.target.value})} maxLength={200} className="w-full text-h1 text-neutral-900 bg-transparent border-none rounded-md p-1 mb-2"/>
     <p className="text-small text-neutral-500 mb-4">Created by {person(note.created_by)} · Edited by {person(note.updated_by)} · {new Date(note.updated_at).toLocaleString()}</p>
     <div className="flex flex-wrap items-center gap-2 mb-4">
      <select aria-label="Note status" disabled={!editable} value={note.status} onChange={e=>change({status:e.target.value as Note['status']})} className="h-10 px-2 bg-neutral-50 rounded-md text-small">{Object.entries(statuses).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
      <select aria-label="Visibility" disabled={!editable||note.created_by!==me.id} value={note.visibility} onChange={e=>change({visibility:e.target.value as Note['visibility']})} className="h-10 px-2 bg-neutral-50 rounded-md text-small"><option value="team">Team</option><option value="private">Private · only me</option></select>
      <select aria-label="Link to client, lead or project" disabled={!editable} value={linked?linked.kind+':'+linked.id:''} onChange={e=>{const [kind,id]=e.target.value.split(':');change({client_id:null,lead_id:null,project_id:null,...(kind?{[kind+'_id']:id}:{})});}} className="h-10 max-w-full sm:max-w-48 px-2 bg-neutral-50 rounded-md text-small"><option value="">Link to…</option>{links.map(l=><option key={l.kind+l.id} value={l.kind+':'+l.id}>{l.kind}: {l.name}</option>)}</select>
      {linked&&<Link className="rounded-sm px-2 py-1 text-small bg-accent-50 text-neutral-900 max-w-full truncate" href={linked.href}>{linked.name} ↗</Link>}
     </div>
     <details className="mb-4 text-small"><summary className="cursor-pointer">Tags{note.tags.length?`: ${note.tags.join(', ')}`:''}</summary><div className="flex flex-wrap gap-2 pt-2">{tags.map(t=><label key={t} className="flex items-center gap-1 rounded-sm bg-neutral-50 px-2 py-1"><input type="checkbox" disabled={!editable} checked={note.tags.includes(t)} onChange={e=>change({tags:e.target.checked?[...note.tags,t]:note.tags.filter(x=>x!==t)})}/>{t}</label>)}</div>{editable&&<div className="flex gap-2 mt-2"><Input aria-label="New tag" placeholder="New tag" maxLength={40} value={newTag} onChange={e=>setNewTag(e.target.value)}/><Button variant="secondary" onClick={createTag}>Add tag</Button></div>}</details>
     <NoteEditor key={epoch} noteId={note.id} document={note.document} editable={editable&&!note.deleted_at} onChange={doc=>change({document:doc})} onTask={canWrite?text=>setTask({title:text.slice(0,500),assigned_to:note.visibility==='private'?me.id:'',due:''}):undefined}/>
    </div>
   </div>
   {comments&&<Comments note={note} me={me} members={members} onClose={()=>setComments(false)}/>}
  </div>
  <Modal manageFocus isOpen={!!versions} title="Version history" onClose={()=>{setVersions(null);setPreview(null);}} maxWidth="lg">
   <p className="text-small text-neutral-500 mb-3">Up to 50 grouped versions from the last 30 days.</p>
   {!versions?.length&&<p>No earlier versions yet.</p>}{versions?.map(r=><button key={r.id} className="block w-full text-left p-3 border-b border-neutral-100 hover:bg-neutral-50" onClick={()=>setPreview(r)}>{new Date(r.created_at).toLocaleString()} · {person(r.created_by)} · Version {r.version}</button>)}
   {preview&&<div className="mt-4"><h3 className="text-h3 mb-3">Preview: {preview.title}</h3><NoteEditor key={preview.id} noteId={note.id} document={preview.document} editable={false} onChange={()=>{}}/><Button className="mt-4" disabled={!editable} onClick={()=>void manage('restore_version',preview.id)}>Restore this version</Button></div>}
  </Modal>
  <Modal manageFocus isOpen={!!task} title="Convert to Task" onClose={()=>!taskSaving&&setTask(null)}><div className="space-y-4"><Input label="Task title" aria-label="Task title" value={task?.title||''} onChange={e=>task&&setTask({...task,title:e.target.value})}/><Select label="Assignee" aria-label="Task assignee" value={task?.assigned_to||''} onChange={e=>task&&setTask({...task,assigned_to:e.target.value})}><option value="">Unassigned</option>{members.filter(m=>note.visibility==='team'||m.id===me.id).map(m=><option value={m.id} key={m.id}>{m.full_name}</option>)}</Select><Input label="Due date" aria-label="Task due date" type="date" value={task?.due||''} onChange={e=>task&&setTask({...task,due:e.target.value})}/><p className="text-small">The task will link back to this note.{note.visibility==='private'?' Private-note tasks are visible only to you.':''}</p><Button disabled={taskSaving||!task?.title.trim()||!task?.due} onClick={createTask}>{taskSaving?'Creating…':'Create task'}</Button></div></Modal>
  <Modal manageFocus isOpen={!!confirmAction} title={confirmAction==='delete'?'Permanently delete note?':confirmAction==='trash'?'Move note to Trash?':'Restore note?'} onClose={()=>setConfirmAction('')}><p className="mb-4 text-small">{confirmAction==='delete'?'This permanently removes the note, discussions, and version history.':confirmAction==='trash'?'You can recover it from Trash.':'This note will return to your note list.'}</p><div className="flex gap-2"><Button variant="secondary" onClick={()=>setConfirmAction('')}>Cancel</Button><Button variant={confirmAction==='delete'?'destructive':'primary'} onClick={()=>void manage(confirmAction)}>Confirm</Button></div></Modal>
 </div>;
}
