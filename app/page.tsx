"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, HardHat, FileWarning, ClipboardCheck, 
  PlayCircle, Calendar, ArrowRight, Activity, 
  AlertTriangle, CheckCircle2 
} from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const [stats, setStats] = useState({ staff: 0, alerts: 0, activeSites: 0 });
  const [recentPlanning, setRecentPlanning] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      // 1. Stats Effectifs et Conformité
      const { data: staff } = await supabase.from('employes').select('*');
      const { data: sites } = await supabase.from('chantiers').select('*').eq('statut', 'en_cours');
      
      const alerts = staff?.filter(e => {
        const hasExpiredCaces = e.habilitations_json?.some((h:any) => h.exp && new Date(h.exp) < new Date());
        return !e.dossier_complet || hasExpiredCaces;
      }).length || 0;

      // 2. Récupérer les 3 dernières affectations planning
      const { data: plan } = await supabase.from('planning')
        .select('*, chantiers(nom), employes(nom)')
        .limit(3)
        .order('date_debut', { ascending: false });

      setStats({
        staff: staff?.length || 0,
        alerts: alerts,
        activeSites: sites?.length || 0
      });
      setRecentPlanning(plan || []);
    }
    fetchData();
  }, []);

  return (
    <div className="p-4 md:p-8 font-['Fredoka'] max-w-7xl mx-auto space-y-8">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-end mb-4">
        <div>
          <h1 className="text-4xl font-black uppercase text-gray-900 tracking-tighter">Tableau de Bord</h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1 italic">Altrad Operational Center</p>
        </div>
        <div className="hidden md:flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border border-gray-100 font-bold text-xs">
          <Activity size={16} className="text-green-500 animate-pulse" /> Système Connecté
        </div>
      </div>

      {/* --- LIGNE 1 : LES CHIFFRES CLÉS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/equipe" className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 hover:scale-[1.02] transition-all group">
          <div className="flex justify-between items-start mb-6">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-3xl group-hover:bg-blue-600 group-hover:text-white transition-colors"><Users size={28}/></div>
            <ArrowRight size={20} className="text-gray-200 group-hover:text-black" />
          </div>
          <p className="text-5xl font-black text-gray-800 tracking-tighter">{stats.staff}</p>
          <p className="text-xs font-black text-gray-400 mt-1 uppercase tracking-widest text-blue-500">Personnel Actif</p>
        </Link>

        <Link href="/equipe" className={`p-8 rounded-[40px] shadow-sm border transition-all hover:scale-[1.02] group ${stats.alerts > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
          <div className="flex justify-between items-start mb-6">
            <div className={`p-4 rounded-3xl transition-colors ${stats.alerts > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-400 group-hover:bg-black group-hover:text-white'}`}><FileWarning size={28}/></div>
            {stats.alerts > 0 && <AlertTriangle size={20} className="text-red-500" />}
          </div>
          <p className="text-5xl font-black text-gray-800 tracking-tighter">{stats.alerts}</p>
          <p className="text-xs font-black text-gray-400 mt-1 uppercase tracking-widest text-red-500">Alertes Conformité</p>
        </Link>

        <Link href="/planning" className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 hover:scale-[1.02] transition-all group">
          <div className="flex justify-between items-start mb-6">
            <div className="p-4 bg-orange-50 text-orange-600 rounded-3xl group-hover:bg-orange-600 group-hover:text-white transition-colors"><HardHat size={28}/></div>
            <ArrowRight size={20} className="text-gray-200 group-hover:text-black" />
          </div>
          <p className="text-5xl font-black text-gray-800 tracking-tighter">{stats.activeSites}</p>
          <p className="text-xs font-black text-gray-400 mt-1 uppercase tracking-widest text-orange-500">Chantiers en cours</p>
        </Link>
      </div>

      {/* --- LIGNE 2 : PLANNING & DÉMARRAGE --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* APERÇU PLANNING */}
        <div className="lg:col-span-5 bg-white p-8 rounded-[45px] shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-black uppercase text-gray-800 flex items-center gap-2"><Calendar size={20} className="text-blue-500"/> Planning récent</h3>
            <Link href="/planning" className="text-[10px] font-black uppercase text-blue-600 hover:underline">Tout voir</Link>
          </div>
          <div className="space-y-4">
            {recentPlanning.length > 0 ? recentPlanning.map((p, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                <div className="w-2 h-10 bg-blue-500 rounded-full" />
                <div className="flex-1">
                  <p className="font-black text-xs uppercase text-gray-800 leading-none mb-1">{p.employes?.nom}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">{p.chantiers?.nom}</p>
                </div>
                <div className="text-[9px] font-black text-gray-400 bg-white px-2 py-1 rounded-lg border border-gray-100">
                  {new Date(p.date_debut).toLocaleDateString('fr-FR', {day: '2-digit', month: '2-digit'})}
                </div>
              </div>
            )) : <p className="text-center text-gray-300 font-bold py-10 uppercase text-xs">Aucune affectation</p>}
          </div>
        </div>

        {/* GROS MODULE DÉMARRAGE */}
        <div className="lg:col-span-7 bg-black p-10 rounded-[50px] text-white shadow-2xl relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-[#ff9f43] rounded-2xl flex items-center justify-center text-black shadow-lg shadow-orange-900/20">
                <PlayCircle size={30} />
              </div>
              <h2 className="text-3xl font-black uppercase tracking-tighter italic">Démarrage Chantier</h2>
            </div>
            <p className="text-gray-400 font-bold text-sm leading-relaxed mb-10 max-w-md">
              Ouvrez vos nouveaux sites proprement : check-list sécurité, PPSPS, et signature électronique de l'équipe sur tablette.
            </p>
            <Link href="/demarrage" className="inline-flex items-center gap-4 bg-white text-black px-10 py-5 rounded-3xl font-black uppercase text-xs hover:bg-[#ff9f43] transition-all shadow-xl active:scale-95">
               Lancer l'ouverture du site <ArrowRight size={18}/>
            </Link>
          </div>
          {/* Décoration de fond */}
          <ClipboardCheck size={200} className="absolute -right-10 -bottom-10 text-white/5 -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
        </div>

      </div>

      {/* --- LIGNE 3 : ACCÈS RAPIDES --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Nouvel Employé', icon: <Users size={18}/>, link: '/equipe' },
          { label: 'Documents Expirés', icon: <FileWarning size={18}/>, link: '/equipe' },
          { label: 'Assigner Planning', icon: <Calendar size={18}/>, link: '/planning' },
          { label: 'Réglages', icon: <Activity size={18}/>, link: '/' },
        ].map((btn, i) => (
          <Link key={i} href={btn.link} className="flex flex-col items-center justify-center p-6 bg-white rounded-[30px] border border-gray-50 hover:bg-black hover:text-white transition-all group">
            <div className="mb-2 text-gray-400 group-hover:text-orange-500 transition-colors">{btn.icon}</div>
            <span className="text-[10px] font-black uppercase text-center">{btn.label}</span>
          </Link>
        ))}
      </div>

    </div>
  );
}
