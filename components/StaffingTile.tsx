"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, MapPin, HardHat } from 'lucide-react';

export default function StaffingTile() {
  const [staffing, setStaffing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStaffing() {
      // On récupère les chantiers et les employés qui y sont rattachés
      const { data, error } = await supabase
        .from('chantiers')
        .select(`
          id,
          nom,
          employes (
            id,
            nom,
            prenom,
            role
          )
        `)
        .eq('statut', 'en_cours');

      if (data) {
        // On ne garde que les chantiers qui ont au moins un employé
        const activeStaffing = data.filter((c: any) => c.employes.length > 0);
        setStaffing(activeStaffing);
      }
      setLoading(false);
    }

    fetchStaffing();
    const interval = setInterval(fetchStaffing, 10000); // Refresh toutes les 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full w-full bg-white rounded-[25px] flex flex-col shadow-sm overflow-hidden p-6 font-['Fredoka'] border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-[22px] font-black uppercase tracking-tight leading-none text-gray-800">
            Staffing <span className="text-[#0984e3]">Terrain</span>
          </h2>
          <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">Répartition en temps réel</p>
        </div>
        <div className="bg-blue-50 p-2 rounded-xl text-[#0984e3]">
          <Users size={20} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
        {loading ? (
          <p className="text-gray-300 text-sm animate-pulse text-center mt-10">Localisation des équipes...</p>
        ) : staffing.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30 grayscale">
            <HardHat size={40} className="mb-2" />
            <p className="text-sm font-bold">Aucune affectation</p>
          </div>
        ) : (
          staffing.map((chantier) => (
            <div key={chantier.id} className="border-l-4 border-[#0984e3] pl-4 py-1">
              <div className="flex items-center gap-1 mb-2">
                <MapPin size={12} className="text-gray-400" />
                <h3 className="font-bold text-gray-800 text-sm truncate uppercase">{chantier.nom}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {chantier.employes.map((emp: any) => (
                  <div key={emp.id} className="bg-gray-100 px-3 py-1 rounded-full flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[12px] font-bold text-gray-700">{emp.nom}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
