"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  User, FileWarning, ShieldCheck, HeartPulse, 
  Search, Plus, ArrowRight, CheckCircle2 
} from 'lucide-react';

export default function EquipePage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('tous'); // 'tous', 'incomplet', 'caces', 'visite'
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function getStaff() {
      const { data } = await supabase.from('employes').select('*').order('nom');
      if (data) setStaff(data);
      setLoading(false);
    }
    getStaff();
  }, []);

  // --- LOGIQUE DE FILTRAGE ---
  const filteredStaff = staff.filter(e => {
    // Filtre par recherche texte
    const matchesSearch = e.nom.toLowerCase().includes(search.toLowerCase()) || 
                          e.prenom.toLowerCase().includes(search.toLowerCase());
    
    // Filtre par catégorie de bouton
    if (filter === 'incomplet') return matchesSearch && !e.dossier_complet;
    if (filter === 'caces') return matchesSearch && (e.caces_expire_le && new Date(e.caces_expire_le) < new Date());
    if (filter === 'visite') {
      if (!e.visite_med_expire_le) return false;
      const diff = (new Date(e.visite_med_expire_le).getTime() - new Date().getTime()) / (1000*3600*24);
      return matchesSearch && diff < 30;
    }
    return matchesSearch;
  });

  // --- CALCUL DES COMPTEURS ---
  const countIncomplet = staff.filter(e => !e.dossier_complet).length;
  const countCaces = staff.filter(e => e.caces_expire_le && new Date(e.caces_expire_le) < new Date()).length;
  const countVisite = staff.filter(e => {
    if (!e.visite_med_expire_le) return false;
    const diff = (new Date(e.visite_med_expire_le).getTime() - new Date().getTime()) / (1000*3600*24);
    return diff < 30;
  }).length;

  return (
    <div className="p-8 font-['Fredoka']">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase text-gray-800 tracking-tighter">Effectifs Altrad</h1>
          <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em]">Pilotage RH & Conformité</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Chercher un nom..." 
              className="pl-10 pr-4 py-3 bg-white rounded-2xl border-none shadow-sm text-sm font-bold w-full focus:ring-2 focus:ring-black transition-all"
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="bg-black text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 hover:bg-gray-800 transition-all">
            <Plus size={18} /> Nouveau
          </button>
        </div>
      </div>

      {/* --- BOUTONS FILTRES (CARTES) --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
        <button 
          onClick={() => setFilter('tous')}
          className={`p-6 rounded-[25px] border-2 transition-all text-left ${filter === 'tous' ? 'border-black bg-black text-white' : 'bg-white border-transparent shadow-sm'}`}
        >
          <p className={`font-black uppercase text-[10px] mb-2 ${filter === 'tous' ? 'text-gray-400' : 'text-gray-400'}`}>Total Effectif</p>
          <p className="text-3xl font-black">{staff.length}</p>
        </button>

        <button 
          onClick={() => setFilter('incomplet')}
          className={`p-6 rounded-[25px] border-2 transition-all text-left ${filter === 'incomplet' ? 'border-red-500 bg-red-500 text-white shadow-lg shadow-red-100' : 'bg-white border-transparent shadow-sm hover:bg-red-50'}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <FileWarning size={16} />
            <p className="font-black uppercase text-[10px]">Dossiers Incomplets</p>
          </div>
          <p className="text-3xl font-black">{countIncomplet}</p>
        </button>

        <button 
          onClick={() => setFilter('caces')}
          className={`p-6 rounded-[25px] border-2 transition-all text-left ${filter === 'caces' ? 'border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-100' : 'bg-white border-transparent shadow-sm hover:bg-orange-50'}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={16} />
            <p className="font-black uppercase text-[10px]">CACES Expirés</p>
          </div>
          <p className="text-3xl font-black">{countCaces}</p>
        </button>

        <button 
          onClick={() => setFilter('visite')}
          className={`p-6 rounded-[25px] border-2 transition-all text-left ${filter === 'visite' ? 'border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-100' : 'bg-white border-transparent shadow-sm hover:bg-blue-50'}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <HeartPulse size={16} />
            <p className="font-black uppercase text-[10px]">Visites Méd. Urgentes</p>
          </div>
          <p className="text-3xl font-black">{countVisite}</p>
        </button>
      </div>

      {/* --- TABLEAU DE RÉSULTATS --- */}
      <div className="bg-white rounded-[30px] shadow-sm overflow-hidden border border-gray-100">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="p-6 font-black uppercase text-[10px] text-gray-400">Collaborateur</th>
              <th className="p-6 font-black uppercase text-[10px] text-gray-400">Statut Dossier</th>
              <th className="p-6 font-black uppercase text-[10px] text-gray-400">CACES</th>
              <th className="p-6 font-black uppercase text-[10px] text-gray-400">Visite Méd.</th>
              <th className="p-6 font-black uppercase text-[10px] text-gray-400 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-10 text-center animate-pulse font-bold text-gray-300">Analyse des dossiers en cours...</td></tr>
            ) : filteredStaff.length === 0 ? (
              <tr><td colSpan={5} className="p-10 text-center font-bold text-gray-400 italic">Aucun collaborateur ne correspond à ce filtre.</td></tr>
            ) : (
              filteredStaff.map((e) => (
                <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-all group">
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-black text-gray-400 uppercase text-xs">
                        {e.nom.substring(0, 2)}
                      </div>
                      <div>
                        <p className="font-black text-gray-800 text-sm uppercase">{e.nom} {e.prenom}</p>
                        <p className="text-[10px] text-blue-500 font-bold uppercase tracking-tighter">{e.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    {e.dossier_complet ? 
                      <div className="flex items-center gap-1 text-green-600 font-black text-[10px] uppercase">
                        <CheckCircle2 size={14} /> OK
                      </div> :
                      <div className="flex items-center gap-1 text-red-500 font-black text-[10px] uppercase animate-pulse">
                        <FileWarning size={14} /> À compléter
                      </div>
                    }
                  </td>
                  <td className="p-6 text-xs font-bold">
                     <span className={e.caces_expire_le && new Date(e.caces_expire_le) < new Date() ? 'text-red-500 underline decoration-2' : 'text-gray-700'}>
                       {e.caces_expire_le ? new Date(e.caces_expire_le).toLocaleDateString() : '--'}
                     </span>
                  </td>
                  <td className="p-6 text-xs font-bold text-gray-700">
                    {e.visite_med_expire_le ? new Date(e.visite_med_expire_le).toLocaleDateString() : '--'}
                  </td>
                  <td className="p-6 text-right">
                    <Link href={`/equipe/${e.id}`} className="bg-gray-100 hover:bg-black hover:text-white p-2 px-4 rounded-xl transition-all font-black uppercase text-[9px] inline-flex items-center gap-2">
                      Détails <ArrowRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
