"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ChevronLeft, ChevronRight, Users, 
  CalendarRange, TrendingUp, Printer, X, Save, 
  CheckSquare, Square, BarChart3, AlertCircle
} from 'lucide-react';

// --- HELPERS DATES ---
const getWeekNumber = (d: Date) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const getWeekDates = (w: number, y: number) => {
  const simple = new Date(y, 0, 1 + (w - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  
  const end = new Date(ISOweekStart);
  end.setDate(end.getDate() + 6); // Dimanche
  const workEnd = new Date(ISOweekStart);
  workEnd.setDate(workEnd.getDate() + 4); // Vendredi pour l'insertion

  return { start: ISOweekStart, end, workEnd };
};

export default function PlanningChargePage() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [employes, setEmployes] = useState<any[]>([]); 

  // États Modale
  const [showModal, setShowModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{chantier: any, week: number} | null>(null);
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);

  // 1. CHARGEMENT
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: chan } = await supabase.from('chantiers').select('*').neq('statut', 'termine').order('nom');
    const { data: plan } = await supabase.from('planning').select('*').not('chantier_id', 'is', null);
    const { data: emp } = await supabase.from('employes').select('id, nom, prenom, role').eq('statut_actuel', 'disponible').order('nom');

    if (chan) setChantiers(chan);
    if (plan) setAssignments(plan);
    if (emp) setEmployes(emp);
    setLoading(false);
  };

  const weeks = Array.from({ length: 52 }, (_, i) => i + 1);

  // 3. LOGIQUE CALCUL CHARGE (UNIQUES)
  const calculateLoad = (chantier: any, weekNum: number) => {
    const { start: weekStart, end: weekEnd } = getWeekDates(weekNum, year);
    if (!chantier.date_debut || !chantier.date_fin) return null;
    
    const cS = new Date(chantier.date_debut);
    const cE = new Date(chantier.date_fin);
    if (!(cS <= weekEnd && cE >= weekStart)) return null;

    let need = chantier.effectif_prevu || 0; 
    if (chantier.statut === 'potentiel' && chantier.taux_reussite) need = Math.round(need * (chantier.taux_reussite / 100));

    const relevant = assignments.filter(a => {
        if (a.chantier_id !== chantier.id) return false;
        const aS = new Date(a.date_debut);
        const aE = new Date(a.date_fin);
        return aS <= weekEnd && aE >= weekStart;
    });

    const uniquePeople = new Set(relevant.map(a => a.employe_id || a.user_id));
    const staffed = uniquePeople.size;
    const missing = Math.max(0, need - staffed);
    
    let statusClass = 'bg-gray-50 border-gray-100 text-gray-400';
    let textInfo = ""; 

    if (chantier.statut === 'potentiel') {
        statusClass = 'bg-purple-50 border-purple-200 text-purple-700 dashed-border'; 
        textInfo = `${chantier.taux_reussite || 0}%`;
    } else if (need > 0) {
        if (staffed === 0) statusClass = 'bg-red-50 border-red-100 text-red-400 hover:bg-red-100'; 
        else if (missing > 0) statusClass = missing >= need * 0.5 ? 'bg-red-100 border-red-200 text-red-700 hover:bg-red-200' : 'bg-orange-100 border-orange-200 text-orange-700 hover:bg-orange-200';
        else if (staffed > need) statusClass = 'bg-blue-100 border-blue-200 text-blue-700 hover:bg-blue-200'; 
        else statusClass = 'bg-emerald-100 border-emerald-200 text-emerald-700 hover:bg-emerald-200'; 
    }
    return { need, staffed, missing, statusClass, textInfo };
  };

  // 4. CALCUL TOTAUX HEBDOMADAIRES (Global)
  const calculateWeeklyTotal = (weekNum: number) => {
    let totalNeed = 0;
    let totalStaffed = 0;

    chantiers.forEach(c => {
        const load = calculateLoad(c, weekNum);
        if (load) {
            totalNeed += load.need;
            totalStaffed += load.staffed;
        }
    });
    return { totalNeed, totalStaffed, gap: totalNeed - totalStaffed };
  };

  // Trouver la charge MAX de l'année pour échelle graphique
  const maxYearlyLoad = Math.max(...weeks.map(w => calculateWeeklyTotal(w).totalNeed), 1); // Avoid div/0

  // --- HANDLERS ---
  const handleCellClick = (chantier: any, week: number) => {
      setSelectedCell({ chantier, week });
      const { start, end } = getWeekDates(week, year);
      const existing = assignments.filter(a => 
          a.chantier_id === chantier.id && 
          new Date(a.date_debut) <= end && 
          new Date(a.date_fin) >= start
      ).map(a => a.employe_id || a.user_id);
      
      setSelectedEmpIds(existing);
      setShowModal(true);
  };

  const toggleEmployeeSelection = (empId: string) => {
      if (selectedEmpIds.includes(empId)) setSelectedEmpIds(prev => prev.filter(id => id !== empId));
      else setSelectedEmpIds(prev => [...prev, empId]);
  };

  const saveAssignments = async () => {
      if (!selectedCell) return;
      const { start, workEnd } = getWeekDates(selectedCell.week, year);
      
      // On supprime d'abord les affectations existantes sur ce créneau (Lundi-Ven) pour ce chantier
      // NOTE: En prod, il faudrait être plus précis sur les dates, ici on remplace la semaine.
      const empToDelete = assignments.filter(a => 
          a.chantier_id === selectedCell.chantier.id && 
          new Date(a.date_debut) <= workEnd && 
          new Date(a.date_fin) >= start
      ).map(a => a.id);

      if(empToDelete.length > 0) {
          await supabase.from('planning').delete().in('id', empToDelete);
      }

      const newAssignments = selectedEmpIds.map(empId => ({
          chantier_id: selectedCell.chantier.id,
          employe_id: empId,
          date_debut: start.toISOString().split('T')[0],
          date_fin: workEnd.toISOString().split('T')[0],
          type: 'chantier'
      }));

      if (newAssignments.length > 0) {
          const { error } = await supabase.from('planning').insert(newAssignments);
          if (error) alert("Erreur: " + error.message);
      }
      
      alert("✅ Planning mis à jour !");
      setShowModal(false);
      fetchData();
  };

  // --- GROUPES ---
  const groupedChantiers = {
      en_cours: chantiers.filter(c => c.statut === 'en_cours'),
      planifie: chantiers.filter(c => c.statut === 'planifie'),
      potentiel: chantiers.filter(c => c.statut === 'potentiel')
  };

  return (
    <div className="min-h-screen bg-[#f0f3f4] font-['Fredoka'] flex flex-col text-gray-800 ml-0 md:ml-0 transition-all print:bg-white print:m-0 print:p-0">
      
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 p-4 md:p-6 sticky top-0 z-40 shadow-sm print:hidden">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h1 className="text-2xl font-black uppercase text-[#2d3436] flex items-center gap-3">
                    <CalendarRange className="text-[#00b894]" size={32}/>
                    Planning de <span className="text-[#00b894]">Charge</span>
                </h1>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                    Pilotage stratégique des ressources {year}
                </p>
            </div>
            <div className="flex items-center gap-6">
                <div className="flex gap-4 text-[10px] font-bold uppercase">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-100 border border-emerald-300 rounded"></div> Complet</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded"></div> Manque</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div> Critique</div>
                </div>
                <div className="flex items-center bg-gray-100 rounded-xl p-1">
                    <button onClick={() => setYear(year - 1)} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronLeft size={16}/></button>
                    <span className="px-4 font-black text-sm">{year}</span>
                    <button onClick={() => setYear(year + 1)} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronRight size={16}/></button>
                </div>
                <button onClick={() => window.print()} className="bg-[#2d3436] text-white p-3 rounded-xl hover:bg-black transition-colors shadow-lg">
                    <Printer size={20} />
                </button>
            </div>
        </div>
      </div>

      {/* TABLEAU */}
      <div className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col print:p-0 print:overflow-visible">
        {loading ? (
            <div className="flex-1 flex items-center justify-center font-bold text-gray-400 animate-pulse">Synchronisation...</div>
        ) : (
            <div className="bg-white rounded-[20px] shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden relative print:border-none print:shadow-none">
                <div className="overflow-auto flex-1 custom-scrollbar print:overflow-visible">
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 z-30 bg-white shadow-sm print:static">
                            <tr>
                                <th className="p-4 w-[300px] min-w-[300px] sticky left-0 bg-white z-40 text-left border-r border-gray-200 border-b">
                                    <div className="font-black text-xs text-gray-400 uppercase">Chantiers Actifs</div>
                                </th>
                                {weeks.map(w => {
                                    const { start } = getWeekDates(w, year);
                                    const isCurrentWeek = getWeekNumber(new Date()) === w && new Date().getFullYear() === year;
                                    return (
                                        <th key={w} className={`p-2 min-w-[60px] text-center border-r border-b border-gray-100 ${isCurrentWeek ? 'bg-blue-50/50' : ''}`}>
                                            <div className="text-[10px] font-black text-gray-400 uppercase">S{w}</div>
                                            <div className="text-[8px] font-bold text-gray-300">{start.getDate()}/{start.getMonth()+1}</div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {/* Groupes */}
                            {groupedChantiers.en_cours.length > 0 && <tr className="bg-blue-50/50 sticky left-0 z-10"><td colSpan={53} className="p-2 font-black text-xs uppercase text-blue-600 tracking-widest border-b border-blue-100 pl-4">En Cours</td></tr>}
                            {groupedChantiers.en_cours.map(c => <RowChantier key={c.id} chantier={c} weeks={weeks} year={year} calculateLoad={calculateLoad} onCellClick={handleCellClick} />)}
                            
                            {groupedChantiers.planifie.length > 0 && <tr className="bg-emerald-50/50 sticky left-0 z-10"><td colSpan={53} className="p-2 font-black text-xs uppercase text-emerald-600 tracking-widest border-b border-emerald-100 pl-4 mt-4">Planifiés</td></tr>}
                            {groupedChantiers.planifie.map(c => <RowChantier key={c.id} chantier={c} weeks={weeks} year={year} calculateLoad={calculateLoad} onCellClick={handleCellClick} />)}
                            
                            {groupedChantiers.potentiel.length > 0 && <tr className="bg-purple-50/50 sticky left-0 z-10"><td colSpan={53} className="p-2 font-black text-xs uppercase text-purple-600 tracking-widest border-b border-purple-100 pl-4 mt-4">Opportunités</td></tr>}
                            {groupedChantiers.potentiel.map(c => <RowChantier key={c.id} chantier={c} weeks={weeks} year={year} calculateLoad={calculateLoad} onCellClick={handleCellClick} />)}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
      </div>

      {/* --- GRAPHIQUE CHARGE GLOBALE (NOUVEAU) --- */}
      <div className="p-6 pt-0 print:p-0 print:mt-4">
          <div className="bg-white rounded-[25px] shadow-sm border border-gray-200 p-6 print:border-none print:shadow-none">
              <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gray-100 p-2 rounded-xl text-gray-600"><BarChart3 size={24}/></div>
                  <div>
                      <h3 className="font-black uppercase text-gray-800">Charge Hebdomadaire Globale</h3>
                      <p className="text-xs font-bold text-gray-400">Visualisation des effectifs nécessaires vs staffés</p>
                  </div>
              </div>
              
              <div className="h-48 flex items-end gap-1 w-full overflow-x-auto custom-scrollbar pb-2">
                  {weeks.map(w => {
                      const total = calculateWeeklyTotal(w);
                      const heightPercent = (total.totalNeed / maxYearlyLoad) * 100;
                      const staffPercent = total.totalNeed > 0 ? (total.totalStaffed / total.totalNeed) * 100 : 0;
                      const isCurrent = getWeekNumber(new Date()) === w && new Date().getFullYear() === year;
                      
                      // Couleur dynamique
                      let barColor = 'bg-emerald-400';
                      if (total.gap > 0) barColor = 'bg-orange-400';
                      if (total.gap > 5) barColor = 'bg-red-400';
                      if (total.totalNeed === 0) barColor = 'bg-gray-100';

                      return (
                          <div key={w} className="flex-1 min-w-[20px] flex flex-col items-center gap-1 group relative">
                              {total.totalNeed > 0 && (
                                  <>
                                      {/* Tooltip Graphique */}
                                      <div className="absolute bottom-full mb-2 bg-black text-white text-[9px] p-2 rounded shadow-xl hidden group-hover:block z-50 whitespace-nowrap">
                                          <p className="font-bold uppercase">S{w}</p>
                                          <p>Besoin: {total.totalNeed}</p>
                                          <p>Staffé: {total.totalStaffed}</p>
                                          <p className={total.gap > 0 ? 'text-red-300' : 'text-green-300'}>Gap: {total.gap * -1}</p>
                                      </div>
                                      
                                      <span className="text-[8px] font-bold text-gray-400">{total.totalNeed}</span>
                                      
                                      {/* Barre Besoin (Fond) */}
                                      <div className={`w-full rounded-t-sm bg-gray-100 relative overflow-hidden transition-all duration-500 hover:brightness-95 ${isCurrent ? 'ring-2 ring-blue-200' : ''}`} style={{ height: `${Math.max(heightPercent, 5)}%` }}>
                                          {/* Barre Staffé (Remplissage) */}
                                          <div 
                                              className={`w-full absolute bottom-0 transition-all duration-700 ${barColor}`} 
                                              style={{ height: `${Math.min(staffPercent, 100)}%` }}
                                          ></div>
                                      </div>
                                      <span className={`text-[8px] font-black ${isCurrent ? 'text-blue-600' : 'text-gray-300'}`}>S{w}</span>
                                  </>
                              )}
                          </div>
                      );
                  })}
              </div>
          </div>
      </div>

      {/* --- MODALE D'AFFECTATION --- */}
      {showModal && selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in print:hidden">
            <div className="bg-white rounded-[30px] w-full max-w-lg shadow-2xl p-6 overflow-hidden flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="font-black text-xl text-[#2d3436]">Affectation Équipe</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase mt-1">
                            {selectedCell.chantier.nom} — Semaine {selectedCell.week}
                        </p>
                    </div>
                    <button onClick={() => setShowModal(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors">
                        <X size={20}/>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                    {employes.map(emp => {
                        const isSelected = selectedEmpIds.includes(emp.id);
                        return (
                            <div key={emp.id} onClick={() => toggleEmployeeSelection(emp.id)} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-100 hover:bg-white'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>{emp.prenom.charAt(0)}{emp.nom.charAt(0)}</div>
                                    <div>
                                        <p className={`font-bold text-sm ${isSelected ? 'text-blue-800' : 'text-gray-700'}`}>{emp.prenom} {emp.nom}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">{emp.role}</p>
                                    </div>
                                </div>
                                {isSelected ? <CheckSquare className="text-blue-500" size={20} /> : <Square className="text-gray-300" size={20} />}
                            </div>
                        )
                    })}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-2">
                    <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-400 font-bold hover:bg-gray-50 rounded-xl">Annuler</button>
                    <button onClick={saveAssignments} className="bg-[#0984e3] hover:bg-[#0074d9] text-white px-6 py-2.5 rounded-xl font-bold uppercase flex items-center gap-2 shadow-lg"><Save size={16}/> Enregistrer ({selectedEmpIds.length})</button>
                </div>
            </div>
        </div>
      )}

      {/* --- STYLE PRINT --- */}
      <style jsx global>{`
        @media print {
          @page { size: landscape; margin: 5mm; }
          body { background: white; }
          .print\\:hidden { display: none !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:overflow-visible { overflow: visible !important; }
          .print\\:border-none { border: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:mt-4 { margin-top: 1rem !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}

// --- SOUS-COMPOSANT LIGNE ---
const RowChantier = ({ chantier, weeks, year, calculateLoad, onCellClick }: any) => (
    <tr className="group hover:bg-gray-50 transition-colors border-b border-gray-50">
        <td className="p-3 sticky left-0 bg-white group-hover:bg-gray-50 z-20 border-r border-gray-200">
            <div className="flex flex-col">
                <span className="font-black text-xs text-gray-800 uppercase truncate max-w-[200px]">{chantier.nom}</span>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${chantier.statut === 'potentiel' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>{chantier.statut === 'potentiel' ? 'Offre' : (chantier.type || 'Indus.')}</span>
                    {chantier.effectif_prevu && <span className="text-[8px] text-gray-400 font-bold flex items-center gap-1"><Users size={8}/> {chantier.effectif_prevu}</span>}
                </div>
            </div>
        </td>
        {weeks.map((w: number) => {
            const data = calculateLoad(chantier, w);
            const isCurrentWeek = getWeekNumber(new Date()) === w && new Date().getFullYear() === year;
            return (
                <td key={w} className={`p-0.5 border-r border-gray-100 h-14 relative ${isCurrentWeek ? 'bg-blue-50/30' : ''}`} onClick={() => data && onCellClick(chantier, w)}>
                    {data ? (
                        <div className={`w-full h-full rounded border ${data.statusClass} p-0.5 flex flex-col justify-center items-center cursor-pointer hover:brightness-95 transition-all relative group/cell`}>
                            <div className="text-[10px] font-black flex items-center gap-0.5">{data.staffed} <span className="text-[7px] opacity-60">/{data.need}</span></div>
                            {data.missing > 0 && <div className="absolute top-0 right-0 -mt-1 -mr-1 w-3 h-3 bg-red-500 rounded-full text-[6px] text-white flex items-center justify-center font-bold shadow-sm">!</div>}
                        </div>
                    ) : <div className="w-full h-full group-hover:bg-gray-100/50 transition-colors"></div>}
                </td>
            );
        })}
    </tr>
);
