"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ChevronLeft, ChevronRight, HardHat, Plus, 
  Printer, AlertTriangle, Trash2, Activity, Check, Calendar as CalendarIcon,
  Send, FileCheck, FileX
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

  const fetchData = async () => {
    setLoading(true);
    const { data: emp } = await supabase.from('employes').select('*').order('nom');
    const { data: chan } = await supabase.from('chantiers').select('id, nom').eq('statut', 'en_cours');
    // On récupère les colonnes odm_envoye et odm_signe
    const { data: plan } = await supabase.from('planning').select('*, chantiers(nom)');
    
    setEmployes(emp || []);
    setChantiers(chan || []);
    setAssignments(plan || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentDate]);

  // Fonction pour basculer l'état de l'ODM
  const toggleODM = async (id: string, currentStatus: boolean) => {
    await supabase.from('planning').update({ odm_envoye: !currentStatus }).eq('id', id);
    fetchData();
  };

  const getDaysOfWeek = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };

  const weekDays = getDaysOfWeek(currentDate);

  const saveAssignment = async () => {
    if (!selectedCell || (!selectedChantier && assignType === 'chantier')) return;
    const start = new Date(selectedCell.startDate);
    const end = new Date(selectedCell.endDate);
    const inserts = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        inserts.push({
          employe_id: selectedCell.empId,
          chantier_id: assignType === 'chantier' ? selectedChantier : null,
          date_debut: d.toISOString().split('T')[0],
          date_fin: d.toISOString().split('T')[0],
          type: assignType,
          odm_envoye: false, // Par défaut non envoyé
          odm_signe: false
        });
      }
    }
    const { error } = await supabase.from('planning').insert(inserts);
    if (!error) { setIsModalOpen(false); setSelectedChantier(""); fetchData(); }
  };

  return (
    <div className="min-h-screen bg-[#f0f3f4] p-4 md:p-8 font-['Fredoka']">
      {/* ... (Header identique) ... */}

      <div className="bg-white rounded-[40px] shadow-sm overflow-hidden border border-gray-100">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="p-6 w-[240px] sticky left-0 bg-white z-10 font-black uppercase text-[10px] text-gray-400">Collaborateurs</th>
              {weekDays.map((day, i) => (
                <th key={i} className="p-4 border-l border-gray-100 text-center bg-gray-50/30">
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
                  <p className="text-[9px] font-bold text-blue-500 uppercase mt-1 tracking-tighter">{emp.role}</p>
                </td>
                
                {weekDays.map((day, i) => {
                  const dateStr = day.toISOString().split('T')[0];
                  const mission = assignments.find(a => a.employe_id === emp.id && dateStr === a.date_debut);
                  
                  return (
                    <td key={i} className="p-1 border-l border-gray-100 h-28 relative">
                      {mission ? (
                        <div className={`w-full h-full rounded-2xl p-3 text-white shadow-md flex flex-col justify-between group/item relative transition-all ${
                          mission.type === 'chantier' ? 'bg-[#0984e3]' : 'bg-gray-400'
                        }`}>
                          <div className="flex justify-between items-start">
                             <p className="text-[12px] font-black uppercase leading-tight tracking-tighter pr-4">
                               {mission.type === 'chantier' ? mission.chantiers?.nom : mission.type}
                             </p>
                             
                             {/* PASTILLE ODM DYNAMIQUE */}
                             {mission.type === 'chantier' && (
                               <button 
                                 onClick={() => toggleODM(mission.id, mission.odm_envoye)}
                                 className={`shrink-0 w-3 h-3 rounded-full border-2 border-white shadow-sm transition-all ${
                                   mission.odm_signe ? 'bg-green-400' : 
                                   mission.odm_envoye ? 'bg-orange-400 animate-pulse' : 'bg-red-500'
                                 }`}
                                 title={mission.odm_signe ? "ODM Signé" : mission.odm_envoye ? "ODM Envoyé (Attente)" : "ODM Non Envoyé"}
                               />
                             )}
                          </div>

                          <div className="flex justify-between items-end">
                            <div className="flex gap-1">
                               {mission.odm_envoye ? <FileCheck size={12} className="opacity-60" /> : <FileX size={12} className="opacity-60" />}
                               <span className="text-[8px] font-black uppercase">{mission.odm_envoye ? 'Envoyé' : 'À faire'}</span>
                            </div>
                            <button onClick={() => deleteAssignment(mission.id)} className="opacity-0 group-hover/item:opacity-100 bg-black/20 p-1.5 rounded-lg hover:bg-red-500 transition-all">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* ... (Bouton Plus identique) ... */
                        <button onClick={() => openAssignmentModal(emp.id, day)} className="w-full h-full rounded-2xl border-2 border-dashed border-transparent hover:border-blue-100 hover:bg-blue-50/30 flex items-center justify-center text-gray-200 hover:text-blue-300 transition-all">+</button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* ... (Modal identique) ... */}
    </div>
  );
}
