"use client";

import React from 'react';
import { TrendingUp } from 'lucide-react';

export default function StatsTile() {
  const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil"];
  
  return (
    <div className="col-span-6 row-span-3 bg-white rounded-[25px] shadow-sm border border-slate-100 flex flex-col font-['Fredoka'] overflow-hidden relative">
      
      {/* PADDING DE SÉCURITÉ (p-[30px]) 
          Tout le contenu (Texte, Graphique, Barre) est poussé vers l'intérieur.
          Rien ne peut toucher le bord blanc.
      */}
      <div className="flex-1 flex flex-col justify-between p-[30px] w-full h-full">
        
        {/* 1. EN-TÊTE (TITRES) */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <h3 className="text-slate-400 font-[700] text-[12px] uppercase tracking-widest">
              Suivi Global
            </h3>
            <h2 className="text-[#34495e] font-[700] text-[18px] uppercase leading-tight">
              Avancement des <br/> Chantiers en cours
            </h2>
          </div>
          
          {/* Badge +12% */}
          <div className="flex items-center gap-2 bg-[#fff0ed] px-3 py-1.5 rounded-full border border-[#ff8a75]/20">
            <TrendingUp size={16} className="text-[#ff8a75]" />
            <span className="text-[#ff8a75] font-[700] text-[11px]">
              +12%
            </span>
          </div>
        </div>

        {/* 2. GRAPHIQUE (Centre) */}
        <div className="flex-1 w-full relative min-h-0 my-2">
          <svg 
            viewBox="0 0 300 100" 
            className="w-full h-full overflow-visible" 
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="gradientCurve" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#ff8a75" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#ff8a75" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Remplissage */}
            <path 
              d="M10,100 L10,60 C50,50 60,70 100,55 S150,30 190,40 S260,10 290,20 L290,100 Z" 
              fill="url(#gradientCurve)" 
            />

            {/* Ligne */}
            <path 
              d="M10,60 C50,50 60,70 100,55 S150,30 190,40 S260,10 290,20" 
              fill="none" 
              stroke="#ff8a75" 
              strokeWidth="3" 
              strokeLinecap="round"
              className="drop-shadow-md"
            />

            {/* Points */}
            <circle cx="100" cy="55" r="4" fill="white" stroke="#ff8a75" strokeWidth="2.5" />
            <circle cx="190" cy="40" r="4" fill="white" stroke="#ff8a75" strokeWidth="2.5" />
            <circle cx="290" cy="20" r="4" fill="white" stroke="#ff8a75" strokeWidth="2.5" />
          </svg>
        </div>

        {/* 3. PIED DE TUILE (Mois + Barre Verte) */}
        <div className="flex flex-col gap-3">
          {/* Textes Mois */}
          <div className="flex justify-between w-full text-slate-300 font-bold text-[11px] uppercase px-1">
            {months.map((m, i) => (
              <span key={i}>{m}</span>
            ))}
          </div>

          {/* Barre Verte (Visible en bas, marge incluse) */}
          <div className="w-full h-[6px] bg-[#f0f3f4] rounded-full overflow-hidden relative">
            <div className="absolute left-0 top-0 bottom-0 w-[65%] bg-[#2ecc71] rounded-full shadow-sm"></div>
          </div>
        </div>

      </div>
    </div>
  );
}