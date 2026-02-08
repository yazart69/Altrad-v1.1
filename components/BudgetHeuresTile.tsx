"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link'; // Import nécessaire pour la navigation
import { supabase } from '@/lib/supabase';
import { Plus } from 'lucide-react';

export default function BudgetHeuresTile() {
  const [chantiers, setChantiers] = useState<any[]>([]);

  useEffect(() => {
    async function fetchChantiers() {
      // On récupère l'ID pour le lien, en plus des autres infos
      const { data } = await supabase.from('chantiers').select('*').order('created_at', { ascending: false });
      if (data) setChantiers(data);
    }
    fetchChantiers();
  }, []);

  return (
    <div className="h-full w-full bg-[#ff9f43] rounded-[25px] flex flex-col shadow-sm overflow-hidden p-6 font-['Fredoka'] text-white">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[28px] font-black uppercase tracking-tight leading-none">Chantiers</h2>
        {/* Bouton pour ajouter un futur chantier */}
        <button className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors">
            <Plus size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
        {chantiers.map((chantier, i) => (
          <Link 
            href={`/chantier/${chantier.id}`} 
            key={i} 
            className="block bg-black/10 hover:bg-black/20 transition-colors rounded-xl p-3 cursor-pointer group"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-[16px] truncate mr-2 group-hover:underline decoration-2 underline-offset-2">
                {chantier.nom}
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                chantier.statut === 'en_cours' ? 'bg-green-500' : 'bg-gray-500'
              }`}>
                {chantier.statut}
              </span>
            </div>
            <p className="text-[12px] opacity-80 mb-2 truncate">📍 {chantier.adresse || "Adresse non définie"}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
