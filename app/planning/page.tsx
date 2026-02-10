"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ChevronLeft, ChevronRight, HardHat, Plus, 
  Printer, AlertTriangle, Trash2, Activity, Check, 
  Send, FileCheck, FileX, X, Calendar as CalendarIcon, User, Users
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
  
  // Initialisation au Lundi de la semaine courante
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Modification : On sélectionne maintenant un Chantier et une Date, puis on choisit l'employé
  const [selection, setSelection] = useState<{chantierId: string | null, date: string, type: string} | null>(null);
  const [selectedEmploye, setSelectedEmploye] = useState("");

  // 1. Chargement des données
  const fetchData = async () => {
    setLoading(true);
    
    const { data: emp } = await supabase.from('users').select('*').order('nom');
    // On récupère uniquement les chantiers actifs ou planifiés pour le tableau
    const { data: chan } = await supabase.from('chantiers').select('id, nom, adresse').in('statut', ['en_cours', 'planifie']).order('nom');
    const { data: plan } = await supabase.from('planning').select('*, users(nom, prenom, role)');
    
    setEmployes(emp || []);
    setChantiers(chan || []);
    setAssignments(plan || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentDate]);

  // 2. Actions sur les ODM
  const handleActionODM = async (id: string, field: string, value: boolean) => {
    await supabase.from('planning').update({ [field]: value }).eq('id', id);
    fetchData();
  };

  // 3. Suppression
  const deleteAssignment = async (id: string) => {
    if(confirm("Retirer ce collaborateur du planning ?")) {
      await supabase.from('planning').delete().eq('id', id);
      fetchData();
    }
  };

  // 4. Modal Open (Adapté pour Chantier -> Employé)
  // typeContext peut être 'chantier' ou 'hors_chantier'
  const openAssignmentModal = (chantierId: string | null, date: Date, typeContext: string = 'chantier') => {
    const dateStr = toLocalISOString(date);
    setSelection({ chantierId, date: dateStr, type: typeContext });
    setSelectedEmploye(""); // Reset employé
    setIsModalOpen(true);
  };

  // 5. Sauvegarde
  const saveAssignment = async () => {
    if (!selection || !selectedEmploye) return;
    
    const insertData = {
      employe_id: selectedEmploye,
      chantier_id: selection.chantierId, // Null si hors chantier
      date_debut: selection.date,
      date_fin: selection.date,
      type: selection.type === 'hors_chantier' ? 'conge' : 'chantier', // Par défaut congé si hors chantier, modifiable ensuite
      odm_envoye: false,
      odm_signe: false
    };

    // Si c'est hors chantier, on vérifie le type (la modal pourrait avoir un sélecteur de type d'absence)
    if (selection.type === 'hors_chantier') {
        // Pour simplifier ici, on met 'conge' par défaut, ou on pourrait ajouter un selecteur dans la modal
        // J'utiliserai le selecteur de type existant dans la modal
    }
    
    // Check doublon basic (optionnel)
    const exists = assignments.find(a => 
        a.employe_id === selectedEmploye && 
        a.date_debut === selection.date
    );

    if (exists) {
        alert("Cet employé est déjà planifié ce jour-là (Chantier: " + (exists.chantier_id || exists.type) + ")");
        return;
    }

    const { error } = await supabase.from('planning').insert([insertData]);

    if (error) {
        alert("Erreur : " + error.message);
    } else {
        setIsModalOpen(false);
        fetchData();
    }
  };

  // Imprimer
  const handlePrint = () => {
    window.print();
  };

  // 6. Calcul des jours
  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(start.setDate(diff));
    monday.setDate(monday.getDate() + i);
    return monday;
  });

  return (
    <div className="min-h-screen bg-[#f0f3f4] p-4 md:p-6 font-['Fredoka'] ml-0 md:ml-0 transition-all text-gray-800">
      
      {/* HEADER (Masqué à l'impression) */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-black uppercase text-[#2d3436] tracking-tight">Planning <span className="text-[#00b894]">Chantiers</span></h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">Vue Équipes & Affectations</p>
        </div>
        
        <div className="flex gap-3">
            <button onClick={handlePrint} className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl font-bold uppercase text-xs hover:bg-gray-50 flex items-center gap-2 shadow-sm">
                <Printer size={16} /> Imprimer
            </button>

            <div className="flex items-center bg-white rounded-xl p-1 shadow-sm border border-gray-200">
                <button 
                    onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }} 
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-black"
                >
                    <ChevronLeft size={20}/>
                </button>
                <div className="px-4 text-center min-w-[140px]">
                    <span className="block text-[10px] font-black uppercase text-gray-400">Semaine du</span>
                    <span className="block text-sm font-black text-gray-800">
                        {weekDays[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                    </span>
                </div>
                <button 
                    onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }} 
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-black"
                >
                    <ChevronRight size={20}/>
                </button>
            </div>
        </div>
      </div>

      {/* HEADER IMPRESSION (Visible uniquement à l'impression) */}
      <div className="hidden print:block mb-8 border-b-2 border-black pb-4">
          <h1 className="text-2xl font-black uppercase">Planning Hebdomadaire</h1>
          <p className="text-sm">Semaine du {weekDays[0].toLocaleDateString('fr-FR')}</p>
      </div>

      {/* TABLEAU PRINCIPAL */}
      <div className="bg-white rounded-[20px] shadow-sm overflow-hidden border border-gray-200 overflow-x-auto print:border-none print:shadow-none">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200 print:bg-gray-200">
              <th className="p-4 w-[250px] sticky left-0 bg-gray-100 z-20 font-black uppercase text-xs text-gray-500 border-r border-gray-200 print:border-gray-400">
                Chantiers / Projets
              </th>
              {weekDays.map((day, i) => (
                <th key={i} className="p-3 border-l border-gray-200 text-center min-w-[160px] print:border-gray-400">
                  <p className="text-[10px] uppercase font-black text-gray-500 mb-1">
                    {day.toLocaleDateString('fr-FR', { weekday: 'long' })}
                  </p>
                  <span className="inline-block px-2 py-0.5 rounded text-sm font-black text-gray-800 bg-white border border-gray-200 print:border-black">
                    {day.getDate()}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* LIGNES CHANTIERS */}
            {chantiers.map((chantier) => (
              <tr key={chantier.id} className="group hover:bg-gray-50 transition-colors print:break-inside-avoid">
                {/* COLONNE NOM CHANTIER */}
                <td className="p-4 sticky left-0 bg-white z-10 border-r border-gray-200 group-hover:bg-gray-50 transition-colors print:border-gray-400">
                  <div className="flex items-start gap-3">
                      <div className="bg-[#00b894] p-2 rounded-lg text-white mt-1 print:text-black print:border print:border-black print:bg-white">
                          <HardHat size={18} />
                      </div>
                      <div>
                          <p className="font-black text-gray-800 text-sm uppercase leading-tight">{chantier.nom}</p>
                          <p className="text-[10px] text-gray-400 uppercase mt-0.5 max-w-[150px] truncate">{chantier.adresse || 'Localisation non définie'}</p>
                      </div>
                  </div>
                </td>
                
                {/* CELLULES JOURS */}
                {weekDays.map((day, i) => {
                  const dateStr = toLocalISOString(day);
                  // Filtrer les affectations pour ce chantier et ce jour
                  const dailyMissions = assignments.filter(a => a.chantier_id === chantier.id && a.date_debut === dateStr);
                  
                  return (
                    <td key={i} className="p-2 border-l border-gray-100 align-top h-32 relative print:border-gray-400 print:h-auto">
                      <div className="flex flex-col gap-1.5 h-full">
                          
                          {/* Liste des employés affectés */}
                          {dailyMissions.map((mission) => (
                              <div key={mission.id} className="bg-[#0984e3] text-white p-2 rounded-lg shadow-sm flex items-center justify-between group/card relative print:bg-white print:border print:border-black print:text-black">
                                  <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[9px] font-bold print:bg-black/10">
                                          {mission.users?.prenom?.charAt(0)}{mission.users?.nom?.charAt(0)}
                                      </div>
                                      <span className="text-[10px] font-bold uppercase truncate max-w-[80px]">
                                          {mission.users?.nom} {mission.users?.prenom?.charAt(0)}.
                                      </span>
                                  </div>

                                  {/* Actions Rapides (Hover) - Masquées à l'impression */}
                                  <div className="hidden group-hover/card:flex gap-1 print:hidden">
                                      <button 
                                        onClick={(e) => {e.stopPropagation(); handleActionODM(mission.id, 'odm_envoye', !mission.odm_envoye)}}
                                        className={`p-1 rounded ${mission.odm_envoye ? 'bg-green-400' : 'bg-white/20 hover:bg-white/40'}`}
                                        title="ODM Envoyé"
                                      >
                                          <Send size={10} />
                                      </button>
                                      <button 
                                        onClick={(e) => {e.stopPropagation(); deleteAssignment(mission.id)}}
                                        className="p-1 rounded bg-red-500/80 hover:bg-red-500"
                                      >
                                          <Trash2 size={10} />
                                      </button>
                                  </div>
                              </div>
                          ))}

                          {/* Bouton Ajouter (Uniquement si pas impression) */}
                          <button 
                            onClick={() => openAssignmentModal(chantier.id, day, 'chantier')}
                            className="mt-auto w-full py-1.5 border-2 border-dashed border-gray-200 rounded-lg text-gray-300 hover:border-[#00b894] hover:text-[#00b894] hover:bg-emerald-50 transition-all flex items-center justify-center print:hidden"
                          >
                              <Plus size={14} />
                          </button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* SECTION HORS CHANTIER (ABSENCES, ETC.) */}
            <tr className="bg-gray-50 border-t-4 border-white print:border-gray-400">
                <td className="p-4 sticky left-0 bg-gray-50 z-10 border-r border-gray-200 print:bg-white print:border-r">
                    <div className="flex items-center gap-3">
                        <div className="bg-gray-400 p-2 rounded-lg text-white print:text-black print:border print:border-black print:bg-white">
                            <Activity size={18} />
                        </div>
                        <div>
                            <p className="font-black text-gray-600 text-xs uppercase leading-tight">Hors Chantier</p>
                            <p className="text-[9px] text-gray-400 uppercase mt-0.5">Absences / Formations</p>
                        </div>
                    </div>
                </td>
                {weekDays.map((day, i) => {
                    const dateStr = toLocalISOString(day);
                    const dailyOffs = assignments.filter(a => !a.chantier_id && a.date_debut === dateStr);

                    return (
                        <td key={i} className="p-2 border-l border-gray-200 align-top h-24 print:border-gray-400">
                            <div className="flex flex-col gap-1.5">
                                {dailyOffs.map((mission) => {
                                    let color = "bg-gray-400";
                                    if(mission.type === 'conge') color = "bg-[#e17055]";
                                    if(mission.type === 'maladie') color = "bg-[#d63031]";
                                    if(mission.type === 'formation') color = "bg-[#6c5ce7]";

                                    return (
                                        <div key={mission.id} className={`${color} text-white p-2 rounded-lg shadow-sm flex items-center justify-between group/card print:bg-white print:border print:border-black print:text-black`}>
                                            <span className="text-[10px] font-bold uppercase truncate">
                                                {mission.users?.nom}
                                            </span>
                                            <span className="text-[8px] opacity-80 uppercase px-1 bg-black/10 rounded ml-1 print:border print:border-gray-300">
                                                {mission.type}
                                            </span>
                                            <button 
                                                onClick={() => deleteAssignment(mission.id)}
                                                className="hidden group-hover/card:block text-white/80 hover:text-white print:hidden"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    )
                                })}
                                <button 
                                    onClick={() => openAssignmentModal(null, day, 'hors_chantier')}
                                    className="mt-2 w-full flex items-center justify-center text-gray-300 hover:text-gray-500 py-1 print:hidden"
                                >
                                    <Plus size={12} />
                                </button>
                            </div>
                        </td>
                    )
                })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* MODAL D'AFFECTATION (ADAPTÉE) */}
      {isModalOpen && selection && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-[30px] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center mb-6">
              <div>
                  <h2 className="text-xl font-black uppercase text-[#2d3436]">Affecter une ressource</h2>
                  <p className="text-xs text-gray-400 font-bold">
                      {selection.type === 'chantier' ? 'Ajout sur chantier' : 'Déclarer une absence'} - {new Date(selection.date).toLocaleDateString()}
                  </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors">
                  <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
                {/* SELECTEUR EMPLOYÉ */}
                <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1 block mb-1">Collaborateur</label>
                    <div className="relative">
                        <Users className="absolute left-3 top-3.5 text-gray-400" size={16} />
                        <select 
                            className="w-full pl-10 p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none focus:border-[#00b894] border border-transparent cursor-pointer appearance-none" 
                            value={selectedEmploye} 
                            onChange={(e) => setSelectedEmploye(e.target.value)}
                        >
                            <option value="">-- Sélectionner --</option>
                            {employes.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
                        </select>
                    </div>
                </div>

                {/* Si Hors Chantier, Type d'absence */}
                {selection.type === 'hors_chantier' && (
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1 block mb-1">Type d'absence</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['conge', 'maladie', 'formation'].map(t => (
                                <button 
                                    key={t}
                                    onClick={() => setSelection({...selection, type: 'hors_chantier', subType: t})} // Note: subType logique simplifiée ici, on utilisera directement le type
                                    className={`py-2 rounded-lg text-[10px] font-black uppercase border-2 ${selection.type === t ? 'border-black bg-black text-white' : 'border-transparent bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <button 
                onClick={saveAssignment} 
                disabled={!selectedEmploye}
                className="w-full mt-8 bg-[#00b894] hover:bg-[#00a383] text-white py-4 rounded-xl font-black uppercase text-sm shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Valider l'affectation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
