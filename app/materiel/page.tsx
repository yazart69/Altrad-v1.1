"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Search, Filter, Plus, Truck, Package, Wrench, 
  Calendar, MapPin, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, 
  ArrowUpRight, Users, LayoutGrid, List, ClipboardList, X, Warehouse, Building2, Trash2, Container,
  Palette, Box, AlertTriangle, Save
} from 'lucide-react';
import Link from 'next/link';

export default function MagasinierPage() {
  // Onglets : 'stock' est le nouveau gestionnaire de base de données
  const [activeTab, setActiveTab] = useState<'stock' | 'inventaire' | 'suivi' | 'besoins'>('stock');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('Tous'); // Tous, Interne, Externe, Base Logistique
  const [filterCat, setFilterCat] = useState('Toutes');
   
  // États de données
  const [inventory, setInventory] = useState<any[]>([]); // Matériel (Outils)
  const [locations, setLocations] = useState<any[]>([]); // Locations
  const [fournituresChantier, setFournituresChantier] = useState<any[]>([]); // Besoins remontés des chantiers
  const [stockFournitures, setStockFournitures] = useState<any[]>([]); // Base de données Stock
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [selectedChantierId, setSelectedChantierId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // État Modale Ajout MATERIEL
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalTab, setModalTab] = useState<'interne' | 'externe' | 'base'>('interne'); 

  // État Modale Ajout STOCK FOURNITURE
  const [showAddSupplyModal, setShowAddSupplyModal] = useState(false);

  // State pour le formulaire MATERIEL
  const [newItem, setNewItem] = useState({
      nom: '',
      categorie: 'Outillage',
      type_stock: 'Interne',
      qte_totale: 1,
      prix_location: 0,
      image: '',
      responsable: '',
      fournisseur: '',
      chantier_id: '', 
      date_debut: '',
      date_fin: ''
  });

  // State pour le formulaire STOCK FOURNITURE
  const [newSupply, setNewSupply] = useState({
      nom: '', 
      categorie: 'Peinture', 
      ral: '', 
      conditionnement: '', 
      unite: 'U', 
      qte_stock: 0,
      seuil_alerte: 5
  });

  // --- CHARGEMENT DES DONNÉES (SÉCURISÉ) ---
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
        setLoading(true);
        console.log("Chargement Magasinier...");

        try {
            // On lance toutes les requêtes en parallèle et on accepte les échecs individuels
            const results = await Promise.allSettled([
                supabase.from('materiel').select('*').order('nom'),
                supabase.from('chantier_materiel').select('*, materiel(*), chantiers(id, nom)').order('date_debut', { ascending: false }),
                supabase.from('chantier_fournitures').select('*, chantiers(nom)').order('created_at', { ascending: false }),
                supabase.from('chantiers').select('id, nom').order('nom'),
                supabase.from('fournitures_stock').select('*').order('nom')
            ]);

            if (!isMounted) return;

            // 1. Matériel
            let matData: any[] = [];
            if (results[0].status === 'fulfilled' && results[0].value.data) {
                matData = results[0].value.data;
            }

            // 2. Locations
            let locData: any[] = [];
            if (results[1].status === 'fulfilled' && results[1].value.data) {
                locData = results[1].value.data;
                setLocations(locData);
            }

            // 3. Fournitures Chantier
            if (results[2].status === 'fulfilled' && results[2].value.data) {
                setFournituresChantier(results[2].value.data);
            }

            // 4. Chantiers
            if (results[3].status === 'fulfilled' && results[3].value.data) {
                setChantiers(results[3].value.data);
            }

            // 5. Stock Fournitures
            if (results[4].status === 'fulfilled' && results[4].value.data) {
                setStockFournitures(results[4].value.data);
            } else if (results[4].status === 'rejected') {
                console.warn("Table fournitures_stock inaccessible :", results[4].reason);
            }

            // Traitement Inventaire (Calcul dispo)
            if (matData.length > 0) {
                const processedInventory = matData.map(item => {
                    const usedQty = locData.filter((l: any) => 
                        l.materiel_id === item.id && 
                        (l.statut === 'en_cours' || l.statut === 'prevu')
                    ).reduce((acc: number, curr: any) => acc + (curr.qte_prise || 1), 0) || 0;
                    
                    return {
                        ...item,
                        dispo: (item.qte_totale || 0) - usedQty,
                        statut: ((item.qte_totale || 0) - usedQty) > 0 ? 'En stock' : 'Indisponible' 
                    };
                });
                setInventory(processedInventory);
            } else {
                setInventory([]);
            }

        } catch (error: any) {
            console.error("Erreur critique chargement magasinier:", error);
            // Pas d'alert pour ne pas spammer l'utilisateur, mais log console
        } finally {
            if (isMounted) setLoading(false);
        }
    };

    fetchData();

    return () => { isMounted = false; };
  }, []);


  // --- ACTIONS MATERIEL (INVENTAIRE) ---
  const handleAddItem = async () => {
      if (!newItem.nom) return alert("Le nom est obligatoire");
      
      let stockType = 'Interne';
      if (modalTab === 'externe') stockType = 'Externe';
      if (modalTab === 'base') stockType = 'Base Logistique';

      const itemToSave = {
          nom: newItem.nom,
          categorie: newItem.categorie,
          type_stock: stockType,
          qte_totale: newItem.qte_totale,
          prix_location: newItem.prix_location,
          image: newItem.image,
          responsable: newItem.responsable,
          fournisseur: newItem.fournisseur
      };

      const { data: createdMat, error: matError } = await supabase
        .from('materiel')
        .insert([itemToSave])
        .select()
        .single();
      
      if (matError) {
          return alert("Erreur création matériel : " + matError.message);
      }

      if (modalTab === 'externe' && newItem.chantier_id && createdMat) {
          const { error: locError } = await supabase.from('chantier_materiel').insert([{
              chantier_id: newItem.chantier_id,
              materiel_id: createdMat.id,
              date_debut: newItem.date_debut || null,
              date_fin: newItem.date_fin || null,
              qte_prise: newItem.qte_totale,
              statut: 'en_cours'
          }]);

          if (locError) console.error("Erreur affectation chantier:", locError);
      }

      alert("✅ Enregistré avec succès !");
      setShowAddModal(false);
      setNewItem({ 
          nom: '', categorie: 'Outillage', type_stock: 'Interne', qte_totale: 1, 
          prix_location: 0, image: '', responsable: '', fournisseur: '',
          chantier_id: '', date_debut: '', date_fin: ''
      });
      
      // Rechargement simple (on peut optimiser mais restons simple pour la stabilité)
      window.location.reload(); 
  };

  const handleDeleteItem = async (id: string, nom: string) => {
      if(confirm(`⚠️ Êtes-vous sûr de vouloir supprimer "${nom}" ?\nCette action est irréversible.`)) {
          const { error } = await supabase.from('materiel').delete().eq('id', id);
          if(error) {
              alert("Erreur : " + error.message);
          } else {
              setInventory(prev => prev.filter(item => item.id !== id));
          }
      }
  };

  // --- ACTIONS STOCK FOURNITURES (MAGASINIER) ---
  const handleAddSupply = async () => {
      if(!newSupply.nom) return alert("Le nom du produit est obligatoire");
      
      const { data, error } = await supabase.from('fournitures_stock').insert([newSupply]).select();
      
      if(error) {
          alert("Erreur ajout stock : " + error.message);
      } else {
          alert("✅ Référence ajoutée au catalogue !");
          setShowAddSupplyModal(false);
          setNewSupply({ 
              nom: '', categorie: 'Peinture', ral: '', conditionnement: '', 
              unite: 'U', qte_stock: 0, seuil_alerte: 5 
          });
          if(data) setStockFournitures([...stockFournitures, data[0]]);
      }
  };

  const updateStockQty = async (id: string, newQty: number) => {
      const safeQty = Math.max(0, newQty);
      // Mise à jour optimiste
      setStockFournitures(prev => prev.map(s => s.id === id ? { ...s, qte_stock: safeQty } : s));
      // Mise à jour BDD
      await supabase.from('fournitures_stock').update({ qte_stock: safeQty }).eq('id', id);
  };

  const handleDeleteSupply = async (id: string) => {
      if(confirm("Supprimer définitivement cette référence du stock ?")) {
          const { error } = await supabase.from('fournitures_stock').delete().eq('id', id);
          if(error) alert("Erreur suppression : " + error.message);
          else setStockFournitures(prev => prev.filter(s => s.id !== id));
      }
  };

  // --- FILTRES ---
  const filteredInventory = inventory.filter(item => {
    const matchSearch = item.nom.toLowerCase().includes(searchTerm.toLowerCase());
    let matchType = true;
    if (filterType !== 'Tous') {
        matchType = item.type_stock === filterType;
    }
    const matchCat = filterCat === 'Toutes' || item.categorie === filterCat;
    return matchSearch && matchType && matchCat;
  });

  const filteredStockSupplies = stockFournitures.filter(s => 
    s.nom.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.ral && s.ral.includes(searchTerm))
  );

  const filteredLocations = locations.filter(loc => {
    if (selectedChantierId === 'all') return true;
    return loc.chantier_id === selectedChantierId;
  });

  const filteredFournituresChantier = fournituresChantier.filter(f => {
    if (selectedChantierId === 'all') return true;
    return f.chantier_id === selectedChantierId;
  });

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'En stock': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'en_cours': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'prevu': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'maintenance': return 'bg-orange-100 text-orange-700 border-orange-200';
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
                <Warehouse className="text-orange-500" /> Espace Magasinier
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Gestion Stocks & Parc Matériel
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
             {activeTab === 'stock' ? (
                 <button onClick={() => setShowAddSupplyModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-orange-200 transition-all hover:scale-105 active:scale-95 font-bold uppercase flex items-center gap-2 text-xs">
                    <Plus size={16} /> Nouvelle Référence
                 </button>
             ) : (
                 <button onClick={() => setShowAddModal(true)} className="bg-[#0984e3] hover:bg-[#0074d9] text-white px-4 py-2.5 rounded-xl shadow-lg shadow-blue-200 transition-all hover:scale-105 active:scale-95 font-bold uppercase flex items-center gap-2 text-xs">
                    <Plus size={16} /> Ajouter Matériel
                 </button>
             )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

        {/* --- STATS --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Stock Fournitures</p>
                    <p className="text-2xl font-black text-orange-500">{stockFournitures.length} Réf.</p>
                </div>
                <div className="bg-orange-50 p-2 rounded-xl text-orange-500"><Package size={20}/></div>
            </div>
            <div className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Parc Matériel</p>
                    <p className="text-2xl font-black text-[#2d3436]">{inventory.reduce((acc, i) => acc + (i.qte_totale || 0), 0)}</p>
                </div>
                <div className="bg-gray-100 p-2 rounded-xl text-gray-600"><Wrench size={20}/></div>
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
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Alertes Stock</p>
                    <p className="text-2xl font-black text-red-500">{stockFournitures.filter(s => s.qte_stock <= s.seuil_alerte).length}</p>
                </div>
                <div className="bg-red-50 p-2 rounded-xl text-red-500"><AlertCircle size={20}/></div>
            </div>
        </div>

        {/* --- ONGLETS --- */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="flex gap-2 bg-white p-1.5 rounded-2xl w-fit shadow-sm border border-gray-100">
                <button onClick={() => setActiveTab('stock')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'stock' ? 'bg-[#2d3436] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>
                    <Package size={16}/> Stock Fournitures
                </button>
                <button onClick={() => setActiveTab('inventaire')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'inventaire' ? 'bg-[#2d3436] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>
                    <LayoutGrid size={16}/> Parc Matériel
                </button>
                <button onClick={() => setActiveTab('suivi')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'suivi' ? 'bg-[#2d3436] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>
                    <List size={16}/> Suivi Locations
                </button>
                <button onClick={() => setActiveTab('besoins')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'besoins' ? 'bg-[#2d3436] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>
                    <ClipboardList size={16}/> Besoins Chantiers
                </button>
            </div>

            {(activeTab === 'suivi' || activeTab === 'besoins') && (
                <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase text-gray-400 ml-2">Filtrer par Chantier :</span>
                    <select 
                        className="bg-gray-50 text-sm font-bold p-2 rounded-lg outline-none cursor-pointer border border-transparent hover:border-gray-200 transition-colors"
                        value={selectedChantierId}
                        onChange={(e) => setSelectedChantierId(e.target.value)}
                    >
                        <option value="all">Tous les chantiers</option>
                        {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                    </select>
                </div>
            )}
        </div>

        {/* ================= CONTENU : STOCK FOURNITURES (NOUVEAU) ================= */}
        {activeTab === 'stock' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
                
                {/* Actions Bar */}
                <div className="flex justify-between items-center bg-white p-4 rounded-[25px] shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 w-full md:w-auto">
                        <Search size={18} className="text-gray-400 ml-2" />
                        <input 
                            type="text" 
                            placeholder="Chercher (Nom, RAL...)" 
                            className="bg-transparent outline-none text-sm font-bold w-full md:w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {/* Le bouton d'ajout est dans le header mais on peut le mettre ici aussi si on veut */}
                </div>

                {/* Tableau Stock */}
                <div className="bg-white rounded-[30px] border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Produit</th>
                                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Détails (RAL/Cond.)</th>
                                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">En Stock</th>
                                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredStockSupplies.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-10 text-center text-gray-400 font-bold">Aucune référence trouvée.</td>
                                </tr>
                            )}
                            {filteredStockSupplies.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-5">
                                        <div className="font-black text-sm text-gray-800">{item.nom}</div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase bg-gray-100 px-2 py-0.5 rounded w-fit mt-1">{item.categorie}</div>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex flex-col gap-1">
                                            {item.ral && (
                                                <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                                                    <Palette size={12} className="text-purple-500"/> RAL {item.ral}
                                                </div>
                                            )}
                                            {item.conditionnement && (
                                                <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                                                    <Box size={12} className="text-blue-500"/> {item.conditionnement}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-5 text-center">
                                        <div className="flex items-center justify-center gap-3">
                                            <button onClick={() => updateStockQty(item.id, (item.qte_stock || 0) - 1)} className="w-6 h-6 bg-gray-100 rounded-full hover:bg-gray-200 font-bold">-</button>
                                            <div className="flex flex-col items-center">
                                                <span className={`text-lg font-black ${item.qte_stock <= item.seuil_alerte ? 'text-red-500' : 'text-emerald-600'}`}>{item.qte_stock}</span>
                                                <span className="text-[9px] text-gray-400 uppercase">{item.unite}</span>
                                            </div>
                                            <button onClick={() => updateStockQty(item.id, (item.qte_stock || 0) + 1)} className="w-6 h-6 bg-gray-100 rounded-full hover:bg-gray-200 font-bold">+</button>
                                        </div>
                                        {item.qte_stock <= item.seuil_alerte && <div className="text-[8px] font-black text-red-500 uppercase mt-1 flex items-center justify-center gap-1"><AlertTriangle size={8}/> Stock bas</div>}
                                    </td>
                                    <td className="p-5 text-right">
                                        <button onClick={() => handleDeleteSupply(item.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors">
                                            <Trash2 size={16}/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* ================= CONTENU : INVENTAIRE MATERIEL ================= */}
        {activeTab === 'inventaire' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
                
                {/* FILTRES INVENTAIRE */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-[25px] shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 w-full md:w-auto bg-gray-50 p-2 rounded-xl border border-gray-100">
                        <Search size={18} className="text-gray-400 ml-2" />
                        <input type="text" placeholder="Rechercher..." className="bg-transparent outline-none text-sm font-bold w-full md:w-64" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                        {['Tous', 'Interne', 'Externe', 'Base Logistique'].map(type => (
                            <button 
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border ${filterType === type ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                            >
                                {type}
                            </button>
                        ))}
                        <div className="w-px h-8 bg-gray-200 mx-2"></div>
                        <select className="bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded-xl px-4 py-2 outline-none cursor-pointer hover:border-gray-400" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
                            <option value="Toutes">Toutes Catégories</option>
                            <option value="Engin">Engins</option>
                            <option value="Outillage">Outillage</option>
                            <option value="EPI">EPI</option>
                            <option value="Accès">Accès / Échafaudages</option>
                            <option value="Véhicule">Véhicules</option>
                        </select>
                    </div>
                </div>

                {loading ? <div className="text-center py-20 text-gray-400 font-bold animate-pulse">Chargement...</div> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredInventory.map(item => {
                            // LOGIQUE POUR TROUVER LE CHANTIER ACTIF
                            const activeLocation = locations.find(l => l.materiel_id === item.id && l.statut === 'en_cours');
                            
                            return (
                            <div key={item.id} className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all group relative overflow-hidden">
                                
                                {/* Badge Type */}
                                <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-[20px] text-[10px] font-black uppercase tracking-widest ${
                                    item.type_stock === 'Interne' ? 'bg-gray-100 text-gray-600' : 
                                    item.type_stock === 'Base Logistique' ? 'bg-blue-100 text-blue-600' :
                                    'bg-purple-100 text-purple-600'
                                }`}>
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
                                    <div className="flex gap-2">
                                        <button onClick={() => handleDeleteItem(item.id, item.nom)} className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors" title="Supprimer">
                                            <Trash2 size={16} />
                                        </button>
                                        {activeLocation ? (
                                            <Link href={`/chantiers/${activeLocation.chantier_id}`} className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors shadow-lg group-hover:scale-110" title={`Aller au chantier : ${activeLocation.chantiers?.nom}`}>
                                                <ArrowRight size={18} />
                                            </Link>
                                        ) : (
                                            <button disabled className="w-10 h-10 rounded-full bg-gray-100 text-gray-300 flex items-center justify-center cursor-not-allowed" title="En stock (non assigné)">
                                                <ArrowRight size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                )}
            </div>
        )}

        {/* SUIVI LOCATIONS */}
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
                                            {loc.statut}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* BESOINS CHANTIERS (EX-FOURNITURES) */}
        {activeTab === 'besoins' && (
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
                            {filteredFournituresChantier.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-5 font-bold text-sm text-gray-800">{item.nom}</td>
                                    <td className="p-5"><span className="bg-orange-50 text-orange-600 px-2 py-1 rounded text-[10px] font-bold uppercase">{item.categorie}</span></td>
                                    <td className="p-5 text-sm font-bold text-gray-600">{item.chantiers?.nom}</td>
                                    <td className="p-5 text-right font-black text-sm text-gray-800">{item.qte_prevue} {item.unite}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

      </div>

      {/* ================= MODALE AJOUT MATERIEL ================= */}
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
                    <button onClick={() => { setModalTab('interne'); setNewItem({...newItem, type_stock: 'Interne'}); }} className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase flex items-center justify-center gap-2 transition-all ${modalTab === 'interne' ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>
                        <Warehouse size={16}/> Stock Agence
                    </button>
                    <button onClick={() => { setModalTab('base'); setNewItem({...newItem, type_stock: 'Base Logistique'}); }} className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase flex items-center justify-center gap-2 transition-all ${modalTab === 'base' ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>
                        <Container size={16}/> Base Logistique
                    </button>
                    <button onClick={() => { setModalTab('externe'); setNewItem({...newItem, type_stock: 'Externe'}); }} className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase flex items-center justify-center gap-2 transition-all ${modalTab === 'externe' ? 'bg-purple-100 text-purple-600 shadow' : 'text-gray-400 hover:text-gray-600'}`}>
                        <Building2 size={16}/> Location Externe
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {modalTab === 'externe' ? 'Matériel Loué' : 'Nom du Matériel'}
                        </label>
                        <input className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none border border-transparent focus:border-[#0984e3]" placeholder="Ex: Hilti TE-30" value={newItem.nom} onChange={e => setNewItem({...newItem, nom: e.target.value})}/>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Catégorie</label>
                            <select className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none cursor-pointer" value={newItem.categorie} onChange={e => setNewItem({...newItem, categorie: e.target.value})}>
                                <option value="Outillage">Outillage</option>
                                <option value="Engin">Engin</option>
                                <option value="EPI">EPI</option>
                                <option value="Accès">Accès / Échafaudage</option>
                                <option value="Véhicule">Véhicule</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quantité</label>
                            <input type="number" min="1" className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none" value={newItem.qte_totale} onChange={e => setNewItem({...newItem, qte_totale: parseInt(e.target.value)})}/>
                        </div>
                    </div>

                    {modalTab === 'externe' && (
                        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Fournisseur</label><input className="w-full bg-white p-2 rounded-lg font-bold outline-none text-sm" placeholder="Ex: Kiloutou" value={newItem.fournisseur} onChange={e => setNewItem({...newItem, fournisseur: e.target.value})}/></div>
                                <div><label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Prix / Jour (€)</label><input type="number" min="0" className="w-full bg-white p-2 rounded-lg font-bold outline-none text-sm" value={newItem.prix_location} onChange={e => setNewItem({...newItem, prix_location: parseFloat(e.target.value)})}/></div>
                            </div>
                            <hr className="border-purple-200/50"/>
                            <div>
                                <label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Chantier de Destination</label>
                                <select className="w-full bg-white p-2 rounded-lg font-bold outline-none text-sm cursor-pointer" value={newItem.chantier_id} onChange={e => setNewItem({...newItem, chantier_id: e.target.value})}>
                                    <option value="">-- Sélectionner un chantier --</option>
                                    {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                                </select>
                            </div>
                            {newItem.chantier_id && (
                                <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                                    <div><label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Date Début</label><input type="date" className="w-full bg-white p-2 rounded-lg font-bold outline-none text-sm" value={newItem.date_debut} onChange={e => setNewItem({...newItem, date_debut: e.target.value})}/></div>
                                    <div><label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Date Fin</label><input type="date" className="w-full bg-white p-2 rounded-lg font-bold outline-none text-sm" value={newItem.date_fin} onChange={e => setNewItem({...newItem, date_fin: e.target.value})}/></div>
                                </div>
                            )}
                        </div>
                    )}

                    <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Responsable</label><input className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none" placeholder="Nom du responsable..." value={newItem.responsable} onChange={e => setNewItem({...newItem, responsable: e.target.value})}/></div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button onClick={handleAddItem} className={`px-8 py-3 rounded-xl font-black uppercase shadow-lg transition-transform hover:scale-105 text-white ${modalTab === 'externe' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' : 'bg-[#0984e3] hover:bg-[#0074d9] shadow-blue-200'}`}>
                        {modalTab === 'externe' ? 'Créer Location' : 'Ajouter au Stock'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* ================= MODALE AJOUT STOCK FOURNITURE ================= */}
      {showAddSupplyModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-[30px] w-full max-w-lg shadow-2xl p-6 animate-in zoom-in-95">
                    <h3 className="font-black text-xl text-[#2d3436] mb-6 flex items-center gap-2"><Package className="text-orange-500"/> Nouvelle Référence Stock</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Nom Produit</label>
                            <input className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none" placeholder="Ex: Striasol" value={newSupply.nom} onChange={e => setNewSupply({...newSupply, nom: e.target.value})}/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Catégorie</label>
                                <select className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none" value={newSupply.categorie} onChange={e => setNewSupply({...newSupply, categorie: e.target.value})}>
                                    <option value="Peinture">Peinture</option>
                                    <option value="Consommable">Consommable</option>
                                    <option value="Visserie">Visserie</option>
                                    <option value="EPI">EPI</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Unité</label>
                                <select className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none" value={newSupply.unite} onChange={e => setNewSupply({...newSupply, unite: e.target.value})}>
                                    <option value="U">Unité (U)</option>
                                    <option value="L">Litres (L)</option>
                                    <option value="Kg">Kilos (Kg)</option>
                                    <option value="M2">m²</option>
                                    <option value="Rlx">Rouleaux</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">RAL / Ref</label>
                                <input className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none" placeholder="Ex: 7016" value={newSupply.ral} onChange={e => setNewSupply({...newSupply, ral: e.target.value})}/>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Conditionnement</label>
                                <input className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none" placeholder="Ex: Pot 15L" value={newSupply.conditionnement} onChange={e => setNewSupply({...newSupply, conditionnement: e.target.value})}/>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Stock Initial</label>
                                <input type="number" className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none" value={newSupply.qte_stock} onChange={e => setNewSupply({...newSupply, qte_stock: parseInt(e.target.value)})}/>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Seuil Alerte</label>
                                <input type="number" className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none text-orange-500" value={newSupply.seuil_alerte} onChange={e => setNewSupply({...newSupply, seuil_alerte: parseInt(e.target.value)})}/>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <button onClick={() => setShowAddSupplyModal(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl">Annuler</button>
                        <button onClick={handleAddSupply} className="px-6 py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 shadow-lg">Enregistrer</button>
                    </div>
                </div>
            </div>
      )}

    </div>
  );
}
