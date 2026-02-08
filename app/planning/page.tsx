"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, Calendar, User, HardHat } from 'lucide-react';

export default function PlanningPage() {
  const [employes, setEmployes] = useState<any[]>([]);
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Gestion des dates (Semaine en cours)
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  async function fetchData() {
    setLoading(true);
    // 1. Charger tous les employés
    const { data: emp } = await supabase.from('employes').select('*').order('nom');
    // 2. Charger tous les chantiers actifs
    const { data: chan } = await supabase.from('chantiers').select('id, nom').eq('statut', 'en_cours');
    // 3. Charger le planning (on simplifie pour l'instant)
    const { data: plan } = await supabase.from('planning').select('*, chantiers(nom)');

    if (emp) setEmployes(emp);
    if (chan) setChantiers(chan);
    if (plan) setAssignments(plan);
    setLoading(false);
  }

  // Calcul des jours de la semaine (Lundi à Vendredi)
  const getDaysOfWeek = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Ajuster au Lundi
    start.setDate(diff);
    
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };

  const weekDays = getDaysOfWeek(currentDate);

  return (
    <div className="min-h-screen bg-[#f0f3f4] p-8 font-['Fredoka']">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase text-gray-800">Planning Hebdo</h1>
          <p className="text-gray-400 font-bold uppercase text-xs tracking-widest mt-1">Affectation des équipes</p>
        </div>

        <div className="flex items-center bg-white rounded-2xl p-2 shadow-sm gap-4">
          <button onClick={() => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() - 7);
            setCurrentDate(d);
          }} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><ChevronLeft /></button>
          
          <div className="flex items-center gap-2 font-bold px-4">
            <Calendar size={18} className="text-[#d63031]" />
            <span>Semaine du {weekDays[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
          </div>

          <button onClick={() => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() + 7);
            setCurrentDate(d);
          }} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><ChevronRight /></button>
        </div>
      </div>

      <div className="bg-white rounded-[30px] shadow-sm overflow-hidden border border-gray-100">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="p-6 text-left border-b border-gray-100 w-[250px]">
                <div className="flex items-center gap-2 text-gray-400 uppercase text-[10px] font-black">
                  <User size={14} /> Personnel
                </div>
              </th>
              {weekDays.map((day, i) => (
                <th key={i} className="p-4 border-b border-l border-gray-100 text-center">
                  <p className="text-[10px] uppercase font-black text-gray-400">{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</p>
                  <p className="text-lg font-black text-gray-800">{day.getDate()}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employes.map((emp) => (
              <tr key={emp.id} className="group hover:bg-gray-50/50 transition-colors">
                <td className="p-6 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500 text-xs">
                      {emp.nom[0]}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{emp.nom} {emp.prenom}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{emp.role}</p>
                    </div>
                  </div>
                </td>
                {weekDays.map((day, i) => {
                  // Ici on simulera l'affichage du chantier
                  // Pour l'instant on affiche un bloc interactif vide
                  return (
                    <td key={i} className="p-2 border-b border-l border-gray-100 h-24 group/cell">
                      <div className="w-full h-full rounded-xl border-2 border-dashed border-transparent group-hover/cell:border-gray-200 flex items-center justify-center transition-all cursor-pointer">
                         <Plus size={16} className="text-gray-300 opacity-0 group-hover/cell:opacity-100" />
                      </div>
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
