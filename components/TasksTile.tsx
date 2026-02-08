"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';

// On définit à quoi ressemble une tâche dans notre interface
interface TaskItem {
  label: string;
  done: boolean;
  chantierName: string; // On rajoute le nom du chantier pour savoir d'où vient la tâche
}

export default function TasksTile() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTasks() {
      try {
        // On récupère tous les chantiers qui ont des tâches
        const { data, error } = await supabase
          .from('chantiers')
          .select('nom, tasks');

        if (error) throw error;

        if (data) {
          // On transforme la liste des chantiers en une liste unique de tâches
          const allTasks: TaskItem[] = [];

          data.forEach((chantier: any) => {
            if (chantier.tasks && Array.isArray(chantier.tasks)) {
              chantier.tasks.forEach((t: any) => {
                // On ajoute la tâche à la liste globale
                allTasks.push({
                  label: t.label,
                  done: t.done,
                  chantierName: chantier.nom
                });
              });
            }
          });

          // On affiche d'abord les tâches non terminées
          setTasks(allTasks.sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1)));
        }
      } catch (error) {
        console.error("Erreur chargement tâches:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTasks();
  }, []);

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
          <p className="text-white/50 text-sm animate-pulse">Chargement des tâches...</p>
        ) : tasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-50">
            <CheckCircle2 size={40} className="mb-2" />
            <p>Aucune action en cours</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task, i) => (
              <div 
                key={i} 
                className={`group p-3 rounded-xl transition-all duration-200 border border-white/5 ${
                  task.done ? 'bg-white/5 opacity-60' : 'bg-white/10 hover:bg-white/15'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-1 ${task.done ? 'text-[#00b894]' : 'text-orange-400'}`}>
                    {task.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-[15px] font-bold leading-tight ${task.done ? 'line-through text-white/50' : 'text-white'}`}>
                      {task.label}
                    </p>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-white/40 mt-1">
                      {task.chantierName}
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
