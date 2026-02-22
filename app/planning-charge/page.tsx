"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ChevronLeft, ChevronRight, Users, 
  CalendarRange, Printer, X, Save, 
  CheckSquare, Square, BarChart3, AlertCircle, Activity, Loader2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
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
  workEnd.setDate(workEnd.getDate() + 4);
  const end = new Date(ISOweekStart);
  end.setDate(end.getDate() + 6);
  return { start: ISOweekStart, end, workEnd };
};

// ============================================================================
// HOOK METIER
// ============================================================================

function usePlanningData(year: number) {
  const [loading, setLoading] = useState(true);
  const [chantiers, setChantiers] = useState<IChantier[]>([]);
  const [assignments, setAssignments] = useState<IAssignment[]>([]);
  const [employes, setEmployes] = useState<IEmploye[]>([]); 

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
        toast.error("Erreur de synchronisation");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [year]);

  return { chantiers, assignments, employes, loading, refresh: fetchData };
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function PlanningChargePage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { chantiers, assignments, employes, loading, refresh } = usePlanningData(year);
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, chantier: IChantier | null, week: number | null}>({ isOpen: false, chantier: null, week: null });

  const weeks = Array.from({ length: 52 }, (_, i) => i + 1);
  const totalCapacity = employes.length || 1;

  // Calcul de la charge par cellule
  const calculateLoad = (chantier: IChantier, weekNum: number) => {
    const { start: weekStart, end: weekEnd } = getWeekDates(weekNum, year);
    if (!chantier.date_debut || !chantier.date_fin) return null;
    const cS = new Date(chantier.date_debut);
    const cE = new Date(chantier.date_fin);
    if (!(cS <= weekEnd && cE >= weekStart)) return null;

    let baseNeed = chantier.effectif_prevu || (Array.isArray(chantier.equipe_ids) ? chantier.equipe_ids.length : 0) + (chantier.chef_chantier_id ? 1 : 0);
    let need = chantier.statut === 'probable' ? Math.round(baseNeed * ((chantier.taux_reussite || 0) / 100)) : baseNeed;

    const relevant = assignments.filter(a => a.chantier_id === chantier.id && new Date(a.date_debut) <= weekEnd && new Date(a.date_fin) >= weekStart);
    const staffed = new Set(relevant.map(a => a.employe_id)).size;
    const missing = Math.max(0, need - staffed);
    
    let statusClass = 'bg-gray-50 text-gray-400';
    if (chantier.statut === 'probable') statusClass = 'bg-purple-50 text-purple-700 border-dashed border-purple-200';
    else if (need > 0) {
        if (staffed === 0) statusClass = 'bg-red-50 text-red-400 border-red-200'; 
        else if (missing > 0) statusClass = missing >= need * 0.5 ? 'bg-red-100 text-red-700 border-red-300' : 'bg-orange-100 text-orange-700 border-orange-300';
        else if (staffed > need) statusClass = 'bg-blue-100 text-blue-700 border-blue-300'; 
        else statusClass = 'bg-emerald-100 text-emerald-700 border-emerald-300'; 
    }
    return { need, staffed, missing, statusClass };
  };

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
  }, [chantiers, assignments, year]);

  const handleSave = async (empIds: string[], chantierId: string, week: number) => {
      const { start, workEnd } = getWeekDates(week, year);
      const startStr = start.toISOString().split('T')[0];
      const endStr = workEnd.toISOString().split('T')[0];

      await supabase.from('planning').delete().eq('chantier_id', chantierId).gte('date_debut', startStr).lte('date_debut', endStr);
      if (empIds.length > 0) {
          await supabase.from('planning').insert(empIds.map(eid => ({ chantier_id: chantierId, employe_id: eid, date_debut: startStr, date_fin: endStr, type: 'chantier' })));
      }
      toast.success("Mis à jour !");
      setModalConfig({ ...modalConfig, isOpen: false });
      refresh();
  };

  if (loading && chantiers.length === 0) return <div className="h-screen flex items-center justify-center font-bold text-gray-400"><Loader2 className="animate-spin mr-2"/> Synchronisation...</div>;

  return (
    <div className="print-document">
      <Toaster position="bottom-right" />

      {/* STYLE RIGOUREUX POUR L'IMPRESSION */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          /* 1. On brise les containers de l'App (Sidebar, Navbar, etc) */
          header, nav, aside, .no-print, button { display: none !important; }
          
          /* 2. On reset le body pour permettre une hauteur infinie */
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* 3. On force les containers parents à ne pas limiter le flux */
          .print-document, 
          main, 
          div[class*="layout"], 
          div[class*="dashboard"],
          div[class*="content"] {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            display: block !important;
            position: static !important;
          }

          /* 4. Tableau : On enlève le scroll, on force l'affichage total */
          .overflow-auto, .overflow-hidden {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
          }

          table {
            table-layout: auto !important;
            width: 100% !important;
            page-break-inside: auto;
          }
          
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; } /* Répète l'entête sur chaque page */

          /* 5. Graphiques : On leur donne une taille fixe pour l'impression */
          .recharts-responsive-container {
            height: 350px !important;
            width: 100% !important;
          }

          @page {
            size: landscape;
            margin: 10mm;
          }
        }
      `}} />

      {/* CONTENU - Utilisation de classes standard pour faciliter le reset print */}
      <div className="min-h-screen bg-[#f0f3f4] flex flex-col text-gray-800 print:bg-white print:block">
        
        {/* HEADER (Caché en print) */}
        <div className="bg-white border-b border-gray-200 p-6 sticky top-0 z-40 shadow-sm no-print">
            <div className="max-w-[1600px] mx-auto flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black uppercase text-[#2d3436] flex items-center gap-3">
                        <CalendarRange className="text-[#00b894]" size={32}/>
                        Planning de <span className="text-[#00b894]">Charge</span>
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-gray-100 rounded-2xl p-1 border border-gray-200">
                        <button onClick={() => setYear(year - 1)} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm"><ChevronLeft size={16}/></button>
                        <span className="px-6 font-black text-sm">{year}</span>
                        <button onClick={() => setYear(year + 1)} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm"><ChevronRight size={16}/></button>
                    </div>
                    <button onClick={() => window.print()} className="bg-[#2d3436] text-white p-3 rounded-2xl hover:bg-black transition-all shadow-lg active:scale-95">
                        <Printer size={20} />
                    </button>
                </div>
            </div>
        </div>

        {/* HEADER IMPRESSION (Visible uniquement en print) */}
        <div className="hidden print:block p-4 border-b-4 border-black mb-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black uppercase">Planning de Charge Mensuel - {year}</h1>
                    <p className="text-sm font-bold uppercase text-gray-500">Document de pilotage Altrad - Ressources humaines</p>
                </div>
                <div className="text-right text-xs font-bold uppercase">
                    Généré le {new Date().toLocaleDateString()}
                </div>
            </div>
        </div>

        {/* GRILLE */}
        <div className="p-6 max-w-[1600px] mx-auto w-full flex-1 print:p-0 print:max-w-none">
            
            <div className="bg-white rounded-[30px] shadow-sm border border-gray-200 overflow-hidden print:border-black print:rounded-none">
                {/* On enlève le overflow-auto ici pour le print via le CSS @media print */}
                <div className="overflow-auto custom-scrollbar">
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 z-30 bg-white shadow-sm print:static">
                            <tr className="bg-gray-50">
                                <th className="p-4 w-[250px] min-w-[250px] sticky left-0 bg-white z-40 text-left border-r border-b border-gray-200 print:static print:border-black">
                                    <div className="font-black text-[10px] text-gray-400 uppercase tracking-widest print:text-black">Projet / Chantier</div>
                                </th>
                                {weeks.map(w => {
                                    const { start } = getWeekDates(w, year);
                                    return (
                                        <th key={w} className="p-2 min-w-[50px] text-center border-r border-b border-gray-100 print:border-black">
                                            <div className="text-[9px] font-black text-gray-400 print:text-black">S{w}</div>
                                            <div className="text-[7px] font-bold text-gray-300 uppercase print:text-black">{start.toLocaleDateString('fr-FR', {month: 'short'})}</div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {chantiers.map(c => (
                                <tr key={c.id} className="border-b border-gray-50 print:border-black">
                                    <td className="p-3 sticky left-0 bg-white z-20 border-r border-gray-200 print:static print:border-black">
                                        <div className="font-bold text-[11px] uppercase truncate print:whitespace-normal">{c.nom}</div>
                                        <div className="text-[8px] font-black text-gray-400 mt-1 uppercase">{c.statut} • Goal: {c.effectif_prevu}p</div>
                                    </td>
                                    {weeks.map(w => {
                                        const data = calculateLoad(c, w);
                                        return (
                                            <td key={w} className="p-0.5 border-r border-gray-50 h-10 print:border-black" onClick={() => data && setModalConfig({isOpen: true, chantier: c, week: w})}>
                                                {data ? (
                                                    <div className={`w-full h-full rounded border flex items-center justify-center text-[10px] font-black ${data.statusClass} print:!bg-gray-100 print:text-black print:border-black`}>
                                                        {data.staffed}/{data.need}
                                                    </div>
                                                ) : null}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* GRAPHIQUE (On utilise une div simple pour le print) */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 print:block">
                <div className="bg-white rounded-[35px] p-8 shadow-sm border border-gray-200 print:border-black print:rounded-none print:mt-10">
                    <h3 className="font-black text-lg uppercase mb-6 print:text-black">Charge Globale de l'Entreprise</h3>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={graphData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} />
                                <YAxis axisLine={false} />
                                <Tooltip />
                                <ReferenceLine y={totalCapacity} stroke="#d63031" strokeDasharray="5 5" label={{ value: 'CAPACITÉ MAX', fill: '#d63031', fontSize: 10, fontWeight: 'bold' }} />
                                <Bar dataKey="Total" radius={[4, 4, 0, 0]}>
                                    {graphData.map((entry: any, index: number) => (
                                        <Cell key={index} fill={entry.Total > totalCapacity ? "#d63031" : "#00b894"} />
                                    ))}
                                </Bar>
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>

        {/* MODALE (Cachée en print d'office car fixed) */}
        {modalConfig.isOpen && modalConfig.chantier && modalConfig.week && (
            <LoadAssignmentModal 
                chantier={modalConfig.chantier}
                week={modalConfig.week}
                year={year}
                employes={employes}
                assignments={assignments}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                onSave={handleSave}
            />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MODALE D'AFFECTATION (Isolée)
// ============================================================================

function LoadAssignmentModal({ chantier, week, year, employes, assignments, onClose, onSave }: any) {
    const { start, end } = getWeekDates(week, year);
    const [selectedIds, setSelectedIds] = useState<string[]>(() => {
        return assignments.filter((a: any) => a.chantier_id === chantier.id && new Date(a.date_debut) <= end && new Date(a.date_fin) >= start).map((a: any) => a.employe_id);
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                <div className="p-8 border-b border-gray-100 flex justify-between items-start bg-gray-50">
                    <div>
                        <h3 className="font-black text-2xl uppercase tracking-tighter">{chantier.nom}</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Semaine {week} ({start.toLocaleDateString()})</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white rounded-full border border-gray-200 hover:bg-gray-100"><X size={20}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-3 custom-scrollbar">
                    {employes.map((emp: any) => {
                        const isSelected = selectedIds.includes(emp.id);
                        const isBusy = assignments.some((a: any) => a.employe_id === emp.id && a.chantier_id !== chantier.id && new Date(a.date_debut) <= end && new Date(a.date_fin) >= start);
                        return (
                            <div key={emp.id} onClick={() => !isBusy && setSelectedIds(prev => isSelected ? prev.filter(x => x !== emp.id) : [...prev, emp.id])} 
                                 className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${isBusy ? 'opacity-30 grayscale cursor-not-allowed border-transparent' : isSelected ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-transparent hover:bg-white hover:border-gray-200'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm ${isSelected ? 'bg-blue-500 text-white' : 'bg-white text-gray-400'}`}>{emp.prenom[0]}{emp.nom[0]}</div>
                                    <div>
                                        <p className="font-black text-sm">{emp.prenom} {emp.nom}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">{isBusy ? 'Occupé' : emp.role}</p>
                                    </div>
                                </div>
                                {isSelected ? <CheckSquare className="text-blue-500" size={24} /> : <Square className="text-gray-200" size={24} />}
                            </div>
                        );
                    })}
                </div>
                <div className="p-8 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                    <button onClick={onClose} className="px-6 py-2 text-gray-400 font-black text-xs uppercase">Annuler</button>
                    <button onClick={() => onSave(selectedIds, chantier.id, week)} className="bg-[#0984e3] text-white px-8 py-3 rounded-2xl font-black text-xs uppercase shadow-lg hover:scale-105 transition-all">Valider</button>
                </div>
            </div>
        </div>
    );
}