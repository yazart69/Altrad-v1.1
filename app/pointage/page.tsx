"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ChevronLeft, ChevronRight, Printer, 
  Lock, Unlock, Copy, RotateCcw, AlertTriangle, 
  FileSpreadsheet, HardHat, Clock, Loader2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import toast, { Toaster } from 'react-hot-toast';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface IEmploye {
  id: string;
  nom: string;
  prenom: string;
}

interface IChantier {
  id: string;
  nom: string;
  adresse: string;
}

interface IAssignment {
  id: string;
  employe_id: string;
  chantier_id: string | null;
  date_debut: string;
  type: string;
  heures: number;
  valide: boolean;
  isAuto?: boolean;
  employes?: IEmploye;
  chantiers?: IChantier;
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

// ============================================================================
// HOOK METIER : DATA & API
// ============================================================================

function usePointageData() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<IAssignment[]>([]);
  const [employes, setEmployes] = useState<IEmploye[]>([]);
   
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  });

  const weekNumber = getWeekNumber(currentDate);
  const year = currentDate.getFullYear();
  
  const weekDays = useMemo(() => Array.from({ length: 5 }, (_, i) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + i);
    return d;
  }), [currentDate]);

  const isWeekLocked = useMemo(() => assignments.some((a: IAssignment) => a.valide === true), [assignments]);

  const fetchData = async () => {
    setLoading(true);
    
    const { data: emp } = await supabase.from('employes').select('id, nom, prenom').order('nom');
    if (emp) setEmployes(emp);

    const startOfWeek = toLocalISOString(weekDays[0]);
    const endOfWeek = toLocalISOString(weekDays[4]);

    const { data: plan } = await supabase
      .from('planning')
      .select(`*, employes (id, nom, prenom), chantiers (id, nom, adresse)`)
      .gte('date_debut', startOfWeek)
      .lte('date_debut', endOfWeek)
      .order('employe_id');

    if (plan) {
        const enrichedPlan = plan.map((task: any) => {
            if (task.heures > 0) return task; 
            if (['maladie', 'conge', 'formation', 'absence', 'intemperie'].includes(task.type)) return task;

            // Pré-remplissage UI (Grisé tant que non validé par l'utilisateur)
            const date = new Date(task.date_debut);
            const dayNum = date.getDay();
            const defaultHours = dayNum === 5 ? 4 : 8.5; 
            
            return { ...task, heures: defaultHours, isAuto: true }; 
        });
        setAssignments(enrichedPlan);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentDate]);

  // LA SYNCHRONISATION CRUCIALE : Met à jour la table chantiers
  const syncChantierHours = async (chantierId: string) => {
      if (!chantierId) return;
      // 1. Récupérer TOUTES les heures de ce chantier validées ou saisies
      const { data, error } = await supabase
          .from('planning')
          .select('heures')
          .eq('chantier_id', chantierId);

      if (!error && data) {
          const totalHeures = data.reduce((sum: number, item: any) => sum + (Number(item.heures) || 0), 0);
          
          // 2. Mettre à jour les heures consommées du chantier
          await supabase
              .from('chantiers')
              .update({ heures_consommees: totalHeures })
              .eq('id', chantierId);
      }
  };

  const actions = {
    updateHours: async (id: string, value: string | number, chantierId: string | null) => {
        if (isWeekLocked) return;
        const numValue = parseFloat(value as string) || 0;
        
        // Optimistic UI Update
        setAssignments((prev: IAssignment[]) => prev.map((a: IAssignment) => a.id === id ? { ...a, heures: numValue, isAuto: false } : a));
        
        // Sauvegarde Supabase
        const { error } = await supabase.from('planning').update({ heures: numValue }).eq('id', id);
        
        if (error) {
            toast.error("Erreur d'enregistrement");
            fetchData(); // Rollback
        } else if (chantierId) {
            // Synchro avec le chantier
            await syncChantierHours(chantierId);
        }
    },
    toggleLockWeek: async () => {
        const newState = !isWeekLocked;
        const ids = assignments.map((a: IAssignment) => a.id);
        const toastId = toast.loading(newState ? "Verrouillage..." : "Déverrouillage...");
        
        if (ids.length > 0) {
            // Si on verrouille, on s'assure que les heures "Auto" deviennent de vraies heures en BDD
            if (newState) {
                const autoTasks = assignments.filter(a => a.isAuto);
                for (const t of autoTasks) {
                    await supabase.from('planning').update({ heures: t.heures }).eq('id', t.id);
                    if (t.chantier_id) await syncChantierHours(t.chantier_id);
                }
            }
            
            const { error } = await supabase.from('planning').update({ valide: newState }).in('id', ids);
            if (error) toast.error("Erreur : " + error.message, { id: toastId });
            else { toast.success(newState ? "Semaine validée et verrouillée" : "Semaine déverrouillée", { id: toastId }); fetchData(); }
        } else {
            toast.dismiss(toastId);
        }
    },
    copyPreviousWeek: async () => {
        if (isWeekLocked) return;
        if (assignments.length > 0 && !confirm("⚠️ Attention : Des données existent déjà cette semaine.\nLa copie va AJOUTER les données de S-1 et créer des doublons.\nVoulez-vous vraiment continuer ?")) return;
        if (assignments.length === 0 && !confirm("Copier les affectations de la semaine précédente (S-1) ?")) return;
        
        const toastId = toast.loading("Copie depuis S-1...");
        const prevStart = new Date(currentDate); prevStart.setDate(prevStart.getDate() - 7);
        const prevEnd = new Date(prevStart); prevEnd.setDate(prevEnd.getDate() + 6);
        
        const { data: prevData } = await supabase.from('planning')
            .select('*')
            .gte('date_debut', toLocalISOString(prevStart))
            .lte('date_debut', toLocalISOString(prevEnd));

        if (!prevData?.length) { toast.error("Aucune donnée trouvée en S-1", { id: toastId }); return; }

        const newEntries = prevData.map((item: any) => {
            const d = new Date(item.date_debut); d.setDate(d.getDate() + 7);
            return {
                employe_id: item.employe_id, chantier_id: item.chantier_id, type: item.type,
                date_debut: toLocalISOString(d), date_fin: toLocalISOString(d),
                heures: item.heures, valide: false
            };
        });

        const { error } = await supabase.from('planning').insert(newEntries);
        if (error) toast.error("Erreur: " + error.message, { id: toastId });
        else { toast.success("Données copiées !", { id: toastId }); fetchData(); }
    },
    resetWeek: async () => {
        if (isWeekLocked) return;
        if (!confirm("Remettre à zéro toutes les heures saisies ?")) return;
        
        const toastId = toast.loading("Remise à zéro...");
        const ids = assignments.map((a: IAssignment) => a.id);
        const { error } = await supabase.from('planning').update({ heures: 0 }).in('id', ids);
        
        if (error) toast.error("Erreur: " + error.message, { id: toastId });
        else {
            // Remettre à jour les totaux des chantiers impactés
            const chantierIds = [...new Set(assignments.map(a => a.chantier_id).filter(id => id))];
            for (const cid of chantierIds) await syncChantierHours(cid as string);
            
            toast.success("Heures effacées", { id: toastId }); 
            fetchData();
        }
    }
  };

  const employeeTotals = useMemo(() => {
      const stats: Record<string, number> = {}; 
      const visibleDates = weekDays.map(d => toLocalISOString(d));

      assignments.forEach((a: IAssignment) => {
          if (['maladie', 'conge', 'formation', 'intemperie'].includes(a.type)) return;
          if (!visibleDates.includes(a.date_debut)) return;
          stats[a.employe_id] = (stats[a.employe_id] || 0) + (parseFloat(a.heures as unknown as string) || 0);
      });
      return stats;
  }, [assignments, weekDays]);

  const chartData = useMemo(() => {
      const data: any = {};
      assignments.forEach((a: IAssignment) => {
          if (!a.chantiers?.nom || !a.heures) return;
          if (['maladie', 'conge', 'formation', 'intemperie'].includes(a.type)) return;
          data[a.chantiers.nom] = (data[a.chantiers.nom] || 0) + parseFloat(a.heures as unknown as string);
      });
      return Object.keys(data).map(key => ({ name: key, heures: data[key] }));
  }, [assignments]);

  return { currentDate, setCurrentDate, weekNumber, year, weekDays, employes, assignments, employeeTotals, chartData, loading, isWeekLocked, actions };
}

