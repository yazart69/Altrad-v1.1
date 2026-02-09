"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Search, MapPin, Plus, ArrowRight, Building2, HardHat } from 'lucide-react';

export default function ChantiersList() {
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    async function fetchChantiers() {
      const { data } = await supabase.from('chantiers').select('*').order('created_at', { ascending: false });
      if (data) setChantiers(data);
      setLoading(false);
    }
    fetchChantiers();
  }, []);

  const filtered = chantiers.filter(c => c.nom.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#f0f3f4] font-['Fredoka'] p-4 md:p-8 text-gray-800 ml-0 md:ml-64 transition-all">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
           <h1 className="text-3xl font-black uppercase text-[#2d3436]">Annuaire <span className="text-[#00b894]">Chantiers</span></h1>
           <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">Gérer les projets et les accès</p>
        </div>
        <Link href="/chantier/nouveau">
            <button className="bg-[#00b894] hover:bg-[#00a383] text-white px-6 py-3 rounded-xl font-bold uppercase shadow-lg shadow-emerald-200 flex items-center gap-2 transition-all hover:scale-105">
                <Plus size={20} /> Nouveau Chantier
            </button>
        </Link>
      </div>

      {/* RECHERCHE */}
      <div className="bg-white p-4 rounded-[20px] shadow-sm mb-6 flex items-center gap-3 border border-gray-100">
        <Search className="text-gray-400" />
        <input 
            type="text" 
            placeholder="Rechercher un chantier, une ville..." 
            className="flex-1 outline-none font-bold text-gray-700 placeholder-gray-300"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {/* GRILLE */}
      {loading ? (
        <div className="text-center font-bold text-gray-400 mt-10">Chargement...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((chantier) => (
                <Link href={`/chantier/${chantier.id}`} key={chantier.id} className="group">
                    <div className="bg-white rounded-[25px] p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all h-full flex flex-col relative overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                            <div className="bg-emerald-50 p-3 rounded-2xl text-[#00b894]">
                                <Building2 size={24} />
                            </div>
                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${
                                chantier.statut === 'en_cours' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                            }`}>
                                {chantier.statut}
                            </span>
                        </div>
                        
                        <h3 className="text-xl font-black uppercase text-gray-800 mb-1 leading-tight group-hover:text-[#00b894] transition-colors">{chantier.nom}</h3>
                        <div className="flex items-center gap-1 text-gray-400 text-xs font-bold uppercase mb-4">
                            <MapPin size={12} /> {chantier.adresse || 'Non localisé'}
                        </div>

                        <div className="mt-auto pt-4 border-t border-gray-50 flex justify-between items-center text-xs font-bold text-gray-500 uppercase">
                            <span>Client : {chantier.client || 'N/A'}</span>
                            <div className="bg-black/5 p-1.5 rounded-full group-hover:bg-[#00b894] group-hover:text-white transition-colors">
                                <ArrowRight size={16} />
                            </div>
                        </div>

                        {/* Déco fond */}
                        <HardHat size={100} className="absolute -right-5 -bottom-5 text-gray-50 -rotate-12 group-hover:rotate-0 transition-transform duration-500 pointer-events-none" />
                    </div>
                </Link>
            ))}
        </div>
      )}
    </div>
  );
}
