"use client";

import React from 'react';
import { Plane, Check, GraduationCap, Pill, Briefcase, Baby, Coffee } from 'lucide-react';

export default function LeavesTile() {
  const demandes = [
    { nom: "Jean Dupont", dates: "12 - 15 Fév.", type: "Congés", icon: Plane, color: "text-[#a55eea]", bg: "bg-white" },
    { nom: "Lucas Martin", dates: "18 Fév.", type: "Formation", icon: GraduationCap, color: "text-[#fd79a8]", bg: "bg-white" },
    { nom: "Hervé Renard", dates: "Jusqu'au 20 Fév.", type: "Arrêt Maladie", icon: Pill, color: "text-[#ff6b6b]", bg: "bg-white" },
    { nom: "Thomas Bernard", dates: "10 - 24 Fév.", type: "Paternité", icon: Baby, color: "text-[#74b9ff]", bg: "bg-white" },
    { nom: "Sophie Petit", dates: "15 Fév.", type: "RTT", icon: Coffee, color: "text-[#b8e994]", bg: "bg-white" },
    { nom: "Julie Durand", dates: "22 - 26 Fév.", type: "Formation", icon: GraduationCap, color: "text-[#fd79a8]", bg: "bg-white" },
    { nom: "Nicolas Roux", dates: "Jusqu'au 14 Fév.", type: "Arrêt Maladie", icon: Pill, color: "text-[#ff6b6b]", bg: "bg-white" },
  ];

  return (
    // FOND VIOLET #a55eea, SANS BORDURE, TEXTE BLANC
    <div className="h-full w-full bg-[#a55eea] rounded-[25px] flex flex-col shadow-sm overflow-hidden border-none font-['Fredoka'] text-white">
      
      {/* HEADER */}
      <div className="p-[25px] pb-4 flex justify-between items-start shrink-0">
        <div className="flex flex-col">
          <span className="text-white/80 text-[11px] font-[700] uppercase tracking-[0.15em] leading-none">
            Ressources Humaines
          </span>
          <h2 className="font-[800] text-[22px] uppercase leading-[1.1] mt-2">
            Absences <br/> & Congés
          </h2>
        </div>
        <div className="bg-white/20 px-3 py-1 rounded-xl font-[900] text-[18px] shadow-sm border border-white/10">
          {demandes.length}
        </div>
      </div>

      {/* LISTE SCROLLABLE */}
      <div className="flex-1 px-[20px] overflow-y-auto custom-scrollbar space-y-2 pb-4">
        {demandes.map((demande, idx) => (
          // Fond des items en blanc translucide (white/20) pour se fondre dans le violet
          <div key={idx} className="bg-white/20 p-3 rounded-[20px] flex items-center justify-between group hover:bg-white/30 transition-all shadow-sm border border-white/5">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className={`p-2.5 rounded-xl ${demande.bg} ${demande.color} shrink-0`}>
                <demande.icon size={20} />
              </div>
              
              <div className="flex flex-col min-w-0">
                <span className="font-[800] text-[15px] truncate text-white">{demande.nom}</span>
                <div className="flex items-center gap-2">
                  <span className="text-white/70 font-bold text-[11px] uppercase truncate">{demande.dates}</span>
                  <span className="text-[10px] font-[800] uppercase text-white/90">{demande.type}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div className="px-[25px] py-4 bg-black/10 mt-auto flex justify-between items-center">
        <span className="text-[11px] font-[800] text-white/80 uppercase">Total : 05</span>
        <button className="text-[10px] font-[900] bg-white text-[#a55eea] px-4 py-2 rounded-lg hover:bg-white/90 transition-colors uppercase tracking-wide">
          Gérer
        </button>
      </div>
    </div>
  );
}