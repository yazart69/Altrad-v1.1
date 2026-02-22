"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Search, MapPin, Plus, ArrowRight, Building2, HardHat, 
  CalendarClock, CheckCircle2, Loader2, Trash2, TrendingUp, Clock, Euro
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// --- INTERFACES ---
interface IChantier {
  id: string;
  nom: string;
  client: string;
  adresse: string;
  statut: string;
  type: string;
  heures_budget: number;
  heures_consommees: number;
  montant_marche: number;
  taux_horaire_moyen: number;
  cpi: number;
  cout_fournitures_reel: number;
  cout_sous_traitance_reel: number;
  cout_location_reel: number;
  frais_generaux_reel: number;
}

export default function ChantiersList() {
  const router = useRouter();
  const [chantiers, setChantiers] = useState<IChantier[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');

  useEffect(() => {
    fetchChantiers();
  }, []);

  async function fetchChantiers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('chantiers')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      toast.error("Erreur de chargement des chantiers");
    } else if (data) {
      setChantiers(data);
    }
    setLoading(false);
  }

  // --- ACTIONS ---
  const handleDelete = async (e: React.MouseEvent, id: string, nom: string) => {
    e.preventDefault(); 
    e.stopPropagation(); 

    if (window.confirm(`⚠️ Supprimer définitivement le chantier "${nom}" ?`)) {
      const toastId = toast.loading("Suppression...");
      const { error } = await supabase.from('chantiers').delete().eq('id', id);
      if (error) {
        toast.error("Erreur : " + error.message, { id: toastId });
      } else {
        setChantiers(prev => prev.filter(c => c.id !== id));
        toast.success("Chantier supprimé", { id: toastId });
      }
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    const toastId = toast.loading("Initialisation du chantier...");
    
    const { data, error } = await supabase
      .from('chantiers')
      .insert([{ 
        nom: 'Nouveau Projet', 
        statut: 'planifie',
        heures_budget: 0,
        heures_consommees: 0,
        taux_horaire_moyen: 24,
        cpi: 19
      }])
      .select()
      .single();

    if (error) {
      toast.error("Erreur création : " + error.message, { id: toastId });
      setCreating(false);
    } else if (data) {
      toast.success("Redirection...", { id: toastId });
      router.push(`/chantier/${data.id}`);
    }
  };

  // --- LOGIQUE FILTRAGE (MÉMORISÉE) ---
  const filtered = useMemo(() => {
    return chantiers.filter(c => {
      const matchesSearch = 
        c.nom?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.adresse?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'tous' || c.statut === statusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => {
        // Priorité aux chantiers "en cours"
        if (a.statut === 'en_cours' && b.statut !== 'en_cours') return -1;
        if (a.statut !== 'en_cours' && b.statut === 'en_cours') return 1;
        return 0;
    });
  }, [chantiers, searchTerm, statusFilter]);

  const counts = useMemo(() => ({
    tous: chantiers.length,
    en_cours: chantiers.filter(c => c.statut === 'en_cours').length,
    planifie: chantiers.filter(c => c.statut === 'planifie').length,
    termine: chantiers.filter(c => c.statut === 'termine').length
  }), [chantiers]);

  return (
    <div className="min-h-screen bg-[#f0f3f4] font-['Fredoka'] p-4 md:p-8 text-gray-800">
      <Toaster position="bottom-right" />
      
      {/* HEADER */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
           <h1 className="text-3xl font-black uppercase text-[#2d3436] tracking-tight">
             Parc <span className="text-[#00b894]">Chantiers</span>
           </h1>
           <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">
             Pilotage en temps réel ({filtered.length})
           </p>
        </div>
        
        <button 
          onClick={handleCreate} 
          disabled={creating}
          className="bg-[#00b894] hover:bg-[#00a383] text-white px-8 py-3 rounded-2xl font-bold uppercase shadow-lg shadow-emerald-100 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        >
            {creating ? <Loader2 size={20} className="animate-spin"/> : <Plus size={20} />}
            Nouveau Projet
        </button>
      </div>

      {/* BARRE D'OUTILS */}
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-4 mb-8">
        <div className="bg-white p-2 rounded-2xl shadow-sm flex items-center gap-3 border border-gray-100 flex-1 px-4">
            <Search className="text-gray-400" />
            <input 
                type="text" 
                placeholder="Chercher un projet, un client, un lieu..." 
                className="flex-1 outline-none font-bold text-gray-700 placeholder-gray-300 bg-transparent py-2"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 flex overflow-x-auto no-scrollbar gap-1">
            {[
                { id: 'tous', label: 'Tous', count: counts.tous, color: 'bg-gray-800' },
                { id: 'en_cours', label: 'En Cours', count: counts.en_cours, color: 'bg-[#00b894]' },
                { id: 'planifie', label: 'À Venir', count: counts.planifie, color: 'bg-[#0984e3]' },
                { id: 'termine', label: 'Terminés', count: counts.termine, color: 'bg-gray-400' },
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase transition-all flex items-center gap-2 ${
                        statusFilter === tab.id 
                        ? `${tab.color} text-white shadow-md` 
                        : 'bg-transparent text-gray-400 hover:bg-gray-50'
                    }`}
                >
                    {tab.label}
                    <span className={`px-1.5 py-0.5 rounded-lg text-[10px] ${statusFilter === tab.id ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
                        {tab.count}
                    </span>
                </button>
            ))}
        </div>
      </div>

      {/* LISTE DES CHANTIERS */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
            <div className="flex justify-center items-center h-64 flex-col gap-4">
                <Loader2 className="animate-spin text-[#00b894]" size={40} />
                <p className="font-bold text-gray-400 uppercase text-xs tracking-widest">Synchronisation du parc...</p>
            </div>
        ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[40px] border-2 border-dashed border-gray-200">
                <HardHat size={60} className="mx-auto mb-4 text-gray-200" />
                <h3 className="text-xl font-black text-gray-400 uppercase tracking-tight">Aucun résultat</h3>
                <p className="text-gray-400 font-bold text-sm">Ajustez vos filtres pour trouver votre chantier.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((chantier) => {
                    // CALCULS RAPIDES POUR KPI
                    const percentHours = chantier.heures_budget > 0 
                        ? Math.min(100, Math.round((chantier.heures_consommees / chantier.heures_budget) * 100)) 
                        : 0;
                    
                    const isAlert = percentHours >= 90;

                    let statusCfg = { bg: 'bg-gray-500', tx: 'Inconnu', ic: Building2, light: 'bg-gray-50' };
                    if (chantier.statut === 'en_cours') statusCfg = { bg: 'bg-[#00b894]', tx: 'En Cours', ic: HardHat, light: 'bg-emerald-50' };
                    if (chantier.statut === 'planifie') statusCfg = { bg: 'bg-[#0984e3]', tx: 'Planifié', ic: CalendarClock, light: 'bg-blue-50' };
                    if (chantier.statut === 'termine') statusCfg = { bg: 'bg-gray-400', tx: 'Terminé', ic: CheckCircle2, light: 'bg-gray-50' };

                    return (
                        <Link href={`/chantier/${chantier.id}`} key={chantier.id} className="group">
                            <div className="bg-white rounded-[35px] p-6 shadow-sm border border-gray-100 hover:shadow-2xl hover:shadow-emerald-100/50 hover:-translate-y-1.5 transition-all duration-300 h-full flex flex-col relative overflow-hidden">
                                
                                {/* HEADER CARTE */}
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`${statusCfg.bg} p-3.5 rounded-2xl text-white shadow-lg`}>
                                        <statusCfg.ic size={22} />
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${statusCfg.bg} bg-opacity-10 text-gray-600 border border-current border-opacity-10`}>
                                            {statusCfg.tx}
                                        </span>
                                        <button 
                                            onClick={(e) => handleDelete(e, chantier.id, chantier.nom)}
                                            className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                
                                {/* INFOS PRINCIPALES */}
                                <div className="flex-1">
                                    <h3 className="text-xl font-black uppercase text-[#2d3436] leading-tight mb-1 group-hover:text-[#00b894] transition-colors line-clamp-2">
                                        {chantier.nom}
                                    </h3>
                                    <p className="text-xs font-bold text-[#00b894] uppercase tracking-wider mb-4">
                                        {chantier.client || 'Client Privé'}
                                    </p>

                                    <div className="space-y-2 mb-6">
                                        <div className="flex items-center gap-2 text-gray-500 text-xs font-bold bg-gray-50 p-2 rounded-xl">
                                            <MapPin size={14} className="text-gray-400" />
                                            <span className="truncate">{chantier.adresse || 'Lieu non défini'}</span>
                                        </div>
                                    </div>

                                    {/* JAUGE DE BUDGET HEURES */}
                                    <div className="bg-gray-50 p-4 rounded-[25px] border border-gray-100">
                                        <div className="flex justify-between items-end mb-2">
                                            <div className="flex items-center gap-1.5 text-gray-400">
                                                <Clock size={12} />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Avancement Heures</span>
                                            </div>
                                            <span className={`text-xs font-black ${isAlert ? 'text-red-500' : 'text-gray-700'}`}>
                                                {chantier.heures_consommees}h / {chantier.heures_budget}h
                                            </span>
                                        </div>
                                        <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all duration-1000 ${isAlert ? 'bg-red-500' : 'bg-[#00b894]'}`}
                                                style={{ width: `${percentHours}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* FOOTER CARTE */}
                                <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Marché HT</span>
                                            <span className="text-xs font-black text-gray-800">{(chantier.montant_marche || 0).toLocaleString()} €</span>
                                        </div>
                                        <div className="w-px h-6 bg-gray-100" />
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">OTP</span>
                                            <span className="text-xs font-black text-blue-500">{chantier.numero_otp || '---'}</span>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-2.5 rounded-2xl group-hover:bg-[#00b894] group-hover:text-white group-hover:scale-110 transition-all shadow-sm">
                                        <ArrowRight size={18} />
                                    </div>
                                </div>

                                {/* DÉCORATION DE FOND (ICÔNE GÉANTE) */}
                                <statusCfg.ic size={140} className="absolute -right-8 -bottom-8 text-gray-50/50 -rotate-12 group-hover:rotate-0 group-hover:scale-110 transition-all duration-700 pointer-events-none" />
                            </div>
                        </Link>
                    );
                })}
            </div>
        )}
      </div>
    </div>
  );
}