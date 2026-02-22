"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plane, Pill, GraduationCap, Loader2, ArrowUpRight, Users, CalendarDays } from 'lucide-react';
import Link from 'next/link';

// Helper Format Date
const formatDateFr = (dateStr: string) => {
    if(!dateStr) return "Date inconnue";
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

export default function LeavesTile() {
  const [absents, setAbsents] = useState<any[]>([]);
  const [formationsPrevues, setFormationsPrevues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // 1. Récupération Employés (Statut + JSON Formations)
      const { data } = await supabase
        .from('employes')
        .select('id, nom, prenom, statut_actuel, commentaire_statut, formations_json');
      
      if (data) {
          // A. Filtrer les absents actuels (Statut != disponible)
          const currentAbsents = data.filter(e => e.statut_actuel !== 'disponible');
          setAbsents(currentAbsents);

          // B. Extraire les formations prévues du JSON
          let upcomingFormations: any[] = [];
          
          data.forEach(emp => {
              if (emp.formations_json && Array.isArray(emp.formations_json)) {
                  emp.formations_json.forEach((f: any) => {
                      // Critère : Soit marqué "prévu", soit on peut ajouter une logique de date future
                      // Ici on se base sur le flag 'prevu' que tu as dans ta fiche employé
                      if (f.prevu === true) {
                          upcomingFormations.push({
                              id: emp.id + '_' + f.label, // Clé unique virtuelle
                              nom: emp.nom,
                              prenom: emp.prenom,
                              formation: f.label,
                              date: f.date_obtention || f.exp, // On utilise le champ date dispo (souvent 'date_obtention' pour la date prévue)
                              type: 'formation_future'
                          });
                      }
                  });
              }
          });

          setFormationsPrevues(upcomingFormations);
      }
      setLoading(false);
    }
    
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Link href="/equipe" className="block h-full w-full">
      <div className="h-full w-full bg-[#a55eea] rounded-[25px] flex flex-col shadow-lg border border-white/10 p-5 font-['Fredoka'] text-white relative group hover:scale-[1.02] transition-all duration-300 overflow-hidden">
        
        {/* HEADER */}
        <div className="flex justify-between items-start mb-4 z-10 shrink-0">
          <div>
            <h2 className="font-black uppercase text-sm leading-none italic">Absences & Formations</h2>
            <p className="text-[9px] font-bold opacity-60 uppercase mt-1">RH / Planning</p>
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
        
        {/* LISTE (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar z-10 pr-1 space-y-4">
          
          {/* 1. SECTION ABSENTS ACTUELS */}
          {absents.length > 0 && (
              <div className="space-y-2">
                <p className="text-[9px] font-black uppercase opacity-50 tracking-widest sticky top-0 bg-[#a55eea] py-1 z-20">Actuellement Absent(s)</p>
                {absents.map((person, i) => (
                  <div key={i} className="bg-white/10 p-2 rounded-xl border border-white/5 backdrop-blur-sm hover:bg-white/20 transition-all flex justify-between items-center w-full">
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-[11px] uppercase truncate">{person.prenom} {person.nom}</p>
                      <p className="text-[8px] font-bold opacity-70 italic truncate">
                        {person.commentaire_statut || 'Aucun détail'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      {/* Badge Statut */}
                      <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded ${
                          person.statut_actuel === 'formation' ? 'bg-blue-400/40 text-white' : 'bg-black/20'
                      }`}>
                        {person.statut_actuel}
                      </span>
                      
                      {/* Icône */}
                      {person.statut_actuel === 'maladie' && <Pill size={14} className="text-red-200" />}
                      {person.statut_actuel === 'conge' && <Plane size={14} className="text-orange-200" />}
                      {person.statut_actuel === 'formation' && <GraduationCap size={14} className="text-blue-200" />}
                    </div>
                  </div>
                ))}
              </div>
          )}

          {/* 2. SECTION FORMATIONS À VENIR */}
          {formationsPrevues.length > 0 && (
              <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase opacity-50 tracking-widest sticky top-0 bg-[#a55eea] py-1 z-20 flex items-center gap-2">
                      <GraduationCap size={10}/> Formations Prévues
                  </p>
                  {formationsPrevues.map((formation, i) => (
                      <div key={i} className="bg-blue-900/20 p-2 rounded-xl border border-blue-400/20 hover:bg-blue-900/30 transition-all flex justify-between items-center w-full">
                          <div className="min-w-0 flex-1">
                              <p className="font-black text-[10px] uppercase truncate text-blue-100">{formation.formation}</p>
                              <p className="text-[9px] font-bold text-white uppercase truncate">{formation.prenom} {formation.nom}</p>
                          </div>
                          <div className="flex flex-col items-end shrink-0 ml-2">
                              {formation.date ? (
                                  <div className="flex items-center gap-1 bg-blue-500/30 px-1.5 py-0.5 rounded text-[8px] font-bold text-blue-100 border border-blue-400/30">
                                      <CalendarDays size={8}/>
                                      {formatDateFr(formation.date)}
                                  </div>
                              ) : (
                                  <span className="text-[7px] italic opacity-50">Date à définir</span>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          )}
          
          {/* CAS VIDE */}
          {absents.length === 0 && formationsPrevues.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center py-8 opacity-50">
                <p className="text-[10px] font-black uppercase tracking-widest text-center leading-tight">Aucune absence<br/>ni formation</p>
            </div>
          )}
        </div>

        {/* DÉCORATION FOND */}
        <GraduationCap size={120} className="absolute -right-6 -bottom-6 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-500 pointer-events-none text-purple-200" />
      </div>
    </Link>
  );
}
