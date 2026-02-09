"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PieChart, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface TeamTileProps {
  isCompact?: boolean;
}

export default function TeamTile({ isCompact = false }: TeamTileProps) {
  const [stats, setStats] = useState([
    { label: "Interne", val: 0, color: "#feca57", pct: 0 }, 
    { label: "Intérim", val: 0, color: "#ff9ff3", pct: 0 },
    { label: "S-Traitant", val: 0, color: "#00FF1B", pct: 0 }, // Raccourci pour lisibilité
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
            { label: "S-Traitant", val: countST, color: "#00FF1B", pct: (countST / totalCount) * 100 },
            { label: "Autres", val: countAutres, color: "#00FFEE", pct: (countAutres / totalCount) * 100 },
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
    <Link href="/equipe" className="block h-full w-full">
      <div className="h-full w-full bg-[#0984e3] rounded-[25px] flex flex-col shadow-sm overflow-hidden text-white font-['Fredoka'] group hover:shadow-xl transition-all relative p-4">
        
        {/* TITRE */}
        <div className="text-center mb-2 z-10">
          <h2 className={`font-black uppercase italic leading-none ${isCompact ? 'text-[14px]' : 'text-2xl'}`}>
            Répartition
          </h2>
        </div>

        {/* CONTENU : DONUT + LÉGENDE */}
        <div className="flex-1 flex flex-col items-center justify-between z-10">
          
          {/* DONUT */}
          <div className={`relative rounded-full shrink-0 shadow-lg transition-all ${isCompact ? 'w-16 h-16' : 'w-24 h-24'}`}
               style={{ 
                 background: total > 0 ? `conic-gradient(
                   #feca57 0% ${s1}%, 
                   #ff9ff3 ${s1}% ${s2}%, 
                   #00FF1B ${s2}% ${s3}%, 
                   #00FFEE ${s3}% 100%
                 )` : 'rgba(255,255,255,0.1)'
               }}>
            <div className="absolute inset-2 bg-[#0984e3] rounded-full flex flex-col items-center justify-center shadow-inner">
               <span className={`${isCompact ? 'text-lg' : 'text-xl'} font-black leading-none`}>{total}</span>
            </div>
          </div>

          {/* LÉGENDE CLAIRE AVEC CHIFFRES */}
          <div className="w-full mt-2 grid grid-cols-2 gap-1">
            {stats.map((s, i) => (
              <div key={i} className="flex items-center justify-between bg-black/10 px-2 py-1 rounded hover:bg-black/20 transition-colors">
                <div className="flex items-center gap-1 overflow-hidden">
                   <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{backgroundColor: s.color}} />
                   <span className="text-[8px] font-bold uppercase truncate">{s.label}</span>
                </div>
                <span className="text-[9px] font-black">{s.val}</span>
              </div>
            ))}
          </div>

        </div>
        
        <PieChart className="absolute -right-4 -top-4 opacity-10 rotate-12 w-20 h-20 pointer-events-none" />
      </div>
    </Link>
  );
}
