"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Clock, ArrowUpRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function PointageTile() {
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(0);
  const [employeeCount, setEmployeeCount] = useState(0);

  useEffect(() => {
    async function fetchWeeklyHours() {
      setLoading(true);
      
      // 1. Calcul des dates de la semaine courante (Lundi-Dimanche)
      const curr = new Date();
      const first = curr.getDate() - curr.getDay() + 1;
      const last = first + 6;
      
      const start = new Date(curr.setDate(first)).toISOString().split('T')[0];
      const end = new Date(curr.setDate(last)).toISOString().split('T')[0];

      // 2. Récupération des heures saisies
      const { data } = await supabase
        .from('planning')
        .select('heures, employe_id')
        .gte('date_debut', start)
        .lte('date_debut', end);

      if (data) {
        // Total des heures
        const total = data.reduce((acc, curr) => acc + (parseFloat(curr.heures) || 0), 0);
        setHours(total);

        // Nombre de pointeurs uniques
        const uniqueEmployees = new Set(data.map(d => d.employe_id));
        setEmployeeCount(uniqueEmployees.size);
      }
      
      setLoading(false);
    }

    fetchWeeklyHours();
  }, []);

  // Estimation (ex: 10 employés * 35h = 350h max théorique pour la barre de progression)
  // C'est une valeur arbitraire pour l'animation visuelle, à ajuster selon votre effectif moyen
  const maxCapacity = 400; 
  const progress = Math.min(100, (hours / maxCapacity) * 100);

  return (
    <Link href="/pointage" className="block h-full w-full">
      <div className="h-full w-full bg-white rounded-[25px] p-5 shadow-sm border border-gray-100 relative group hover:scale-[1.02] transition-all duration-300 overflow-hidden flex flex-col justify-between">
        
        {/* Header */}
        <div className="flex justify-between items-start z-10">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2.5 rounded-xl text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase text-gray-800 leading-none">Pointage</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Suivi Hebdo</p>
            </div>
          </div>
          
          <div className="bg-gray-50 p-2 rounded-full text-gray-300 group-hover:bg-black group-hover:text-white transition-colors">
            <ArrowUpRight size={16} />
          </div>
        </div>

        {/* Content */}
        <div className="mt-4 z-10">
          {loading ? (
            <div className="flex items-center gap-2 text-gray-400 text-xs font-bold animate-pulse">
              <Loader2 size={14} className="animate-spin" /> Calcul en cours...
            </div>
          ) : (
            <div>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-black text-gray-800">{Math.round(hours)}<span className="text-sm text-gray-400 ml-0.5">h</span></span>
                <span className="text-[10px] font-bold text-gray-400 mb-1.5 uppercase">saisies cette semaine</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-orange-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] font-bold uppercase text-gray-400">
                <span className="flex items-center gap-1">
                  {employeeCount > 0 ? <CheckCircle2 size={12} className="text-emerald-500"/> : <AlertCircle size={12} className="text-orange-400"/>}
                  {employeeCount} Collaborateurs actifs
                </span>
                <span className="text-orange-500 group-hover:underline">Voir détail</span>
              </div>
            </div>
          )}
        </div>

        {/* Décoration Background */}
        <Clock size={100} className="absolute -right-4 -bottom-6 text-gray-50 opacity-50 group-hover:rotate-12 transition-transform duration-500 pointer-events-none" />
      </div>
    </Link>
  );
}
