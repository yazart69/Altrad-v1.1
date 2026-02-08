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
      // ATTENTION : On pointe bien sur 'users' car c'est la table que tu as remplie en SQL
      const { data, error } = await supabase.from('users').select('role');
      
      if (error) {
        console.error("Erreur de récupération:", error);
        setLoading(false);
        return;
      }

      if (data) {
        const totalCount = data.length;
        
        // Filtrage précis correspondant à ton script SQL
        const interne = data.filter(u => u.role === 'Interne (ALTRAD)').length;
        const interim = data.filter(u => u.role === 'INTÉRIMAIRE').length;
        const sousTraitants = data.filter(u => u.role === 'SOUS-TRAITANT').length;
        const altradAutres = data.filter(u => u.role === 'ALTRAD AUTRES').length;

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
  }, []);

  const s1 = stats[0].pct;
  const s2 = s1 + stats[1].pct;
  const s3 = s2 + stats[2].pct;

  return (
    <div className="h-full w-full bg-[#00b894] rounded-[25px] flex flex-col shadow-sm overflow-hidden text-white font-['Fredoka']">
      <div className="p-6 pb-2">
        <span className="opacity-80 text-[11px] font-bold uppercase tracking-widest">Effectifs</span>
        <h2 className="font-black text-2xl uppercase italic leading-none mt-1">Répartition</h2>
      </div>

      <div className="flex-1 flex items-center justify-between px-6 pb-4 gap-4">
        {/* DONUT */}
        <div className="relative w-28 h-28 rounded-full shrink-0 shadow-xl"
             style={{ 
               background: total > 0 ? `conic-gradient(
                 #feca57 0% ${s1}%, 
                 #ff9ff3 ${s1}% ${s2}%, 
                 #00FF1B ${s2}% ${s3}%, 
                 #00FFEE ${s3}% 100%
               )` : 'rgba(255,255,255,0.1)'
             }}>
          <div className="absolute inset-2.5 bg-[#00b894] rounded-full flex flex-col items-center justify-center shadow-inner">
             <span className="text-2xl font-black">{total}</span>
             <span className="text-[8px] font-bold uppercase opacity-60">Total</span>
          </div>
        </div>

        {/* LÉGENDE */}
        <div className="flex flex-col gap-1.5 flex-1">
          {stats.map((s, i) => (
            <div key={i} className="flex justify-between items-center border-b border-white/10 pb-1">
              <span className="text-[10px] font-bold uppercase truncate pr-2">{s.label}</span>
              <span className="text-sm font-black">{s.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
