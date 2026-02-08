"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, Calendar, User, HardHat, Plus, Loader2 } from 'lucide-react';

export default function PlanningPage() {
  const [employes, setEmployes] = useState<any[]>([]);
  const [chantiers, setChantier] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Gestion des dates (Semaine en cours)
  const [currentDate, setCurrentDate] = useState(new Date());

  // Calcul des jours de la semaine (Lundi à Vendredi)
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

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // 1. Charger tous les employés
        const { data: emp, error: errEmp } = await supabase.from('employes').select('*').order('nom');
        if (errEmp) console.error("Erreur Employés:", errEmp);

        // 2. Charger les chantiers
        const { data: chan } = await supabase.from('chantiers').select('id, nom').eq('statut', 'en_cours');

        // 3. Charger le planning
        const { data: plan } = await supabase.from('planning').select('*, chantiers(nom)');

        setEmployes(emp || []);
        setChantier(chan || []);
        setAssignments(plan || []);
      } catch (error) {
        console.error("Erreur globale planning:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [currentDate]);

  return (
    <div className="min-h-screen bg-[#f0f3f4] p-4 md:p-8 font-['Fredoka']">
      
      {/* HEADER DU PLANNING */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase text-gray-800">Planning Hebdo</h1>
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">Affectation des équipes Altrad</p>
        </div>

        <div className="flex items-center bg-white rounded-2xl p-2 shadow-sm gap-2 md:gap-4 border border-gray-100">
          <button onClick={() => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() - 7);
            setCurrentDate(d);
          }} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><ChevronLeft size={20}/></button>
          
          <div className="flex items-center gap-2 font-bold px-2 text-sm md:text-base">
            <Calendar size={18} className="text-[#d63031]" />
            <span className="whitespace-nowrap">Semaine du {weekDays[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
          </div>

          <button onClick={() => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() + 7);
            setCurrentDate(d);
          }} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><ChevronRight size={20}/></button>
        </div>
      </div>

      {/* ZONE DE CHARGEMENT OU TABLEAU */}
      <div className="bg-white rounded-[30px] shadow-sm overflow-hidden border border-gray-100">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-400">
            <Loader2 className="animate-spin mb-2" size={32} />
            <p className="font-bold uppercase text-xs">Synchronisation...</p>
          </div>
        ) : employes.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-400">
            <User size={48} className="mb-2 opacity-20" />
            <p className="font-bold">Aucun employé trouvé dans la base</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="p-6 text-left border-b border-gray-100 w-[250px] sticky left-0 bg-white z-10">
                    <div className="flex items-center gap-2 text-gray-400 uppercase text-[10px] font-black tracking-widest">
                      <HardHat size={14} /> Équipe Terrain
                    </div>
                  </th>
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
    <tr key={emp.id} className="group hover:bg-gray-50/50 transition-colors">
      <td className="p-4 md:p-6 border-b border-gray-100 sticky left-0 bg-white z-10 shadow-[4px_0_8px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-black text-[#d63031] text-sm border-2 border-white shadow-sm uppercase">
            {emp.nom.substring(0, 2)}
          </div>
          <div>
            <p className="font-bold text-gray-800 text-[14px] leading-none mb-1">{emp.nom} {emp.prenom}</p>
            <p className="text-[9px] text-gray-400 font-black uppercase tracking-tighter">{emp.role || 'Ouvrier'}</p>
          </div>
        </div>
      </td>
      
      {weekDays.map((day, i) => {
        // LOGIQUE DE RECHERCHE D'ASSIGNATION
        const dateStr = day.toISOString().split('T')[0];
        const mission = assignments.find(a => 
          a.employe_id === emp.id && 
          dateStr >= a.date_debut && 
          dateStr <= a.date_fin
        );

        return (
          <td key={i} className="p-2 border-b border-l border-gray-100 h-24 group/cell">
            {mission ? (
              // SI UNE MISSION EXISTE
              <div className="w-full h-full rounded-xl bg-blue-500 p-2 shadow-sm flex flex-col justify-between border-b-4 border-blue-700 hover:scale-[1.02] transition-transform cursor-pointer">
                <p className="text-[10px] font-black text-white uppercase leading-tight truncate">
                  {mission.chantiers?.nom || 'Chantier'}
                </p>
                <div className="flex justify-between items-end">
                  <HardHat size={12} className="text-white/50" />
                  <span className="text-[8px] font-bold text-white/80 uppercase">8h - 17h</span>
                </div>
              </div>
            ) : (
              // SI VIDE
              <div className="w-full h-full rounded-2xl border-2 border-dashed border-transparent group-hover/cell:border-[#d63031]/20 flex flex-col items-center justify-center transition-all cursor-pointer bg-gray-50/30 hover:bg-white text-gray-300">
                <Plus size={16} className="opacity-0 group-hover/cell:opacity-100 mb-1" />
                <span className="text-[8px] font-black uppercase opacity-0 group-hover/cell:opacity-100">Affecter</span>
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
        )}
      </div>
    </div>
  );
}
