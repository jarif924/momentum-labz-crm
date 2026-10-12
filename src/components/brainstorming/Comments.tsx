'use client';
import { useEffect,useState } from 'react';
import { Button } from '@/components/ui/Forms';
import { createClient } from '@/lib/supabase/client';
import { Member,Note,NoteComment } from '@/lib/brainstorming/types';
import { useToast } from '@/components/ui/Toast';
import { X } from 'lucide-react';
export function Comments({note,me,members,onClose}:{note:Note;me:Member;members:Member[];onClose:()=>void}){
 const client=createClient(),toast=useToast();
 const [items,setItems]=useState<NoteComment[]>([]),[body,setBody]=useState(''),[reply,setReply]=useState<string|null>(null),[editing,setEditing]=useState<NoteComment|null>(null),[busy,setBusy]=useState(false),[mentions,setMentions]=useState<string[]>([]),[error,setError]=useState('');
 async function load(){const {data,error:err}=await client.from('brainstorm_comments').select('*').eq('note_id',note.id).order('created_at');if(err)setError(err.message);else{setItems(data||[]);setError('');}}
 useEffect(()=>{void load();const timer=setInterval(()=>void load(),5000);return()=>clearInterval(timer);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[note.id]);
 useEffect(()=>{const id=new URLSearchParams(location.search).get('comment');if(id)document.getElementById('comment-'+id)?.scrollIntoView({block:'nearest'});},[items.length]);
 const name=(id:string)=>members.find(m=>m.id===id)?.full_name||'Former teammate';
 async function send(){if(!body.trim()||busy)return;setBusy(true);const {error:err}=await client.rpc('bn_comment',{p_note:note.id,p_body:body,p_id:editing?.id||null,p_parent:reply,p_mentions:mentions.filter(id=>body.includes('@'+name(id)))});setBusy(false);if(err){toast.error(err.message);return;}setBody('');setReply(null);setEditing(null);setMentions([]);await load();}
 async function action(c:NoteComment,value:string){if(value==='delete'&&!window.confirm('Delete this comment and its replies?'))return;const {error:err}=await client.rpc('bn_comment',{p_note:note.id,p_body:c.body,p_id:c.id,p_action:value});if(err)toast.error(err.message);else await load();}
 const query=body.match(/@([^@\n]*)$/)?.[1];
 function comment(c:NoteComment){const canManage=c.author_id===me.id||['owner','admin'].includes(me.role);return <article key={c.id} id={'comment-'+c.id} className="p-3 border-b border-neutral-100 scroll-mt-4"><p className="text-small font-medium text-neutral-900">{name(c.author_id)}</p><time className="text-micro text-neutral-500">{new Date(c.created_at).toLocaleString()}</time><p className="whitespace-pre-wrap break-words text-body my-2">{c.body}</p><div className="flex flex-wrap gap-1">
 {!c.parent_id&&<><Button variant="ghost" size="compact" onClick={()=>{setReply(c.id);setEditing(null);}}>Reply</Button><Button variant="ghost" size="compact" onClick={()=>void action(c,c.resolved?'reopen':'resolve')}>{c.resolved?'Reopen':'Resolve'}</Button></>}
 {canManage&&<><Button variant="ghost" size="compact" onClick={()=>{setEditing(c);setReply(c.parent_id);setBody(c.body);setMentions(c.mentions);}}>Edit</Button><Button variant="ghost" size="compact" onClick={()=>void action(c,'delete')}>Delete</Button></>}
 </div>{items.filter(r=>r.parent_id===c.id).map(r=><div key={r.id} className="ml-3 border-l border-neutral-200">{comment(r)}</div>)}</article>;}
 return <aside aria-label="Discussion" className="w-full xl:w-80 shrink-0 border-l border-neutral-100 flex flex-col min-h-0">
  <div className="flex justify-between items-center p-3 border-b border-neutral-100"><h2 className="text-h3">Discussion</h2><Button variant="ghost" size="compact" title="Close discussion" aria-label="Close discussion" onClick={onClose}><X size={16}/></Button></div>
  {error&&<p role="alert" className="p-3 text-danger-text text-small">{error}</p>}
  <div className="overflow-y-auto flex-1">{items.filter(c=>!c.parent_id&&!c.resolved).map(comment)}{!items.length&&<p className="p-4 text-small text-neutral-500">Start a discussion about this note.</p>}
  {!!items.filter(c=>!c.parent_id&&c.resolved).length&&<details className="p-3"><summary className="cursor-pointer text-small">Resolved discussions ({items.filter(c=>!c.parent_id&&c.resolved).length})</summary>{items.filter(c=>!c.parent_id&&c.resolved).map(comment)}</details>}</div>
  <div className="p-3 border-t border-neutral-100 space-y-2">
   {(reply||editing)&&<p className="text-small">{editing?'Editing comment':'Replying to discussion'} <button className="underline" onClick={()=>{setReply(null);setEditing(null);setBody('');}}>Cancel</button></p>}
   <textarea aria-label="Write a comment" placeholder="Write a comment… Use @ to mention someone." className="w-full min-h-24 p-3 rounded-md border border-neutral-200 resize-y text-body" value={body} onChange={e=>setBody(e.target.value)} maxLength={10000}/>
   {query!==undefined&&<div className="border border-neutral-100 rounded-md max-h-36 overflow-y-auto" role="listbox" aria-label="Mention teammate">{members.filter(m=>(note.visibility==='team'||m.id===me.id)&&m.full_name.toLowerCase().includes(query.toLowerCase())).map(m=><button key={m.id} className="block w-full text-left p-2 hover:bg-neutral-50 text-small" onClick={()=>{setBody(body.replace(/@[^@\n]*$/,'@'+m.full_name+' '));setMentions(Array.from(new Set([...mentions,m.id])));}}>{m.full_name}</button>)}</div>}
   <Button disabled={!body.trim()||busy} onClick={send}>{busy?'Posting…':editing?'Save comment':'Post comment'}</Button>
  </div>
 </aside>;
}
