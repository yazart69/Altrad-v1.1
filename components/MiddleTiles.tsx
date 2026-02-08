"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ChevronLeft, ChevronRight, HardHat, Plus, 
  Printer, AlertTriangle, Trash2, Activity, Check, 
  Send, FileCheck, FileX, Clock
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
    const { data: plan } = await supabase.from('planning').select('*, chantiers(nom)');
    
    setEmployes(emp || []);
    setChantiers(chan || []);
    setAssignments(plan || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentDate]);

  // Fonction pour envoyer/valider l'ODM
  const handleActionODM = async (id: string, field: string, value: boolean) => {
    const { error } = await supabase.from('planning').update({ [field]: value }).eq('id', id);
    if (!error) fetchData();
  };

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
          odm_envoye: false,
          odm_signe: false
        });
      }
    }
    const { error } = await supabase.from('planning').insert(inserts);
    if (!error) { setIsModalOpen(false); setSelectedChantier(""); fetchData(); }
  };

  const getWeekDays = () => {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };

  return (
    <div className="min-h-screen bg-[#f0f3f4] p-8 font-['Fredoka']">
      <div className="flex justify-between items-end mb-8">
        <h1 className="text-3xl font-black uppercase text-gray-800 tracking-tighter">Planning & ODM</h1>
        {/* Navigation Semaine ici... */}
      </div>

      <div className="bg-white rounded-[40px] shadow-sm overflow-hidden border border-gray-100">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="p-6 text-left w-[240px] sticky left-0 bg-white z-10 font-black uppercase text-[10px] text-gray-400">Opérateurs</th>
              {getWeekDays().map((day, i) => (
                <th key={i} className="p-4 border-l border-gray-100 text-center">
                  <p className="text-lg font-black text-gray-800">{day.getDate()}/{day.getMonth() + 1}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employes.map((emp) => (
              <tr key={emp.id} className="group border-b border-gray-50">
                <td className="p-4 sticky left-0 bg-white z-10 font-black text-xs uppercase">{emp.nom} {emp.prenom}</td>
                {getWeekDays().map((day, i) => {
                  const dateStr = day.toISOString().split('T')[0];
                  const mission = assignments.find(a => a.employe_id === emp.id && dateStr === a.date_debut);
                  
                  return (
                    <td key={i} className="p-1 border-l border-gray-100 h-28 relative">
                      {mission && mission.type === 'chantier' ? (
                        <div className="w-full h-full rounded-2xl p-3 text-white bg-[#0984e3] shadow-md flex flex-col justify-between group/item">
                          <div className="flex justify-between items-start">
                            <p className="text-[11px] font-black uppercase leading-tight truncate pr-4">{mission.chantiers?.nom}</p>
                            
                            {/* PASTILLE DE STATUT ODM */}
                            <div 
                              className={`w-3 h-3 rounded-full border-2 border-white shadow-sm shrink-0 ${
                                mission.odm_signe ? 'bg-green-400' : 
                                mission.odm_envoye ? 'bg-orange-400 animate-pulse' : 'bg-red-500'
                              }`} 
                              title={mission.odm_signe ? "Signé" : mission.odm_envoye ? "Envoyé" : "À envoyer"}
                            />
                          </div>

                          <div className="flex justify-between items-end">
                            <div className="flex gap-1">
                               {!mission.odm_envoye ? (
                                 <button onClick={() => handleActionODM(mission.id, 'odm_envoye', true)} className="p-1 bg-white/20 rounded hover:bg-white/40 transition-colors">
                                   <Send size={10} />
                                 </button>
                               ) : !mission.odm_signe ? (
                                 <button onClick={() => handleActionODM(mission.id, 'odm_signe', true)} className="p-1 bg-white/20 rounded hover:bg-white/40 transition-colors">
                                   <Check size={10} />
                                 </button>
                               ) : <FileCheck size={14} className="text-green-200" />}
                            </div>
                            <HardHat size={14} className="opacity-20" />
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => openAssignmentModal(emp.id, day)} className="w-full h-full flex items-center justify-center text-gray-200 hover:text-blue-300 transition-all">+</button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
