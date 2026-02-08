"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ShoppingCart, CalendarClock, MessageSquareWarning, AlertTriangle, Truck } from 'lucide-react';

interface MiddleTilesProps {
  alertsCount?: number;
}

export default function MiddleTiles({ alertsCount = 0 }: MiddleTilesProps) {
  const [besoins, setBesoins] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: dataBesoins } = await supabase.from('material_requests').select('*, chantiers(nom)').eq('status', 'a_commander').limit(5);
      if (dataBesoins) setBesoins(dataBesoins);

      const { data: dataLocs } = await supabase.from('rentals').select('*, chantiers(nom)').eq('status', 'actif').order('date_fin', { ascending: true }).limit(5);
      if (dataLocs) setLocations(dataLocs);

      const { data: dataReports } = await supabase.from('site_reports').select('*, chantiers(nom)').order('created_at', { ascending: false }).limit(5);
      if (dataReports) setReports(dataReports);
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
      {/* TUILE 1 : MATÉRIEL */}
      <div className="bg-[#0984e3] rounded-[25px] p-5 flex flex-col shadow-sm text-white relative overflow-hidden group">
        <div className="flex justify-between items-start mb-3 z-10">
          <div>
            <h3 className="text-[18px] font-black uppercase leading-none">Matériel</h3>
            <p className="text-[11px] opacity-80 mt-1">Demandes terrain</p>
          </div>
          <div className="bg-white/20 p-2 rounded-xl"><ShoppingCart size={20} /></div>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 z-10 custom-scrollbar">
          {besoins.length === 0 ? <div className="text-center opacity-60 text-sm mt-4">R.A.S. Stock OK</div> : besoins.map((item, i) => (
            <div key={i} className="bg-white/10 rounded-lg p-2 flex items-center justify-between animate-in fade-in slide-in-from-bottom-1">
              <div className="overflow-hidden"><p className="font-bold text-[13px] truncate">{item.item}</p></div>
              <AlertTriangle size={16} className="text-yellow-300 shrink-0 ml-2" />
            </div>
          ))}
        </div>
        <Truck className="absolute -right-5 -bottom-5 opacity-10 w-24 h-24 rotate-12" />
      </div>

      {/* TUILE 2 : LOCATIONS */}
      <div className="bg-[#6c5ce7] rounded-[25px] p-5 flex flex-col shadow-sm text-white overflow-hidden">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-[18px] font-black uppercase leading-none">Locations</h3>
            <p className="text-[11px] opacity-80 mt-1">Retours à prévoir</p>
          </div>
          <div className="bg-white/20 p-2 rounded-xl"><CalendarClock size={20} /></div>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
          {locations.map((loc, i) => {
            const days = getDaysRemaining(loc.date_fin);
            return (
              <div key={i} className={`rounded-lg p-2 flex justify-between items-center ${days <= 2 ? 'bg-red-500/80' : 'bg-white/10'}`}>
                <div className="overflow-hidden"><p className="font-bold text-[13px] truncate">{loc.materiel}</p></div>
                <div className="text-right shrink-0 ml-2"><p className="text-[14px] font-black">{days}j</p></div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TUILE 3 : ALERTES RH & CONFORMITÉ (Intègre les alertes du Dashboard) */}
      <div className={`rounded-[25px] p-5 flex flex-col shadow-sm text-white overflow-hidden transition-all ${alertsCount > 0 ? 'bg-[#d63031] animate-pulse' : 'bg-gray-800'}`}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-[18px] font-black uppercase leading-none">Conformité</h3>
            <p className="text-[11px] opacity-80 mt-1">{alertsCount} alertes détectées</p>
          </div>
          <div className="bg-white/20 p-2 rounded-xl"><MessageSquareWarning size={20} /></div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-4xl font-black">{alertsCount}</p>
        </div>
      </div>
    </div>
  );
}
