"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ShoppingCart, CalendarClock, MessageSquareWarning, MapPin, AlertTriangle, Truck, FileX, ShieldAlert, ArrowUpRight, Clock } from 'lucide-react';

interface MiddleTilesProps {
  alertsCount?: number; // Alertes RH (CACES, Dossiers)
}

export default function MiddleTiles({ alertsCount = 0 }: MiddleTilesProps) {
  // États Matériel & Location
  const [totalMateriel, setTotalMateriel] = useState(0);
  const [locationsActives, setLocationsActives] = useState<any[]>([]);
  
  // États Conformité ( inchangés )
  const [odmAlerts, setOdmAlerts] = useState(0);
  const [siteAnomalies, setSiteAnomalies] = useState<any[]>([]);

  const fetchData = async () => {
    // 1. Total Matériel INTERNE (Stock Agence uniquement)
    const { count } = await supabase
        .from('materiel')
        .select('*', { count: 'exact', head: true })
        .eq('type_stock', 'Interne'); // Filtre ajouté
    setTotalMateriel(count || 0);

    // 2. Locations Actives (Tout ce qui est sur chantier)
    const { data: l } = await supabase
        .from('chantier_materiel')
        .select('*, chantiers(nom), materiel(nom, type_stock)')
        .eq('statut', 'en_cours')
        .limit(5); // On affiche les 5 dernières
    setLocationsActives(l || []);

    // 3. Scan ODM manquants (Reste inchangé)
    const { data: o } = await supabase.from('planning').select('id').eq('type', 'chantier').eq('odm_envoye', false);
    setOdmAlerts(o?.length || 0);

    // 4. Scan des Anomalies de Chantier (Reste inchangé)
    const { data: s } = await supabase.from('site_reports').select('*, chantiers(nom)').eq('has_anomalies', true).order('created_at', { ascending: false }).limit(2);
    setSiteAnomalies(s || []);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Rafraîchissement auto
    return () => clearInterval(interval);
  }, []);

  const totalConformite = alertsCount + odmAlerts + siteAnomalies.length;

  // Helper pour formater la durée
  const formatDuration = (start: string, end: string) => {
      if (!start || !end) return '';
      const d1 = new Date(start);
      const d2 = new Date(end);
      const diffTime = Math.abs(d2.getTime() - d1.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      return `${diffDays}j`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full font-['Fredoka']">
      
      {/* TUILE 1 : MATÉRIEL (Stock Interne Uniquement) */}
      <Link href="/materiel" className="block h-full">
        <div className="bg-[#0984e3] rounded-[25px] p-5 text-white relative overflow-hidden flex flex-col shadow-lg border border-white/10 group h-full hover:scale-[1.02] transition-transform duration-300">
          <div className="flex justify-between items-start mb-4 z-10">
            <div>
              <h3 className="font-black uppercase text-sm leading-none italic">Matériel</h3>
              <p className="text-[9px] font-bold opacity-60 uppercase mt-1">Stock Agence</p>
            </div>
            <div className="flex items-center gap-2">
               <ShoppingCart size={18} className="opacity-40 group-hover:opacity-0 transition-opacity" />
               <div className="bg-white/20 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-4">
                 <ArrowUpRight size={14} />
               </div>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col justify-center items-center z-10">
             <span className="text-5xl font-black">{totalMateriel}</span>
             <span className="text-xs font-bold opacity-80 uppercase tracking-widest mt-2">Références Internes</span>
          </div>
          
          <Truck className="absolute -right-4 -bottom-4 opacity-10 w-20 h-20 rotate-12 group-hover:rotate-0 transition-transform duration-500" />
        </div>
      </Link>

      {/* TUILE 2 : LOCATIONS (Actives sur Chantier) */}
      <Link href="/materiel" className="block h-full">
        <div className="bg-[#6c5ce7] rounded-[25px] p-5 text-white flex flex-col shadow-lg border border-white/10 group h-full hover:scale-[1.02] transition-transform duration-300 relative overflow-hidden">
          <div className="flex justify-between items-start mb-4 z-10">
            <div>
              <h3 className="font-black uppercase text-sm leading-none italic">Locations</h3>
              <p className="text-[9px] font-bold opacity-60 uppercase mt-1">Sur Chantier</p>
            </div>
            <div className="flex items-center gap-2">
               <CalendarClock size={18} className="opacity-40 group-hover:opacity-0 transition-opacity" />
               <div className="bg-white/20 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-4">
                 <ArrowUpRight size={14} />
               </div>
            </div>
          </div>
          
          <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar z-10">
            {locationsActives.map((loc, i) => (
              <div key={i} className="bg-white/10 p-2 rounded-xl border border-white/5 flex flex-col hover:bg-white/20 transition-all">
                <div className="flex justify-between items-center">
                    <p className="font-black text-[11px] uppercase truncate flex-1">{loc.materiel?.nom || 'Matériel Inconnu'}</p>
                    <span className={`text-[7px] px-1.5 rounded uppercase font-black ${loc.materiel?.type_stock === 'Externe' ? 'bg-purple-500 text-white' : 'bg-blue-400 text-white'}`}>
                        {loc.materiel?.type_stock === 'Externe' ? 'Loué' : 'Interne'}
                    </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[8px] font-bold opacity-70 italic truncate max-w-[80px]"><MapPin size={8} className="inline"/> {loc.chantiers?.nom}</span>
                  
                  {/* Durée Restante */}
                  {loc.date_fin && (
                      <span className="text-[8px] font-bold opacity-90 flex items-center gap-1 bg-black/20 px-1.5 rounded">
                        <Clock size={8}/> {formatDuration(loc.date_debut, loc.date_fin)}
                      </span>
                  )}
                </div>
              </div>
            ))}
            {locationsActives.length === 0 && <p className="text-[9px] opacity-50 text-center mt-4">Aucun matériel sur chantier</p>}
          </div>
        </div>
      </Link>

      {/* TUILE 3 : CONFORMITÉ (Lien corrigé vers /chantier) */}
      <Link href="/chantier" className="block h-full">
        <div className={`rounded-[25px] p-5 text-white flex flex-col transition-all duration-500 shadow-lg border border-white/10 h-full hover:scale-[1.02] group relative overflow-hidden ${totalConformite > 0 ? 'bg-[#d63031]' : 'bg-gray-800'}`}>
          <div className="flex justify-between items-start mb-4 z-10">
            <div>
              <h3 className="font-black uppercase text-sm leading-none italic">Conformité</h3>
              <p className="text-[9px] font-bold opacity-60 uppercase mt-1 italic tracking-widest">Alerte Sécurité / ODM</p>
            </div>
            <div className="flex items-center gap-2">
               <MessageSquareWarning size={18} className={`transition-opacity ${totalConformite > 0 ? 'animate-bounce' : 'opacity-40 group-hover:opacity-0'}`} />
               <div className="bg-white/20 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-4">
                 <ArrowUpRight size={14} />
               </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 z-10">
            <div className="flex items-center justify-center py-2 bg-black/20 rounded-2xl group-hover:bg-black/30 transition-colors">
              <p className="text-4xl font-black">{totalConformite}</p>
            </div>

            {odmAlerts > 0 && (
              <div className="flex items-center gap-2 bg-black/20 px-3 py-2 rounded-xl border border-white/10">
                <FileX size={14} className="text-red-200" />
                <p className="text-[9px] font-black uppercase tracking-tighter">{odmAlerts} ODM non envoyés</p>
              </div>
            )}

            {siteAnomalies.map((anom, i) => (
              <div key={i} className="bg-white/10 p-2 rounded-xl border border-red-400/30 flex gap-2 items-start">
                <ShieldAlert size={14} className="text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] font-black uppercase leading-tight">{anom.chantiers?.nom}</p>
                  <p className="text-[10px] opacity-80 italic leading-tight">{anom.description_anomalie}</p>
                </div>
              </div>
            ))}
          </div>
           {totalConformite > 0 && (
             <div className="absolute inset-0 bg-red-500/20 animate-pulse pointer-events-none" />
           )}
        </div>
      </Link>

    </div>
  );
}
