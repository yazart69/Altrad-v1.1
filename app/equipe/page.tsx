"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { User, FileWarning, Search, Plus, CheckCircle2, ChevronRight, X } from 'lucide-react';

export default function EquipePage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('tous'); // 'tous' ou 'incomplet'
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEmp, setNewEmp] = useState({ nom: '', prenom: '', role: 'Ouvrier' });

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from('employes').select('*').order('nom');
    if (data) setStaff(data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    if (!newEmp.nom) return;
    const { error } = await supabase.from('employes').insert([newEmp]);
    if (!error) { setIsModalOpen(false); fetchData(); }
  };

  const filteredStaff = staff.filter(e => {
    const matchesSearch = `${e.nom} ${e.prenom}`.toLowerCase().includes(search.toLowerCase());
    if (filter === 'incomplet') return matchesSearch && !e.dossier_complet;
    return matchesSearch;
  });

  return (
    <div className="p-8 font-['Fredoka'] max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-black uppercase text-gray-900 tracking-tighter">Effectifs</h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">Gestion Altrad Opérations</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-[#d63031] text-white px-6 py-4 rounded-2xl font-black uppercase text-xs shadow-xl shadow-red-100 flex items-center gap-2 hover:scale-105 transition-transform">
          <Plus size={20} /> Ajouter un collaborateur
        </button>
      </div>

      {/* Barre de recherche et Filtres */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" placeholder="Rechercher un nom ou prénom..." 
            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-none shadow-sm font-bold focus:ring-2 focus:ring-black"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
          <button onClick={() => setFilter('tous')} className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${filter === 'tous' ? 'bg-black text-white' : 'text-gray-400'}`}>Tous ({staff.length})</button>
          <button onClick={() => setFilter('incomplet')} className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${filter === 'incomplet' ? 'bg-red-500 text-white' : 'text-gray-400'}`}>Dossiers Incomplets</button>
        </div>
      </div>

      {/* Liste des employés */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStaff.map((e) => (
          <Link href={`/equipe/${e.id}`} key={e.id} className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden">
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center font-black text-gray-400 text-xl group-hover:bg-[#d63031] group-hover:text-white transition-colors">
                {e.nom[0]}
              </div>
              <div className="flex-1">
                <h3 className="font-black text-gray-800 uppercase leading-none mb-1 group-hover:text-[#d63031]">{e.nom} {e.prenom}</h3>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{e.role}</p>
              </div>
              <ChevronRight className="text-gray-200 group-hover:text-black transition-colors" />
            </div>
            
            <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-50">
              <div className={`flex items-center gap-1 text-[9px] font-black uppercase ${e.dossier_complet ? 'text-green-500' : 'text-red-500 animate-pulse'}`}>
                {e.dossier_complet ? <><CheckCircle2 size={12}/> Dossier OK</> : <><FileWarning size={12}/> Dossier Incomplet</>}
              </div>
              <span className="text-[9px] font-black text-gray-300 uppercase">Voir la fiche</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Modal Ajout */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] p-10 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-gray-300 hover:text-black"><X size={24}/></button>
            <h2 className="text-2xl font-black uppercase mb-8">Nouveau Profil</h2>
            <div className="space-y-4">
              <input type="text" placeholder="NOM" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold" onChange={(e)=>setNewEmp({...newEmp, nom: e.target.value.toUpperCase()})} />
              <input type="text" placeholder="PRÉNOM" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold" onChange={(e)=>setNewEmp({...newEmp, prenom: e.target.value})} />
              <select className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold" onChange={(e)=>setNewEmp({...newEmp, role: e.target.value})}>
                <option value="Ouvrier">Ouvrier</option>
                <option value="Chef d'équipe">Chef d'équipe</option>
                <option value="Chef de chantier">Chef de chantier</option>
                <option value="OPERATEUR">OPERATEUR</option>
                <option value="INTERIMAIRE">INTERIMAIRE</option>
              </select>
              <button onClick={handleAdd} className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs mt-4">Créer le dossier</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
