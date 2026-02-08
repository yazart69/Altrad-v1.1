"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import TeamTile from "@/components/TeamTile";
import BudgetHeuresTile from "@/components/BudgetHeuresTile";
import LeavesTile from "@/components/LeavesTile";
import TasksTile from "@/components/TasksTile";
import StaffingTile from "@/components/StaffingTile"; 
import MiddleTiles from "@/components/MiddleTiles";
import Link from 'next/link';
import { PlayCircle, ClipboardCheck } from 'lucide-react';

export default function Home() {
  const [stats, setStats] = useState({ staff: 0, alerts: 0, activeSites: 0 });

  useEffect(() => {
    async function fetchData() {
      // 1. Récupération des effectifs et calcul des alertes réelles (Dossiers ou CACES)
      const { data: staff } = await supabase.from('employes').select('*');
      const { data: sites } = await supabase.from('chantiers').select('*').eq('statut', 'en_cours');
      
      const alerts = staff?.filter(e => {
        const hasExpiredCaces = e.habilitations_json?.some((h:any) => h.exp && new Date(h.exp) < new Date());
        return !e.dossier_complet || hasExpiredCaces;
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
    <div className="h-full w-full p-2 font-['Fredoka']">
      
      {/* GRILLE PRINCIPALE (12 Colonnes) */}
      <div className="grid grid-cols-12 gap-6 h-full">

        {/* --- LIGNE 1 : HAUT (Alertes et Actions) --- */}
        {/* Congés / Absences - Synchronisé via composant interne */}
        <div className="col-span-12 xl:col-span-3 h-[300px]">
          <LeavesTile />
        </div>

        {/* Matériels / Locations / Alertes (Milieu) */}
        <div className="col-span-12 xl:col-span-6 grid grid-cols-1 gap-4 h-[300px]">
          <MiddleTiles alertsCount={stats.alerts} /> 
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

        {/* Planning (Aperçu) - On garde le design, on ajoute le lien */}
        <Link href="/planning" className="col-span-12 xl:col-span-3 bg-white rounded-[25px] p-6 shadow-sm flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 h-[400px] hover:border-blue-200 transition-colors">
            <p className="font-bold">Planning Semaine</p>
            <p className="text-[10px] uppercase font-black tracking-widest mt-2 text-blue-400 italic">Accéder au planning complet →</p>
        </Link>


        {/* --- LIGNE 3 : BAS (Performance et Staff) --- */}
        {/* Staffing Temps Réel */}
        <div className="col-span-12 xl:col-span-4 h-[350px]">
          <StaffingTile staffCount={stats.staff} />
        </div>

        {/* Équipe / Stats (TeamTile) */}
        <div className="col-span-12 xl:col-span-4 h-[350px]">
          <TeamTile />
        </div>

        {/* News / Sécurité + DÉMARRAGE CHANTIER (Dernière Tuile) */}
        <div className="col-span-12 xl:col-span-4 bg-[#2d3436] rounded-[25px] p-6 shadow-sm text-white h-[350px] relative overflow-hidden group">
           <div className="relative z-10 flex flex-col h-full justify-between">
             <div>
               <h2 className="text-xl font-black uppercase mb-4 text-[#ff9f43]">Démarrage Chantier</h2>
               <div className="bg-white/10 p-4 rounded-xl border border-white/10 mb-3">
                  <p className="text-xs font-bold opacity-80 leading-relaxed">
                    Cliquez ici pour lancer le formulaire de démarrage site et les signatures.
                  </p>
               </div>
             </div>

             <Link href="/demarrage" className="bg-[#ff9f43] text-black w-full py-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-white transition-all">
                <PlayCircle size={18} /> Lancer l'ouverture
             </Link>
           </div>
           {/* Déco fond */}
           <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-500">
              <ClipboardCheck size={180} />
           </div>
        </div>

      </div>
    </div>
  );
}
