"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Search, Filter, Plus, Truck, Package, Wrench, 
  Calendar, MapPin, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, 
  ArrowUpRight, Users, LayoutGrid, List, ClipboardList, X, Warehouse, Building2
} from 'lucide-react';
import Link from 'next/link';

export default function MaterielPage() {
  const [activeTab, setActiveTab] = useState<'inventaire' | 'suivi' | 'fournitures'>('inventaire');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('Tous'); // Tous, Interne, Externe
  const [filterCat, setFilterCat] = useState('Toutes');
  
  // États de données
  const [inventory, setInventory] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [fournitures, setFournitures] = useState<any[]>([]);
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [selectedChantierId, setSelectedChantierId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // État Modale Ajout
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalTab, setModalTab] = useState<'interne' | 'externe'>('interne'); // Onglet interne à la modale

  const [newItem, setNewItem] = useState({
      nom: '',
      categorie: 'Outillage',
      type_stock: 'Interne',
      qte_totale: 1,
      prix_location: 0,
      image: '',
      responsable: '', // Nouveau champ
      fournisseur: ''  // Nouveau champ pour externe
  });

  // --- CHARGEMENT DES DONNÉES ---
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Récupérer l'inventaire global
    const { data: matData } = await supabase.from('materiel').select('*').order('nom');
    
    // 2. Récupérer les locations (actives et passées)
    const { data: locData } = await supabase
      .from('chantier_materiel')
      .select('*, materiel(*), chantiers(nom)')
      .order('date_debut', { ascending: false });

    // 3. Récupérer les fournitures
    const { data: fournData } = await supabase
      .from('chantier_fournitures')
      .select('*, chantiers(nom)')
      .order('created_at', { ascending: false });

    // 4. Récupérer la liste des chantiers pour le filtre
    const { data: chantData } = await supabase
      .from('chantiers')
      .select('id, nom')
      .order('nom');

    if (matData) {
      const processedInventory = matData.map(item => {
        const usedQty = locData?.filter((l: any) => 
          l.materiel_id === item.id && 
          (l.statut === 'en_cours' || l.statut === 'prevu')
        ).reduce((acc, curr) => acc + (curr.qte_prise || 1), 0) || 0;
        
        return {
          ...item,
          dispo: (item.qte_totale || 0) - usedQty,
          statut: ((item.qte_totale || 0) - usedQty) > 0 ? 'En stock' : 'Indisponible' 
        };
      });
      setInventory(processedInventory);
    }

    if (locData) setLocations(locData);
    if (fournData) setFournitures(fournData);
    if (chantData) setChantiers(chantData);
    
    setLoading(false);
  };

  // --- AJOUT MATERIEL (INVENTAIRE) ---
  const handleAddItem = async () => {
      if (!newItem.nom) return alert("Le nom est obligatoire");
      
      // On force le type selon l'onglet actif
      const itemToSave = {
          ...newItem,
          type_stock: modalTab === 'interne' ? 'Interne' : 'Externe'
      };

      const { error } = await supabase.from('materiel').insert([itemToSave]);
      
      if (error) {
          alert("Erreur: " + error.message);
      } else {
          alert("✅ Matériel ajouté au catalogue !");
          setShowAddModal(false);
          setNewItem({ nom: '', categorie: 'Outillage', type_stock: 'Interne', qte_totale: 1, prix_location: 0, image: '', responsable: '', fournisseur: '' });
          fetchData();
      }
  };

  // --- LOGIQUES DE FILTRAGE ---
  const filteredInventory = inventory.filter(item => {
    const matchSearch = item.nom.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'Tous' || item.type_stock === (filterType === 'Interne' ? 'Interne' : 'Externe');
    const matchCat = filterCat === 'Toutes' || item.categorie === filterCat;
    return matchSearch && matchType && matchCat;
  });

  const filteredLocations = locations.filter(loc => {
    if (selectedChantierId === 'all') return true;
    return loc.chantier_id === selectedChantierId;
  });

  const filteredFournitures = fournitures.filter(f => {
    if (selectedChantierId === 'all') return true;
    return f.chantier_id === selectedChantierId;
  });

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'En stock': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'en_cours': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'prevu': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'maintenance': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'rendu': return 'bg-gray-100 text-gray-500 border-gray-200';
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
             <button onClick={() => setShowAddModal(true)} className="bg-[#0984e3] hover:bg-[#0074d9] text-white px-4 py-2.5 rounded-xl shadow-lg shadow-blue-200 transition-all hover:scale-105 active:scale-95 font-bold uppercase flex items-center gap-2 text-xs">
                <Plus size={16} /> Ajouter Matériel / Location
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

        {/* --- STATS RAPIDES (CONNECTÉES) --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Total Matériel</p>
                    <p className="text-2xl font-black text-[#2d3436]">{inventory.reduce((acc, i) => acc + (i.qte_totale || 0), 0)}</p>
                </div>
                <div className="bg-gray-100 p-2 rounded-xl text-gray-600"><Package size={20}/></div>
            </div>
            <div className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">En Location</p>
                    <p className="text-2xl font-black text-[#0984e3]">{locations.filter(l => l.statut === 'en_cours').length}</p>
                </div>
                <div className="bg-blue-50 p-2 rounded-xl text-[#0984e3]"><Truck size={20}/></div>
            </div>
            <div className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Prévu</p>
                    <p className="text-2xl font-black text-purple-500">{locations.filter(l => l.statut === 'prevu').length}</p>
                </div>
                <div className="bg-purple-50 p-2 rounded-xl text-purple-500"><Calendar size={20}/></div>
            </div>
            <div className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Fournitures</p>
                    <p className="text-2xl font-black text-orange-500">{fournitures.length}</p>
                </div>
                <div className="bg-orange-50 p-2 rounded-xl text-orange-500"><ClipboardList size={20}/></div>
            </div>
        </div>

        {/* --- NAVIGATION ONGLETS --- */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
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
                <button 
                    onClick={() => setActiveTab('fournitures')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'fournitures' ? 'bg-[#2d3436] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                    <Package size={16}/> Fournitures
                </button>
            </div>

            {/* FILTRE CHANTIER (Visible pour Suivi & Fournitures) */}
            {(activeTab === 'suivi' || activeTab === 'fournitures') && (
                <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase text-gray-400 ml-2">Filtrer par Chantier :</span>
                    <select 
                        className="bg-gray-50 text-sm font-bold p-2 rounded-lg outline-none cursor-pointer border border-transparent hover:border-gray-200 transition-colors"
                        value={selectedChantierId}
                        onChange={(e) => setSelectedChantierId(e.target.value)}
                    >
                        <option value="all">Tous les chantiers</option>
                        {chantiers.map(c => (
                            <option key={c.id} value={c.id}>{c.nom}</option>
                        ))}
                    </select>
                </div>
            )}
        </div>

        {/* ================= CONTENU : INVENTAIRE GLOBAL ================= */}
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
                            <option value="Véhicule">Véhicules</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-gray-400 font-bold animate-pulse">Chargement de l'inventaire...</div>
                ) : (
                    /* GRILLE MATÉRIEL */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredInventory.map(item => (
                            <div key={item.id} className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all group relative overflow-hidden">
                                
                                {/* Badge Interne/Externe */}
                                <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-[20px] text-[10px] font-black uppercase tracking-widest ${item.type_stock === 'Interne' ? 'bg-gray-100 text-gray-600' : 'bg-purple-100 text-purple-600'}`}>
                                    {item.type_stock}
                                </div>

                                <div className="flex items-start gap-4 mb-4">
                                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                                        {item.image || (item.categorie === 'Outillage' ? <Wrench className="text-gray-400"/> : 
                                        item.categorie === 'Engin' ? <Truck className="text-gray-400"/> : 
                                        item.categorie === 'EPI' ? <Users className="text-gray-400"/> :
                                        <Package className="text-gray-400"/>)}
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
                                            <span className={`text-lg font-black ${item.dispo <= 0 ? 'text-red-500' : 'text-[#00b894]'}`}>{item.dispo}</span>
                                            <span className="text-xs font-bold text-gray-400">/ {item.qte_totale}</span>
                                        </div>
                                    </div>
                                    
                                    {item.type_stock === 'Externe' && (
                                        <div className="flex flex-col gap-1 px-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">Tarif</span>
                                                <span className="text-sm font-black text-gray-700">{item.prix_location}€/j</span>
                                            </div>
                                            {item.fournisseur && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Fournisseur</span>
                                                    <span className="text-xs font-bold text-purple-600">{item.fournisseur}</span>
                                                </div>
                                            )}
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
                )}
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
                                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Quantité</th>
                                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredLocations.map((loc) => (
                                <tr key={loc.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="p-5 font-bold text-sm text-gray-800">
                                        {loc.materiel?.nom || 'Matériel Inconnu'}
                                        <div className="text-[10px] text-gray-400 font-normal uppercase">{loc.materiel?.type_stock}</div>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                                            <MapPin size={14} className="text-gray-300"/> {loc.chantiers?.nom || 'Non assigné'}
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg w-fit">
                                            <Calendar size={12}/> {loc.date_debut} <ArrowUpRight size={10} className="text-gray-300"/> {loc.date_fin}
                                        </div>
                                    </td>
                                    <td className="p-5 text-center font-black text-sm">
                                        {loc.qte_prise}
                                    </td>
                                    <td className="p-5 text-right">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${getStatusColor(loc.statut)}`}>
                                            {loc.statut === 'en_cours' && <CheckCircle2 size={12}/>}
                                            {loc.statut === 'rendu' && <CheckCircle2 size={12}/>}
                                            {loc.statut === 'prevu' && <Calendar size={12}/>}
                                            {loc.statut}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    {filteredLocations.length === 0 && (
                        <div className="p-10 text-center text-gray-400 font-bold">
                            Aucune location trouvée pour ce critère.
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* ================= CONTENU : FOURNITURES ================= */}
        {activeTab === 'fournitures' && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white rounded-[30px] border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fourniture</th>
                                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Catégorie</th>
                                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Chantier</th>
                                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Quantité Prévue</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredFournitures.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-5 font-bold text-sm text-gray-800">
                                        {item.nom}
                                    </td>
                                    <td className="p-5">
                                        <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded text-[10px] font-bold uppercase">
                                            {item.categorie}
                                        </span>
                                    </td>
                                    <td className="p-5 text-sm font-bold text-gray-600">
                                        {item.chantiers?.nom}
                                    </td>
                                    <td className="p-5 text-right font-black text-sm text-gray-800">
                                        {item.qte_prevue} {item.unite}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredFournitures.length === 0 && (
                        <div className="p-10 text-center text-gray-400 font-bold">
                            Aucune fourniture trouvée.
                        </div>
                    )}
                </div>
            </div>
        )}

      </div>

      {/* ================= MODALE AJOUT (DOUBLE ONGLET) ================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[30px] w-full max-w-lg shadow-2xl p-6 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-xl text-[#2d3436] flex items-center gap-2">
                        <Plus size={20} className="text-[#0984e3]"/> Ajouter au Parc
                    </h3>
                    <button onClick={() => setShowAddModal(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors">
                        <X size={16}/>
                    </button>
                </div>

                {/* SÉLECTEUR DE TYPE */}
                <div className="flex gap-2 bg-gray-100 p-1 rounded-xl mb-6">
                    <button 
                        onClick={() => { setModalTab('interne'); setNewItem({...newItem, type_stock: 'Interne'}); }}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase flex items-center justify-center gap-2 transition-all ${modalTab === 'interne' ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Warehouse size={16}/> Stock Agence
                    </button>
                    <button 
                        onClick={() => { setModalTab('externe'); setNewItem({...newItem, type_stock: 'Externe'}); }}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase flex items-center justify-center gap-2 transition-all ${modalTab === 'externe' ? 'bg-purple-100 text-purple-600 shadow' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Building2 size={16}/> Location Externe
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {modalTab === 'interne' ? 'Nom du Matériel' : 'Matériel Loué'}
                        </label>
                        <input 
                            className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none border border-transparent focus:border-[#0984e3]"
                            placeholder={modalTab === 'interne' ? "Ex: Hilti TE-30" : "Ex: Nacelle 12m"}
                            value={newItem.nom}
                            onChange={e => setNewItem({...newItem, nom: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Catégorie</label>
                            <select 
                                className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none cursor-pointer"
                                value={newItem.categorie}
                                onChange={e => setNewItem({...newItem, categorie: e.target.value})}
                            >
                                <option value="Outillage">Outillage</option>
                                <option value="Engin">Engin</option>
                                <option value="EPI">EPI</option>
                                <option value="Accès">Accès / Échafaudage</option>
                                <option value="Véhicule">Véhicule</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quantité</label>
                            <input 
                                type="number" min="1"
                                className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none"
                                value={newItem.qte_totale}
                                onChange={e => setNewItem({...newItem, qte_totale: parseInt(e.target.value)})}
                            />
                        </div>
                    </div>

                    {/* CHAMPS SPÉCIFIQUES EXTERNE */}
                    {modalTab === 'externe' && (
                        <div className="grid grid-cols-2 gap-4 bg-purple-50 p-4 rounded-xl border border-purple-100">
                            <div>
                                <label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Fournisseur</label>
                                <input 
                                    className="w-full bg-white p-2 rounded-lg font-bold outline-none text-sm"
                                    placeholder="Ex: Kiloutou"
                                    value={newItem.fournisseur}
                                    onChange={e => setNewItem({...newItem, fournisseur: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Prix / Jour (€)</label>
                                <input 
                                    type="number" min="0"
                                    className="w-full bg-white p-2 rounded-lg font-bold outline-none text-sm"
                                    value={newItem.prix_location}
                                    onChange={e => setNewItem({...newItem, prix_location: parseFloat(e.target.value)})}
                                />
                            </div>
                        </div>
                    )}

                    {/* CHAMP RESPONSABLE (Commun) */}
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Responsable (Réception/Suivi)</label>
                        <input 
                            className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none"
                            placeholder="Nom du responsable..."
                            value={newItem.responsable}
                            onChange={e => setNewItem({...newItem, responsable: e.target.value})}
                        />
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button 
                        onClick={handleAddItem}
                        className={`px-8 py-3 rounded-xl font-black uppercase shadow-lg transition-transform hover:scale-105 text-white ${modalTab === 'interne' ? 'bg-[#0984e3] hover:bg-[#0074d9] shadow-blue-200' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-200'}`}
                    >
                        {modalTab === 'interne' ? 'Ajouter au Stock' : 'Créer Location'}
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}
