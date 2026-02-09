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
    <div className="flex h-screen bg-[#f0f3f4] font-['Fredoka'] overflow-hidden">
      
      {/* ZONE DE CONTENU PRINCIPALE */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        
        {/* GRILLE 12 COLONNES HARMONISÉE */}
        <div className="grid grid-cols-12 gap-6 pb-10">

          {/* --- LIGNE 1 : SYNTHÈSE RH & LOGISTIQUE --- */}
          
          {/* Absences (3 cols) */}
          <div className="col-span-12 xl:col-span-3 h-[320px]">
            <LeavesTile />
          </div>

          {/* Logistique & Matériel (9 cols) */}
          <div className="col-span-12 xl:col-span-9 h-[320px]">
            <MiddleTiles alertsCount={stats.alerts} /> 
          </div>


          {/* --- LIGNE 2 : BUDGET & ACTIONS PRIORITAIRES --- */}

          {/* Suivi Budgétaire (8 cols) */}
          <div className="col-span-12 xl:col-span-8 h-[400px]">
            <BudgetHeuresTile />
          </div>

          {/* Actions Prioritaires (4 cols) */}
          <div className="col-span-12 xl:col-span-4 h-[400px]">
            <TasksTile />
          </div>


          {/* --- LIGNE 3 : OPÉRATIONS TERRAIN --- */}

          {/* Staffing Terrain (4 cols) */}
          <div className="col-span-12 xl:col-span-4 h-[350px]">
            <StaffingTile staffCount={stats.staff} />
          </div>

          {/* Effectif Répartition (2 cols) */}
          <div className="col-span-12 xl:col-span-2 h-[350px]">
            <TeamTile isCompact={true} />
          </div>

          {/* HSE / Démarrage (6 cols) */}
          <div className="col-span-12 xl:col-span-6 h-[350px]">
            <HSETile />
          </div>

        </div>
      </main>
    </div>
  );
}
