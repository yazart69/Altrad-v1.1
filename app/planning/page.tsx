"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ChevronLeft, ChevronRight, HardHat, Plus, 
  Printer, AlertTriangle, Trash2, Activity, Check, 
  Send, FileCheck, FileX, X, Calendar as CalendarIcon
} from 'lucide-react';

export default function PlanningPage() {
  const [employes, setEmployes] = useState<any[]>([]);
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date("2026-02-09")); 

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{empId: string, startDate: string, endDate: string} | null>(null);
  const [selectedChantier, setSelectedChantier] = useState("");
  const [assignType, setAssignType] = useState("chantier");

  // 1. Chargement des données
  const fetchData = async () => {
    setLoading(true);
    const { data: emp } = await supabase.from('users').select('*').order('nom');
    const { data: chan } = await supabase.from('chantiers').select('id, nom').eq('statut', 'en_cours');
    const { data: plan } = await supabase.from('planning').select('*, chantiers(nom)');
    
    setEmployes(emp || []);
    setChantiers(chan || []);
    setAssignments(plan || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentDate]);

  // 2. Actions sur les ODM (Ordre de Mission)
  const handleActionODM = async (id: string, field: string, value: boolean) => {
    await supabase.from('planning').update({ [field]: value }).eq('id', id);
    fetchData();
  };

  // 3. Suppression d'une affectation
  const deleteAssignment = async (id: string) => {
    if(confirm("Supprimer cette affectation ?")) {
      await supabase.from('planning').delete().eq('id', id);
      fetchData();
    }
  };

  // 4. Ouverture de la Modal avec initialisation des dates
  const openAssignmentModal = (empId: string, date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    setSelectedCell({ empId, startDate: dateStr, endDate: dateStr });
    setIsModalOpen(true);
  };

  // 5. Sauvegarde (Gestion des périodes Du... Au...)
  const saveAssignment = async () => {
    if (!selectedCell || (!selectedChantier && assignType === 'chantier')) return;
    
    const start = new Date(selectedCell.startDate);
    const end = new Date(selectedCell.endDate);
    const inserts = [];

    // Boucle pour insérer chaque jour de la période (hors week-end)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        inserts.push({
          employe_id: selectedCell.empId,
          chantier_id: assignType === 'chantier' ? selectedChantier : null,
          date_debut: d.toISOString().split('T')[0],
          date_fin: d.toISOString().split('T')[0],
          type: assignType,
          odm_envoye: false,
          odm_signe: false
        });
      }
    }
    
    await supabase.from('planning').insert(inserts);
    setIsModalOpen(false);
    setSelectedChantier("");
    fetchData();
  };

  // 6. Calcul des jours de la semaine affichée
  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(start.setDate(diff));
    monday.setDate(monday.getDate() + i);
    return monday;
  });

  return (
    <div className="min-h-screen bg-[#f0f3f4] p-4 md:p-8 font-['Fredoka']">
      {/* HEADER */}
      <div className="flex justify-between items-end mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-black uppercase text-gray-800 tracking-tighter italic">Planning Hebdomadaire</h1>
          <p className="text-blue-500 font-bold text-[10px] uppercase tracking-widest mt-1">Altrad Operational Resources</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center bg-white rounded-2xl p-1 shadow-sm border border-gray-100 font-bold">
            <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><ChevronLeft size={20}/></button>
            <span className="px-6 text-xs font-black uppercase">Navigation</span>
            <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><ChevronRight size={20}/></button>
          </div>
        </div>
      </div>

      {/* TABLEAU PRINCIPAL */}
      <div className="bg-white rounded-[40px] shadow-sm overflow-hidden border border-gray-100">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="p-6 w-[260px] sticky left-0 bg-white z-10 font-black uppercase text-[10px] text-gray-400 border-b border-gray-100">Collaborateurs</th>
              {weekDays.map((day, i) => (
                <th key={i} className="p-4 border-l border-b border-gray-100 text-center">
                  <p className="text-[10px] uppercase font-black text-gray-400">{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</p>
                  <p className="text-lg font-black text-gray-800">{day.getDate()}/{day.getMonth() + 1}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employes.map((emp) => (
              <tr key={emp.id} className="group border-b border-gray-50">
                <td className="p-4 sticky left-0 bg-white z-10 border-r border-gray-100 shadow-[4px_0_10px_rgba(0,0,0,0.02)]">
                  <p className="font-black text-gray-800 uppercase text-xs leading-none">{emp.nom} {emp.prenom}</p>
                  <p className="text-[8px] font-bold text-blue-500 uppercase mt-1 tracking-tighter">{emp.role}</p>
                </td>
                
                {weekDays.map((day, i) => {
                  const dateStr = day.toISOString().split('T')[0];
                  const isRH_Absent = emp.statut_actuel !== 'disponible';
                  const mission = assignments.find(a => a.employe_id === emp.id && dateStr === a.date_debut);
                  
                  return (
                    <td key={i} className="p-1 border-l border-gray-100 h-28 relative">
                      {isRH_Absent ? (
                        <div className={`w-full h-full rounded-2xl p-2 text-white flex flex-col justify-between shadow-sm ${emp.statut_actuel === 'conge' ? 'bg-orange-400' : 'bg-red-500'}`}>
                           <p className="text-[9px] font-black uppercase italic">{emp.statut_actuel}</p>
                           <Activity size={12} className="opacity-30" />
                        </div>
                      ) : mission ? (
                        <div className={`w-full h-full rounded-2xl p-3 text-white shadow-md flex flex-col justify-between group/item transition-all hover:scale-[1.02] ${mission.type === 'chantier' ? 'bg-[#0984e3]' : 'bg-gray-400'}`}>
                          <div className="flex justify-between items-start">
                            <p className="text-[13px] font-[900] uppercase leading-tight tracking-tighter truncate pr-2">
                               {mission.chantiers?.nom || mission.type}
                            </p>
                            {mission.type === 'chantier' && (
                              <div className={`w-3 h-3 rounded-full border-2 border-white shrink-0 ${mission.odm_signe ? 'bg-green-400' : mission.odm_envoye ? 'bg-orange-400 animate-pulse' : 'bg-red-500'}`} />
                            )}
                          </div>
                          <div className="flex justify-between items-end">
                            <div className="flex gap-2">
                              {mission.type === 'chantier' && !mission.odm_envoye && (
                                <button onClick={() => handleActionODM(mission.id, 'odm_envoye', true)} className="bg-white/20 p-1.5 rounded-lg hover:bg-white/40 transition-all"><Send size={12} /></button>
                              )}
                              {mission.odm_envoye && !mission.odm_signe && (
                                <button onClick={() => handleActionODM(mission.id, 'odm_signe', true)} className="bg-white/20 p-1.5 rounded-lg hover:bg-white/40 transition-all"><Check size={12} /></button>
                              )}
                              {mission.odm_signe && <FileCheck size={14} className="text-green-200" />}
                            </div>
                            <button onClick={() => deleteAssignment(mission.id)} className="opacity-0 group-hover/item:opacity-100 text-white/50 hover:text-white transition-all"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => openAssignmentModal(emp.id, day)} className="w-full h-full text-gray-200 hover:text-blue-500 transition-all font-black text-2xl flex items-center justify-center">+</button>
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
          <div className="bg-white rounded-[40px] p-8 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black uppercase tracking-tighter italic text-gray-800">Planifier Mission</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-300 hover:text-black"><X size={24} /></button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Date Début</label>
                <input type="date" value={selectedCell.startDate} onChange={(e) => setSelectedCell({...selectedCell, startDate: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl border-none font-bold text-sm mt-1 focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Date Fin</label>
                <input type="date" value={selectedCell.endDate} onChange={(e) => setSelectedCell({...selectedCell, endDate: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl border-none font-bold text-sm mt-1 focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Sélectionner Chantier</label>
              <select className="w-full p-4 bg-gray-50 rounded-2xl font-black uppercase text-xs border-none focus:ring-2 focus:ring-blue-500" value={selectedChantier} onChange={(e) => { setAssignType('chantier'); setSelectedChantier(e.target.value); }}>
                <option value="">--- CHANTIER ---</option>
                {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
              
              <div className="pt-4 border-t border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-2 text-center">Ou statut spécial</p>
                <div className="grid grid-cols-3 gap-2">
                  {['formation', 'maladie', 'conge'].map(t => (
                    <button key={t} onClick={() => { setAssignType(t); setSelectedChantier(""); }} className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all ${assignType === t ? 'bg-black text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 font-black text-gray-400 uppercase text-xs hover:text-black">Annuler</button>
              <button onClick={saveAssignment} className="flex-1 bg-black text-white py-5 rounded-3xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">Valider Planning</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
