"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, HardHat, AlertTriangle, ShoppingCart } from 'lucide-react';
import TeamTile from "@/components/TeamTile";
import BudgetHeuresTile from "@/components/BudgetHeuresTile";
import LeavesTile from "@/components/LeavesTile";
import TasksTile from "@/components/TasksTile";
import StaffingTile from "@/components/StaffingTile"; 
import MiddleTiles from "@/components/MiddleTiles";
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

      {/* 🔝 BANDEAU SYNTHÈSE KPI (Vision Chef d'Entreprise) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 tile-print">
        <div className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-xl text-blue-500 hidden sm:block"><Users size={20}/></div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400">Effectif Total</p>
            <p className="text-2xl font-black text-gray-800 leading-none mt-1">{stats.staff} <span className="text-xs text-gray-400 font-bold">Gars</span></p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-emerald-50 p-3 rounded-xl text-emerald-500 hidden sm:block"><HardHat size={20}/></div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400">Chantiers Actifs</p>
            <p className="text-2xl font-black text-gray-800 leading-none mt-1">{stats.activeSites} <span className="text-xs text-gray-400 font-bold">Sites</span></p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-red-50 p-3 rounded-xl text-red-500 hidden sm:block"><AlertTriangle size={20}/></div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400">Alertes RH</p>
            <p className="text-2xl font-black text-red-600 leading-none mt-1">{stats.alerts} <span className="text-xs text-red-400 font-bold">Bloqués</span></p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-amber-50 p-3 rounded-xl text-amber-500 hidden sm:block"><ShoppingCart size={20}/></div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400">Commandes Urgentes</p>
            <p className="text-2xl font-black text-amber-600 leading-none mt-1">{stats.urgentOrders} <span className="text-xs text-amber-400 font-bold">En attente</span></p>
          </div>
        </div>
      </div>

      {/* 🧱 GRILLE FLATTENED ADAPTATIVE SANS TROUS */}
      <div className="flex flex-col xl:grid xl:grid-cols-12 gap-6 xl:auto-rows-min">

        {/* LIGNE 1 */}
        {/* CONGÉS */}
        <div className="order-6 xl:order-none xl:col-span-4 xl:col-start-1 xl:row-start-1 min-h-[280px] h-fit tile-print">
          <LeavesTile />
        </div>

        {/* ALERTES LOGISTIQUES & MATÉRIEL */}
        <div className="order-1 xl:order-none xl:col-span-5 xl:col-start-5 xl:row-start-1 min-h-[280px] h-fit tile-print">
          <MiddleTiles alertsCount={stats.alerts} /> 
        </div>

        {/* LIGNE 2 (Comble le trou blanc) */}
        {/* STAFFING DU JOUR */}
        <div className="order-3 xl:order-none xl:col-span-3 xl:col-start-1 xl:row-start-2 min-h-[300px] h-fit tile-print">
          <StaffingTile staffCount={stats.staff} />
        </div>

        {/* POINTAGE & ÉQUIPE COMPACTE */}
        <div className="order-7 xl:order-none xl:col-span-2 xl:col-start-4 xl:row-start-2 flex flex-col gap-4 min-h-[300px] h-fit tile-print">
          <div className="flex-1 min-h-[140px]">
              <TeamTile isCompact={true} />
          </div>
          <div className="flex-1 min-h-[140px]">
              <PointageTile />
          </div>
        </div>

        {/* HSE & SÉCURITÉ */}
        <div className="order-4 xl:order-none xl:col-span-4 xl:col-start-6 xl:row-start-2 min-h-[300px] h-fit tile-print">
          <HSETile />
        </div>

        {/* LIGNE 3 */}
        {/* TÂCHES PRIORITAIRES (En bas à gauche, s'étire sur toute la largeur de gauche) */}
        <div className="order-2 xl:order-none xl:col-span-9 xl:col-start-1 xl:row-start-3 min-h-[350px] tile-print"> 
          <TasksTile />
        </div>

        {/* COLONNE DROITE (S'étire sur toute la hauteur) */}
        {/* BUDGET HEURES / CHANTIERS EN COURS */}
        <div className="order-5 xl:order-none xl:col-span-3 xl:col-start-10 xl:row-start-1 xl:row-span-3 min-h-[400px] xl:max-h-[1200px] tile-print">
          <BudgetHeuresTile />
        </div>

      </div>

    </div>
  );
}
