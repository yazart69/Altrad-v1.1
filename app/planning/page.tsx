"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ChevronLeft, ChevronRight, HardHat, Plus, 
  Printer, AlertTriangle, Trash2, Activity, Check, 
  Send, FileCheck, FileX, X, Calendar as CalendarIcon
} from 'lucide-react';

// --- HELPER: Format Local Date to YYYY-MM-DD ---
// This prevents timezone shifts (e.g. 2026-02-09 becoming 2026-02-08T23:00...)
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
  
  // Initialize with Monday of current week to avoid random mid-week starts
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{empId: string, startDate: string, endDate: string} | null>(null);
  const [selectedChantier, setSelectedChantier] = useState("");
  const [assignType, setAssignType] = useState("chantier");

  // 1. Chargement des données
  const fetchData = async () => {
    setLoading(true);
    
    // Fetch users
    const { data: emp } = await supabase
      .from('users')
      .select('*')
      .order('nom');
      
    // Fetch active chantiers
    const { data: chan } = await supabase
      .from('chantiers')
      .select('id, nom')
      .in('statut', ['en_cours', 'planifie']); // Fetch both active and planned
      
    // Fetch planning for the visible week (plus a buffer to be safe)
    // We get all assignments to keep it simple, or filter by date range if heavy
    const { data: plan } = await supabase
      .from('planning')
      .select('*, chantiers(nom)');
    
    setEmployes(emp || []);
    setChantiers(chan || []);
    setAssignments(plan || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentDate]);

  // 2. Actions sur les ODM
  const handleActionODM = async (id: string, field: string, value: boolean) => {
    const { error } = await supabase.from('planning').update({ [field]: value }).eq('id', id);
    if (error) alert("Erreur lors de la mise à jour : " + error.message);
    else fetchData();
  };

  // 3. Suppression
  const deleteAssignment = async (id: string) => {
    if(confirm("Supprimer cette affectation ?")) {
      const { error } = await supabase.from('planning').delete().eq('id', id);
      if (error) alert("Erreur suppression : " + error.message);
      else fetchData();
    }
  };

  // 4. Modal Open
  const openAssignmentModal = (empId: string, date: Date) => {
    const dateStr = toLocalISOString(date);
    setSelectedCell({ empId, startDate: dateStr, endDate: dateStr });
    setAssignType('chantier'); // Reset type to default
    setSelectedChantier("");   // Reset selection
    setIsModalOpen(true);
  };

  // 5. Sauvegarde
  const saveAssignment = async () => {
    if (!selectedCell) return;
    if (assignType === 'chantier' && !selectedChantier) {
        alert("Veuillez sélectionner un chantier.");
        return;
    }
    
    const start = new Date(selectedCell.startDate);
    const end = new Date(selectedCell.endDate);
    const inserts = [];

    // Loop through dates
    // Using a new date object for iteration to avoid reference issues
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      // Skip Weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        inserts.push({
          employe_id: selectedCell.empId,
          chantier_id: assignType === 'chantier' ? selectedChantier : null,
          date_debut: toLocalISOString(d), // Use helper for consistency
          date_fin: toLocalISOString(d),   // Single day entry per row
          type: assignType,
          odm_envoye: false,
          odm_signe: false
        });
      }
    }
    
    if (inserts.length === 0) {
        alert("Aucun jour ouvrable sélectionné (Week-end ?)");
        return;
    }

    const { error } = await supabase.from('planning').insert(inserts);

    if (error) {
        alert("Erreur lors de la sauvegarde : " + error.message);
    } else {
        setIsModalOpen(false);
        setSelectedChantier("");
        fetchData();
    }
  };

  // 6. Calculate Week Days
  const weekDays = Array.from({ length: 5 }, (_, i) => {
    // Clone currentDate to avoid mutation
    const start = new Date(currentDate);
    const day = start.getDay();
    // Calculate Monday
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(start.setDate(diff));
    
    // Add 'i' days
    monday.setDate(monday.getDate() + i);
    return monday;
  });

  return (
    <div className="min-h-screen bg-[#f0f3f4] p-4 md:p-8 font-['Fredoka'] ml-0 md:ml-64 transition-all">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-black uppercase text-[#2d3436] tracking-tight">Planning <span className="text-[#00b894]">Hebdo</span></h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">Gestion des affectations</p>
        </div>
        
        <div className="flex items-center bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100">
            <button 
                onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }} 
                className="p-3 hover:bg-gray-50 rounded-xl transition-colors text-gray-500 hover:text-black"
            >
                <ChevronLeft size={20}/>
            </button>
            <div className="px-6 text-center">
                <span className="block text-xs font-black uppercase text-gray-400">Semaine du</span>
                <span className="block text-sm font-black text-gray-800">
                    {weekDays[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                </span>
            </div>
            <button 
                onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }} 
                className="p-3 hover:bg-gray-50 rounded-xl transition-colors text-gray-500 hover:text-black"
            >
                <ChevronRight size={20}/>
            </button>
        </div>
      </div>

      {/* TABLEAU */}
      <div className="bg-white rounded-[30px] shadow-sm overflow-hidden border border-gray-100 overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse text-left">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              <th className="p-6 w-[200px] sticky left-0 bg-gray-50/80 z-20 font-black uppercase text-[10px] text-gray-400">
                Collaborateurs
              </th>
              {weekDays.map((day, i) => (
                <th key={i} className="p-4 border-l border-gray-100 text-center min-w-[140px]">
                  <p className="text-[10px] uppercase font-black text-gray-400 mb-1">
                    {day.toLocaleDateString('fr-FR', { weekday: 'long' })}
                  </p>
                  <div className={`inline-block px-3 py-1 rounded-lg font-black text-sm ${
                      toLocalISOString(day) === toLocalISOString(new Date()) 
                      ? 'bg-[#00b894] text-white shadow-md' 
                      : 'text-gray-700 bg-white border border-gray-100'
                  }`}>
                    {day.getDate()}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employes.map((emp) => (
              <tr key={emp.id} className="group border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                {/* COLONNE EMPLOYÉ */}
                <td className="p-4 sticky left-0 bg-white z-10 border-r border-gray-100 group-hover:bg-gray-50/30 transition-colors">
                  <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-black text-xs text-gray-500">
                          {emp.prenom.charAt(0)}{emp.nom.charAt(0)}
                      </div>
                      <div>
                          <p className="font-bold text-gray-800 text-xs uppercase leading-tight">{emp.nom}</p>
                          <p className="text-[10px] text-gray-400 capitalize">{emp.prenom}</p>
                      </div>
                  </div>
                </td>
                
                {/* CELLULES JOURS */}
                {weekDays.map((day, i) => {
                  const dateStr = toLocalISOString(day);
                  // Find assignment strictly matching date
                  const mission = assignments.find(a => a.employe_id === emp.id && a.date_debut === dateStr);
                  
                  // Specific styling based on type
                  let cellStyle = "bg-gray-100 text-gray-400"; // Default empty/loading
                  let borderStyle = "";
                  
                  if (mission) {
                      if (mission.type === 'chantier') {
                          cellStyle = "bg-[#0984e3] text-white shadow-md shadow-blue-200";
                          // Visual cue for signed ODM
                          if (mission.odm_signe) borderStyle = "ring-2 ring-green-400";
                          else if (mission.odm_envoye) borderStyle = "ring-2 ring-orange-300";
                      } else if (mission.type === 'conge') {
                          cellStyle = "bg-[#fab1a0] text-white"; // Peach/Orange
                      } else if (mission.type === 'maladie') {
                          cellStyle = "bg-[#ff7675] text-white"; // Red
                      } else if (mission.type === 'formation') {
                          cellStyle = "bg-[#a29bfe] text-white"; // Purple
                      }
                  }

                  return (
                    <td key={i} className="p-2 border-l border-gray-50 h-24 relative">
                      {mission ? (
                        <div className={`w-full h-full rounded-2xl p-3 flex flex-col justify-between group/card transition-all hover:scale-[1.02] cursor-pointer relative ${cellStyle} ${borderStyle}`}>
                          
                          {/* DELETE BUTTON (Hover) */}
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteAssignment(mission.id); }}
                            className="absolute -top-2 -right-2 bg-white text-red-500 p-1.5 rounded-full shadow-sm opacity-0 group-hover/card:opacity-100 transition-opacity z-20 hover:scale-110"
                          >
                            <Trash2 size={12} />
                          </button>

                          {/* CONTENT */}
                          <div className="font-bold text-[11px] uppercase leading-tight line-clamp-2">
                            {mission.chantiers?.nom || mission.type}
                          </div>

                          {/* FOOTER ACTIONS (Only for Chantier) */}
                          {mission.type === 'chantier' && (
                              <div className="flex items-center gap-1 mt-1">
                                  <div 
                                    onClick={(e) => { e.stopPropagation(); handleActionODM(mission.id, 'odm_envoye', !mission.odm_envoye); }}
                                    className={`p-1 rounded bg-white/20 hover:bg-white/40 transition-colors ${mission.odm_envoye ? 'text-white' : 'text-white/50'}`}
                                    title="ODM Envoyé"
                                  >
                                      <Send size={10} />
                                  </div>
                                  <div 
                                    onClick={(e) => { e.stopPropagation(); handleActionODM(mission.id, 'odm_signe', !mission.odm_signe); }}
                                    className={`p-1 rounded bg-white/20 hover:bg-white/40 transition-colors ${mission.odm_signe ? 'text-white' : 'text-white/50'}`}
                                    title="ODM Signé"
                                  >
                                      <Check size={10} />
                                  </div>
                              </div>
                          )}
                        </div>
                      ) : (
                        // EMPTY STATE ADD BUTTON
                        <button 
                            onClick={() => openAssignmentModal(emp.id, day)} 
                            className="w-full h-full rounded-2xl border-2 border-dashed border-gray-100 text-gray-200 hover:border-[#00b894] hover:text-[#00b894] hover:bg-emerald-50 transition-all flex items-center justify-center"
                        >
                            <Plus size={20} />
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL D'AFFECTATION */}
      {isModalOpen && selectedCell && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[30px] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center mb-6">
              <div>
                  <h2 className="text-xl font-black uppercase text-[#2d3436]">Nouvelle Affectation</h2>
                  <p className="text-xs text-gray-400 font-bold">Définir la mission et la durée</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors">
                  <X size={20} />
              </button>
            </div>
            
            {/* DATES */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1 block mb-1">Du</label>
                <input type="date" value={selectedCell.startDate} onChange={(e) => setSelectedCell({...selectedCell, startDate: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-[#00b894]" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1 block mb-1">Au</label>
                <input type="date" value={selectedCell.endDate} onChange={(e) => setSelectedCell({...selectedCell, endDate: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-[#00b894]" />
              </div>
            </div>

            {/* SÉLECTION TYPE */}
            <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2 bg-gray-50 p-1 rounded-xl">
                    {['chantier', 'formation', 'maladie', 'conge'].map(t => (
                        <button 
                            key={t} 
                            onClick={() => { setAssignType(t); if(t !== 'chantier') setSelectedChantier(""); }}
                            className={`py-2 rounded-lg text-[9px] font-black uppercase transition-all ${
                                assignType === t ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {assignType === 'chantier' && (
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1 block mb-1">Chantier</label>
                        <select 
                            className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none focus:border-[#00b894] border border-transparent cursor-pointer" 
                            value={selectedChantier} 
                            onChange={(e) => setSelectedChantier(e.target.value)}
                        >
                            <option value="">-- Choisir --</option>
                            {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                        </select>
                    </div>
                )}
            </div>

            {/* FOOTER */}
            <button 
                onClick={saveAssignment} 
                className="w-full mt-8 bg-[#00b894] hover:bg-[#00a383] text-white py-4 rounded-xl font-black uppercase text-sm shadow-lg shadow-emerald-200 transition-all active:scale-95"
            >
                Valider l'affectation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
