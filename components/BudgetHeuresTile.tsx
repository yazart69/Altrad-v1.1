"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Plus, MapPin, ArrowUpRight } from 'lucide-react';

export default function BudgetHeuresTile() {
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChantiers() {
      const { data } = await supabase
        .from('chantiers')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) setChantiers(data);
      setLoading(false);
    }
    fetchChantiers();
  }, []);

  return (
    <div className="h-full w-full bg-white rounded-[25px] flex flex-col shadow-sm overflow-hidden p-6 font-['Fredoka'] border border-gray-100 relative group">
      
      {/* En-tête de la tuile */}
      <div className="flex justify-between items-center mb-6">
        <Link href="/planning-charge" className="group/title flex items-center gap-2">
          <div>
            <h2 className="text-[24px] font-black uppercase tracking-tight leading-none text-gray-800 group-hover/title:text-[#ff9f43] transition-colors">
              Chantiers <span className="text-[#ff9f43]">en cours</span>
            </h2>
            <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-widest">Suivi de l'avancement</p>
          </div>
          <div className="opacity-0 group-hover/title:opacity-100 transition-opacity bg-gray-50 p-1.5 rounded-full">
             <ArrowUpRight size={16} className="text-[#ff9f43]" />
          </div>
        </Link>
        <Link href="/chantier/nouveau">
          <button className="bg-[#ff9f43] hover:bg-[#ee8f32] text-white p-2.5 rounded-xl transition-all shadow-lg shadow-orange-100 cursor-pointer hover:scale-105 active:scale-95">
            <Plus size={24} />
          </button>
        </Link>
      </div>

      {/* Liste scrollable */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-20 bg-gray-50 animate-pulse rounded-2xl"></div>
            ))}
          </div>
        ) : chantiers.length === 0 ? (
          <p className="text-center text-gray-400 mt-10 italic">Aucun chantier enregistré.</p>
        ) : (
          chantiers.map((chantier) => {
            // Calcul du ratio d'avancement
            const ratio = chantier.heures_budget > 0 
              ? (chantier.heures_consommees / chantier.heures_budget) 
              : 0;
            const percentage = Math.min(100, Math.round(ratio * 100));

            // Détermination de la couleur de la barre
            let barColor = "bg-[#00b894]"; // Vert (OK)
            if (percentage >= 100) barColor = "bg-[#d63031]"; // Rouge (Dépassé)
            else if (percentage > 85) barColor = "bg-[#ff9f43]"; // Orange (Alerte)

            return (
              <Link 
                href={`/chantier/${chantier.id}`} 
                key={chantier.id} 
                className="block p-4 rounded-[20px] bg-gray-50 hover:bg-gray-100 transition-all border border-transparent hover:border-orange-100 group/item hover:shadow-sm"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 mr-4">
                    <h3 className="font-bold text-gray-800 text-[16px] leading-tight group-hover/item:text-[#ff9f43] transition-colors">
                      {chantier.nom}
                    </h3>
                    <div className="flex items-center gap-1 text-gray-400 mt-1">
                      <MapPin size={12} />
                      <span className="text-[11px] font-medium truncate max-w-[200px]">
                        {chantier.adresse || "Pas d'adresse"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[12px] font-black px-2 py-0.5 rounded uppercase ${
                      chantier.statut === 'en_cours' ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {chantier.statut}
                    </span>
                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">
                      {chantier.heures_consommees} / {chantier.heures_budget} H
                    </p>
                  </div>
                </div>

                {/* Barre d'avancement graphique */}
                <div className="relative pt-2">
                  <div className="flex mb-1 items-center justify-between">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className={`h-2.5 rounded-full transition-all duration-1000 ${barColor}`} 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="ml-3 text-[11px] font-black text-gray-600 w-8 text-right">{percentage}%</span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
