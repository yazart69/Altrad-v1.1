"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, Circle, AlertCircle, Clock, ArrowUpRight, ListTodo } from 'lucide-react';
import Link from 'next/link';

export default function TasksTile() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fonction de récupération (CODE ORIGINAL CONSERVÉ)
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

  // Fonction de toggle (CODE ORIGINAL CONSERVÉ)
  const toggleTask = async (task: any) => {
    // Optimiste update : on l'enlève de la liste tout de suite car elle devient "faite"
    setTasks(tasks.filter(t => t.id !== task.id));
    await supabase.from('chantier_tasks').update({ done: true }).eq('id', task.id);
    fetchTasks(); // Rafraîchissement pour être sûr
  };

  return (
    <div className="h-full w-full bg-[#34495e] rounded-[25px] flex flex-col shadow-lg overflow-hidden p-6 font-['Fredoka'] text-white relative group border border-white/5 hover:scale-[1.01] transition-transform duration-300">
      
      {/* HEADER HARMONISÉ */}
      <div className="flex justify-between items-start mb-6 z-10">
        <div>
          <h2 className="text-[24px] font-black uppercase tracking-tight leading-none text-white">
            Actions <span className="text-[#ff9f43]">Prioritaires</span>
          </h2>
          <p className="text-[10px] opacity-60 font-bold mt-1 uppercase tracking-widest">
            To-Do List Hebdo
          </p>
        </div>
        <div className="bg-white/10 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
           <ArrowUpRight size={20} />
        </div>
      </div>

      {/* LISTE DES TÂCHES */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 z-10">
        {loading ? (
          <div className="space-y-3">
             {[1,2,3].map(i => <div key={i} className="h-12 bg-white/10 animate-pulse rounded-xl"></div>)}
          </div>
        ) : tasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-50">
            <CheckCircle2 size={40} className="mb-2 text-[#00b894]" />
            <p className="font-bold text-sm">Aucune action en attente !</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task, i) => (
              <div 
                key={i} 
                onClick={() => toggleTask(task)}
                className="group/item p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200 border border-white/5 cursor-pointer select-none flex items-center gap-3"
              >
                <div className="shrink-0 text-white/30 group-hover/item:text-[#ff9f43] transition-colors">
                  <Circle size={20} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold leading-tight text-white truncate">
                    {task.label}
                  </p>
                  <div className="flex justify-between items-center mt-1">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-white/50">
                        {task.chantiers?.nom || 'Général'}
                      </p>
                      
                      {/* Affichage de l'objectif heures si défini */}
                      {task.objectif_heures > 0 && (
                          <span className="text-[9px] bg-[#0984e3] px-1.5 py-0.5 rounded text-white font-bold flex items-center gap-1">
                              <Clock size={10} /> {task.objectif_heures}h
                          </span>
                      )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER / CTA (AJOUTÉ POUR L'HARMONIE) */}
      <div className="mt-4 pt-4 border-t border-white/10 z-10">
        <Link href="/taches">
          <button className="w-full py-3 bg-[#ff9f43] hover:bg-[#ee8f32] text-white rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-orange-900/20 hover:shadow-orange-900/40 transition-all flex items-center justify-center gap-2">
            <ListTodo size={16} />
            Voir toutes les tâches
          </button>
        </Link>
      </div>

      {/* DÉCORATION FOND HARMONISÉE */}
      <ListTodo size={200} className="absolute -right-10 -bottom-10 opacity-5 rotate-12 pointer-events-none group-hover:rotate-0 transition-transform duration-700" />
    </div>
  );
}
