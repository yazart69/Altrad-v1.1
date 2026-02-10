"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Search, MapPin, Plus, ArrowRight, Building2, HardHat, 
  CalendarClock, CheckCircle2, Loader2, Trash2 
} from 'lucide-react';

export default function ChantiersList() {
  const router = useRouter();
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');

  useEffect(() => {
    fetchChantiers();
  }, []);

  async function fetchChantiers() {
    const { data } = await supabase
      .from('chantiers')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (data) setChantiers(data);
    setLoading(false);
  }

  // --- FONCTION SUPPRESSION ---
  const handleDelete = async (e: React.MouseEvent, id: string, nom: string) => {
    e.preventDefault(); // Empêche d'entrer dans la fiche chantier
    e.stopPropagation(); 

    const confirmation = window.confirm(`⚠️ Êtes-vous sûr de vouloir supprimer définitivement le chantier "${nom}" ?\nCette action est irréversible.`);
    
    if (confirmation) {
      const { error } = await supabase.from('chantiers').delete().eq('id', id);
      if (error) {
        alert("Erreur lors de la suppression : " + error.message);
      } else {
        fetchChantiers(); // Rafraîchit la liste
      }
    }
  };

  // --- CRÉATION RAPIDE ---
  const handleCreate = async () => {
    setCreating(true);
    const { data, error } = await supabase
      .from('chantiers')
      .insert([{ 
        nom: 'Nouveau Chantier', 
        statut: 'planifie',
        type: 'Industriel',
        client: 'À définir'
      }])
      .select()
      .single();

    if (data) {
      router.push(`/chantier/${data.id}`);
    } else {
      alert("Erreur création : " + error?.message);
      setCreating(false);
    }
  };

  // Logique de filtrage
  const filtered = chantiers.filter(c => {
    const matchesSearch = c.nom.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.adresse?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'tous' || c.statut === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const counts = {
    tous: chantiers.length,
    en_cours: chantiers.filter(c => c.statut === 'en_cours').length,
    planifie: chantiers.filter(c => c.statut === 'planifie').length,
    termine: chantiers.filter(c => c.statut === 'termine').length
  };

  return (
    <div className="min-h-screen bg-[#f0f3f4] font-['Fredoka'] p-4 md:p-8 text-gray-800 ml-0 md:ml-0 transition-all">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
           <h1 className="text-3xl font-black uppercase text-[#2d3436] tracking-tight">
             Mes <span className="text-[#00b894]">Chantiers</span>
           </h1>
           <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">
             Vue globale du parc ({filtered.length})
           </p>
        </div>
        
        <button 
          onClick={handleCreate} 
          disabled={creating}
          className="bg-[#00b894] hover:bg-[#00a383] text-white px-6 py-3 rounded-xl font-bold uppercase shadow-lg shadow-emerald-200 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {creating ? <Loader2 size={20} className="animate-spin"/> : <Plus size={20} />}
            {creating ? 'Création...' : 'Nouveau Chantier'}
        </button>
      </div>

      {/* BARRE D'OUTILS */}
      <div className="flex flex-col lg:flex-row gap-4 mb-8">
        <div className="bg-white p-2 rounded-[20px] shadow-sm flex items-center gap-3 border border-gray-100 flex-1 px-4">
            <Search className="text-gray-400" />
            <input 
                type="text" 
                placeholder="Rechercher par nom, client, ville..." 
                className="flex-1 outline-none font-bold text-gray-700 placeholder-gray-300 bg-transparent py-2"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        <div className="bg-white p-2 rounded-[20px] shadow-sm border border-gray-100 flex overflow-x-auto no-scrollbar gap-2">
            {[
                { id: 'tous', label: 'Tous', count: counts.tous, color: 'bg-gray-800' },
                { id: 'en_cours', label: 'En Cours', count: counts.en_cours, color: 'bg-[#00b894]' },
                { id: 'planifie', label: 'À Venir', count: counts.planifie, color: 'bg-[#0984e3]' },
                { id: 'termine', label: 'Terminés', count: counts.termine, color: 'bg-gray-400' },
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-4 py-2 rounded-xl font-bold text-xs uppercase whitespace-nowrap transition-all flex items-center gap-2 ${
                        statusFilter === tab.id 
                        ? `${tab.color} text-white shadow-md` 
                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                    }`}
                >
                    {tab.label}
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] bg-white/20 text-white`}>
                        {tab.count}
                    </span>
                </button>
            ))}
        </div>
      </div>

      {/* LISTE DES CHANTIERS */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin text-[#00b894]" size={40} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 opacity-50">
            <HardHat size={60} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-black text-gray-400 uppercase">Aucun chantier trouvé</h3>
            <p className="text-gray-400 font-bold">Modifiez vos filtres ou créez un nouveau projet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((chantier) => {
                let statusConfig = { color: 'bg-gray-500', text: 'Inconnu', icon: Building2, border: 'border-gray-200' };
                if (chantier.statut === 'en_cours') statusConfig = { color: 'bg-[#00b894]', text: 'En Cours', icon: HardHat, border: 'border-emerald-200' };
                if (chantier.statut === 'planifie') statusConfig = { color: 'bg-[#0984e3]', text: 'Planifié', icon: CalendarClock, border: 'border-blue-200' };
                if (chantier.statut === 'termine') statusConfig = { color: 'bg-gray-400', text: 'Terminé', icon: CheckCircle2, border: 'border-gray-200' };

                return (
                    <Link href={`/chantier/${chantier.id}`} key={chantier.id} className="group h-full">
                        <div className={`bg-white rounded-[25px] p-6 shadow-sm border hover:border-transparent hover:shadow-xl hover:-translate-y-1 transition-all h-full flex flex-col relative overflow-hidden ${statusConfig.border}`}>
                            
                            {/* BOUTON SUPPRIMER (NOUVEAU) */}
                            <button 
                                onClick={(e) => handleDelete(e, chantier.id, chantier.nom)}
                                className="absolute top-4 right-4 z-20 p-2 bg-white/50 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                title="Supprimer ce chantier"
                            >
                                <Trash2 size={18} />
                            </button>

                            {/* En-tête Carte */}
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className={`${statusConfig.color} p-3 rounded-2xl text-white shadow-lg shadow-gray-200`}>
                                    <statusConfig.icon size={20} />
                                </div>
                                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${statusConfig.color} bg-opacity-10 text-gray-600`}>
                                    {statusConfig.text}
                                </span>
                            </div>
                            
                            {/* Contenu */}
                            <div className="relative z-10 flex-1">
                                <h3 className="text-lg font-black uppercase text-gray-800 mb-1 leading-tight group-hover:text-[#00b894] transition-colors truncate pr-6">
                                    {chantier.nom}
                                </h3>
                                <p className="text-xs font-bold text-gray-400 uppercase mb-4 truncate">
                                    {chantier.client || 'Client non défini'}
                                </p>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-gray-500 text-xs font-bold">
                                        <MapPin size={14} className="text-gray-300" />
                                        <span className="truncate">{chantier.adresse || 'Adresse non renseignée'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-500 text-xs font-bold">
                                        <Building2 size={14} className="text-gray-300" />
                                        <span>{chantier.type || 'Type non défini'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Pied de carte */}
                            <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center text-xs font-bold text-gray-400 uppercase relative z-10">
                                <span>Voir détails</span>
                                <div className="bg-gray-50 p-2 rounded-full group-hover:bg-[#00b894] group-hover:text-white transition-colors">
                                    <ArrowRight size={16} />
                                </div>
                            </div>

                            {/* Décoration fond */}
                            <statusConfig.icon size={120} className="absolute -right-6 -bottom-6 text-gray-50 -rotate-12 group-hover:rotate-0 transition-transform duration-500 pointer-events-none" />
                        </div>
                    </Link>
                );
            })}
        </div>
      )}
    </div>
  );
}
