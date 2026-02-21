"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, HardHat, AlertTriangle, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import TeamTile from "@/components/TeamTile";
import BudgetHeuresTile from "@/components/BudgetHeuresTile";
import TasksTile from "@/components/TasksTile";
import StaffingTile from "@/components/StaffingTile"; 
import HSETile from "@/components/HSETile"; 
import PointageTile from "@/components/PointageTile"; 

// Hook custom pour détecter le format et adapter le comportement si besoin dans le futur
const useDevice = () => {
  const [device, setDevice] = useState("desktop");

  useEffect(() => {
    const check = () => {
      if (window.innerWidth < 768) setDevice("mobile");
      else if (window.innerWidth < 1280) setDevice("tablet");
      else setDevice("desktop");
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return device;
};

export default function Home() {
  const device = useDevice();
  const [stats, setStats] = useState({ staff: 0, alerts: 0, activeSites: 0, urgentOrders: 0 });

  useEffect(() => {
    async function fetchData() {
      try {
        // OPTIMISATION : On demande à Postgres de compter, sans rapatrier les données (head: true)
        const { count: staffCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });

        const { count: sitesCount } = await supabase
          .from('chantiers')
          .select('*', { count: 'exact', head: true })
          .eq('statut', 'en_cours');
        
        const { count: alertsCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .neq('statut_actuel', 'disponible');

        setStats({
          staff: staffCount || 0,
          alerts: alertsCount || 0,
          activeSites: sitesCount || 0,
          urgentOrders: 3 // Mock en attendant que tu aies une table 'commandes'
        });
      } catch (error) {
        console.error("Erreur de récupération des KPIs dashboard:", error);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="font-['Fredoka'] pb-8 max-w-[1600px] mx-auto">

      {/* Règles d'impression pros BTP */}
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .tile-print { break-inside: avoid; page-break-inside: avoid; margin-bottom: 20px; }
        }
      `}</style>

      {/* 🔝 BANDEAU SYNTHÈSE KPI (Vision Chef d'Entreprise - CLIQUABLES) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 tile-print">
        <Link href="/equipe" className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md hover:scale-[1.02] hover:border-blue-200 transition-all cursor-pointer group">
          <div className="bg-blue-50 p-3 rounded-xl text-blue-500 hidden sm:block group-hover:bg-blue-500 group-hover:text-white transition-colors"><Users size={20}/></div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 group-hover:text-blue-500 transition-colors">Effectif Total</p>
            <p className="text-2xl font-black text-gray-800 leading-none mt-1">{stats.staff} <span className="text-xs text-gray-400 font-bold">Gars</span></p>
          </div>
        </Link>

        <Link href="/chantier" className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md hover:scale-[1.02] hover:border-emerald-200 transition-all cursor-pointer group">
          <div className="bg-emerald-50 p-3 rounded-xl text-emerald-500 hidden sm:block group-hover:bg-emerald-500 group-hover:text-white transition-colors"><HardHat size={20}/></div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 group-hover:text-emerald-500 transition-colors">Chantiers Actifs</p>
            <p className="text-2xl font-black text-gray-800 leading-none mt-1">{stats.activeSites} <span className="text-xs text-gray-400 font-bold">Sites</span></p>
          </div>
        </Link>

        <Link href="/equipe" className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md hover:scale-[1.02] hover:border-red-200 transition-all cursor-pointer group">
          <div className="bg-red-50 p-3 rounded-xl text-red-500 hidden sm:block group-hover:bg-red-500 group-hover:text-white transition-colors"><AlertTriangle size={20}/></div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 group-hover:text-red-500 transition-colors">Alertes RH</p>
            <p className="text-2xl font-black text-red-600 leading-none mt-1">{stats.alerts} <span className="text-xs text-red-400 font-bold">Bloqués</span></p>
          </div>
        </Link>

        <Link href="/materiel" className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md hover:scale-[1.02] hover:border-amber-200 transition-all cursor-pointer group">
          <div className="bg-amber-50 p-3 rounded-xl text-amber-500 hidden sm:block group-hover:bg-amber-500 group-hover:text-white transition-colors"><ShoppingCart size={20}/></div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 group-hover:text-amber-500 transition-colors">Commandes Urgentes</p>
            <p className="text-2xl font-black text-amber-600 leading-none mt-1">{stats.urgentOrders} <span className="text-xs text-amber-400 font-bold">En attente</span></p>
          </div>
        </Link>
      </div>

      {/* 🧱 NOUVELLE GRILLE SELON CROQUIS MANUEL */}
      <div className="flex flex-col xl:grid xl:grid-cols-12 gap-6">

        {/* 1. ACTIONS PRIORITAIRES (Pleine largeur en haut) */}
        <div className="xl:col-span-12 min-h-[350px] tile-print"> 
          <TasksTile />
        </div>

        {/* 2. BLOC GAUCHE (8 colonnes) */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          
          {/* STAFFING TERRAIN */}
          <div className="min-h-[300px] h-fit tile-print">
            <StaffingTile staffCount={stats.staff} />
          </div>

          {/* RÉPARTITIONS & POINTAGES (Cote à cote) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="min-h-[250px] h-fit tile-print">
              <TeamTile isCompact={true} />
            </div>
            <div className="min-h-[250px] h-fit tile-print">
              <PointageTile />
            </div>
          </div>

        </div>

        {/* 3. BLOC DROIT (4 colonnes) - CHANTIERS EN COURS */}
        {/* Prend toute la hauteur disponible à côté du bloc gauche */}
        <div className="xl:col-span-4 min-h-[600px] xl:h-full tile-print">
          <BudgetHeuresTile />
        </div>

        {/* 4. HSE & SÉCURITÉ (Pleine largeur en bas) */}
        <div className="xl:col-span-12 min-h-[300px] h-fit tile-print mt-2">
          <HSETile />
        </div>

      </div>

    </div>
  );
}
