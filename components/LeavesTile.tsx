"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plane, Pill, GraduationCap, Loader2, ArrowUpRight, Users } from 'lucide-react';
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
      <div className="h-full w-full bg-[#a55eea] rounded-[25px] flex flex-col shadow-lg border border-white/10 p-5 font-['Fredoka'] text-white relative group hover:scale-[1.02] transition-all duration-300 overflow-hidden">
        
        {/* HEADER */}
        <div className="flex justify-between items-start mb-4 z-10 shrink-0">
          <div>
            <h2 className="font-black uppercase text-sm leading-none italic">Absences RH</h2>
            <p className="text-[9px] font-bold opacity-60 uppercase mt-1">Indisponibilités</p>
          </div>
          
          <div className="flex items-center gap-2">
            {loading ? (
              <Loader2 size={16} className="animate-spin opacity-50" />
            ) : (
              <Users size={18} className="opacity-40 group-hover:opacity-0 transition-opacity" />
            )}
            <div className="bg-white/20 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-4">
               <ArrowUpRight size={14} />
            </div>
          </div>
        </div>
        
        {/* LISTE (SCROLL VERTICAL UNIQUEMENT) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar z-10 pr-1">
          <div className="space-y-2">
            {absents.map((person, i) => (
              <div key={i} className="bg-white/10 p-2 rounded-xl border border-white/5 backdrop-blur-sm hover:bg-white/20 transition-all flex justify-between items-center w-full">
                <div className="min-w-0 flex-1">
                  <p className="font-black text-[11px] uppercase truncate">{person.prenom} {person.nom}</p>
                  <p className="text-[8px] font-bold opacity-70 italic truncate">
                    {person.commentaire_statut || 'Aucun détail'}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <span className="text-[7px] font-black uppercase bg-black/20 px-1.5 py-0.5 rounded">
                    {person.statut_actuel}
                  </span>
                  {person.statut_actuel === 'maladie' && <Pill size={14} className="text-red-200" />}
                  {person.statut_actuel === 'conge' && <Plane size={14} className="text-orange-200" />}
                  {person.statut_actuel === 'formation' && <GraduationCap size={14} className="text-blue-200" />}
                </div>
              </div>
            ))}
            
            {absents.length === 0 && !loading && (
              <div className="h-full flex flex-col items-center justify-center py-8 opacity-50">
                 <p className="text-[10px] font-black uppercase tracking-widest text-center leading-tight">Effectif complet<br/>sur le terrain</p>
              </div>
            )}
          </div>
        </div>

        {/* DÉCORATION FOND */}
        <Plane size={120} className="absolute -right-6 -bottom-6 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-500 pointer-events-none" />
      </div>
    </Link>
  );
}
