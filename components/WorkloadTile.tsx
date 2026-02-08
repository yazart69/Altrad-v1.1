"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart3 } from 'lucide-react';

interface ChantierWorkload {
  nom: string;
  heures_budget: number;
  heures_consommees: number;
}

export default function WorkloadTile() {
  const [data, setData] = useState<ChantierWorkload[]>([]);

  useEffect(() => {
    async function fetchWorkload() {
      // On récupère uniquement les chantiers qui ont un budget défini (> 0)
      const { data: chantiers } = await supabase
        .from('chantiers')
        .select('nom, heures_budget, heures_consommees')
        .gt('heures_budget', 0) 
        .order('heures_consommees', { ascending: false }) // Les plus actifs en premier
        .limit(4); // On garde les 4 plus gros pour l'affichage

      if (chantiers) {
        setData(chantiers);
      }
    }
    fetchWorkload();
  }, []);

  return (
    <div className="h-full w-full bg-[#0984e3] rounded-[25px] flex flex-col shadow-sm overflow-hidden p-6 font-['Fredoka'] text-white">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[24px] font-black uppercase tracking-tight leading-none">
          Suivi <br/> <span className="text-[#74b9ff]">Heures</span>
        </h2>
        <div className="bg-white/10 p-2 rounded-xl">
          <BarChart3 size={24} className="text-white" />
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-around overflow-y-auto custom-scrollbar pr-2 space-y-3">
        {data.length === 0 ? (
          <p className="text-white/50 text-sm italic">Aucune donnée d'heures...</p>
        ) : (
          data.map((item, i) => {
            // Calcul du pourcentage
            const percentage = Math.min(100, Math.round((item.heures_consommees / item.heures_budget) * 100));
            // Couleur change si on dépasse 80% ou 100%
            const barColor = percentage >= 100 ? 'bg-red-400' : percentage > 80 ? 'bg-orange-300' : 'bg-[#55efc4]';

            return (
              <div key={i} className="w-full">
                <div className="flex justify-between text-[13px] font-bold mb-1">
                  <span className="truncate w-[60%]">{item.nom}</span>
                  <span className="opacity-90">{item.heures_consommees} / {item.heures_budget} h</span>
                </div>
                
                <div className="w-full h-3 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm">
                  <div 
                    className={`h-full ${barColor} transition-all duration-1000 ease-out`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
