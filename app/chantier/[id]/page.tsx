
"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, Save, FileText, UploadCloud, X, Eye, Trash2, 
  AlertTriangle, Shield, CheckSquare, Thermometer, Droplets, 
  Layers, Ruler, ClipboardCheck, FolderOpen,
  Calendar, MonitorPlay
} from 'lucide-react';
import Link from 'next/link';

// LISTES PRÉDÉFINIES
const RISK_OPTIONS = ['Amiante', 'Plomb', 'Silice', 'ATEX', 'Hauteur'];
const EPI_OPTIONS = ['Casque', 'Harnais', 'chaussures de sécurité', 'Combinaison', 'protections des voies respiratoires', 'Gants', 'protections pour les oreilles', 'Lunettes'];
const TYPE_CHANTIER_OPTIONS = ['Industriel', 'Parking', 'Ouvrage d\'art', 'Autre'];

export default function ChantierDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('infos');
  const [showACQPAModal, setShowACQPAModal] = useState(false);

  // DONNÉES GLOBALES
  const [chantier, setChantier] = useState<any>({
    nom: '', client: '', adresse: '', responsable: '', date_debut: '', date_fin: '', type: 'Industriel',
    risques: [], epi: [],
    mesures_obligatoires: false
  });
  const [acqpaData, setAcqpaData] = useState<any>({});
  
  // États secondaires pour l'UI
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  // --- CHARGEMENT ---
  useEffect(() => { fetchChantierData(); }, [id]);

  async function fetchChantierData() {
    if (!id) return;
    setLoading(true);

    const { data: c } = await supabase.from('chantiers').select('*').eq('id', id).single();
    if (c) {
        // Initialisation des champs JSON s'ils sont null
        setChantier({
            ...c,
            risques: c.risques || [],
            epi: c.epi || [],
            mesures_acqpa: c.mesures_acqpa || {}
        });
        setAcqpaData(c.mesures_acqpa || {});
    }

    const { data: d } = await supabase.from('chantier_documents').select('*').eq('chantier_id', id).order('created_at', { ascending: false });
    if (d) setDocuments(d);

    setLoading(false);
  }

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
        risques: chantier.risques,
        epi: chantier.epi,
        mesures_obligatoires: chantier.mesures_obligatoires,
        mesures_acqpa: acqpaData 
    };
    
    await supabase.from('chantiers').update(toSave).eq('id', id);
    alert('✅ Chantier sauvegardé avec succès !');
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
                { id: 'infos', label: 'Infos Générales', icon: FileText, color: 'bg-[#34495e]' },
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

        {/* 1. INFOS GÉNÉRALES */}
        {activeTab === 'infos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
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
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type Chantier</label>
                            <select value={chantier.type || 'Industriel'} onChange={e => setChantier({...chantier, type: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none cursor-pointer">
                                {TYPE_CHANTIER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-100 space-y-4">
                    <h3 className="font-black uppercase text-gray-700 mb-4">Planning & Paramètres</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date Début</label>
                            <input type="date" value={chantier.date_debut || ''} onChange={e => setChantier({...chantier, date_debut: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date Fin (Prévue)</label>
                            <input type="date" value={chantier.date_fin || ''} onChange={e => setChantier({...chantier, date_fin: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none" />
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-black text-[#0984e3] uppercase">Mesures ACQPA Obligatoires</h4>
                                <p className="text-xs text-blue-400 font-bold">Activer le formulaire de relevé peinture</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={chantier.mesures_obligatoires || false} onChange={e => setChantier({...chantier, mesures_obligatoires: e.target.checked})} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0984e3]"></div>
                            </label>
                        </div>
                        {chantier.mesures_obligatoires && (
                            <button onClick={() => { setActiveTab('acqpa'); setShowACQPAModal(true); }} className="mt-3 w-full bg-[#0984e3] text-white py-2 rounded-xl font-bold text-sm uppercase shadow-md hover:bg-blue-600 transition-colors">
                                Ouvrir le formulaire de mesures
                            </button>
                        )}
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
                        <input placeholder="Autre risque (préciser)..." className="w-full bg-white/20 p-3 rounded-xl placeholder-white/60 text-white font-bold text-sm outline-none border border-white/10 focus:bg-white/30" />
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
                                <span className="font-bold text-sm uppercase">{epi}</span>
                            </label>
                        ))}
                         <input placeholder="Autre EPI..." className="col-span-2 w-full bg-white/20 p-3 rounded-xl placeholder-white/60 text-white font-bold text-sm outline-none border border-white/10 focus:bg-white/30" />
                    </div>
                    <Shield size={150} className="absolute -right-5 -bottom-5 text-emerald-900 opacity-10 rotate-12 pointer-events-none" />
                </div>
            </div>
        )}

        {/* 3. ACQPA (LE GROS MORCEAU) */}
        {activeTab === 'acqpa' && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
                {!chantier.mesures_obligatoires ? (
                    <div className="bg-white rounded-[30px] p-10 text-center border border-gray-100 shadow-sm">
                        <ClipboardCheck size={50} className="text-gray-300 mx-auto mb-4" />
                        <h3 className="font-black text-gray-400 uppercase text-xl">Module Désactivé</h3>
                        <p className="text-gray-400 font-bold mb-4">Veuillez activer "Mesures ACQPA Obligatoires" dans l'onglet Infos.</p>
                        <button onClick={() => { setChantier({...chantier, mesures_obligatoires: true}); setShowACQPAModal(true); }} className="bg-[#0984e3] text-white px-6 py-3 rounded-xl font-bold uppercase shadow-lg hover:bg-blue-600 transition-colors">
                            Activer le module
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-[#0984e3] text-white p-6 rounded-[30px] shadow-xl flex justify-between items-center relative overflow-hidden">
                            <div className="relative z-10">
                                <h3 className="font-black uppercase text-xl">Relevés Peinture (ACQPA)</h3>
                                <p className="text-blue-200 font-bold text-sm">Suivi qualité et conformité application</p>
                            </div>
                            <button onClick={() => setShowACQPAModal(true)} className="bg-white text-[#0984e3] px-6 py-3 rounded-xl font-black uppercase shadow-lg hover:scale-105 transition-transform relative z-10">
                                Ouvrir / Modifier Relevés
                            </button>
                            <ClipboardCheck size={100} className="absolute -right-0 -bottom-5 text-blue-900 opacity-10 rotate-12 pointer-events-none" />
                        </div>
                        
                        {/* Aperçu rapide des données saisies (Read-Only) */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-[20px] shadow-sm border-l-4 border-blue-400">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Température Air</p>
                                <p className="text-xl font-black text-gray-800">{acqpaData.temp_air || '--'} °C</p>
                            </div>
                            <div className="bg-white p-4 rounded-[20px] shadow-sm border-l-4 border-blue-400">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Hygrométrie</p>
                                <p className="text-xl font-black text-gray-800">{acqpaData.hygrometrie || '--'} %</p>
                            </div>
                             <div className="bg-white p-4 rounded-[20px] shadow-sm border-l-4 border-green-400">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">DFT Mesuré</p>
                                <p className="text-xl font-black text-gray-800">{acqpaData.dft_mesure || '--'} µm</p>
                            </div>
                             <div className="bg-white p-4 rounded-[20px] shadow-sm border-l-4 border-purple-400">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Inspecteur</p>
                                <p className="text-xl font-black text-gray-800 truncate">{acqpaData.inspecteur_nom || '--'}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* 4. DOCUMENTS / PHOTOS */}
        {activeTab === 'docs' && (
             <div className="animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-[#6c5ce7] p-8 rounded-[30px] text-white shadow-xl flex flex-col items-center justify-center text-center border-4 border-dashed border-white/20 relative overflow-hidden group mb-6 hover:bg-[#5f27cd] cursor-pointer transition-colors">
                    <UploadCloud size={40} className="mb-2" />
                    <p className="font-black uppercase text-xl">Ajouter Photos / Docs</p>
                    <p className="text-sm font-bold text-indigo-100 mt-1">PDF, JPG, PNG acceptés</p>
                    <input type="file" onChange={handleFileUpload} disabled={uploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {documents.map(doc => (
                        <div key={doc.id} className="bg-white p-3 rounded-[25px] shadow-sm h-[180px] flex flex-col relative group hover:shadow-lg transition-all border border-gray-100">
                            <div className="flex-1 bg-gray-50 rounded-[15px] mb-2 flex items-center justify-center overflow-hidden">
                                {doc.type === 'image' ? <img src={doc.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform"/> : <FileText size={40} className="text-gray-300"/>}
                            </div>
                            <div className="flex justify-between items-center px-2">
                                <p className="text-xs font-bold text-gray-600 truncate w-24">{doc.nom}</p>
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

        {/* 5. PLACEHOLDERS POUR LES AUTRES ONGLETS */}
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
                                {label: 'Rugosité (µm)', key: 'rugosite', type: 'number'},
                                {label: 'Sels Solubles', key: 'sels', placeholder: 'mg/m²'}
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

                    {/* SECTION 3 : PRODUITS */}
                    <section>
                        <h3 className="flex items-center gap-2 font-black text-gray-800 uppercase text-lg mb-4 border-b border-gray-100 pb-2">
                            <Droplets className="text-[#0984e3]"/> Produits & Application
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Type Peinture</label>
                                <input className="w-full bg-gray-50 border border-gray-100 p-2 rounded-xl font-bold text-gray-800 outline-none focus:border-[#0984e3]" value={acqpaData.produit_type || ''} onChange={e => setAcqpaData({...acqpaData, produit_type: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Numéro Lot</label>
                                <input className="w-full bg-gray-50 border border-gray-100 p-2 rounded-xl font-bold text-gray-800 outline-none focus:border-[#0984e3]" value={acqpaData.produit_lot || ''} onChange={e => setAcqpaData({...acqpaData, produit_lot: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Méthode</label>
                                <input placeholder="ex: Airless" className="w-full bg-gray-50 border border-gray-100 p-2 rounded-xl font-bold text-gray-800 outline-none focus:border-[#0984e3]" value={acqpaData.app_methode || ''} onChange={e => setAcqpaData({...acqpaData, app_methode: e.target.value})} />
                            </div>
                             <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Dilution (%)</label>
                                <input type="number" className="w-full bg-gray-50 border border-gray-100 p-2 rounded-xl font-bold text-gray-800 outline-none focus:border-[#0984e3]" value={acqpaData.dilution || ''} onChange={e => setAcqpaData({...acqpaData, dilution: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="col-span-2 md:col-span-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Date Appli</label>
                                <input type="date" className="w-full bg-gray-50 p-2 rounded-xl font-bold text-gray-800 outline-none border border-gray-100 focus:border-[#0984e3]" value={acqpaData.app_date || ''} onChange={e => setAcqpaData({...acqpaData, app_date: e.target.value})} />
                            </div>
                             <div className="col-span-2 md:col-span-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Applicateur</label>
                                <input className="w-full bg-gray-50 p-2 rounded-xl font-bold text-gray-800 outline-none border border-gray-100 focus:border-[#0984e3]" value={acqpaData.app_nom || ''} onChange={e => setAcqpaData({...acqpaData, app_nom: e.target.value})} />
                            </div>
                             <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">DFT Théorique</label>
                                <input type="number" className="w-full bg-gray-50 p-2 rounded-xl font-bold text-center text-gray-800 outline-none border border-gray-100 focus:border-[#0984e3]" value={acqpaData.dft_theo || ''} onChange={e => setAcqpaData({...acqpaData, dft_theo: e.target.value})} />
                            </div>
                             <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Nb Couches</label>
                                <input type="number" className="w-full bg-gray-50 p-2 rounded-xl font-bold text-center text-gray-800 outline-none border border-gray-100 focus:border-[#0984e3]" value={acqpaData.nb_couches || ''} onChange={e => setAcqpaData({...acqpaData, nb_couches: e.target.value})} />
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
                                {label: 'Ép. Humide (µm)', key: 'ep_humide'},
                                {label: 'Ép. Sèche (µm)', key: 'dft_mesure'},
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
