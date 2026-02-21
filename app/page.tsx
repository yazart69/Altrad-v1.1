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

export default function Home() {
  const [stats, setStats] = useState({ staff: 0, alerts: 0, activeSites: 0 });

  useEffect(() => {
    async function fetchData() {
      // Utilisation de .select('*', { count: 'exact' }) pour être plus performant si la table est grande
      const { data: staff, error: staffError } = await supabase.from('users').select('*');
      const { data: sites, error: sitesError } = await supabase.from('chantiers').select('*').eq('statut', 'en_cours');
      
      if (staffError || sitesError) {
        console.error("Erreur de récupération des stats dashboard:", staffError || sitesError);
        return;
      }

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
    <div className="font-['Fredoka'] pb-4">
      
      {/* CONTENEUR RESPONSIVE : 
          - Mobile : Flex Vertical (col)
          - Desktop : Grid complexe
      */}
      <div className="flex flex-col xl:grid xl:grid-cols-12 gap-6">

        {/* --- BLOC PRINCIPAL (GAUCHE sur PC, HAUT sur Mobile) --- */}
        <div className="xl:col-span-9 flex flex-col gap-6">
          
          {/* LIGNE 1 : RH & LOGISTIQUE */}
          {/* Mobile : Stack vertical | Tablette : Grid 2 cols | PC : Grid 12 cols */}
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

          {/* LIGNE 2 : BUDGET */}
          <div className="w-full h-[350px] md:h-[400px]">
            <BudgetHeuresTile />
          </div>

        </div>

        {/* --- BLOC SECONDAIRE (DROITE sur PC, MILIEU sur Mobile) --- */}
        {/* Tasks (Tâches Prioritaires) */}
        <div className="xl:col-span-3 h-[400px] xl:h-[744px]"> 
          <TasksTile />
        </div>

      </div>


      {/* --- BLOC INFÉRIEUR (OPÉRATIONS) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-6 mt-6 xl:h-[350px]">
        
        {/* Staffing */}
        <div className="xl:col-span-4 h-[300px] xl:h-full">
          <StaffingTile staffCount={stats.staff} />
        </div>

        {/* Répartition & Pointage (Empilés sur mobile/PC, côte à côte sur tablette ?) */}
        {/* Ici on garde l'empilement vertical interne pour la cohérence */}
        <div className="xl:col-span-2 h-full flex flex-col gap-4 min-h-[300px]">
          <div className="flex-1 overflow-hidden h-[140px] xl:h-auto">
              <TeamTile isCompact={true} />
          </div>
          <div className="flex-1 overflow-hidden h-[140px] xl:h-auto">
              <PointageTile />
          </div>
        </div>

        {/* HSE (Sécurité) */}
        <div className="xl:col-span-6 h-[300px] xl:h-full">
          <HSETile />
        </div>

      </div>

    </div>
  );
}
