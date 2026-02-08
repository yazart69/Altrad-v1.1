"use client";

import React from 'react';
import { Bell } from 'lucide-react';

export default function EventsListTile() {
  const nextEvents = [
    { time: "14:00", title: "Réunion de chantier", type: "reunion", color: "#f1c40f" },
    { time: "16:30", title: "Réception matériaux", type: "reception", color: "#2ecc71" },
  ];

  return (
    <div className="col-span-6 bg-[#fff9f2] rounded-[25px] flex items-center px-[30px] py-4 shadow-sm border border-[#fcecd7] font-['Fredoka']">
      <div className="flex items-center gap-6 w-full">
        {/* Titre de la tuile fine */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="p-2 bg-orange-100 rounded-lg text-[#ff8a75]">
            <Bell size={18} />
          </div>
          <span className="font-[800] text-[#5d4037] uppercase text-[14px] tracking-wide">À venir</span>
        </div>

        {/* Séparateur vertical */}
        <div className="w-[1px] h-8 bg-[#fcecd7]"></div>

        {/* Liste horizontale des événements */}
        <div className="flex gap-8 overflow-x-auto no-scrollbar">
          {nextEvents.map((evt, idx) => (
            <div key={idx} className="flex items-center gap-3 whitespace-nowrap">
              <span className="text-[14px] font-[900] text-[#5d4037] opacity-60">{evt.time}</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: evt.color }}></div>
                <span className="text-[15px] font-[700] text-[#5d4037]">{evt.title}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}