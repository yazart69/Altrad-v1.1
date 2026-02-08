"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ShoppingCart, CalendarClock, MessageSquareWarning, MapPin, AlertTriangle, Truck, FileX } from 'lucide-react';

export default function MiddleTiles({ alertsCount = 0 }) {
  const [besoins, setBesoins] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [odmAlerts, setOdmAlerts] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Besoins Matériel
      const { data: b } = await supabase.from('material_requests').select('*, chantiers(nom)').eq('status', 'a_commander');
      setBesoins(b || []);

      // 2. Locations Actives
      const { data: l } = await supabase.from('rentals').select('*, chantiers(nom)').eq('status', 'actif');
      setLocations(l || []);

      // 3. Scan des ODM Non Envoyés (Conformité)
      const { data: o } = await supabase.from('planning').select('id').eq('type', 'chantier').eq('odm_envoye', false);
      setOdmAlerts(o?.length || 0);
    };
    fetchData();
  }, []);

  const totalConformite = alertsCount + odmAlerts;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full font-['Fredoka']">
      
      {/* TUILE 1 : MATÉRIEL */}
      <div className="bg-[#0984e3] rounded-[25px] p-5 text-white relative overflow-hidden flex flex-col">
        <div className="flex justify-between items-start mb-4 z-10">
          <div><h3 className="font-black uppercase text-sm leading-none">Matériel</h3><p className="text-[9px] font-bold opacity-60 uppercase mt-1">Achats terrain</p></div>
          <ShoppingCart size={18} className="opacity-40" />
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar z-10">
          {besoins.map((item, i) => (
            <div key={i} className="bg-white/10 p-2 rounded-xl border border-white/5">
              <p className="font-black text-[11px] uppercase truncate">{item.item}</p>
              <p className="text-[8px] font-bold opacity-70 flex items-center gap-1 uppercase mt-1"><MapPin size={8}/> {item.chantiers?.nom}</p>
            </div>
          ))}
        </div>
      </div>

      {/* TUILE 2 : LOCATIONS */}
      <div className="bg-[#6c5ce7] rounded-[25px] p-5 text-white flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div><h3 className="font-black uppercase text-sm leading-none">Locations</h3><p className="text-[9px] font-bold opacity-60 uppercase mt-1">Suivi retours</p></div>
          <CalendarClock size={18} className="opacity-40" />
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
          {locations.map((loc, i) => (
            <div key={i} className="bg-white/10 p-2 rounded-xl border border-white/5 flex justify-between items-center">
              <div className="overflow-hidden">
                <p className="font-black text-[11px] uppercase truncate">{loc.materiel}</p>
                <p className="text-[8px] font-bold opacity-70 flex items-center gap-1 uppercase mt-1"><MapPin size={8}/> {loc.chantiers?.nom}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TUILE 3 : CONFORMITÉ (DYNAMIQUE) */}
      <div className={`rounded-[25px] p-5 text-white flex flex-col transition-all duration-500 ${totalConformite > 0 ? 'bg-[#d63031] animate-pulse' : 'bg-gray-800'}`}>
        <div className="flex justify-between items-start mb-4">
          <div><h3 className="font-black uppercase text-sm leading-none">Conformité</h3><p className="text-[9px] font-bold opacity-60 uppercase mt-1">Alertes Sécurité</p></div>
          <MessageSquareWarning size={18} />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-4xl font-black">{totalConformite}</p>
          {odmAlerts > 0 && (
            <div className="mt-3 flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full border border-white/10">
              <FileX size={12} className="text-red-200" />
              <p className="text-[9px] font-black uppercase">{odmAlerts} ODM en attente</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
