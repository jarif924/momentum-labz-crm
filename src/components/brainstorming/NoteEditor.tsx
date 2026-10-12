/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useEffect, useRef, useState } from 'react';
import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core';
import { BasicTextStyleButton, CreateLinkButton, FormattingToolbar, FormattingToolbarController, SuggestionMenuController, createReactBlockSpec, getDefaultReactSlashMenuItems, useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import '@fontsource/noto-sans-bengali/400.css';
import '@fontsource/noto-sans-bengali/600.css';
import { Button } from '@/components/ui/Forms';
import { uploadImage,resolveImage } from '@/lib/brainstorming/images';
import { plainText } from '@/lib/brainstorming/types';
import { ArrowDown,ArrowUp,Copy,Highlighter,ImagePlus,ListPlus,Plus,Redo2,RemoveFormatting,Trash2,Undo2 } from 'lucide-react';

const callout=createReactBlockSpec({type:'callout',propSchema:{},content:'inline'},{render:({contentRef})=><aside className="bn-callout"><span aria-hidden="true">💡</span><div ref={contentRef}/></aside>})();
const {paragraph,heading,bulletListItem,numberedListItem,checkListItem,table,image,divider,quote,toggleListItem}=defaultBlockSpecs;
const schema=BlockNoteSchema.create({blockSpecs:{paragraph,heading,bulletListItem,numberedListItem,checkListItem,table,image,divider,quote,toggleListItem,callout}});
const insertItems=[['paragraph','Text'],['heading:1','Heading 1'],['heading:2','Heading 2'],['heading:3','Heading 3'],['bulletListItem','Bullet list'],['numberedListItem','Numbered list'],['checkListItem','Checklist'],['quote','Quote'],['callout','Callout'],['toggleListItem','Collapsible section'],['divider','Divider'],['table','Table']];
export default function NoteEditor({noteId,document,editable,onChange,onTask}:{noteId:string;document:unknown[];editable:boolean;onChange:(doc:unknown[])=>void;onTask?:(text:string)=>void}){
  const [upload,setUpload]=useState<number|null>(null),[error,setError]=useState(''),[menu,setMenu]=useState(false);
  const objectUrls=useRef<string[]>([]),fileInput=useRef<HTMLInputElement>(null);
  const editor=useCreateBlockNote({schema,initialContent:document as any,links:{HTMLAttributes:{target:'_blank',rel:'noopener noreferrer'},isValidLink:href=>/^(https?:|mailto:|tel:)/i.test(href)},
    uploadFile:async file=>{setError('');setUpload(0);try{return await uploadImage(noteId,file,setUpload);}catch(e){setError(e instanceof Error?e.message:'Upload failed');throw e;}finally{setUpload(null);}},
    resolveFileUrl:async url=>{const resolved=await resolveImage(url);if(resolved.startsWith('blob:'))objectUrls.current.push(resolved);return resolved;},
  });
  useEffect(()=>()=>objectUrls.current.forEach(URL.revokeObjectURL),[]);
  function add(value:string){
    if(!value)return;const [type,level]=value.split(':');const current=editor.getTextCursorPosition().block;
    const block:any={type,...(level?{props:{level:Number(level)}}:{})};
    if(type==='table')block.content={type:'tableContent',rows:[{cells:['','','']},{cells:['','','']}]};
    const [added]=editor.insertBlocks([block],current,'after');editor.setTextCursorPosition(added,'start');editor.focus();
  }
  function current(){return editor.getTextCursorPosition().block;}
  function duplicate(){const b=current();const clone=(b:any):any=>({...b,id:undefined,children:b.children?.map(clone)});editor.insertBlocks([clone(b)],b,'after');setMenu(false);}
  function task(){const selected=editor.getSelectedText()||plainText(current().content);if(selected.trim())onTask?.(selected);else setError('Select text or write a checklist item first.');}
  const icon=(label:string,Icon:any,action:()=>void)=><Button variant="ghost" size="compact" title={label} aria-label={label} onMouseDown={e=>e.preventDefault()} onClick={action}><Icon size={16} strokeWidth={1.75}/></Button>;
  return <div className="bn-workspace">
    {editable&&<div className="bn-actionbar flex flex-wrap gap-1 items-center border-b border-neutral-100 p-2 mb-4">
      <label className="flex items-center gap-1 text-small"><Plus size={16}/><span>Add</span><select aria-label="Add block" title="Add a block" value="" onChange={e=>add(e.target.value)} className="h-10 max-w-[140px] bg-neutral-0 rounded-md border border-neutral-200 px-2"><option value="">Choose a block</option>{insertItems.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
      {icon('Undo',Undo2,()=>editor.undo())}{icon('Redo',Redo2,()=>editor.redo())}
      {icon('Upload image',ImagePlus,()=>fileInput.current?.click())}
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={async e=>{const f=e.target.files?.[0];if(!f)return;setError('');setUpload(0);try{const url=await uploadImage(noteId,f,setUpload);editor.insertBlocks([{type:'image',props:{url,name:f.name}}],current(),'after');}catch(err){setError(err instanceof Error?err.message:'Upload failed');}finally{setUpload(null);e.target.value='';}}}/>
      <div className="relative"><Button variant="ghost" size="compact" aria-expanded={menu} title="Actions for current block" onMouseDown={e=>e.preventDefault()} onClick={()=>setMenu(!menu)}>Block actions</Button>{menu&&<div className="absolute left-0 top-full z-30 min-w-[180px] rounded-md border border-neutral-100 bg-neutral-0 p-1 shadow-md" onKeyDown={e=>{if(e.key==='Escape')setMenu(false);}}>
        {[['Move up',ArrowUp,()=>editor.moveBlocksUp(current())],['Move down',ArrowDown,()=>editor.moveBlocksDown(current())],['Duplicate',Copy,duplicate],['Delete block',Trash2,()=>editor.removeBlocks([current()])],['Convert to Task',ListPlus,task]].map(([label,Icon,fn]:any)=><button className="flex items-center gap-2 w-full p-2 text-small hover:bg-neutral-50 rounded-md" key={label} onMouseDown={e=>e.preventDefault()} onClick={()=>{fn();setMenu(false);}}><Icon size={16}/>{label}</button>)}
      </div>}</div>
    </div>}
    {upload!==null&&<p role="status" className="text-small text-neutral-500 p-2">Uploading image… {upload}%</p>}
    {error&&<p role="alert" className="text-small text-danger-text p-2">{error}</p>}
    <BlockNoteView editor={editor} editable={editable} formattingToolbar={false} slashMenu={false} onChange={()=>onChange(editor.document)} theme={{colors:{editor:{text:'var(--neutral-600)',background:'var(--neutral-0)'},menu:{text:'var(--neutral-900)',background:'var(--neutral-0)'},tooltip:{text:'var(--neutral-0)',background:'var(--neutral-900)'},hovered:{text:'var(--neutral-900)',background:'var(--neutral-50)'},selected:{text:'var(--neutral-900)',background:'var(--accent-50)'},border:'var(--neutral-200)',highlights:{yellow:{background:'var(--accent-100)',text:'var(--neutral-900)'}}},borderRadius:10,fontFamily:'Inter, "Noto Sans Bengali", sans-serif'}}>
      <FormattingToolbarController formattingToolbar={()=><FormattingToolbar>
        <BasicTextStyleButton basicTextStyle="bold"/><BasicTextStyleButton basicTextStyle="italic"/><BasicTextStyleButton basicTextStyle="underline"/><BasicTextStyleButton basicTextStyle="strike"/>
        {icon('Highlight',Highlighter,()=>editor.toggleStyles({backgroundColor:'yellow'}))}<CreateLinkButton/>
        {icon('Clear formatting',RemoveFormatting,()=>editor.removeStyles(editor.getActiveStyles()))}
        {onTask&&icon('Convert to Task',ListPlus,task)}
      </FormattingToolbar>}/>
      <SuggestionMenuController triggerCharacter="/" getItems={async query=>[...getDefaultReactSlashMenuItems(editor),{title:'Callout',subtext:'Highlight an idea',group:'Basic blocks',onItemClick:()=>add('callout'),aliases:['idea','callout']}].filter(i=>(i.title+' '+(i.aliases||[]).join(' ')).toLowerCase().includes(query.toLowerCase()))}/>
    </BlockNoteView>
  </div>;
}
