"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MoreHorizontal, Loader2 } from 'lucide-react';

export default function TeamTile() {
  const [stats, setStats] = useState([
    { label: "Interne", val: 0, color: "#feca57", pct: 0 }, 
    { label: "Intérim", val: 0, color: "#ff9ff3", pct: 0 },
    { label: "Sous traitants", val: 0, color: "#00FF1B", pct: 0 },
    { label: "Altrad autres", val: 0, color: "#00FFEE", pct: 0 }, 
  ]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTeamStats() {
      const { data } = await supabase.from('employes').select('role');
      
      if (data) {
        const totalCount = data.length;
        
        // Logique de filtrage basée sur les nouvelles catégories
        const interne = data.filter(u => u.role?.toLowerCase().includes('interne')).length;
        const interim = data.filter(u => u.role?.toLowerCase().includes('interim')).length;
        const sousTraitants = data.filter(u => u.role?.toLowerCase().includes('sous-traitant') || u.role?.toLowerCase().includes('st')).length;
        const altradAutres = data.filter(u => u.role?.toLowerCase().includes('altrad') && !u.role?.toLowerCase().includes('interne')).length;

        setTotal(totalCount);
        
        if (totalCount > 0) {
          setStats([
            { label: "Interne", val: interne, color: "#feca57", pct: (interne / totalCount) * 100 },
            { label: "Intérim", val: interim, color: "#ff9ff3", pct: (interim / totalCount) * 100 },
            { label: "Sous traitants", val: sousTraitants, color: "#00FF1B", pct: (sousTraitants / totalCount) * 100 },
            { label: "Altrad autres", val: altradAutres, color: "#00FFEE", pct: (altradAutres / totalCount) * 100 },
          ]);
        }
      }
      setLoading(false);
    }
    fetchTeamStats();
    
    const interval = setInterval(fetchTeamStats, 20000);
    return () => clearInterval(interval);
  }, []);

  // Calcul des paliers pour le dégradé conique (Donut à 4 segments)
  const s1 = stats[0].pct;
  const s2 = s1 + stats[1].pct;
  const s3 = s2 + stats[2].pct;

  return (
    <div className="h-full w-full bg-[#00b894] rounded-[25px] flex flex-col shadow-sm overflow-hidden border-none text-white font-['Fredoka']">
      
      {/* HEADER */}
      <div className="p-[25px] pb-4 flex justify-between items-start shrink-0">
        <div className="flex flex-col">
          <span className="opacity-90 text-[13px] font-[700] uppercase tracking-[0.15em] leading-none text-white/80">Effectifs</span>
          <h2 className="font-[800] text-[28px] uppercase leading-[1.1] mt-2 tracking-tighter italic">Répartition <br/> Équipes</h2>
        </div>
        <button className="p-2 hover:bg-white/20 rounded-full transition-colors">
          {loading ? <Loader2 size={24} className="animate-spin" /> : <MoreHorizontal size={28} />}
        </button>
      </div>

      <div className="flex-1 px-[25px] flex items-center justify-between pb-6 gap-2">
        {/* DONUT DYNAMIQUE (4 segments) */}
        <div className="relative w-[130px] h-[130px] rounded-full flex items-center justify-center shrink-0 shadow-2xl transition-all duration-1000"
             style={{ 
               background: total > 0 ? `conic-gradient(
                 ${stats[0].color} 0% ${s1}%, 
                 ${stats[1].color} ${s1}% ${s2}%, 
                 ${stats[2].color} ${s2}% ${s3}%, 
                 ${stats[3].color} ${s3}% 100%
               )` : 'rgba(255,255,255,0.1)'
             }}>
          <div className="w-[95px] h-[95px] bg-[#00b894] rounded-full flex flex-col items-center justify-center text-center z-10 shadow-inner border border-white/5">
             <span className="text-[32px] font-[900] leading-none tracking-tighter">{total}</span>
             <span className="text-[10px] font-[800] uppercase opacity-70 tracking-widest">Total</span>
          </div>
        </div>

        {/* LÉGENDE DYNAMIQUE */}
        <div className="flex flex-col gap-2 flex-1 pl-4">
          {stats.map((s, i) => (
            <div key={i} className="flex justify-between items-center w-full border-b border-white/5 pb-1">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0 shadow-sm" style={{ backgroundColor: s.color }}></div>
                <span className={`text-[11px] font-[800] uppercase tracking-tighter truncate ${s.val > 0 ? 'text-white' : 'text-white/30'}`}>
                  {s.label}
                </span>
              </div>
              <span className={`text-[16px] font-[900] leading-none ml-1 ${s.val > 0 ? 'text-white' : 'text-white/30'}`}>
                {s.val}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
