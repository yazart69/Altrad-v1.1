"use client";

import React from 'react';
import { MoreHorizontal, Clock, AlertTriangle } from 'lucide-react';

export default function BudgetHeuresTile() {
  const projets = [
    { nom: "Chantier Résidence Azur", consomme: 450, total: 1200 },
    { nom: "Rénovation École Primaire", consomme: 950, total: 1000 },
    { nom: "Extension Bureaux Altrad", consomme: 620, total: 500 },
  ];

  return (
    // FOND ORANGE #ff9f43, TEXTE BLANC, SANS BORDURE
    <div className="h-full w-full bg-[#ff9f43] rounded-[25px] flex flex-col shadow-sm overflow-hidden border-none text-white font-['Fredoka']">
      
      {/* HEADER */}
      <div className="p-[25px] pb-4 flex justify-between items-start shrink-0">
        <div className="flex flex-col">
          <span className="opacity-80 text-[11px] font-[700] uppercase tracking-[0.15em] leading-none">
            Suivi Budget
          </span>
          <h2 className="font-[800] text-[22px] uppercase leading-[1.1] mt-2">
            Heures <br/> Chantiers
          </h2>
        </div>
        <button className="p-2 hover:bg-white/20 rounded-full text-white transition-colors -mr-2 -mt-2">
          <MoreHorizontal size={26} />
        </button>
      </div>

      {/* CONTENU */}
      <div className="flex-1 px-[25px] overflow-y-auto custom-scrollbar space-y-6 py-2">
        {projets.map((projet, idx) => {
          const percent = (projet.consomme / projet.total) * 100;
          const isOver = percent >= 100;
          
          // Sur fond orange, on utilise du blanc pour la barre, ou du rouge foncé pour l'alerte
          const barColor = isOver ? '#ff6b6b' : 'white'; 

          return (
            <div key={idx} className="flex flex-col gap-2">
              <div className="flex justify-between items-end">
                <div className="flex flex-col max-w-[65%]">
                  {isOver && (
                    <div className="flex items-center gap-1 text-red-600 bg-white/90 px-2 py-0.5 rounded-md w-fit animate-pulse mb-1 shadow-sm">
                      <AlertTriangle size={10} strokeWidth={3} />
                      <span className="text-[9px] font-[900] uppercase tracking-tighter">Dépassement</span>
                    </div>
                  )}
                  <span className="font-[800] text-[13px] uppercase tracking-tight truncate text-white">
                    {projet.nom}
                  </span>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <span className={`font-[900] text-[14px] ${isOver ? 'text-white' : 'text-white'}`}>
                    {projet.consomme}h
                  </span>
                  <span className="text-white/60 font-bold text-[10px]">
                    / {projet.total}h
                  </span>
                </div>
              </div>
              
              {/* Barre de progression : Track blanc transparent, Barre blanche ou rouge */}
              <div className="w-full h-[10px] bg-black/10 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-1000 shadow-sm"
                  style={{ 
                    width: `${Math.min(percent, 100)}%`,
                    backgroundColor: barColor 
                  }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER */}
      <div className="px-[25px] py-4 bg-black/10 mt-auto flex items-center gap-2 text-white/70">
        <Clock size={14} />
        <span className="text-[10px] font-[800] uppercase tracking-wide">
          Mise à jour : il y a 2h
        </span>
      </div>
    </div>
  );
}