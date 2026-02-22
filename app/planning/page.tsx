"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ChevronLeft, ChevronRight, HardHat, Plus, 
  Printer, Trash2, Activity, 
  X, Loader2, Eraser, CalendarDays, Save, Check,
  Crown, UserCog, UserCheck, UserX, Users, Lock, AlertCircle, CheckCircle2, CloudRain
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface IEmploye {
  id: string;
  nom: string;
  prenom: string;
  role: string;
}

interface IChantier {
  id: string;
  nom: string;
  adresse: string;
  statut: string;
  numero_otp?: string;
  horaires?: string;
}

interface IAssignment {
  id: string;
  employe_id: string;
  chantier_id: string | null;
  date_debut: string;
  date_fin: string;
  type: string;
  heures: number;
  odm_envoye: boolean;
  users?: IEmploye;
  chantiers?: { nom: string };
}

interface IModalConfig {
  isOpen: boolean;
  chantierId: string | null;
  date: Date | null;
  typeContext: 'chantier' | 'hors_chantier';
}

// ============================================================================
// HELPERS
// ============================================================================

const toLocalISOString = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
  return adjustedDate.toISOString().split('T')[0];
};

const getWeekNumber = (d: Date) => {
    const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    target.setUTCDate(target.getUTCDate() + 4 - (target.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const getRoleConfig = (role?: string) => {
    switch(role) {
        case 'chef_chantier_interne': return { label: 'Chef Chantier (Int)', cardClass: 'bg-purple-100 border-purple-200 text-purple-900', badgeClass: 'bg-purple-100 text-purple-700', icon: <Crown size={12} className="text-purple-600"/> };
        case 'chef_chantier_altrad': return { label: 'Chef Chantier (Alt)', cardClass: 'bg-fuchsia-100 border-fuchsia-200 text-fuchsia-900', badgeClass: 'bg-fuchsia-100 text-fuchsia-700', icon: <Crown size={12} className="text-fuchsia-600"/> };
        case 'chef_equipe_interne': return { label: "Chef Équipe (Int)", cardClass: 'bg-indigo-100 border-indigo-200 text-indigo-900', badgeClass: 'bg-indigo-100 text-indigo-700', icon: <UserCog size={12} className="text-indigo-600"/> };
        case 'chef_equipe_altrad': return { label: "Chef Équipe (Alt)", cardClass: 'bg-violet-100 border-violet-200 text-violet-900', badgeClass: 'bg-violet-100 text-violet-700', icon: <UserCog size={12} className="text-violet-600"/> };
        case 'operateur_interne': return { label: 'Opérateur (Int)', cardClass: 'bg-blue-100 border-blue-200 text-blue-900', badgeClass: 'bg-blue-100 text-blue-700', icon: <HardHat size={12} className="text-blue-500"/> };
        case 'operateur_altrad': return { label: 'Opérateur (Alt)', cardClass: 'bg-cyan-100 border-cyan-200 text-cyan-900', badgeClass: 'bg-cyan-100 text-cyan-700', icon: <HardHat size={12} className="text-cyan-500"/> };
        case 'interimaire': return { label: 'Intérimaire', cardClass: 'bg-orange-100 border-orange-200 text-orange-900', badgeClass: 'bg-orange-100 text-orange-700', icon: <UserCheck size={12} className="text-orange-500"/> };
        case 'sous_traitant': return { label: 'Sous-Traitant', cardClass: 'bg-gray-100 border-gray-200 text-gray-700', badgeClass: 'bg-gray-100 text-gray-600', icon: <UserX size={12} className="text-gray-500"/> };
        default: return { label: 'Autre', cardClass: 'bg-gray-50 border-gray-200 text-gray-500', badgeClass: 'bg-gray-50 text-gray-500', icon: <Users size={12} /> };
    }
};

// ============================================================================
// HOOK METIER : DATA & API
// ============================================================================

function usePlanningData() {
  const [employes, setEmployes] = useState<IEmploye[]>([]);
  const [chantiers, setChantiers] = useState<IChantier[]>([]);
  const [assignments, setAssignments] = useState<IAssignment[]>([]);
  const [tasks, setTasks] = useState<any[]>([]); // NOUVEAU: Stockage des tâches globales
  const [loading, setLoading] = useState(true);

  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  });

  const weekDays = useMemo(() => Array.from({ length: 5 }, (_, i) => {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(start.setDate(diff));
    monday.setDate(monday.getDate() + i);
    return monday;
  }), [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
        const [empRes, chanRes, planRes, tasksRes] = await Promise.all([
            supabase.from('employes').select('*').order('nom'),
            supabase.from('chantiers').select('id, nom, adresse, statut, numero_otp, horaires').neq('statut', 'termine').order('nom'),
            supabase.from('planning').select('*, employes (id, nom, prenom, role), chantiers (nom)'),
            supabase.from('chantier_tasks').select('chantier_id, label, subtasks') // NOUVEAU : Récupération auto des tâches
        ]);

        if (empRes.data) setEmployes(empRes.data);
        if (chanRes.data) setChantiers(chanRes.data);
        if (tasksRes.data) setTasks(tasksRes.data);
        if (planRes.data) {
            const formattedPlan = planRes.data.map(p => ({ ...p, users: p.employes })) as IAssignment[];
            setAssignments(formattedPlan);
        }
    } catch (error) {
        console.error("Erreur Fetch:", error);
        toast.error("Erreur lors du chargement des données");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [currentDate]);

  const sortedChantiers = useMemo(() => {
    return [...chantiers].sort((a, b) => {
        const aHasAssign = assignments.some(ass => ass.chantier_id === a.id && weekDays.some(day => toLocalISOString(day) === ass.date_debut));
        const bHasAssign = assignments.some(ass => ass.chantier_id === b.id && weekDays.some(day => toLocalISOString(day) === ass.date_debut));
        
        if (aHasAssign && !bHasAssign) return -1;
        if (!aHasAssign && bHasAssign) return 1;
        return a.nom.localeCompare(b.nom);
    });
  }, [chantiers, assignments, weekDays]);

  const actions = {
    deleteAssignment: async (id: string) => {
      if(confirm("Retirer ce collaborateur ?")) {
        const toastId = toast.loading("Suppression...");
        const { error } = await supabase.from('planning').delete().eq('id', id);
        if (error) { toast.error("Erreur : " + error.message, { id: toastId }); } 
        else { toast.success("Affectation retirée", { id: toastId }); fetchData(); }
      }
    },
    resetWeek: async () => {
        if(!confirm("⚠️ ATTENTION : Cela va effacer TOUTES les affectations de cette semaine. Continuer ?")) return;
        const toastId = toast.loading("Réinitialisation de la semaine...");
        const startStr = toLocalISOString(weekDays[0]);
        const endStr = toLocalISOString(weekDays[4]);
        const { error } = await supabase.from('planning').delete().gte('date_debut', startStr).lte('date_debut', endStr);
        if (error) { toast.error("Erreur : " + error.message, { id: toastId }); } 
        else { toast.success("Semaine réinitialisée", { id: toastId }); fetchData(); }
    },
    saveAssignmentsBulk: async (newAssignments: any[]) => {
        const toastId = toast.loading("Enregistrement des affectations...");
        const { error } = await supabase.from('planning').insert(newAssignments);
        if (error) { toast.error("Erreur : " + error.message, { id: toastId }); return false; } 
        else { toast.success("Affectations validées !", { id: toastId }); fetchData(); return true; }
    }
  };

  return { currentDate, setCurrentDate, weekDays, employes, sortedChantiers, assignments, tasks, loading, actions };
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function PlanningPage() {
  const { currentDate, setCurrentDate, weekDays, employes, sortedChantiers, assignments, tasks, loading, actions } = usePlanningData();
  const [modePointage, setModePointage] = useState(false); 
  const [modalConfig, setModalConfig] = useState<IModalConfig>({ isOpen: false, chantierId: null, date: null, typeContext: 'chantier' });

  const { totalAssigned, totalRequired, missingEmployes } = useMemo(() => {
    const totalReq = employes.length * 5; 
    let totalAss = 0;
    const missing = new Set<string>();

    employes.forEach(emp => {
        let empAssignedDays = 0;
        weekDays.forEach(day => {
            if (assignments.some(a => a.employe_id === emp.id && a.date_debut === toLocalISOString(day))) {
                totalAss++;
                empAssignedDays++;
            }
        });
        if (empAssignedDays === 0) missing.add(emp.id);
    });

    return { totalAssigned: totalAss, totalRequired: totalReq, missingEmployes: missing.size };
  }, [employes, assignments, weekDays]);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#00b894]" size={40} /></div>;

  return (
    <div className="min-h-screen bg-[#f0f3f4] p-4 md:p-6 font-['Fredoka'] ml-0 md:ml-0 transition-all text-gray-800 print:bg-white print:p-0 print:m-0 print:min-h-0 print:w-full print:absolute print:top-0 print:left-0 z-50">
      <Toaster position="bottom-right" toastOptions={{ style: { fontFamily: 'Fredoka', fontWeight: 'bold' } }} />

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: landscape; margin: 5mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          aside, nav, header, .sidebar, .navbar { display: none !important; } 
          .no-print { display: none !important; }
        }
      `}} />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-black uppercase text-[#2d3436] tracking-tight">
              <span>Planning <span className="text-[#00b894]">Chantiers</span></span>
          </h1>
          <div className="mt-2 flex items-center gap-3">
              <div className="bg-white border border-gray-200 rounded-lg px-3 py-1 flex items-center gap-2 shadow-sm">
                  <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all" style={{ width: `${Math.min(100, (totalAssigned/totalRequired)*100)}%` }}></div>
                  </div>
                  <span className="text-[10px] font-black text-gray-500">{totalAssigned} / {totalRequired} Jours planifiés</span>
              </div>
              {missingEmployes === 0 && totalAssigned > 0 ? (
                  <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-1 rounded text-[10px] font-black uppercase flex items-center gap-1">
                      <CheckCircle2 size={12}/> Équipe 100% assignée
                  </span>
              ) : (
                  <span className="bg-orange-50 text-orange-600 border border-orange-200 px-2 py-1 rounded text-[10px] font-black uppercase flex items-center gap-1">
                      <AlertCircle size={12}/> {missingEmployes} gars dispo
                  </span>
              )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center">
            <button onClick={actions.resetWeek} className="bg-red-50 text-red-500 border border-red-100 px-4 py-2 rounded-xl font-bold uppercase text-xs hover:bg-red-100 flex items-center gap-2 transition-colors">
                <Eraser size={16} /> Reset Semaine
            </button>
            <button onClick={() => window.print()} className="bg-[#2d3436] text-white px-4 py-2 rounded-xl font-bold uppercase text-xs hover:bg-black flex items-center gap-2 shadow-lg transition-transform hover:scale-105 active:scale-95">
                <Printer size={16} />
            </button>
            <div className="flex items-center bg-white rounded-xl p-1 shadow-sm border border-gray-200">
                <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ChevronLeft size={20}/></button>
                <div className="px-4 text-center min-w-[140px]">
                    <span className="block text-[10px] font-black uppercase text-gray-400">Semaine {getWeekNumber(weekDays[0])}</span>
                    <span className="block text-sm font-black text-gray-800">{weekDays[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>
                </div>
                <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ChevronRight size={20}/></button>
            </div>
        </div>
      </div>

      {/* HEADER IMPRESSION */}
      <div className="hidden print:flex justify-between items-center mb-4 border-b-2 border-black pb-2">
          <div>
            <h1 className="text-xl font-black uppercase">Planning - Semaine {getWeekNumber(weekDays[0])}</h1>
            <p className="text-xs text-gray-600">Du {weekDays[0].toLocaleDateString('fr-FR')} au {weekDays[4].toLocaleDateString('fr-FR')}</p>
          </div>
          <div className="text-right">
             <p className="text-[10px] uppercase font-bold text-gray-400">Généré le {new Date().toLocaleDateString()}</p>
          </div>
      </div>

      <PlanningTable 
        chantiers={sortedChantiers} 
        weekDays={weekDays} 
        assignments={assignments} 
        tasks={tasks}
        modePointage={modePointage}
        onDelete={actions.deleteAssignment}
        onOpenModal={(chantierId: string | null, date: Date, typeContext: 'chantier' | 'hors_chantier') => setModalConfig({ isOpen: true, chantierId, date, typeContext })}
      />

      {modalConfig.isOpen && modalConfig.date && (
        <AssignmentModal 
            config={modalConfig}
            employes={employes}
            assignments={assignments}
            onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
            onSaveBulk={actions.saveAssignmentsBulk}
        />
      )}
    </div>
  );
}

// ============================================================================
// SOUS-COMPOSANT : GRILLE DU PLANNING
// ============================================================================

function PlanningTable({ chantiers, weekDays, assignments, tasks, modePointage, onDelete, onOpenModal }: { chantiers: IChantier[], weekDays: Date[], assignments: IAssignment[], tasks: any[], modePointage: boolean, onDelete: (id: string) => void, onOpenModal: (chantierId: string | null, date: Date, typeContext: 'chantier' | 'hors_chantier') => void }) {
  
  const startStr = toLocalISOString(weekDays[0]);
  const endStr = toLocalISOString(weekDays[4]);

  return (
    <div className="bg-white rounded-[20px] shadow-sm overflow-hidden border border-gray-200 overflow-x-auto print:border-none print:shadow-none print:overflow-visible print:rounded-none">
        <table className="w-full min-w-[1000px] border-collapse text-left print:min-w-0 print:w-full print:table-fixed">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200 print:bg-white print:border-black print:border-b-2">
              <th className="p-4 w-[280px] sticky left-0 bg-gray-100 z-20 font-black uppercase text-xs text-gray-500 border-r border-gray-200 print:static print:bg-white print:text-black print:border print:border-black print:w-[220px]">
                Chantiers / Projets
              </th>
              {weekDays.map((day: Date, i: number) => (
                <th key={i} className="p-3 border-l border-gray-200 text-center min-w-[140px] print:border print:border-black print:min-w-0">
                  <p className="text-[10px] uppercase font-black text-gray-500 mb-1 print:text-black">{day.toLocaleDateString('fr-FR', { weekday: 'long' })}</p>
                  <span className="inline-block px-2 py-0.5 rounded text-sm font-black text-gray-800 bg-white border border-gray-200 print:border-0 print:text-lg">{day.getDate()}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 print:divide-black">
            
            {/* LIGNES CHANTIERS */}
            {chantiers.map((chantier: IChantier) => {
              const hasAssignments = assignments.some((a: IAssignment) => a.chantier_id === chantier.id && weekDays.some((day: Date) => toLocalISOString(day) === a.date_debut));

              // LECTURE AUTOMATIQUE DES TÂCHES DE LA SEMAINE
              const cTasks = tasks.filter((t: any) => t.chantier_id === chantier.id);
              const weeklyTasks = cTasks.flatMap((t: any) => {
                  return (t.subtasks || [])
                      .filter((st: any) => st.date >= startStr && st.date <= endStr)
                      .map((st: any) => `• ${st.label}`);
              });

              return (
              <tr key={chantier.id} className={`group hover:bg-gray-50 transition-colors print:break-inside-avoid ${hasAssignments ? '' : 'print:hidden'}`}>
                <td className="p-4 sticky left-0 bg-white z-10 border-r border-gray-200 group-hover:bg-gray-50 transition-colors print:static print:bg-white print:border print:border-black print:p-2 align-top">
                  
                  <div className="flex items-start gap-3">
                      <div className="bg-[#00b894] p-2 rounded-lg text-white mt-1 shrink-0"><HardHat size={18} /></div>
                      <div className="flex-1 min-w-0">
                          <p className="font-black text-gray-800 text-sm uppercase leading-tight print:text-xs truncate" title={chantier.nom}>{chantier.nom}</p>
                          
                          {/* OTP & Horaires */}
                          <div className="flex flex-col gap-0.5 mt-1">
                              {chantier.numero_otp && <p className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded w-fit uppercase">OTP: {chantier.numero_otp}</p>}
                              <p className="text-[10px] text-gray-500 uppercase truncate" title={chantier.adresse}>{chantier.adresse || 'Localisation non définie'}</p>
                              {chantier.horaires && <p className="text-[9px] text-gray-400 font-bold mt-0.5 flex items-center gap-1"><Clock size={10}/> {chantier.horaires}</p>}
                          </div>

                          {/* Zone Tâches auto-générée */}
                          <div className="mt-3 bg-gray-50 border border-gray-100 p-2 rounded-lg print:border-dashed print:bg-transparent">
                              <p className="text-[8px] font-black uppercase text-gray-400 mb-1 border-b border-gray-200 pb-0.5">Tâches planifiées</p>
                              <div className="text-[10px] text-gray-600 leading-snug max-h-[70px] overflow-y-auto custom-scrollbar print:max-h-none print:overflow-visible">
                                  {weeklyTasks.length > 0 ? (
                                      <ul className="space-y-0.5">
                                          {weeklyTasks.map((wt: string, idx: number) => (
                                              <li key={idx} className="truncate print:whitespace-normal" title={wt}>{wt}</li>
                                          ))}
                                      </ul>
                                  ) : (
                                      <span className="italic opacity-50 text-[9px]">Aucune tâche définie...</span>
                                  )}
                              </div>
                          </div>
                      </div>
                  </div>

                </td>
                
                {weekDays.map((day: Date, i: number) => {
                  const dateStr = toLocalISOString(day);
                  const dailyMissions = assignments.filter((a: IAssignment) => a.chantier_id === chantier.id && a.date_debut === dateStr);
                  
                  return (
                    <td key={i} className="p-2 border-l border-gray-100 align-top h-32 relative print:border print:border-black print:h-auto print:p-1">
                      <div className="flex flex-col gap-1.5 h-full">
                          {dailyMissions.map((mission: IAssignment) => {
                              const roleConfig = getRoleConfig(mission.users?.role);
                              const cardStyle = modePointage ? 'bg-orange-50 border-orange-100 text-gray-800' : roleConfig.cardClass;

                              return (
                              <div key={mission.id} className={`p-2 rounded-lg shadow-sm flex items-center justify-between group/card relative border ${cardStyle} print:shadow-none print:p-1`}>
                                  <div className="flex items-center gap-2 w-full">
                                      {!modePointage && <div className="shrink-0 print:text-black">{roleConfig.icon}</div>}
                                      <div className="flex-1 min-w-0">
                                          <span className={`text-[11px] font-bold uppercase truncate block print:text-[11px] print:whitespace-normal`}>
                                              {mission.users?.nom || 'Inconnu'} {mission.users?.prenom?.charAt(0) || ''}.
                                          </span>
                                          <div className="hidden print:block text-[8px] font-bold mt-0.5">
                                             {mission.heures > 0 ? `${mission.heures}h` : ''}
                                          </div>
                                      </div>
                                  </div>
                                  {!modePointage && (
                                      <div className="hidden group-hover/card:flex gap-1 print:hidden absolute right-1 top-1">
                                          <button onClick={(e) => {e.stopPropagation(); onDelete(mission.id)}} className="p-1 rounded-md bg-white/80 hover:bg-red-50 text-red-500 transition-colors shadow-sm">
                                              <Trash2 size={12} />
                                          </button>
                                      </div>
                                  )}
                              </div>
                              )
                          })}

                          {!modePointage && (
                              <button 
                                onClick={() => onOpenModal(chantier.id, day, 'chantier')}
                                className="mt-auto w-full py-1.5 border-2 border-dashed border-gray-200 rounded-lg text-gray-300 hover:border-[#00b894] hover:text-[#00b894] hover:bg-emerald-50 transition-all flex items-center justify-center print:hidden"
                              >
                                  <Plus size={14} />
                              </button>
                          )}
                      </div>
                    </td>
                  );
                })}
              </tr>
              );
            })}

            {/* SECTION HORS CHANTIER */}
            <tr className="bg-gray-50 border-t-4 border-white print:border-black print:border-t-2 print:bg-white print:break-inside-avoid">
                <td className="p-4 sticky left-0 bg-gray-50 z-10 border-r border-gray-200 print:static print:bg-white print:border print:border-black print:p-2 align-top">
                    <div className="flex items-center gap-3">
                        <div className="bg-gray-400 p-2 rounded-lg text-white"><Activity size={18} /></div>
                        <div>
                            <p className="font-black text-gray-600 text-xs uppercase leading-tight print:text-black">Hors Chantier</p>
                            <p className="text-[9px] text-gray-400 uppercase mt-0.5 print:text-gray-600">Absences / Formations / Intempéries</p>
                        </div>
                    </div>
                </td>
                {weekDays.map((day: Date, i: number) => {
                    const dateStr = toLocalISOString(day);
                    const dailyOffs = assignments.filter((a: IAssignment) => !a.chantier_id && a.date_debut === dateStr);
                    return (
                        <td key={i} className="p-2 border-l border-gray-200 align-top h-24 print:border print:border-black print:h-auto print:p-1">
                            <div className="flex flex-col gap-1.5">
                                {dailyOffs.map((mission: IAssignment) => {
                                    let color = "bg-gray-400";
                                    let icon = null;
                                    if(mission.type === 'conge') color = "bg-[#e17055]";
                                    if(mission.type === 'maladie') color = "bg-[#d63031]";
                                    if(mission.type === 'intemperie') { color = "bg-[#0984e3]"; icon = <CloudRain size={10} className="mr-1 inline"/>; }
                                    
                                    return (
                                        <div key={mission.id} className={`${color} text-white p-2 rounded-lg shadow-sm flex items-center justify-between group/card relative print:shadow-none print:p-1`}>
                                            <span className="text-[11px] font-bold uppercase truncate print:text-[11px] print:whitespace-normal">{mission.users?.nom || 'Inconnu'}</span>
                                            <span className="text-[8px] font-black opacity-90 uppercase px-1 bg-black/20 rounded ml-1 print:border print:border-black print:opacity-100 flex items-center">
                                                {icon}{mission.type}
                                            </span>
                                            {!modePointage && <button onClick={() => onDelete(mission.id)} className="hidden group-hover/card:flex absolute -top-1 -right-1 bg-white text-red-500 rounded-full p-0.5 shadow-md print:hidden"><X size={12} /></button>}
                                        </div>
                                    )
                                })}
                                {!modePointage && <button onClick={() => onOpenModal(null, day, 'hors_chantier')} className="mt-2 w-full flex items-center justify-center text-gray-300 hover:text-gray-500 py-1 transition-colors print:hidden"><Plus size={12} /></button>}
                            </div>
                        </td>
                    )
                })}
            </tr>
          </tbody>
        </table>
    </div>
  )
}

// ============================================================================
// SOUS-COMPOSANT : MODALE D'AFFECTATION
// ============================================================================

function AssignmentModal({ config, employes, assignments, onClose, onSaveBulk }: { config: IModalConfig, employes: IEmploye[], assignments: IAssignment[], onClose: () => void, onSaveBulk: (data: any[]) => Promise<boolean> }) {
    const initialDateStr = config.date ? toLocalISOString(config.date) : '';
    const [dateRange, setDateRange] = useState({ start: initialDateStr, end: initialDateStr });
    const [selectedEmployes, setSelectedEmployes] = useState<string[]>([]);
    const [type, setType] = useState(config.typeContext === 'hors_chantier' ? 'conge' : 'chantier');

    const handleSave = async () => {
        if (selectedEmployes.length === 0) return;
        
        const newAssignments: any[] = [];
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        
        if (end < start) { toast.error("La date de fin doit être après la date de début."); return; }
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const currentIso = toLocalISOString(d);
            
            selectedEmployes.forEach(empId => {
                const exists = assignments.find(a => a.employe_id === empId && a.date_debut === currentIso && a.chantier_id === config.chantierId);
                if (!exists) {
                    newAssignments.push({
                        employe_id: empId,
                        chantier_id: config.chantierId,
                        date_debut: currentIso,
                        date_fin: currentIso, 
                        type: config.chantierId ? 'chantier' : type,
                        odm_envoye: false,
                        heures: 0 
                    });
                }
            });
        }
    
        if (newAssignments.length > 0) {
            const success = await onSaveBulk(newAssignments);
            if (success) onClose();
        } else {
            toast.success("Aucune nouvelle affectation nécessaire");
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 print:hidden animate-in fade-in">
          <div className="bg-white rounded-[30px] p-6 w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center mb-6">
              <div>
                  <h2 className="text-xl font-black uppercase text-[#2d3436]">Affecter Ressources</h2>
                  <p className="text-xs text-gray-400 font-bold">
                      {config.chantierId ? 'Ajout sur chantier' : 'Déclarer absence'}
                  </p>
              </div>
              <button onClick={onClose} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2">
                
                {/* 1. PLAGE DE DATES */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 flex items-center gap-1"><CalendarDays size={10}/> Période d'affectation</label>
                    <div className="flex items-center gap-2">
                        <input type="date" className="flex-1 p-2 rounded-lg border border-gray-200 outline-none focus:border-[#00b894] text-sm font-bold transition-colors" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
                        <span className="text-gray-400 font-bold">à</span>
                        <input type="date" className="flex-1 p-2 rounded-lg border border-gray-200 outline-none focus:border-[#00b894] text-sm font-bold transition-colors" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
                    </div>
                </div>

                {/* 2. SÉLECTION MULTIPLE EMPLOYÉS AVEC GESTION DES CONFLITS */}
                <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Sélectionner Collaborateurs ({selectedEmployes.length})</label>
                    <div className="max-h-[300px] overflow-y-auto border border-gray-200 rounded-xl custom-scrollbar shadow-inner bg-gray-50">
                        {employes.map(e => {
                            const isConflict = assignments.some(a => a.employe_id === e.id && a.date_debut >= dateRange.start && a.date_debut <= dateRange.end);
                            const isSelected = selectedEmployes.includes(e.id);
                            const roleConfig = getRoleConfig(e.role);

                            return (
                                <div 
                                    key={e.id} 
                                    onClick={() => {
                                        if (isConflict) return; 
                                        if (isSelected) setSelectedEmployes(prev => prev.filter(id => id !== e.id));
                                        else setSelectedEmployes(prev => [...prev, e.id]);
                                    }}
                                    className={`flex items-center justify-between p-3 border-b border-gray-100 transition-all 
                                        ${isConflict ? 'opacity-40 bg-gray-100 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}
                                        ${isSelected ? 'bg-blue-50' : 'bg-white'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-colors ${isSelected ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-200 text-gray-500'}`}>
                                            {e.prenom.charAt(0)}{e.nom.charAt(0)}
                                        </div>
                                        <div>
                                            <p className={`font-bold text-sm ${isSelected ? 'text-blue-800' : 'text-gray-700'} ${isConflict ? 'line-through' : ''}`}>{e.nom} {e.prenom}</p>
                                            <div className={`flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase w-fit ${roleConfig.badgeClass}`}>
                                                {roleConfig.icon}
                                                <span>{roleConfig.label}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isConflict ? (
                                            <div className="flex items-center gap-1 text-[9px] font-black text-red-500 bg-red-50 px-2 py-1 rounded">
                                                <Lock size={10} /> Occupé
                                            </div>
                                        ) : isSelected ? (
                                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center"><Check className="text-white" size={12} /></div>
                                        ) : null}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* 3. TYPE (Si hors chantier) */}
                {!config.chantierId && (
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Type d'absence</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['conge', 'maladie', 'formation', 'intemperie'].map(t => (
                                <button key={t} onClick={() => setType(t)} className={`py-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${type === t ? 'border-[#2d3436] bg-[#2d3436] text-white shadow-md scale-105' : 'border-transparent bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <button 
                onClick={handleSave} 
                disabled={selectedEmployes.length === 0}
                className="w-full mt-6 bg-[#00b894] hover:bg-[#00a383] text-white py-4 rounded-xl font-black uppercase text-sm shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                <Save size={18} /> Valider l'affectation
            </button>
          </div>
        </div>
    )
}