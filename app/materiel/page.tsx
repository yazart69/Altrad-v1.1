"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Search, Plus, Truck, Package, Wrench, 
  Calendar, MapPin, ArrowRight, ArrowLeft, AlertCircle, 
  Users, LayoutGrid, List, ClipboardList, X, Warehouse, Building2, Trash2, Container,
  Palette, Box, AlertTriangle, Save, Calculator, Loader2, Printer, ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface IMateriel {
  id: string;
  nom: string;
  categorie: string;
  type_stock: string;
  qte_totale: number;
  prix_location: number;
  image?: string;
  responsable?: string;
  fournisseur?: string;
  dispo?: number;
  statut?: string;
}

interface IFournitureStock {
  id: string;
  nom: string;
  categorie: string;
  ral?: string;
  conditionnement?: string;
  unite: string;
  qte_stock: number;
  seuil_alerte: number;
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function MagasinierPage() {
  const [activeTab, setActiveTab] = useState<'stock' | 'inventaire' | 'suivi' | 'besoins'>('stock');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('Tous');
  const [filterCat, setFilterCat] = useState('Toutes');
   
  const [inventory, setInventory] = useState<IMateriel[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [fournituresChantier, setFournituresChantier] = useState<any[]>([]);
  const [stockFournitures, setStockFournitures] = useState<IFournitureStock[]>([]);
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [selectedChantierId, setSelectedChantierId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalTab, setModalTab] = useState<'interne' | 'externe' | 'base'>('interne'); 
  const [showAddSupplyModal, setShowAddSupplyModal] = useState(false);

  // Formulaires
  const [newItem, setNewItem] = useState({
      nom: '', categorie: 'Outillage', type_stock: 'Interne', qte_totale: 1,
      prix_location: 0, image: '', responsable: '', fournisseur: '',
      chantier_id: '', date_debut: '', date_fin: ''
  });

  const [newSupply, setNewSupply] = useState({
      nom: '', categorie: 'Peinture', ral: '', conditionnement: '', 
      unite: 'U', qte_stock: 0, seuil_alerte: 5
  });

  // --- LOGIQUE CALCUL CONTENANTS ---
  const calculateContainers = (totalStock: number, conditionnement: string) => {
      if (!conditionnement || totalStock <= 0) return null;
      const match = conditionnement.match(/(\d+(\.\d+)?)/);
      if (match) {
          const volumeParPot = parseFloat(match[0]);
          if (volumeParPot > 0) {
              const nbPots = totalStock / volumeParPot;
              return Number.isInteger(nbPots) ? nbPots : nbPots.toFixed(1);
          }
      }
      return null;
  };

  // --- CHARGEMENT ---
  const fetchData = async () => {
    setLoading(true);
    try {
        const [matRes, chanMatRes, chanFourRes, chanRes, stockRes] = await Promise.all([
            supabase.from('materiel').select('*').order('nom'),
            supabase.from('chantier_materiel').select('*, materiel(*), chantiers(id, nom)').order('date_debut', { ascending: false }),
            supabase.from('chantier_fournitures').select('*, chantiers(nom)').order('created_at', { ascending: false }),
            supabase.from('chantiers').select('id, nom').order('nom'),
            supabase.from('fournitures_stock').select('*').order('nom')
        ]);

        if (chanRes.data) setChantiers(chanRes.data);
        if (chanMatRes.data) setLocations(chanMatRes.data);
        if (chanFourRes.data) setFournituresChantier(chanFourRes.data);
        if (stockRes.data) setStockFournitures(stockRes.data);

        if (matRes.data) {
            const processed = matRes.data.map(item => {
                const usedQty = (chanMatRes.data || [])
                    .filter((l: any) => l.materiel_id === item.id && (l.statut === 'en_cours' || l.statut === 'prevu'))
                    .reduce((acc: number, curr: any) => acc + (curr.qte_prise || 1), 0);
                return {
                    ...item,
                    dispo: (item.qte_totale || 0) - usedQty,
                    statut: ((item.qte_totale || 0) - usedQty) > 0 ? 'En stock' : 'Indisponible' 
                };
            });
            setInventory(processed);
        }
    } catch (error) {
        toast.error("Erreur de synchronisation des stocks");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- ACTIONS ---
  const handleAddItem = async () => {
      if (!newItem.nom) return toast.error("Le nom est obligatoire");
      const toastId = toast.loading("Ajout au parc...");
      
      let stockType = modalTab === 'externe' ? 'Externe' : modalTab === 'base' ? 'Base Logistique' : 'Interne';

      const { data: createdMat, error: matError } = await supabase
        .from('materiel')
        .insert([{ 
            nom: newItem.nom, 
            categorie: newItem.categorie, 
            type_stock: stockType, 
            qte_totale: newItem.qte_totale, 
            prix_location: newItem.prix_location,
            responsable: newItem.responsable,
            fournisseur: newItem.fournisseur
        }])
        .select().single();
      
      if (matError) return toast.error(matError.message, { id: toastId });

      if (modalTab === 'externe' && newItem.chantier_id && createdMat) {
          await supabase.from('chantier_materiel').insert([{
              chantier_id: newItem.chantier_id,
              materiel_id: createdMat.id,
              date_debut: newItem.date_debut || null,
              date_fin: newItem.date_fin || null,
              qte_prise: newItem.qte_totale,
              statut: 'en_cours'
          }]);
      }

      toast.success("Matériel enregistré !", { id: toastId });
      setShowAddModal(false);
      setNewItem({ nom: '', categorie: 'Outillage', type_stock: 'Interne', qte_totale: 1, prix_location: 0, image: '', responsable: '', fournisseur: '', chantier_id: '', date_debut: '', date_fin: '' });
      fetchData();
  };

  const handleAddSupply = async () => {
    if(!newSupply.nom) return toast.error("Le nom du produit est obligatoire");
    const toastId = toast.loading("Ajout stock...");
    const { error } = await supabase.from('fournitures_stock').insert([newSupply]);
    if(error) toast.error(error.message, { id: toastId });
    else {
        toast.success("Référence ajoutée !", { id: toastId });
        setShowAddSupplyModal(false);
        setNewSupply({ nom: '', categorie: 'Peinture', ral: '', conditionnement: '', unite: 'U', qte_stock: 0, seuil_alerte: 5 });
        fetchData();
    }
  };

  const handleUpdateStock = async (id: string, newQty: number) => {
      const safeQty = Math.max(0, newQty);
      setStockFournitures(prev => prev.map(s => s.id === id ? { ...s, qte_stock: safeQty } : s));
      const { error } = await supabase.from('fournitures_stock').update({ qte_stock: safeQty }).eq('id', id);
      if (error) toast.error("Erreur de mise à jour");
  };

  const handleDeleteItem = async (id: string, type: 'mat' | 'sup') => {
      if (!confirm("Supprimer définitivement cette référence ?")) return;
      const table = type === 'mat' ? 'materiel' : 'fournitures_stock';
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (!error) {
          toast.success("Référence supprimée");
          fetchData();
      }
  };

  // --- FILTRAGE MÉMORISÉ ---
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
        const mSearch = item.nom.toLowerCase().includes(searchTerm.toLowerCase());
        const mType = filterType === 'Tous' || item.type_stock === filterType;
        const mCat = filterCat === 'Toutes' || item.categorie === filterCat;
        return mSearch && mType && mCat;
    });
  }, [inventory, searchTerm, filterType, filterCat]);

