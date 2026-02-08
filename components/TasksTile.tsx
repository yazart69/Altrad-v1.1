"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, Circle, AlertCircle, Clock } from 'lucide-react';

export default function TasksTile() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    const { data } = await supabase
      .from('chantier_tasks')
      .select('*, chantiers(nom)')
      .eq('done', false) // FILTRE STRICT : Uniquement ce qui n'est PAS fait
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) setTasks(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleTask = async (task: any) => {
    // Optimiste update : on l'enlève de la liste tout de suite car elle devient "faite"
    setTasks(tasks.filter(t => t.id !== task.id));
    await supabase.from('chantier_tasks').update({ done: true }).eq('id', task.id);
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
            <p>Aucune action en attente !</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task, i) => (
              <div 
                key={i} 
                onClick={() => toggleTask(task)}
                className="group p-3 rounded-xl bg-white/10 hover:bg-white/15 transition-all duration-200 border border-white/5 cursor-pointer select-none"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 text-orange-400">
                    <Circle size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[15px] font-bold leading-tight text-white">
                      {task.label}
                    </p>
                    <div className="flex justify-between items-center mt-1">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">
                        {task.chantiers?.nom || 'Général'}
                        </p>
                        {/* Affichage de l'objectif heures si défini */}
                        {task.objectif_heures > 0 && (
                            <span className="text-[10px] bg-[#0984e3] px-2 py-0.5 rounded text-white font-bold flex items-center gap-1">
                                <Clock size={10} /> {task.objectif_heures}h
                            </span>
                        )}
                    </div>
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
