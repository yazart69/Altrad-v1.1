"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  User, FileWarning, ShieldCheck, HeartPulse, 
  Search, Plus, ArrowRight, CheckCircle2, Edit3, X
} from 'lucide-react';

export default function EquipePage() {
  const router = useRouter();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('tous');
  const [search, setSearch] = useState('');

  // État pour la Modal "Ajouter"
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmp, setNewEmp] = useState({ nom: '', prenom: '', role: 'Ouvrier' });

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from('employes').select('*').order('nom');
    if (data) setStaff(data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddEmployee = async () => {
    const { error } = await supabase.from('employes').insert([newEmp]);
    if (!error) {
      setIsAddModalOpen(false);
      fetchData();
    }
  };

  const filteredStaff = staff.filter(e => {
    const matchesSearch = e.nom?.toLowerCase().includes(search.toLowerCase()) || 
                          e.prenom?.toLowerCase().includes(search.toLowerCase());
    if (filter === 'incomplet') return matchesSearch && !e.dossier_complet;
    return matchesSearch;
  });

  return (
    <div className="p-8 font-['Fredoka']">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black uppercase text-gray-800 tracking-tighter">Effectifs</h1>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-[#d63031] text-white px-6 py-3 rounded-2xl font-black uppercase text-xs flex items-center gap-2"
        >
          <Plus size={18} /> Ajouter un employé
        </button>
      </div>

      {/* FILTRES RAPIDES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <button onClick={() => setFilter('tous')} className={`p-6 rounded-[25px] border-2 text-left transition-all ${filter === 'tous' ? 'bg-black text-white border-black' : 'bg-white border-gray-100'}`}>
          <p className="text-[10px] font-black uppercase opacity-50 mb-1">Total</p>
          <p className="text-3xl font-black">{staff.length}</p>
        </button>
        <button onClick={() => setFilter('incomplet')} className={`p-6 rounded-[25px] border-2 text-left transition-all ${filter === 'incomplet' ? 'bg-red-500 text-white border-red-500' : 'bg-white border-gray-100'}`}>
          <p className="text-[10px] font-black uppercase opacity-50 mb-1">Incomplets</p>
          <p className="text-3xl font-black">{staff.filter(e => !e.dossier_complet).length}</p>
        </button>
      </div>

      {/* TABLEAU CLIQUABLE */}
      <div className="bg-white rounded-[30px] shadow-sm overflow-hidden border border-gray-100">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 text-[10px] font-black uppercase text-gray-400">
              <th className="p-6">Nom / Prénom</th>
              <th className="p-6">Rôle</th>
              <th className="p-6">Dossier</th>
              <th className="p-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.map((e) => (
              <tr 
                key={e.id} 
                onClick={() => router.push(`/equipe/${e.id}`)} // TOUTE LA LIGNE EST CLIQUABLE
                className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-all group"
              >
                <td className="p-6 font-bold text-gray-800 uppercase">{e.nom} {e.prenom}</td>
                <td className="p-6 text-xs font-bold text-blue-500 uppercase">{e.role}</td>
                <td className="p-6 text-[10px] font-black">
                  {e.dossier_complet ? <span className="text-green-500">OK ✅</span> : <span className="text-red-500 animate-pulse">À COMPLÉTER ❌</span>}
                </td>
                <td className="p-6 text-right">
                  <div className="inline-flex bg-gray-100 p-2 rounded-xl group-hover:bg-black group-hover:text-white transition-all">
                    <Edit3 size={16} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL AJOUTER */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[30px] p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase">Nouvel Employé</h2>
              <button onClick={() => setIsAddModalOpen(false)}><X /></button>
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="NOM" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold" onChange={(e) => setNewEmp({...newEmp, nom: e.target.value})} />
              <input type="text" placeholder="PRÉNOM" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold" onChange={(e) => setNewEmp({...newEmp, prenom: e.target.value})} />
              <select className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold" onChange={(e) => setNewEmp({...newEmp, role: e.target.value})}>
                <option value="Ouvrier">Ouvrier</option>
                <option value="Chef d'équipe">Chef d'équipe</option>
                <option value="Chef de chantier">Chef de chantier</option>
                <option value="OPERATEUR">OPERATEUR</option>
                <option value="INTERIMAIRE">INTERIMAIRE</option>
              </select>
              <button onClick={handleAddEmployee} className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest mt-4">Créer la fiche</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
