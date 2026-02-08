"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ChevronLeft, ChevronRight, HardHat, Plus, 
  Printer, AlertTriangle, Trash2, Activity, Check, Calendar as CalendarIcon
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

  const getWeekNumber = (d: Date) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
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
  const weekNum = getWeekNumber(weekDays[0]);

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

  const openAssignmentModal = (empId: string, date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    setSelectedCell({ empId, startDate: dateStr, endDate: dateStr });
    setIsModalOpen(true);
  };

  const saveAssignment = async () => {
    if (!selectedCell || (!selectedChantier && assignType === 'chantier')) return;

    // Logique pour créer des entrées pour chaque jour entre Start et End
    const start = new Date(selectedCell.startDate);
    const end = new Date(selectedCell.endDate);
    const inserts = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      // On ignore les week-ends (Samedi = 6, Dimanche = 0)
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        inserts.push({
          employe_id: selectedCell.empId,
          chantier_id: assignType === 'chantier' ? selectedChantier : null,
          date_debut: d.toISOString().split('T')[0],
          date_fin: d.toISOString().split('T')[0],
          type: assignType
        });
      }
    }

    const { error } = await supabase.from('planning').insert(inserts);
    if (!error) { 
      setIsModalOpen(false); 
      setSelectedChantier(""); 
      fetchData(); 
    }
  };

  const deleteAssignment = async (id: string) => {
    if(confirm("Supprimer cette affectation ?")) {
      await supabase.from('planning').delete().eq('id', id);
      fetchData();
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f3f4] p-4 md:p-8 font-['Fredoka'] print:bg-white print:p-0">
      
      <div className="flex justify-between items-end mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-black uppercase text-gray-800 tracking-tighter leading-none">Planning S{weekNum}</h1>
          <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1 italic">Visualisation et affectation des ressources</p>
        </div>
        <div className="flex gap-4">
            <button onClick={() => window.print()} className="bg-white p-3 rounded-2xl shadow-sm hover:bg-gray-50 border border-gray-100 transition-all active:scale-90"><Printer size={20}/></button>
            <div className="flex items-center bg-white rounded-2xl p-1 shadow-sm border border-gray-100 font-bold">
                <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }} className="p-2 hover:bg-gray-100 rounded-xl"><ChevronLeft size={20}/></button>
                <span className="px-4 text-xs uppercase font-black">Semaine {weekNum}</span>
                <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }} className="p-2 hover:bg-gray-100 rounded-xl"><ChevronRight size={20}/></button>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm overflow-hidden border border-gray-100 print:shadow-none print:border-none">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="p-6 text-left border-b border-gray-100 w-[240px] sticky left-0 bg-white z-10 font-black uppercase text-[10px] text-gray-400">Collaborateurs</th>
              {weekDays.map((day, i) => (
                <th key={i} className="p-4 border-b border-l border-gray-100 text-center bg-gray-50/30">
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
                  const isRH_Absent = emp.statut_actuel !== 'disponible';
                  const mission = assignments.find(a => a.employe_id === emp.id && dateStr === a.date_debut);
                  
                  return (
                    <td key={i} className="p-1 border-l border-gray-100 h-24 relative">
                      {isRH_Absent ? (
                        <div className={`w-full h-full rounded-2xl p-2 text-white flex flex-col justify-between shadow-sm ${
                          emp.statut_actuel === 'conge' ? 'bg-orange-400' : 
                          emp.statut_actuel === 'maladie' ? 'bg-red-500' : 'bg-blue-400'
                        }`}>
                          <div className="flex justify-between items-start">
                            <p className="text-[9px] font-black uppercase tracking-tighter">{emp.statut_actuel}</p>
                            <Activity size={10} className="opacity-50" />
                          </div>
                          <p className="text-[8px] font-bold leading-tight italic opacity-90">{emp.commentaire_statut || 'Absence RH'}</p>
                        </div>
                      ) : mission ? (
                        <div className={`w-full h-full rounded-2xl p-3 text-white shadow-md flex flex-col justify-between group/item relative transition-all hover:scale-[1.02] ${
                          mission.type === 'chantier' ? 'bg-[#0984e3]' : 'bg-gray-400'
                        }`}>
                          <p className="text-[13px] font-black uppercase leading-tight tracking-tighter">
                            {mission.type === 'chantier' ? mission.chantiers?.nom : mission.type}
                          </p>
                          <div className="flex justify-between items-end">
                            <HardHat size={14} className="opacity-30" />
                            <button 
                              onClick={() => deleteAssignment(mission.id)}
                              className="opacity-0 group-hover/item:opacity-100 bg-black/20 p-1.5 rounded-lg hover:bg-red-500 transition-all print:hidden"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => openAssignmentModal(emp.id, day)}
                          className="w-full h-full rounded-2xl border-2 border-dashed border-transparent hover:border-blue-100 hover:bg-blue-50/30 flex items-center justify-center text-gray-200 hover:text-blue-300 transition-all print:hidden"
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

      {/* MODAL D'AFFECTATION AVEC SÉLECTION DE DATE */}
      {isModalOpen && selectedCell && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] p-8 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-2xl font-black uppercase mb-6 tracking-tighter">Planifier une période</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Début</label>
                <input 
                  type="date" 
                  value={selectedCell.startDate}
                  onChange={(e) => setSelectedCell({...selectedCell, startDate: e.target.value})}
                  className="w-full bg-gray-50 p-4 rounded-2xl border-none font-bold text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Fin</label>
                <input 
                  type="date" 
                  value={selectedCell.endDate}
                  onChange={(e) => setSelectedCell({...selectedCell, endDate: e.target.value})}
                  className="w-full bg-gray-50 p-4 rounded-2xl border-none font-bold text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-2xl">
                {['chantier', 'conge', 'maladie', 'formation'].map(t => (
                    <button 
                        key={t}
                        onClick={() => setAssignType(t)}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${assignType === t ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {assignType === 'chantier' && (
                <div className="grid grid-cols-1 gap-2 mb-8 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                    {chantiers.map((chan) => (
                        <button key={chan.id} onClick={() => setSelectedChantier(chan.id)} className={`p-4 rounded-2xl text-xs font-black uppercase text-left border-2 transition-all flex justify-between items-center ${selectedChantier === chan.id ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-50 bg-gray-50 text-gray-400'}`}>
                            {chan.nom}
                            {selectedChantier === chan.id && <Check size={16} />}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex gap-3">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-black text-gray-400 uppercase text-xs tracking-widest">Annuler</button>
                <button onClick={saveAssignment} className="flex-1 bg-black text-white py-4 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">Valider la période</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
