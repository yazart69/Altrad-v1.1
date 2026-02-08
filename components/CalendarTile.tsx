"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, ChevronRight, MapPin, Clock } from 'lucide-react';
import Link from 'next/link';

export default function CalendarTile() {
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUpcoming() {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('planning')
        .select(`
          id,
          date_debut,
          type,
          chantiers (nom),
          employes (nom, prenom)
        `)
        .gte('date_debut', today)
        .order('date_debut', { ascending: true })
        .limit(3);

      if (data) setUpcoming(data);
      setLoading(false);
    }
    fetchUpcoming();
  }, []);

  return (
    <div className="h-full w-full bg-white rounded-[25px] p-6 shadow-sm border border-gray-100 flex flex-col font-['Fredoka']">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Calendar size={20} />
          </div>
          <h2 className="text-xl font-black uppercase text-gray-800 tracking-tighter">Agenda</h2>
        </div>
        <Link href="/planning" className="text-gray-300 hover:text-black transition-colors">
          <ChevronRight size={24} />
        </Link>
      </div>

      <div className="flex-1 space-y-4">
        {loading ? (
          <div className="h-full flex items-center justify-center text-gray-300 animate-pulse text-xs font-bold uppercase">Chargement...</div>
        ) : upcoming.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-300 text-xs font-bold uppercase italic text-center">Aucune mission <br/> programmée</div>
        ) : (
          upcoming.map((item, i) => (
            <div key={i} className="group flex items-center gap-4 p-3 rounded-2xl bg-gray-50 hover:bg-blue-50 transition-all cursor-pointer">
              <div className="flex flex-col items-center justify-center bg-white shadow-sm rounded-xl px-3 py-2 min-w-[50px] border border-gray-100">
                <span className="text-[10px] font-black text-blue-500 uppercase">
                  {new Date(item.date_debut).toLocaleDateString('fr-FR', { weekday: 'short' })}
                </span>
                <span className="text-lg font-black text-gray-800 leading-none">
                  {new Date(item.date_debut).getDate()}
                </span>
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black text-gray-800 uppercase truncate">
                  {item.chantiers?.nom || item.type}
                </p>
                <div className="flex items-center gap-1 text-gray-400">
                  <Clock size={10} />
                  <span className="text-[9px] font-bold uppercase">{item.employes?.prenom} {item.employes?.nom}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Link href="/planning" className="mt-4 w-full py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest text-center hover:bg-blue-600 transition-colors">
        Voir tout le planning
      </Link>
    </div>
  );
}
