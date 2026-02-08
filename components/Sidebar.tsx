"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, CalendarDays, Settings, LogOut } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={22} />, path: '/' },
    { name: 'Planning', icon: <CalendarDays size={22} />, path: '/planning' },
    { name: 'Achats & SAP', icon: <ShoppingCart size={22} />, path: '/commandes' },
    { name: 'Réglages', icon: <Settings size={22} />, path: '/reglages' },
  ];

  return (
    <div className="h-full w-[250px] bg-white rounded-[30px] flex flex-col p-6 shadow-sm font-['Fredoka'] ml-4 my-4 border border-gray-100">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-10 h-10 bg-[#d63031] rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-red-200">
          A
        </div>
        <span className="text-xl font-black uppercase text-gray-800 tracking-tight">Altrad <span className="text-[#d63031]">V2</span></span>
      </div>

      {/* Menu Navigation */}
      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 font-bold text-[14px] ${
                isActive 
                  ? 'bg-black text-white shadow-lg scale-105' 
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
              }`}
            >
              {item.icon}
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Déconnexion */}
      <div className="mt-auto pt-6 border-t border-gray-100">
         <button className="flex items-center gap-4 px-4 py-3 rounded-2xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors w-full font-bold text-[14px]">
            <LogOut size={22} />
            Déconnexion
         </button>
      </div>
    </div>
  );
}
