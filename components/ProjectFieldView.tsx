"use client";

import React, { useState, useEffect } from 'react';
import { CheckSquare, Camera, BookOpen, Plus, X, Maximize2, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ProjectFieldView({ project, user }: { project: any, user: any }) {
  const [tasks, setTasks] = useState<any[]>(project.tasks || []);
  const [notes, setNotes] = useState(project.notes || "");
  const [photos, setPhotos] = useState<any[]>(project.photos || []);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const progress = tasks.length > 0 ? Math.round((tasks.filter(t => t.done).length / tasks.length) * 100) : 0;

  const updateTasks = async (newTasks: any[]) => {
    setTasks(newTasks);
    await supabase.from('chantiers').update({ tasks: newTasks }).eq('id', project.id);
  };

  const toggleTask = (taskId: string) => {
    const newTasks = tasks.map(t => t.id === taskId ? { ...t, done: !t.done, updatedBy: user.nom, updatedAt: new Date().toISOString() } : t);
    updateTasks(newTasks);
  };

  const handleSaveNotes = async () => {
    setIsSaving(true);
    await supabase.from('chantiers').update({ notes: notes }).eq('id', project.id);
    setIsSaving(false);
  };

  return (
    <div className="p-4 space-y-6 pb-24 max-w-5xl mx-auto font-['Fredoka']">
      {/* AVANCEMENT */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Avancement</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Temps réel - {project.nom}</p>
          </div>
          <div className="text-right"><span className="text-5xl font-black text-blue-600">{progress}%</span></div>
        </div>
        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
          <div className="h-full bg-blue-600 transition-all duration-700" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><CheckSquare className="text-blue-500" /> ACTIONS À RÉALISER</h3>
          <div className="space-y-2">
            {tasks.map(task => (
              <button key={task.id} onClick={() => toggleTask(task.id)} className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${task.done ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-transparent text-slate-600'}`}>
                {task.done ? <CheckCircle2 className="fill-green-500 text-white" /> : <div className="w-6 h-6 rounded-full border-2 border-slate-300" />}
                <div className="text-left font-bold uppercase text-xs">{task.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Camera className="text-orange-500" /> PHOTOS TERRAIN</h3>
            <label className="bg-orange-500 text-white p-2 rounded-xl cursor-pointer shadow-lg shadow-orange-100"><Plus /><input type="file" className="hidden" /></label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <div key={i} onClick={() => setSelectedPhoto(p.url)} className="aspect-square rounded-xl bg-slate-100 overflow-hidden relative group cursor-pointer">
                <img src={p.url} className="w-full h-full object-cover" alt="site" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl">
        <div className="flex items-center gap-3 mb-4"><BookOpen className="text-orange-400" /><h3 className="text-2xl font-black uppercase">Journal de bord</h3></div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes importantes..." className="w-full bg-white/5 border-none rounded-2xl p-6 text-sm h-32 focus:ring-1 focus:ring-orange-500" />
        <button onClick={handleSaveNotes} disabled={isSaving} className="mt-4 w-full py-5 bg-orange-500 text-white rounded-2xl font-black uppercase flex items-center justify-center gap-2">
          {isSaving ? <Loader2 className="animate-spin" /> : <Send size={20} />} ENREGISTRER AU DOSSIER
        </button>
      </div>
    </div>
  );
}
