"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  ArrowLeft, 
  BarChart3, 
  Users, 
  TrendingUp, 
  CalendarRange, 
  AlertTriangle, 
  Briefcase, 
  ArrowRight,
  ChevronRight,
  Clock
} from 'lucide-react';

export default function PlanningCharge() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStaff: 0,
    totalCapacityContext: 0, // Heures dispo totales/semaine
    totalLoadContext: 0, // Heures requises totales/semaine
    occupationRate: 0
  });
  const [chantiers, setChantiers] = useState<any[]>([]);
  
  // Génération des 6 prochaines semaines pour la timeline
  const [weeks, setWeeks] = useState<string[]>([]);

  useEffect(() => {
    // Calcul des semaines (S, S+1...)
    const currentWeek = getWeekNumber(new Date());
    const nextWeeks = Array.from({ length: 6 }, (_, i) => `S${currentWeek + i}`);
    setWeeks(nextWeeks);

    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // 1. Récupérer le Staff (Capacité)
    const { data: staff } = await supabase.from('users').select('*').neq('role', 'admin'); // On exclut les admins du calcul de prod
    const staffCount = staff?.length || 0;
    const weeklyCapacity = staffCount * 35; // Hypothèse 35h/personne

    // 2. Récupérer les Chantiers Actifs (Charge)
    const { data: sites } = await supabase
      .from('chantiers')
      .select('*')
      .eq('statut', 'en_cours')
      .order('date_fin_prevue', { ascending: true });

    // 3. Calcul de la charge théorique (Simulation simple pour l'exemple)
    // Charge = (Heures Budget - Heures Conso) / Semaines restantes
    let totalWeeklyLoad = 0;
    const processedSites = sites?.map(site => {
      const remainingHours = Math.max(0, site.heures_budget - site.heures_consommees);
      // Estimation arbitraire : on lisse le reste sur 4 semaines par défaut si pas de date précise
      const weeksLeft = 4; 
      const weeklyNeed = Math.round(remainingHours / weeksLeft);
      const staffNeed = Math.ceil(weeklyNeed / 35); // Combien de bonhommes il faut

      totalWeeklyLoad += weeklyNeed;

      return {
        ...site,
        weeklyNeed,
        staffNeed,
        remainingHours
      };
    }) || [];

    setStats({
      totalStaff: staffCount,
      totalCapacityContext: weeklyCapacity,
      totalLoadContext: totalWeeklyLoad,
      occupationRate: Math.round((totalWeeklyLoad / weeklyCapacity) * 100) || 0
    });

    setChantiers(processedSites);
    setLoading(false);
  };

  // Utilitaire pour numéro de semaine
  function getWeekNumber(d: Date) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    var weekNo = Math.ceil(( ( (d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
    return weekNo;
  }

  if (loading) return <div className="h-screen flex items-center justify-center font-['Fredoka'] text-[#0984e3] font-bold">Calcul de la charge...</div>;

  return (
    <div className="min-h-screen bg-[#f0f3f4] font-['Fredoka'] pb-20 text-gray-800">
      
      {/* HEADER SIMPLE */}
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="flex items-center text-gray-400 hover:text-[#0984e3] transition-colors font-bold text-sm gap-2">
                <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100"><ArrowLeft size={18} /></div>
                <span className="hidden sm:inline">Retour Dashboard</span>
            </Link>
            <h1 className="text-xl font-black uppercase tracking-tight text-[#2d3436]">Planning de <span className="text-[#0984e3]">Charge</span></h1>
            <div className="w-10"></div> {/* Spacer pour centrer le titre */}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

        {/* 1. KPIs GLOBAUX */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Carte Capacité (Bleu) */}
            <div className="bg-[#0984e3] rounded-[30px] p-6 text-white shadow-xl relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                        <p className="text-xs font-bold text-blue-200 uppercase tracking-widest">Capacité Hebdo</p>
                        <h3 className="text-4xl font-black mt-1">{stats.totalCapacityContext}h</h3>
                    </div>
                    <div className="bg-white/20 p-2 rounded-xl"><Users size={24}/></div>
                </div>
                <p className="text-sm font-bold text-blue-100 relative z-10">
                    Basé sur {stats.totalStaff} collaborateurs (Interne + Intérim)
                </p>
                <Users size={120} className="absolute -right-4 -bottom-6 text-blue-900 opacity-20 rotate-12 group-hover:rotate-0 transition-transform duration-500" />
            </div>

            {/* Carte Besoin (Orange) */}
            <div className="bg-[#e17055] rounded-[30px] p-6 text-white shadow-xl relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                        <p className="text-xs font-bold text-orange-200 uppercase tracking-widest">Charge Requise</p>
                        <h3 className="text-4xl font-black mt-1">{stats.totalLoadContext}h</h3>
                    </div>
                    <div className="bg-white/20 p-2 rounded-xl"><Briefcase size={24}/></div>
                </div>
                <p className="text-sm font-bold text-orange-100 relative z-10">
                    Pour couvrir les {chantiers.length} chantiers actifs
                </p>
                <Briefcase size={120} className="absolute -right-4 -bottom-6 text-orange-900 opacity-20 rotate-12 group-hover:rotate-0 transition-transform duration-500" />
            </div>

            {/* Carte Taux (Vert/Rouge selon delta) */}
            <div className={`rounded-[30px] p-6 text-white shadow-xl relative overflow-hidden group transition-colors ${stats.occupationRate > 100 ? 'bg-[#d63031]' : 'bg-[#00b894]'}`}>
                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                        <p className={`text-xs font-bold uppercase tracking-widest ${stats.occupationRate > 100 ? 'text-red-200' : 'text-emerald-200'}`}>
                            Taux d'occupation
                        </p>
                        <h3 className="text-4xl font-black mt-1">{stats.occupationRate}%</h3>
                    </div>
                    <div className="bg-white/20 p-2 rounded-xl"><TrendingUp size={24}/></div>
                </div>
                <div className="relative z-10">
                    {stats.occupationRate > 100 ? (
                        <div className="flex items-center gap-2 bg-white/20 w-fit px-3 py-1 rounded-lg">
                            <AlertTriangle size={16} />
                            <span className="text-xs font-bold uppercase">Surcharge : +{stats.occupationRate - 100}%</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 bg-white/20 w-fit px-3 py-1 rounded-lg">
                            <Users size={16} />
                            <span className="text-xs font-bold uppercase">Dispo : {100 - stats.occupationRate}%</span>
                        </div>
                    )}
                </div>
                <TrendingUp size={120} className={`absolute -right-4 -bottom-6 opacity-20 rotate-12 group-hover:rotate-0 transition-transform duration-500 ${stats.occupationRate > 100 ? 'text-red-900' : 'text-emerald-900'}`} />
            </div>
        </div>

        {/* 2. TABLEAU DE CHARGE PAR CHANTIER */}
        <div className="bg-white rounded-[30px] shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-black text-gray-800 uppercase flex items-center gap-2">
                    <CalendarRange className="text-[#0984e3]" /> Vision par Chantier
                </h3>
                <div className="flex gap-2">
                     {weeks.map((w, i) => (
                         <div key={i} className="hidden md:flex w-12 h-8 items-center justify-center bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-400">
                             {w}
                         </div>
                     ))}
                </div>
            </div>

            <div className="divide-y divide-gray-100">
                {chantiers.map((site) => (
                    <div key={site.id} className="p-4 hover:bg-blue-50/30 transition-colors group">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                            
                            {/* Info Chantier */}
                            <div className="flex-1 min-w-[250px]">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-black text-gray-800 uppercase truncate">{site.nom}</h4>
                                    <Link href={`/chantier/${site.id}`} className="text-gray-300 hover:text-[#0984e3] opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ArrowRight size={16} />
                                    </Link>
                                </div>
                                <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase">
                                    <span className="flex items-center gap-1"><Clock size={12}/> Reste: {site.remainingHours}h</span>
                                    <span className="flex items-center gap-1 text-[#e17055]"><Users size={12}/> Besoin: {site.staffNeed} pers.</span>
                                </div>
                            </div>

                            {/* Timeline Visuelle (Barre de charge) */}
                            <div className="flex-1 w-full md:w-auto flex items-center gap-1">
                                {weeks.map((_, i) => {
                                    // Simulation : si le chantier est "Actif", on met une barre colorée
                                    // Plus tard, connecter à la date réelle
                                    const isActive = i < 4; // Mock: actif les 4 prochaines semaines
                                    return (
                                        <div key={i} className="flex-1 h-12 bg-gray-100 rounded-xl relative overflow-hidden group/cell">
                                            {isActive && (
                                                <div className={`absolute inset-0 m-1 rounded-lg flex items-center justify-center text-white text-[10px] font-black shadow-sm transition-all hover:scale-105 cursor-help ${
                                                    site.staffNeed > 5 ? 'bg-[#d63031]' : 'bg-[#0984e3]'
                                                }`}>
                                                    {site.staffNeed}p
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                ))}

                {chantiers.length === 0 && (
                    <div className="p-10 text-center opacity-40">
                        <p className="font-bold text-gray-400 uppercase">Aucun chantier actif à planifier</p>
                    </div>
                )}
            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                <button className="text-xs font-black uppercase text-gray-400 hover:text-[#0984e3] flex items-center justify-center gap-1 transition-colors">
                    Voir le planning détaillé des équipes <ChevronRight size={14}/>
                </button>
            </div>
        </div>

        {/* 3. SECTION ALERTES RH (Bas de page) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-[30px] p-6 shadow-sm border-l-8 border-[#e17055]">
                <h3 className="font-black text-gray-800 uppercase mb-2 flex items-center gap-2">
                    <AlertTriangle className="text-[#e17055]" size={20} /> Compétences Manquantes
                </h3>
                <p className="text-sm font-medium text-gray-500 mb-4">
                    Le chantier "Parking Sud" nécessite 2 soudeurs certifiés en S3.
                </p>
                <button className="text-xs font-black bg-[#e17055] text-white px-4 py-2 rounded-xl uppercase hover:bg-orange-600 transition-colors">
                    Recruter Intérim
                </button>
            </div>

            <div className="bg-white rounded-[30px] p-6 shadow-sm border-l-8 border-[#0984e3]">
                <h3 className="font-black text-gray-800 uppercase mb-2 flex items-center gap-2">
                    <BarChart3 className="text-[#0984e3]" size={20} /> Prévisionnel S+4
                </h3>
                <p className="text-sm font-medium text-gray-500 mb-4">
                    Baisse de charge prévue (-20%). 3 Équipes disponibles pour nouveaux projets.
                </p>
                <button className="text-xs font-black bg-[#0984e3] text-white px-4 py-2 rounded-xl uppercase hover:bg-blue-600 transition-colors">
                    Voir Commerciaux
                </button>
            </div>
        </div>

      </div>
    </div>
  );
}
