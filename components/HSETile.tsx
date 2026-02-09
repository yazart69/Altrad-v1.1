"use client";

import React from 'react';
import { ShieldCheck, ClipboardCheck, Siren, Activity, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function HSETile() {
  return (
    <Link href="/hse" className="block h-full w-full">
      <div className="h-full w-full bg-[#2d3436] rounded-[25px] p-6 flex flex-col shadow-xl text-white font-['Fredoka'] relative overflow-hidden group border border-gray-700 hover:border-[#ff9f43] transition-all">
        
        {/* HEADER */}
        <div className="relative z-10 flex justify-between items-start mb-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-1">
              <div className="bg-[#ff9f43] p-2 rounded-lg text-black shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform">
                <ShieldCheck size={20} fill="currentColor" />
              </div>
              <h2 className="text-[20px] font-[900] uppercase leading-none tracking-tighter">
                HSE <span className="text-[#ff9f43]">& Sécurité</span>
              </h2>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide ml-1">
              Prévention & Conformité
            </p>
          </div>
          
          <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 animate-pulse">
            <Activity size={10} /> Site Conforme
          </span>
        </div>

        {/* CONTENU INDICATEURS */}
        <div className="relative z-10 grid grid-cols-2 gap-4 flex-1 items-center">
          {/* Indicateur 1 */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5 hover:bg-white/10 transition-colors h-full flex flex-col justify-center">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black uppercase text-gray-400">Démarrages</span>
              <ClipboardCheck size={16} className="text-[#ff9f43]" />
            </div>
            <div className="flex items-baseline gap-1">
              <p className="text-3xl font-black leading-none">3</p>
              <span className="text-[9px] font-bold text-gray-500 uppercase">En attente</span>
            </div>
          </div>

          {/* Indicateur 2 */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5 hover:bg-white/10 transition-colors h-full flex flex-col justify-center">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black uppercase text-gray-400">Causeries</span>
              <Siren size={16} className="text-blue-400" />
            </div>
             <div className="flex items-baseline gap-1">
              <p className="text-3xl font-black leading-none">12</p>
              <span className="text-[9px] font-bold text-gray-500 uppercase">Réalisées</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="relative z-10 mt-4 flex items-center justify-between border-t border-white/10 pt-3">
           <span className="text-[10px] font-bold text-gray-400 uppercase">Accéder au module</span>
           <div className="bg-[#ff9f43] p-1.5 rounded-full text-black group-hover:translate-x-1 transition-transform">
             <ArrowRight size={14} />
           </div>
        </div>

        {/* DÉCO FOND */}
        <ShieldCheck size={180} className="absolute -right-8 -bottom-12 opacity-5 -rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none" />
      </div>
    </Link>
  );
}
