"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LeavesTile() {
  const [absents, setAbsents] = useState<any[]>([]);

  useEffect(() => {
    async function fetchAbsents() {
      const { data } = await supabase
        .from('users')
        .select('*')
        .neq('statut_actuel', 'disponible'); // On prend tout sauf les disponibles
      if (data) setAbsents(data);
    }
    fetchAbsents();
  }, []);

  return (
    <div className="h-full w-full bg-[#a55eea] rounded-[25px] flex flex-col shadow-sm overflow-hidden p-6 font-['Fredoka'] text-white">
      <h2 className="text-[28px] font-black uppercase mb-4 tracking-tight leading-none">
        Congés & Absences
      </h2>
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <div className="space-y-3">
          {absents.map((person, i) => (
            <div key={i} className="bg-white/20 backdrop-blur-md rounded-xl p-3 border border-white/10">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-[18px] leading-tight">{person.prenom} {person.nom}</p>
                  <p className="text-[14px] text-white/80 uppercase font-medium">{person.role}</p>
                </div>
                <span className={`px-2 py-1 rounded-md text-[11px] font-black uppercase ${
                  person.statut_actuel === 'maladie' ? 'bg-red-500' : 
                  person.statut_actuel === 'formation' ? 'bg-blue-500' : 'bg-orange-500'
                }`}>
                  {person.statut_actuel}
                </span>
              </div>
              <p className="text-[13px] mt-1 font-medium italic opacity-90">{person.commentaire_statut}</p>
            </div>
          ))}
          {absents.length === 0 && <p className="text-center opacity-70">Tout le monde est disponible.</p>}
        </div>
      </div>
    </div>
  );
}
