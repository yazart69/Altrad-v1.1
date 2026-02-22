"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, UserPlus, Search, ArrowRight, ShieldCheck, X, 
  Loader2, Trash2, Pencil, Crown, HardHat, UserCog, 
  UserCheck, UserX, Building2, MapPin, Phone 
} from 'lucide-react';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

// --- CONFIGURATION DES RÔLES ---
const ROLES_CONFIG: Record<string, any> = {
    chef_chantier_interne: { label: 'Chef Chantier (Int)', bClass: 'bg-purple-100 text-purple-700 border-purple-200', cClass: 'bg-purple-50/30 border-purple-100', icon: <Crown size={14}/>, p: 1 },
    chef_chantier_altrad: { label: 'Chef Chantier (Alt)', bClass: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200', cClass: 'bg-fuchsia-50/30 border-fuchsia-100', icon: <Crown size={14}/>, p: 2 },
    chef_equipe_interne: { label: "Chef Équipe (Int)", bClass: 'bg-indigo-100 text-indigo-700 border-indigo-200', cClass: 'bg-indigo-50/30 border-indigo-100', icon: <UserCog size={14}/>, p: 3 },
    chef_equipe_altrad: { label: "Chef Équipe (Alt)", bClass: 'bg-violet-100 text-violet-700 border-violet-200', cClass: 'bg-violet-50/30 border-violet-100', icon: <UserCog size={14}/>, p: 4 },
    operateur_interne: { label: 'Opérateur (Int)', bClass: 'bg-blue-100 text-blue-700 border-blue-200', cClass: 'bg-blue-50/30 border-blue-100', icon: <HardHat size={14}/>, p: 5 },
    operateur_altrad: { label: 'Opérateur (Alt)', bClass: 'bg-cyan-100 text-cyan-700 border-cyan-200', cClass: 'bg-cyan-50/30 border-cyan-100', icon: <HardHat size={14}/>, p: 6 },
    interimaire: { label: 'Intérimaire', bClass: 'bg-orange-100 text-orange-700 border-orange-200', cClass: 'bg-orange-50/30 border-orange-100', icon: <UserCheck size={14}/>, p: 7 },
    sous_traitant: { label: 'Sous-Traitant', bClass: 'bg-gray-100 text-gray-700 border-gray-200', cClass: 'bg-gray-50/30 border-gray-100', icon: <UserX size={14}/>, p: 8 },
};

export default function EquipePage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState({ isOpen: false, isEditing: false });
  const [currentEmp, setCurrentEmp] = useState({ id: '', nom: '', prenom: '', role: 'operateur_interne' });

  const fetchEmployees = async () => {
    setLoading(true);
    const { data } = await supabase.from('employes').select('*').order('nom');
    setEmployees(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchEmployees(); }, []);

  // FILTRAGE ET TRI MÉMORISÉ
  const filteredEmployees = useMemo(() => {
    return employees
      .filter(e => `${e.nom} ${e.prenom}`.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
          const pA = ROLES_CONFIG[a.role]?.p || 99;
          const pB = ROLES_CONFIG[b.role]?.p || 99;
          return pA !== pB ? pA - pB : a.nom.localeCompare(b.nom);
      });
  }, [employees, search]);

  const handleSave = async () => {
    if (!currentEmp.nom || !currentEmp.prenom) return toast.error("Nom et Prénom requis");
    const toastId = toast.loading("Enregistrement...");
    
    const payload = { nom: currentEmp.nom.toUpperCase(), prenom: currentEmp.prenom, role: currentEmp.role };
    const { error } = modal.isEditing 
        ? await supabase.from('employes').update(payload).eq('id', currentEmp.id)
        : await supabase.from('employes').insert([payload]);

    if (!error) {
        toast.success(modal.isEditing ? "Profil mis à jour" : "Collaborateur créé", { id: toastId });
        setModal({ ...modal, isOpen: false });
        fetchEmployees();
    } else {
        toast.error("Erreur base de données", { id: toastId });
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm("⚠️ Supprimer définitivement ce dossier ?")) return;
    const { error } = await supabase.from('employes').delete().eq('id', id);
    if (!error) { toast.success("Dossier supprimé"); fetchEmployees(); }
  };

  return (
    <div className="min-h-screen bg-[#f0f3f4] font-['Fredoka'] p-4 md:p-10 text-gray-800">
      <Toaster position="bottom-right" />
      
      {/* HEADER */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black uppercase text-[#2d3436] tracking-tighter">Équipe <span className="text-[#00b894]">PZO</span></h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">Gestion des effectifs et qualifications</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80 shadow-sm rounded-2xl overflow-hidden bg-white border border-gray-100">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
            <input 
              type="text" 
              placeholder="Chercher un nom..." 
              className="w-full pl-12 pr-6 py-4 outline-none font-bold text-sm uppercase text-gray-700"
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button onClick={() => { setCurrentEmp({id:'', nom:'', prenom:'', role:'operateur_interne'}); setModal({isOpen:true, isEditing:false}); }} 
                  className="bg-[#00b894] text-white p-4 rounded-2xl shadow-lg shadow-emerald-100 hover:scale-105 transition-all">
            <UserPlus size={24} />
          </button>
        </div>
      </div>

      {/* LISTE */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin text-[#00b894]" size={40} /></div>
        ) : filteredEmployees.map((emp) => {
            const cfg = ROLES_CONFIG[emp.role] || { label: emp.role, bClass: 'bg-gray-100', cClass: 'bg-white', icon: <Users size={14}/> };
            return (
              <Link href={`/equipe/${emp.id}`} key={emp.id} className="group">
                <div className={`p-6 rounded-[35px] border shadow-sm transition-all h-full flex flex-col justify-between min-h-[240px] hover:shadow-xl relative overflow-hidden bg-white ${cfg.cClass}`}>
                  
                  <div className="flex justify-between items-start">
                    <div className={`p-3 rounded-2xl bg-white shadow-sm ${emp.statut_actuel === 'disponible' ? 'text-green-500' : 'text-blue-500'}`}>
                      <ShieldCheck size={24} />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={(e) => { e.preventDefault(); setCurrentEmp(emp); setModal({isOpen:true, isEditing:true}); }} className="p-2 bg-white rounded-full text-gray-400 hover:text-black shadow-sm"><Pencil size={14} /></button>
                      <button onClick={(e) => handleDelete(emp.id, e)} className="p-2 bg-white rounded-full text-red-300 hover:text-red-500 shadow-sm"><Trash2 size={14} /></button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h3 className="text-xl font-black uppercase text-gray-800 leading-tight">{emp.nom} {emp.prenom}</h3>
                    <div className={`flex items-center gap-2 mt-3 px-3 py-1.5 rounded-lg border w-fit font-black uppercase text-[10px] ${cfg.bClass}`}>
                        {cfg.icon} <span>{cfg.label}</span>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-between items-center">
                    <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase border ${emp.statut_actuel === 'disponible' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                      {emp.statut_actuel || 'disponible'}
                    </span>
                    <div className="bg-gray-50 p-2 rounded-xl group-hover:bg-[#00b894] group-hover:text-white transition-all"><ArrowRight size={18} /></div>
                  </div>
                </div>
              </Link>
            )
        })}
      </div>

      {/* MODAL AJOUT / MODIF */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[40px] p-10 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setModal({...modal, isOpen:false})} className="absolute top-6 right-6 text-gray-300 hover:text-black"><X size={24} /></button>
            <h2 className="text-2xl font-black uppercase mb-8">{modal.isEditing ? 'Modifier' : 'Nouveau'} Profil</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-1 block">Nom</label>
                <input type="text" value={currentEmp.nom} className="w-full p-4 bg-gray-50 rounded-2xl border-none font-black uppercase focus:ring-2 focus:ring-[#00b894]/20" onChange={(e)=>setCurrentEmp({...currentEmp, nom: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-1 block">Prénom</label>
                <input type="text" value={currentEmp.prenom} className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold focus:ring-2 focus:ring-[#00b894]/20" onChange={(e)=>setCurrentEmp({...currentEmp, prenom: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-1 block">Rôle / Qualification</label>
                <select className="w-full p-4 bg-gray-50 rounded-2xl border-none font-black uppercase text-xs cursor-pointer" value={currentEmp.role} onChange={(e)=>setCurrentEmp({...currentEmp, role: e.target.value})}>
                  {Object.entries(ROLES_CONFIG).map(([id, cfg]) => <option key={id} value={id}>{cfg.label}</option>)}
                </select>
              </div>
              <button onClick={handleSave} className="w-full bg-[#2d3436] text-white py-5 rounded-3xl font-black uppercase text-xs mt-6 shadow-xl hover:bg-black transition-all">
                {modal.isEditing ? 'Enregistrer les modifications' : 'Créer le dossier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}