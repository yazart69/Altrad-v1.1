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
        
        {/* GRILLE PRINCIPALE : 12 COLONNES */}
        <div className="grid grid-cols-12 gap-6 pb-10">

          {/* === COLONNE DE GAUCHE (CONTENU OPÉRATIONNEL) - SPAN 9 === */}
          <div className="col-span-12 xl:col-span-9 flex flex-col gap-6">

            {/* LIGNE 1 : RH & LOGISTIQUE */}
            <div className="grid grid-cols-12 gap-6 h-[320px]">
              {/* Absences : Élargi à 4 cols pour éviter débordement texte */}
              <div className="col-span-12 md:col-span-4 h-full">
                <LeavesTile />
              </div>
              {/* MiddleTiles : Ajusté à 8 cols */}
              <div className="col-span-12 md:col-span-8 h-full">
                <MiddleTiles alertsCount={stats.alerts} /> 
              </div>
            </div>

            {/* LIGNE 2 : BUDGET (LARGEUR TOTALE GAUCHE) */}
            <div className="w-full h-[400px]">
              <BudgetHeuresTile />
            </div>

            {/* LIGNE 3 : OPÉRATIONS TERRAIN */}
            <div className="grid grid-cols-12 gap-6 h-[350px]">
              {/* Staffing */}
              <div className="col-span-12 md:col-span-4 h-full">
                <StaffingTile staffCount={stats.staff} />
              </div>

              {/* Répartition (Divisée en 2) */}
              <div className="col-span-12 md:col-span-2 h-full flex flex-col gap-4">
                <div className="flex-1 overflow-hidden">
                   <TeamTile isCompact={true} />
                </div>
                <div className="flex-1 bg-white rounded-[25px] shadow-sm border border-gray-100 flex items-center justify-center relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute inset-0 bg-gray-50/50 flex items-center justify-center">
                        <span className="text-[10px] font-black uppercase text-gray-300 tracking-widest group-hover:text-blue-400 transition-colors">
                            Module à venir
                        </span>
                    </div>
                </div>
              </div>

              {/* HSE */}
              <div className="col-span-12 md:col-span-6 h-full">
                <HSETile />
              </div>
            </div>

          </div>

          {/* === COLONNE DE DROITE (ACTIONS PRIORITAIRES) - SPAN 3 === */}
          {/* Cette tuile prend désormais toute la hauteur disponible pour s'aligner avec le bloc de gauche */}
          <div className="col-span-12 xl:col-span-3 h-full min-h-[1118px]"> 
             {/* Note: min-h calculé (320+24+400+24+350) pour alignement parfait même si contenu vide */}
            <TasksTile />
          </div>

        </div>
      </main>
    </div>
  );
}
