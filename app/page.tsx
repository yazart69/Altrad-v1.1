"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, HardHat, FileWarning, ClipboardCheck, PlayCircle } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const [stats, setStats] = useState({ staff: 0, alerts: 0, activeSites: 0 });

  useEffect(() => {
    async function getStats() {
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
    getStats();
  }, []);

  return (
    <div className="p-8 font-['Fredoka'] max-w-7xl mx-auto">
      <h1 className="text-4xl font-black uppercase text-gray-900 mb-10 tracking-tighter">Tableau de Bord</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Tuile Effectifs */}
        <Link href="/equipe" className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Users size={24}/></div>
            <span className="text-[10px] font-black uppercase text-gray-400">Effectifs</span>
          </div>
          <p className="text-4xl font-black text-gray-800">{stats.staff}</p>
          <p className="text-xs font-bold text-gray-400 mt-1 uppercase">Personnes inscrites</p>
        </Link>

        {/* Tuile Alertes RH */}
        <Link href="/equipe" className={`p-8 rounded-[40px] shadow-sm border transition-all ${stats.alerts > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-2xl ${stats.alerts > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-50 text-gray-400'}`}><FileWarning size={24}/></div>
            <span className="text-[10px] font-black uppercase text-gray-400">Conformité</span>
          </div>
          <p className="text-4xl font-black text-gray-800">{stats.alerts}</p>
          <p className="text-xs font-bold text-gray-400 mt-1 uppercase">Dossiers à rectifier</p>
        </Link>

        {/* Tuile Chantiers Actifs */}
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl"><HardHat size={24}/></div>
            <span className="text-[10px] font-black uppercase text-gray-400">Opérations</span>
          </div>
          <p className="text-4xl font-black text-gray-800">{stats.activeSites}</p>
          <p className="text-xs font-bold text-gray-400 mt-1 uppercase">Chantiers en cours</p>
        </div>
      </div>

      {/* --- NOUVELLE TUILE : DÉMARRAGE CHANTIER --- */}
      <div className="bg-[#2d3436] p-10 rounded-[50px] text-white shadow-2xl relative overflow-hidden group">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-[#ff9f43] text-black text-[10px] font-black px-3 py-1 rounded-full uppercase">Nouveau</span>
              <h2 className="text-3xl font-black uppercase tracking-tighter italic">Démarrage Chantier</h2>
            </div>
            <p className="text-gray-400 font-bold text-sm leading-relaxed mb-6">
              Ouvrez un nouveau site proprement : check-list sécurité, PPSPS, et signature électronique de l'équipe sur tablette.
            </p>
            <Link href="/demarrage" className="inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-2xl font-black uppercase text-xs hover:scale-105 transition-all shadow-xl shadow-black/20">
              <PlayCircle size={20}/> Lancer l'ouverture
            </Link>
          </div>
          <div className="w-full md:w-64 h-64 bg-white/5 rounded-[40px] flex items-center justify-center border border-white/10 group-hover:rotate-3 transition-transform">
            <ClipboardCheck size={80} className="text-[#ff9f43] opacity-40" />
          </div>
        </div>
      </div>
    </div>
  );
}
