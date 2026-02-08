"use client";

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function CalendarTile() {
  const [date] = useState(new Date());
  const monthName = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const today = new Date().getDate();
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  let startDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  startDay = startDay === 0 ? 6 : startDay - 1; 
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="h-full w-full bg-[#feca57] rounded-[25px] flex flex-col shadow-sm overflow-hidden border-none font-['Fredoka'] text-slate-900">
      
      {/* HEADER COMPACT */}
      <div className="px-[25px] pt-3 pb-0 flex justify-between items-center shrink-0">
        <h2 className="font-[900] text-[20px] uppercase tracking-tight text-slate-900">{monthName}</h2>
        <div className="flex gap-1 bg-black/5 p-0.5 rounded-lg">
          <button className="p-0.5 hover:bg-white rounded-md transition-colors"><ChevronLeft size={18} strokeWidth={3} /></button>
          <button className="p-0.5 hover:bg-white rounded-md transition-colors"><ChevronRight size={18} strokeWidth={3} /></button>
        </div>
      </div>

      <div className="flex-1 px-[15px] pb-1 flex flex-col min-h-0">
        {/* JOURS SEMAINE - TRÈS SERRÉS */}
        <div className="grid grid-cols-7 mb-0.5 text-center">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
            <span key={i} className={`text-[11px] font-[900] uppercase ${i >= 5 ? 'text-white' : 'text-slate-800/40'}`}>
              {day}
            </span>
          ))}
        </div>

        {/* GRILLE SANS GAP ET HAUTEUR RÉDUITE */}
        <div className="grid grid-cols-7 gap-0 text-center flex-1 items-stretch">
          {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`}></div>)}
          
          {daysArray.map((day) => {
            const isToday = day === today;
            return (
              <div 
                key={day} 
                className={`flex items-center justify-center cursor-pointer transition-all relative
                  ${isToday ? 'bg-white text-[#feca57] shadow-sm font-black rounded-lg scale-90' : 'hover:bg-white/20 text-slate-900 font-bold rounded-md'}
                `}
                style={{ height: '100%', minHeight: '24px' }}
              >
                <span className="text-[14px] leading-none">{day}</span>
                
                {[2, 6, 15, 24].includes(day) && !isToday && (
                  <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-white"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}