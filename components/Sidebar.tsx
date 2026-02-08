"use client";

import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Truck, 
  Users, 
  CalendarDays, 
  Settings, 
  LogOut,
  Bell
} from 'lucide-react';

export default function Sidebar() {
  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", active: true, color: "text-white" },
    { icon: ShoppingCart, label: "Commandes", active: false, color: "hover:text-[#b8e994]" }, // Vert clair
    { icon: Truck, label: "Locations", active: false, color: "hover:text-[#74b9ff]" },      // Bleu clair
    { icon: Users, label: "Équipes", active: false, color: "hover:text-[#00b894]" },        // Vert vibrant
    { icon: CalendarDays, label: "Planning", active: false, color: "hover:text-[#feca57]" }, // Jaune
  ];

  return (
    // FOND BLEU STRUCTUREL #3d6674 - SANS BORDURE
    <div className="h-full w-[90px] bg-[#3d6674] flex flex-col items-center py-8 gap-8 shadow-2xl z-20 border-none">
      
      {/* LOGO : Rappel du Rouge Task */}
      <div className="relative group cursor-pointer">
        <div className="w-14 h-14 bg-white rounded-[20px] flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-all duration-300">
          <div className="w-7 h-7 bg-[#ff6b6b] rounded-lg rotate-45 group-hover:rotate-0 transition-all"></div>
        </div>
        {/* Badge de notification globale */}
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#ff3b30] border-2 border-[#3d6674] rounded-full flex items-center justify-center">
          <span className="text-[10px] font-black text-white">3</span>
        </div>
      </div>

      {/* NAVIGATION PRINCIPALE */}
      <div className="flex flex-col gap-5 w-full px-3">
        {menuItems.map((item, index) => (
          <div key={index} className="relative group">
            <button 
              className={`
                w-full aspect-square rounded-[22px] flex items-center justify-center transition-all duration-300
                ${item.active 
                  ? 'bg-white text-[#3d6674] shadow-xl scale-100' 
                  : `text-white/40 ${item.color} hover:bg-white/10 hover:scale-110`}
              `}
            >
              <item.icon size={26} strokeWidth={item.active ? 3 : 2} />
            </button>
            
            {/* Tooltip au survol */}
            <div className="absolute left-full ml-4 px-3 py-1 bg-slate-800 text-white text-[12px] font-bold rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* ACTIONS BAS DE PAGE */}
      <div className="mt-auto flex flex-col gap-4 w-full px-3">
        {/* Paramètres */}
        <button className="w-full aspect-square rounded-[22px] flex items-center justify-center text-white/40 hover:text-[#fd79a8] hover:bg-white/10 transition-all">
          <Settings size={24} />
        </button>
        
        {/* Déconnexion : Rappel du Rouge vibrant */}
        <button className="w-full aspect-square rounded-[22px] flex items-center justify-center text-[#ff8a75] hover:bg-[#ff6b6b] hover:text-white transition-all shadow-sm">
          <LogOut size={24} />
        </button>
      </div>

      {/* PETIT INDICATEUR DE VERSION / NOM */}
      <div className="mt-4">
        <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center border border-white/10">
          <span className="text-[10px] font-black text-white/40 uppercase">N</span>
        </div>
      </div>

    </div>
  );
}