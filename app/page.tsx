"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, HardHat, AlertTriangle, ShoppingCart, 
  TrendingUp, Clock, CheckCircle2, Loader2, Printer, 
  Activity, BarChart3, ShieldAlert
} from 'lucide-react';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

// Import des tuiles spécialisées
import TeamTile from "@/components/TeamTile";
import BudgetHeuresTile from "@/components/BudgetHeuresTile";
import TasksTile from "@/components/TasksTile";
import StaffingTile from "@/components/StaffingTile"; 
import HSETile from "@/components/HSETile"; 
import PointageTile from "@/components/PointageTile"; 

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    staff: 0,
    activeSites: 0,
    alertsRH: 0,
    urgentOrders: 0,
    occupancyRate: 0
  });

  useEffect(() => {
    async function fetchDashboardKPIs() {
      setLoading(true);
      try {
        // 1. Compte des employés (Table 'employes' corrigée)
        const { count: staffCount } = await supabase
          .from('employes')
          .select('*', { count: 'exact', head: true });

        // 2. Chantiers actifs
        const { count: sitesCount } = await supabase
          .from('chantiers')
          .select('*', { count: 'exact', head: true })
          .eq('statut', 'en_cours');
        
        // 3. Alertes RH (Ceux qui ne sont pas 'disponibles' : Congés, Maladie, etc.)
        const { count: alertsCount } = await supabase
          .from('employes')
          .select('*', { count: 'exact', head: true })
          .not('statut_actuel', 'eq', 'disponible');

        // 4. Calcul du taux d'occupation (Basé sur le planning actuel)
        const today = new Date().toISOString().split('T')[0];
        const { data: currentStaffing } = await supabase
          .from('planning')
          .select('employe_id', { count: 'exact' })
          .eq('date_debut', today)
          .not('chantier_id', 'is', null);

        const activeToday = currentStaffing?.length || 0;
        const rate = staffCount ? Math.round((activeToday / staffCount) * 100) : 0;

        setStats({
          staff: staffCount || 0,
          activeSites: sitesCount || 0,
          alertsRH: alertsCount || 0,
          urgentOrders: 2, // Mock - À lier à ta table matériel/commandes plus tard
          occupancyRate: rate
        });
      } catch (error) {
        console.error("Erreur Dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardKPIs();
  }, []);

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4 text-gray-400">
        <Loader2 className="animate-spin text-[#00b894]" size={40} />
        <p className="font-black uppercase text-xs tracking-widest">Synchronisation des données...</p>
      </div>
    );
  }

  return (
    <div className="font-['Fredoka'] pb-12 max-w-[1600px] mx-auto px-4 md:px-6 print-document">
      <Toaster position="bottom-right" />

      {/* RÈGLES D'IMPRESSION RIGOUREUSES (Même logique que planning de charge) */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          header, nav, aside, .no-print, button { display: none !important; }
          html, body { height: auto !important; overflow: visible !important; background: white !important; }
          .print-document { display: block !important; position: static !important; height: auto !important; overflow: visible !important; }
          .tile-print { break-inside: avoid; page-break-inside: avoid; margin-bottom: 30px; border: 2px solid #eee !important; border-radius: 20px !important; }
          .grid { display: block !important; }
          .grid-cols-2, .grid-cols-4, .xl\\:grid-cols-12 { display: block !important; }
          div[class*="col-span"] { width: 100% !important; margin-bottom: 20px; }
          @page { size: portrait; margin: 15mm; }
        }
      `}} />

      {/* 🔝 BANDEAU ACTIONS RAPIDES (Caché en impression) */}
      <div className="flex justify-between items-center mb-8 no-print">
        <div>
          <h1 className="text-3xl font-black uppercase text-[#2d3436] tracking-tighter">
            Pilotage <span className="text-[#00b894]">Global</span>
          </h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Dimanche 22 Février 2026 — Semaine 08</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => window.print()} className="p-3 bg-white border border-gray-200 rounded-2xl text-gray-400 hover:text-black transition-all shadow-sm">
            <Printer size={20} />
          </button>
          <Link href="/pointage" className="bg-[#2d3436] text-white px-6 py-3 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-black transition-all flex items-center gap-2">
             <Clock size={18}/> Pointage Rapide
          </Link>
        </div>
      </div>

      {/* 📊 KPI CARDS - Vision Direction */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 tile-print">
        <Link href="/equipe" className="bg-white p-5 rounded-[30px] shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden relative">
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase text-gray-400 group-hover:text-blue-500 transition-colors tracking-widest">Effectif Global</p>
            <p className="text-3xl font-black text-gray-800 mt-1">{stats.staff}</p>
            <div className="flex items-center gap-1 mt-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00b894] animate-pulse"></div>
                <span className="text-[9px] font-black text-[#00b894] uppercase">{stats.occupancyRate}% d'activité</span>
            </div>
          </div>
          <Users className="text-gray-50 absolute -right-4 -bottom-4 group-hover:text-blue-50 transition-colors" size={100} />
        </Link>

        <Link href="/chantier" className="bg-white p-5 rounded-[30px] shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden relative">
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase text-gray-400 group-hover:text-emerald-500 transition-colors tracking-widest">Sites Ouverts</p>
            <p className="text-3xl font-black text-gray-800 mt-1">{stats.activeSites}</p>
            <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full mt-2 inline-block">Production active</span>
          </div>
          <HardHat className="text-gray-50 absolute -right-4 -bottom-4 group-hover:text-emerald-50 transition-colors" size={100} />
        </Link>

        <Link href="/equipe" className="bg-white p-5 rounded-[30px] shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden relative">
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase text-gray-400 group-hover:text-red-500 transition-colors tracking-widest">Absences / RH</p>
            <p className="text-3xl font-black text-red-600 mt-1">{stats.alertsRH}</p>
            <span className="text-[9px] font-black text-red-400 flex items-center gap-1 mt-2 uppercase"><ShieldAlert size={10}/> À vérifier</span>
          </div>
          <AlertTriangle className="text-gray-50 absolute -right-4 -bottom-4 group-hover:text-red-50 transition-colors" size={100} />
        </Link>

        <Link href="/magasinier" className="bg-white p-5 rounded-[30px] shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden relative">
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase text-gray-400 group-hover:text-amber-500 transition-colors tracking-widest">Commandes Mat.</p>
            <p className="text-3xl font-black text-amber-600 mt-1">{stats.urgentOrders}</p>
            <span className="text-[9px] font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full mt-2 inline-block">Attente validation</span>
          </div>
          <ShoppingCart className="text-gray-50 absolute -right-4 -bottom-4 group-hover:text-amber-50 transition-colors" size={100} />
        </Link>
      </div>

      {/* 🧱 GRILLE PRINCIPALE (Basée sur ta structure manuelle) */}
      <div className="flex flex-col xl:grid xl:grid-cols-12 gap-8">

        {/* 1. ACTIONS PRIORITAIRES (Planning des tâches hebdo) */}
        <div className="xl:col-span-12 tile-print"> 
          <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 h-full">
             <TasksTile />
          </div>
        </div>

        {/* 2. BLOC GAUCHE (Vision Staffing & Équipe) */}
        <div className="xl:col-span-8 flex flex-col gap-8">
          
          <div className="tile-print bg-white rounded-[40px] p-8 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
                <Activity className="text-[#00b894]" size={24}/>
                <h3 className="font-black uppercase text-lg text-gray-800">Staffing Terrain Temps Réel</h3>
            </div>
            <StaffingTile staffCount={stats.staff} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="tile-print bg-white rounded-[40px] p-8 shadow-sm border border-gray-100">
              <TeamTile isCompact={true} />
            </div>
            <div className="tile-print bg-white rounded-[40px] p-8 shadow-sm border border-gray-100">
              <PointageTile />
            </div>
          </div>
        </div>

        {/* 3. BLOC DROIT (Budget & Rentabilité Heures) */}
        <div className="xl:col-span-4 tile-print">
          <div className="bg-[#2d3436] rounded-[40px] p-8 shadow-xl text-white h-full relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10"><BarChart3 size={150}/></div>
             <BudgetHeuresTile />
          </div>
        </div>

        {/* 4. HSE & SÉCURITÉ (Pleine largeur) */}
        <div className="xl:col-span-12 tile-print">
          <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100">
             <HSETile />
          </div>
        </div>

      </div>

    </div>
  );
}