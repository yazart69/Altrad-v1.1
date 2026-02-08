"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ChevronLeft, ChevronRight, Calendar, User, HardHat, Plus, 
  Loader2, X, Check, Printer, AlertTriangle, Trash2, Plane
} from 'lucide-react';

export default function PlanningPage() {
  const [employes, setEmployes] = useState<any[]>([]);
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date("2026-02-09")); // Fixé au début de ta période demandée

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{empId: string, date: string} | null>(null);
  const [selectedChantier, setSelectedChantier] = useState("");
  const [assignType, setAssignType] = useState("chantier");

  // Calcul Numéro de Semaine
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

  const saveAssignment = async () => {
    if (!selectedCell || (!selectedChantier && assignType === 'chantier')) return;
    const { error } = await supabase.from('planning').insert([{
      employe_id: selectedCell.empId,
      chantier_id: assignType === 'chantier' ? selectedChantier : null,
      date_debut: selectedCell.date,
      date_fin: selectedCell.date,
      type: assignType
    }]);
    if (!error) { setIsModalOpen(false); setSelectedChantier(""); fetchData(); }
  };

  const deleteAssignment = async (id: string) => {
    if(confirm("Supprimer cette affectation ?")) {
      await supabase.from('planning').delete().eq('id', id);
      fetchData();
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f3f4] p-4 md:p-8 font-['Fredoka'] print:bg-white print:p-0">
      
      {/* ALERTE ODM */}
      <div className="mb-6 bg-orange-100 border-l-4 border-orange-500 p-4 rounded-r-2xl flex items-center justify-between animate-pulse print:hidden">
        <div className="flex items-center gap-3">
          <AlertTriangle className="text-orange-600" />
          <div>
            <p className="text-orange-800 font-black uppercase text-sm">Alerte ODM (Ordre de Mission)</p>
            <p className="text-orange-700 text-xs font-bold">Période du 09/02 au 20/03 : Documents à faire signer impérativement.</p>
          </div>
        </div>
        <button className="bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase shadow-lg shadow-orange-200">Gérer les signatures</button>
      </div>

      <div className="flex justify-between items-end mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-black uppercase text-gray-800">Planning S{weekNum}</h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Altrad - Visualisation des ressources</p>
        </div>
        <div className="flex gap-4">
            <button onClick={() => window.print()} className="bg-white p-3 rounded-2xl shadow-sm hover:bg-gray-50 border border-gray-100"><Printer size={20}/></button>
            <div className="flex items-center bg-white rounded-2xl p-2 shadow-sm border border-gray-100 font-bold">
                <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }} className="p-2 hover:bg-gray-100 rounded-xl"><ChevronLeft size={20}/></button>
                <span className="px-4">Semaine {weekNum}</span>
                <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }} className="p-2 hover:bg-gray-100 rounded-xl"><ChevronRight size={20}/></button>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-[30px] shadow-sm overflow-hidden border border-gray-100 print:shadow-none print:border-none">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="p-6 text-left border-b border-gray-100 w-[220px] sticky left-0 bg-white z-10 font-black uppercase text-[10px] text-gray-400">Opérateurs</th>
              {weekDays.map((day, i) => (
                <th key={i} className="p-4 border-b border-l border-gray-100 text-center">
                  <p className="text-[10px] uppercase font-black text-gray-400">{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</p>
                  <p className="text-lg font-black text-gray-800">{day.getDate()}/{day.getMonth() + 1}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employes.map((emp) => (
              <tr key={emp.id} className="group hover:bg-gray-50/30">
                <td className="p-4 border-b border-gray-100 sticky left-0 bg-white z-10 font-bold text-sm text-gray-700 border-r shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                  {emp.nom} {emp.prenom}
                </td>
                {weekDays.map((day, i) => {
                  const dateStr = day.toISOString().split('T')[0];
                  const mission = assignments.find(a => a.employe_id === emp.id && dateStr === a.date_debut);
                  
                  return (
                    <td key={i} className="p-1 border-b border-l border-gray-100 h-20 relative">
                      {mission ? (
                        <div className={`w-full h-full rounded-xl p-2 text-white shadow-sm flex flex-col justify-between group/item relative ${
                          mission.type === 'conge' ? 'bg-orange-400' : 
                          mission.type === 'maladie' ? 'bg-red-500' : 
                          'bg-[#0984e3]'
                        }`}>
                          <p className="text-[9px] font-black uppercase leading-tight">
                            {mission.type === 'chantier' ? mission.chantiers?.nom : mission.type}
                          </p>
                          <button 
                            onClick={() => deleteAssignment(mission.id)}
                            className="absolute top-1 right-1 opacity-0 group-hover/item:opacity-100 bg-black/20 p-1 rounded-md hover:bg-black/40 transition-all print:hidden"
                          >
                            <Trash2 size={10} />
                          </button>
                          <HardHat size={10} className="opacity-30" />
                        </div>
                      ) : (
                        <button 
                          onClick={() => openAssignmentModal(emp.id, day)}
                          className="w-full h-full rounded-xl border-2 border-dashed border-transparent hover:border-gray-200 flex items-center justify-center text-gray-200 hover:text-gray-400 transition-all print:hidden"
                        >
                          <Plus size={16} />
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

      {/* MODAL MISE À JOUR */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[30px] p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-black uppercase mb-6">Affectation</h2>
            
            <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-2xl">
                {['chantier', 'conge', 'maladie'].map(t => (
                    <button 
                        key={t}
                        onClick={() => setAssignType(t)}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${assignType === t ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {assignType === 'chantier' && (
                <div className="grid grid-cols-2 gap-2 mb-8">
                    {chantiers.map((chan) => (
                        <button key={chan.id} onClick={() => setSelectedChantier(chan.id)} className={`p-3 rounded-xl text-xs font-bold border-2 transition-all ${selectedChantier === chan.id ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-50 bg-gray-50'}`}>
                            {chan.nom}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex gap-3">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-bold text-gray-400 uppercase text-xs">Annuler</button>
                <button onClick={saveAssignment} className="flex-1 bg-black text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest">Valider</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
