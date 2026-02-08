"use client";

import React from 'react';
import { MoreHorizontal } from 'lucide-react';

export default function TeamTile() {
  const stats = [
    { label: "Interne", val: 42, color: "text-[#feca57]" }, 
    { label: "Intérim", val: 25, color: "text-[#ff6b6b]" }, 
    { label: "Sous-traitant", val: 19, color: "text-[#54a0ff]" },
    { label: "Altrad Autres", val: 14, color: "text-[#ff9ff3]" }, 
  ];

  return (
    // FOND VERT #00b894, TEXTE BLANC, SANS BORDURE
    <div className="h-full w-full bg-[#00b894] rounded-[25px] flex flex-col shadow-sm overflow-hidden border-none text-white">
      
      {/* HEADER */}
      <div className="p-[25px] pb-4 flex justify-between items-start shrink-0">
        <div className="flex flex-col">
          <span className="opacity-90 text-[11px] font-[700] uppercase tracking-[0.15em] leading-none">
            Effectifs
          </span>
          <h2 className="font-[800] text-[22px] uppercase leading-[1.1] mt-2">
            Répartition <br/> Équipes
          </h2>
        </div>
        <button className="p-2 hover:bg-white/20 rounded-full transition-colors -mr-2 -mt-2">
          <MoreHorizontal size={26} color="white" />
        </button>
      </div>

      {/* CONTENU */}
      <div className="flex-1 px-[25px] flex items-center justify-between pb-4">
        
        {/* DONUT CORRIGÉ (CSS Conic Gradient) */}
        <div className="relative w-[110px] h-[110px] rounded-full flex items-center justify-center shrink-0"
             style={{
               background: `conic-gradient(
                 #feca57 0% 42%, 
                 #ff6b6b 42% 67%, 
                 #54a0ff 67% 86%, 
                 #ff9ff3 86% 100%
               )`
             }}
        >
          {/* Cercle intérieur pour faire l'effet Donut */}
          <div className="w-[70px] h-[70px] bg-[#00b894] rounded-full flex flex-col items-center justify-center text-center z-10">
             <span className="text-[24px] font-[900] leading-none">142</span>
             <span className="text-[9px] font-[700] uppercase opacity-80">Total</span>
          </div>
        </div>

        {/* LÉGENDE */}
        <div className="flex flex-col gap-2 flex-1 pl-6">
          {stats.map((s, i) => (
            <div key={i} className="flex justify-between items-center w-full">
              <span className={`text-[11px] font-[800] uppercase opacity-90 truncate ${s.color} brightness-150`}>
                {s.label}
              </span>
              <span className="text-[14px] font-[900]">{s.val}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}