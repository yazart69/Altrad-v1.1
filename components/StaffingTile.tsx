"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MapPin, HardHat, Loader2, ArrowUpRight, Map, CalendarClock } from 'lucide-react';
import Link from 'next/link';

interface StaffingTileProps {
  staffCount?: number;
}

// Helper date locale
const toLocalISOString = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
  return adjustedDate.toISOString().split('T')[0];
};

// Helper formatage date FR
const formatDateFr = (isoDate: string) => {
    const d = new Date(isoDate);
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }); // ex: "Lun. 16"
};

export default function StaffingTile({ staffCount = 0 }: StaffingTileProps) {
  const [staffing, setStaffing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCount, setActiveCount] = useState(0);
  
  // Date affichée (Aujourd'hui ou Prévision)
  const [displayDate, setDisplayDate] = useState<string | null>(null);
  const [isForecast, setIsForecast] = useState(false);

  useEffect(() => {
    async function fetchStaffingSmart() {
      const todayObj = new Date();
      const todayStr = toLocalISOString(todayObj);
      
      // On regarde jusqu'à 4 jours devant
      const lookAheadObj = new Date(todayObj);
      lookAheadObj.setDate(todayObj.getDate() + 4);
      const lookAheadStr = toLocalISOString(lookAheadObj);

      // 1. Récupération large
      const { data: assignments } = await supabase
        .from('planning')
        .select(`
          date_debut,
          chantier_id,
          chantiers (id, nom),
          employe_id,
          employes (id, nom, prenom, role, statut_actuel)
        `)
        .gte('date_debut', todayStr)
        .lte('date_debut', lookAheadStr)
        .eq('type', 'chantier')
        .order('date_debut', { ascending: true });

      if (assignments && assignments.length > 0) {
        
        // 2. Déterminer quelle date afficher
        const todayTasks = assignments.filter((a: any) => a.date_debut === todayStr);
        
        let targetDate = todayStr;
        let targetTasks = todayTasks;
        let isFuture = false;

        // Si rien aujourd'hui, on prend la première date disponible
        if (todayTasks.length === 0) {
            targetDate = assignments[0].date_debut;
            targetTasks = assignments.filter((a: any) => a.date_debut === targetDate);
            isFuture = true;
        }

        // 3. Regroupement par chantier (AVEC DÉDOUBLONNAGE)
        const grouped: any = {};
        // Set global pour compter les personnes uniques au total sur la journée
        const uniquePeopleIds = new Set();

        targetTasks.forEach((assign: any) => {
          if (assign.employes && assign.chantiers) {
            const chantierId = assign.chantiers.id;
            
            // Init du groupe chantier si inexistant
            if (!grouped[chantierId]) {
              grouped[chantierId] = {
                nom: assign.chantiers.nom,
                equipe: []
              };
            }

            // CORRECTION DOUBLONS : Vérifier si l'employé est déjà dans la liste de ce chantier
            const isAlreadyInTeam = grouped[chantierId].equipe.some((e: any) => e.id === assign.employes.id);

            if (!isAlreadyInTeam) {
                grouped[chantierId].equipe.push(assign.employes);
                uniquePeopleIds.add(assign.employes.id);
            }
          }
        });

        setStaffing(Object.values(grouped));
        setActiveCount(uniquePeopleIds.size); // Compte réel de personnes uniques
        setDisplayDate(targetDate);
        setIsForecast(isFuture);
      } else {
        // Vraiment rien
        setStaffing([]);
        setActiveCount(0);
        setDisplayDate(todayStr);
        setIsForecast(false);
      }
      
      setLoading(false);
    }

    fetchStaffingSmart();
    const interval = setInterval(fetchStaffingSmart, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`h-full w-full rounded-[25px] flex flex-col shadow-lg overflow-hidden p-6 font-['Fredoka'] text-white relative group border border-white/5 hover:scale-[1.01] transition-transform duration-300 ${isForecast ? 'bg-[#2d3436]' : 'bg-[#e17055]'}`}>
      
      {/* HEADER */}
      <div className="flex justify-between items-start mb-4 z-10 shrink-0">
        <Link href="/planning" className="group/title">
            <h2 className="text-[24px] font-black uppercase tracking-tight leading-none text-white">
            Staffing <span className={`opacity-40 ${isForecast ? 'text-gray-400' : 'text-orange-900'}`}>Terrain</span>
            </h2>
            
            <div className="flex items-center gap-2 mt-1">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isForecast ? 'bg-orange-400' : 'bg-white'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isForecast ? 'bg-orange-500' : 'bg-white'}`}></span>
                </span>
                
                <p className={`text-[10px] font-bold uppercase tracking-widest opacity-80 flex items-center gap-1 ${isForecast ? 'text-gray-300' : 'text-orange-50'}`}>
                    {isForecast ? (
                        <>
                            <CalendarClock size={10} />
                            Prévu {displayDate && formatDateFr(displayDate)} • {activeCount} Pers.
                        </>
                    ) : (
                        `En direct • ${activeCount} Actifs`
                    )}
                </p>
            </div>
        </Link>
        <Link href="/planning" className="bg-white/20 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-white">
           <ArrowUpRight size={20} />
        </Link>
      </div>

      {/* LISTE DES CHANTIERS (SCROLLABLE) */}
      {/* flex-1 et min-h-0 sont cruciaux pour que le scroll fonctionne sans agrandir la div parente */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-3 pr-1 z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <Loader2 className="animate-spin text-white" size={30} />
            <p className="text-[10px] font-black text-white/50 uppercase italic">Recherche d'activité...</p>
          </div>
        ) : staffing.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-40 py-10">
            <HardHat size={50} className="mb-3 text-white" />
            <p className="text-xs font-black uppercase tracking-tighter text-white text-center">
              Aucune activité <br/> détectée (J+4)
            </p>
          </div>
        ) : (
          staffing.map((site, idx) => (
            <div key={idx} className="bg-white/10 rounded-[20px] p-4 border border-white/5 hover:bg-white/20 hover:shadow-md transition-all group/site backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 bg-white/20 rounded-lg shadow-sm text-white group-hover/site:bg-white transition-colors ${isForecast ? 'group-hover/site:text-[#2d3436]' : 'group-hover/site:text-[#e17055]'}`}>
                  <MapPin size={14} />
                </div>
                <h3 className="font-black text-white text-[12px] truncate uppercase tracking-tighter w-full">
                  {site.nom}
                </h3>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {site.equipe.map((emp: any) => (
                  <div 
                    key={emp.id} 
                    className="bg-black/20 px-2 py-1 rounded-xl flex items-center gap-2 border border-white/5 shadow-sm hover:bg-black/30 transition-colors cursor-default"
                    title={emp.role}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full shadow-lg ${isForecast ? 'bg-orange-400 shadow-orange-500/50' : 'bg-green-400 shadow-green-500/50'}`}></div>
                    <span className="text-[9px] font-bold text-white uppercase tracking-tighter">
                      {emp.nom} {emp.prenom?.substring(0,1)}.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* FOOTER STATS */}
      {staffing.length > 0 && (
        <div className="mt-2 pt-3 border-t border-white/10 flex justify-between items-center z-10 shrink-0">
          <p className="text-[9px] font-black text-white/50 uppercase italic flex items-center gap-1">
             <Map size={12} /> {staffing.length} Site(s) {isForecast ? 'prévus' : 'actifs'}
          </p>
          <div className="flex -space-x-2 opacity-80">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`w-5 h-5 rounded-full bg-white/30 border-2 ${isForecast ? 'border-[#2d3436]' : 'border-[#e17055]'}`}></div>
            ))}
          </div>
        </div>
      )}

      {/* DÉCORATION FOND */}
      <HardHat size={160} className={`absolute -right-6 -bottom-8 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none ${isForecast ? 'text-gray-900' : 'text-orange-900'}`} />
    </div>
  );
}
