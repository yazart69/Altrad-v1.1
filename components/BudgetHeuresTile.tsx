"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function BudgetHeuresTile() {
  const [chantiers, setChantiers] = useState<any[]>([]);

  useEffect(() => {
    async function fetchChantiers() {
      const { data } = await supabase.from('chantiers').select('*');
      if (data) setChantiers(data);
    }
    fetchChantiers();
  }, []);

  return (
    <div className="h-full w-full bg-[#ff9f43] rounded-[25px] flex flex-col shadow-sm overflow-hidden p-6 font-['Fredoka'] text-white">
      <h2 className="text-[28px] font-black uppercase mb-4 tracking-tight leading-none">Chantiers</h2>
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
        {chantiers.map((chantier, i) => (
          <div key={i} className="bg-black/10 rounded-xl p-3">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-[16px] truncate mr-2">{chantier.nom}</span>
              <span className="text-[12px] font-black bg-white/20 px-2 py-0.5 rounded uppercase">
                {chantier.statut}
              </span>
            </div>
            <p className="text-[12px] opacity-80 mb-2 truncate">📍 {chantier.adresse}</p>
            {/* Barre de progression fictive pour l'instant */}
            <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden">
              <div className="bg-white h-full" style={{ width: '45%' }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
