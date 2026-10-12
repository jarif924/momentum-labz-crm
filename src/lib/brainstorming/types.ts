export type NoteStatus = 'idea' | 'in_progress' | 'done' | 'archived';
export type Note = {
  id: string; title: string; document: unknown[]; content: string | null;
  status: NoteStatus; visibility: 'team' | 'private'; created_by: string | null;
  updated_by: string | null; created_at: string; updated_at: string;
  tags: string[]; pinned: boolean; version: number; deleted_at: string | null;
  client_id: string | null; lead_id: string | null; project_id: string | null;
};
export type Member = { id: string; full_name: string; role: 'owner' | 'admin' | 'sales' | 'viewer' };
export type NoteComment = { id: string; note_id: string; parent_id: string | null; author_id: string; body: string; mentions: string[]; resolved: boolean; created_at: string; updated_at: string };
export type Revision = {id: string; title: string; document: unknown[]; content: string; created_by: string; created_at: string; version: number};
export const statuses = {idea: 'Idea', in_progress: 'In Progress', done: 'Done', archived: 'Archived'};
export const paragraph = (text = '') => ({type: 'paragraph', content: text});
export function template(name: string): unknown[] {
  const h = (text: string) => ({type: 'heading', props: {level: 2}, content: text});
  if (name === 'Quick Idea') return [h('The idea'),paragraph(),h('Why it matters'),paragraph(),h('Next step'),{type:'checkListItem',content:''}];
  if (name === 'Project Brainstorm') return [h('Goal'),paragraph(),h('Ideas'),{type:'bulletListItem',content:''},h('Questions'),paragraph(),h('Agreed actions'),{type:'checkListItem',content:''}];
  if (name === 'Meeting Notes') return [h('Agenda'),{type:'bulletListItem',content:''},h('Discussion'),paragraph(),h('Decisions'),paragraph(),h('Action items'),{type:'checkListItem',content:''}];
  return [paragraph()];
}
export function plainText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(plainText).filter(Boolean).join('\n');
  if (value && typeof value === 'object') {
    const v = value as Record<string,unknown>;
    if (v.type === 'text') return String(v.text || '');
    return [v.content,v.children,v.rows,v.cells].filter(Boolean).map(plainText).filter(Boolean).join('\n');
  }
  return '';
}
export function draftKey(user: string,note: string){return `momentum-brainstorm-draft:${user}:${note}`;}
export function clearDrafts(){for(const key of Object.keys(localStorage)) if(key.startsWith('momentum-brainstorm-draft:')) localStorage.removeItem(key);}
