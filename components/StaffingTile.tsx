"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, MapPin, HardHat, Loader2, activity } from 'lucide-react';

interface StaffingTileProps {
  staffCount?: number;
}

export default function StaffingTile({ staffCount = 0 }: StaffingTileProps) {
  const [staffing, setStaffing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCurrentStaffing() {
      const today = new Date().toISOString().split('T')[0];

      // 1. On récupère les affectations du planning pour AUJOURD'HUI
      const { data: assignments, error: planError } = await supabase
        .from('planning')
        .select(`
          chantier_id,
          chantiers (id, nom),
          employe_id,
          employes (id, nom, prenom, role, statut_actuel)
        `)
        .eq('date_debut', today)
        .eq('type', 'chantier');

      if (assignments) {
        // 2. On regroupe les employés par chantier
        const grouped: any = {};

        assignments.forEach((assign: any) => {
          // On n'affiche que ceux qui sont "disponible" (pas en congés/maladie)
          if (assign.employes?.statut_actuel === 'disponible') {
            const chantierId = assign.chantiers?.id;
            if (!grouped[chantierId]) {
              grouped[chantierId] = {
                nom: assign.chantiers?.nom,
                equipe: []
              };
            }
            grouped[chantierId].equipe.push(assign.employes);
          }
        });

        // Transformer l'objet en tableau pour le map
        setStaffing(Object.values(grouped));
      }
      setLoading(false);
    }

    fetchCurrentStaffing();
    // Rafraîchir toutes les 30 secondes pour coller au terrain
    const interval = setInterval(fetchCurrentStaffing, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full w-full bg-white rounded-[25px] flex flex-col shadow-sm overflow-hidden p-6 font-['Fredoka'] border border-gray-100">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-[22px] font-black uppercase tracking-tight leading-none text-gray-800 italic">
            Staffing <span className="text-[#0984e3]">Terrain</span>
          </h2>
          <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            En direct • {staffCount} Total Effectif
          </p>
        </div>
        <div className="bg-blue-50 p-3 rounded-2xl text-[#0984e3] shadow-inner">
          <Users size={24} />
        </div>
      </div>

      {/* LISTE DES CHANTIERS ACTIFS */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-5 pr-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <Loader2 className="animate-spin text-blue-500" size={30} />
            <p className="text-[10px] font-black text-gray-300 uppercase italic">Scan des positions...</p>
          </div>
        ) : staffing.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30 grayscale py-10">
            <HardHat size={50} className="mb-3 text-gray-400" />
            <p className="text-xs font-black uppercase tracking-tighter text-gray-500 text-center">
              Aucune affectation <br/> planifiée aujourd'hui
            </p>
          </div>
        ) : (
          staffing.map((site, idx) => (
            <div key={idx} className="bg-gray-50/50 rounded-[20px] p-4 border border-gray-100 hover:bg-white hover:shadow-md transition-all group">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-white rounded-lg shadow-sm text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <MapPin size={14} />
                </div>
                <h3 className="font-black text-gray-800 text-[13px] truncate uppercase tracking-tighter">
                  {site.nom}
                </h3>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {site.equipe.map((emp: any) => (
                  <div 
                    key={emp.id} 
                    className="bg-white px-3 py-1.5 rounded-xl flex items-center gap-2 border border-gray-100 shadow-sm"
                    title={emp.role}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    <span className="text-[11px] font-bold text-gray-700 uppercase tracking-tighter">
                      {emp.nom} {emp.prenom.substring(0,1)}.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* FOOTER STATS RAPIDES */}
      {staffing.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
          <p className="text-[9px] font-black text-gray-300 uppercase italic">
            {staffing.length} Site(s) en activité
          </p>
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-5 h-5 rounded-full bg-gray-200 border-2 border-white"></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
