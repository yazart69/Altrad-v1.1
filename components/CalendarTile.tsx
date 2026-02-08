"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, ChevronRight, HardHat, Clock } from 'lucide-react';
import Link from 'next/link';

export default function CalendarTile() {
  const [weekData, setWeekData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Générer les jours de la semaine en cours (Lundi-Vendredi)
  const getCurrentWeekDays = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  };

  useEffect(() => {
    async function fetchWeekPlanning() {
      const days = getCurrentWeekDays();
      
      const { data } = await supabase
        .from('planning')
        .select(`
          date_debut,
          type,
          chantiers (nom),
          employes (nom, prenom)
        `)
        .in('date_debut', days);

      if (data) {
        // Regrouper par jour
        const grouped = days.map(day => ({
          date: day,
          missions: data.filter(d => d.date_debut === day)
        }));
        setWeekData(grouped);
      }
      setLoading(false);
    }
    fetchWeekPlanning();
  }, []);

  return (
    <div className="h-full w-full bg-white rounded-[25px] p-5 shadow-sm border border-gray-100 flex flex-col font-['Fredoka'] overflow-hidden">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Calendar size={18} />
          </div>
          <h2 className="text-sm font-black uppercase text-gray-800 tracking-tighter italic">Semaine en cours</h2>
        </div>
        <Link href="/planning" className="p-1 hover:bg-gray-50 rounded-lg text-gray-300 hover:text-blue-500 transition-all">
          <ChevronRight size={20} />
        </Link>
      </div>

      {/* MINI GRILLE HEBDOMADAIRE */}
      <div className="flex-1 flex flex-col gap-2">
        {loading ? (
          <div className="flex-1 flex items-center justify-center opacity-20">
            <Clock className="animate-spin" />
          </div>
        ) : (
          weekData.map((day, idx) => {
            const dateObj = new Date(day.date);
            const isToday = new Date().toISOString().split('T')[0] === day.date;
            
            return (
              <div key={idx} className={`flex items-center gap-3 p-2 rounded-xl transition-all ${isToday ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50'}`}>
                {/* Date */}
                <div className={`flex flex-col items-center justify-center min-w-[35px] h-[35px] rounded-lg ${isToday ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  <span className="text-[7px] font-black uppercase">{dateObj.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
                  <span className="text-[14px] font-black leading-none">{dateObj.getDate()}</span>
                </div>

                {/* Missions */}
                <div className="flex-1 flex gap-1 overflow-x-auto no-scrollbar">
                  {day.missions.length > 0 ? (
                    day.missions.slice(0, 3).map((m: any, i: number) => (
                      <div 
                        key={i} 
                        className="h-6 px-2 bg-gray-900 text-white rounded-md flex items-center gap-1 shrink-0 animate-in fade-in zoom-in duration-300"
                        title={m.chantiers?.nom || m.type}
                      >
                        <HardHat size={8} className="text-blue-400" />
                        <span className="text-[8px] font-black uppercase tracking-tighter truncate max-w-[60px]">
                          {m.chantiers?.nom || m.type}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-[9px] font-bold text-gray-300 uppercase italic">Aucune mission</span>
                  )}
                  {day.missions.length > 3 && (
                    <div className="h-6 w-6 bg-gray-100 rounded-md flex items-center justify-center text-[8px] font-black text-gray-400">
                      +{day.missions.length - 3}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CTA FOOTER */}
      <Link 
        href="/planning" 
        className="mt-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-[9px] font-black uppercase tracking-widest text-center text-gray-400 hover:text-blue-500 transition-all border border-transparent hover:border-blue-100"
      >
        Ouvrir le planning complet
      </Link>
    </div>
  );
}
