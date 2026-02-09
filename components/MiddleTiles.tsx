"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ShoppingCart, CalendarClock, MessageSquareWarning, MapPin, AlertTriangle, Truck, FileX, ShieldAlert, ArrowUpRight } from 'lucide-react';

interface MiddleTilesProps {
  alertsCount?: number; // Alertes RH (CACES, Dossiers)
}

export default function MiddleTiles({ alertsCount = 0 }: MiddleTilesProps) {
  const [besoins, setBesoins] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [odmAlerts, setOdmAlerts] = useState(0);
  const [siteAnomalies, setSiteAnomalies] = useState<any[]>([]);

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

    // 4. Scan des Anomalies de Chantier (SQL site_reports)
    const { data: s } = await supabase.from('site_reports').select('*, chantiers(nom)').eq('has_anomalies', true).order('created_at', { ascending: false }).limit(2);
    setSiteAnomalies(s || []);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const totalConformite = alertsCount + odmAlerts + siteAnomalies.length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full font-['Fredoka']">
      
      {/* TUILE 1 : MATÉRIEL -> Link vers /materiel */}
      <Link href="/materiel" className="block h-full">
        <div className="bg-[#0984e3] rounded-[25px] p-5 text-white relative overflow-hidden flex flex-col shadow-lg border border-white/10 group h-full hover:scale-[1.02] transition-transform duration-300">
          <div className="flex justify-between items-start mb-4 z-10">
            <div>
              <h3 className="font-black uppercase text-sm leading-none italic">Matériel</h3>
              <p className="text-[9px] font-bold opacity-60 uppercase mt-1">Achats / Stock</p>
            </div>
            <div className="flex items-center gap-2">
               <ShoppingCart size={18} className="opacity-40 group-hover:opacity-0 transition-opacity" />
               <div className="bg-white/20 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-4">
                 <ArrowUpRight size={14} />
               </div>
            </div>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar z-10">
            {besoins.map((item, i) => (
              <div key={i} className="bg-white/10 p-2 rounded-xl border border-white/5 backdrop-blur-sm hover:bg-white/20 transition-all">
                <p className="font-black text-[11px] uppercase truncate">{item.item}</p>
                <p className="text-[8px] font-bold opacity-70 flex items-center gap-1 uppercase mt-1">
                  <MapPin size={8}/> {item.chantiers?.nom || 'Dépôt'}
                </p>
              </div>
            ))}
             {besoins.length === 0 && <p className="text-[9px] opacity-50 text-center mt-4">Aucune commande en attente</p>}
          </div>
          <Truck className="absolute -right-4 -bottom-4 opacity-10 w-20 h-20 rotate-12 group-hover:rotate-0 transition-transform duration-500" />
        </div>
      </Link>

      {/* TUILE 2 : LOCATIONS -> Link vers /materiel */}
      <Link href="/materiel" className="block h-full">
        <div className="bg-[#6c5ce7] rounded-[25px] p-5 text-white flex flex-col shadow-lg border border-white/10 group h-full hover:scale-[1.02] transition-transform duration-300 relative overflow-hidden">
          <div className="flex justify-between items-start mb-4 z-10">
            <div>
              <h3 className="font-black uppercase text-sm leading-none italic">Locations</h3>
              <p className="text-[9px] font-bold opacity-60 uppercase mt-1">Suivi Retours</p>
            </div>
            <div className="flex items-center gap-2">
               <CalendarClock size={18} className="opacity-40 group-hover:opacity-0 transition-opacity" />
               <div className="bg-white/20 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-4">
                 <ArrowUpRight size={14} />
               </div>
            </div>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar z-10">
            {locations.map((loc, i) => (
              <div key={i} className="bg-white/10 p-2 rounded-xl border border-white/5 flex flex-col hover:bg-white/20 transition-all">
                <p className="font-black text-[11px] uppercase truncate">{loc.materiel}</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[8px] font-bold opacity-70 italic"><MapPin size={8} className="inline"/> {loc.chantiers?.nom}</span>
                  <span className="text-[10px] font-black bg-white/20 px-2 rounded-lg">Actif</span>
                </div>
              </div>
            ))}
            {locations.length === 0 && <p className="text-[9px] opacity-50 text-center mt-4">Aucune location active</p>}
          </div>
        </div>
      </Link>

      {/* TUILE 3 : CONFORMITÉ -> Link vers /hse */}
      <Link href="/hse" className="block h-full">
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
            {/* Score Global */}
            <div className="flex items-center justify-center py-2 bg-black/20 rounded-2xl group-hover:bg-black/30 transition-colors">
              <p className="text-4xl font-black">{totalConformite}</p>
            </div>

            {/* Alertes ODM */}
            {odmAlerts > 0 && (
              <div className="flex items-center gap-2 bg-black/20 px-3 py-2 rounded-xl border border-white/10">
                <FileX size={14} className="text-red-200" />
                <p className="text-[9px] font-black uppercase tracking-tighter">{odmAlerts} ODM non envoyés</p>
              </div>
            )}

            {/* Détail des Anomalies Terrain (SYNCHRO SQL) */}
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
           {/* Animation pulsation si alerte */}
           {totalConformite > 0 && (
             <div className="absolute inset-0 bg-red-500/20 animate-pulse pointer-events-none" />
           )}
        </div>
      </Link>

    </div>
  );
}
