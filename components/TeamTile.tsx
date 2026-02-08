"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MoreHorizontal } from 'lucide-react';

export default function TeamTile() {
  const [stats, setStats] = useState([
    { label: "Ouvriers", val: 0, color: "#ffffff", pct: 0 }, 
    { label: "Chefs", val: 0, color: "#feca57", pct: 0 }, 
    { label: "Intérim", val: 0, color: "#ff9ff3", pct: 0 },
  ]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function fetchTeamStats() {
      const { data, error } = await supabase.from('users').select('role');
      
      if (data) {
        const totalCount = data.length;
        const ouvriers = data.filter(u => u.role === 'ouvrier').length;
        const chefs = data.filter(u => u.role.includes('chef')).length;
        const interim = data.filter(u => u.role === 'interim').length;

        setTotal(totalCount);
        setStats([
          { label: "Ouvriers", val: ouvriers, color: "#ffffff", pct: (ouvriers/totalCount)*100 },
          { label: "Chefs", val: chefs, color: "#feca57", pct: (chefs/totalCount)*100 },
          { label: "Intérim", val: interim, color: "#ff9ff3", pct: (interim/totalCount)*100 },
        ]);
      }
    }
    fetchTeamStats();
  }, []);

  // Calcul du dégradé pour le Donut
  const ouvrierEnd = stats[0].pct;
  const chefEnd = ouvrierEnd + stats[1].pct;

  return (
    <div className="h-full w-full bg-[#00b894] rounded-[25px] flex flex-col shadow-sm overflow-hidden border-none text-white font-['Fredoka']">
      
      <div className="p-[25px] pb-4 flex justify-between items-start shrink-0">
        <div className="flex flex-col">
          <span className="opacity-90 text-[13px] font-[700] uppercase tracking-[0.15em] leading-none">Effectifs</span>
          <h2 className="font-[800] text-[28px] uppercase leading-[1.1] mt-2">Répartition <br/> Équipes</h2>
        </div>
        <button className="p-2 hover:bg-white/20 rounded-full transition-colors"><MoreHorizontal size={28} /></button>
      </div>

      <div className="flex-1 px-[25px] flex items-center justify-between pb-6">
        {/* DONUT DYNAMIQUE EN CSS PUR */}
        <div className="relative w-[135px] h-[135px] rounded-full flex items-center justify-center shrink-0 shadow-lg"
             style={{ 
               background: `conic-gradient(
                 #ffffff 0% ${ouvrierEnd}%, 
                 #feca57 ${ouvrierEnd}% ${chefEnd}%, 
                 #ff9ff3 ${chefEnd}% 100%
               )` 
             }}>
          <div className="w-[95px] h-[95px] bg-[#00b894] rounded-full flex flex-col items-center justify-center text-center z-10 shadow-inner">
             <span className="text-[32px] font-[900] leading-none">{total}</span>
             <span className="text-[11px] font-[800] uppercase opacity-80">Total</span>
          </div>
        </div>

        {/* LÉGENDE DYNAMIQUE */}
        <div className="flex flex-col gap-3 flex-1 pl-4">
          {stats.map((s, i) => (
            <div key={i} className="flex justify-between items-center w-full">
              <span className={`text-[13px] font-[800] uppercase opacity-90 truncate ${s.val > 0 ? 'text-white' : 'text-white/40'}`}>
                {s.label}
              </span>
              <span className="text-[16px] font-[900]">{s.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
