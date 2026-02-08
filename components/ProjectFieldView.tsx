import React, { useState, useEffect } from 'react';
import { CheckSquare, Camera, BookOpen, Plus, X, Maximize2, Send, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ProjectFieldView({ project, user }: { project: any, user: any }) {
  const [tasks, setTasks] = useState<any[]>(project.tasks || []);
  const [notes, setNotes] = useState(project.notes || "");
  const [photos, setPhotos] = useState<any[]>(project.photos || []);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Calcul auto de la progression
  const progress = tasks.length > 0 
    ? Math.round((tasks.filter(t => t.done).length / tasks.length) * 100) 
    : 0;

  // Sauvegarde automatique des tâches dans Supabase
  const updateTasks = async (newTasks: any[]) => {
    setTasks(newTasks);
    await supabase.from('chantiers').update({ tasks: newTasks }).eq('id', project.id);
  };

  const toggleTask = (taskId: string) => {
    const newTasks = tasks.map(t => 
      t.id === taskId ? { ...t, done: !t.done, updatedBy: user.nom, updatedAt: new Date().toISOString() } : t
    );
    updateTasks(newTasks);
  };

  const handleSaveNotes = async () => {
    setIsSaving(true);
    await supabase.from('chantiers').update({ notes: notes }).eq('id', project.id);
    setIsSaving(false);
    alert("Notes enregistrées !");
  };

  return (
    <div className="p-4 space-y-6 pb-24 max-w-5xl mx-auto">
      {/* HEADER AVANCEMENT */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Avancement</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mise à jour en direct</p>
          </div>
          <div className="text-right">
            <span className="text-5xl font-black text-blue-600">{progress}%</span>
          </div>
        </div>
        <div className="w-full h-5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
          <div className="h-full bg-blue-600 transition-all duration-1000 ease-out" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LISTE DES TÂCHES */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <CheckSquare className="text-blue-500" /> ACTIONS À RÉALISER
          </h3>
          <div className="space-y-3">
            {tasks.length > 0 ? tasks.map(task => (
              <button key={task.id} onClick={() => toggleTask(task.id)}
                className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${
                  task.done ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-transparent text-slate-600'
                }`}>
                {task.done ? <CheckCircle2 className="fill-green-500 text-white" /> : <div className="w-6 h-6 rounded-full border-2 border-slate-300" />}
                <div className="text-left">
                    <p className="font-bold">{task.label}</p>
                    {task.done && <p className="text-[10px] opacity-70 uppercase font-black">Fait par {task.updatedBy}</p>}
                </div>
              </button>
            )) : <p className="text-slate-400 font-bold text-center py-10">Aucune tâche définie.</p>}
          </div>
        </div>

        {/* ALBUM PHOTOS */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Camera className="text-orange-500" /> PHOTOS TERRAIN
            </h3>
            <label className="bg-orange-500 text-white p-3 rounded-xl cursor-pointer hover:bg-orange-600 transition-all shadow-lg shadow-orange-200">
              <Plus />
              <input type="file" accept="image/*" className="hidden" onChange={() => {}} />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {photos.map((p, i) => (
              <div key={i} className="aspect-square rounded-xl bg-slate-100 overflow-hidden relative group cursor-pointer" onClick={() => setSelectedPhoto(p.url)}>
                <img src={p.url} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Maximize2 className="text-white" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* JOURNAL DE BORD */}
      <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
           <BookOpen className="text-orange-400 w-8 h-8" />
           <h3 className="text-2xl font-black uppercase tracking-tight">Journal de bord</h3>
        </div>
        <textarea 
          value={notes} 
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Météo, problèmes rencontrés, visites client..."
          className="w-full bg-white/5 border-none rounded-2xl p-6 text-lg font-medium focus:ring-2 focus:ring-orange-500 min-h-[150px] placeholder:text-slate-600"
        />
        <button 
          onClick={handleSaveNotes}
          disabled={isSaving}
          className="mt-4 w-full py-5 bg-orange-500 text-white rounded-2xl font-black text-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-3"
        >
          {isSaving ? <Loader2 className="animate-spin" /> : <Send />}
          SAUVEGARDER DANS LE DOSSIER
        </button>
      </div>

      {/* LIGHTBOX */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
          <button className="absolute top-8 right-8 text-white bg-white/10 p-3 rounded-full hover:bg-white/20"><X size={32}/></button>
          <img src={selectedPhoto} className="max-w-full max-h-[90vh] rounded-lg shadow-2xl border-4 border-white/10" />
        </div>
      )}
    </div>
  );
}