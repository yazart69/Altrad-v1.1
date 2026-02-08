"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MoreHorizontal, Loader2 } from 'lucide-react';

export default function TeamTile() {
  const [stats, setStats] = useState([
    { label: "Ouvriers", val: 0, color: "#ffffff", pct: 0 }, 
    { label: "Chefs", val: 0, color: "#feca57", pct: 0 }, 
    { label: "Intérim", val: 0, color: "#ff9ff3", pct: 0 },
  ]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTeamStats() {
      // SYNCHRONISATION : On pointe vers la table 'employes'
      const { data } = await supabase.from('employes').select('role');
      
      if (data) {
        const totalCount = data.length;
        
        // Filtrage par rôles (insensible à la casse)
        const ouvriers = data.filter(u => u.role?.toLowerCase() === 'ouvrier').length;
        const chefs = data.filter(u => u.role?.toLowerCase().includes('chef') || u.role?.toLowerCase().includes('responsable')).length;
        const interim = data.filter(u => u.role?.toLowerCase().includes('interim') || u.role?.toLowerCase().includes('operateur')).length;

        setTotal(totalCount);
        
        if (totalCount > 0) {
          setStats([
            { label: "Ouvriers", val: ouvriers, color: "#ffffff", pct: (ouvriers / totalCount) * 100 },
            { label: "Chefs", val: chefs, color: "#feca57", pct: (chefs / totalCount) * 100 },
            { label: "Intérim", val: interim, color: "#ff9ff3", pct: (interim / totalCount) * 100 },
          ]);
        }
      }
      setLoading(false);
    }
    fetchTeamStats();
    
    // Rafraîchissement automatique pour suivre les nouvelles recrues
    const interval = setInterval(fetchTeamStats, 20000);
    return () => clearInterval(interval);
  }, []);

  // Calcul des segments pour le Donut CSS
  const ouvrierEnd = stats[0].pct;
  const chefEnd = ouvrierEnd + stats[1].pct;

  return (
    <div className="h-full w-full bg-[#00b894] rounded-[25px] flex flex-col shadow-sm overflow-hidden border-none text-white font-['Fredoka']">
      
      {/* HEADER */}
      <div className="p-[25px] pb-4 flex justify-between items-start shrink-0">
        <div className="flex flex-col">
          <span className="opacity-90 text-[13px] font-[700] uppercase tracking-[0.15em] leading-none text-white/80">Effectifs</span>
          <h2 className="font-[800] text-[28px] uppercase leading-[1.1] mt-2 tracking-tighter">Répartition <br/> Équipes</h2>
        </div>
        <button className="p-2 hover:bg-white/20 rounded-full transition-colors">
          {loading ? <Loader2 size={24} className="animate-spin" /> : <MoreHorizontal size={28} />}
        </button>
      </div>

      <div className="flex-1 px-[25px] flex items-center justify-between pb-6">
        {/* DONUT DYNAMIQUE */}
        <div className="relative w-[145px] h-[145px] rounded-full flex items-center justify-center shrink-0 shadow-2xl transition-all duration-1000"
             style={{ 
               background: total > 0 ? `conic-gradient(
                 #ffffff 0% ${ouvrierEnd}%, 
                 #feca57 ${ouvrierEnd}% ${chefEnd}%, 
                 #ff9ff3 ${chefEnd}% 100%
               )` : '#white/10'
             }}>
          {/* Centre du Donut */}
          <div className="w-[105px] h-[105px] bg-[#00b894] rounded-full flex flex-col items-center justify-center text-center z-10 shadow-inner">
             <span className="text-[36px] font-[900] leading-none tracking-tighter">{total}</span>
             <span className="text-[10px] font-[800] uppercase opacity-70 tracking-widest">Total</span>
          </div>
        </div>

        {/* LÉGENDE */}
        <div className="flex flex-col gap-4 flex-1 pl-6">
          {stats.map((s, i) => (
            <div key={i} className="flex justify-between items-end w-full border-b border-white/10 pb-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}></div>
                <span className={`text-[12px] font-[800] uppercase tracking-tighter ${s.val > 0 ? 'text-white' : 'text-white/30'}`}>
                  {s.label}
                </span>
              </div>
              <span className={`text-[18px] font-[900] leading-none ${s.val > 0 ? 'text-white' : 'text-white/30'}`}>
                {s.val}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
