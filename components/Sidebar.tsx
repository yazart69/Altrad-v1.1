"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  HardHat, 
  CalendarDays, 
  ClipboardCheck, 
  Users, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Menu
} from 'lucide-react';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Tableau de bord', href: '/' },
    { icon: HardHat, label: 'Chantiers', href: '/chantiers' }, // LIEN MIS À JOUR
    { icon: CalendarDays, label: 'Planning', href: '/planning-charge' }, // Vers la vue globale
    { icon: Users, label: 'Équipes', href: '/equipe' },
    { icon: ClipboardCheck, label: 'HSE / Qualité', href: '/hse' },
    { icon: Settings, label: 'Paramètres', href: '/parametres' },
  ];

  return (
    <>
      {/* MOBILE TRIGGER */}
      <button 
        className="md:hidden fixed top-4 left-4 z-50 bg-[#2d3436] text-white p-2 rounded-lg shadow-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <Menu size={24} />
      </button>

      {/* SIDEBAR CONTAINER */}
      <div className={`
        fixed inset-y-0 left-0 z-40 bg-[#2d3436] text-white transition-all duration-300 ease-in-out flex flex-col font-['Fredoka']
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${collapsed ? 'w-20' : 'w-64'}
      `}>
        
        {/* HEADER */}
        <div className="h-20 flex items-center justify-center border-b border-gray-700 relative">
          <h1 className={`font-black text-2xl tracking-tighter text-[#00b894] transition-opacity duration-200 ${collapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>
            BTP<span className="text-white">MANAGER</span>
          </h1>
          {collapsed && <span className="font-black text-2xl text-[#00b894]">B</span>}
          
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-8 bg-[#00b894] rounded-full p-1 text-white shadow-md hidden md:block hover:scale-110 transition-transform"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* MENU */}
        <nav className="flex-1 py-6 space-y-2 px-3 overflow-y-auto custom-scrollbar">
          {menuItems.map((item, index) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link 
                key={index} 
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group
                  ${isActive 
                    ? 'bg-[#00b894] text-white shadow-lg shadow-emerald-900/20' 
                    : 'text-gray-400 hover:bg-white/10 hover:text-white'}
                `}
              >
                <item.icon size={22} className={`shrink-0 ${isActive ? 'animate-pulse' : ''}`} />
                {!collapsed && (
                  <span className="font-bold text-sm tracking-wide">{item.label}</span>
                )}
                
                {/* TOOLTIP ON COLLAPSE */}
                {collapsed && (
                  <div className="absolute left-16 bg-black/80 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* FOOTER */}
        <div className="p-4 border-t border-gray-700">
          <button className={`
            flex items-center gap-3 w-full p-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-colors
            ${collapsed ? 'justify-center' : ''}
          `}>
            <LogOut size={20} />
            {!collapsed && <span className="font-bold text-sm">Déconnexion</span>}
          </button>
        </div>
      </div>

      {/* OVERLAY MOBILE */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
