"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ChevronLeft, ChevronRight, HardHat, Plus, 
  Printer, AlertTriangle, Trash2, Activity, Check, 
  Send, FileCheck, FileX, X
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
    const { data: emp } = await supabase.from('users').select('*').order('nom');
    const { data: chan } = await supabase.from('chantiers').select('id, nom').eq('statut', 'en_cours');
    const { data: plan } = await supabase.from('planning').select('*, chantiers(nom)');
    setEmployes(emp || []);
    setChantiers(chan || []);
    setAssignments(plan || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentDate]);

  const handleActionODM = async (id: string, field: string, value: boolean) => {
    await supabase.from('planning').update({ [field]: value }).eq('id', id);
    fetchData();
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
    await supabase.from('planning').insert(inserts);
    setIsModalOpen(false);
    fetchData();
  };

  const deleteAssignment = async (id: string) => {
    if(confirm("Supprimer cette affectation ?")) {
      await supabase.from('planning').delete().eq('id', id);
      fetchData();
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f3f4] p-8 font-['Fredoka']">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase text-gray-800 tracking-tighter italic">Planning & Conformité ODM</h1>
          <p className="text-blue-500 font-bold text-xs uppercase tracking-widest mt-1">Gestion des ordres de mission Altrad</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center bg-white rounded-2xl p-1 shadow-sm border border-gray-100 font-bold">
            <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }} className="p-2 hover:bg-gray-100 rounded-xl"><ChevronLeft /></button>
            <span className="px-6 uppercase text-xs font-black">Semaine {currentDate.getDate()}</span>
            <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }} className="p-2 hover:bg-gray-100 rounded-xl"><ChevronRight /></button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm overflow-hidden border border-gray-100">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="p-6 text-left w-[260px] sticky left-0 bg-white z-10 font-black uppercase text-[10px] text-gray-400">Opérateurs</th>
              {getWeekDays().map((day, i) => (
                <th key={i} className="p-4 border-l border-gray-100 text-center">
                  <p className="text-[10px] uppercase font-black text-gray-400">{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</p>
                  <p className="text-lg font-black text-gray-800">{day.getDate()}/{day.getMonth() + 1}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employes.map((emp) => (
              <tr key={emp.id} className="group border-b border-gray-50">
                <td className="p-4 sticky left-0 bg-white z-10 font-black text-xs uppercase border-r border-gray-50">{emp.nom} {emp.prenom}</td>
                {getWeekDays().map((day, i) => {
                  const dateStr = day.toISOString().split('T')[0];
                  const mission = assignments.find(a => a.employe_id === emp.id && dateStr === a.date_debut);
                  
                  return (
                    <td key={i} className="p-1 border-l border-gray-100 h-28 relative">
                      {mission ? (
                        <div className={`w-full h-full rounded-2xl p-3 text-white flex flex-col justify-between group/item transition-all ${mission.type === 'chantier' ? 'bg-[#0984e3]' : 'bg-gray-400'}`}>
                          <div className="flex justify-between items-start">
                            <p className="text-[13px] font-[900] uppercase leading-tight tracking-tighter truncate pr-2">{mission.chantiers?.nom || mission.type}</p>
                            {mission.type === 'chantier' && (
                              <div className={`w-3 h-3 rounded-full border-2 border-white shrink-0 ${mission.odm_signe ? 'bg-green-400' : mission.odm_envoye ? 'bg-orange-400 animate-pulse' : 'bg-red-500'}`} />
                            )}
                          </div>
                          <div className="flex justify-between items-end">
                            <div className="flex gap-2">
                              {mission.type === 'chantier' && !mission.odm_envoye && (
                                <button onClick={() => handleActionODM(mission.id, 'odm_envoye', true)} className="bg-white/20 p-1.5 rounded-lg hover:bg-white/40"><Send size={12} /></button>
                              )}
                              {mission.odm_envoye && !mission.odm_signe && (
                                <button onClick={() => handleActionODM(mission.id, 'odm_signe', true)} className="bg-white/20 p-1.5 rounded-lg hover:bg-white/40"><Check size={12} /></button>
                              )}
                              {mission.odm_signe && <FileCheck size={14} className="text-green-200" />}
                            </div>
                            <button onClick={() => deleteAssignment(mission.id)} className="opacity-0 group-hover/item:opacity-100 text-white/50 hover:text-white"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => {
                          const dateStr = day.toISOString().split('T')[0];
                          setSelectedCell({ empId: emp.id, startDate: dateStr, endDate: dateStr });
                          setIsModalOpen(true);
                        }} className="w-full h-full text-gray-200 hover:text-blue-500 transition-all font-black text-xl">+</button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL MULTI-DATES */}
      {isModalOpen && selectedCell && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-black uppercase mb-6 tracking-tighter italic">Planifier la période</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Début</label>
                <input type="date" value={selectedCell.startDate} onChange={(e) => setSelectedCell({...selectedCell, startDate: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl border-none font-bold" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Fin</label>
                <input type="date" value={selectedCell.endDate} onChange={(e) => setSelectedCell({...selectedCell, endDate: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl border-none font-bold" />
              </div>
            </div>
            <select className="w-full p-4 bg-gray-50 rounded-2xl mb-6 font-black uppercase text-xs" onChange={(e) => setSelectedChantier(e.target.value)}>
              <option>Sélectionner le chantier</option>
              {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            <div className="flex gap-4">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 font-black text-gray-400 uppercase text-xs">Annuler</button>
              <button onClick={saveAssignment} className="flex-1 bg-black text-white py-4 rounded-2xl font-black uppercase text-xs">Valider</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
