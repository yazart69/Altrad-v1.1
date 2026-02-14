"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  CheckCircle2, 
  Circle, 
  ArrowUpRight, 
  ListTodo, 
  Clock, 
  ChevronDown, 
  ChevronRight, 
  Building2,
  CheckSquare,
  Square
} from 'lucide-react';
import Link from 'next/link';

export default function TasksTile() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // États pour gérer l'ouverture des accordéons
  const [expandedChantiers, setExpandedChantiers] = useState<string[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);

  // --- RÉCUPÉRATION ET GROUPEMENT DES TÂCHES ---
  const fetchTasks = async () => {
    // On récupère TOUTES les tâches (même finies) pour qu'elles ne disparaissent pas
    const { data, error } = await supabase
      .from('chantier_tasks')
      .select('*, chantiers(id, nom)')
      .order('done', { ascending: true }) // Les non-finies en premier
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Erreur fetch tasks:", error);
      return;
    }

    if (data) {
      // Groupement par chantier
      const grouped = data.reduce((acc: any, task: any) => {
        const chantierId = task.chantier_id || 'general';
        const chantierNom = task.chantiers?.nom || 'Sans Chantier';
        
        if (!acc[chantierId]) {
          acc[chantierId] = {
            id: chantierId,
            nom: chantierNom,
            items: []
          };
        }
        acc[chantierId].items.push(task);
        return acc;
      }, {});

      setTasks(Object.values(grouped));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
    // Synchro auto
    const interval = setInterval(fetchTasks, 10000);
    return () => clearInterval(interval);
  }, []);

  // --- LOGIQUE DE RECALCUL DU BUDGET ---
  const recalculateChantierHours = async (chantierId: string) => {
    if (!chantierId || chantierId === 'general') return;

    const { data: allTasks } = await supabase
      .from('chantier_tasks')
      .select('objectif_heures, done, subtasks')
      .eq('chantier_id', chantierId);

    if (allTasks) {
      let totalConsumed = 0;
      allTasks.forEach((t: any) => {
        if (t.subtasks && t.subtasks.length > 0) {
          t.subtasks.forEach((st: any) => {
            if (st.done) totalConsumed += (parseFloat(st.heures) || 0);
          });
        } else {
          if (t.done) totalConsumed += (t.objectif_heures || 0);
        }
      });

      await supabase
        .from('chantiers')
        .update({ heures_consommees: totalConsumed })
        .eq('id', chantierId);
    }
  };

  // --- ACTIONS ---
  const toggleChantier = (id: string) => {
    setExpandedChantiers(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleTaskExpansion = (id: string) => {
    setExpandedTasks(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // --- LOGIQUE INTELLIGENTE DE COCHAGE ---
  
  // 1. Inverser l'état d'une tâche principale (Cascade vers le bas)
  const toggleMainTask = async (task: any) => {
    const newStatus = !task.done;
    
    // Si on termine la tâche principale, on termine TOUTES les sous-tâches
    const updatedSubtasks = (task.subtasks || []).map((st: any) => ({
      ...st,
      done: newStatus
    }));

    const { error } = await supabase
      .from('chantier_tasks')
      .update({ 
        done: newStatus,
        subtasks: updatedSubtasks
      })
      .eq('id', task.id);

    if (!error) {
      await recalculateChantierHours(task.chantier_id);
      fetchTasks(); 
    }
  };

  // 2. Inverser l'état d'une sous-tâche (Intelligence vers le haut)
  const toggleSubTask = async (task: any, subtaskId: number) => {
    const updatedSubtasks = task.subtasks.map((st: any) => 
      st.id === subtaskId ? { ...st, done: !st.done } : st
    );

    // Vérification : est-ce que TOUTES les sous-tâches sont maintenant à TRUE ?
    const allSubtasksDone = updatedSubtasks.every((st: any) => st.done);
    
    const { error } = await supabase
      .from('chantier_tasks')
      .update({ 
        subtasks: updatedSubtasks,
        done: allSubtasksDone // La tâche principale se coche si tout est fini
      })
      .eq('id', task.id);

    if (!error) {
      await recalculateChantierHours(task.chantier_id);
      fetchTasks();
    }
  };

  return (
    <div className="h-full w-full bg-[#34495e] rounded-[25px] flex flex-col shadow-lg overflow-hidden p-6 font-['Fredoka'] text-white relative group border border-white/5 transition-all duration-300">
      
      {/* HEADER */}
      <div className="flex justify-between items-start mb-6 z-10">
        <div>
          <h2 className="text-[24px] font-black uppercase tracking-tight leading-none text-white">
            Actions <span className="text-[#ff9f43]">Prioritaires</span>
          </h2>
          <p className="text-[10px] opacity-60 font-bold mt-1 uppercase tracking-widest">
            Suivi des objectifs par chantier
          </p>
        </div>
        <div className="bg-white/10 p-2 rounded-xl">
           <ListTodo size={20} className="text-[#ff9f43]" />
        </div>
      </div>

      {/* LISTE DES CHANTIERS & TÂCHES */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 z-10 space-y-3">
        {loading ? (
          <div className="space-y-3">
             {[1,2,3].map(i => <div key={i} className="h-14 bg-white/5 animate-pulse rounded-2xl"></div>)}
          </div>
        ) : tasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30 italic">
            <CheckCircle2 size={40} className="mb-2" />
            <p className="font-bold text-sm">Aucune tâche créée</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((chantierGroup: any) => (
              <div key={chantierGroup.id} className="bg-white/5 rounded-2xl overflow-hidden border border-white/5">
                
                {/* LIGNE CHANTIER */}
                <div 
                  onClick={() => toggleChantier(chantierGroup.id)}
                  className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#ff9f43]/20 rounded-lg">
                      <Building2 size={16} className="text-[#ff9f43]" />
                    </div>
                    <span className="font-black uppercase text-sm tracking-wide">{chantierGroup.nom}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {expandedChantiers.includes(chantierGroup.id) ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                  </div>
                </div>

                {/* LISTE DES TÂCHES DU CHANTIER */}
                {expandedChantiers.includes(chantierGroup.id) && (
                  <div className="bg-black/20 p-2 space-y-2">
                    {chantierGroup.items.map((task: any) => (
                      <div 
                        key={task.id} 
                        className={`rounded-xl border transition-all duration-300 ${
                          task.done 
                          ? 'bg-white/5 border-transparent opacity-60' 
                          : 'bg-white/10 border-white/10'
                        } overflow-hidden`}
                      >
                        
                        <div className="flex items-center p-3 gap-3">
                          {/* Checkbox Tâche Principale */}
                          <button 
                            onClick={() => toggleMainTask(task)}
                            className={`transition-colors ${task.done ? 'text-[#00b894]' : 'text-white/30 hover:text-white'}`}
                          >
                            {task.done ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                          </button>

                          <div 
                            className="flex-1 cursor-pointer"
                            onClick={() => toggleTaskExpansion(task.id)}
                          >
                            <div className="flex justify-between items-center">
                              <p className={`text-[13px] font-bold uppercase ${task.done ? 'line-through text-gray-400' : 'text-white'}`}>
                                {task.label}
                              </p>
                              <div className="flex items-center gap-2">
                                {task.subtasks?.length > 0 && (
                                  <span className="text-[10px] font-black bg-white/5 px-2 py-0.5 rounded text-gray-400">
                                    {task.subtasks.filter((s:any) => s.done).length}/{task.subtasks.length}
                                  </span>
                                )}
                                {task.subtasks?.length > 0 && (
                                  expandedTasks.includes(task.id) ? <ChevronDown size={14}/> : <ChevronRight size={14}/>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* LISTE DES SOUS-TÂCHES */}
                        {expandedTasks.includes(task.id) && task.subtasks?.length > 0 && (
                          <div className="px-10 pb-3 space-y-2 border-t border-white/5 pt-3 bg-black/10">
                            {task.subtasks.map((st: any) => (
                              <div 
                                key={st.id} 
                                onClick={() => toggleSubTask(task, st.id)}
                                className="flex items-center justify-between group/st cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  {st.done ? 
                                    <CheckSquare size={14} className="text-[#00b894]" /> : 
                                    <Square size={14} className="text-white/20 group-hover/st:text-white/50" />
                                  }
                                  <span className={`text-[11px] font-medium ${st.done ? 'line-through text-gray-500' : 'text-white/70'}`}>
                                    {st.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 opacity-40 text-[9px] font-bold">
                                  <Clock size={10} />
                                  <span>{st.heures}h</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="mt-4 pt-4 border-t border-white/10 z-10">
        <Link href="/taches">
          <button className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2">
            Ouvrir la gestion complète
            <ArrowUpRight size={14} />
          </button>
        </Link>
      </div>

      <ListTodo size={200} className="absolute -right-10 -bottom-10 opacity-5 rotate-12 pointer-events-none group-hover:rotate-0 transition-transform duration-700" />
    </div>
  );
}
