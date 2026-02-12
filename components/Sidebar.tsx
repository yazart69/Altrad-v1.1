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
  // État local pour gérer l'ouverture/fermeture
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    { name: 'Tableau de bord', icon: LayoutDashboard, path: '/' },
    { name: 'Planning Hebdo', icon: CalendarDays, path: '/planning' },
    { name: 'Pointage', icon: Clock, path: '/pointage' },
    { name: 'Planning de charge', icon: CalendarRange, path: '/planning-charge' },
    { name: 'Chantiers', icon: Factory, path: '/chantier' }, 
    { name: 'Équipes & RH', icon: Users, path: '/equipe' },
    { name: 'Matériel & Logistique', icon: HardHat, path: '/materiel' },
    { name: 'HSE & Sécurité', icon: ShieldCheck, path: '/hse' },
    { name: 'Rapports', icon: ClipboardList, path: '/rapports' },
  ];

  const bottomItems = [
    { name: 'Paramètres', icon: Settings, path: '/parametres' },
  ];

  return (
    // LA CORRECTION EST ICI : 
    // On retire la largeur fixe du parent et on laisse le composant gérer sa propre largeur via style inline ou classes dynamiques
    // Note : Le parent dans layout.tsx devra être flexible (width: auto)
    <div 
      className={`h-full bg-white border-r border-gray-100 flex flex-col justify-between transition-all duration-300 ease-in-out font-['Fredoka'] ${
        isCollapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* HEADER / LOGO */}
      <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed && (
          <div className="animate-in fade-in duration-300 whitespace-nowrap overflow-hidden">
            <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900">
              Altrad<span className="text-red-600">.OS</span>
            </h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">by YAZ'ART69</p>
          </div>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-black transition-colors shrink-0"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* NAVIGATION PRINCIPALE */}
      <nav className="flex-1 px-3 space-y-2 overflow-y-auto custom-scrollbar overflow-x-hidden">
        {menuItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex items-center gap-4 p-3 rounded-2xl transition-all group relative ${
                isActive 
                  ? 'bg-black text-white shadow-lg shadow-black/20' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-black'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? item.name : ''}
            >
              <item.icon size={22} className={`shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-black'}`} />
              
              {!isCollapsed && (
                <span className="font-bold text-sm uppercase tracking-wide whitespace-nowrap animate-in fade-in duration-200">
                  {item.name}
                </span>
              )}

              {/* Tooltip au survol quand réduit */}
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-black text-white text-xs font-bold uppercase rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* FOOTER / USER */}
      <div className="p-3 border-t border-gray-100 space-y-2">
        {bottomItems.map((item) => (
          <Link 
            key={item.path} 
            href={item.path}
            className={`flex items-center gap-4 p-3 rounded-2xl text-gray-400 hover:bg-gray-50 hover:text-black transition-all group relative ${isCollapsed ? 'justify-center' : ''}`}
          >
            <item.icon size={22} />
            {!isCollapsed && (
              <span className="font-bold text-sm uppercase tracking-wide whitespace-nowrap">
                {item.name}
              </span>
            )}
          </Link>
        ))}
        
        <button className={`w-full flex items-center gap-4 p-3 rounded-2xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-all ${isCollapsed ? 'justify-center' : ''}`}>
          <LogOut size={22} />
          {!isCollapsed && (
            <span className="font-bold text-sm uppercase tracking-wide whitespace-nowrap">
              Déconnexion
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
