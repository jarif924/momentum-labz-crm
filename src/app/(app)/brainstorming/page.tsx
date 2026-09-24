/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/supabase';
import { Button } from '@/components/ui/Forms';
import { Plus, Trash2, Save, FileText, CheckCircle, Lightbulb } from 'lucide-react';

export default function BrainstormingPage() {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [notes, setNotes] = useState<any[]>([]);
  const [activeNote, setActiveNote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchNotes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchNotes() {
    setLoading(true);
    const { data } = await supabase
      .from('brainstorm_notes')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (data) {
      setNotes(data);
      if (data.length > 0 && !activeNote) {
        setActiveNote(data[0]);
      }
    }
    setLoading(false);
  }

  async function createNewNote() {
    const { data } = await supabase
      .from('brainstorm_notes')
      .insert({
        title: 'Untitled Idea',
        content: '',
        status: 'idea'
      })
      .select()
      .single();
    
    if (data) {
      setNotes([data, ...notes]);
      setActiveNote(data);
    }
  }

  async function saveActiveNote() {
    if (!activeNote) return;
    setSaving(true);
    await supabase
      .from('brainstorm_notes')
      .update({
        title: activeNote.title,
        content: activeNote.content,
        status: activeNote.status
      })
      .eq('id', activeNote.id);
    
    // Update local state without full refetch to avoid losing focus
    setNotes(notes.map(n => n.id === activeNote.id ? activeNote : n));
    setSaving(false);
  }

  async function deleteNote(id: string) {
    if (!confirm('Are you sure you want to delete this idea?')) return;
    await supabase.from('brainstorm_notes').delete().eq('id', id);
    if (activeNote?.id === id) {
      setActiveNote(null);
    }
    fetchNotes();
  }

  return (
    <div className="flex h-full -m-4 md:-m-6 bg-white overflow-hidden">
      {/* Sidebar List */}
      <div className="w-64 lg:w-80 border-r border-neutral-100 flex flex-col bg-neutral-50 shrink-0">
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="font-semibold text-neutral-900 flex items-center gap-2">
            <Lightbulb size={16} className="text-accent-600" />
            Brainstorming
          </h2>
          <button 
            onClick={createNewNote}
            className="p-1.5 bg-neutral-200/50 hover:bg-neutral-200 text-neutral-600 rounded-md transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center p-4 text-xs text-neutral-400">Loading ideas...</div>
          ) : notes.length === 0 ? (
            <div className="text-center p-6 text-xs text-neutral-400">No ideas yet. Create one!</div>
          ) : (
            notes.map(note => (
              <button
                key={note.id}
                onClick={() => setActiveNote(note)}
                className={`w-full text-left p-3 rounded-lg mb-1 transition-colors group ${activeNote?.id === note.id ? 'bg-white shadow-sm border border-neutral-200' : 'hover:bg-neutral-200/50 border border-transparent'}`}
              >
                <div className="font-medium text-sm text-neutral-900 truncate">
                  {note.title || 'Untitled Idea'}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                    note.status === 'done' ? 'bg-green-100 text-green-700' :
                    note.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-neutral-200 text-neutral-600'
                  }`}>
                    {note.status.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {new Date(note.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        {activeNote ? (
          <>
            <div className="h-14 border-b border-neutral-100 flex items-center justify-between px-6 shrink-0">
              <div className="flex items-center gap-3">
                <select 
                  className="text-xs font-semibold uppercase bg-neutral-100 text-neutral-700 rounded-md px-2 py-1 border-none outline-none focus:ring-2 focus:ring-accent-500"
                  value={activeNote.status}
                  onChange={(e) => setActiveNote({...activeNote, status: e.target.value})}
                >
                  <option value="idea">Idea</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                  <option value="archived">Archived</option>
                </select>
                {saving && <span className="text-xs text-neutral-400 flex items-center gap-1"><Save size={12}/> Saving...</span>}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="compact" onClick={saveActiveNote}>
                  <CheckCircle size={14} className="mr-1.5" /> Save
                </Button>
                <Button variant="ghost" size="compact" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteNote(activeNote.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto py-12 px-8">
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={(e) => setActiveNote({...activeNote, title: e.target.value})}
                  onBlur={saveActiveNote}
                  placeholder="Untitled Idea"
                  className="w-full text-4xl font-bold text-neutral-900 placeholder:text-neutral-300 border-none outline-none bg-transparent mb-8"
                />
                <textarea
                  value={activeNote.content || ''}
                  onChange={(e) => setActiveNote({...activeNote, content: e.target.value})}
                  onBlur={saveActiveNote}
                  placeholder="Start brainstorming, typing out concepts, or pasting links..."
                  className="w-full h-[500px] text-base text-neutral-700 leading-relaxed placeholder:text-neutral-300 border-none outline-none bg-transparent resize-none"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-400">
            <FileText size={48} className="mb-4 text-neutral-200" />
            <p>Select a note or create a new one to start brainstorming.</p>
          </div>
        )}
      </div>
    </div>
  );
}
