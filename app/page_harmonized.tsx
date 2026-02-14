"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import TeamTile from "@/components/TeamTile";
import BudgetHeuresTile from "@/components/BudgetHeuresTile";
import LeavesTile from "@/components/LeavesTile";
import TasksTile from "@/components/TasksTile";
import StaffingTile from "@/components/StaffingTile"; 
import MiddleTiles from "@/components/MiddleTiles";
import HSETile from "@/components/HSETile"; 
import PointageTile from "@/components/PointageTile";
import CalendarTile from "@/components/CalendarTile";
import StatsTile from "@/components/StatsTile";
import EventsListTile from "@/components/EventsListTile";

export default function Home() {
  const [stats, setStats] = useState({ staff: 0, alerts: 0, activeSites: 0 });

  useEffect(() => {
    async function fetchData() {
      const { data: staff } = await supabase.from('users').select('*');
      const { data: sites } = await supabase.from('chantiers').select('*').eq('statut', 'en_cours');
      
      const alerts = staff?.filter((e: any) => {
        return e.statut_actuel !== 'disponible';
      }).length || 0;

      setStats({
        staff: staff?.length || 0,
        alerts: alerts,
        activeSites: sites?.length || 0
      });
    }
    fetchData();
  }, []);

  return (
    <div className="font-['Fredoka'] pb-4 space-y-6">
      
      {/* ============================================
          SECTION 1 : BARRE ÉVÉNEMENTS (Top Banner)
          ============================================ */}
      <div className="w-full">
        <EventsListTile />
      </div>

      {/* ============================================
          SECTION 2 : GRILLE PRINCIPALE
          ============================================ */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* COLONNE GAUCHE (9 cols sur desktop) */}
        <div className="xl:col-span-9 flex flex-col gap-6">
          
          {/* Ligne 1 : Stats Graphique + Calendar */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-6 xl:h-[350px]">
            
            {/* StatsTile (Graphique tendance) */}
            <div className="xl:col-span-6 h-[300px] xl:h-full">
              <StatsTile />
            </div>
            
            {/* CalendarTile (Planning semaine) */}
            <div className="xl:col-span-6 h-[300px] xl:h-full">
              <CalendarTile />
            </div>
          </div>

          {/* Ligne 2 : RH & Logistique */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-6 xl:h-[320px]">
            
            {/* LeavesTile (Congés) */}
            <div className="xl:col-span-4 h-[300px] md:h-full">
              <LeavesTile />
            </div>
            
            {/* MiddleTiles (Matériel/Alertes) */}
            <div className="xl:col-span-8 h-[300px] md:h-full">
              <MiddleTiles alertsCount={stats.alerts} /> 
            </div>
          </div>

          {/* Ligne 3 : Budget Heures Chantiers */}
          <div className="w-full h-[350px] md:h-[400px]">
            <BudgetHeuresTile />
          </div>

        </div>

        {/* COLONNE DROITE (3 cols sur desktop) */}
        <div className="xl:col-span-3 h-[400px] xl:h-[1054px]">
          <TasksTile />
        </div>

      </div>


      {/* ============================================
          SECTION 3 : BLOC OPÉRATIONS (Bas du dashboard)
          ============================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-6 xl:h-[350px]">
        
        {/* Staffing Terrain */}
        <div className="xl:col-span-4 h-[300px] xl:h-full">
          <StaffingTile staffCount={stats.staff} />
        </div>

        {/* Mini-Tuiles empilées (Répartition + Pointage) */}
        <div className="xl:col-span-2 flex flex-col gap-4 h-full min-h-[300px]">
          <div className="flex-1 overflow-hidden min-h-[140px]">
            <TeamTile isCompact={true} />
          </div>
          <div className="flex-1 overflow-hidden min-h-[140px]">
            <PointageTile />
          </div>
        </div>

        {/* HSE & Sécurité */}
        <div className="xl:col-span-6 h-[300px] xl:h-full">
          <HSETile />
        </div>

      </div>

    </div>
  );
}
