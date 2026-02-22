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
  Square,
  User,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import Link from 'next/link';

export default function TasksTile() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [employes, setEmployes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // États pour gérer l'ouverture des accordéons
  const [expandedChantiers, setExpandedChantiers] = useState<string[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);

  // --- RÉCUPÉRATION DES DONNÉES ---
  const fetchData = async () => {
    // 1. Récupérer les employés pour l'attribution des responsables
    const { data: empData } = await supabase
      .from('employes')
      .select('id, nom, prenom')
      .order('nom');
    
    if (empData) setEmployes(empData);

    // 2. Récupérer les tâches groupées
    const { data, error } = await supabase
      .from('chantier_tasks')
      .select('*, chantiers(id, nom), employes!responsable_id(nom, prenom)')
      .order('done', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Erreur fetch tasks:", error);
      return;
    }

    if (data) {
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
    fetchData();
    const interval = setInterval(fetchData, 15000); // Rafraîchissement plus lent pour économiser les ressources
    return () => clearInterval(interval);
  }, []);

  // --- LOGIQUE DE RECALCUL DU BUDGET CHANTIER ---
  const recalculateChantierHours = async (chantierId: string) => {
    if (!chantierId || chantierId === 'general') return;

    const { data: allTasks } = await supabase
      .from('chantier_tasks')
      .select('objectif_heures, heures_reelles, done')
      .eq('chantier_id', chantierId);

    if (allTasks) {
      // On calcule sur la base du réel si dispo, sinon sur le prévu pour les tâches finies
      const totalConsumed = allTasks
        .filter(t => t.done)
        .reduce((sum, t) => sum + (parseFloat(t.heures_reelles) || t.objectif_heures || 0), 0);

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

  const updateResponsable = async (taskId: string, responsableId: string) => {
    await supabase
      .from('chantier_tasks')
      .update({ responsable_id: responsableId === "" ? null : responsableId })
      .eq('id', taskId);
    fetchData();
  };

  const updateRealHours = async (taskId: string, hours: number, chantierId: string) => {
    await supabase
      .from('chantier_tasks')
      .update({ heures_reelles: hours })
      .eq('id', taskId);
    await recalculateChantierHours(chantierId);
  };

  const toggleMainTask = async (task: any) => {
    const newStatus = !task.done;
    const updatedSubtasks = (task.subtasks || []).map((st: any) => ({ ...st, done: newStatus }));

    const { error } = await supabase
      .from('chantier_tasks')
      .update({ 
        done: newStatus,
        subtasks: updatedSubtasks,
        heures_reelles: newStatus ? (task.heures_reelles || task.objectif_heures) : 0
      })
      .eq('id', task.id);

    if (!error) {
      await recalculateChantierHours(task.chantier_id);
      fetchData(); 
    }
  };

  const toggleSubTask = async (task: any, subtaskId: number) => {
    const updatedSubtasks = task.subtasks.map((st: any) => 
      st.id === subtaskId ? { ...st, done: !st.done } : st
    );
    const allSubtasksDone = updatedSubtasks.every((st: any) => st.done);
    
    const { error } = await supabase
      .from('chantier_tasks')
      .update({ 
        subtasks: updatedSubtasks,
        done: allSubtasksDone,
        heures_reelles: allSubtasksDone ? (task.heures_reelles || task.objectif_heures) : task.heures_reelles
      })
      .eq('id', task.id);

    if (!error) {
      await recalculateChantierHours(task.chantier_id);
      fetchData();
    }
  };

  return (
    <div className="h-full w-full bg-[#34495e] rounded-[25px] flex flex-col shadow-lg overflow-hidden p-6 font-['Fredoka'] text-white relative group border border-white/5 transition-all duration-300">
      
      {/* HEADER RENDU CLIQUABLE AVEC FLÈCHE */}
      <div className="flex justify-between items-start mb-6 z-10">
        <Link href="/chantier" className="group/title flex items-center gap-3 cursor-pointer">
          <div>
            <h2 className="text-[24px] font-black uppercase tracking-tight leading-none text-white">
              Actions <span className="text-[#ff9f43]">Prioritaires</span>
            </h2>
            <p className="text-[10px] opacity-60 font-bold mt-1 uppercase tracking-widest">
              Analyse de rentabilité & Responsabilités
            </p>
          </div>
          <div className="opacity-0 group-hover/title:opacity-100 transition-opacity bg-white/20 p-1.5 rounded-full text-white">
             <ArrowUpRight size={16} />
          </div>
        </Link>
        <div className="bg-white/10 p-2 rounded-xl">
           <ListTodo size={20} className="text-[#ff9f43]" />
        </div>
      </div>

      {/* LISTE DES CHANTIERS & TÂCHES */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 z-10 space-y-4">
        {loading ? (
          <div className="space-y-3">
             {[1,2,3].map(i => <div key={i} className="h-16 bg-white/5 animate-pulse rounded-2xl"></div>)}
          </div>
        ) : tasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30 italic">
            <CheckCircle2 size={40} className="mb-2" />
            <p className="font-bold text-sm">Prêt pour de nouveaux objectifs</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((chantierGroup: any) => {
              // Calcul de la progression globale du chantier pour afficher la barre ici
              const totalTasks = chantierGroup.items.length;
              const doneTasks = chantierGroup.items.filter((t: any) => t.done).length;
              const globalProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

              return (
              <div key={chantierGroup.id} className="bg-white/5 rounded-[22px] overflow-hidden border border-white/5">
                
                {/* LIGNE CHANTIER (NIVEAU 1) AVEC BARRE PROGRESSION GLOBALE */}
                <div 
                  onClick={() => toggleChantier(chantierGroup.id)}
                  className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-2 bg-[#ff9f43]/20 rounded-lg text-[#ff9f43] shrink-0">
                      <Building2 size={18} />
                    </div>
                    <div className="flex flex-col flex-1 max-w-[200px] md:max-w-[300px]">
                      <span className="font-black uppercase text-sm tracking-wide truncate">{chantierGroup.nom}</span>
                      
                      {/* Barre de progression globale du chantier */}
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-[#ff9f43] transition-all duration-500" style={{ width: `${globalProgress}%` }}></div>
                        </div>
                        <span className="text-[9px] font-bold opacity-80 text-[#ff9f43]">{globalProgress}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 opacity-60 ml-4 shrink-0">
                    <span className="text-[10px] font-bold uppercase hidden sm:inline">{chantierGroup.items.length} actions</span>
                    {expandedChantiers.includes(chantierGroup.id) ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                  </div>
                </div>

                {/* LISTE DES TÂCHES DU CHANTIER (NIVEAU 2) */}
                {expandedChantiers.includes(chantierGroup.id) && (
                  <div className="bg-black/10 p-2 space-y-3">
                    {chantierGroup.items.map((task: any) => {
                      const delta = (task.objectif_heures || 0) - (task.heures_reelles || 0);
                      const hasDelta = task.done && task.heures_reelles > 0;

                      return (
                      <div 
                        key={task.id} 
                        className={`rounded-[18px] border transition-all duration-300 ${
                          task.done 
                          ? 'bg-white/5 border-transparent' 
                          : 'bg-white/10 border-white/5'
                        } overflow-hidden`}
                      >
                        {/* Ligne principale de la tâche */}
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <button 
                              onClick={() => toggleMainTask(task)}
                              className={`mt-0.5 transition-colors ${task.done ? 'text-[#00b894]' : 'text-white/30 hover:text-white'}`}
                            >
                              {task.done ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-2">
                                <p className={`text-[14px] font-black uppercase tracking-tight ${task.done ? 'line-through text-gray-500' : 'text-white'}`}>
                                  {task.label}
                                </p>
                                
                                {/* Delta Badge */}
                                {hasDelta && (
                                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${delta >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {delta >= 0 ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
                                    {Math.abs(delta).toFixed(1)}h
                                  </div>
                                )}
                              </div>

                              {/* Responsable & Heures */}
                              <div className="flex flex-wrap items-center gap-3">
                                {/* Select Responsable */}
                                <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-lg">
                                  <User size={12} className="text-[#ff9f43]" />
                                  <select 
                                    className="bg-transparent text-[10px] font-bold text-white/70 outline-none cursor-pointer"
                                    value={task.responsable_id || ""}
                                    onChange={(e) => updateResponsable(task.id, e.target.value)}
                                  >
                                    <option value="" className="text-gray-800">Assigner...</option>
                                    {employes.map(e => (
                                      <option key={e.id} value={e.id} className="text-gray-800">{e.nom} {e.prenom}</option>
                                    ))}
                                  </select>
                                </div>

                                {/* Heures Prévues */}
                                <div className="flex items-center gap-1 text-[10px] font-bold text-white/40">
                                  <Clock size={12} />
                                  <span>Prévu: {task.objectif_heures}h</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Zone de saisie du Réel si Tâche Finie (Aucune barre affichée) */}
                          {task.done && (
                            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase text-[#ff9f43]">Heures Réelles :</span>
                                <input 
                                  type="number"
                                  className="w-16 bg-white/10 border border-white/10 rounded-md px-2 py-1 text-xs font-black text-white outline-none focus:border-[#ff9f43]"
                                  defaultValue={task.heures_reelles || task.objectif_heures}
                                  onBlur={(e) => updateRealHours(task.id, parseFloat(e.target.value) || 0, task.chantier_id)}
                                />
                              </div>
                            </div>
                          )}
                          
                          <button 
                            onClick={() => toggleTaskExpansion(task.id)}
                            className="w-full mt-2 text-[9px] font-bold uppercase text-white/20 hover:text-white/50 transition-colors flex items-center justify-center gap-1"
                          >
                            {task.subtasks?.length > 0 ? (expandedTasks.includes(task.id) ? 'Masquer détails' : 'Voir les sous-tâches') : ''}
                          </button>
                        </div>

                        {/* LISTE DES SOUS-TÂCHES (NIVEAU 3) */}
                        {expandedTasks.includes(task.id) && task.subtasks?.length > 0 && (
                          <div className="px-6 pb-4 space-y-2 bg-black/20 border-t border-white/5 pt-3">
                            {task.subtasks.map((st: any) => (
                              <div 
                                key={st.id} 
                                onClick={() => toggleSubTask(task, st.id)}
                                className="flex items-center justify-between group/st cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-all"
                              >
                                <div className="flex items-center gap-3">
                                  {st.done ? 
                                    <CheckSquare size={16} className="text-[#00b894]" /> : 
                                    <Square size={16} className="text-white/20 group-hover/st:text-white/40" />
                                  }
                                  <span className={`text-[12px] font-medium ${st.done ? 'line-through text-gray-500' : 'text-white/80'}`}>
                                    {st.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-white/30">
                                  <span>{st.heures}h</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )})}
                  </div>
                )}
              </div>
            )})}
          </div>
        )}
      </div>

      {/* FOOTER ANALYTIQUE */}
      <div className="mt-4 pt-4 border-t border-white/10 z-10 flex gap-2">
        <Link href="/planning" className="flex-1">
          <button className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 border border-white/5">
            Rapport de Pointage
            <ArrowUpRight size={14} />
          </button>
        </Link>
      </div>

      <ListTodo size={250} className="absolute -right-20 -bottom-20 opacity-5 rotate-12 pointer-events-none group-hover:rotate-0 transition-transform duration-700 text-white" />
    </div>
  );
}
