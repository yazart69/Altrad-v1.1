"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ShoppingCart, CalendarClock, MessageSquareWarning, AlertTriangle, Truck } from 'lucide-react';
import Link from 'next/link';

export default function MiddleTiles() {
  const [besoins, setBesoins] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Récupérer les besoins "A commander" (Urgent)
      const { data: dataBesoins } = await supabase
        .from('material_requests')
        .select('*, chantiers(nom)')
        .eq('status', 'a_commander')
        .limit(5); // On affiche les 5 derniers
      if (dataBesoins) setBesoins(dataBesoins);

      // 2. Récupérer les locations qui finissent bientôt (dans les 7 prochains jours)
      // Note: Pour simplifier la requête SQL côté client, on prend tout ce qui est actif et on filtre en JS
      const { data: dataLocs } = await supabase
        .from('rentals')
        .select('*, chantiers(nom)')
        .eq('status', 'actif')
        .order('date_fin', { ascending: true })
        .limit(5);
      if (dataLocs) setLocations(dataLocs);

      // 3. Récupérer les notes récentes
      const { data: dataReports } = await supabase
        .from('site_reports')
        .select('*, chantiers(nom)')
        .order('created_at', { ascending: false })
        .limit(5);
      if (dataReports) setReports(dataReports);
    };

    fetchData();
    
    // Rafraîchir toutes les 30 secondes pour voir les demandes des opérateurs en temps réel
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Utilitaire pour calculer les jours restants
  const getDaysRemaining = (dateStr: string) => {
    const today = new Date();
    const end = new Date(dateStr);
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  };

  return (
    <>
      {/* TUILE 1 : BESOINS & COMMANDES (Bleu/Cyan) */}
      <div className="col-span-4 bg-[#0984e3] rounded-[25px] p-5 flex flex-col shadow-sm text-white font-['Fredoka'] overflow-hidden relative group">
        <div className="flex justify-between items-start mb-3 z-10">
          <div>
            <h3 className="text-[18px] font-black uppercase leading-none">Matériel</h3>
            <p className="text-[11px] opacity-80 mt-1">Demandes terrain</p>
          </div>
          <div className="bg-white/20 p-2 rounded-xl"><ShoppingCart size={20} /></div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 z-10">
          {besoins.length === 0 ? (
            <div className="text-center opacity-60 text-sm mt-4">R.A.S. Stock OK</div>
          ) : (
            besoins.map((item, i) => (
              <div key={i} className="bg-white/10 rounded-lg p-2 flex items-center justify-between">
                <div className="overflow-hidden">
                  <p className="font-bold text-[13px] truncate">{item.item}</p>
                  <p className="text-[10px] opacity-80 truncate">{item.chantiers?.nom || 'Chantier inconnu'}</p>
                </div>
                <AlertTriangle size={16} className="text-yellow-300 shrink-0 ml-2" />
              </div>
            ))
          )}
        </div>
        {/* Effet déco */}
        <Truck className="absolute -right-5 -bottom-5 opacity-10 w-24 h-24 rotate-12" />
      </div>


      {/* TUILE 2 : LOCATIONS (Violet/Rose) */}
      <div className="col-span-4 bg-[#6c5ce7] rounded-[25px] p-5 flex flex-col shadow-sm text-white font-['Fredoka'] overflow-hidden">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-[18px] font-black uppercase leading-none">Locations</h3>
            <p className="text-[11px] opacity-80 mt-1">Retours à prévoir</p>
          </div>
          <div className="bg-white/20 p-2 rounded-xl"><CalendarClock size={20} /></div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
           {locations.length === 0 ? (
            <div className="text-center opacity-60 text-sm mt-4">Aucune location active</div>
          ) : (
            locations.map((loc, i) => {
              const days = getDaysRemaining(loc.date_fin);
              const isUrgent = days <= 2;
              return (
                <div key={i} className={`rounded-lg p-2 flex justify-between items-center ${isUrgent ? 'bg-red-500/80' : 'bg-white/10'}`}>
                  <div className="overflow-hidden">
                     <p className="font-bold text-[13px] truncate">{loc.materiel}</p>
                     <p className="text-[10px] opacity-80 truncate">{loc.chantiers?.nom}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-[14px] font-black">{days}j</p>
                    <p className="text-[9px] uppercase">restants</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>


      {/* TUILE 3 : NOTES CHANTIER (Rouge/Orange) */}
      <div className="col-span-4 bg-[#d63031] rounded-[25px] p-5 flex flex-col shadow-sm text-white font-['Fredoka'] overflow-hidden">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-[18px] font-black uppercase leading-none">Alertes</h3>
            <p className="text-[11px] opacity-80 mt-1">Difficultés signalées</p>
          </div>
          <div className="bg-white/20 p-2 rounded-xl"><MessageSquareWarning size={20} /></div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
          {reports.length === 0 ? (
            <div className="text-center opacity-60 text-sm mt-4">Aucun problème signalé</div>
          ) : (
            reports.map((report, i) => (
              <div key={i} className="bg-black/20 rounded-lg p-2 border-l-4 border-yellow-400">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="font-bold text-[11px] uppercase bg-white/20 px-1 rounded">{report.auteur}</span>
                  <span className="text-[9px] opacity-70">{report.chantiers?.nom?.substring(0, 10)}...</span>
                </div>
                <p className="text-[12px] font-medium leading-tight italic">"{report.message}"</p>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
