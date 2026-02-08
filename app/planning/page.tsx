"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, Calendar, User, HardHat, Plus, Loader2, X, Check } from 'lucide-react';

export default function PlanningPage() {
  const [employes, setEmployes] = useState<any[]>([]);
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  // État pour la Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{empId: string, date: string} | null>(null);
  const [selectedChantier, setSelectedChantier] = useState("");

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

  // FONCTION : Ouvrir la modal
  const openAssignmentModal = (empId: string, date: Date) => {
    setSelectedCell({ empId, date: date.toISOString().split('T')[0] });
    setIsModalOpen(true);
  };

  // FONCTION : Sauvegarder l'affectation
  const saveAssignment = async () => {
    if (!selectedChantier || !selectedCell) return;

    const { error } = await supabase.from('planning').insert([{
      employe_id: selectedCell.empId,
      chantier_id: selectedChantier,
      date_debut: selectedCell.date,
      date_fin: selectedCell.date, // Pour l'instant on fait 1 jour
    }]);

    if (!error) {
      setIsModalOpen(false);
      setSelectedChantier("");
      fetchData();
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f3f4] p-4 md:p-8 font-['Fredoka'] relative">
      
      {/* HEADER (Identique) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase text-gray-800 tracking-tighter">Planning Hebdo</h1>
          <p className="text-[#d63031] font-bold uppercase text-[10px] tracking-widest mt-1">Altrad Operational Management</p>
        </div>
        <div className="flex items-center bg-white rounded-2xl p-2 shadow-sm gap-2 border border-gray-100 font-bold">
            <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }} className="p-2 hover:bg-gray-100 rounded-xl"><ChevronLeft size={20}/></button>
            <span className="px-2 whitespace-nowrap">Semaine du {weekDays[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
            <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }} className="p-2 hover:bg-gray-100 rounded-xl"><ChevronRight size={20}/></button>
        </div>
      </div>

      {/* TABLEAU */}
      <div className="bg-white rounded-[30px] shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="p-6 text-left border-b border-gray-100 w-[250px] sticky left-0 bg-white z-10">Personnel</th>
                {weekDays.map((day, i) => (
                  <th key={i} className="p-4 border-b border-l border-gray-100 text-center min-w-[120px]">
                    <p className="text-[10px] uppercase font-black text-gray-400">{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</p>
                    <p className="text-lg font-black text-gray-800">{day.getDate()}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employes.map((emp) => (
                <tr key={emp.id} className="group">
                  <td className="p-4 md:p-6 border-b border-gray-100 sticky left-0 bg-white z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-black text-[#d63031] text-sm border-2 border-white shadow-sm uppercase">{emp.nom.substring(0, 2)}</div>
                        <div><p className="font-bold text-gray-800 text-[14px] leading-none mb-1">{emp.nom}</p><p className="text-[9px] text-gray-400 font-black uppercase">{emp.role}</p></div>
                    </div>
                  </td>
                  {weekDays.map((day, i) => {
                    const dateStr = day.toISOString().split('T')[0];
                    const mission = assignments.find(a => a.employe_id === emp.id && dateStr >= a.date_debut && dateStr <= a.date_fin);
                    return (
                      <td key={i} className="p-2 border-b border-l border-gray-100 h-24">
                        {mission ? (
                          <div className="w-full h-full rounded-xl bg-[#0984e3] p-2 text-white shadow-sm border-b-4 border-black/20 flex flex-col justify-between">
                            <p className="text-[10px] font-black uppercase truncate">{mission.chantiers?.nom}</p>
                            <HardHat size={12} className="opacity-50" />
                          </div>
                        ) : (
                          <div 
                            onClick={() => openAssignmentModal(emp.id, day)}
                            className="w-full h-full rounded-2xl border-2 border-dashed border-transparent hover:border-[#d63031]/20 flex items-center justify-center cursor-pointer bg-gray-50/30 hover:bg-white text-gray-300 transition-all"
                          >
                            <Plus size={16} className="opacity-0 group-hover:opacity-100" />
                          </div>
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

      {/* --- MODAL D'AFFECTATION --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[30px] p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black uppercase text-gray-800">Affecter</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-black"><X /></button>
            </div>

            <p className="text-sm font-bold text-gray-500 mb-4">Choisir un chantier pour le <span className="text-[#d63031]">{selectedCell?.date}</span> :</p>

            <div className="space-y-3 mb-8">
              {chantiers.map((chan) => (
                <button 
                  key={chan.id}
                  onClick={() => setSelectedChantier(chan.id)}
                  className={`w-full p-4 rounded-2xl font-bold text-left transition-all border-2 ${
                    selectedChantier === chan.id ? 'border-[#00b894] bg-[#00b894]/5 text-[#00b894]' : 'border-gray-50 bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{chan.nom}</span>
                    {selectedChantier === chan.id && <Check size={20} />}
                  </div>
                </button>
              ))}
            </div>

            <button 
              onClick={saveAssignment}
              disabled={!selectedChantier}
              className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest disabled:opacity-20 transition-all active:scale-95"
            >
              Valider l'affectation
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
