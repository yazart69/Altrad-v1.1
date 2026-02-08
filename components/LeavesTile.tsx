"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plane, Pill, GraduationCap } from 'lucide-react';

export default function LeavesTile() {
  const [absents, setAbsents] = useState<any[]>([]);

  useEffect(() => {
    async function fetchAbsents() {
      // On filtre les employés qui ont un type d'affectation différent de 'chantier' dans le planning aujourd'hui
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('planning')
        .select('type, employes(nom, prenom, role)')
        .neq('type', 'chantier')
        .eq('date_debut', today);
      
      if (data) setAbsents(data);
    }
    fetchAbsents();
  }, []);

  return (
    <div className="h-full w-full bg-[#a55eea] rounded-[25px] flex flex-col shadow-sm overflow-hidden p-6 font-['Fredoka'] text-white">
      <h2 className="text-[28px] font-black uppercase mb-4 tracking-tight leading-none">Congés & Absences</h2>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="space-y-3">
          {absents.map((item, i) => (
            <div key={i} className="bg-white/20 backdrop-blur-md rounded-xl p-3 border border-white/10 flex justify-between items-center">
              <div>
                <p className="font-bold text-[16px] leading-tight uppercase">{item.employes?.prenom} {item.employes?.nom}</p>
                <p className="text-[10px] text-white/70 font-black uppercase tracking-wider">{item.employes?.role}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase bg-black/20 px-2 py-1 rounded-lg">
                  {item.type}
                </span>
                {item.type === 'maladie' && <Pill size={16} className="text-red-200" />}
                {item.type === 'conge' && <Plane size={16} className="text-orange-200" />}
                {item.type === 'formation' && <GraduationCap size={16} className="text-blue-200" />}
              </div>
            </div>
          ))}
          {absents.length === 0 && <p className="text-center opacity-70 italic font-medium py-10">Tout le monde est en poste.</p>}
        </div>
      </div>
    </div>
  );
}
