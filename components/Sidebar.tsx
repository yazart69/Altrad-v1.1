"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  CalendarDays, 
  Users, 
  Settings, 
  LogOut,
  ShieldAlert
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  // Liste des menus incluant le nouveau module "Effectifs"
  const menuItems = [
    { 
      name: 'Dashboard', 
      icon: <LayoutDashboard size={22} />, 
      path: '/' 
    },
    { 
      name: 'Planning', 
      icon: <CalendarDays size={22} />, 
      path: '/planning' 
    },
    { 
      name: 'Effectifs', 
      icon: <Users size={22} />, 
      path: '/equipe' // Le nouveau lien vers ta gestion RH/Conformité
    },
    { 
      name: 'Achats & SAP', 
      icon: <ShoppingCart size={22} />, 
      path: '/commandes' 
    },
    { 
      name: 'Réglages', 
      icon: <Settings size={22} />, 
      path: '/reglages' 
    },
  ];

  return (
    <div className="h-full w-[260px] bg-white rounded-[30px] flex flex-col p-6 shadow-sm font-['Fredoka'] ml-4 my-4 border border-gray-100">
      
      {/* LOGO ALTRAD V2 */}
      <div className="flex items-center gap-3 mb-12 px-2">
        <div className="w-11 h-11 bg-[#d63031] rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-red-100">
          A
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-black uppercase text-gray-800 leading-none tracking-tighter">
            Altrad <span className="text-[#d63031]">V2</span>
          </span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
            Opérations
          </span>
        </div>
      </div>

      {/* NAVIGATION PRINCIPALE */}
      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-200 font-bold text-[14px] relative group ${
                isActive 
                  ? 'bg-black text-white shadow-xl scale-[1.02]' 
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <span className={`${isActive ? 'text-[#ff9f43]' : 'group-hover:text-gray-600'}`}>
                {item.icon}
              </span>
              {item.name}
              
              {/* Indicateur visuel pour la page active */}
              {isActive && (
                <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-[#ff9f43]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* SECTION ALERTES CRITIQUES (Petit rappel visuel en bas de menu) */}
      <div className="mb-6 p-4 bg-red-50 rounded-2xl border border-red-100">
        <div className="flex items-center gap-2 text-red-600 mb-1">
          <ShieldAlert size={16} />
          <span className="text-[10px] font-black uppercase tracking-wider">Sécurité RH</span>
        </div>
        <p className="text-[9px] text-red-400 font-bold leading-tight">
          Vérifiez les documents expirés dans le module Effectifs.
        </p>
      </div>

      {/* FOOTER / LOGOUT */}
      <div className="pt-6 border-t border-gray-100">
         <button className="flex items-center gap-4 px-4 py-3 rounded-2xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all w-full font-bold text-[14px] group">
            <LogOut size={22} className="group-hover:rotate-12 transition-transform" />
            Déconnexion
         </button>
      </div>
    </div>
  );
}
