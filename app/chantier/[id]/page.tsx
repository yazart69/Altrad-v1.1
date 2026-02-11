"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, Save, FileText, UploadCloud, X, Eye, Trash2, 
  AlertTriangle, Shield, CheckSquare, Thermometer, Droplets, 
  Layers, Ruler, ClipboardCheck, FolderOpen,
  Calendar, MonitorPlay, CheckCircle2, Circle, Clock, Plus, Minus,
  Users, Percent, Truck, Package, Wrench, Mail, Phone, BarChart2, CornerDownRight
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
  const [showAddMaterielModal, setShowAddMaterielModal] = useState(false);

  // DONNÉES GLOBALES
  const [chantier, setChantier] = useState<any>({
    nom: '', client: '', adresse: '', responsable: '', date_debut: '', date_fin: '', type: 'Industriel', type_precision: '', 
    client_email: '', client_telephone: '',
    statut: 'en_cours',
    heures_budget: 0, heures_consommees: 0, 
    effectif_prevu: 0, 
    taux_reussite: 100,
    risques: [], epi: [],
    mesures_obligatoires: false
  });
  const [acqpaData, setAcqpaData] = useState<any>({
    couches: [{ type: '', lot: '', methode: '', dilution: '' }] 
  });
  
  // DONNÉES LISTES
  const [tasks, setTasks] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [employes, setEmployes] = useState<any[]>([]); // Pour le select responsable
  
  // --- NOUVELLES DONNÉES LOGISTIQUES ---
  const [materielPrevu, setMaterielPrevu] = useState<any[]>([]); 
  const [fournituresPrevu, setFournituresPrevu] = useState<any[]>([]);
  const [catalogueMateriel, setCatalogueMateriel] = useState<any[]>([]);
  
  // UI STATES
  const [uploading, setUploading] = useState(false);
  
  // TACHES & SOUS-TACHES
  const [newTaskLabel, setNewTaskLabel] = useState("");
  const [newTaskHours, setNewTaskHours] = useState(""); // Ajouté pour compatibilité
  const [activeParentTask, setActiveParentTask] = useState<string | null>(null); // Pour savoir où ajouter la sous-tâche
  const [newSubTask, setNewSubTask] = useState({ label: '', heures: 0, date: '' });

  // STATE FORMULAIRES
  const [newMat, setNewMat] = useState({ materiel_id: '', date_debut: '', date_fin: '', qte: 1 });
  const [newFourniture, setNewFourniture] = useState({ nom: '', qte_prevue: 0, unite: 'U', seuil: 5 });

  // --- CHARGEMENT ---
  useEffect(() => { fetchChantierData(); }, [id]);

  async function fetchChantierData() {
    if (!id) return;
    setLoading(true);

    // 0. Employés (Pour le select responsable)
    const { data: emp } = await supabase.from('employes').select('id, nom, prenom').order('nom');
    if (emp) setEmployes(emp);

    // 1. Chantier & ACQPA
    const { data: c } = await supabase.from('chantiers').select('*').eq('id', id).single();
    if (c) {
        setChantier({
            ...c,
            date_debut: c.date_debut || '',
            date_fin: c.date_fin || '',
            effectif_prevu: c.effectif_prevu || 0,
            taux_reussite: c.taux_reussite || 100,
            statut: c.statut || 'en_cours',
            risques: c.risques || [],
            epi: c.epi || [],
            mesures_acqpa: c.mesures_acqpa || {}
        });
        
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
        setNewMat(prev => ({...prev, date_debut: c.date_debut || '', date_fin: c.date_fin || ''}));
    }

    // 2. Tâches
    const { data: t } = await supabase.from('chantier_tasks').select('*').eq('chantier_id', id).order('created_at', { ascending: false });
    if (t) {
        const formattedTasks = t.map(task => ({
            ...task,
            subtasks: task.subtasks || [] 
        }));
        setTasks(formattedTasks);
    }

    // 3. Documents
    const { data: d } = await supabase.from('chantier_documents').select('*').eq('chantier_id', id).order('created_at', { ascending: false });
    if (d) setDocuments(d);

    // 4. Logistique
    const { data: m } = await supabase.from('chantier_materiel').select('*, materiel(*)').eq('chantier_id', id);
    if (m) setMaterielPrevu(m);

    const { data: f } = await supabase.from('chantier_fournitures').select('*').eq('chantier_id', id);
    if (f) setFournituresPrevu(f);

    const { data: cat } = await supabase.from('materiel').select('*').order('nom');
    if (cat) setCatalogueMateriel(cat);

    setLoading(false);
  }

  // --- LOGIQUE CALCUL AVANCEMENT (Tâches + Sous-Tâches) ---
  const updateProgress = async (currentTasks: any[]) => {
    let totalConsumed = 0;
    
    currentTasks.forEach(t => {
        if (t.subtasks && t.subtasks.length > 0) {
            t.subtasks.forEach((st: any) => {
                if (st.done) totalConsumed += (parseFloat(st.heures) || 0);
            });
        } else {
            if (t.done) totalConsumed += (t.objectif_heures || 0);
        }
    });

    await supabase.from('chantiers').update({ heures_consommees: totalConsumed }).eq('id', id);
    setChantier((prev: any) => ({ ...prev, heures_consommees: totalConsumed }));
  };

  // --- SAUVEGARDE ---
  const handleSave = async () => {
    const dateDebutSafe = chantier.date_debut === "" ? null : chantier.date_debut;
    const dateFinSafe = chantier.date_fin === "" ? null : chantier.date_fin;

    const toSave = {
        nom: chantier.nom,
        client: chantier.client,
        adresse: chantier.adresse,
        responsable: chantier.responsable, 
        client_email: chantier.client_email,
        client_telephone: chantier.client_telephone,
        type: chantier.type,
        type_precision: chantier.type === 'Autre' ? chantier.type_precision : null,
        date_debut: dateDebutSafe,
        date_fin: dateFinSafe,
        statut: chantier.statut,
        heures_budget: chantier.heures_budget,
        effectif_prevu: chantier.effectif_prevu,
        taux_reussite: chantier.taux_reussite,
        risques: chantier.risques,
        epi: chantier.epi,
        mesures_obligatoires: chantier.mesures_obligatoires,
        mesures_acqpa: acqpaData 
    };
    
    const { error } = await supabase.from('chantiers').update(toSave).eq('id', id);
    
    if (error) {
        alert("Erreur : " + error.message);
    } else {
        alert('✅ Chantier sauvegardé !');
        fetchChantierData();
    }
  };

  // --- LOGISTIQUE ---
  const handleAddMateriel = async () => {
      if (!newMat.materiel_id) return alert("Sélectionnez un matériel");
      const { error } = await supabase.from('chantier_materiel').insert([{
          chantier_id: id,
          materiel_id: newMat.materiel_id,
          date_debut: newMat.date_debut || null,
          date_fin: newMat.date_fin || null,
          qte_prise: newMat.qte,
          statut: 'prevu'
      }]);
      if (!error) { setShowAddMaterielModal(false); fetchChantierData(); }
  };

  const deleteMateriel = async (matId: string) => {
      if (confirm('Retirer ce matériel ?')) {
          await supabase.from('chantier_materiel').delete().eq('id', matId);
          fetchChantierData();
      }
  };

  // --- FOURNITURES (NOUVEAU) ---
  const addFourniture = async () => {
      if(!newFourniture.nom) return;
      await supabase.from('chantier_fournitures').insert([{
          chantier_id: id,
          nom: newFourniture.nom,
          qte_prevue: newFourniture.qte_prevue,
          qte_restante: newFourniture.qte_prevue, 
          unite: newFourniture.unite,
          seuil_alerte: newFourniture.seuil
      }]);
      setNewFourniture({ nom: '', qte_prevue: 0, unite: 'U', seuil: 5 });
      fetchChantierData();
  };

  const updateStock = async (fournitureId: string, delta: number, current: number) => {
      const newVal = Math.max(0, current + delta);
      setFournituresPrevu(prev => prev.map(f => f.id === fournitureId ? { ...f, qte_restante: newVal } : f));
      await supabase.from('chantier_fournitures').update({ qte_restante: newVal }).eq('id', fournitureId);
  };

  // --- TÂCHES & SOUS-TÂCHES ---
  const addTask = async () => {
    if (!newTaskLabel) return;
    const { data, error } = await supabase.from('chantier_tasks').insert([{ 
        chantier_id: id, label: newTaskLabel, objectif_heures: 0, done: false, subtasks: [] 
    }]).select();

    if (data) {
        setTasks([data[0], ...tasks]);
    }
    setNewTaskLabel("");
  };

  const toggleTask = async (task: any) => {
    const updatedList = tasks.map(t => t.id === task.id ? { ...t, done: !t.done } : t);
    setTasks(updatedList);
    await supabase.from('chantier_tasks').update({ done: !task.done }).eq('id', task.id);
    updateProgress(updatedList);
  };

  const addSubTask = async (parentId: string) => {
      if(!newSubTask.label) return;
      const parentTask = tasks.find(t => t.id === parentId);
      if(!parentTask) return;

      const updatedSubtasks = [...(parentTask.subtasks || []), {
          id: Date.now(),
          label: newSubTask.label,
          heures: parseFloat(newSubTask.heures.toString()) || 0,
          date: newSubTask.date,
          done: false
      }];

      const newTotalHours = updatedSubtasks.reduce((acc, curr) => acc + curr.heures, 0);

      await supabase.from('chantier_tasks').update({ 
          subtasks: updatedSubtasks,
          objectif_heures: newTotalHours
      }).eq('id', parentId);

      const newTasks = tasks.map(t => t.id === parentId ? { ...t, subtasks: updatedSubtasks, objectif_heures: newTotalHours } : t);
      setTasks(newTasks);
      updateProgress(newTasks);
      
      setNewSubTask({ label: '', heures: 0, date: '' });
      setActiveParentTask(null);
  };

  const toggleSubTask = async (parentId: string, subtaskId: number) => {
      const parentTask = tasks.find(t => t.id === parentId);
      if(!parentTask) return;

      const updatedSubtasks = parentTask.subtasks.map((st: any) => 
          st.id === subtaskId ? { ...st, done: !st.done } : st
      );

      await supabase.from('chantier_tasks').update({ subtasks: updatedSubtasks }).eq('id', parentId);
      
      const newTasks = tasks.map(t => t.id === parentId ? { ...t, subtasks: updatedSubtasks } : t);
      setTasks(newTasks);
      updateProgress(newTasks);
  };

  const deleteTask = async (taskId: string) => {
    if(confirm('Supprimer cette tâche et ses sous-tâches ?')) {
        await supabase.from('chantier_tasks').delete().eq('id', taskId);
        const updatedList = tasks.filter(t => t.id !== taskId);
        setTasks(updatedList);
        updateProgress(updatedList);
    }
  };

  // --- ACQPA ---
  const addCouche = () => setAcqpaData({ ...acqpaData, couches: [...(acqpaData.couches || []), { type: '', lot: '', methode: '', dilution: '' }] });
  const removeCouche = (index: number) => { const n = [...acqpaData.couches]; n.splice(index, 1); setAcqpaData({ ...acqpaData, couches: n }); };
  const updateCouche = (index: number, field: string, value: string) => { const n = [...acqpaData.couches]; n[index][field] = value; setAcqpaData({ ...acqpaData, couches: n }); };
  const toggleArrayItem = (field: 'risques' | 'epi', value: string) => {
    const current = chantier[field] || [];
    setChantier({ ...chantier, [field]: current.includes(value) ? current.filter((i: string) => i !== value) : [...current, value] });
  };
  
  // --- DOCS ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    const file = e.target.files[0];
    const filePath = `${id}/${Math.random()}.${file.name.split('.').pop()}`;
    await supabase.storage.from('documents').upload(filePath, file);
    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);
    await supabase.from('chantier_documents').insert([{ chantier_id: id, nom: file.name, url: publicUrl, type: file.type.startsWith('image/') ? 'image' : 'pdf' }]);
    setUploading(false);
    fetchChantierData(); 
  };
  const deleteDocument = async (docId: string) => { if(confirm('Supprimer ?')) { await supabase.from('chantier_documents').delete().eq('id', docId); fetchChantierData(); } };

  if (loading) return <div className="h-screen flex items-center justify-center font-['Fredoka'] text-[#34495e] font-bold">Chargement...</div>;
  const percent = chantier.heures_budget > 0 ? Math.round((chantier.heures_consommees / chantier.heures_budget) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#f0f3f4] font-['Fredoka'] pb-20 text-gray-800 ml-0 md:ml-0 transition-all">
      
      {/* HEADER */}
      <div className="bg-white/90 backdrop-blur-md sticky top-0 z-30 border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <Link href="/chantier" className="bg-white p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-black hover:scale-105 transition-all">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-xl font-black uppercase tracking-tight text-[#2d3436]">{chantier.nom}</h1>
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
        
        {/* TABS */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {[
                { id: 'infos', label: 'Infos & Tâches', icon: FileText, color: 'bg-[#34495e]' },
                { id: 'logistique', label: 'Matériel & Loc.', icon: Truck, color: 'bg-[#6c5ce7]' },
                { id: 'fournitures', label: 'Fournitures', icon: Package, color: 'bg-[#fdcb6e]' },
                { id: 'planning', label: 'Planning Gantt', icon: BarChart2, color: 'bg-[#00b894]' },
                { id: 'hse', label: 'Sécurité / EPI', icon: Shield, color: 'bg-[#e17055]' },
                { id: 'acqpa', label: 'Mesures ACQPA', icon: ClipboardCheck, color: 'bg-[#0984e3]' },
                { id: 'docs', label: 'Photos / Docs', icon: UploadCloud, color: 'bg-[#6c5ce7]' },
            ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-5 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all shadow-sm flex items-center gap-2 ${activeTab === tab.id ? `${tab.color} text-white shadow-lg scale-105` : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50'}`}>
                    <tab.icon size={16} /> {tab.label}
                </button>
            ))}
        </div>

        {/* 1. INFOS & TÂCHES */}
        {activeTab === 'infos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
                
                {/* IDENTIFICATION */}
                <div className="space-y-6">
                    <div className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-100 space-y-4">
                        <h3 className="font-black uppercase text-gray-700 mb-4">Identification Complète</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nom du Chantier</label>
                                <input value={chantier.nom || ''} onChange={e => setChantier({...chantier, nom: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none border border-transparent focus:border-[#00b894]" />
                            </div>
                            
                            {/* NOUVEAUX CHAMPS CLIENT */}
                            <div className="col-span-2 grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <div className="col-span-2"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nom Client</label><input value={chantier.client || ''} onChange={e => setChantier({...chantier, client: e.target.value})} className="w-full bg-white p-2 rounded-lg font-bold outline-none" /></div>
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1"><Phone size={10}/> Téléphone</label><input value={chantier.client_telephone || ''} onChange={e => setChantier({...chantier, client_telephone: e.target.value})} className="w-full bg-white p-2 rounded-lg font-bold outline-none" placeholder="06..." /></div>
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1"><Mail size={10}/> Email</label><input value={chantier.client_email || ''} onChange={e => setChantier({...chantier, client_email: e.target.value})} className="w-full bg-white p-2 rounded-lg font-bold outline-none" placeholder="@..." /></div>
                            </div>

                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Localisation</label>
                                <input value={chantier.adresse || ''} onChange={e => setChantier({...chantier, adresse: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none" />
                            </div>

                            {/* TYPE + PRÉCISION */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type</label>
                                <select value={chantier.type || 'Industriel'} onChange={e => setChantier({...chantier, type: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none cursor-pointer">
                                    {TYPE_CHANTIER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                    <option value="Autre">Autre (Préciser)</option>
                                </select>
                            </div>
                            {chantier.type === 'Autre' && (
                                <div>
                                    <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Précision</label>
                                    <input value={chantier.type_precision || ''} onChange={e => setChantier({...chantier, type_precision: e.target.value})} className="w-full bg-blue-50 text-blue-900 p-3 rounded-xl font-bold outline-none" placeholder="Ex: Nucléaire..." />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-100 space-y-4">
                        <h3 className="font-black uppercase text-gray-700 mb-4">Planning & Ressources</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date Début</label><input type="date" value={chantier.date_debut || ''} onChange={e => setChantier({...chantier, date_debut: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none" /></div>
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date Fin</label><input type="date" value={chantier.date_fin || ''} onChange={e => setChantier({...chantier, date_fin: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none" /></div>
                            
                            {/* RESPONSABLE CHANTIER */}
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Responsable Chantier</label>
                                <div className="flex items-center bg-gray-50 rounded-xl px-2 mt-1">
                                    <Users size={16} className="text-gray-400 mr-2"/>
                                    <select 
                                        className="w-full bg-transparent p-3 font-bold outline-none cursor-pointer"
                                        value={chantier.responsable || ''}
                                        onChange={(e) => setChantier({...chantier, responsable: e.target.value})}
                                    >
                                        <option value="">Sélectionner un responsable...</option>
                                        {employes.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.nom} {emp.prenom}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Budget Heures</label>
                                <div className="flex items-center bg-gray-50 rounded-xl px-2 mt-1">
                                    <Clock size={16} className="text-gray-400 mr-2"/>
                                    <input type="number" value={chantier.heures_budget || 0} onChange={e => setChantier({...chantier, heures_budget: parseFloat(e.target.value)})} className="w-full bg-transparent p-3 font-bold outline-none" />
                                </div>
                            </div>
                        </div>
                        {/* ACQPA TOGGLE */}
                        <div className="mt-2 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
                            <div><h4 className="font-black text-[#0984e3] uppercase">Mesures ACQPA</h4><p className="text-xs text-blue-400 font-bold">Activer le module qualité</p></div>
                            <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={chantier.mesures_obligatoires || false} onChange={e => setChantier({...chantier, mesures_obligatoires: e.target.checked})} className="sr-only peer" /><div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0984e3]"></div></label>
                        </div>
                    </div>
                </div>

                {/* TÂCHES & SOUS-TÂCHES */}
                <div className="bg-[#34495e] rounded-[30px] p-6 shadow-xl text-white relative overflow-hidden flex flex-col h-full min-h-[600px]">
                    <h3 className="font-black uppercase text-xl mb-4 flex items-center gap-2"><CheckCircle2 size={20}/> Tâches & Planning</h3>
                    
                    <div className="flex gap-2 mb-4">
                        <input placeholder="Nouvelle tâche principale..." value={newTaskLabel} onChange={(e) => setNewTaskLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} className="flex-1 bg-white/10 rounded-xl p-3 text-sm font-bold text-white placeholder-white/40 outline-none border border-white/5 focus:bg-white/20" />
                        <button onClick={addTask} className="bg-[#ff9f43] text-white p-3 rounded-xl hover:bg-[#e67e22] shadow-lg"><Plus size={20}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                        {tasks.map((t) => (
                            <div key={t.id} className="bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => toggleTask(t)}>
                                        {t.done ? <CheckCircle2 size={20} className="text-[#00b894] shrink-0" /> : <Circle size={20} className="text-[#ff9f43] shrink-0" />}
                                        <span className={`text-sm font-black uppercase ${t.done ? 'line-through opacity-40' : 'text-[#ff9f43]'}`}>{t.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs bg-white/10 px-2 py-1 rounded font-bold">{t.objectif_heures}h</span>
                                        <button onClick={() => setActiveParentTask(activeParentTask === t.id ? null : t.id)} className="text-white/50 hover:text-white"><Plus size={16}/></button>
                                        <button onClick={() => deleteTask(t.id)} className="text-white/20 hover:text-red-400"><Trash2 size={16}/></button>
                                    </div>
                                </div>

                                {/* LISTE SOUS-TÂCHES */}
                                <div className="space-y-1 pl-4 border-l-2 border-white/10">
                                    {t.subtasks && t.subtasks.map((st: any) => (
                                        <div key={st.id} className="flex items-center justify-between text-xs py-1">
                                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleSubTask(t.id, st.id)}>
                                                {st.done ? <CheckCircle2 size={12} className="text-green-400"/> : <Circle size={12} className="text-white/30"/>}
                                                <span className={st.done ? 'line-through text-white/30' : 'text-white/80'}>{st.label}</span>
                                            </div>
                                            <div className="flex gap-2 text-white/50">
                                                <span>{new Date(st.date).toLocaleDateString()}</span>
                                                <span className="font-bold text-white">{st.heures}h</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* AJOUT SOUS-TÂCHE */}
                                {activeParentTask === t.id && (
                                    <div className="mt-3 bg-black/20 p-2 rounded-lg flex flex-col gap-2">
                                        <input type="text" placeholder="Sous-tâche..." className="bg-transparent text-xs text-white placeholder-white/30 outline-none border-b border-white/10" value={newSubTask.label} onChange={e => setNewSubTask({...newSubTask, label: e.target.value})} />
                                        <div className="flex gap-2">
                                            <input type="date" className="bg-transparent text-xs text-white/70 outline-none w-24" value={newSubTask.date} onChange={e => setNewSubTask({...newSubTask, date: e.target.value})} />
                                            <input type="number" placeholder="H" className="bg-transparent text-xs text-white outline-none w-10 text-center" value={newSubTask.heures} onChange={e => setNewSubTask({...newSubTask, heures: parseFloat(e.target.value)})} />
                                            <button onClick={() => addSubTask(t.id)} className="bg-green-500 text-white px-2 py-1 rounded text-[10px] font-bold uppercase ml-auto">Ajouter</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* 2. FOURNITURES (NOUVEAU MODULE COMPLET) */}
        {activeTab === 'fournitures' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
                {/* Formulaire Ajout */}
                <div className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-100 h-fit">
                    <h3 className="font-black uppercase text-gray-700 mb-4 flex items-center gap-2"><Package className="text-yellow-500"/> Ajouter Fourniture</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Nom Produit</label>
                            <input value={newFourniture.nom} onChange={e => setNewFourniture({...newFourniture, nom: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold text-sm outline-none" placeholder="Ex: Diluant..." />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Quantité</label>
                                <input type="number" value={newFourniture.qte_prevue} onChange={e => setNewFourniture({...newFourniture, qte_prevue: parseFloat(e.target.value)})} className="w-full bg-gray-50 p-3 rounded-xl font-bold text-sm outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Unité</label>
                                <select value={newFourniture.unite} onChange={e => setNewFourniture({...newFourniture, unite: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold text-sm outline-none cursor-pointer">
                                    <option value="U">Unité</option>
                                    <option value="L">Litres</option>
                                    <option value="Kg">Kilos</option>
                                    <option value="M2">m²</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Seuil Alerte</label>
                            <input type="number" value={newFourniture.seuil} onChange={e => setNewFourniture({...newFourniture, seuil: parseFloat(e.target.value)})} className="w-full bg-gray-50 p-3 rounded-xl font-bold text-sm outline-none text-orange-500" />
                        </div>
                        <button onClick={addFourniture} className="w-full bg-yellow-400 hover:bg-yellow-500 text-white font-black uppercase py-3 rounded-xl shadow-lg transition-all">Ajouter au stock</button>
                    </div>
                </div>

                {/* Liste & Gestion */}
                <div className="lg:col-span-2 bg-white rounded-[30px] p-6 shadow-sm border border-gray-100">
                    <h3 className="font-black uppercase text-gray-700 mb-4">Suivi des Stocks</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 text-[10px] uppercase text-gray-400">
                                <tr>
                                    <th className="p-3 text-left rounded-l-xl">Produit</th>
                                    <th className="p-3 text-center">Initial</th>
                                    <th className="p-3 text-center">Restant</th>
                                    <th className="p-3 text-center">Conso.</th>
                                    <th className="p-3 text-center rounded-r-xl">Action</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm font-bold text-gray-700">
                                {fournituresPrevu.map(f => (
                                    <tr key={f.id} className="border-b border-gray-50">
                                        <td className="p-3">{f.nom}</td>
                                        <td className="p-3 text-center text-gray-400">{f.qte_prevue} {f.unite}</td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-1 rounded-lg ${f.qte_restante <= f.seuil_alerte ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-green-100 text-green-600'}`}>
                                                {f.qte_restante} {f.unite}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center text-blue-500">
                                            {(f.qte_prevue - f.qte_restante).toFixed(1)}
                                        </td>
                                        <td className="p-3 flex justify-center gap-2">
                                            <button onClick={() => updateStock(f.id, -1, f.qte_restante)} className="w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center font-black">-</button>
                                            <button onClick={() => updateStock(f.id, 1, f.qte_restante)} className="w-8 h-8 rounded-full bg-green-50 text-green-500 hover:bg-green-100 flex items-center justify-center font-black">+</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {/* 3. GANTT (NOUVEAU) */}
        {activeTab === 'planning' && (
            <div className="bg-white rounded-[30px] p-8 shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4">
                <h3 className="font-black uppercase text-gray-700 mb-6 flex items-center gap-2"><BarChart2 className="text-[#00b894]"/> Planning Gantt Prévisionnel</h3>
                <div className="space-y-6">
                    {tasks.map((t, idx) => (
                        <div key={t.id} className="relative">
                            {/* Tâche Principale */}
                            <div className="flex items-center gap-4 mb-2">
                                <div className="w-48 font-bold text-sm truncate" title={t.label}>{t.label}</div>
                                <div className="flex-1 bg-gray-100 h-8 rounded-full relative overflow-hidden">
                                    <div className="absolute top-0 left-0 h-full bg-[#00b894] opacity-80 flex items-center px-3 text-[10px] text-white font-bold" style={{ width: `${Math.min(100, Math.max(10, t.objectif_heures * 2))}%` }}>
                                        {t.objectif_heures}h
                                    </div>
                                </div>
                            </div>
                            
                            {/* Sous-tâches décalées */}
                            {t.subtasks && t.subtasks.map((st: any) => (
                                <div key={st.id} className="flex items-center gap-4 mb-1 pl-8 relative">
                                    <CornerDownRight size={14} className="text-gray-300 absolute left-2 top-2"/>
                                    <div className="w-40 text-xs text-gray-500 truncate">{st.label}</div>
                                    <div className="flex-1 bg-gray-50 h-6 rounded-full relative">
                                        <div className={`absolute top-0 h-full rounded-full flex items-center px-2 text-[9px] text-white font-bold ${st.done ? 'bg-blue-400' : 'bg-orange-300'}`} 
                                             style={{ 
                                                 left: `${(new Date(st.date).getDate() % 30) * 3}%`, // Simulation position temporelle
                                                 width: `${Math.max(5, st.heures * 2)}%` 
                                             }}>
                                            {new Date(st.date).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                    {tasks.length === 0 && <p className="text-center text-gray-400 italic">Aucune tâche planifiée.</p>}
                </div>
            </div>
        )}

        {/* 4. LOGISTIQUE */}
        {activeTab === 'logistique' && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-gray-700 uppercase flex items-center gap-2">
                        <Truck className="text-[#6c5ce7]"/> Matériel & Locations
                    </h3>
                    <button onClick={() => setShowAddMaterielModal(true)} className="bg-[#6c5ce7] text-white px-6 py-2.5 rounded-xl font-bold uppercase text-xs shadow-lg hover:bg-[#5b4bc4] transition-all flex items-center gap-2">
                        <Plus size={16}/> Ajouter / Réserver
                    </button>
                </div>

                <div className="bg-white rounded-[30px] p-1 shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase">Matériel</th>
                                <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase">Type</th>
                                <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase">Période</th>
                                <th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase">Quantité</th>
                                <th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {materielPrevu.length === 0 ? (
                                <tr><td colSpan={5} className="p-10 text-center text-gray-400 font-bold">Aucun matériel prévu.</td></tr>
                            ) : (
                                materielPrevu.map(m => (
                                    <tr key={m.id} className="hover:bg-gray-50">
                                        <td className="p-4"><span className="font-bold text-sm text-gray-800">{m.materiel?.nom || 'Inconnu'}</span></td>
                                        <td className="p-4"><span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${m.materiel?.type_stock === 'Interne' ? 'bg-gray-100 text-gray-500' : 'bg-purple-100 text-purple-600'}`}>{m.materiel?.type_stock || 'N/A'}</span></td>
                                        <td className="p-4 text-xs font-bold text-gray-600">{m.date_debut ? `${m.date_debut} -> ${m.date_fin}` : 'Dates non définies'}</td>
                                        <td className="p-4 text-center font-black text-gray-800">{m.qte_prise}</td>
                                        <td className="p-4 text-center"><button onClick={() => deleteMateriel(m.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* 5. HSE / SÉCURITÉ (Conservé) */}
        {activeTab === 'hse' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
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

        {/* 6. ACQPA (RESTAURÉ ET COMPLET) */}
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
                        
                        {/* Aperçu rapide des données clés */}
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

        {/* 7. DOCUMENTS (Conservé) */}
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

      </div>

      {/* ================= MODALE ACQPA (POPUP COMPLETE) ================= */}
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
                                {label: 'Sels Solubles (µg/cm²)', key: 'sels', placeholder: 'µg/cm²'}
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

      {/* MODALE AJOUT MATÉRIEL */}
      {showAddMaterielModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[30px] w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95">
                <h3 className="font-black text-xl text-[#2d3436] mb-4 flex items-center gap-2"><Truck className="text-[#6c5ce7]"/> Ajouter Matériel</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Matériel</label>
                        <select className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none cursor-pointer" onChange={e => setNewMat({...newMat, materiel_id: e.target.value})}>
                            <option value="">Sélectionner...</option>
                            {catalogueMateriel.map(m => <option key={m.id} value={m.id}>{m.nom} ({m.type_stock})</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] font-bold text-gray-400 uppercase">Début</label><input type="date" className="w-full bg-gray-50 p-3 rounded-xl font-bold" value={newMat.date_debut} onChange={e => setNewMat({...newMat, date_debut: e.target.value})} /></div>
                        <div><label className="text-[10px] font-bold text-gray-400 uppercase">Fin</label><input type="date" className="w-full bg-gray-50 p-3 rounded-xl font-bold" value={newMat.date_fin} onChange={e => setNewMat({...newMat, date_fin: e.target.value})} /></div>
                    </div>
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase">Quantité</label><input type="number" min="1" className="w-full bg-gray-50 p-3 rounded-xl font-bold" value={newMat.qte} onChange={e => setNewMat({...newMat, qte: parseInt(e.target.value)})} /></div>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button onClick={() => setShowAddMaterielModal(false)} className="px-4 py-2 text-gray-400 font-bold hover:bg-gray-50 rounded-xl">Annuler</button>
                    <button onClick={handleAddMateriel} className="bg-[#6c5ce7] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#5b4bc4]">Confirmer</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}
