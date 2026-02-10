"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ChevronLeft, ChevronRight, HardHat, 
  AlertTriangle, CheckCircle2, Users, 
  CalendarRange, TrendingUp, Printer, Info
} from 'lucide-react';

// --- HELPERS DATES ---
const getWeekNumber = (d: Date) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const getWeekDates = (w: number, y: number) => {
  const simple = new Date(y, 0, 1 + (w - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  
  const end = new Date(ISOweekStart);
  end.setDate(end.getDate() + 6); // Dimanche
  return { start: ISOweekStart, end };
};

export default function PlanningChargePage() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  
  // États de calcul
  const [globalStats, setGlobalStats] = useState<any>({});

  // 1. CHARGEMENT DONNÉES
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // Récupère chantiers actifs cette année
    // On inclut aussi les potentiels pour la prévision
    const { data: chan } = await supabase
      .from('chantiers')
      .select('*')
      .neq('statut', 'termine') // On exclut les terminés pour la charge future
      .order('nom');

    // Récupère tout le planning (affectations réelles)
    const { data: plan } = await supabase
      .from('planning')
      .select('*, users(role)') // On récupère le rôle pour distinguer interne/externe si besoin
      .neq('chantier_id', null);

    if (chan) setChantiers(chan);
    if (plan) setAssignments(plan);
    setLoading(false);
  };

  // 2. GÉNÉRATION DES SEMAINES (S1 à S52)
  const weeks = Array.from({ length: 52 }, (_, i) => i + 1);

  // 3. LOGIQUE DE CALCUL PAR CELLULE
  const calculateLoad = (chantier: any, weekNum: number) => {
    const { start: weekStart, end: weekEnd } = getWeekDates(weekNum, year);
    
    // Sécurité si dates manquantes
    if (!chantier.date_debut || !chantier.date_fin) return null;

    const chantierStart = new Date(chantier.date_debut);
    const chantierEnd = new Date(chantier.date_fin);

    // Le chantier est-il actif cette semaine ?
    const isActive = chantierStart <= weekEnd && chantierEnd >= weekStart;

    if (!isActive) return null;

    // --- LOGIQUE PONDÉRÉE (MODIFICATION ICI) ---
    let need = chantier.effectif_prevu || 0; 

    // Si c'est un chantier potentiel, on applique le taux de réussite
    if (chantier.statut === 'potentiel' && chantier.taux_reussite) {
        // Formule : Besoin * (Taux / 100)
        // On arrondit à l'entier le plus proche (ex: 2.4 -> 2, 2.6 -> 3)
        need = Math.round(need * (chantier.taux_reussite / 100));
    }

    // Calcul du Staffé Réel (depuis planning hebdo)
    // On compte les affectations uniques pour ce chantier sur cette semaine
    const staffed = assignments.filter(a => {
        if (a.chantier_id !== chantier.id) return false;
        const assignStart = new Date(a.date_debut);
        const assignEnd = new Date(a.date_fin);
        // Chevauchement de dates
        return assignStart <= weekEnd && assignEnd >= weekStart;
    }).length; 

    const missing = Math.max(0, need - staffed);
    
    // Status couleur
    let statusClass = 'bg-gray-50 border-gray-100 text-gray-400';
    let textInfo = ""; // Texte additionnel (ex: 50%)

    // Logique de couleur spécifique pour les Potentiels
    if (chantier.statut === 'potentiel') {
        statusClass = 'bg-purple-50 border-purple-200 text-purple-700 dashed-border'; // Style spécial pour potentiel
        textInfo = `${chantier.taux_reussite || 0}%`;
    } else {
        // Logique standard pour chantiers confirmés
        if (need > 0) {
            if (staffed === 0) statusClass = 'bg-red-50 border-red-100 text-red-400'; 
            else if (missing > 0) {
                 if (missing >= need * 0.5) statusClass = 'bg-red-100 border-red-200 text-red-700'; 
                 else statusClass = 'bg-orange-100 border-orange-200 text-orange-700';
            }
            else if (staffed > need) statusClass = 'bg-blue-100 border-blue-200 text-blue-700'; 
            else statusClass = 'bg-emerald-100 border-emerald-200 text-emerald-700'; 
        }
    }

    return { need, staffed, missing, statusClass, textInfo };
  };

  // 4. CALCUL TOTAUX HEBDOMADAIRES (Ligne du bas)
  const calculateWeeklyTotal = (weekNum: number) => {
    let totalNeed = 0;
    let totalStaffed = 0;

    chantiers.forEach(c => {
        const load = calculateLoad(c, weekNum);
        if (load) {
            totalNeed += load.need;
            totalStaffed += load.staffed;
        }
    });

    return { totalNeed, totalStaffed, gap: totalNeed - totalStaffed };
  };

  return (
    <div className="min-h-screen bg-[#f0f3f4] font-['Fredoka'] flex flex-col text-gray-800 ml-0 md:ml-0 transition-all">
      
      {/* --- HEADER FIXE --- */}
      <div className="bg-white border-b border-gray-200 p-4 md:p-6 sticky top-0 z-40 shadow-sm print:hidden">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h1 className="text-2xl font-black uppercase text-[#2d3436] flex items-center gap-3">
                    <CalendarRange className="text-[#00b894]" size={32}/>
                    Planning de <span className="text-[#00b894]">Charge</span>
                </h1>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                    Pilotage stratégique des ressources {year}
                </p>
            </div>

            {/* Légende & Outils */}
            <div className="flex items-center gap-6">
                <div className="flex gap-4 text-[10px] font-bold uppercase">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-100 border border-emerald-300 rounded"></div> Complet</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded"></div> Manque</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-purple-50 border border-purple-300 rounded"></div> Potentiel</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div> Critique</div>
                </div>
                
                <div className="flex items-center bg-gray-100 rounded-xl p-1">
                    <button onClick={() => setYear(year - 1)} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronLeft size={16}/></button>
                    <span className="px-4 font-black text-sm">{year}</span>
                    <button onClick={() => setYear(year + 1)} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronRight size={16}/></button>
                </div>

                <button onClick={() => window.print()} className="bg-[#2d3436] text-white p-3 rounded-xl hover:bg-black transition-colors shadow-lg">
                    <Printer size={20} />
                </button>
            </div>
        </div>
      </div>

      {/* --- TABLEAU DE CHARGE --- */}
      <div className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col">
        
        {loading ? (
            <div className="flex-1 flex items-center justify-center font-bold text-gray-400 animate-pulse">
                Synchronisation des données chantiers...
            </div>
        ) : (
            <div className="bg-white rounded-[20px] shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden relative">
                
                {/* Scroll Container */}
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full border-collapse">
                        
                        {/* EN-TÊTE SEMAINES (Sticky Top) */}
                        <thead className="sticky top-0 z-30 bg-white shadow-sm">
                            <tr>
                                <th className="p-4 w-[300px] min-w-[300px] sticky left-0 bg-white z-40 text-left border-r border-gray-200 border-b">
                                    <div className="font-black text-xs text-gray-400 uppercase">Chantiers Actifs</div>
                                </th>
                                {weeks.map(w => {
                                    const { start } = getWeekDates(w, year);
                                    const isCurrentWeek = getWeekNumber(new Date()) === w && new Date().getFullYear() === year;
                                    return (
                                        <th key={w} className={`p-2 min-w-[100px] text-center border-r border-b border-gray-100 ${isCurrentWeek ? 'bg-blue-50/50' : ''}`}>
                                            <div className="text-[10px] font-black text-gray-400 uppercase">S{w}</div>
                                            <div className="text-[9px] font-bold text-gray-300">{start.getDate()}/{start.getMonth()+1}</div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>

                        {/* CORPS DU TABLEAU */}
                        <tbody>
                            {chantiers.map(chantier => (
                                <tr key={chantier.id} className="group hover:bg-gray-50 transition-colors border-b border-gray-50">
                                    {/* NOM CHANTIER (Sticky Left) */}
                                    <td className="p-4 sticky left-0 bg-white group-hover:bg-gray-50 z-20 border-r border-gray-200">
                                        <div className="flex flex-col">
                                            <span className="font-black text-sm text-gray-800 uppercase truncate max-w-[250px]">{chantier.nom}</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${chantier.statut === 'potentiel' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>
                                                    {chantier.statut === 'potentiel' ? 'Offre' : (chantier.type || 'Indus.')}
                                                </span>
                                                {chantier.effectif_prevu && <span className="text-[9px] text-gray-400 font-bold flex items-center gap-1"><Users size={10}/> {chantier.effectif_prevu} pers.</span>}
                                            </div>
                                        </div>
                                    </td>

                                    {/* CELLULES SEMAINES */}
                                    {weeks.map(w => {
                                        const data = calculateLoad(chantier, w);
                                        const isCurrentWeek = getWeekNumber(new Date()) === w && new Date().getFullYear() === year;

                                        return (
                                            <td key={w} className={`p-1 border-r border-gray-100 h-16 relative ${isCurrentWeek ? 'bg-blue-50/30' : ''}`}>
                                                {data ? (
                                                    <div className={`w-full h-full rounded-lg border ${data.statusClass} p-1 flex flex-col justify-center items-center cursor-pointer hover:scale-105 transition-transform group/cell`}>
                                                        {/* STAFFING / BESOIN */}
                                                        <div className="text-xs font-black flex items-center gap-1">
                                                            {data.staffed} <span className="text-[8px] opacity-60">/ {data.need}</span>
                                                        </div>
                                                        
                                                        {/* INFO SUPP (Taux réussite ou Renfort) */}
                                                        {data.textInfo ? (
                                                            <div className="mt-1 text-[8px] font-bold opacity-80">{data.textInfo}</div>
                                                        ) : data.missing > 0 && (
                                                            <div className="mt-1 bg-white/80 px-1.5 rounded text-[9px] font-black text-red-600 shadow-sm whitespace-nowrap">
                                                                +{data.missing}
                                                            </div>
                                                        )}

                                                        {/* Tooltip */}
                                                        <div className="absolute bottom-full mb-2 bg-black text-white text-[10px] p-2 rounded shadow-xl hidden group-hover/cell:block z-50 whitespace-nowrap">
                                                            <p className="font-bold uppercase mb-1">Semaine {w}</p>
                                                            <p>Besoin : {data.need}</p>
                                                            {chantier.statut === 'potentiel' && <p className="text-purple-300 italic">Pondéré à {chantier.taux_reussite}%</p>}
                                                            <p>Staffé : {data.staffed}</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-full"></div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>

                        {/* PIED DE PAGE : TOTAL CHARGE (Sticky Bottom) */}
                        <tfoot className="sticky bottom-0 z-30 bg-gray-800 text-white shadow-lg border-t border-gray-900">
                            <tr>
                                <td className="p-4 sticky left-0 bg-gray-800 z-40 border-r border-gray-700">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp size={18} className="text-[#00b894]"/>
                                        <div className="flex flex-col">
                                            <span className="font-black text-xs uppercase">Charge Globale</span>
                                            <span className="text-[9px] text-gray-400">Total besoins vs effectifs</span>
                                        </div>
                                    </div>
                                </td>
                                {weeks.map(w => {
                                    const total = calculateWeeklyTotal(w);
                                    const hasActivity = total.totalNeed > 0;
                                    
                                    // Couleur barre de charge
                                    let barColor = 'bg-emerald-500';
                                    if (total.gap > 0) barColor = 'bg-orange-500'; // Manque global
                                    if (total.gap > 5) barColor = 'bg-red-500'; // Manque critique

                                    return (
                                        <td key={w} className="p-2 border-r border-gray-700 text-center relative group/foot">
                                            {hasActivity && (
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-[9px] font-bold text-gray-300">{total.totalStaffed}/{total.totalNeed}</span>
                                                    {/* Jauge de charge */}
                                                    <div className="w-full h-1.5 bg-gray-600 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full ${barColor}`} 
                                                            style={{ width: `${Math.min(100, (total.totalStaffed / total.totalNeed) * 100)}%` }} 
                                                        />
                                                    </div>
                                                    {total.gap > 0 && (
                                                        <span className="text-[8px] font-black text-orange-400">-{total.gap}</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
