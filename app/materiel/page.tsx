"use client";

import React, { useState } from 'react';
import { 
  Search, Filter, Plus, Truck, Package, Wrench, 
  Calendar, MapPin, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, // <-- ArrowLeft ajouté ici
  ArrowUpRight, Users, LayoutGrid, List
} from 'lucide-react';
import Link from 'next/link';

// --- DONNÉES FICTIVES (MOCK DATA) ---
const MOCK_INVENTORY = [
  { id: 1, nom: 'Nacelle Ciseau 12m', categorie: 'Engin', type: 'Externe', total: 5, dispo: 2, prix: '120€/j', statut: 'En location', image: '🏗️' },
  { id: 2, nom: 'Harnais Sécurité', categorie: 'EPI', type: 'Interne', total: 50, dispo: 45, prix: '-', statut: 'En stock', image: '🦺' },
  { id: 3, nom: 'Perceuse Percussion', categorie: 'Outillage', type: 'Interne', total: 10, dispo: 0, prix: '-', statut: 'Maintenance', image: 'drill' },
  { id: 4, nom: 'Echafaudage Roulant', categorie: 'Accès', type: 'Interne', total: 8, dispo: 3, prix: '-', statut: 'En location', image: '🪜' },
  { id: 5, nom: 'Compresseur 100L', categorie: 'Outillage', type: 'Externe', total: 2, dispo: 2, prix: '45€/j', statut: 'En stock', image: '💨' },
  { id: 6, nom: 'Groupe Électrogène', categorie: 'Energie', type: 'Externe', total: 3, dispo: 1, prix: '80€/j', statut: 'En location', image: '⚡' },
];

const MOCK_LOCATIONS = [
  { id: 101, materiel: 'Nacelle Ciseau 12m', chantier: 'TotalEnergies - Grandpuits', debut: '2024-02-01', fin: '2024-02-15', statut: 'En cours', type: 'Externe' },
  { id: 102, materiel: 'Echafaudage Roulant', chantier: 'SNCF - Gare Lyon', debut: '2024-02-05', fin: '2024-02-20', statut: 'En cours', type: 'Interne' },
  { id: 103, materiel: 'Perceuse Percussion', chantier: 'EDF - Dampierre', debut: '2024-01-10', fin: '2024-01-12', statut: 'À rendre', type: 'Interne' },
  { id: 104, materiel: 'Groupe Électrogène', chantier: 'Site Arcelor', debut: '2024-02-08', fin: '2024-02-10', statut: 'En cours', type: 'Externe' },
];

