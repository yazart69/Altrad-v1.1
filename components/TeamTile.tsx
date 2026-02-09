"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PieChart, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface TeamTileProps {
  isCompact?: boolean; // Nouvelle prop pour gérer l'affichage réduit
}

export default function TeamTile({ isCompact = false }: TeamTileProps) {
  const [stats, setStats] = useState([
    { label: "Interne", val: 0, color: "#feca57", pct: 0 }, 
    { label: "Intérim", val: 0, color: "#ff9ff3", pct: 0 },
    { label: "Sous-traitant", val: 0, color: "#00FF1B", pct: 0 },
    { label: "Autres", val: 0, color: "#00FFEE", pct: 0 }, 
  ]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTeamStats() {
      const { data, error } = await supabase.from('users').select('role');
      if (data) {
        const totalCount = data.length;
        const countInterne = data.filter(u => u.role?.toLowerCase().includes('interne')).length;
        const countInterim = data.filter(u => u.role?.toLowerCase().includes('intérim')).length;
        const countST = data.filter(u => u.role?.toLowerCase().includes('sous')).length;
        const countAutres = totalCount - (countInterne + countInterim + countST);

        setTotal(totalCount);
        if (totalCount > 0) {
          setStats([
            { label: "Interne", val: countInterne, color: "#feca57", pct: (countInterne / totalCount) * 100 },
            { label: "Intérim", val: countInterim, color: "#ff9ff3", pct: (countInterim / totalCount) * 100 },
            { label: "ST", val: countST, color: "#00FF1B", pct: (countST / totalCount) * 100 },
            { label: "Autres", val: countAutres, color: "#00FFEE", pct: (countAutres / totalCount) * 100 },
          ]);
        }
      }
      setLoading(false);
    }
    fetchTeamStats();
  }, []);

  // Calcul du gradient pour le donut
  const s1 = stats[0].pct;
  const s2 = s1 + stats[1].pct;
  const s3 = s2 + stats[2].pct;

  return (
    <Link href="/equipe" className="block h-full w-full">
      <div className="h-full w-full bg-[#0984e3] rounded-[25px] flex flex-col shadow-sm overflow-hidden text-white font-['Fredoka'] group hover:shadow-xl transition-all relative">
        
        {/* Header Compact */}
        <div className={`p-4 ${isCompact ? 'pb-0 text-center' : 'pb-2'}`}>
          <h2 className={`font-black uppercase italic leading-none ${isCompact ? 'text-lg' : 'text-2xl'}`}>Répartition</h2>
          {!isCompact && <span className="opacity-80 text-[11px] font-bold uppercase tracking-widest">Types de contrats</span>}
        </div>

        <div className={`flex-1 flex items-center justify-center ${isCompact ? 'flex-col gap-2 p-2' : 'px-6 pb-4 gap-4'}`}>
          
          {/* DONUT */}
          <div className={`relative rounded-full shrink-0 shadow-xl transition-all ${isCompact ? 'w-24 h-24' : 'w-28 h-28'}`}
               style={{ 
                 background: total > 0 ? `conic-gradient(
                   #feca57 0% ${s1}%, 
                   #ff9ff3 ${s1}% ${s2}%, 
                   #00FF1B ${s2}% ${s3}%, 
                   #00FFEE ${s3}% 100%
                 )` : 'rgba(255,255,255,0.1)'
               }}>
            <div className="absolute inset-2.5 bg-[#0984e3] rounded-full flex flex-col items-center justify-center shadow-inner">
               <span className={`${isCompact ? 'text-xl' : 'text-2xl'} font-black`}>{total}</span>
            </div>
          </div>

          {/* LÉGENDE COMPACTE */}
          <div className={`flex ${isCompact ? 'flex-wrap justify-center gap-1 w-full' : 'flex-col gap-1.5 flex-1'}`}>
            {stats.map((s, i) => (
              <div key={i} className={`flex items-center gap-1 ${isCompact ? 'bg-black/10 px-2 py-0.5 rounded' : 'justify-between border-b border-white/10 pb-1'}`}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor: s.color}} />
                <span className="text-[9px] font-bold uppercase truncate">{s.label}</span>
                {!isCompact && <span className="text-sm font-black">{s.val}</span>}
              </div>
            ))}
          </div>
        </div>
        
        <PieChart className="absolute -right-5 -top-5 opacity-10 rotate-12 w-24 h-24 pointer-events-none" />
      </div>
    </Link>
  );
}
