"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, MapPin, HardHat, Loader2, Activity, ArrowUpRight, Map } from 'lucide-react';
import Link from 'next/link';

interface StaffingTileProps {
  staffCount?: number;
}

// Helper pour garantir la date locale (identique page Planning)
const toLocalISOString = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
  return adjustedDate.toISOString().split('T')[0];
};

export default function StaffingTile({ staffCount = 0 }: StaffingTileProps) {
  const [staffing, setStaffing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    async function fetchCurrentStaffing() {
      // Utilisation de la date locale pour matcher avec la BDD
      const today = toLocalISOString(new Date());

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
        .eq('type', 'chantier'); // On ne veut que les chantiers, pas les congés

      if (assignments) {
        // 2. On regroupe les employés par chantier
        const grouped: any = {};
        let count = 0;

        assignments.forEach((assign: any) => {
          // Sécurité : Vérifier que les relations existent (employé et chantier non nuls)
          if (assign.employes && assign.chantiers) {
             // Optionnel : Filtrer par statut si besoin (ici on prend tout ce qui est planifié sur chantier)
             // Si l'employé est malade MAIS planifié par erreur, il apparaîtra. 
             // Pour être strict : if (assign.employes.statut_actuel === 'disponible') ...
            
            const chantierId = assign.chantiers.id;
            if (!grouped[chantierId]) {
              grouped[chantierId] = {
                nom: assign.chantiers.nom,
                equipe: []
              };
            }
            grouped[chantierId].equipe.push(assign.employes);
            count++;
          }
        });

        // Transformer l'objet en tableau pour le map
        setStaffing(Object.values(grouped));
        setActiveCount(count);
      }
      setLoading(false);
    }

    fetchCurrentStaffing();
    // Rafraîchir toutes les 30 secondes pour coller au terrain
    const interval = setInterval(fetchCurrentStaffing, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full w-full bg-[#e17055] rounded-[25px] flex flex-col shadow-lg overflow-hidden p-6 font-['Fredoka'] text-white relative group border border-white/5 hover:scale-[1.01] transition-transform duration-300">
      
      {/* HEADER HARMONISÉ */}
      <div className="flex justify-between items-start mb-6 z-10">
        <Link href="/planning" className="group/title">
            <h2 className="text-[24px] font-black uppercase tracking-tight leading-none text-white">
            Staffing <span className="text-orange-900 opacity-40">Terrain</span>
            </h2>
            <div className="flex items-center gap-2 mt-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                <p className="text-[10px] text-orange-50 font-bold uppercase tracking-widest opacity-80">
                En direct • {activeCount} Actifs
                </p>
            </div>
        </Link>
        <Link href="/planning" className="bg-white/20 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-white">
           <ArrowUpRight size={20} />
        </Link>
      </div>

      {/* LISTE DES CHANTIERS ACTIFS */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1 z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <Loader2 className="animate-spin text-white" size={30} />
            <p className="text-[10px] font-black text-white/50 uppercase italic">Scan des positions...</p>
          </div>
        ) : staffing.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-40 py-10">
            <HardHat size={50} className="mb-3 text-white" />
            <p className="text-xs font-black uppercase tracking-tighter text-white text-center">
              Aucune affectation <br/> planifiée aujourd'hui
            </p>
          </div>
        ) : (
          staffing.map((site, idx) => (
            <div key={idx} className="bg-white/10 rounded-[20px] p-4 border border-white/5 hover:bg-white/20 hover:shadow-md transition-all group/site backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-white/20 rounded-lg shadow-sm text-white group-hover/site:bg-white group-hover/site:text-[#e17055] transition-colors">
                  <MapPin size={14} />
                </div>
                <h3 className="font-black text-white text-[13px] truncate uppercase tracking-tighter">
                  {site.nom}
                </h3>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {site.equipe.map((emp: any) => (
                  <div 
                    key={emp.id} 
                    className="bg-black/20 px-2.5 py-1 rounded-xl flex items-center gap-2 border border-white/5 shadow-sm hover:bg-black/30 transition-colors cursor-default"
                    title={emp.role}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.8)]"></div>
                    <span className="text-[10px] font-bold text-white uppercase tracking-tighter">
                      {emp.nom} {emp.prenom?.substring(0,1)}.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* FOOTER STATS RAPIDES (HARMONISÉ) */}
      {staffing.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center z-10">
          <p className="text-[9px] font-black text-white/50 uppercase italic flex items-center gap-1">
             <Map size={12} /> {staffing.length} Site(s) en activité
          </p>
          <div className="flex -space-x-2 opacity-80">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-5 h-5 rounded-full bg-white/30 border-2 border-[#e17055]"></div>
            ))}
          </div>
        </div>
      )}

      {/* DÉCORATION FOND */}
      <HardHat size={160} className="absolute -right-6 -bottom-8 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none text-orange-900" />
    </div>
  );
}
