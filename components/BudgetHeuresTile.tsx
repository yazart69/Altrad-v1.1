"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Plus, MapPin, ArrowUpRight, Activity } from 'lucide-react';

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
    <div className="h-full w-full bg-[#00b894] rounded-[25px] flex flex-col shadow-lg overflow-hidden p-6 font-['Fredoka'] text-white relative group border border-white/5 hover:scale-[1.01] transition-transform duration-300">
      
      {/* En-tête de la tuile HARMONISÉ */}
      <div className="flex justify-between items-center mb-6 z-10">
        <Link href="/planning-charge" className="group/title flex items-center gap-2">
          <div>
            <h2 className="text-[24px] font-black uppercase tracking-tight leading-none text-white">
              Chantiers <span className="text-emerald-800 opacity-60">en cours</span>
            </h2>
            <p className="text-[10px] text-emerald-50 font-bold mt-1 uppercase tracking-widest opacity-80">Suivi de l'avancement</p>
          </div>
          <div className="opacity-0 group-hover/title:opacity-100 transition-opacity bg-white/20 p-1.5 rounded-full text-white">
             <ArrowUpRight size={16} />
          </div>
        </Link>
        <Link href="/chantier/nouveau">
          <button className="bg-white text-[#00b894] hover:bg-emerald-50 p-2.5 rounded-xl transition-all shadow-lg cursor-pointer hover:scale-110 active:scale-95">
            <Plus size={24} />
          </button>
        </Link>
      </div>

      {/* Liste scrollable */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 z-10">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-20 bg-white/10 animate-pulse rounded-2xl"></div>
            ))}
          </div>
        ) : chantiers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-60">
             <p className="text-sm font-bold italic">Aucun chantier enregistré.</p>
          </div>
        ) : (
          chantiers.map((chantier) => {
            // Calcul du ratio d'avancement (LOGIQUE CONSERVÉE)
            const ratio = chantier.heures_budget > 0 
              ? (chantier.heures_consommees / chantier.heures_budget) 
              : 0;
            const percentage = Math.min(100, Math.round(ratio * 100));

            // Détermination de la couleur de la barre (ADAPTÉE AU FOND VERT)
            // Sur fond vert, la barre "OK" doit être blanche pour être visible.
            // Les alertes restent en couleur (Rouge/Orange).
            let barColor = "bg-white"; 
            if (percentage >= 100) barColor = "bg-[#d63031]"; // Rouge (Dépassé)
            else if (percentage > 85) barColor = "bg-[#ff9f43]"; // Orange (Alerte)

            return (
              <Link 
                href={`/chantier/${chantier.id}`} 
                key={chantier.id} 
                className="block p-4 rounded-[20px] bg-white/10 hover:bg-white/20 transition-all border border-white/5 hover:border-white/10 group/item hover:shadow-md"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 mr-4">
                    <h3 className="font-bold text-white text-[16px] leading-tight group-hover/item:text-emerald-100 transition-colors">
                      {chantier.nom}
                    </h3>
                    <div className="flex items-center gap-1 text-emerald-100 mt-1 opacity-80">
                      <MapPin size={12} />
                      <span className="text-[11px] font-medium truncate max-w-[200px] uppercase">
                        {chantier.adresse || "Pas d'adresse"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                      chantier.statut === 'en_cours' ? 'bg-white text-[#00b894]' : 'bg-black/20 text-white'
                    }`}>
                      {chantier.statut}
                    </span>
                    <p className="text-[9px] font-bold text-emerald-50 mt-1 uppercase tracking-tighter opacity-80">
                      {chantier.heures_consommees} / {chantier.heures_budget} H
                    </p>
                  </div>
                </div>

                {/* Barre d'avancement graphique */}
                <div className="relative pt-2">
                  <div className="flex mb-1 items-center justify-between">
                    <div className="w-full bg-black/10 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className={`h-2.5 rounded-full transition-all duration-1000 ${barColor}`} 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="ml-3 text-[11px] font-black text-white w-8 text-right">{percentage}%</span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

       {/* Décoration d'arrière-plan */}
       <Activity size={180} className="absolute -right-8 -bottom-10 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none text-emerald-900" />
    </div>
  );
}
