"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  HardHat, 
  ClipboardList, 
  CalendarRange, 
  CalendarDays, 
  ShieldCheck, 
  Factory, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  LogOut, 
  Clock 
} from 'lucide-react';

export default function Sidebar() {
  // État local pour gérer l'ouverture/fermeture automatique au survol
  const [isCollapsed, setIsCollapsed] = useState(true);
  const pathname = usePathname();

  const menuItems = [
    { name: 'Tableau de bord', icon: LayoutDashboard, path: '/' },
    { name: 'Planning Hebdo', icon: CalendarDays, path: '/planning' },
    { name: 'Pointage', icon: Clock, path: '/pointage' },
    { name: 'Planning de charge', icon: CalendarRange, path: '/planning-charge' },
    { name: 'Chantiers', icon: Factory, path: '/chantier' }, 
    { name: 'Équipes & RH', icon: Users, path: '/equipe' },
    { name: 'Matériel & Logistique', icon: HardHat, path: '/materiel' },
    { name: 'HSE', icon: ShieldCheck, path: '/hse' }, // Renommé ici
    { name: 'Rapports', icon: ClipboardList, path: '/rapports' },
  ];

  const bottomItems = [
    { name: 'Paramètres', icon: Settings, path: '/parametres' },
  ];

  return (
    <div 
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
      className={`h-screen sticky top-0 bg-[#1e293b] border-r border-white/5 flex flex-col justify-between transition-all duration-500 ease-in-out font-['Fredoka'] shadow-2xl z-[100] ${
        isCollapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* HEADER / LOGO */}
      <div className={`p-6 flex items-center min-h-[100px] ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed && (
          <div className="animate-in fade-in zoom-in duration-300 whitespace-nowrap overflow-hidden">
            <h1 className="text-2xl font-black uppercase tracking-tighter text-white">
              Altrad<span className="text-red-500">.OS</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">by YAZ'ART69</p>
          </div>
        )}
        {isCollapsed && (
          <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center font-black text-white text-xl animate-in fade-in duration-300">
            A
          </div>
        )}
      </div>

      {/* NAVIGATION PRINCIPALE */}
      <nav className="flex-1 px-3 space-y-2 overflow-y-auto custom-scrollbar overflow-x-hidden pt-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex items-center gap-4 p-3.5 rounded-2xl transition-all group relative ${
                isActive 
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              } ${isCollapsed ? 'justify-center' : ''}`}
            >
              <item.icon size={22} className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white group-hover:scale-110 transition-transform'}`} />
              
              {!isCollapsed && (
                <span className="font-bold text-xs uppercase tracking-widest whitespace-nowrap animate-in slide-in-from-left-2 duration-300">
                  {item.name}
                </span>
              )}

              {/* Tooltip au survol quand réduit */}
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-white text-slate-900 text-[10px] font-black uppercase rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl border border-slate-200">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* FOOTER / USER */}
      <div className="p-3 border-t border-white/5 space-y-2 mb-4">
        {bottomItems.map((item) => (
          <Link 
            key={item.path} 
            href={item.path}
            className={`flex items-center gap-4 p-3 rounded-2xl text-slate-400 hover:bg-white/5 hover:text-white transition-all group relative ${isCollapsed ? 'justify-center' : ''}`}
          >
            <item.icon size={22} />
            {!isCollapsed && (
              <span className="font-bold text-[11px] uppercase tracking-widest whitespace-nowrap">
                {item.name}
              </span>
            )}
          </Link>
        ))}
        
        <button className={`w-full flex items-center gap-4 p-3 rounded-2xl text-red-400 hover:bg-red-500/10 hover:text-red-500 transition-all ${isCollapsed ? 'justify-center' : ''}`}>
          <LogOut size={22} />
          {!isCollapsed && (
            <span className="font-bold text-[11px] uppercase tracking-widest whitespace-nowrap">
              Déconnexion
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
