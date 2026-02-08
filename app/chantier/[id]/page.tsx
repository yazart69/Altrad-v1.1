"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, Trash2, ShoppingCart, CalendarClock, MessageSquareWarning, Plus, X } from 'lucide-react';
import Link from 'next/link';

export default function ChantierDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('infos'); // 'infos', 'materiel', 'locations', 'journal'

  // Données du chantier principal
  const [chantier, setChantier] = useState<any>({});
  
  // Données des listes
  const [materials, setMaterials] = useState<any[]>([]);
  const [rentals, setRentals] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  // Inputs pour les nouveaux ajouts
  const [newItem, setNewItem] = useState("");
  const [newLoc, setNewLoc] = useState({ materiel: "", date_fin: "" });
  const [newReport, setNewReport] = useState("");

  // CHARGEMENT INITIAL
  useEffect(() => {
    fetchChantierData();
  }, [id]);

  async function fetchChantierData() {
    if (!id) return;
    setLoading(true);

    // 1. Infos Chantier
    const { data: c } = await supabase.from('chantiers').select('*').eq('id', id).single();
    if (c) setChantier(c);

    // 2. Matériel
    const { data: m } = await supabase.from('material_requests').select('*').eq('chantier_id', id).order('created_at', { ascending: false });
    if (m) setMaterials(m);

    // 3. Locations
    const { data: l } = await supabase.from('rentals').select('*').eq('chantier_id', id).order('date_fin', { ascending: true });
    if (l) setRentals(l);

    // 4. Journal
    const { data: r } = await supabase.from('site_reports').select('*').eq('chantier_id', id).order('created_at', { ascending: false });
    if (r) setReports(r);

    setLoading(false);
  }

  // --- ACTIONS ---

  // Sauvegarder Infos Générales
  const handleSaveInfo = async () => {
    await supabase.from('chantiers').update({
        nom: chantier.nom, adresse: chantier.adresse, statut: chantier.statut, heures_budget: chantier.heures_budget, notes: chantier.notes
    }).eq('id', id);
    alert('Infos mises à jour !');
  };

  // Ajouter Matériel
  const addMaterial = async () => {
    if (!newItem) return;
    await supabase.from('material_requests').insert([{ chantier_id: id, item: newItem, status: 'a_commander' }]);
    setNewItem("");
    fetchChantierData(); // Rafraichir la liste
  };

  // Ajouter Location
  const addRental = async () => {
    if (!newLoc.materiel || !newLoc.date_fin) return;
    await supabase.from('rentals').insert([{ chantier_id: id, materiel: newLoc.materiel, date_fin: newLoc.date_fin, status: 'actif' }]);
    setNewLoc({ materiel: "", date_fin: "" });
    fetchChantierData();
  };

  // Ajouter Note/Problème
  const addReport = async () => {
    if (!newReport) return;
    // On met "Chef d'équipe" par défaut comme auteur pour l'instant
    await supabase.from('site_reports').insert([{ chantier_id: id, message: newReport, auteur: "Chef d'équipe" }]);
    setNewReport("");
    fetchChantierData();
  };

  // Supprimer un élément (générique)
  const deleteItem = async (table: string, itemId: string) => {
    if(confirm('Supprimer cet élément ?')) {
        await supabase.from(table).delete().eq('id', itemId);
        fetchChantierData();
    }
  }

  if (loading) return <div className="p-10 font-['Fredoka'] text-center">Chargement...</div>;

  return (
    <div className="min-h-screen bg-[#f0f3f4] font-['Fredoka'] pb-20">
      
      {/* HEADER FIXE */}
      <div className="bg-white shadow-sm p-4 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
            <Link href="/" className="flex items-center text-gray-500 hover:text-black font-bold text-sm">
                <ArrowLeft size={18} className="mr-1" /> Retour
            </Link>
            <h1 className="text-xl font-black uppercase truncate max-w-[200px]">{chantier.nom}</h1>
            <button onClick={handleSaveInfo} className="bg-[#00b894] text-white p-2 rounded-lg shadow-md">
                <Save size={20} />
            </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        
        {/* NAVIGATION ONGLETS */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
            <button onClick={() => setActiveTab('infos')} className={`px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-colors ${activeTab === 'infos' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500'}`}>
                ℹ️ Infos
            </button>
            <button onClick={() => setActiveTab('materiel')} className={`px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-colors ${activeTab === 'materiel' ? 'bg-[#0984e3] text-white' : 'bg-white text-gray-500'}`}>
                🛒 Commandes ({materials.length})
            </button>
            <button onClick={() => setActiveTab('locations')} className={`px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-colors ${activeTab === 'locations' ? 'bg-[#6c5ce7] text-white' : 'bg-white text-gray-500'}`}>
                📅 Locations ({rentals.length})
            </button>
            <button onClick={() => setActiveTab('journal')} className={`px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-colors ${activeTab === 'journal' ? 'bg-[#d63031] text-white' : 'bg-white text-gray-500'}`}>
                ⚠️ Journal ({reports.length})
            </button>
        </div>

        {/* --- CONTENU DES ONGLETS --- */}

        {/* 1. INFOS GÉNÉRALES */}
        {activeTab === 'infos' && (
            <div className="bg-white rounded-[25px] p-6 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Nom du Chantier</label>
                    <input value={chantier.nom} onChange={(e) => setChantier({...chantier, nom: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold text-gray-800 focus:ring-2 focus:ring-gray-200 outline-none" />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Adresse</label>
                    <input value={chantier.adresse || ''} onChange={(e) => setChantier({...chantier, adresse: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-medium text-gray-800 focus:ring-2 focus:ring-gray-200 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase">Statut</label>
                        <select value={chantier.statut} onChange={(e) => setChantier({...chantier, statut: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold text-gray-800 outline-none">
                            <option value="en_cours">🟢 En Cours</option>
                            <option value="planifie">🔵 Planifié</option>
                            <option value="termine">🔴 Terminé</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase">Budget H</label>
                        <input type="number" value={chantier.heures_budget || 0} onChange={(e) => setChantier({...chantier, heures_budget: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold text-gray-800 outline-none" />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Notes Fixes</label>
                    <textarea rows={3} value={chantier.notes || ''} onChange={(e) => setChantier({...chantier, notes: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-medium text-gray-800 outline-none" />
                </div>
            </div>
        )}

        {/* 2. MATÉRIEL (Commandes) */}
        {activeTab === 'materiel' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                {/* Formulaire Ajout */}
                <div className="bg-[#0984e3] p-4 rounded-[20px] text-white shadow-lg">
                    <h3 className="font-black uppercase mb-2 flex items-center gap-2"><ShoppingCart size={18}/> Nouvelle Commande</h3>
                    <div className="flex gap-2">
                        <input 
                            placeholder="Ex: 5 pots Peinture Blanche..." 
                            value={newItem}
                            onChange={(e) => setNewItem(e.target.value)}
                            className="flex-1 bg-white/20 placeholder-white/60 text-white p-3 rounded-xl outline-none font-bold"
                        />
                        <button onClick={addMaterial} className="bg-white text-[#0984e3] p-3 rounded-xl font-bold hover:bg-gray-100"><Plus /></button>
                    </div>
                </div>
                {/* Liste */}
                <div className="space-y-2">
                    {materials.map(m => (
                        <div key={m.id} className="bg-white p-4 rounded-[20px] flex justify-between items-center shadow-sm border border-gray-100">
                            <div>
                                <p className="font-bold text-gray-800">{m.item}</p>
                                <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded uppercase font-bold">{m.status.replace('_', ' ')}</span>
                            </div>
                            <button onClick={() => deleteItem('material_requests', m.id)} className="text-gray-300 hover:text-red-500"><X size={18} /></button>
                        </div>
                    ))}
                    {materials.length === 0 && <p className="text-center text-gray-400 text-sm mt-8">Aucune commande en cours</p>}
                </div>
            </div>
        )}

        {/* 3. LOCATIONS */}
        {activeTab === 'locations' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-[#6c5ce7] p-4 rounded-[20px] text-white shadow-lg">
                    <h3 className="font-black uppercase mb-2 flex items-center gap-2"><CalendarClock size={18}/> Nouvelle Location</h3>
                    <div className="flex flex-col gap-2">
                        <input 
                            placeholder="Matériel (ex: Nacelle 12m)" 
                            value={newLoc.materiel}
                            onChange={(e) => setNewLoc({...newLoc, materiel: e.target.value})}
                            className="bg-white/20 placeholder-white/60 text-white p-3 rounded-xl outline-none font-bold"
                        />
                        <div className="flex gap-2">
                             <input 
                                type="date"
                                value={newLoc.date_fin}
                                onChange={(e) => setNewLoc({...newLoc, date_fin: e.target.value})}
                                className="flex-1 bg-white/20 text-white p-3 rounded-xl outline-none font-bold"
                            />
                            <button onClick={addRental} className="bg-white text-[#6c5ce7] p-3 rounded-xl font-bold hover:bg-gray-100"><Plus /></button>
                        </div>
                    </div>
                </div>
                <div className="space-y-2">
                    {rentals.map(r => (
                        <div key={r.id} className="bg-white p-4 rounded-[20px] flex justify-between items-center shadow-sm border border-gray-100">
                            <div>
                                <p className="font-bold text-gray-800">{r.materiel}</p>
                                <p className="text-xs text-gray-500">Fin le : {new Date(r.date_fin).toLocaleDateString()}</p>
                            </div>
                            <button onClick={() => deleteItem('rentals', r.id)} className="text-gray-300 hover:text-red-500"><X size={18} /></button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* 4. JOURNAL (Problèmes) */}
        {activeTab === 'journal' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-[#d63031] p-4 rounded-[20px] text-white shadow-lg">
                    <h3 className="font-black uppercase mb-2 flex items-center gap-2"><MessageSquareWarning size={18}/> Signaler Problème</h3>
                    <div className="flex gap-2">
                        <input 
                            placeholder="Message (ex: Client absent...)" 
                            value={newReport}
                            onChange={(e) => setNewReport(e.target.value)}
                            className="flex-1 bg-white/20 placeholder-white/60 text-white p-3 rounded-xl outline-none font-bold"
                        />
                        <button onClick={addReport} className="bg-white text-[#d63031] p-3 rounded-xl font-bold hover:bg-gray-100"><Plus /></button>
                    </div>
                </div>
                <div className="space-y-2">
                    {reports.map(r => (
                        <div key={r.id} className="bg-white p-4 rounded-[20px] shadow-sm border-l-4 border-[#d63031]">
                            <div className="flex justify-between items-start">
                                <p className="font-bold text-gray-800 text-sm">{r.message}</p>
                                <button onClick={() => deleteItem('site_reports', r.id)} className="text-gray-300 hover:text-red-500"><X size={16} /></button>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">{r.auteur} - {new Date(r.created_at).toLocaleDateString()}</p>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </div>
    </div>
  );
}
