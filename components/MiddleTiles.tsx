"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ShoppingCart, CalendarClock, MessageSquareWarning, MapPin, AlertTriangle, Truck, FileX } from 'lucide-react';

interface MiddleTilesProps {
  alertsCount?: number;
}

export default function MiddleTiles({ alertsCount = 0 }: MiddleTilesProps) {
  const [besoins, setBesoins] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [odmAlerts, setOdmAlerts] = useState(0);

  const fetchData = async () => {
    // 1. Besoins Matériel
    const { data: b } = await supabase.from('material_requests').select('*, chantiers(nom)').eq('status', 'a_commander').limit(5);
    setBesoins(b || []);

    // 2. Locations Actives
    const { data: l } = await supabase.from('rentals').select('*, chantiers(nom)').eq('status', 'actif').limit(5);
    setLocations(l || []);

    // 3. Scan ODM manquants
    const { data: o } = await supabase.from('planning').select('id').eq('type', 'chantier').eq('odm_envoye', false);
    setOdmAlerts(o?.length || 0);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const totalConformite = alertsCount + odmAlerts;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full font-['Fredoka']">
      
      {/* TUILE 1 : MATÉRIEL */}
      <div className="bg-[#0984e3] rounded-[25px] p-5 text-white relative overflow-hidden flex flex-col shadow-lg border border-white/10">
        <div className="flex justify-between items-start mb-4 z-10">
          <div>
            <h3 className="font-black uppercase text-sm leading-none">Matériel</h3>
            <p className="text-[9px] font-bold opacity-60 uppercase mt-1">Achats / Stock</p>
          </div>
          <ShoppingCart size={18} className="opacity-40" />
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar z-10">
          {besoins.map((item, i) => (
            <div key={i} className="bg-white/10 p-2 rounded-xl border border-white/5 backdrop-blur-sm">
              <p className="font-black text-[11px] uppercase truncate">{item.item}</p>
              <p className="text-[8px] font-bold opacity-70 flex items-center gap-1 uppercase mt-1 italic">
                <MapPin size={8}/> {item.chantiers?.nom || 'Dépôt'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* TUILE 2 : LOCATIONS */}
      <div className="bg-[#6c5ce7] rounded-[25px] p-5 text-white flex flex-col shadow-lg border border-white/10">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-black uppercase text-sm leading-none">Locations</h3>
            <p className="text-[9px] font-bold opacity-60 uppercase mt-1">Retours / Fin</p>
          </div>
          <CalendarClock size={18} className="opacity-40" />
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
          {locations.map((loc, i) => (
            <div key={i} className="bg-white/10 p-2 rounded-xl border border-white/5 flex flex-col">
              <p className="font-black text-[11px] uppercase truncate">{loc.materiel}</p>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[8px] font-bold opacity-70 italic"><MapPin size={8} className="inline"/> {loc.chantiers?.nom}</span>
                <span className="text-[10px] font-black bg-white/20 px-2 rounded-lg">Actif</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TUILE 3 : CONFORMITÉ (DYNAMIQUE) */}
      <div className={`rounded-[25px] p-5 text-white flex flex-col transition-all duration-500 shadow-lg border border-white/10 ${totalConformite > 0 ? 'bg-[#d63031] animate-pulse' : 'bg-gray-800'}`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-black uppercase text-sm leading-none">Conformité</h3>
            <p className="text-[9px] font-bold opacity-60 uppercase mt-1 italic tracking-widest">Alertes Sécurité</p>
          </div>
          <MessageSquareWarning size={18} />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-5xl font-black">{totalConformite}</p>
          {odmAlerts > 0 && (
            <div className="mt-3 flex items-center gap-2 bg-black/20 px-4 py-2 rounded-2xl border border-white/10">
              <FileX size={14} className="text-red-200" />
              <p className="text-[9px] font-black uppercase tracking-tighter">{odmAlerts} ODM à envoyer</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
