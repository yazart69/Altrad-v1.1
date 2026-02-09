"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, ShoppingCart, CalendarClock, MessageSquareWarning, Plus, X, FileText, Image as ImageIcon, UploadCloud, Eye, AlertCircle, Clock, CheckCircle2, Circle, MapPin, Calendar, Trash2 } from 'lucide-react';
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
  const [tasks, setTasks] = useState<any[]>([]);

  // Inputs
  const [newItem, setNewItem] = useState("");
  const [newLoc, setNewLoc] = useState({ materiel: "", date_fin: "" });
  const [newReport, setNewReport] = useState("");
  
  // Tâches
  const [newTaskLabel, setNewTaskLabel] = useState("");
  const [newTaskHours, setNewTaskHours] = useState("");

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

    const { data: t } = await supabase.from('chantier_tasks').select('*').eq('chantier_id', id).order('created_at', { ascending: false });
    if (t) setTasks(t);

    setLoading(false);
  }

  // --- ACTIONS ---
  const handleSaveInfo = async () => {
    await supabase.from('chantiers').update({
        nom: chantier.nom, adresse: chantier.adresse, statut: chantier.statut, heures_budget: chantier.heures_budget, notes: chantier.notes
    }).eq('id', id);
    alert('Infos mises à jour !');
  };

  const addTask = async () => {
    if (!newTaskLabel) return;
    await supabase.from('chantier_tasks').insert([{ 
        chantier_id: id, 
        label: newTaskLabel,
        objectif_heures: parseInt(newTaskHours) || 0 
    }]);
    
    setNewTaskLabel("");
    setNewTaskHours("");
    fetchChantierData();
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

  const toggleTask = async (task: any) => {
    await supabase.from('chantier_tasks').update({ done: !task.done }).eq('id', task.id);
    fetchChantierData();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);

    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${id}/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);

    if (uploadError) {
      alert("Erreur upload : " + uploadError.message);
      setUploading(false); return;
    }

    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);
    const type = file.type.startsWith('image/') ? 'image' : 'pdf';
    await supabase.from('chantier_documents').insert([{ chantier_id: id, nom: file.name, url: publicUrl, type: type }]);

    setUploading(false);
    fetchChantierData();
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-['Fredoka'] text-[#34495e] font-bold">Chargement du chantier...</div>;

  return (
    <div className="min-h-screen bg-[#f0f3f4] font-['Fredoka'] pb-20 text-gray-800">
      
      {/* HEADER */}
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="flex items-center text-gray-400 hover:text-[#34495e] transition-colors font-bold text-sm gap-2">
                <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100"><ArrowLeft size={18} /></div>
                <span className="hidden sm:inline">Retour Dashboard</span>
            </Link>
            
            <div className="text-center">
                <h1 className="text-xl font-black uppercase tracking-tight text-[#2d3436]">{chantier.nom}</h1>
                <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    <span className={`w-2 h-2 rounded-full ${chantier.statut === 'en_cours' ? 'bg-[#00b894]' : 'bg-gray-300'}`}></span>
                    {chantier.statut?.replace('_', ' ')}
                </div>
            </div>

            <button onClick={handleSaveInfo} className="bg-[#00b894] hover:bg-[#00a383] text-white p-2.5 rounded-xl shadow-lg shadow-emerald-200 transition-all hover:scale-105 active:scale-95">
                <Save size={20} />
            </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* TABS NAVIGATION */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {[
                { id: 'infos', label: 'Infos & Tâches', icon: 'ℹ️', color: 'bg-[#34495e]' },
                { id: 'materiel', label: 'Matériel', icon: '🛒', color: 'bg-[#0984e3]' },
                { id: 'locations', label: 'Locations', icon: '📅', color: 'bg-[#6c5ce7]' },
                { id: 'journal', label: 'Journal', icon: '⚠️', color: 'bg-[#d63031]' },
                { id: 'documents', label: `Documents (${documents.length})`, icon: '📁', color: 'bg-[#e17055]' },
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)} 
                    className={`px-5 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all duration-300 shadow-sm border ${
                        activeTab === tab.id 
                        ? `${tab.color} text-white border-transparent shadow-lg scale-105` 
                        : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'
                    }`}
                >
                    <span className="mr-2">{tab.icon}</span> {tab.label}
                </button>
            ))}
        </div>

        {/* --- CONTENU --- */}

        {/* 1. INFOS & TÂCHES */}
        {activeTab === 'infos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* BLOC INFOS (Vert Menthe) */}
                <div className="bg-[#00b894] rounded-[30px] p-6 shadow-xl text-white relative overflow-hidden group">
                    <div className="relative z-10">
                        <h3 className="font-black uppercase text-xl mb-6 flex items-center gap-2">
                            <div className="bg-white/20 p-2 rounded-full"><FileText size={20}/></div>
                            Détails Chantier
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest ml-1">Adresse</label>
                                <div className="flex items-center bg-white/20 rounded-2xl p-1 focus-within:bg-white/30 transition-colors">
                                    <MapPin className="ml-3 text-emerald-100" size={18} />
                                    <input 
                                        value={chantier.adresse || ''} 
                                        onChange={(e) => setChantier({...chantier, adresse: e.target.value})} 
                                        className="w-full bg-transparent p-3 font-bold text-white placeholder-emerald-100/50 outline-none" 
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest ml-1">Statut</label>
                                    <div className="bg-white/20 rounded-2xl p-1 px-2">
                                        <select 
                                            value={chantier.statut} 
                                            onChange={(e) => setChantier({...chantier, statut: e.target.value})} 
                                            className="w-full bg-transparent p-3 font-bold text-white outline-none [&>option]:text-black cursor-pointer"
                                        >
                                            <option value="en_cours">En Cours</option>
                                            <option value="planifie">Planifié</option>
                                            <option value="termine">Terminé</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest ml-1">Budget Heures</label>
                                    <div className="flex items-center bg-white/20 rounded-2xl p-1">
                                        <Clock className="ml-3 text-emerald-100" size={18} />
                                        <input 
                                            type="number" 
                                            value={chantier.heures_budget || 0} 
                                            onChange={(e) => setChantier({...chantier, heures_budget: e.target.value})} 
                                            className="w-full bg-transparent p-3 font-bold text-white outline-none text-right pr-4" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                     <FileText size={200} className="absolute -right-10 -bottom-20 text-emerald-900 opacity-10 rotate-12 pointer-events-none" />
                </div>

                {/* BLOC TÂCHES (Bleu Nuit) */}
                <div className="bg-[#34495e] rounded-[30px] p-6 shadow-xl text-white relative overflow-hidden flex flex-col h-full">
                    <div className="relative z-10 flex flex-col h-full">
                        <h3 className="font-black uppercase text-xl mb-4 flex items-center gap-2">
                            <div className="bg-[#ff9f43] p-2 rounded-full text-white shadow-lg shadow-orange-500/30"><AlertCircle size={20}/></div>
                            Tâches & Objectifs
                        </h3>
                        
                        {/* Input Ajout */}
                        <div className="flex gap-2 mb-4">
                            <div className="flex-1 bg-white/10 rounded-xl flex items-center p-1 focus-within:bg-white/20 transition-colors border border-white/5">
                                <input 
                                    placeholder="Nouvelle tâche..." 
                                    value={newTaskLabel}
                                    onChange={(e) => setNewTaskLabel(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addTask()}
                                    className="w-full bg-transparent p-2 pl-3 text-sm font-bold text-white placeholder-white/40 outline-none"
                                />
                            </div>
                            <div className="w-20 bg-white/10 rounded-xl flex items-center p-1 border border-white/5">
                                <input 
                                    type="number"
                                    placeholder="H" 
                                    value={newTaskHours}
                                    onChange={(e) => setNewTaskHours(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addTask()}
                                    className="w-full bg-transparent p-2 text-sm font-bold text-white text-center placeholder-white/40 outline-none"
                                />
                            </div>
                            <button onClick={addTask} className="bg-[#ff9f43] text-white p-3 rounded-xl hover:bg-[#e67e22] transition-colors shadow-lg shadow-orange-500/20">
                                <Plus size={20}/>
                            </button>
                        </div>

                        {/* Liste */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2 max-h-[400px]">
                             {tasks.length === 0 ? (
                                <div className="text-center py-10 opacity-30">
                                    <CheckCircle2 size={40} className="mx-auto mb-2"/>
                                    <p className="text-sm font-bold">Aucune tâche</p>
                                </div>
                             ) : (
                                tasks.map((t) => (
                                    <div key={t.id} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors group/task">
                                        <div className="flex items-center gap-3 flex-1 cursor-pointer select-none" onClick={() => toggleTask(t)}>
                                            <div className={`transition-colors ${t.done ? 'text-[#00b894]' : 'text-[#ff9f43]'}`}>
                                                 {t.done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                                            </div>
                                            <span className={`text-sm font-bold transition-opacity ${t.done ? 'line-through opacity-40' : 'text-white'}`}>{t.label}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {t.objectif_heures > 0 && (
                                                <span className="text-[10px] bg-[#0984e3] px-2 py-1 rounded-lg text-white font-bold flex items-center gap-1 shadow-sm">
                                                    <Clock size={10} /> {t.objectif_heures}h
                                                </span>
                                            )}
                                            <button onClick={() => deleteItem('chantier_tasks', t.id)} className="text-white/20 hover:text-red-400 p-1 opacity-0 group-hover/task:opacity-100 transition-opacity">
                                                <X size={16}/>
                                            </button>
                                        </div>
                                    </div>
                                ))
                             )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* 2. MATÉRIEL (Bleu) */}
        {activeTab === 'materiel' && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-[#0984e3] p-6 rounded-[30px] text-white shadow-xl mb-6 flex flex-col md:flex-row gap-4 items-end md:items-center">
                    <div className="flex-1 w-full">
                        <label className="text-[10px] font-bold text-blue-100 uppercase tracking-widest ml-1 mb-1 block">Ajouter un besoin</label>
                        <div className="bg-white/20 p-1.5 rounded-2xl flex items-center focus-within:bg-white/30 transition-colors">
                            <ShoppingCart className="ml-3 text-blue-100" size={20} />
                            <input 
                                placeholder="Ex: 5 pots Peinture, 2 Échelles..." 
                                value={newItem} 
                                onChange={(e) => setNewItem(e.target.value)} 
                                onKeyDown={(e) => e.key === 'Enter' && addMaterial()}
                                className="w-full bg-transparent p-3 font-bold text-white placeholder-blue-100/50 outline-none" 
                            />
                        </div>
                    </div>
                    <button onClick={addMaterial} className="bg-white text-[#0984e3] px-6 py-4 rounded-xl font-black uppercase tracking-wider text-sm hover:scale-105 active:scale-95 transition-transform shadow-lg w-full md:w-auto">
                        Ajouter
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {materials.map(m => (
                        <div key={m.id} className="bg-white p-4 rounded-[20px] flex justify-between items-center shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-50 p-2.5 rounded-xl text-[#0984e3]">
                                    <ShoppingCart size={20} />
                                </div>
                                <p className="font-bold text-gray-700">{m.item}</p>
                            </div>
                            <button onClick={() => deleteItem('material_requests', m.id)} className="bg-gray-50 p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                    {materials.length === 0 && (
                        <div className="col-span-full text-center py-10 opacity-40">
                            <ShoppingCart size={40} className="mx-auto mb-2 text-gray-400" />
                            <p className="font-bold text-gray-500">Aucun matériel demandé</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* 3. LOCATIONS (Violet) */}
        {activeTab === 'locations' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-[#6c5ce7] p-6 rounded-[30px] text-white shadow-xl mb-6">
                    <h3 className="font-black uppercase text-lg mb-4 flex items-center gap-2"><CalendarClock/> Nouvelle Location</h3>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 bg-white/20 rounded-2xl p-1.5 px-4 flex items-center">
                            <input 
                                placeholder="Matériel (ex: Nacelle 12m)" 
                                value={newLoc.materiel} 
                                onChange={(e) => setNewLoc({...newLoc, materiel: e.target.value})} 
                                className="w-full bg-transparent p-2 font-bold text-white placeholder-indigo-200 outline-none" 
                            />
                        </div>
                        <div className="flex-1 bg-white/20 rounded-2xl p-1.5 px-4 flex items-center">
                            <span className="text-xs font-bold text-indigo-200 mr-2 uppercase">Fin :</span>
                            <input 
                                type="date" 
                                value={newLoc.date_fin} 
                                onChange={(e) => setNewLoc({...newLoc, date_fin: e.target.value})} 
                                className="w-full bg-transparent p-2 font-bold text-white outline-none cursor-pointer" 
                            />
                        </div>
                        <button onClick={addRental} className="bg-white text-[#6c5ce7] px-8 py-3 rounded-xl font-black uppercase hover:scale-105 transition-transform shadow-lg">
                            Valider
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    {rentals.map(r => (
                        <div key={r.id} className="bg-white p-4 rounded-[25px] flex justify-between items-center shadow-sm border border-gray-100 hover:shadow-md transition-all">
                            <div className="flex items-center gap-4">
                                <div className="bg-indigo-50 p-3 rounded-2xl text-[#6c5ce7]">
                                    <CalendarClock size={24} />
                                </div>
                                <div>
                                    <p className="font-black text-gray-800 text-lg">{r.materiel}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded uppercase">Actif</span>
                                        <p className="text-xs text-gray-400 font-bold">Fin le {new Date(r.date_fin).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => deleteItem('rentals', r.id)} className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))}
                    {rentals.length === 0 && (
                        <div className="text-center py-10 opacity-40">
                             <p className="font-bold text-gray-500">Aucune location en cours</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* 4. JOURNAL (Rouge) */}
        {activeTab === 'journal' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-[#d63031] p-4 rounded-[25px] text-white shadow-xl mb-6 flex gap-3 items-center">
                    <div className="bg-white/20 p-3 rounded-xl"><MessageSquareWarning size={24}/></div>
                    <input 
                        placeholder="Signaler un incident, une remarque..." 
                        value={newReport} 
                        onChange={(e) => setNewReport(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && addReport()}
                        className="flex-1 bg-transparent text-white placeholder-red-200 font-bold outline-none text-lg" 
                    />
                    <button onClick={addReport} className="bg-white text-[#d63031] p-3 rounded-xl hover:scale-110 transition-transform shadow-md">
                        <Plus size={24} />
                    </button>
                </div>

                <div className="space-y-4">
                    {reports.map(r => (
                        <div key={r.id} className="bg-white p-5 rounded-[25px] shadow-sm border-l-8 border-[#d63031] flex justify-between group">
                            <div>
                                <p className="font-bold text-gray-800 text-base">{r.message}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase mt-2">
                                    {new Date(r.created_at).toLocaleDateString()} • {r.auteur}
                                </p>
                            </div>
                            <button onClick={() => deleteItem('site_reports', r.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                <X size={20} />
                            </button>
                        </div>
                    ))}
                     {reports.length === 0 && (
                        <div className="text-center py-10 opacity-40">
                             <p className="font-bold text-gray-500">R.A.S (Rien à signaler)</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* 5. DOCUMENTS (Orange) */}
        {activeTab === 'documents' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="bg-[#e17055] p-8 rounded-[30px] text-white shadow-xl flex flex-col items-center justify-center text-center border-4 border-dashed border-white/20 relative overflow-hidden group mb-6 transition-colors hover:bg-[#d35400] hover:border-white/40 cursor-pointer">
                    <div className="bg-white/20 p-4 rounded-full mb-3 group-hover:scale-110 transition-transform">
                        <UploadCloud size={40} />
                    </div>
                    <p className="font-black uppercase text-xl">Glisser-déposer ou cliquer</p>
                    <p className="text-sm font-bold text-orange-100 mt-1">PDF, JPG, PNG acceptés</p>
                    <input type="file" onChange={handleFileUpload} disabled={uploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    {uploading && <div className="absolute inset-0 bg-[#e17055] flex items-center justify-center font-bold animate-pulse">Upload en cours...</div>}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {documents.map(doc => (
                        <div key={doc.id} className="bg-white p-3 rounded-[25px] shadow-sm flex flex-col h-[200px] relative group hover:shadow-lg transition-all border border-gray-100">
                            <div className="flex-1 bg-gray-50 rounded-[20px] mb-3 overflow-hidden flex items-center justify-center relative">
                                {doc.type === 'image' ? (
                                    <img src={doc.url} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"/>
                                ) : (
                                    <FileText size={48} className="text-gray-300 group-hover:text-[#e17055] transition-colors"/>
                                )}
                                <a href={doc.url} target="_blank" className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-white p-2 rounded-full text-gray-800 shadow-lg scale-0 group-hover:scale-100 transition-transform delay-75">
                                        <Eye size={20}/>
                                    </div>
                                </a>
                            </div>
                            <div className="flex justify-between items-center px-1">
                                <p className="text-xs font-bold text-gray-600 truncate max-w-[100px]">{doc.nom}</p>
                                <button onClick={() => deleteItem('chantier_documents', doc.id)} className="text-gray-300 hover:text-red-500">
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </div>
    </div>
  );
}
