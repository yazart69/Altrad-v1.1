"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plane, Pill, GraduationCap, Loader2, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default function LeavesTile() {
  const [absents, setAbsents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAbsents() {
      // On récupère les employés dont le statut n'est pas "disponible"
      const { data } = await supabase
        .from('employes')
        .select('*')
        .neq('statut_actuel', 'disponible'); 
      
      if (data) setAbsents(data);
      setLoading(false);
    }
    fetchAbsents();
    // Rafraîchissement automatique toutes les 10 secondes
    const interval = setInterval(fetchAbsents, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Link href="/equipe" className="block h-full w-full">
      <div className="h-full w-full bg-[#a55eea] rounded-[25px] flex flex-col shadow-sm overflow-hidden p-6 font-['Fredoka'] text-white relative group hover:scale-[1.01] transition-transform duration-300">
        
        <div className="flex justify-between items-start mb-4 relative z-10">
          <div>
            <h2 className="text-[24px] font-black uppercase tracking-tight leading-none">Absences RH</h2>
            <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest mt-1">Suivi des indisponibilités</p>
          </div>
          
          <div className="flex items-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin opacity-50" />}
            <div className="bg-white/20 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
               <ArrowUpRight size={20} />
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
          <div className="space-y-3">
            {absents.map((person, i) => (
              <div key={i} className="bg-white/20 backdrop-blur-md rounded-xl p-3 border border-white/10 flex justify-between items-center animate-in fade-in slide-in-from-bottom-2 hover:bg-white/30 transition-colors">
                <div>
                  <p className="font-bold text-[16px] leading-tight uppercase">{person.prenom} {person.nom}</p>
                  <p className="text-[10px] opacity-80 font-bold italic truncate w-32">
                    {person.commentaire_statut || 'Aucun détail'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase bg-black/20 px-2 py-1 rounded-md">
                    {person.statut_actuel}
                  </span>
                  {person.statut_actuel === 'maladie' && <Pill size={18} className="text-red-200" />}
                  {person.statut_actuel === 'conge' && <Plane size={18} className="text-orange-200" />}
                  {person.statut_actuel === 'formation' && <GraduationCap size={18} className="text-blue-200" />}
                </div>
              </div>
            ))}
            {absents.length === 0 && !loading && (
              <div className="h-full flex flex-col items-center justify-center opacity-50">
                 <p className="text-xs font-bold uppercase tracking-widest">Tout le monde est disponible</p>
              </div>
            )}
          </div>
        </div>

        {/* Décoration d'arrière-plan */}
        <Plane size={150} className="absolute -right-10 -bottom-10 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-500 pointer-events-none" />
      </div>
    </Link>
  );
}
