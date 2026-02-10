"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, Save, FileText, UploadCloud, X, Eye, Trash2, 
  AlertTriangle, Shield, CheckSquare, Thermometer, Droplets, 
  Layers, Ruler, ClipboardCheck, FolderOpen,
  Calendar, MonitorPlay, CheckCircle2, Circle, Clock, Plus, Minus,
  Users, Percent // Ajout de l'icône Percent
} from 'lucide-react';
import Link from 'next/link';

// LISTES PRÉDÉFINIES
const RISK_OPTIONS = ['Amiante', 'Plomb', 'Silice', 'ATEX', 'Hauteur'];
const EPI_OPTIONS = ['Casque', 'Harnais', 'Chaussures de sécurité', 'Combinaison', 'Protections respiratoires', 'Gants', 'Protections auditives', 'Lunettes'];
const TYPE_CHANTIER_OPTIONS = ['Industriel', 'Parking', 'Ouvrage d\'art', 'Autre'];

export default function ChantierDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('infos');
  const [showACQPAModal, setShowACQPAModal] = useState(false);

  // DONNÉES GLOBALES
  const [chantier, setChantier] = useState<any>({
    nom: '', client: '', adresse: '', responsable: '', date_debut: '', date_fin: '', type: 'Industriel', 
    statut: 'en_cours', // Statut par défaut
    heures_budget: 0, heures_consommees: 0, 
    effectif_prevu: 0, 
    taux_reussite: 100, // AJOUT : Taux de réussite (défaut 100%)
    risques: [], epi: [],
    mesures_obligatoires: false
  });
  const [acqpaData, setAcqpaData] = useState<any>({
    couches: [{ type: '', lot: '', methode: '', dilution: '' }] 
  });
  
  // DONNÉES LISTES
  const [tasks, setTasks] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  
  // UI STATES
  const [uploading, setUploading] = useState(false);
  const [newTaskLabel, setNewTaskLabel] = useState("");
  const [newTaskHours, setNewTaskHours] = useState("");

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
            effectif_prevu: c.effectif_prevu || 0,
            taux_reussite: c.taux_reussite || 100, // Chargement du taux
            risques: c.risques || [],
            epi: c.epi || [],
            mesures_acqpa: c.mesures_acqpa || {}
        });
        
        // Gestion de la compatibilité pour le multi-couches
        const currentAcqpa = c.mesures_acqpa || {};
        if (!currentAcqpa.couches) {
            currentAcqpa.couches = [{ 
                type: currentAcqpa.produit_type || '', 
                lot: currentAcqpa.produit_lot || '',
                methode: currentAcqpa.app_methode || '',
                dilution: currentAcqpa.dilution || ''
            }];
        }
        setAcqpaData(currentAcqpa);
    }

    // 2. Tâches
    const { data: t } = await supabase.from('chantier_tasks').select('*').eq('chantier_id', id).order('created_at', { ascending: false });
    if (t) setTasks(t);

    // 3. Documents
    const { data: d } = await supabase.from('chantier_documents').select('*').eq('chantier_id', id).order('created_at', { ascending: false });
    if (d) setDocuments(d);

    setLoading(false);
  }

  // --- LOGIQUE DE CALCUL AUTOMATIQUE DE L'AVANCEMENT ---
  const updateProgress = async (currentTasks: any[]) => {
    // 1. Calculer la somme des heures des tâches terminées
    const totalConsumed = currentTasks
        .filter(t => t.done)
        .reduce((sum, t) => sum + (t.objectif_heures || 0), 0);

    // 2. Mettre à jour la base de données
    await supabase.from('chantiers').update({ heures_consommees: totalConsumed }).eq('id', id);
    
    // 3. Mettre à jour l'état local pour affichage immédiat
    setChantier((prev: any) => ({ ...prev, heures_consommees: totalConsumed }));
  };

  // --- SAUVEGARDE GLOBALE ---
  const handleSave = async () => {
    const toSave = {
        nom: chantier.nom,
        client: chantier.client,
        adresse: chantier.adresse,
        responsable: chantier.responsable,
        date_debut: chantier.date_debut,
        date_fin: chantier.date_fin,
        type: chantier.type,
        statut: chantier.statut, // Sauvegarde du statut
        heures_budget: chantier.heures_budget,
        effectif_prevu: chantier.effectif_prevu,
        taux_reussite: chantier.taux_reussite, // Sauvegarde du taux
        risques: chantier.risques,
        epi: chantier.epi,
        mesures_obligatoires: chantier.mesures_obligatoires,
        mesures_acqpa: acqpaData 
    };
    
    await supabase.from('chantiers').update(toSave).eq('id', id);
    alert('✅ Chantier sauvegardé avec succès !');
  };

  // --- GESTION TÂCHES (AJOUT / SUPPRESSION / MODIF + RECALCUL) ---
  const addTask = async () => {
    if (!newTaskLabel) return;
    
    // Insertion
    const { data, error } = await supabase.from('chantier_tasks').insert([{ 
        chantier_id: id, 
        label: newTaskLabel, 
        objectif_heures: parseInt(newTaskHours) || 0, 
        done: false 
    }]).select();

    if (data) {
        const updatedList = [data[0], ...tasks];
        setTasks(updatedList);
        // Pas besoin de recalculer ici car done est false par défaut, mais pour la forme :
        updateProgress(updatedList);
    }

    setNewTaskLabel("");
    setNewTaskHours("");
  };

  const toggleTask = async (task: any) => {
    // Mise à jour optimiste
    const updatedList = tasks.map(t => t.id === task.id ? { ...t, done: !t.done } : t);
    setTasks(updatedList);
    
    // Mise à jour DB
    await supabase.from('chantier_tasks').update({ done: !task.done }).eq('id', task.id);
    
    // Recalcul du budget consommé
    updateProgress(updatedList);
  };

  const deleteTask = async (taskId: string) => {
    if(confirm('Supprimer cette tâche ?')) {
        await supabase.from('chantier_tasks').delete().eq('id', taskId);
        
        const updatedList = tasks.filter(t => t.id !== taskId);
        setTasks(updatedList);
        
        // Recalcul (au cas où on supprime une tâche faite)
        updateProgress(updatedList);
    }
  };

  // --- ACQPA : GESTION MULTI-COUCHES ---
  const addCouche = () => {
    setAcqpaData({
        ...acqpaData,
        couches: [...(acqpaData.couches || []), { type: '', lot: '', methode: '', dilution: '' }]
    });
  };

  const removeCouche = (index: number) => {
    const newCouches = [...acqpaData.couches];
    newCouches.splice(index, 1);
    setAcqpaData({ ...acqpaData, couches: newCouches });
  };

  const updateCouche = (index: number, field: string, value: string) => {
    const newCouches = [...acqpaData.couches];
    newCouches[index][field] = value;
    setAcqpaData({ ...acqpaData, couches: newCouches });
  };

  // --- GESTION DES CHECKBOXES (RISQUES / EPI) ---
  const toggleArrayItem = (field: 'risques' | 'epi', value: string) => {
    const current = chantier[field] || [];
    if (current.includes(value)) {
        setChantier({ ...chantier, [field]: current.filter((i: string) => i !== value) });
    } else {
        setChantier({ ...chantier, [field]: [...current, value] });
    }
  };

  // --- UPLOAD DOCUMENTS ---
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

  const deleteDocument = async (docId: string) => {
    if(confirm('Supprimer ce document ?')) {
        await supabase.from('chantier_documents').delete().eq('id', docId);
        fetchChantierData();
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-['Fredoka'] text-[#34495e] font-bold">Chargement...</div>;

  // Calcul du % pour affichage local
  const percent = chantier.heures_budget > 0 ? Math.round((chantier.heures_consommees / chantier.heures_budget) * 100) : 0;

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
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Budget : {chantier.heures_consommees}h / {chantier.heures_budget}h ({percent}%)
                    </p>
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
                { id: 'hse', label: 'Sécurité / EPI', icon: Shield, color: 'bg-[#e17055]' },
                { id: 'acqpa', label: 'Mesures ACQPA', icon: ClipboardCheck, color: 'bg-[#0984e3]' },
                { id: 'docs', label: 'Photos / Docs', icon: UploadCloud, color: 'bg-[#6c5ce7]' },
                { id: 'classeur', label: 'Classeur', icon: FolderOpen, color: 'bg-gray-700' },
                { id: 'planning', label: 'Planning', icon: Calendar, color: 'bg-gray-700' },
                { id: 'presentation', label: 'Présentations', icon: MonitorPlay, color: 'bg-gray-700' },
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

        {/* 1. INFOS GÉNÉRALES + TÂCHES */}
        {activeTab === 'infos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
                
                {/* BLOC GAUCHE : INFOS CHANTIER */}
                <div className="space-y-6">
                    <div className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-100 space-y-4">
                        <h3 className="font-black uppercase text-gray-700 mb-4">Identification</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nom du Chantier</label>
                                <input value={chantier.nom || ''} onChange={e => setChantier({...chantier, nom: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none border border-transparent focus:border-[#00b894]" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Client</label>
                                <input value={chantier.client || ''} onChange={e => setChantier({...chantier, client: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Localisation</label>
                                <input value={chantier.adresse || ''} onChange={e => setChantier({...chantier, adresse: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Responsable</label>
                                <input value={chantier.responsable || ''} onChange={e => setChantier({...chantier, responsable: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none" />
                            </div>
                            
                            {/* --- AJOUT MENU STATUT AVEC OPTION POTENTIEL --- */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Statut</label>
                                <select 
                                    value={chantier.statut || 'en_cours'} 
                                    onChange={e => setChantier({...chantier, statut: e.target.value})} 
                                    className={`w-full bg-gray-50 p-3 rounded-xl font-bold outline-none cursor-pointer ${chantier.statut === 'potentiel' ? 'text-blue-600' : ''}`}
                                >
                                    <option value="planifie">Planifié</option>
                                    <option value="en_cours">En Cours</option>
                                    <option value="potentiel">Potentiel (Offre)</option>
                                    <option value="termine">Terminé</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type</label>
                                <select value={chantier.type || 'Industriel'} onChange={e => setChantier({...chantier, type: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none cursor-pointer">
                                    {TYPE_CHANTIER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-100 space-y-4">
                        <h3 className="font-black uppercase text-gray-700 mb-4">Planning & Options</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date Début</label>
                                <input type="date" value={chantier.date_debut || ''} onChange={e => setChantier({...chantier, date_debut: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date Fin</label>
                                <input type="date" value={chantier.date_fin || ''} onChange={e => setChantier({...chantier, date_fin: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none" />
                            </div>
                            
                            {/* --- AJOUT : EFFECTIF PRÉVU + CONDITIONNEL TAUX --- */}
                            <div className={chantier.statut === 'potentiel' ? '' : 'col-span-2'}>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Effectif Prévu (Pers.)</label>
                                <div className="flex items-center bg-gray-50 rounded-xl px-2 mt-1">
                                    <Users size={16} className="text-gray-400 mr-2"/>
                                    <input 
                                        type="number" 
                                        value={chantier.effectif_prevu || ''} 
                                        onChange={e => setChantier({...chantier, effectif_prevu: parseInt(e.target.value) || 0})} 
                                        className="w-full bg-transparent p-3 font-bold outline-none"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            {chantier.statut === 'potentiel' && (
                                <div>
                                    <label className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">% Réussite</label>
                                    <div className="flex items-center bg-blue-50 rounded-xl px-2 mt-1 border border-blue-100">
                                        <Percent size={16} className="text-blue-400 mr-2"/>
                                        <input 
                                            type="number" 
                                            max="100"
                                            value={chantier.taux_reussite || ''} 
                                            onChange={e => setChantier({...chantier, taux_reussite: parseInt(e.target.value) || 0})} 
                                            className="w-full bg-transparent p-3 font-bold text-blue-700 outline-none"
                                            placeholder="100"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Budget Heures (Total)</label>
                                <div className="flex items-center bg-gray-50 rounded-xl px-2 mt-1">
                                    <Clock size={16} className="text-gray-400 mr-2"/>
                                    <input type="number" value={chantier.heures_budget || 0} onChange={e => setChantier({...chantier, heures_budget: parseFloat(e.target.value)})} className="w-full bg-transparent p-3 font-bold outline-none" />
                                </div>
                            </div>
                        </div>
                        <div className="mt-2 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
                            <div>
                                <h4 className="font-black text-[#0984e3] uppercase">Mesures ACQPA</h4>
                                <p className="text-xs text-blue-400 font-bold">Activer le module qualité</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={chantier.mesures_obligatoires || false} onChange={e => setChantier({...chantier, mesures_obligatoires: e.target.checked})} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0984e3]"></div>
                            </label>
                        </div>
                        {chantier.mesures_obligatoires && (
                            <button onClick={() => { setActiveTab('acqpa'); setShowACQPAModal(true); }} className="w-full bg-[#0984e3] text-white py-3 rounded-xl font-bold text-sm uppercase shadow-md hover:bg-blue-600 transition-colors">
                                Ouvrir le formulaire
                            </button>
                        )}
                    </div>
                </div>

                {/* BLOC DROITE : TÂCHES */}
                <div className="bg-[#34495e] rounded-[30px] p-6 shadow-xl text-white relative overflow-hidden flex flex-col h-full min-h-[500px]">
                    <div className="relative z-10 flex flex-col h-full">
                        <h3 className="font-black uppercase text-xl mb-4 flex items-center gap-2">
                            <div className="bg-[#ff9f43] p-2 rounded-full text-white shadow-lg"><CheckCircle2 size={20}/></div>
                            Tâches & Objectifs
                        </h3>
                        
                        {/* Input Ajout */}
                        <div className="flex gap-2 mb-4">
                            <input 
                                placeholder="Nouvelle tâche..." 
                                value={newTaskLabel}
                                onChange={(e) => setNewTaskLabel(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                                className="flex-1 bg-white/10 rounded-xl p-3 text-sm font-bold text-white placeholder-white/40 outline-none border border-white/5 focus:bg-white/20"
                            />
                            <input 
                                type="number" placeholder="H" value={newTaskHours}
                                onChange={(e) => setNewTaskHours(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                                className="w-20 bg-white/10 rounded-xl p-3 text-sm font-bold text-white text-center placeholder-white/40 outline-none border border-white/5"
                            />
                            <button onClick={addTask} className="bg-[#ff9f43] text-white p-3 rounded-xl hover:bg-[#e67e22] shadow-lg">
                                <Plus size={20}/>
                            </button>
                        </div>

                        {/* Liste des tâches */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                            {tasks.length === 0 ? (
                                <div className="text-center py-10 opacity-30">
                                    <CheckCircle2 size={40} className="mx-auto mb-2"/>
                                    <p className="text-sm font-bold">Aucune tâche</p>
                                </div>
                            ) : (
                                tasks.map((t) => (
                                    <div key={t.id} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors group">
                                        <div className="flex items-center gap-3 flex-1 cursor-pointer select-none" onClick={() => toggleTask(t)}>
                                            {t.done ? <CheckCircle2 size={20} className="text-[#00b894] shrink-0" /> : <Circle size={20} className="text-[#ff9f43] shrink-0" />}
                                            <span className={`text-sm font-bold ${t.done ? 'line-through opacity-40' : 'text-white'}`}>{t.label}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {t.objectif_heures > 0 && (
                                                <span className="text-[10px] bg-[#0984e3] px-2 py-1 rounded text-white font-bold flex items-center gap-1">
                                                    <Clock size={10} /> {t.objectif_heures}h
                                                </span>
                                            )}
                                            <button onClick={() => deleteTask(t.id)} className="text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                                <Trash2 size={16}/>
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

        {/* 2. HSE / SÉCURITÉ */}
        {activeTab === 'hse' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
                {/* Alertes Risques */}
                <div className="bg-[#e17055] text-white rounded-[30px] p-6 shadow-xl relative overflow-hidden">
                    <h3 className="font-black uppercase text-xl mb-4 flex items-center gap-2"><AlertTriangle/> Alertes Risques</h3>
                    <div className="space-y-3 relative z-10">
                        {RISK_OPTIONS.map(risk => (
                            <label key={risk} className="flex items-center gap-3 bg-white/10 p-3 rounded-xl cursor-pointer hover:bg-white/20 transition-colors border border-white/5">
                                <div onClick={() => toggleArrayItem('risques', risk)} className={`w-5 h-5 rounded flex items-center justify-center border-2 border-white ${chantier.risques?.includes(risk) ? 'bg-white' : 'bg-transparent'}`}>
                                    {chantier.risques?.includes(risk) && <CheckSquare size={14} className="text-[#e17055]" />}
                                </div>
                                <span className="font-bold text-sm uppercase">{risk}</span>
                            </label>
                        ))}
                    </div>
                    <AlertTriangle size={150} className="absolute -right-5 -bottom-5 text-orange-900 opacity-10 rotate-12 pointer-events-none" />
                </div>

                {/* EPI Obligatoires */}
                <div className="bg-[#00b894] text-white rounded-[30px] p-6 shadow-xl relative overflow-hidden">
                    <h3 className="font-black uppercase text-xl mb-4 flex items-center gap-2"><Shield/> EPI Obligatoires</h3>
                    <div className="grid grid-cols-2 gap-3 relative z-10">
                        {EPI_OPTIONS.map(epi => (
                            <label key={epi} className="flex items-center gap-3 bg-white/10 p-3 rounded-xl cursor-pointer hover:bg-white/20 transition-colors border border-white/5">
                                <div onClick={() => toggleArrayItem('epi', epi)} className={`w-5 h-5 rounded flex items-center justify-center border-2 border-white ${chantier.epi?.includes(epi) ? 'bg-white' : 'bg-transparent'}`}>
                                    {chantier.epi?.includes(epi) && <CheckSquare size={14} className="text-[#00b894]" />}
                                </div>
                                <span className="font-bold text-[11px] uppercase leading-tight">{epi}</span>
                            </label>
                        ))}
                    </div>
                    <Shield size={150} className="absolute -right-5 -bottom-5 text-emerald-900 opacity-10 rotate-12 pointer-events-none" />
                </div>
            </div>
        )}

        {/* 3. ACQPA */}
        {activeTab === 'acqpa' && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
                {!chantier.mesures_obligatoires ? (
                    <div className="bg-white rounded-[30px] p-10 text-center border border-gray-100 shadow-sm">
                        <ClipboardCheck size={50} className="text-gray-300 mx-auto mb-4" />
                        <h3 className="font-black text-gray-400 uppercase text-xl">Module Désactivé</h3>
                        <p className="text-gray-400 font-bold mb-4">Veuillez activer "Mesures ACQPA Obligatoires" dans l'onglet Infos.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-[#0984e3] text-white p-6 rounded-[30px] shadow-xl flex justify-between items-center relative overflow-hidden">
                            <div className="relative z-10">
                                <h3 className="font-black uppercase text-xl">Relevés Peinture (ACQPA)</h3>
                                <p className="text-blue-200 font-bold text-sm">Suivi qualité et conformité application</p>
                            </div>
                            <button onClick={() => setShowACQPAModal(true)} className="bg-white text-[#0984e3] px-6 py-3 rounded-xl font-black uppercase shadow-lg hover:scale-105 transition-transform relative z-10">
                                Ouvrir / Modifier
                            </button>
                            <ClipboardCheck size={100} className="absolute -right-0 -bottom-5 text-blue-900 opacity-10 rotate-12 pointer-events-none" />
                        </div>
                        
                        {/* Aperçu rapide */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-[20px] shadow-sm border-l-4 border-blue-400">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Hygrométrie</p>
                                <p className="text-xl font-black text-gray-800">{acqpaData.hygrometrie || '--'} %</p>
                            </div>
                             <div className="bg-white p-4 rounded-[20px] shadow-sm border-l-4 border-green-400">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">DFT Moy.</p>
                                <p className="text-xl font-black text-gray-800">{acqpaData.dft_mesure || '--'} µm</p>
                            </div>
                             <div className="bg-white p-4 rounded-[20px] shadow-sm border-l-4 border-purple-400">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Inspecteur</p>
                                <p className="text-xl font-black text-gray-800 truncate">{acqpaData.inspecteur_nom || '--'}</p>
                            </div>
                             <div className="bg-white p-4 rounded-[20px] shadow-sm border-l-4 border-orange-400">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Couches</p>
                                <p className="text-xl font-black text-gray-800">{acqpaData.couches?.length || 0}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* 4. DOCUMENTS */}
        {activeTab === 'docs' && (
             <div className="animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-[#6c5ce7] p-8 rounded-[30px] text-white shadow-xl flex flex-col items-center justify-center text-center border-4 border-dashed border-white/20 relative overflow-hidden group mb-6 hover:bg-[#5f27cd] cursor-pointer transition-colors">
                    <UploadCloud size={40} className="mb-2" />
                    <p className="font-black uppercase text-xl">Ajouter Photos / Docs</p>
                    <input type="file" onChange={handleFileUpload} disabled={uploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {documents.map(doc => (
                        <div key={doc.id} className="bg-white p-3 rounded-[25px] shadow-sm h-[180px] flex flex-col relative group hover:shadow-lg transition-all border border-gray-100">
                            <div className="flex-1 bg-gray-50 rounded-[15px] mb-2 flex items-center justify-center overflow-hidden">
                                {doc.type === 'image' ? <img src={doc.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform"/> : <FileText size={40} className="text-gray-300"/>}
                            </div>
                            <div className="flex justify-between items-center px-2">
                                <p className="text-xs font-bold text-gray-600 truncate w-20">{doc.nom}</p>
                                <div className="flex gap-2">
                                    <a href={doc.url} target="_blank" className="text-gray-400 hover:text-blue-500"><Eye size={16}/></a>
                                    <button onClick={() => deleteDocument(doc.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* 5. PLACEHOLDERS */}
        {(['classeur', 'planning', 'presentation'].includes(activeTab)) && (
            <div className="bg-white rounded-[30px] p-20 text-center border border-gray-100 shadow-sm animate-in fade-in">
                <FolderOpen size={60} className="mx-auto text-gray-200 mb-4" />
                <h3 className="font-black text-gray-400 uppercase text-xl">Section en construction</h3>
                <p className="text-gray-400 font-bold">Module {activeTab} à venir.</p>
            </div>
        )}

      </div>

      {/* ================= MODALE ACQPA (POPUP) ================= */}
      {showACQPAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-[30px] w-full max-w-5xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                
                {/* Header Modal */}
                <div className="bg-[#0984e3] p-6 text-white flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tight">Formulaire ACQPA</h2>
                        <p className="text-blue-100 font-bold text-xs uppercase tracking-widest">Contrôle Qualité Peinture Industrielle</p>
                    </div>
                    <button onClick={() => setShowACQPAModal(false)} className="bg-white/20 p-2 rounded-full hover:bg-white/40 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content Modal (Scrollable) */}
                <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                    
                    {/* SECTION 1 : AMBIANCE */}
                    <section>
                        <h3 className="flex items-center gap-2 font-black text-gray-800 uppercase text-lg mb-4 border-b border-gray-100 pb-2">
                            <Thermometer className="text-[#0984e3]"/> Ambiance
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {[
                                {label: 'Temp. Air (°C)', key: 'temp_air'},
                                {label: 'Temp. Support (°C)', key: 'temp_support'},
                                {label: 'Hygrométrie (%)', key: 'hygrometrie'},
                                {label: 'Point Rosée (°C)', key: 'point_rosee'},
                                {label: 'Delta T', key: 'delta_t'}
                            ].map(f => (
                                <div key={f.key}>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">{f.label}</label>
                                    <input 
                                        type="number" 
                                        className="w-full bg-gray-50 border border-gray-100 p-2 rounded-xl font-bold text-gray-800 text-center outline-none focus:border-[#0984e3] focus:bg-white transition-colors"
                                        value={acqpaData[f.key] || ''}
                                        onChange={(e) => setAcqpaData({...acqpaData, [f.key]: e.target.value})}
                                    />
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* SECTION 2 : SUPPORT */}
                    <section>
                        <h3 className="flex items-center gap-2 font-black text-gray-800 uppercase text-lg mb-4 border-b border-gray-100 pb-2">
                            <Layers className="text-[#0984e3]"/> Préparation Support
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                {label: 'Degré de Soin', key: 'degre_soin', placeholder: 'ex: Sa 2.5'},
                                {label: 'Propreté', key: 'proprete', placeholder: 'ex: OK'},
                                {label: 'Rugosité (µm)', key: 'rugosite', type: 'number'}, // µm ajouté
                                {label: 'Sels Solubles (µg/cm²)', key: 'sels', placeholder: 'µg/cm²'} // Unité corrigée
                            ].map(f => (
                                <div key={f.key}>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">{f.label}</label>
                                    <input 
                                        type={f.type || 'text'}
                                        placeholder={f.placeholder}
                                        className="w-full bg-gray-50 border border-gray-100 p-2 rounded-xl font-bold text-gray-800 outline-none focus:border-[#0984e3] focus:bg-white transition-colors"
                                        value={acqpaData[f.key] || ''}
                                        onChange={(e) => setAcqpaData({...acqpaData, [f.key]: e.target.value})}
                                    />
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* SECTION 3 : PRODUITS (DYNAMIQUE) */}
                    <section>
                        <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                            <h3 className="flex items-center gap-2 font-black text-gray-800 uppercase text-lg">
                                <Droplets className="text-[#0984e3]"/> Produits & Couches
                            </h3>
                            <button onClick={addCouche} className="flex items-center gap-1 bg-blue-50 text-[#0984e3] px-3 py-1 rounded-lg text-xs font-black uppercase hover:bg-blue-100 transition-colors">
                                <Plus size={14} /> Ajouter une couche
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            {acqpaData.couches && acqpaData.couches.map((couche: any, index: number) => (
                                <div key={index} className="bg-gray-50 p-4 rounded-xl relative group">
                                    <div className="absolute -top-3 left-3 bg-[#0984e3] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                                        Couche {index + 1}
                                    </div>
                                    <button onClick={() => removeCouche(index)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 size={16} />
                                    </button>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
                                        <div>
                                            <label className="text-[9px] font-bold text-gray-400 uppercase">Type Peinture</label>
                                            <input className="w-full bg-white border border-gray-200 p-2 rounded-lg font-bold" value={couche.type} onChange={e => updateCouche(index, 'type', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-bold text-gray-400 uppercase">Numéro Lot</label>
                                            <input className="w-full bg-white border border-gray-200 p-2 rounded-lg font-bold" value={couche.lot} onChange={e => updateCouche(index, 'lot', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-bold text-gray-400 uppercase">Méthode</label>
                                            <input className="w-full bg-white border border-gray-200 p-2 rounded-lg font-bold" placeholder="ex: Airless" value={couche.methode} onChange={e => updateCouche(index, 'methode', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-bold text-gray-400 uppercase">Dilution (%)</label>
                                            <input type="number" className="w-full bg-white border border-gray-200 p-2 rounded-lg font-bold" value={couche.dilution} onChange={e => updateCouche(index, 'dilution', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                            <div className="col-span-2 md:col-span-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Date Appli</label>
                                <input type="date" className="w-full bg-gray-50 p-2 rounded-xl font-bold text-gray-800 outline-none border border-gray-100 focus:border-[#0984e3]" value={acqpaData.app_date || ''} onChange={e => setAcqpaData({...acqpaData, app_date: e.target.value})} />
                            </div>
                             <div className="col-span-2 md:col-span-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Applicateur</label>
                                <input className="w-full bg-gray-50 p-2 rounded-xl font-bold text-gray-800 outline-none border border-gray-100 focus:border-[#0984e3]" value={acqpaData.app_nom || ''} onChange={e => setAcqpaData({...acqpaData, app_nom: e.target.value})} />
                            </div>
                             <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">DFT Théorique (µm)</label>
                                <input type="number" className="w-full bg-gray-50 p-2 rounded-xl font-bold text-center text-gray-800 outline-none border border-gray-100 focus:border-[#0984e3]" value={acqpaData.dft_theo || ''} onChange={e => setAcqpaData({...acqpaData, dft_theo: e.target.value})} />
                            </div>
                        </div>
                    </section>

                     {/* SECTION 4 : CONTRÔLES */}
                    <section>
                        <h3 className="flex items-center gap-2 font-black text-gray-800 uppercase text-lg mb-4 border-b border-gray-100 pb-2">
                            <Ruler className="text-[#0984e3]"/> Contrôles Finaux
                        </h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            {[
                                {label: 'Ép. Humide (µm)', key: 'ep_humide'}, // µm
                                {label: 'Ép. Sèche (µm)', key: 'dft_mesure'}, // µm
                                {label: 'Adhérence (MPa)', key: 'adherence'},
                                {label: 'Défauts', key: 'defauts', type: 'text'},
                                {label: 'Retouches ?', key: 'retouches', type: 'text'}
                            ].map(f => (
                                <div key={f.key}>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">{f.label}</label>
                                    <input 
                                        type={f.type || 'number'} 
                                        className={`w-full bg-gray-50 border border-gray-100 p-2 rounded-xl font-bold text-gray-800 text-center outline-none focus:border-[#0984e3] focus:bg-white transition-colors ${f.key === 'dft_mesure' ? 'bg-green-50 border-green-200' : ''}`}
                                        value={acqpaData[f.key] || ''}
                                        onChange={(e) => setAcqpaData({...acqpaData, [f.key]: e.target.value})}
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Footer Modal */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between items-center shrink-0 gap-4">
                    <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                         <div className="w-full md:w-auto">
                             <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Inspecteur ACQPA</label>
                             <input className="w-full md:w-64 bg-white p-3 rounded-xl border border-gray-200 font-bold text-sm outline-none focus:border-[#0984e3]" value={acqpaData.inspecteur_nom || ''} onChange={e => setAcqpaData({...acqpaData, inspecteur_nom: e.target.value})} />
                         </div>
                         <div className="w-full md:w-auto">
                             <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Validation</label>
                             <select className="w-full md:w-auto bg-white p-3 rounded-xl border border-gray-200 font-bold text-sm cursor-pointer outline-none focus:border-[#0984e3]" value={acqpaData.validation || 'En attente'} onChange={e => setAcqpaData({...acqpaData, validation: e.target.value})}>
                                <option value="En attente">Validation en attente</option>
                                <option value="Conforme">✅ Conforme</option>
                                <option value="Non Conforme">❌ Non Conforme</option>
                             </select>
                         </div>
                    </div>
                    <button onClick={() => { setShowACQPAModal(false); handleSave(); }} className="w-full md:w-auto bg-[#0984e3] hover:bg-[#0074d9] text-white px-8 py-3 rounded-xl font-black uppercase shadow-lg transition-transform hover:scale-105">
                        Enregistrer & Fermer
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}
