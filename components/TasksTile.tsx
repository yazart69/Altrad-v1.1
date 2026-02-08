"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, Circle, AlertCircle, Plus } from 'lucide-react';

export default function TasksTile() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les tâches
  const fetchTasks = async () => {
    const { data } = await supabase
      .from('chantier_tasks')
      .select('*, chantiers(nom)')
      .order('done', { ascending: true }) // Les tâches "à faire" en premier
      .order('created_at', { ascending: false })
      .limit(10); // On affiche les 10 plus récentes
    
    if (data) setTasks(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
    // Rafraichir toutes les 5 secondes pour voir si un collègue a coché un truc
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, []);

  // Action : Cocher / Décocher
  const toggleTask = async (task: any) => {
    // 1. Mise à jour optimiste (pour que ce soit instantané à l'écran)
    const newStatus = !task.done;
    setTasks(tasks.map(t => t.id === task.id ? { ...t, done: newStatus } : t));

    // 2. Envoi à Supabase
    await supabase.from('chantier_tasks').update({ done: newStatus }).eq('id', task.id);
    
    // 3. Petit re-fetch pour être sûr
    fetchTasks();
  };

  return (
    <div className="h-full w-full bg-[#2d3436] rounded-[25px] flex flex-col shadow-sm overflow-hidden p-6 font-['Fredoka'] text-white">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[28px] font-black uppercase tracking-tight leading-none text-white">
          Actions <br/> <span className="text-[#00b894]">Prioritaires</span>
        </h2>
        <div className="bg-white/10 p-2 rounded-full">
          <AlertCircle size={24} className="text-[#00b894]" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {loading ? (
          <p className="text-white/50 text-sm animate-pulse">Chargement...</p>
        ) : tasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-50">
            <CheckCircle2 size={40} className="mb-2" />
            <p>Tout est à jour !</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task, i) => (
              <div 
                key={i} 
                onClick={() => toggleTask(task)}
                className={`group p-3 rounded-xl transition-all duration-200 border border-white/5 cursor-pointer select-none ${
                  task.done ? 'bg-white/5 opacity-50' : 'bg-white/10 hover:bg-white/15'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-1 transition-colors ${task.done ? 'text-[#00b894]' : 'text-orange-400'}`}>
                    {task.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-[15px] font-bold leading-tight transition-all ${task.done ? 'line-through text-white/50' : 'text-white'}`}>
                      {task.label}
                    </p>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-white/40 mt-1">
                      {task.chantiers?.nom || 'Général'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