// ============================================================================
// SOUS-COMPOSANT : CHAMP DE SAISIE OPTIMISÉ (Évite les re-renders)
// ============================================================================
function HourInput({ task, isWeekLocked, dayNum, onSave }: { task: IAssignment, isWeekLocked: boolean, dayNum: number, onSave: (id: string, val: string, chantierId: string | null) => void }) {
    const [localVal, setLocalVal] = useState(task.heures.toString());

    // Synchronise la valeur locale si la data change (ex: reset)
    useEffect(() => { setLocalVal(task.heures.toString()); }, [task.heures]);

    const handleBlur = () => {
        if (localVal !== task.heures.toString()) {
            onSave(task.id, localVal, task.chantier_id);
        }
    };

    const isAuto = task.isAuto;
    const numVal = parseFloat(localVal) || 0;
    const defaultMax = dayNum === 5 ? 4 : 8.5; // Max théorique du jour

    let colorClass = 'border-gray-200 bg-white text-gray-800';
    if (numVal > defaultMax) colorClass = 'border-red-400 bg-red-50 text-red-600';
    else if (numVal > 0 && !isAuto) colorClass = 'border-emerald-400 bg-emerald-50 text-emerald-700';
    else if (isAuto) colorClass = 'border-gray-200 bg-gray-50 text-gray-400'; // Grisé si auto

    return (
        <input 
            type="number" 
            disabled={isWeekLocked}
            className={`w-full p-1 text-center font-bold text-sm outline-none border-b-2 transition-colors print:border-black print:text-black print:bg-transparent ${colorClass}`}
            value={localVal}
            onChange={(e) => setLocalVal(e.target.value)}
            onBlur={handleBlur}
        />
    );
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function PointagePage() {
  const { currentDate, setCurrentDate, weekNumber, year, weekDays, employes, assignments, employeeTotals, chartData, loading, isWeekLocked, actions } = usePointageData();

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#00b894]" size={40} /></div>;

  return (
    <div className="min-h-screen bg-[#f0f3f4] font-['Fredoka'] p-4 md:p-6 text-gray-800 print:bg-white print:p-0 print:m-0 print:w-full print:min-h-0">
      <Toaster position="bottom-right" toastOptions={{ style: { fontFamily: 'Fredoka', fontWeight: 'bold' } }} />

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: landscape; margin: 5mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          aside, nav, header, .sidebar, .navbar { display: none !important; } 
          .no-print { display: none !important; }
          .recharts-wrapper { width: 100% !important; height: auto !important; }
        }
      `}} />

      {/* BANDEAU HAUT */}
      <div className="bg-white rounded-[25px] p-4 mb-6 shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
          <div className="flex items-center gap-4">
              <div className="bg-orange-100 p-3 rounded-2xl text-orange-600"><Clock size={24} /></div>
              <div>
                  <h1 className="text-2xl font-black uppercase text-[#2d3436]">Pointage Heures</h1>
                  <div className="flex items-center gap-2">
                      <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }} className="hover:bg-gray-100 p-1 rounded transition-colors"><ChevronLeft size={16}/></button>
                      <span className="text-sm font-bold text-gray-500 uppercase">Semaine {weekNumber} • {year}</span>
                      <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }} className="hover:bg-gray-100 p-1 rounded transition-colors"><ChevronRight size={16}/></button>
                  </div>
              </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
              <button onClick={actions.copyPreviousWeek} disabled={isWeekLocked} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-black uppercase flex items-center gap-2 disabled:opacity-50 transition-colors"><Copy size={14}/> S-1</button>
              <button onClick={actions.resetWeek} disabled={isWeekLocked} className="px-3 py-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl text-xs font-black uppercase flex items-center gap-2 disabled:opacity-50 transition-colors"><RotateCcw size={14}/> R.A.Z</button>
              <button onClick={actions.toggleLockWeek} className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 text-white shadow-lg transition-all active:scale-95 ${isWeekLocked ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'}`}>
                  {isWeekLocked ? <><Lock size={14}/> Verrouillé</> : <><Unlock size={14}/> Valider Semaine</>}
              </button>
              <button onClick={() => window.print()} className="bg-[#2d3436] text-white p-2 rounded-xl hover:bg-black transition-transform hover:scale-105"><Printer size={18}/></button>
          </div>
      </div>

      {/* EN-TÊTE IMPRESSION */}
      <div className="hidden print:flex justify-between items-center mb-4 border-b-2 border-black pb-2">
          <div>
            <h1 className="text-2xl font-black uppercase">Feuille de Pointage - Semaine {weekNumber}</h1>
            <p className="text-sm text-gray-600">Du {weekDays[0].toLocaleDateString('fr-FR')} au {weekDays[4].toLocaleDateString('fr-FR')}</p>
          </div>
          <div className="text-right">
             <p className="text-[10px] uppercase font-bold text-gray-400">Imprimé le {new Date().toLocaleDateString()}</p>
          </div>
      </div>

      {/* TABLEAU PRINCIPAL */}
      <div className="bg-white rounded-[25px] shadow-sm border border-gray-200 overflow-hidden mb-6 print:border-none print:shadow-none print:overflow-visible">
          <div className="overflow-x-auto custom-scrollbar print:overflow-visible">
              <table className="w-full min-w-[1000px] border-collapse print:min-w-0 print:w-full">
                  <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 print:bg-gray-100 print:border-black">
                          <th className="p-4 text-left w-[250px] sticky left-0 bg-gray-50 z-20 font-black text-xs uppercase text-gray-500 print:static print:bg-transparent print:text-black">Employé</th>
                          {weekDays.map((d, i) => (
                              <th key={i} className="p-3 text-center min-w-[120px] border-l border-gray-200 print:border-black print:min-w-0">
                                  <div className="text-[10px] font-black uppercase text-gray-400 print:text-black">{d.toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
                                  <div className="text-sm font-black text-gray-800 print:text-black">{d.getDate()}</div>
                              </th>
                          ))}
                          <th className="p-4 text-center w-[100px] font-black text-xs uppercase text-gray-500 border-l border-gray-200 bg-gray-50 sticky right-0 z-20 print:static print:bg-transparent print:border-black print:text-black">Total</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 print:divide-black">
                      {employes.map(emp => {
                          const total = employeeTotals[emp.id] || 0;
                          const isOverload = total > 39;
                          const empTasks = assignments.filter((a: IAssignment) => a.employe_id === emp.id);
                          if(empTasks.length === 0) return null;

                          return (
                              <tr key={emp.id} className="group hover:bg-gray-50 transition-colors print:break-inside-avoid">
                                  <td className="p-4 sticky left-0 bg-white group-hover:bg-gray-50 z-10 border-r border-gray-100 print:static print:border-black print:p-2">
                                      <div className="font-black text-sm uppercase text-gray-700 print:text-black">{emp.nom} {emp.prenom}</div>
                                      {isOverload && <div className="text-[9px] font-bold text-red-500 flex items-center gap-1 mt-1 print:text-black"><AlertTriangle size={10}/> Surcharge ({total}h)</div>}
                                  </td>
                                  
                                  {weekDays.map((day, i) => {
                                      const dateStr = toLocalISOString(day);
                                      const dayTasks = empTasks.filter((a: IAssignment) => a.date_debut === dateStr);
                                      
                                      return (
                                          <td key={i} className="p-2 border-l border-gray-100 align-top min-h-[5rem] print:border-black print:p-1">
                                              <div className="flex flex-col gap-1">
                                                  {dayTasks.map(task => {
                                                      const isAbsence = ['maladie', 'conge', 'formation', 'absence', 'intemperie'].includes(task.type);
                                                      
                                                      if (isAbsence) {
                                                          let badgeColor = "bg-gray-100 text-gray-500";
                                                          if(task.type === 'maladie') badgeColor = "bg-red-100 text-red-500";
                                                          if(task.type === 'conge') badgeColor = "bg-orange-100 text-orange-500";
                                                          if(task.type === 'intemperie') badgeColor = "bg-blue-100 text-blue-600";
                                                          
                                                          return (
                                                              <div key={task.id} className={`text-[10px] font-black uppercase text-center p-1 rounded ${badgeColor} print:border print:border-black print:text-black`}>
                                                                  {task.type}
                                                              </div>
                                                          );
                                                      }

                                                      return (
                                                          <div key={task.id} className="flex flex-col mb-1 print:break-inside-avoid">
                                                              <div className="flex items-center justify-between bg-blue-50 px-2 py-1 rounded-t border border-blue-100 print:border-black print:bg-gray-100">
                                                                  <span className="text-[9px] font-bold uppercase truncate max-w-[80px] text-blue-800 print:text-black print:max-w-none print:whitespace-normal">
                                                                      {task.chantiers?.nom || 'Chantier'}
                                                                  </span>
                                                                  {task.isAuto && <span className="text-[8px] text-gray-400 italic print:hidden">auto</span>}
                                                              </div>
                                                              <HourInput 
                                                                  task={task} 
                                                                  isWeekLocked={isWeekLocked} 
                                                                  dayNum={day.getDay()} 
                                                                  onSave={actions.updateHours} 
                                                              />
                                                          </div>
                                                      );
                                                  })}
                                              </div>
                                          </td>
                                      );
                                  })}
                                  <td className={`p-4 text-center font-black sticky right-0 bg-white group-hover:bg-gray-50 z-10 border-l border-gray-200 print:static print:border-black print:text-black ${isOverload ? 'text-red-500' : 'text-gray-800'}`}>
                                      {total}h
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      </div>

      {/* GRAPHIQUES & STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4 print:mt-4">
          <div className="bg-white rounded-[25px] p-6 shadow-sm border border-gray-200 print:border-black print:shadow-none print:break-inside-avoid">
              <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black uppercase text-gray-700 text-sm print:text-black">Répartition Heures / Chantier</h3>
                  <FileSpreadsheet size={18} className="text-gray-400 print:hidden"/>
              </div>
              <div className="h-[200px] w-full print:h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f2f6" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{fill: 'transparent'}}/>
                          <Bar dataKey="heures" fill="#0984e3" radius={[0, 4, 4, 0]} barSize={20}>
                              {chartData.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={["#0984e3", "#00b894", "#6c5ce7", "#e17055"][index % 4]} />
                              ))}
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>

          <div className="bg-white rounded-[25px] p-6 shadow-sm border border-gray-200 flex flex-col justify-center gap-4 print:border-black print:shadow-none print:break-inside-avoid">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl print:bg-gray-100 print:border print:border-black">
                  <div>
                      <p className="text-xs font-bold text-gray-400 uppercase print:text-black">Total Heures Semaine</p>
                      <p className="text-3xl font-black text-[#2d3436] print:text-black">
                          {Object.values(employeeTotals).reduce((a, b) => a + b, 0)}h
                      </p>
                  </div>
                  <div className="bg-white p-3 rounded-xl shadow-sm text-gray-400 print:hidden"><Clock size={24}/></div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl print:bg-gray-100 print:border print:border-black">
                  <div>
                      <p className="text-xs font-bold text-gray-400 uppercase print:text-black">Employés Actifs</p>
                      <p className="text-3xl font-black text-[#00b894] print:text-black">{Object.keys(employeeTotals).length}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl shadow-sm text-[#00b894] print:hidden"><HardHat size={24}/></div>
              </div>
          </div>
      </div>
    </div>
  );
}