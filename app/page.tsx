"use client";

import React from 'react';
import TeamTile from "@/components/TeamTile";
import BudgetHeuresTile from "@/components/BudgetHeuresTile";
import LeavesTile from "@/components/LeavesTile";
import TasksTile from "@/components/TasksTile";
import StaffingTile from "@/components/StaffingTile"; // On utilise celui-ci maintenant
import MiddleTiles from "@/components/MiddleTiles";

export default function Home() {
  return (
    <div className="h-full w-full p-2 font-['Fredoka']">
      
      {/* GRILLE PRINCIPALE (12 Colonnes) */}
      <div className="grid grid-cols-12 gap-6 h-full">

        {/* --- LIGNE 1 : HAUT (Alertes et Actions) --- */}
        {/* Congés / Absences */}
        <div className="col-span-12 xl:col-span-3 h-[300px]">
          <LeavesTile />
        </div>

        {/* Matériels / Locations / Alertes (Milieu) */}
        <div className="col-span-12 xl:col-span-6 grid grid-cols-1 gap-4 h-[300px]">
          <MiddleTiles /> 
        </div>

        {/* Actions Prioritaires */}
        <div className="col-span-12 xl:col-span-3 h-[300px]">
          <TasksTile />
        </div>


        {/* --- LIGNE 2 : MILIEU (Chantiers et Planning) --- */}
        {/* Chantiers avec barre d'avancement */}
        <div className="col-span-12 xl:col-span-9 h-[400px]">
          <BudgetHeuresTile />
        </div>

        {/* Planning (Aperçu) */}
        <div className="col-span-12 xl:col-span-3 bg-white rounded-[25px] p-6 shadow-sm flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 h-[400px]">
           <p className="font-bold">Planning Semaine</p>
           <p className="text-[10px] uppercase font-black tracking-widest mt-2 text-blue-400 animate-pulse italic">Construction en cours...</p>
        </div>


        {/* --- LIGNE 3 : BAS (Performance et Staff) --- */}
        {/* Staffing Temps Réel (Ton Idée 1) */}
        <div className="col-span-12 xl:col-span-4 h-[350px]">
          <StaffingTile />
        </div>

        {/* Équipe / Stats (TeamTile) */}
        <div className="col-span-12 xl:col-span-4 h-[350px]">
          <TeamTile />
        </div>

        {/* News / Sécurité (Dernière Tuile) */}
        <div className="col-span-12 xl:col-span-4 bg-[#2d3436] rounded-[25px] p-6 shadow-sm text-white h-[350px] relative overflow-hidden">
           <div className="relative z-10">
             <h2 className="text-xl font-black uppercase mb-4 text-[#ff9f43]">Sécurité & Flash</h2>
             <div className="bg-white/10 p-4 rounded-xl border border-white/10 mb-3">
                <p className="text-sm font-bold">⚠️ Point Sécurité Hebdo :</p>
                <p className="text-xs opacity-70 mt-1">Vérification systématique des harnais avant toute montée en nacelle.</p>
             </div>
             <div className="bg-[#00b894]/20 p-4 rounded-xl border border-[#00b894]/30">
                <p className="text-[#00b894] text-xs font-bold uppercase tracking-wider">Objectif Zéro Accident</p>
             </div>
           </div>
           {/* Déco fond */}
           <div className="absolute -right-10 -bottom-10 opacity-5 rotate-12">
              <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
           </div>
        </div>

      </div>
    </div>
  );
}
