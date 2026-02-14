"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ChevronLeft, ChevronRight, HardHat, Plus, 
  Printer, Trash2, Activity, 
  X, Loader2, Eraser, CalendarDays, Save
} from 'lucide-react';

// --- HELPER: Format Local Date to YYYY-MM-DD ---
const toLocalISOString = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
  return adjustedDate.toISOString().split('T')[0];
};

export default function PlanningPage() {
  const [employes, setEmployes] = useState<any[]>([]);
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
   
  // Initialisation au Lundi
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  });

  // MODES
  const [modePointage, setModePointage] = useState(false); // Par défaut false, bouton supprimé donc reste false

  // ÉTATS UI
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selection, setSelection] = useState<{chantierId: string | null, date: string, type: string} | null>(null);
  const [selectedEmployes, setSelectedEmployes] = useState<string[]>([]); // Multi-select
  const [dateRange, setDateRange] = useState({ start: '', end: '' }); // Plage de dates

  // --- 1. CHARGEMENT DONNÉES ---
  const fetchData = async () => {
    setLoading(true);
    
    // Employés
    const { data: emp } = await supabase.from('employes').select('*').order('nom');
    if (emp) setEmployes(emp);

    // Chantiers (Actifs)
    const { data: chan } = await supabase.from('chantiers').select('id, nom, adresse').neq('statut', 'termine').order('nom');
    if (chan) setChantiers(chan);
    
    // Planning (Sur une plage large pour éviter les rechargements constants)
    const { data: plan } = await supabase
        .from('planning')
        .select(`
            *,
            employes (id, nom, prenom, role),
            chantiers (nom)
        `);
    
    // Normalisation
    const formattedPlan = plan?.map(p => ({
        ...p,
        users: p.employes // Alias pour compatibilité
    })) || [];

    setAssignments(formattedPlan);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentDate]);

  // --- 2. CALCULS DE TEMPS (SÉMAINE) ---
  const weekDays = useMemo(() => Array.from({ length: 5 }, (_, i) => {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(start.setDate(diff));
    monday.setDate(monday.getDate() + i);
    return monday;
  }), [currentDate]);

  // Calcul des heures par personne sur la semaine
  const weeklyHours = useMemo(() => {
      const stats: any = {};
      assignments.forEach(a => {
          if (!a.employe_id || !a.heures) return;
          const aDate = new Date(a.date_debut);
          if (aDate >= weekDays[0] && aDate <= weekDays[4]) {
              stats[a.employe_id] = (stats[a.employe_id] || 0) + (a.heures || 0);
          }
      });
      return stats;
  }, [assignments, weekDays]);

  // --- 3. ACTIONS ---

  // Suppression
  const deleteAssignment = async (id: string) => {
    if(confirm("Retirer ce collaborateur ?")) {
      await supabase.from('planning').delete().eq('id', id);
      fetchData(); // Rafraîchir pour synchro immédiate
    }
  };

  // Reset Semaine
  const resetWeek = async () => {
      if(!confirm("⚠️ ATTENTION : Cela va effacer TOUTES les affectations de cette semaine. Continuer ?")) return;
      
      const startStr = toLocalISOString(weekDays[0]);
      const endStr = toLocalISOString(weekDays[4]);

      // Suppression par plage de date
      const { error } = await supabase.from('planning')
          .delete()
          .gte('date_debut', startStr)
          .lte('date_debut', endStr);

      if (error) alert("Erreur reset: " + error.message);
      else fetchData();
  };

  // Ouverture Modale (Ajout)
  const openAssignmentModal = (chantierId: string | null, date: Date, typeContext: string = 'chantier') => {
    const dateStr = toLocalISOString(date);
    const initialType = typeContext === 'hors_chantier' ? 'conge' : 'chantier';
    
    setSelection({ chantierId, date: dateStr, type: initialType });
    setDateRange({ start: dateStr, end: dateStr }); // Par défaut, 1 jour
    setSelectedEmployes([]); // Reset sélection
    setIsModalOpen(true);
  };

  // Sauvegarde (Multi + Plage Dates)
  const saveAssignment = async () => {
    if (!selection || selectedEmployes.length === 0) return;
    
    const finalType = selection.chantierId ? 'chantier' : selection.type;
    const newAssignments: any[] = [];

    // Boucle sur les jours (Plage de dates)
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    
    // Sécurité boucle infinie
    if (end < start) { alert("La date de fin doit être après la date de début."); return; }
    
    // Pour chaque jour de la plage
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const currentIso = toLocalISOString(d);

        selectedEmployes.forEach(empId => {
            const exists = assignments.find(a => 
                a.employe_id === empId && 
                a.date_debut === currentIso && 
                a.chantier_id === selection.chantierId
            );

            if (!exists) {
                newAssignments.push({
                    employe_id: empId,
                    chantier_id: selection.chantierId,
                    date_debut: currentIso,
                    date_fin: currentIso, 
                    type: finalType,
                    odm_envoye: false,
                    heures: 0 
                });
            }
        });
    }

    if (newAssignments.length > 0) {
        const { error } = await supabase.from('planning').insert(newAssignments);
        if (error) alert("Erreur insertion: " + error.message);
        else {
            setIsModalOpen(false);
            fetchData();
        }
    } else {
        setIsModalOpen(false);
    }
  };

  // Mise à jour des heures (Mode Pointage - Fonctions conservées même si bouton masqué)
  const updateHours = async (id: string, hours: number) => {
      const newAssignments = assignments.map(a => a.id === id ? { ...a, heures: hours } : a);
      setAssignments(newAssignments);
      await supabase.from('planning').update({ heures: hours }).eq('id', id);
  };

  // --- RENDER ---
  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#00b894]" size={40} /></div>;

  return (
    <div className="min-h-screen bg-[#f0f3f4] p-4 md:p-6 font-['Fredoka'] ml-0 md:ml-0 transition-all text-gray-800 print:bg-white print:p-0 print:m-0 print:min-h-0 print:w-full print:absolute print:top-0 print:left-0 z-50">
      
      {/* STYLE SPÉCIFIQUE POUR L'IMPRESSION */}
      {/* Modification : Force l'affichage des background-colors et cache les sidebars/navs globaux */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: landscape; margin: 5mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          aside, nav, header, .sidebar, .navbar { display: none !important; } 
          .no-print { display: none !important; }
        }
      `}} />

      {/* HEADER (Masqué print) */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-black uppercase text-[#2d3436] tracking-tight">
              <span>Planning <span className="text-[#00b894]">Chantiers</span></span>
          </h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">
              Vue Équipes & Affectations
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center">
            
            {/* BOUTON RESET */}
            <button onClick={resetWeek} className="bg-red-50 text-red-500 border border-red-100 px-4 py-2 rounded-xl font-bold uppercase text-xs hover:bg-red-100 flex items-center gap-2">
                <Eraser size={16} /> Reset Semaine
            </button>

            <button onClick={() => window.print()} className="bg-[#2d3436] text-white px-4 py-2 rounded-xl font-bold uppercase text-xs hover:bg-black flex items-center gap-2 shadow-lg">
                <Printer size={16} />
            </button>

            {/* NAV SEMAINE */}
            <div className="flex items-center bg-white rounded-xl p-1 shadow-sm border border-gray-200">
                <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><ChevronLeft size={20}/></button>
                <div className="px-4 text-center min-w-[140px]">
                    <span className="block text-[10px] font-black uppercase text-gray-400">Semaine du</span>
                    <span className="block text-sm font-black text-gray-800">{weekDays[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>
                </div>
                <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><ChevronRight size={20}/></button>
            </div>
        </div>
      </div>

      {/* HEADER IMPRESSION */}
      <div className="hidden print:flex justify-between items-center mb-4 border-b-2 border-black pb-2">
          <div>
            <h1 className="text-xl font-black uppercase">Planning Hebdomadaire</h1>
            <p className="text-xs text-gray-600">Semaine du {weekDays[0].toLocaleDateString('fr-FR')} au {weekDays[4].toLocaleDateString('fr-FR')}</p>
          </div>
          <div className="text-right">
             <p className="text-[10px] uppercase font-bold text-gray-400">Généré le {new Date().toLocaleDateString()}</p>
          </div>
      </div>

      {/* TABLEAU PRINCIPAL */}
      <div className="bg-white rounded-[20px] shadow-sm overflow-hidden border border-gray-200 overflow-x-auto print:border-none print:shadow-none print:overflow-visible print:rounded-none">
        <table className="w-full min-w-[900px] border-collapse text-left print:min-w-0 print:w-full print:table-fixed">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200 print:bg-white print:border-black print:border-b-2">
              <th className="p-4 w-[250px] sticky left-0 bg-gray-100 z-20 font-black uppercase text-xs text-gray-500 border-r border-gray-200 print:static print:bg-white print:text-black print:border print:border-black print:w-[200px]">
                Chantiers / Projets
              </th>
              {weekDays.map((day, i) => (
                <th key={i} className="p-3 border-l border-gray-200 text-center min-w-[140px] print:border print:border-black print:min-w-0">
                  <p className="text-[10px] uppercase font-black text-gray-500 mb-1 print:text-black">{day.toLocaleDateString('fr-FR', { weekday: 'long' })}</p>
                  <span className="inline-block px-2 py-0.5 rounded text-sm font-black text-gray-800 bg-white border border-gray-200 print:border-0 print:text-lg">{day.getDate()}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 print:divide-black">
            {/* LIGNES CHANTIERS */}
            {chantiers.map((chantier) => (
              <tr key={chantier.id} className="group hover:bg-gray-50 transition-colors print:break-inside-avoid">
                <td className="p-4 sticky left-0 bg-white z-10 border-r border-gray-200 group-hover:bg-gray-50 transition-colors print:static print:bg-white print:border print:border-black print:p-2">
                  <div className="flex items-start gap-3">
                      {/* Retour de la couleur à l'impression */}
                      <div className="bg-[#00b894] p-2 rounded-lg text-white mt-1"><HardHat size={18} /></div>
                      <div>
                          <p className="font-black text-gray-800 text-sm uppercase leading-tight print:text-xs">{chantier.nom}</p>
                          <p className="text-[10px] text-gray-400 uppercase mt-0.5 max-w-[150px] truncate print:text-gray-600 print:whitespace-normal">{chantier.adresse || 'Localisation non définie'}</p>
                      </div>
                  </div>
                </td>
                
                {weekDays.map((day, i) => {
                  const dateStr = toLocalISOString(day);
                  const dailyMissions = assignments.filter(a => a.chantier_id === chantier.id && a.date_debut === dateStr);
                  
                  return (
                    <td key={i} className="p-2 border-l border-gray-100 align-top h-28 relative print:border print:border-black print:h-auto print:p-1">
                      <div className="flex flex-col gap-1.5 h-full">
                          {dailyMissions.map((mission) => (
                              // Retour des couleurs (suppression des overrides print noir et blanc)
                              <div key={mission.id} className={`p-2 rounded-lg shadow-sm flex items-center justify-between group/card relative ${modePointage ? 'bg-orange-50 border border-orange-100' : 'bg-[#0984e3] text-white'} print:shadow-none print:p-1`}>
                                  <div className="flex items-center gap-2 w-full">
                                      {!modePointage && (
                                          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[9px] font-bold shrink-0 print:text-white print:w-4 print:h-4 print:text-[8px]">
                                              {mission.users?.prenom?.charAt(0) || '?'}{mission.users?.nom?.charAt(0) || '?'}
                                          </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                          <span className={`text-[10px] font-bold uppercase truncate block ${modePointage ? 'text-gray-800' : 'text-white'} print:text-[9px] print:whitespace-normal`}>
                                              {mission.users?.nom || 'Inconnu'} {mission.users?.prenom?.charAt(0) || ''}.
                                          </span>
                                          
                                          {/* Mode impression : Afficher heures si renseignées */}
                                          <div className="hidden print:block text-[8px] font-bold mt-0.5">
                                             {mission.heures > 0 ? `${mission.heures}h` : ''}
                                          </div>
                                      </div>
                                  </div>

                                  {/* Actions Rapides (Suppression) */}
                                  {!modePointage && (
                                      <div className="hidden group-hover/card:flex gap-1 print:hidden">
                                          <button onClick={(e) => {e.stopPropagation(); deleteAssignment(mission.id)}} className="p-1 rounded bg-red-500/80 hover:bg-red-500 text-white">
                                              <Trash2 size={10} />
                                          </button>
                                      </div>
                                  )}
                              </div>
                          ))}

                          {/* Bouton Ajouter */}
                          {!modePointage && (
                              <button 
                                onClick={() => openAssignmentModal(chantier.id, day, 'chantier')}
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
            ))}

            {/* SECTION HORS CHANTIER */}
            <tr className="bg-gray-50 border-t-4 border-white print:border-black print:border-t-2 print:bg-white print:break-inside-avoid">
                <td className="p-4 sticky left-0 bg-gray-50 z-10 border-r border-gray-200 print:static print:bg-white print:border print:border-black print:p-2">
                    <div className="flex items-center gap-3">
                        <div className="bg-gray-400 p-2 rounded-lg text-white"><Activity size={18} /></div>
                        <div>
                            <p className="font-black text-gray-600 text-xs uppercase leading-tight print:text-black">Hors Chantier</p>
                            <p className="text-[9px] text-gray-400 uppercase mt-0.5 print:text-gray-600">Absences / Formations</p>
                        </div>
                    </div>
                </td>
                {weekDays.map((day, i) => {
                    const dateStr = toLocalISOString(day);
                    const dailyOffs = assignments.filter(a => !a.chantier_id && a.date_debut === dateStr);
                    return (
                        <td key={i} className="p-2 border-l border-gray-200 align-top h-24 print:border print:border-black print:h-auto print:p-1">
                            <div className="flex flex-col gap-1.5">
                                {dailyOffs.map((mission) => {
                                    let color = "bg-gray-400";
                                    if(mission.type === 'conge') color = "bg-[#e17055]";
                                    if(mission.type === 'maladie') color = "bg-[#d63031]";
                                    return (
                                        // Retour couleurs
                                        <div key={mission.id} className={`${color} text-white p-2 rounded-lg shadow-sm flex items-center justify-between group/card print:shadow-none print:p-1`}>
                                            <span className="text-[10px] font-bold uppercase truncate print:text-[9px] print:whitespace-normal">{mission.users?.nom || 'Inconnu'}</span>
                                            <span className="text-[8px] opacity-80 uppercase px-1 bg-black/10 rounded ml-1 print:border print:border-black print:opacity-100">{mission.type}</span>
                                            {!modePointage && <button onClick={() => deleteAssignment(mission.id)} className="hidden group-hover/card:block text-white/80 hover:text-white print:hidden"><X size={12} /></button>}
                                        </div>
                                    )
                                })}
                                {!modePointage && <button onClick={() => openAssignmentModal(null, day, 'hors_chantier')} className="mt-2 w-full flex items-center justify-center text-gray-300 hover:text-gray-500 py-1 print:hidden"><Plus size={12} /></button>}
                            </div>
                        </td>
                    )
                })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* MODAL D'AFFECTATION */}
      {isModalOpen && selection && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 print:hidden animate-in fade-in">
          <div className="bg-white rounded-[30px] p-6 w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center mb-6">
              <div>
                  <h2 className="text-xl font-black uppercase text-[#2d3436]">Affecter Ressources</h2>
                  <p className="text-xs text-gray-400 font-bold">
                      {selection.chantierId ? 'Ajout sur chantier' : 'Déclarer absence'}
                  </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2">
                
                {/* 1. PLAGE DE DATES */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block flex items-center gap-1"><CalendarDays size={10}/> Période d'affectation</label>
                    <div className="flex items-center gap-2">
                        <input type="date" className="flex-1 p-2 rounded-lg border text-sm font-bold" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
                        <span className="text-gray-400">à</span>
                        <input type="date" className="flex-1 p-2 rounded-lg border text-sm font-bold" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
                    </div>
                </div>

                {/* 2. SÉLECTION MULTIPLE EMPLOYÉS */}
                <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Sélectionner Collaborateurs ({selectedEmployes.length})</label>
                    <div className="max-h-[200px] overflow-y-auto border border-gray-100 rounded-xl">
                        {employes.map(e => {
                            const isSelected = selectedEmployes.includes(e.id);
                            // Calcul heures déjà planifiées
                            const currentHours = weeklyHours[e.id] || 0;
                            const isOverload = currentHours > 39;

                            return (
                                <div 
                                    key={e.id} 
                                    onClick={() => {
                                        if(isSelected) setSelectedEmployes(prev => prev.filter(id => id !== e.id));
                                        else setSelectedEmployes(prev => [...prev, e.id]);
                                    }}
                                    className={`flex items-center justify-between p-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                            {e.prenom.charAt(0)}{e.nom.charAt(0)}
                                        </div>
                                        <div>
                                            <p className={`font-bold text-sm ${isSelected ? 'text-blue-800' : 'text-gray-700'}`}>{e.nom} {e.prenom}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">{e.role}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* {isOverload && <AlertTriangle size={14} className="text-orange-500" />} */}
                                        {isSelected && <Check className="text-blue-500" size={16} />}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* 3. TYPE (Si hors chantier) */}
                {!selection.chantierId && (
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Type d'absence</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['conge', 'maladie', 'formation'].map(t => (
                                <button key={t} onClick={() => setSelection({ ...selection, type: t })} className={`py-2 rounded-lg text-[10px] font-black uppercase border-2 transition-colors ${selection.type === t ? 'border-black bg-black text-white' : 'border-transparent bg-gray-100 text-gray-500'}`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <button 
                onClick={saveAssignment} 
                disabled={selectedEmployes.length === 0}
                className="w-full mt-6 bg-[#00b894] hover:bg-[#00a383] text-white py-4 rounded-xl font-black uppercase text-sm shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                <Save size={18} /> Valider l'affectation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
