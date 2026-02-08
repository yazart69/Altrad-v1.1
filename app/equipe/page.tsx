"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, UserPlus, Search, ArrowRight, ShieldCheck, X, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function EquipePage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Nouvel employé
  const [newEmp, setNewEmp] = useState({ nom: '', prenom: '', role: 'interne' });

  const fetchEmployees = async () => {
    setLoading(true);
    const { data } = await supabase.from('employes').select('*').order('nom');
    setEmployees(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchEmployees(); }, []);

  const handleAdd = async () => {
    if (!newEmp.nom || !newEmp.prenom) return;
    const { error } = await supabase.from('employes').insert([newEmp]);
    if (!error) {
      setIsModalOpen(false);
      setNewEmp({ nom: '', prenom: '', role: 'interne' });
      fetchEmployees();
    }
  };

  const filtered = employees.filter(e => 
    `${e.nom} ${e.prenom}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-10 font-['Fredoka'] max-w-7xl mx-auto">
      
      {/* HEADER ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black uppercase text-gray-900 tracking-tighter">Collaborateurs</h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1 italic">Gestion des accès et habilitations</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="RECHERCHER UN NOM..." 
              className="w-full pl-12 pr-6 py-4 bg-white rounded-2xl border-none shadow-sm font-bold text-xs uppercase"
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-black text-white p-4 rounded-2xl shadow-xl hover:scale-105 transition-all"
          >
            <UserPlus size={24} />
          </button>
        </div>
      </div>

      {/* LISTE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin text-gray-300" size={40} /></div>
        ) : filtered.map((emp) => (
          <Link key={emp.id} href={`/equipe/${emp.id}`} className="bg-white p-6 rounded-[35px] border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${emp.dossier_complet ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                <ShieldCheck size={24} />
              </div>
              <ArrowRight className="text-gray-200 group-hover:text-black transition-colors" size={20} />
            </div>
            <h3 className="text-xl font-black uppercase text-gray-800 leading-tight">{emp.nom} {emp.prenom}</h3>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mt-2">{emp.role}</p>
            <div className="mt-6 flex gap-2">
              <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase ${emp.statut_actuel === 'disponible' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                {emp.statut_actuel || 'disponible'}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* MODAL AJOUT (AVEC LES NOUVELLES CATÉGORIES) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] p-10 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-gray-300 hover:text-black"><X size={24} /></button>
            <h2 className="text-2xl font-black uppercase mb-8">Nouveau Collaborateur</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Nom de famille</label>
                <input type="text" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold uppercase" onChange={(e)=>setNewEmp({...newEmp, nom: e.target.value.toUpperCase()})} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Prénom</label>
                <input type="text" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold" onChange={(e)=>setNewEmp({...newEmp, prenom: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Statut / Catégorie</label>
                <select 
                  className="w-full p-4 bg-gray-50 rounded-2xl border-none font-black uppercase text-xs"
                  value={newEmp.role}
                  onChange={(e)=>setNewEmp({...newEmp, role: e.target.value})}
                >
                  <option value="interne">Interne (Altrad)</option>
                  <option value="interim">Intérimaire</option>
                  <option value="sous-traitant">Sous-traitant</option>
                  <option value="altrad_autres">Altrad autres</option>
                </select>
              </div>
              <button onClick={handleAdd} className="w-full bg-black text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs mt-6 shadow-xl active:scale-95 transition-all">
                Créer le dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