export default function MaterielPage() {
  const [activeTab, setActiveTab] = useState<'inventaire' | 'suivi'>('inventaire');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('Tous'); // Tous, Interne, Externe
  const [filterCat, setFilterCat] = useState('Toutes');

  // --- LOGIQUES DE FILTRAGE ---
  const filteredInventory = MOCK_INVENTORY.filter(item => {
    const matchSearch = item.nom.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'Tous' || item.type === filterType;
    const matchCat = filterCat === 'Toutes' || item.categorie === filterCat;
    return matchSearch && matchType && matchCat;
  });

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'En stock': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'En location': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Maintenance': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'À rendre': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f3f4] font-['Fredoka'] text-gray-800 pb-20">
      
      {/* --- HEADER FIXE --- */}
      <div className="bg-white/90 backdrop-blur-md sticky top-0 z-30 border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="bg-white p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-black hover:scale-105 transition-all">
               <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-[#2d3436] flex items-center gap-2">
                <Truck className="text-[#0984e3]" /> Matériel & Location
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Gestion Logistique & Parc
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
             <button className="bg-[#0984e3] hover:bg-[#0074d9] text-white px-4 py-2.5 rounded-xl shadow-lg shadow-blue-200 transition-all hover:scale-105 active:scale-95 font-bold uppercase flex items-center gap-2 text-xs">
                <Plus size={16} /> Ajouter Matériel
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

        {/* --- STATS RAPIDES --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Total Matériel</p>
                    <p className="text-2xl font-black text-[#2d3436]">{MOCK_INVENTORY.reduce((acc, i) => acc + i.total, 0)}</p>
                </div>
                <div className="bg-gray-100 p-2 rounded-xl text-gray-600"><Package size={20}/></div>
            </div>
            <div className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">En Location</p>
                    <p className="text-2xl font-black text-[#0984e3]">{MOCK_LOCATIONS.length}</p>
                </div>
                <div className="bg-blue-50 p-2 rounded-xl text-[#0984e3]"><Truck size={20}/></div>
            </div>
            <div className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Maintenance</p>
                    <p className="text-2xl font-black text-[#e17055]">1</p>
                </div>
                <div className="bg-orange-50 p-2 rounded-xl text-[#e17055]"><Wrench size={20}/></div>
            </div>
            <div className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Alertes Retour</p>
                    <p className="text-2xl font-black text-red-500">1</p>
                </div>
                <div className="bg-red-50 p-2 rounded-xl text-red-500"><AlertCircle size={20}/></div>
            </div>
        </div>

        {/* --- NAVIGATION ONGLETS --- */}
        <div className="flex gap-2 bg-white p-1.5 rounded-2xl w-fit shadow-sm border border-gray-100">
            <button 
                onClick={() => setActiveTab('inventaire')}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'inventaire' ? 'bg-[#2d3436] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
            >
                <LayoutGrid size={16}/> Inventaire
            </button>
            <button 
                onClick={() => setActiveTab('suivi')}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'suivi' ? 'bg-[#2d3436] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
            >
                <List size={16}/> Suivi Locations
            </button>
        </div>

        {/* ================= CONTENU : INVENTAIRE ================= */}
        {activeTab === 'inventaire' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
                
                {/* BARRE DE FILTRES */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-[25px] shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 w-full md:w-auto bg-gray-50 p-2 rounded-xl border border-gray-100">
                        <Search size={18} className="text-gray-400 ml-2" />
                        <input 
                            type="text" 
                            placeholder="Rechercher un matériel..." 
                            className="bg-transparent outline-none text-sm font-bold w-full md:w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                        {['Tous', 'Interne', 'Externe'].map(type => (
                            <button 
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border ${filterType === type ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                            >
                                {type}
                            </button>
                        ))}
                        <div className="w-px h-8 bg-gray-200 mx-2"></div>
                        <select 
                            className="bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded-xl px-4 py-2 outline-none cursor-pointer hover:border-gray-400"
                            value={filterCat}
                            onChange={(e) => setFilterCat(e.target.value)}
                        >
                            <option value="Toutes">Toutes Catégories</option>
                            <option value="Engin">Engins</option>
                            <option value="Outillage">Outillage</option>
                            <option value="EPI">EPI</option>
                            <option value="Accès">Accès / Échafaudages</option>
                        </select>
                    </div>
                </div>

                {/* GRILLE MATÉRIEL */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredInventory.map(item => (
                        <div key={item.id} className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all group relative overflow-hidden">
                            
                            {/* Badge Interne/Externe */}
                            <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-[20px] text-[10px] font-black uppercase tracking-widest ${item.type === 'Interne' ? 'bg-gray-100 text-gray-600' : 'bg-purple-100 text-purple-600'}`}>
                                {item.type}
                            </div>

                            <div className="flex items-start gap-4 mb-4">
                                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                                    {item.categorie === 'Outillage' ? <Wrench className="text-gray-400"/> : 
                                     item.categorie === 'Engin' ? <Truck className="text-gray-400"/> : 
                                     item.categorie === 'EPI' ? <Users className="text-gray-400"/> :
                                     <Package className="text-gray-400"/>}
                                </div>
                                <div>
                                    <h3 className="font-black text-lg text-gray-800 leading-tight">{item.nom}</h3>
                                    <p className="text-xs font-bold text-gray-400 uppercase mt-1">{item.categorie}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                                    <span className="text-xs font-bold text-gray-500">Disponible</span>
                                    <div className="flex items-center gap-1">
                                        <span className={`text-lg font-black ${item.dispo === 0 ? 'text-red-500' : 'text-[#00b894]'}`}>{item.dispo}</span>
                                        <span className="text-xs font-bold text-gray-400">/ {item.total}</span>
                                    </div>
                                </div>
                                
                                {item.type === 'Externe' && (
                                    <div className="flex justify-between items-center px-2">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Tarif Location</span>
                                        <span className="text-sm font-black text-gray-700">{item.prix}</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex items-center justify-between">
                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${getStatusColor(item.statut)}`}>
                                    {item.statut}
                                </span>
                                <button className="w-10 h-10 rounded-full bg-gray-800 text-white flex items-center justify-center hover:bg-[#00b894] transition-colors shadow-lg group-hover:scale-110">
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* ================= CONTENU : SUIVI LOCATIONS ================= */}
        {activeTab === 'suivi' && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white rounded-[30px] border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Materiel</th>
                                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Chantier Affecté</th>
                                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Période</th>
                                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Type</th>
                                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {MOCK_LOCATIONS.map((loc) => (
                                <tr key={loc.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="p-5 font-bold text-sm text-gray-800">
                                        {loc.materiel}
                                    </td>
                                    <td className="p-5">
                                        <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                                            <MapPin size={14} className="text-gray-300"/> {loc.chantier}
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg w-fit">
                                            <Calendar size={12}/> {loc.debut} <ArrowUpRight size={10} className="text-gray-300"/> {loc.fin}
                                        </div>
                                    </td>
                                    <td className="p-5 text-center">
                                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${loc.type === 'Interne' ? 'bg-gray-100 text-gray-500' : 'bg-purple-100 text-purple-500'}`}>
                                            {loc.type}
                                        </span>
                                    </td>
                                    <td className="p-5 text-right">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${getStatusColor(loc.statut)}`}>
                                            {loc.statut === 'En cours' && <CheckCircle2 size={12}/>}
                                            {loc.statut === 'À rendre' && <AlertCircle size={12}/>}
                                            {loc.statut}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    {MOCK_LOCATIONS.length === 0 && (
                        <div className="p-10 text-center text-gray-400 font-bold">
                            Aucune location en cours.
                        </div>
                    )}
                </div>
            </div>
        )}

      </div>
    </div>
  );
}
