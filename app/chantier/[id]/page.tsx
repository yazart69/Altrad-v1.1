"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, Save, FileText, UploadCloud, X, Eye, Trash2, 
  AlertTriangle, Shield, CheckSquare, Thermometer, Droplets, 
  Layers, Ruler, ClipboardCheck, FolderOpen,
  Calendar, MonitorPlay, Plus, CheckCircle2, Circle, Clock,
  ShoppingCart, CalendarClock, MessageSquareWarning, MapPin
} from 'lucide-react';
import Link from 'next/link';

// LISTES PRÉDÉFINIES
const RISK_OPTIONS = ['Amiante', 'Plomb', 'Silice', 'ATEX', 'Hauteur'];
const EPI_OPTIONS = ['Casque', 'Harnais', 'ARI', 'Combinaison', 'Gants', 'Lunettes'];
const TYPE_CHANTIER_OPTIONS = ['Industriel', 'Parking', 'Ouvrage d\'art', 'Autre'];

export default function ChantierDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('infos');
  const [showACQPAModal, setShowACQPAModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  // DONNÉES GLOBALES CHANTIER
  const [chantier, setChantier] = useState<any>({
    nom: '', client: '', adresse: '', responsable: '', date_debut: '', date_fin: '', type: 'Industriel', statut: 'en_cours', heures_budget: 0,
    risques: [], epi: [],
    mesures_obligatoires: false
  });
  const [acqpaData, setAcqpaData] = useState<any>({});

  // LISTES DE DONNÉES
  const [tasks, setTasks] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [rentals, setRentals] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  // INPUTS LOCAUX
  const [newTaskLabel, setNewTaskLabel] = useState("");
  const [newTaskHours, setNewTaskHours] = useState("");
  const [newItem, setNewItem] = useState("");
  const [newLoc, setNewLoc] = useState({ materiel: "", date_fin: "" });
  const [newReport, setNewReport] = useState("");

  // --- CHARGEMENT ---
  useEffect(() => { fetchChantierData(); }, [id]);

  async function fetchChantierData() {
    if (!id) return;
    setLoading(true);

    // 1. Chantier & ACQPA
    const { data: c } = await supabase.from('chantiers').select('*').eq('id', id).single();
    if (c) {
        setChantier({
            ...c,
            risques: c.risques || [],
            epi: c.epi || [],
            mesures_acqpa: c.mesures_acqpa || {}
        });
        setAcqpaData(c.mesures_acqpa || {});
    }

    // 2. Tâches
    const { data: t } = await supabase.from('chantier_tasks').select('*').eq('chantier_id', id).order('created_at', { ascending: false });
    if (t) setTasks(t);

    // 3. Matériel
    const { data: m } = await supabase.from('material_requests').select('*').eq('chantier_id', id).order('created_at', { ascending: false });
    if (m) setMaterials(m);

    // 4. Locations
    const { data: l } = await supabase.from('rentals').select('*').eq('chantier_id', id).order('date_fin', { ascending: true });
    if (l) setRentals(l);

    // 5. Rapports
    const { data: r } = await supabase.from('site_reports').select('*').eq('chantier_id', id).order('created_at', { ascending: false });
    if (r) setReports(r);

    // 6. Documents
    const { data: d } = await supabase.from('chantier_documents').select('*').eq('chantier_id', id).order('created_at', { ascending: false });
    if (d) setDocuments(d);

    setLoading(false);
  }

  // --- ACTIONS GLOBALES ---
  
  // Sauvegarde infos générales + ACQPA + HSE
  const handleSave = async () => {
    const toSave = {
        nom: chantier.nom,
        client: chantier.client,
        adresse: chantier.adresse,
        responsable: chantier.responsable,
        date_debut: chantier.date_debut,
        date_fin: chantier.date_fin,
        type: chantier.type,
        statut: chantier.statut,
        heures_budget: chantier.heures_budget,
        risques: chantier.risques,
        epi: chantier.epi,
        mesures_obligatoires: chantier.mesures_obligatoires,
        mesures_acqpa: acqpaData 
    };
    
    await supabase.from('chantiers').update(toSave).eq('id', id);
    alert('✅ Chantier sauvegardé avec succès !');
  };

  // Suppression générique
  const deleteItem = async (table: string, itemId: string) => {
    if(confirm('Supprimer cet élément définitivement ?')) {
        await supabase.from(table).delete().eq('id', itemId);
        fetchChantierData();
    }
  };

  // --- GESTION TÂCHES ---
  const addTask = async () => {
    if (!newTaskLabel) return;
    await supabase.from('chantier_tasks').insert([{ 
        chantier_id: id, 
        label: newTaskLabel,
        objectif_heures: parseInt(newTaskHours) || 0,
        done: false
    }]);
    setNewTaskLabel("");
    setNewTaskHours("");
    fetchChantierData();
  };

  const toggleTask = async (task: any) => {
    await supabase.from('chantier_tasks').update({ done: !task.done }).eq('id', task.id);
    fetchChantierData();
  };

  // --- GESTION MATERIEL / LOCATION / JOURNAL ---
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

  // --- UPLOAD DOCS ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    const file = e.target.files[0];
    const filePath = `${id}/${Math.random()}.${file.name.split('.').pop()}`;
    
    await supabase.storage.from('documents').upload(filePath, file);
    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);
    
    await supabase.from('chantier_documents').insert([{ 
        chantier_id: id, nom: file.name, url: publicUrl, type: file.type.startsWith('image/') ? 'image' : 'pdf' 
    }]);

    setUploading(false);
    fetchChantierData(); 
  };

  // --- GESTION CHECKBOXES HSE ---
  const toggleArrayItem = (field: 'risques' | 'epi', value: string) => {
    const current = chantier[field] || [];
    if (current.includes(value)) {
        setChantier({ ...chantier, [field]: current.filter((i: string) => i !== value) });
    } else {
        setChantier({ ...chantier, [field]: [...current, value] });
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-['Fredoka'] text-[#34495e] font-bold">Chargement...</div>;

  return (
    <div className="min-h-screen bg-[#f0f3f4] font-['Fredoka'] pb-20 text-gray-800 ml-0 md:ml-0 transition-all">
      
      {/* --- HEADER FIXE --- */}
      <div className="bg-white/90 backdrop-blur-md sticky top-0 z-30 border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <Link href="/chantiers" className="bg-white p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-black hover:scale-105 transition-all">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-xl font-black uppercase tracking-tight text-[#2d3436]">{chantier.nom || 'Nouveau Chantier'}</h1>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Fiche Technique & Suivi</p>
                </div>
            </div>
            <button onClick={handleSave} className="bg-[#00b894] hover:bg-[#00a383] text-white px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-200 transition-all hover:scale-105 active:scale-95 font-bold uppercase flex items-center gap-2">
                <Save size={18} /> Sauvegarder
            </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* --- NAVIGATION ONGLETS --- */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {[
                { id: 'infos', label: 'Infos & Tâches', icon: FileText, color: 'bg-[#34495e]' },
                { id: 'materiel', label: 'Matériel', icon: ShoppingCart, color: 'bg-[#0984e3]' },
                { id: 'locations', label: 'Locations', icon: CalendarClock, color: 'bg-[#6c5ce7]' },
                { id: 'hse', label: 'Sécurité / EPI', icon: Shield, color: 'bg-[#e17055]' },
                { id: 'acqpa', label: 'ACQPA', icon: ClipboardCheck, color: 'bg-[#0984e3]' },
                { id: 'docs', label: 'Documents', icon: UploadCloud, color: 'bg-[#6c5ce7]' },
                { id: 'journal', label: 'Journal', icon: MessageSquareWarning, color: 'bg-[#d63031]' },
            ].map(tab => (
                <button 
                    key={tab.id} onClick={() => setActiveTab(tab.id)} 
                    className={`px-5 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all shadow-sm flex items-center gap-2 ${
                        activeTab === tab.id ? `${tab.color} text-white shadow-lg scale-105` : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50'
                    }`}
                >
                    <tab.icon size={16} /> {tab.label}
                </button>
            ))}
        </div>

        {/* ================= CONTENU ================= */}

        {/* 1. INFOS & TÂCHES (RESTAURATION COMPLETE) */}
        {activeTab === 'infos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
                
                {/* COLONNE GAUCHE : INFOS CHANTIER */}
                <div className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-100 space-y-4">
                    <h3 className="font-black uppercase text-gray-700 mb-4">Identification</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nom</label>
                            <input value={chantier.nom} onChange={e => setChantier({...chantier, nom: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none border border-transparent focus:border-[#00b894]" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Client</label>
                            <input value={chantier.client} onChange={e => setChantier({...chantier, client: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Responsable</label>
                            <input value={chantier.responsable} onChange={e => setChantier({...chantier, responsable: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none" />
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Adresse</label>
                            <input value={chantier.adresse} onChange={e => setChantier({...chantier, adresse: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type</label>
                            <select value={chantier.type} onChange={e => setChantier({...chantier, type: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none cursor-pointer">
                                {TYPE_CHANTIER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Statut</label>
                            <select value={chantier.statut} onChange={e => setChantier({...chantier, statut: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none cursor-pointer">
                                <option value="en_cours">En cours</option>
                                <option value="planifie">Planifié</option>
                                <option value="termine">Terminé</option>
                            </select>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Début</label>
                                <input type="date" value={chantier.date_debut} onChange={e => setChantier({...chantier, date_debut: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fin</label>
                                <input type="date" value={chantier.date_fin} onChange={e => setChantier({...chantier, date_fin: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none" />
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-black text-[#0984e3] uppercase">Mesures ACQPA</h4>
                                <p className="text-xs text-blue-400 font-bold">Activer le module</p>
                            </div>
                            <input type="checkbox" checked={chantier.mesures_obligatoires} onChange={e => setChantier({...chantier, mesures_obligatoires: e.target.checked})} className="w-6 h-6 accent-[#0984e3]" />
                        </div>
                    </div>
                </div>

                {/* COLONNE DROITE : TÂCHES & OBJECTIFS (RESTAURÉ) */}
                <div className="bg-[#34495e] rounded-[30px] p-6 shadow-xl text-white relative overflow-hidden flex flex-col h-full min-h-[500px]">
                    <h3 className="font-black uppercase text-xl mb-4 flex items-center gap-2">
                        <div className="bg-[#ff9f43] p-2 rounded-full text-white shadow-lg"><CheckCircle2 size={20}/></div>
                        Tâches & Objectifs
                    </h3>
                    
                    {/* Input Ajout Tâche */}
                    <div className="flex gap-2 mb-4">
                        <div className="flex-1 bg-white/10 rounded-xl flex items-center p-1 border border-white/5">
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
                                type="number" placeholder="H" value={newTaskHours}
                                onChange={(e) => setNewTaskHours(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                                className="w-full bg-transparent p-2 text-sm font-bold text-white text-center placeholder-white/40 outline-none"
                            />
                        </div>
                        <button onClick={addTask} className="bg-[#ff9f43] text-white p-3 rounded-xl hover:bg-[#e67e22] shadow-lg">
                            <Plus size={20}/>
                        </button>
                    </div>

                    {/* Liste des tâches */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                        {tasks.map((t) => (
                            <div key={t.id} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors group">
                                <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleTask(t)}>
                                    {t.done ? <CheckCircle2 size={20} className="text-[#00b894]" /> : <Circle size={20} className="text-[#ff9f43]" />}
                                    <span className={`text-sm font-bold ${t.done ? 'line-through opacity-40' : 'text-white'}`}>{t.label}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {t.objectif_heures > 0 && (
                                        <span className="text-[10px] bg-[#0984e3] px-2 py-1 rounded text-white font-bold flex items-center gap-1">
                                            <Clock size={10} /> {t.objectif_heures}h
                                        </span>
                                    )}
                                    <button onClick={() => deleteItem('chantier_tasks', t.id)} className="text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* 2. MATÉRIEL (Bleu) */}
        {activeTab === 'materiel' && (
             <div className="animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-[#0984e3] p-6 rounded-[30px] text-white shadow-xl mb-6 flex gap-4">
                    <input placeholder="Ex: 5 pots Peinture..." value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addMaterial()} className="flex-1 bg-white/20 text-white p-3 rounded-xl outline-none font-bold placeholder-white/60" />
                    <button onClick={addMaterial} className="bg-white text-[#0984e3] px-6 py-3 rounded-xl font-black uppercase">Ajouter</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {materials.map(m => (
                        <div key={m.id} className="bg-white p-4 rounded-[20px] flex justify-between items-center shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-50 p-2 text-[#0984e3] rounded-lg"><ShoppingCart size={20} /></div>
                                <p className="font-bold text-gray-700">{m.item}</p>
                            </div>
                            <button onClick={() => deleteItem('material_requests', m.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={18} /></button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* 3. LOCATIONS (Violet) */}
        {activeTab === 'locations' && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-[#6c5ce7] p-6 rounded-[30px] text-white shadow-xl mb-6 flex gap-4">
                    <input placeholder="Matériel..." value={newLoc.materiel} onChange={(e) => setNewLoc({...newLoc, materiel: e.target.value})} className="flex-1 bg-white/20 text-white p-3 rounded-xl outline-none font-bold" />
                    <input type="date" value={newLoc.date_fin} onChange={(e) => setNewLoc({...newLoc, date_fin: e.target.value})} className="bg-white/20 text-white p-3 rounded-xl outline-none font-bold cursor-pointer" />
                    <button onClick={addRental} className="bg-white text-[#6c5ce7] px-6 py-3 rounded-xl font-black uppercase">Valider</button>
                </div>
                <div className="space-y-3">
                    {rentals.map(r => (
                        <div key={r.id} className="bg-white p-4 rounded-[25px] flex justify-between items-center shadow-sm border border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className="bg-indigo-50 p-3 rounded-2xl text-[#6c5ce7]"><CalendarClock size={24} /></div>
                                <div>
                                    <p className="font-black text-gray-800 text-lg">{r.materiel}</p>
                                    <p className="text-xs text-gray-400 font-bold">Fin le {new Date(r.date_fin).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <button onClick={() => deleteItem('rentals', r.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={20} /></button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* 4. HSE (Orange) */}
        {activeTab === 'hse' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-[#e17055] text-white rounded-[30px] p-6 shadow-xl relative">
                    <h3 className="font-black uppercase text-xl mb-4 flex items-center gap-2"><AlertTriangle/> Risques</h3>
                    <div className="space-y-3">
                        {RISK_OPTIONS.map(risk => (
                            <div key={risk} onClick={() => toggleArrayItem('risques', risk)} className="flex items-center gap-3 bg-white/10 p-3 rounded-xl cursor-pointer hover:bg-white/20">
                                <div className={`w-5 h-5 rounded border-2 border-white flex items-center justify-center ${chantier.risques?.includes(risk) ? 'bg-white' : ''}`}>
                                    {chantier.risques?.includes(risk) && <CheckSquare size={14} className="text-[#e17055]" />}
                                </div>
                                <span className="font-bold text-sm uppercase">{risk}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-[#00b894] text-white rounded-[30px] p-6 shadow-xl relative">
                    <h3 className="font-black uppercase text-xl mb-4 flex items-center gap-2"><Shield/> EPI</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {EPI_OPTIONS.map(epi => (
                            <div key={epi} onClick={() => toggleArrayItem('epi', epi)} className="flex items-center gap-3 bg-white/10 p-3 rounded-xl cursor-pointer hover:bg-white/20">
                                <div className={`w-5 h-5 rounded border-2 border-white flex items-center justify-center ${chantier.epi?.includes(epi) ? 'bg-white' : ''}`}>
                                    {chantier.epi?.includes(epi) && <CheckSquare size={14} className="text-[#00b894]" />}
                                </div>
                                <span className="font-bold text-sm uppercase">{epi}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* 5. ACQPA (Bleu) */}
        {activeTab === 'acqpa' && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
                {!chantier.mesures_obligatoires ? (
                    <div className="bg-white rounded-[30px] p-10 text-center border border-gray-100 shadow-sm">
                        <h3 className="font-black text-gray-400 uppercase text-xl">Module Désactivé</h3>
                        <p className="text-gray-400 font-bold mb-4">Activez le module dans l'onglet Infos.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-[#0984e3] text-white p-6 rounded-[30px] shadow-xl flex justify-between items-center">
                            <div>
                                <h3 className="font-black uppercase text-xl">Relevés Peinture</h3>
                                <p className="text-blue-200 font-bold text-sm">Suivi ACQPA</p>
                            </div>
                            <button onClick={() => setShowACQPAModal(true)} className="bg-white text-[#0984e3] px-6 py-3 rounded-xl font-black uppercase shadow-lg hover:scale-105 transition-transform">
                                Ouvrir Formulaire
                            </button>
                        </div>
                        
                        {/* Résumé Données */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-[20px] shadow-sm border-l-4 border-blue-400">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Hygrométrie</p>
                                <p className="text-xl font-black text-gray-800">{acqpaData.hygrometrie || '--'} %</p>
                            </div>
                             <div className="bg-white p-4 rounded-[20px] shadow-sm border-l-4 border-green-400">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">DFT Mesuré</p>
                                <p className="text-xl font-black text-gray-800">{acqpaData.dft_mesure || '--'} µm</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* 6. DOCUMENTS */}
        {activeTab === 'docs' && (
             <div className="animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-[#6c5ce7] p-8 rounded-[30px] text-white shadow-xl flex flex-col items-center justify-center text-center border-4 border-dashed border-white/20 relative cursor-pointer hover:bg-[#5f27cd]">
                    <UploadCloud size={40} className="mb-2" />
                    <p className="font-black uppercase text-xl">Ajouter Photos / Docs</p>
                    <input type="file" onChange={handleFileUpload} disabled={uploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    {documents.map(doc => (
                        <div key={doc.id} className="bg-white p-3 rounded-[25px] shadow-sm h-[180px] flex flex-col relative group border border-gray-100">
                            <div className="flex-1 bg-gray-50 rounded-[15px] mb-2 flex items-center justify-center overflow-hidden">
                                {doc.type === 'image' ? <img src={doc.url} className="w-full h-full object-cover"/> : <FileText size={40} className="text-gray-300"/>}
                            </div>
                            <div className="flex justify-between items-center px-2">
                                <p className="text-xs font-bold text-gray-600 truncate w-20">{doc.nom}</p>
                                <div className="flex gap-2">
                                    <a href={doc.url} target="_blank" className="text-gray-400 hover:text-blue-500"><Eye size={16}/></a>
                                    <button onClick={() => deleteItem('chantier_documents', doc.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* 7. JOURNAL */}
        {activeTab === 'journal' && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-[#d63031] p-4 rounded-[25px] text-white shadow-xl mb-6 flex gap-3 items-center">
                    <input placeholder="Signaler un incident..." value={newReport} onChange={(e) => setNewReport(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addReport()} className="flex-1 bg-transparent text-white placeholder-red-200 font-bold outline-none" />
                    <button onClick={addReport}><Plus size={24} /></button>
                </div>
                <div className="space-y-4">
                    {reports.map(r => (
                        <div key={r.id} className="bg-white p-5 rounded-[25px] shadow-sm border-l-8 border-[#d63031] flex justify-between">
                            <p className="font-bold text-gray-800">{r.message}</p>
                            <button onClick={() => deleteItem('site_reports', r.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={18}/></button>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </div>

      {/* MODALE ACQPA */}
      {showACQPAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-[30px] w-full max-w-5xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="bg-[#0984e3] p-6 text-white flex justify-between items-center shrink-0">
                    <h2 className="text-2xl font-black uppercase">Formulaire ACQPA</h2>
                    <button onClick={() => setShowACQPAModal(false)} className="bg-white/20 p-2 rounded-full"><X size={24} /></button>
                </div>
                <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                    {/* SECTION AMBIANCE */}
                    <section>
                        <h3 className="flex items-center gap-2 font-black text-gray-800 uppercase text-lg mb-4 border-b pb-2"><Thermometer className="text-[#0984e3]"/> Ambiance</h3>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            {['temp_air', 'temp_support', 'hygrometrie', 'point_rosee', 'delta_t'].map(k => (
                                <div key={k}>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">{k.replace('_', ' ')}</label>
                                    <input type="number" className="w-full bg-gray-50 border p-2 rounded-xl font-bold" value={acqpaData[k] || ''} onChange={e => setAcqpaData({...acqpaData, [k]: e.target.value})} />
                                </div>
                            ))}
                        </div>
                    </section>
                    {/* SECTION PRODUITS */}
                    <section>
                        <h3 className="flex items-center gap-2 font-black text-gray-800 uppercase text-lg mb-4 border-b pb-2"><Droplets className="text-[#0984e3]"/> Produits</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <input placeholder="Type Peinture" className="bg-gray-50 p-2 rounded-xl font-bold border" value={acqpaData.produit_type || ''} onChange={e => setAcqpaData({...acqpaData, produit_type: e.target.value})} />
                            <input placeholder="Numéro Lot" className="bg-gray-50 p-2 rounded-xl font-bold border" value={acqpaData.produit_lot || ''} onChange={e => setAcqpaData({...acqpaData, produit_lot: e.target.value})} />
                            <input type="number" placeholder="Nb Couches" className="bg-gray-50 p-2 rounded-xl font-bold border" value={acqpaData.nb_couches || ''} onChange={e => setAcqpaData({...acqpaData, nb_couches: e.target.value})} />
                        </div>
                    </section>
                    {/* SECTION CONTROLES */}
                    <section>
                        <h3 className="flex items-center gap-2 font-black text-gray-800 uppercase text-lg mb-4 border-b pb-2"><Ruler className="text-[#0984e3]"/> Contrôles</h3>
                        <div className="grid grid-cols-4 gap-4">
                            <input type="number" placeholder="Ép. Humide" className="bg-gray-50 p-2 rounded-xl font-bold border" value={acqpaData.ep_humide || ''} onChange={e => setAcqpaData({...acqpaData, ep_humide: e.target.value})} />
                            <input type="number" placeholder="DFT Mesuré" className="bg-gray-50 p-2 rounded-xl font-bold border border-green-200" value={acqpaData.dft_mesure || ''} onChange={e => setAcqpaData({...acqpaData, dft_mesure: e.target.value})} />
                            <input type="number" placeholder="Adhérence" className="bg-gray-50 p-2 rounded-xl font-bold border" value={acqpaData.adherence || ''} onChange={e => setAcqpaData({...acqpaData, adherence: e.target.value})} />
                            <input placeholder="Retouches ?" className="bg-gray-50 p-2 rounded-xl font-bold border" value={acqpaData.retouches || ''} onChange={e => setAcqpaData({...acqpaData, retouches: e.target.value})} />
                        </div>
                    </section>
                </div>
                <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
                    <input placeholder="Nom Inspecteur" className="bg-white p-3 rounded-xl border font-bold" value={acqpaData.inspecteur_nom || ''} onChange={e => setAcqpaData({...acqpaData, inspecteur_nom: e.target.value})} />
                    <button onClick={() => { setShowACQPAModal(false); handleSave(); }} className="bg-[#0984e3] text-white px-8 py-3 rounded-xl font-black uppercase shadow-lg">Enregistrer</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}
