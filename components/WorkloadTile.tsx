"use client";

import React from 'react';
import { Users, TrendingUp, AlertTriangle } from 'lucide-react';

export default function WorkloadTile() {
  const data = [
    { label: "Cette Semaine", current: 14, target: 15, status: "ok" },
    { label: "Semaine +1", current: 17, target: 15, status: "warning", alert: "Transfert : +2 vers Vichy" },
    { label: "Dans 2 mois", current: 22, target: 15, status: "critical", alert: "Recruter : 7 Renforts" },
  ];

  return (
    <div className="h-full w-full bg-[#54a0ff] rounded-[25px] flex flex-col shadow-sm overflow-hidden border-none text-white font-['Fredoka']">
      
      {/* HEADER - Texte agrandi */}
      <div className="p-[25px] pb-4 flex justify-between items-start shrink-0">
        <div className="flex flex-col">
          <span className="opacity-80 text-[13px] font-[700] uppercase tracking-[0.15em] leading-none">
            Pilotage Effectifs
          </span>
          <h2 className="font-[800] text-[28px] uppercase leading-[1.1] mt-2">
            Prévisions <br/> & Besoins
          </h2>
        </div>
        <div className="flex items-center gap-1 bg-white/20 px-4 py-2 rounded-full border border-white/10">
          <Users size={16} className="text-white" />
          <span className="text-[13px] font-[800] text-white">15 Internes</span>
        </div>
      </div>

      {/* CONTENU - Texte agrandi */}
      <div className="flex-1 px-[25px] flex flex-col justify-center gap-6">
        {data.map((item, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="flex justify-between items-end border-b border-white/20 pb-2">
              <span className="text-[15px] font-[800] opacity-90 uppercase">{item.label}</span>
              <span className={`text-[16px] font-[900] ${item.current > item.target ? 'text-[#ff9ff3]' : 'text-[#81ecec]'}`}>
                {item.current} Gars <span className="opacity-60 text-[12px]">/ {item.target}</span>
              </span>
            </div>
            {item.alert && (
              <div className={`flex items-center gap-2 text-[12px] font-[800] uppercase mt-0.5
                ${item.status === 'critical' ? 'text-[#ff6b6b] bg-white/90 px-2 py-1 rounded-md' : 'text-[#ffeaa7]'}`}>
                <AlertTriangle size={14} strokeWidth={3} />
                {item.alert}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div className="px-[25px] py-5 bg-black/10 mt-auto border-none">
        <div className="flex gap-2">
          <TrendingUp size={18} className="text-white/60 shrink-0" />
          <p className="text-[12px] leading-snug text-white/80 font-medium">
            <span className="font-[900] text-white uppercase">Analyse :</span> Déficit critique prévu dans 60 jours.
          </p>
        </div>
      </div>
    </div>
  );
}