  const filteredStock = useMemo(() => {
    return stockFournitures.filter(s => s.nom.toLowerCase().includes(searchTerm.toLowerCase()) || s.ral?.includes(searchTerm));
  }, [stockFournitures, searchTerm]);

  const filteredLocations = useMemo(() => {
    return locations.filter(loc => selectedChantierId === 'all' || loc.chantier_id === selectedChantierId);
  }, [locations, selectedChantierId]);

  const filteredBesoins = useMemo(() => {
    return fournituresChantier.filter(f => selectedChantierId === 'all' || f.chantier_id === selectedChantierId);
  }, [fournituresChantier, selectedChantierId]);

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
    <div className="min-h-screen bg-[#f0f3f4] font-['Fredoka'] text-gray-800 pb-20 print:bg-white print:pb-0">
      <Toaster position="bottom-right" />

      {/* --- RESET CSS POUR IMPRESSION FULL HEIGHT --- */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          header, nav, aside, .no-print, button { display: none !important; }
          html, body { height: auto !important; overflow: visible !important; }
          .print-document { display: block !important; position: static !important; height: auto !important; overflow: visible !important; }
          .overflow-auto, .custom-scrollbar { overflow: visible !important; height: auto !important; max-height: none !important; }
          table { width: 100% !important; table-layout: auto !important; border-collapse: collapse !important; }
          tr { page-break-inside: avoid !important; border-bottom: 1px solid black !important; }
          th, td { border: 1px solid #eee !important; padding: 10px !important; }
          @page { size: landscape; margin: 10mm; }
        }
      `}} />

      {/* --- HEADER FIXE --- */}
      <div className="bg-white/90 backdrop-blur-md sticky top-0 z-30 border-b border-gray-200 shadow-sm no-print">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="bg-white p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-black hover:scale-105 transition-all shadow-sm">
               <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-black uppercase text-[#2d3436] flex items-center gap-2 tracking-tighter">
                <Warehouse className="text-orange-500" size={24} /> Gestion <span className="text-orange-500">Logistique</span>
              </h1>
            </div>
          </div>
          <div className="flex gap-2">
             <button onClick={() => window.print()} className="p-2.5 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-all"><Printer size={20}/></button>
             <button onClick={activeTab === 'stock' ? () => setShowAddSupplyModal(true) : () => setShowAddModal(true)} className="bg-[#2d3436] hover:bg-black text-white px-5 py-2.5 rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 font-bold uppercase flex items-center gap-2 text-xs">
                <Plus size={18} /> {activeTab === 'stock' ? 'Nouvelle Réf' : 'Matériel'}
             </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-8 print-document">

        {/* --- STATS --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
            {[
                { label: 'Références Stock', val: stockFournitures.length, icon: Package, color: 'text-orange-500', bg: 'bg-orange-50' },
                { label: 'Parc Outillage', val: inventory.length, icon: Wrench, color: 'text-[#2d3436]', bg: 'bg-gray-100' },
                { label: 'Unités Sorties', val: locations.filter(l => l.statut === 'en_cours').length, icon: Truck, color: 'text-blue-500', bg: 'bg-blue-50' },
                { label: 'Alertes Stock', val: stockFournitures.filter(s => s.qte_stock <= s.seuil_alerte).length, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' }
            ].map((s, i) => (
                <div key={i} className="bg-white p-5 rounded-[25px] shadow-sm border border-gray-100 flex items-center justify-between">
                    <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.label}</p><p className={`text-2xl font-black ${s.color}`}>{s.val}</p></div>
                    <div className={`${s.bg} ${s.color} p-3 rounded-2xl`}><s.icon size={22}/></div>
                </div>
            ))}
        </div>

        {/* --- TABS & FILTRES --- */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center no-print">
            <div className="flex gap-1 bg-white p-1.5 rounded-[22px] shadow-sm border border-gray-100 w-full md:w-fit overflow-x-auto no-scrollbar">
                {[
                    { id: 'stock', label: 'Fournitures', icon: Package },
                    { id: 'inventaire', label: 'Matériel', icon: LayoutGrid },
                    { id: 'suivi', label: 'Locations', icon: List },
                    { id: 'besoins', label: 'Besoins', icon: ClipboardList }
                ].map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === t.id ? 'bg-[#2d3436] text-white shadow-md scale-105' : 'text-gray-400 hover:bg-gray-50'}`}>
                        <t.icon size={16}/> {t.label}
                    </button>
                ))}
            </div>
            <div className="flex items-center gap-3">
                {(activeTab === 'suivi' || activeTab === 'besoins') && (
                    <select className="bg-white border border-gray-100 text-xs font-black p-2.5 rounded-xl outline-none shadow-sm" value={selectedChantierId} onChange={(e) => setSelectedChantierId(e.target.value)}>
                        <option value="all">Tous les chantiers</option>
                        {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                    </select>
                )}
                <div className="flex items-center gap-3 bg-white p-1.5 px-4 rounded-[22px] border border-gray-100 shadow-sm"><Search size={18} className="text-gray-400"/><input placeholder="Recherche..." className="bg-transparent outline-none font-bold text-sm md:w-48" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
            </div>
        </div>

        {/* ================= ONGLET : STOCK FOURNITURES ================= */}
        {activeTab === 'stock' && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white rounded-[35px] shadow-sm border border-gray-100 overflow-hidden print:border-black">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Produit</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Détails</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Quantité Stock</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right no-print">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredStock.map((item) => {
                                const pots = calculateContainers(item.qte_stock, item.conditionnement || '');
                                const isLow = item.qte_stock <= item.seuil_alerte;
                                return (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-6">
                                            <div className="font-black text-sm text-gray-800 uppercase">{item.nom}</div>
                                            <span className="text-[9px] font-black text-gray-400 uppercase bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block">{item.categorie}</span>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-col gap-1.5">
                                                {item.ral && <div className="flex items-center gap-2 text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg w-fit"><Palette size={12}/> RAL {item.ral}</div>}
                                                {item.conditionnement && <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500"><Box size={12}/> {item.conditionnement}</div>}
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="flex items-center gap-4 bg-gray-50 p-1 rounded-full no-print">
                                                    <button onClick={() => handleUpdateStock(item.id, item.qte_stock - 1)} className="w-8 h-8 bg-white rounded-full shadow-sm hover:bg-red-50 hover:text-red-500 transition-all font-bold">-</button>
                                                    <span className={`text-lg font-black min-w-[40px] text-center ${isLow ? 'text-red-500' : 'text-gray-800'}`}>{item.qte_stock}</span>
                                                    <button onClick={() => handleUpdateStock(item.id, item.qte_stock + 1)} className="w-8 h-8 bg-white rounded-full shadow-sm hover:bg-emerald-50 hover:text-emerald-500 transition-all font-bold">+</button>
                                                </div>
                                                <div className="hidden print:block font-black text-lg text-center">{item.qte_stock} {item.unite}</div>
                                                <div className="flex items-center gap-3 uppercase text-[9px] font-black">
                                                    <span className="text-gray-400">{item.unite}</span>
                                                    {pots && <span className="text-blue-500 bg-blue-50 px-2 py-0.5 rounded-lg flex items-center gap-1"><Calculator size={10}/> {pots} POTS</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-right no-print">
                                            <button onClick={() => handleDeleteItem(item.id, 'sup')} className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={18}/></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* ================= ONGLET : INVENTAIRE MATERIEL ================= */}
        {activeTab === 'inventaire' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center no-print bg-white p-4 rounded-[25px] border border-gray-100">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                        {['Tous', 'Interne', 'Externe', 'Base Logistique'].map(t => (
                            <button key={t} onClick={() => setFilterType(t)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${filterType === t ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-400'}`}>{t}</button>
                        ))}
                    </div>
                    <select className="bg-gray-50 text-xs font-black p-2.5 rounded-xl outline-none" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
                        <option value="Toutes">Toutes Catégories</option><option value="Engin">Engins</option><option value="Outillage">Outillage</option><option value="EPI">EPI</option><option value="Véhicule">Véhicules</option>
                    </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredInventory.map(item => (
                        <div key={item.id} className="bg-white rounded-[35px] p-6 shadow-sm border border-gray-100 hover:shadow-xl transition-all group relative overflow-hidden flex flex-col">
                             <div className={`absolute top-0 right-0 px-5 py-2 rounded-bl-[25px] text-[10px] font-black uppercase tracking-widest ${item.type_stock === 'Interne' ? 'bg-gray-100 text-gray-600' : 'bg-purple-100 text-purple-600'}`}>{item.type_stock}</div>
                             <div className="flex items-center gap-5 mb-6">
                                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 shadow-inner group-hover:scale-110 transition-transform">{item.categorie === 'Engin' ? <Truck size={30}/> : <Wrench size={30}/>}</div>
                                <div><h3 className="font-black text-lg text-[#2d3436] uppercase tracking-tight leading-tight">{item.nom}</h3><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{item.categorie}</p></div>
                             </div>
                             <div className="bg-gray-50/50 rounded-[25px] p-4 border border-gray-100 flex-1">
                                 <div className="flex justify-between items-center"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dispo</span><div className="flex items-end gap-1"><span className={`text-2xl font-black ${(item.dispo || 0) <= 0 ? 'text-red-500' : 'text-[#00b894]'}`}>{item.dispo}</span><span className="text-xs font-bold text-gray-300">/ {item.qte_totale}</span></div></div>
                                 <div className="w-full h-1.5 bg-gray-200 rounded-full mt-3 overflow-hidden"><div className={`h-full transition-all duration-1000 ${ (item.dispo || 0) <= 0 ? 'bg-red-500' : 'bg-[#00b894]'}`} style={{width: `${((item.dispo || 0) / item.qte_totale)*100}%`}}></div></div>
                             </div>
                             <div className="mt-6 flex justify-between items-center no-print">
                                <button onClick={() => handleDeleteItem(item.id, 'mat')} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border ${item.dispo && item.dispo > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>{item.dispo && item.dispo > 0 ? 'Disponible' : 'En Mission'}</span>
                             </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* ================= ONGLET : SUIVI LOCATIONS ================= */}
        {activeTab === 'suivi' && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white rounded-[35px] shadow-sm border border-gray-100 overflow-hidden print:border-black">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Matériel</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Chantier</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Période</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qté</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredLocations.map((loc) => (
                                <tr key={loc.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-6"><div className="font-bold text-sm text-gray-800">{loc.materiel?.nom}</div><div className="text-[10px] text-gray-400 font-black uppercase">{loc.materiel?.type_stock}</div></td>
                                    <td className="p-6"><div className="flex items-center gap-2 text-sm font-black text-[#0984e3]"><MapPin size={14} className="text-blue-200"/> {loc.chantiers?.nom}</div></td>
                                    <td className="p-6"><div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-xl w-fit"><Calendar size={12}/> {loc.date_debut} <ArrowUpRight size={10} className="text-gray-300"/> {loc.date_fin}</div></td>
                                    <td className="p-6 text-center font-black">{loc.qte_prise}</td>
                                    <td className="p-6 text-right"><span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${getStatusColor(loc.statut)}`}>{loc.statut}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* ================= ONGLET : BESOINS CHANTIERS ================= */}
        {activeTab === 'besoins' && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white rounded-[35px] shadow-sm border border-gray-100 overflow-hidden print:border-black">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fourniture</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Chantier</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Quantité Prévue</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Demande</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredBesoins.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-6"><div className="font-bold text-sm text-gray-800">{item.nom}</div><span className="text-[10px] font-black text-orange-500 uppercase">{item.categorie}</span></td>
                                    <td className="p-6 font-black text-xs text-gray-600 uppercase">{item.chantiers?.nom}</td>
                                    <td className="p-6 text-center font-black text-sm text-gray-800">{item.qte_prevue} {item.unite}</td>
                                    <td className="p-6 text-right text-xs text-gray-400 font-bold">{new Date(item.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
      </div>

      {/* ================= MODALE : AJOUT FOURNITURE ================= */}
      {showAddSupplyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl p-10 relative">
                  <h3 className="font-black text-2xl text-[#2d3436] mb-8 uppercase tracking-tighter">Ajouter Référence Stock</h3>
                  <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2"><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-2 block">Désignation</label><input className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-sm" placeholder="Ex: Striasol" value={newSupply.nom} onChange={e => setNewSupply({...newSupply, nom: e.target.value})}/></div>
                        <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-2 block">RAL / Ref</label><input className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-sm" placeholder="Ex: 7016" value={newSupply.ral} onChange={e => setNewSupply({...newSupply, ral: e.target.value})}/></div>
                        <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-2 block">Conditionnement</label><input className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-sm" placeholder="Ex: Pot 15L" value={newSupply.conditionnement} onChange={e => setNewSupply({...newSupply, conditionnement: e.target.value})}/></div>
                        <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-2 block">Unité</label><select className="w-full bg-gray-50 border-none rounded-2xl p-4 font-black uppercase text-xs cursor-pointer" value={newSupply.unite} onChange={e => setNewSupply({...newSupply, unite: e.target.value})}><option value="U">Unité (U)</option><option value="L">Litres (L)</option><option value="Kg">Kilos (Kg)</option><option value="M2">M²</option></select></div>
                        <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-2 block">Seuil d'alerte</label><input type="number" className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-sm" value={newSupply.seuil_alerte} onChange={e => setNewSupply({...newSupply, seuil_alerte: parseInt(e.target.value)})}/></div>
                  </div>
                  <div className="mt-10 flex gap-3">
                      <button onClick={() => setShowAddSupplyModal(false)} className="flex-1 py-4 text-gray-400 font-black uppercase text-xs hover:bg-gray-50 rounded-2xl transition-all">Annuler</button>
                      <button onClick={handleAddSupply} className="flex-1 bg-orange-500 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl shadow-orange-100 hover:scale-105 transition-all">Enregistrer</button>
                  </div>
              </div>
          </div>
      )}

      {/* ================= MODALE : AJOUT MATERIEL ================= */}
      {showAddModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl p-10 overflow-hidden flex flex-col max-h-[90vh]">
                    <h3 className="font-black text-2xl text-[#2d3436] mb-8 uppercase tracking-tighter">Entrée Parc Matériel</h3>
                    <div className="flex gap-2 bg-gray-100 p-1 rounded-[20px] mb-8">
                        {['interne', 'base', 'externe'].map(t => (
                            <button key={t} onClick={() => setModalTab(t as any)} className={`flex-1 py-3 rounded-[15px] text-[10px] font-black uppercase transition-all ${modalTab === t ? 'bg-white shadow text-gray-800 scale-105' : 'text-gray-400'}`}>{t}</button>
                        ))}
                    </div>
                    <div className="space-y-6 overflow-y-auto custom-scrollbar pr-2">
                        <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-2 block">Désignation</label><input className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-sm" placeholder="Ex: Groupe Électrogène" value={newItem.nom} onChange={e => setNewItem({...newItem, nom: e.target.value})}/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-2 block">Catégorie</label><select className="w-full bg-gray-50 border-none rounded-2xl p-4 font-black uppercase text-xs" value={newItem.categorie} onChange={e => setNewItem({...newItem, categorie: e.target.value})}><option value="Outillage">Outillage</option><option value="Engin">Engin</option><option value="EPI">EPI</option><option value="Accès">Accès</option></select></div>
                            <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-2 block">Quantité</label><input type="number" className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-sm" value={newItem.qte_totale} onChange={e => setNewItem({...newItem, qte_totale: parseInt(e.target.value)})}/></div>
                        </div>
                    </div>
                    <button onClick={handleAddItem} className="w-full bg-[#00b894] text-white py-5 rounded-3xl font-black uppercase text-xs mt-10 shadow-xl shadow-emerald-100 hover:scale-105 transition-all">Valider l'entrée</button>
                </div>
           </div>
      )}
    </div>
  );
}