"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ShoppingCart, CalendarClock, MessageSquareWarning, AlertTriangle, Truck, MapPin } from 'lucide-react';

interface MiddleTilesProps {
  alertsCount?: number;
}

export default function MiddleTiles({ alertsCount = 0 }: MiddleTilesProps) {
  const [besoins, setBesoins] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [conformite, setConformite] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Besoins Matériel + Nom du Chantier
      const { data: dataBesoins } = await supabase
        .from('material_requests')
        .select('*, chantiers(nom)')
        .eq('status', 'a_commander')
        .limit(5);
      if (dataBesoins) setBesoins(dataBesoins);

      // 2. Locations + Nom du Chantier
      const { data: dataLocs } = await supabase
        .from('rentals')
        .select('*, chantiers(nom)')
        .eq('status', 'actif')
        .order('date_fin', { ascending: true })
        .limit(5);
      if (dataLocs) setLocations(dataLocs);

      // 3. Alertes Conformité Spécifiques (ex: rapports non signés ou anomalies)
      const { data: dataAnomalies } = await supabase
        .from('site_reports')
        .select('*, chantiers(nom)')
        .eq('has_anomalies', true)
        .limit(3);
      if (dataAnomalies) setConformite(dataAnomalies);
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getDaysRemaining = (dateStr: string) => {
    const today = new Date();
    const end = new Date(dateStr);
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full font-['Fredoka']">
      
      {/* TUILE 1 : MATÉRIEL (BESOINS) */}
      <div className="bg-[#0984e3] rounded-[25px] p-5 flex flex-col shadow-sm text-white relative overflow-hidden group">
        <div className="flex justify-between items-start mb-4 z-10">
          <div>
            <h3 className="text-[16px] font-black uppercase leading-none tracking-tighter">Matériel</h3>
            <p className="text-[9px] font-bold opacity-70 mt-1 uppercase tracking-widest">Demandes Achat</p>
          </div>
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md"><ShoppingCart size={18} /></div>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-2 z-10 custom-scrollbar pr-1">
          {besoins.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-40 italic text-[11px]">Aucune commande en attente</div>
          ) : besoins.map((item, i) => (
            <div key={i} className="bg-white/10 hover:bg-white/20 transition-all rounded-xl p-3 border border-white/5">
              <div className="flex justify-between items-start mb-1">
                <p className="font-black text-[12px] uppercase leading-none truncate pr-2">{item.item}</p>
                <AlertTriangle size={12} className="text-yellow-300 shrink-0" />
              </div>
              <div className="flex items-center gap-1 text-[9px] font-bold text-blue-100">
                <MapPin size={10} />
                <span className="uppercase truncate italic">{item.chantiers?.nom || 'Dépôt'}</span>
              </div>
            </div>
          ))}
        </div>
        <Truck className="absolute -right-5 -bottom-5 opacity-10 w-24 h-24 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
      </div>

      {/* TUILE 2 : LOCATIONS (SUIVI) */}
      <div className="bg-[#6c5ce7] rounded-[25px] p-5 flex flex-col shadow-sm text-white overflow-hidden group">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-[16px] font-black uppercase leading-none tracking-tighter">Locations</h3>
            <p className="text-[9px] font-bold opacity-70 mt-1 uppercase tracking-widest">Fin de contrat</p>
          </div>
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md"><CalendarClock size={18} /></div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
          {locations.map((loc, i) => {
            const days = getDaysRemaining(loc.date_fin);
            const isUrgent = days <= 2;
            return (
              <div key={i} className={`rounded-xl p-3 border transition-all ${isUrgent ? 'bg-red-500/80 border-white/20 animate-pulse' : 'bg-white/10 border-white/5 hover:bg-white/20'}`}>
                <div className="flex justify-between items-start mb-1">
                  <p className="font-black text-[12px] uppercase leading-none truncate pr-2">{loc.materiel}</p>
                  <span className="text-[10px] font-black bg-black/20 px-2 py-0.5 rounded-md">{days}j</span>
                </div>
                <div className="flex items-center gap-1 text-[9px] font-bold text-purple-100">
                  <MapPin size={10} />
                  <span className="uppercase truncate italic">{loc.chantiers?.nom}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TUILE 3 : CONFORMITÉ (ALERTES) */}
      <div className={`rounded-[25px] p-5 flex flex-col shadow-sm text-white overflow-hidden transition-all ${alertsCount > 0 ? 'bg-[#d63031]' : 'bg-gray-800'}`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-[16px] font-black uppercase leading-none tracking-tighter">Conformité</h3>
            <p className="text-[9px] font-bold opacity-70 mt-1 uppercase tracking-widest">Alertes critiques</p>
          </div>
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md"><MessageSquareWarning size={18} /></div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
          {/* On affiche en priorité le chiffre global */}
          <div className="flex items-center justify-center py-2 bg-black/10 rounded-2xl mb-3">
             <p className="text-4xl font-black">{alertsCount}</p>
          </div>
          
          {/* Détail des anomalies terrain si elles existent */}
          {conformite.map((conf, i) => (
            <div key={i} className="bg-white/5 rounded-lg p-2 border border-white/5">
               <p className="text-[9px] font-black uppercase leading-none mb-1 text-red-200">Anomalie signalée</p>
               <p className="text-[10px] font-bold italic truncate text-white/80">{conf.chantiers?.nom}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
