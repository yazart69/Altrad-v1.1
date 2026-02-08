"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
// J'ai ajouté AlertCircle ici pour corriger ton erreur
import { ArrowLeft, Save, ShoppingCart, CalendarClock, MessageSquareWarning, Plus, X, FileText, Image as ImageIcon, UploadCloud, Eye, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function ChantierDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('infos');
  const [uploading, setUploading] = useState(false);

  // Données
  const [chantier, setChantier] = useState<any>({});
  const [materials, setMaterials] = useState<any[]>([]);
  const [rentals, setRentals] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  // Inputs
  const [newItem, setNewItem] = useState("");
  const [newLoc, setNewLoc] = useState({ materiel: "", date_fin: "" });
  const [newReport, setNewReport] = useState("");

  useEffect(() => { fetchChantierData(); }, [id]);

  async function fetchChantierData() {
    if (!id) return;
    setLoading(true);

    const { data: c } = await supabase.from('chantiers').select('*').eq('id', id).single();
    if (c) setChantier(c);

    const { data: m } = await supabase.from('material_requests').select('*').eq('chantier_id', id).order('created_at', { ascending: false });
    if (m) setMaterials(m);

    const { data: l } = await supabase.from('rentals').select('*').eq('chantier_id', id).order('date_fin', { ascending: true });
    if (l) setRentals(l);

    const { data: r } = await supabase.from('site_reports').select('*').eq('chantier_id', id).order('created_at', { ascending: false });
    if (r) setReports(r);

    const { data: d } = await supabase.from('chantier_documents').select('*').eq('chantier_id', id).order('created_at', { ascending: false });
    if (d) setDocuments(d);

    setLoading(false);
  }

  // --- ACTIONS ---
  const handleSaveInfo = async () => {
    await supabase.from('chantiers').update({
        nom: chantier.nom, adresse: chantier.adresse, statut: chantier.statut, heures_budget: chantier.heures_budget, notes: chantier.notes
    }).eq('id', id);
    alert('Infos mises à jour !');
  };

  const addMaterial = async () => {
    if (!newItem) return;
    await supabase.from('material_requests').insert([{ chantier_id: id, item: newItem, status: 'a_commander' }]);
    setNewItem(""); fetchChantierData();
  };

  const addRental = async () => {
    if (!newLoc.materiel || !newLoc.date_fin) return;
    await supabase.from('rentals').insert([{ chantier_id: id, materiel: newLoc.materiel, date_fin: newLoc.date_fin, status: 'actif' }]);
    setNewLoc({ materiel: "", date_fin: "" }); fetchChantierData();
  };

  const addReport = async () => {
    if (!newReport) return;
    await supabase.from('site_reports').insert([{ chantier_id: id, message: newReport, auteur: "Chef d'équipe" }]);
    setNewReport(""); fetchChantierData();
  };

  const deleteItem = async (table: string, itemId: string) => {
    if(confirm('Supprimer cet élément ?')) {
        await supabase.from(table).delete().eq('id', itemId);
        fetchChantierData();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);

    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) {
      alert("Erreur upload : " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    const type = file.type.startsWith('image/') ? 'image' : 'pdf';
    await supabase.from('chantier_documents').insert([
      { chantier_id: id, nom: file.name, url: publicUrl, type: type }
    ]);

    setUploading(false);
    fetchChantierData();
  };

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
                🛒 Stocks
            </button>
            <button onClick={() => setActiveTab('locations')} className={`px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-colors ${activeTab === 'locations' ? 'bg-[#6c5ce7] text-white' : 'bg-white text-gray-500'}`}>
                📅 Locations
            </button>
            <button onClick={() => setActiveTab('journal')} className={`px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-colors ${activeTab === 'journal' ? 'bg-[#d63031] text-white' : 'bg-white text-gray-500'}`}>
                ⚠️ Journal
            </button>
            <button onClick={() => setActiveTab('documents')} className={`px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-colors ${activeTab === 'documents' ? 'bg-[#e17055] text-white' : 'bg-white text-gray-500'}`}>
                📁 Docs ({documents.length})
            </button>
        </div>

        {/* --- CONTENU --- */}

        {/* 1. INFOS & TÂCHES (CORRIGÉ) */}
        {activeTab === 'infos' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                
                {/* Formulaire Infos Générales */}
                <div className="bg-white rounded-[25px] p-6 shadow-sm space-y-4">
                    <h3 className="font-black text-gray-800 uppercase mb-2">Informations Générales</h3>
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
                </div>

                {/* Gestion des Tâches */}
                <div className="bg-[#2d3436] rounded-[25px] p-6 shadow-sm text-white">
                    <h3 className="font-black uppercase mb-4 flex items-center gap-2">
                        <AlertCircle size={20} className="text-[#00b894]"/> Tâches à faire
                    </h3>
                    <div className="flex gap-2 mb-4">
                        <input 
                            placeholder="Nouvelle tâche (ex: Valider plan)..." 
                            onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                    const val = e.currentTarget.value;
                                    if(!val) return;
                                    await supabase.from('chantier_tasks').insert([{ chantier_id: id, label: val }]);
                                    e.currentTarget.value = "";
                                    alert("Tâche ajoutée !");
                                }
                            }}
                            className="flex-1 bg-white/10 text-white placeholder-white/50 p-3 rounded-xl outline-none font-bold focus:bg-white/20 transition-colors"
                        />
                    </div>
                    <p className="text-xs text-white/40 italic">Appuyez sur Entrée pour ajouter. Ces tâches apparaîtront sur l'accueil.</p>
                </div>
            </div>
        )}

        {/* 2. MATÉRIEL */}
        {activeTab === 'materiel' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-[#0984e3] p-4 rounded-[20px] text-white shadow-lg">
                    <h3 className="font-black uppercase mb-2 flex items-center gap-2"><ShoppingCart size={18}/> Commande</h3>
                    <div className="flex gap-2">
                        <input placeholder="Ex: 5 pots Peinture..." value={newItem} onChange={(e) => setNewItem(e.target.value)} className="flex-1 bg-white/20 placeholder-white/60 text-white p-3 rounded-xl outline-none font-bold" />
                        <button onClick={addMaterial} className="bg-white text-[#0984e3] p-3 rounded-xl font-bold hover:bg-gray-100"><Plus /></button>
                    </div>
                </div>
                {materials.map(m => (
                    <div key={m.id} className="bg-white p-4 rounded-[20px] flex justify-between items-center shadow-sm">
                        <p className="font-bold text-gray-800">{m.item}</p>
                        <button onClick={() => deleteItem('material_requests', m.id)} className="text-gray-300 hover:text-red-500"><X size={18} /></button>
                    </div>
                ))}
            </div>
        )}

        {/* 3. LOCATIONS */}
        {activeTab === 'locations' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-[#6c5ce7] p-4 rounded-[20px] text-white shadow-lg">
                    <h3 className="font-black uppercase mb-2 flex items-center gap-2"><CalendarClock size={18}/> Location</h3>
                    <div className="flex flex-col gap-2">
                        <input placeholder="Matériel..." value={newLoc.materiel} onChange={(e) => setNewLoc({...newLoc, materiel: e.target.value})} className="bg-white/20 placeholder-white/60 text-white p-3 rounded-xl outline-none font-bold" />
                        <div className="flex gap-2">
                             <input type="date" value={newLoc.date_fin} onChange={(e) => setNewLoc({...newLoc, date_fin: e.target.value})} className="flex-1 bg-white/20 text-white p-3 rounded-xl outline-none font-bold" />
                            <button onClick={addRental} className="bg-white text-[#6c5ce7] p-3 rounded-xl font-bold hover:bg-gray-100"><Plus /></button>
                        </div>
                    </div>
                </div>
                {rentals.map(r => (
                    <div key={r.id} className="bg-white p-4 rounded-[20px] flex justify-between items-center shadow-sm">
                        <div><p className="font-bold text-gray-800">{r.materiel}</p><p className="text-xs text-gray-500">Fin : {new Date(r.date_fin).toLocaleDateString()}</p></div>
                        <button onClick={() => deleteItem('rentals', r.id)} className="text-gray-300 hover:text-red-500"><X size={18} /></button>
                    </div>
                ))}
            </div>
        )}

        {/* 4. JOURNAL */}
        {activeTab === 'journal' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-[#d63031] p-4 rounded-[20px] text-white shadow-lg">
                    <h3 className="font-black uppercase mb-2 flex items-center gap-2"><MessageSquareWarning size={18}/> Problème</h3>
                    <div className="flex gap-2">
                        <input placeholder="Message..." value={newReport} onChange={(e) => setNewReport(e.target.value)} className="flex-1 bg-white/20 placeholder-white/60 text-white p-3 rounded-xl outline-none font-bold" />
                        <button onClick={addReport} className="bg-white text-[#d63031] p-3 rounded-xl font-bold hover:bg-gray-100"><Plus /></button>
                    </div>
                </div>
                {reports.map(r => (
                    <div key={r.id} className="bg-white p-4 rounded-[20px] shadow-sm border-l-4 border-[#d63031]">
                        <div className="flex justify-between"><p className="font-bold text-gray-800 text-sm">{r.message}</p><button onClick={() => deleteItem('site_reports', r.id)} className="text-gray-300 hover:text-red-500"><X size={16} /></button></div>
                    </div>
                ))}
            </div>
        )}

        {/* 5. DOCUMENTS */}
        {activeTab === 'documents' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-[#e17055] p-6 rounded-[20px] text-white shadow-lg flex flex-col items-center justify-center text-center border-2 border-dashed border-white/30 relative">
                    <UploadCloud size={32} className="mb-2" />
                    <p className="font-black uppercase text-lg">Ajouter une photo / PDF</p>
                    <p className="text-sm opacity-80 mb-4">Cliquez pour parcourir</p>
                    <input 
                        type="file" 
                        accept="image/*,application/pdf"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {uploading && <div className="absolute inset-0 bg-[#e17055] flex items-center justify-center font-bold">Envoi en cours...</div>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {documents.map(doc => (
                        <div key={doc.id} className="bg-white p-3 rounded-[20px] shadow-sm flex flex-col justify-between h-[150px] relative group overflow-hidden">
                            <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-xl mb-2 overflow-hidden">
                                {doc.type === 'image' ? (
                                    <img src={doc.url} alt="doc" className="w-full h-full object-cover" />
                                ) : (
                                    <FileText size={32} className="text-gray-400" />
                                )}
                            </div>
                            <div className="flex justify-between items-center">
                                <p className="text-[10px] font-bold text-gray-600 truncate max-w-[80px]">{doc.nom}</p>
                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="bg-black/5 p-1.5 rounded-full hover:bg-black/10">
                                    <Eye size={14} className="text-gray-600" />
                                </a>
                            </div>
                             <button onClick={() => deleteItem('chantier_documents', doc.id)} className="absolute top-2 right-2 bg-white/80 p-1.5 rounded-full text-red-500 shadow-sm opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                <X size={14} />
                             </button>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </div>
    </div>
  );
}
