"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ChevronLeft, ChevronRight, Users, 
  CalendarRange, Printer, X, Save, 
  CheckSquare, Square, BarChart3, AlertCircle, Activity, Loader2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  ReferenceLine, Cell, ComposedChart 
} from 'recharts';
import toast, { Toaster } from 'react-hot-toast';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface IChantier {
  id: string;
  nom: string;
  statut: string;
  date_debut: string;
  date_fin: string;
  effectif_prevu: number;
  taux_reussite: number;
  equipe_ids: string[];
  chef_chantier_id: string;
  type?: string;
}

interface IEmploye {
  id: string;
  nom: string;
  prenom: string;
  role: string;
}

interface IAssignment {
  id: string;
  chantier_id: string;
  employe_id: string;
  date_debut: string;
  date_fin: string;
}

// ============================================================================
// HELPERS DATES
// ============================================================================

const getWeekNumber = (d: Date) => {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  target.setUTCDate(target.getUTCDate() + 4 - (target.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const getWeekDates = (w: number, y: number) => {
  const simple = new Date(y, 0, 1 + (w - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  const workEnd = new Date(ISOweekStart);
  workEnd.setDate(workEnd.getDate() + 4); // Fin de semaine (Vendredi)
  const end = new Date(ISOweekStart);
  end.setDate(end.getDate() + 6); // Dimanche
  return { start: ISOweekStart, end, workEnd };
};

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function PlanningChargePage() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [chantiers, setChantiers] = useState<IChantier[]>([]);
  const [assignments, setAssignments] = useState<IAssignment[]>([]);
  const [employes, setEmployes] = useState<IEmploye[]>([]); 

  // États Modale
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, chantier: IChantier | null, week: number | null}>({
      isOpen: false, chantier: null, week: null
  });

  // 1. CHARGEMENT PARALLÈLE
  const fetchData = async () => {
    setLoading(true);
    try {
        const [chanRes, planRes, empRes] = await Promise.all([
            supabase.from('chantiers').select('*').not('statut', 'in', '("termine", "stand_by")').order('nom'),
            supabase.from('planning').select('*').not('chantier_id', 'is', null),
            supabase.from('employes').select('id, nom, prenom, role').eq('statut_actuel', 'disponible').order('nom')
        ]);

        if (chanRes.data) setChantiers(chanRes.data);
        if (planRes.data) setAssignments(planRes.data);
        if (empRes.data) setEmployes(empRes.data);
    } catch (error) {
        toast.error("Erreur de synchronisation des données");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [year]);

  const weeks = Array.from({ length: 52 }, (_, i) => i + 1);
  const totalCapacity = employes.length || 1;

  // 2. LOGIQUE CALCUL CHARGE
  const calculateLoad = (chantier: IChantier, weekNum: number) => {
    const { start: weekStart, end: weekEnd } = getWeekDates(weekNum, year);
    if (!chantier.date_debut || !chantier.date_fin) return null;
    
    const cS = new Date(chantier.date_debut);
    const cE = new Date(chantier.date_fin);
    if (!(cS <= weekEnd && cE >= weekStart)) return null;

    // Besoin théorique pondéré
    let baseNeed = chantier.effectif_prevu || 0;
    if (baseNeed === 0) {
        baseNeed = (Array.isArray(chantier.equipe_ids) ? chantier.equipe_ids.length : 0) + (chantier.chef_chantier_id ? 1 : 0);
    }

    let need = baseNeed;
    if (chantier.statut === 'probable') {
        need = Math.round(baseNeed * ((chantier.taux_reussite || 0) / 100));
    }

    // Réel staffé
    const relevant = assignments.filter(a => {
        if (a.chantier_id !== chantier.id) return false;
        const aS = new Date(a.date_debut);
        const aE = new Date(a.date_fin);
        return aS <= weekEnd && aE >= weekStart;
    });

    const uniquePeople = new Set(relevant.map(a => a.employe_id));
    const staffed = uniquePeople.size;
    const missing = Math.max(0, need - staffed);
    
    let statusClass = 'bg-gray-50 border-gray-100 text-gray-400';
    if (chantier.statut === 'probable') {
        statusClass = 'bg-purple-50 border-purple-200 text-purple-700 border-dashed';
    } else if (need > 0) {
        if (staffed === 0) statusClass = 'bg-red-50 border-red-200 text-red-400'; 
        else if (missing > 0) statusClass = missing >= need * 0.5 ? 'bg-red-100 border-red-300 text-red-700' : 'bg-orange-100 border-orange-300 text-orange-700';
        else if (staffed > need) statusClass = 'bg-blue-100 border-blue-300 text-blue-700'; 
        else statusClass = 'bg-emerald-100 border-emerald-300 text-emerald-700'; 
    }
    
    return { need, staffed, missing, statusClass };
  };

  // 3. PRÉPARATION DONNÉES GRAPHIQUES (MÉMORISÉ)
  const graphData = useMemo(() => {
    return weeks.map(w => {
        let totalStaffed = 0;
        let chantierData: any = { name: `S${w}` };

        chantiers.forEach(c => {
            const load = calculateLoad(c, w);
            if (load && load.need > 0) {
                totalStaffed += load.need;
                chantierData[c.nom] = load.need;
            }
        });

        chantierData.Total = totalStaffed;
        return chantierData;
    });
  }, [chantiers, assignments, year, employes]);

  // 4. HANDLERS
  const handleSaveAssignments = async (empIds: string[], chantierId: string, week: number) => {
      const toastId = toast.loading("Mise à jour du planning...");
      const { start, workEnd } = getWeekDates(week, year);
      
      const startStr = start.toISOString().split('T')[0];
      const endStr = workEnd.toISOString().split('T')[0];

      // Nettoyage de la semaine pour ce chantier
      await supabase.from('planning').delete()
          .eq('chantier_id', chantierId)
          .gte('date_debut', startStr)
          .lte('date_debut', endStr);

      if (empIds.length > 0) {
          const newEntries = empIds.map(eid => ({
              chantier_id: chantierId,
              employe_id: eid,
              date_debut: startStr,
              date_fin: endStr,
              type: 'chantier'
          }));
          const { error } = await supabase.from('planning').insert(newEntries);
          if (error) {
              toast.error("Erreur d'insertion", { id: toastId });
              return;
          }
      }
      
      toast.success("Planning mis à jour !", { id: toastId });
      setModalConfig({ ...modalConfig, isOpen: false });
      fetchData();
  };

  const grouped = {
      en_cours: chantiers.filter(c => c.statut === 'en_cours'),
      planifie: chantiers.filter(c => c.statut === 'planifie'),
      probable: chantiers.filter(c => c.statut === 'probable')
  };

  if (loading && chantiers.length === 0) return <div className="h-screen flex items-center justify-center font-bold text-gray-400"><Loader2 className="animate-spin mr-2"/> Synchronisation de la charge...</div>;

  return (
    <div className="min-h-screen bg-[#f0f3f4] font-['Fredoka'] flex flex-col text-gray-800 transition-all print:bg-white print:m-0 print:p-0">
      <Toaster position="bottom-right" />

      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 p-4 md:p-6 sticky top-0 z-40 shadow-sm print:hidden">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h1 className="text-2xl font-black uppercase text-[#2d3436] flex items-center gap-3">
                    <CalendarRange className="text-[#00b894]" size={32}/>
                    Vision <span className="text-[#00b894]">Charge & Staffing</span>
                </h1>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                    <Activity size={12}/> Capacité actuelle : {totalCapacity} collaborateurs disponibles
                </p>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center bg-gray-100 rounded-2xl p-1 border border-gray-200">
                    <button onClick={() => setYear(year - 1)} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm"><ChevronLeft size={16}/></button>
                    <span className="px-6 font-black text-sm tracking-tighter">{year}</span>
                    <button onClick={() => setYear(year + 1)} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm"><ChevronRight size={16}/></button>
                </div>
                <button onClick={() => window.print()} className="bg-[#2d3436] text-white p-3 rounded-2xl hover:bg-black transition-all hover:scale-105 shadow-lg active:scale-95">
                    <Printer size={20} />
                </button>
            </div>
        </div>
      </div>

      {/* GRILLE DE CHARGE */}
      <div className="p-4 md:p-6 space-y-8 max-w-[1600px] mx-auto w-full">
        
        <div className="bg-white rounded-[30px] shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[500px] print:h-auto print:overflow-visible">
            <div className="overflow-auto flex-1 custom-scrollbar print:overflow-visible">
                <table className="w-full border-collapse">
                    <thead className="sticky top-0 z-30 bg-white shadow-sm">
                        <tr className="bg-gray-50/50">
                            <th className="p-4 w-[300px] min-w-[300px] sticky left-0 bg-white z-40 text-left border-r border-b border-gray-200">
                                <div className="font-black text-[10px] text-gray-400 uppercase tracking-widest">Portefeuille Chantiers</div>
                            </th>
                            {weeks.map(w => {
                                const { start } = getWeekDates(w, year);
                                const isCurrent = getWeekNumber(new Date()) === w && new Date().getFullYear() === year;
                                return (
                                    <th key={w} className={`p-2 min-w-[55px] text-center border-r border-b border-gray-100 ${isCurrent ? 'bg-[#00b894]/10' : ''}`}>
                                        <div className={`text-[10px] font-black ${isCurrent ? 'text-[#00b894]' : 'text-gray-400'}`}>S{w}</div>
                                        <div className="text-[7px] font-bold text-gray-300 uppercase">{start.toLocaleDateString('fr-FR', {month: 'short'})}</div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(grouped).map(([key, list]) => (
                            <React.Fragment key={key}>
                                {list.length > 0 && (
                                    <tr className="bg-gray-50/30">
                                        <td colSpan={53} className="p-2 pl-4 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">
                                            {key.replace('_', ' ')} ({list.length})
                                        </td>
                                    </tr>
                                )}
                                {list.map(c => (
                                    <tr key={c.id} className="group hover:bg-gray-50/50 transition-colors border-b border-gray-50">
                                        <td className="p-3 sticky left-0 bg-white group-hover:bg-gray-50 z-20 border-r border-gray-200">
                                            <div className="font-bold text-xs uppercase truncate max-w-[250px]">{c.nom}</div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[8px] font-black text-gray-400 uppercase">{c.type || 'Indus.'}</span>
                                                <span className="text-[8px] font-black text-[#00b894]">Goal: {c.effectif_prevu || 0}p</span>
                                            </div>
                                        </td>
                                        {weeks.map(w => {
                                            const data = calculateLoad(c, w);
                                            return (
                                                <td key={w} className="p-0.5 border-r border-gray-50 h-12" onClick={() => data && setModalConfig({isOpen: true, chantier: c, week: w})}>
                                                    {data ? (
                                                        <div className={`w-full h-full rounded-lg border transition-all cursor-pointer flex flex-col items-center justify-center group/cell ${data.statusClass} hover:scale-105 hover:shadow-md`}>
                                                            <span className="text-[10px] font-black">{data.staffed}</span>
                                                            <div className="w-4 h-0.5 bg-current opacity-20 my-0.5"></div>
                                                            <span className="text-[8px] font-bold opacity-60">{data.need}</span>
                                                        </div>
                                                    ) : null}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* GRAPHIQUES KPIs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1">
            <div className="bg-white rounded-[35px] p-8 shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="font-black text-lg uppercase tracking-tight text-gray-800">Charge vs Capacité</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Analyse hebdomadaire des besoins cumulés</p>
                    </div>
                    <div className="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
                        <span className="text-xs font-black text-emerald-600 uppercase">Capacité : {totalCapacity}</span>
                    </div>
                </div>
                <div className="h-[300px] w-full font-bold">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={graphData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f2f6"/>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#bdc3c7'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#bdc3c7'}} />
                            <Tooltip 
                                contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontFamily: 'Fredoka'}}
                                cursor={{fill: '#f8f9fa'}}
                            />
                            <ReferenceLine y={totalCapacity} stroke="#ff7675" strokeDasharray="5 5" label={{ position: 'top', value: 'Seuil Alerte', fill: '#ff7675', fontSize: 10, fontWeight: 'bold' }} />
                            <Bar dataKey="Total" radius={[6, 6, 0, 0]} barSize={25}>
                                {graphData.map((entry: any, index: number) => {
                                    let color = "#00b894";
                                    if (entry.Total > totalCapacity * 0.9) color = "#fdcb6e";
                                    if (entry.Total > totalCapacity) color = "#d63031";
                                    return <Cell key={`cell-${index}`} fill={color} />;
                                })}
                            </Bar>
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white rounded-[35px] p-8 shadow-sm border border-gray-200 flex flex-col justify-center">
                 <div className="flex items-center gap-4 mb-8">
                     <div className="bg-blue-100 p-4 rounded-[25px] text-blue-600"><BarChart3 size={32}/></div>
                     <div>
                         <h3 className="font-black text-lg uppercase text-gray-800">Santé du Portefeuille</h3>
                         <p className="text-xs font-bold text-gray-400 uppercase">Répartition des statuts</p>
                     </div>
                 </div>
                 <div className="space-y-4">
                     {[
                         { label: 'Chantiers en cours', count: grouped.en_cours.length, color: 'bg-[#00b894]' },
                         { label: 'Démarrages prévus', count: grouped.planifie.length, color: 'bg-[#0984e3]' },
                         { label: 'Opportunités (Probables)', count: grouped.probable.length, color: 'bg-[#6c5ce7]' }
                     ].map((stat, i) => (
                         <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                             <div className="flex items-center gap-3">
                                 <div className={`w-3 h-3 rounded-full ${stat.color}`}></div>
                                 <span className="text-sm font-bold text-gray-600 uppercase tracking-tight">{stat.label}</span>
                             </div>
                             <span className="text-xl font-black text-gray-800">{stat.count}</span>
                         </div>
                     ))}
                 </div>
            </div>
        </div>
      </div>

      {/* MODALE D'AFFECTATION ISOLÉE */}
      {modalConfig.isOpen && modalConfig.chantier && modalConfig.week && (
          <LoadAssignmentModal 
              chantier={modalConfig.chantier}
              week={modalConfig.week}
              year={year}
              employes={employes}
              assignments={assignments}
              onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
              onSave={handleSaveAssignments}
          />
      )}
    </div>
  );
}

// ============================================================================
// SOUS-COMPOSANT : MODALE D'AFFECTATION (Isolé pour perfs)
// ============================================================================

function LoadAssignmentModal({ chantier, week, year, employes, assignments, onClose, onSave }: any) {
    const { start, end } = getWeekDates(week, year);
    
    // Initialisation de la sélection
    const [selectedIds, setSelectedIds] = useState<string[]>(() => {
        return assignments
            .filter((a: any) => a.chantier_id === chantier.id && new Date(a.date_debut) <= end && new Date(a.date_fin) >= start)
            .map((a: any) => a.employe_id);
    });

    const toggle = (id: string) => {
        if (selectedIds.includes(id)) setSelectedIds(prev => prev.filter(x => x !== id));
        else setSelectedIds(prev => [...prev, id]);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="bg-gray-50 p-8 border-b border-gray-100 flex justify-between items-start">
                    <div>
                        <h3 className="font-black text-2xl text-[#2d3436] uppercase tracking-tighter">Équiper le chantier</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase mt-1">
                            {chantier.nom} — Semaine {week} ({start.getDate()}/{start.getMonth()+1})
                        </p>
                    </div>
                    <button onClick={onClose} className="bg-white p-2 rounded-full hover:bg-gray-100 transition-all border border-gray-100"><X size={24}/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-3 custom-scrollbar">
                    {employes.map((emp: any) => {
                        const isSelected = selectedIds.includes(emp.id);
                        // Vérifier si le gars est déjà pris ailleurs cette semaine
                        const isBusy = assignments.some((a: any) => a.employe_id === emp.id && a.chantier_id !== chantier.id && new Date(a.date_debut) <= end && new Date(a.date_fin) >= start);

                        return (
                            <div key={emp.id} 
                                 onClick={() => !isBusy && toggle(emp.id)} 
                                 className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${isBusy ? 'opacity-40 grayscale cursor-not-allowed border-transparent' : isSelected ? 'bg-blue-50 border-blue-500 shadow-md' : 'bg-gray-50 border-transparent hover:bg-white hover:border-gray-200'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm ${isSelected ? 'bg-blue-500 text-white' : 'bg-white text-gray-400 border border-gray-100'}`}>{emp.prenom.charAt(0)}{emp.nom.charAt(0)}</div>
                                    <div>
                                        <p className={`font-black text-sm ${isSelected ? 'text-blue-800' : 'text-gray-700'}`}>{emp.prenom} {emp.nom}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">{isBusy ? 'Déjà affecté ailleurs' : emp.role}</p>
                                    </div>
                                </div>
                                {isSelected ? <CheckSquare className="text-blue-500" size={24} /> : <Square className="text-gray-200" size={24} />}
                            </div>
                        )
                    })}
                </div>

                <div className="p-8 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 text-gray-400 font-black uppercase text-xs hover:text-gray-600">Annuler</button>
                    <button onClick={() => onSave(selectedIds, chantier.id, week)} className="bg-[#0984e3] text-white px-8 py-3 rounded-2xl font-black uppercase text-xs shadow-lg shadow-blue-100 hover:scale-105 transition-all active:scale-95">Valider ({selectedIds.length} gars)</button>
                </div>
            </div>
        </div>
    );
}