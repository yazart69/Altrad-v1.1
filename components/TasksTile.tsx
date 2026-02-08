"use client";

import React, { useState } from 'react';
import { MoreHorizontal, CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';

export default function TasksTile() {
  const [tasks, setTasks] = useState([
    { id: 1, text: "Appeler intérim (Renfort Vichy)", priority: "haute", done: false, date: "Aujourd'hui" },
    { id: 2, text: "Valider pointage semaine 06", priority: "moyenne", done: true, date: "Hier" },
    { id: 3, text: "Prévoir EPI pour nouveaux arrivants", priority: "haute", done: false, date: "Demain" },
    { id: 4, text: "Réunion planning Altrad Autres", priority: "basse", done: false, date: "12 Fév." },
  ]);

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  return (
    // FOND ROUGE #ff6b6b, TEXTE BLANC, SANS BORDURE
    <div className="h-full w-full bg-[#ff6b6b] rounded-[25px] flex flex-col shadow-sm overflow-hidden border-none text-white">
      
      {/* HEADER */}
      <div className="p-[25px] pb-4 flex justify-between items-start shrink-0">
        <div className="flex flex-col">
          <span className="opacity-80 text-[11px] font-[700] uppercase tracking-[0.15em] leading-none">
            Opérations
          </span>
          <h2 className="font-[800] text-[22px] uppercase leading-[1.1] mt-2">
            Actions <br/> Prioritaires
          </h2>
        </div>
        <button className="p-2 hover:bg-white/20 rounded-full transition-colors -mr-2 -mt-2">
          <MoreHorizontal size={26} color="white" />
        </button>
      </div>

      {/* LISTE */}
      <div className="flex-1 px-[25px] overflow-y-auto custom-scrollbar space-y-3 pb-4">
        {tasks.map((task) => (
          <div 
            key={task.id}
            onClick={() => toggleTask(task.id)}
            className={`
              group flex items-center p-4 rounded-[20px] cursor-pointer transition-all border-none
              ${task.done ? 'bg-black/20' : 'bg-white/20 hover:bg-white/30 shadow-sm'}
            `}
          >
            <div className="mr-4 group-hover:scale-110 transition-transform">
              {task.done ? <CheckCircle2 size={24} color="white" /> : <Circle size={24} color="white" className="opacity-70" />}
            </div>

            <div className="flex-1 min-w-0">
              <p className={`text-[14px] font-[800] truncate ${task.done ? 'line-through opacity-50' : ''}`}>
                {task.text}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1 text-[10px] font-bold opacity-90 uppercase">
                  <Clock size={12} /> {task.date}
                </div>
                <div className={`
                  px-2 py-0.5 rounded-full text-[9px] font-[900] uppercase bg-white
                  ${task.priority === 'haute' ? 'text-[#ff6b6b]' : 'text-slate-800'}
                `}>
                  {task.priority}
                </div>
              </div>
            </div>

            {!task.done && task.priority === 'haute' && (
              <AlertCircle size={16} className="animate-pulse ml-2 text-white" />
            )}
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div className="px-[25px] py-4 bg-black/10 mt-auto flex items-center justify-between">
        <div className="flex -space-x-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-6 h-6 rounded-full border-2 border-[#ff6b6b] bg-white text-[#ff6b6b] flex items-center justify-center text-[10px] font-bold">
              {String.fromCharCode(64 + i)}
            </div>
          ))}
        </div>
        <span className="text-[11px] font-[800] uppercase opacity-90">
          {tasks.filter(t => t.done).length} / {tasks.length} complétées
        </span>
      </div>
    </div>
  );
}