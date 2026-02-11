"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, 
  Save, 
  FileText, 
  UploadCloud, 
  X, 
  Eye, 
  Trash2, 
  AlertTriangle, 
  Shield, 
  CheckSquare, 
  Thermometer, 
  Droplets, 
  Layers, 
  Ruler, 
  ClipboardCheck, 
  FolderOpen,
  Calendar, 
  MonitorPlay, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Plus, 
  Minus,
  Users, 
  Percent, 
  Truck, 
  Package, 
  Wrench, 
  Mail, 
  Phone, 
  BarChart2, 
  CornerDownRight,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

// --- CONSTANTES ET LISTES DÉROULANTES ---
const RISK_OPTIONS = [
    'Amiante', 
    'Plomb', 
    'Silice', 
    'ATEX', 
    'Hauteur',
    'Levage',
    'Confiné',
    'Électrique',
    'Chimique',
    'Coactivité'
];

const EPI_OPTIONS = [
    'Casque', 
    'Harnais', 
    'Chaussures de sécurité', 
    'Combinaison', 
    'Protections respiratoires', 
    'Gants', 
    'Protections auditives', 
    'Lunettes',
    'Masque ventilé',
    'Gilet haute visibilité'
];

const TYPE_CHANTIER_OPTIONS = [
    'Industriel', 
    'Parking', 
    'Ouvrage d\'art', 
    'Nucléaire',
    'Naval',
    'Bâtiment',
    'Autre'
];

export default function ChantierDetail() {
  const { id } = useParams();
  
  // --- ÉTATS D'INTERFACE ---
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('infos');
  const [showACQPAModal, setShowACQPAModal] = useState(false);
  const [showAddMaterielModal, setShowAddMaterielModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  // --- DONNÉES GLOBALES DU CHANTIER ---
  const [chantier, setChantier] = useState<any>({
    nom: '', 
    client: '', 
    adresse: '', 
    responsable: '', // ID de l'employé
    client_email: '', 
    client_telephone: '',
    date_debut: '', 
    date_fin: '', 
    type: 'Industriel', 
    type_precision: '', 
    statut: 'en_cours',
    heures_budget: 0, 
    heures_consommees: 0, 
    effectif_prevu: 0, 
    taux_reussite: 100, // Pondération par défaut
    risques: [], 
    epi: [],
    mesures_obligatoires: false
  });

  // --- DONNÉES SPÉCIFIQUES ---
  const [acqpaData, setAcqpaData] = useState<any>({
    couches: [{ type: '', lot: '', methode: '', dilution: '' }] 
  });
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [employes, setEmployes] = useState<any[]>([]); 
  
  // --- DONNÉES LOGISTIQUES & STOCKS ---
  const [materielPrevu, setMaterielPrevu] = useState<any[]>([]); 
  const [fournituresPrevu, setFournituresPrevu] = useState<any[]>([]);
  const [catalogueMateriel, setCatalogueMateriel] = useState<any[]>([]);
  
  // --- ÉTATS FORMULAIRES VOLATILES ---
  
  // Tâches
  const [newTaskLabel, setNewTaskLabel] = useState("");
  const [activeParentTask, setActiveParentTask] = useState<string | null>(null);
  const [newSubTask, setNewSubTask] = useState({ label: '', heures: 0, date: '' });

  // Matériel
  const [newMat, setNewMat] = useState({ materiel_id: '', date_debut: '', date_fin: '', qte: 1 });
  
  // Fournitures
  const [newFourniture, setNewFourniture] = useState({ nom: '', qte_prevue: 0, unite: 'U', seuil: 5 });


  // =================================================================================================
  //                                      INITIALISATION & FETCH
  // =================================================================================================

  useEffect(() => { 
      fetchChantierData(); 
  }, [id]);

  async function fetchChantierData() {
    if (!id) return;
    setLoading(true);

    try {
        // 1. Récupération des Employés (Pour le select responsable)
        const { data: emp, error: errEmp } = await supabase.from('employes').select('id, nom, prenom').order('nom');
        if (emp) setEmployes(emp);
        if (errEmp) console.error("Erreur fetch employés:", errEmp);

        // 2. Récupération des Données Chantier Principales
        const { data: c, error: errChantier } = await supabase.from('chantiers').select('*').eq('id', id).single();
        
        if (c) {
            // Mapping sécurisé des données pour éviter les crashs sur null
            setChantier({
                ...c,
                date_debut: c.date_debut || '',
                date_fin: c.date_fin || '',
                effectif_prevu: c.effectif_prevu || 0,
                taux_reussite: c.taux_reussite ?? 100,
                statut: c.statut || 'en_cours',
                risques: c.risques || [],
                epi: c.epi || [],
                mesures_acqpa: c.mesures_acqpa || {},
                type_precision: c.type_precision || '',
                client_email: c.client_email || '',
                client_telephone: c.client_telephone || ''
            });
            
            // Gestion de la rétro-compatibilité ACQPA
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

            // Pré-remplissage dates modal matériel
            setNewMat(prev => ({...prev, date_debut: c.date_debut || '', date_fin: c.date_fin || ''}));
        }

        // 3. Récupération des Tâches (et sous-tâches JSON)
        const { data: t } = await supabase.from('chantier_tasks').select('*').eq('chantier_id', id).order('created_at', { ascending: false });
        if (t) {
            // Normalisation : on s'assure que subtasks est bien un tableau
            const formattedTasks = t.map(task => ({
                ...task,
                subtasks: Array.isArray(task.subtasks) ? task.subtasks : [] 
            }));
            setTasks(formattedTasks);
        }

        // 4. Récupération des Documents
        const { data: d } = await supabase.from('chantier_documents').select('*').eq('chantier_id', id).order('created_at', { ascending: false });
        if (d) setDocuments(d);

        // 5. Récupération Logistique (Matériel Prévu)
        const { data: m } = await supabase.from('chantier_materiel').select('*, materiel(*)').eq('chantier_id', id);
        if (m) setMaterielPrevu(m);

        // 6. Récupération Fournitures (Stocks)
        const { data: f } = await supabase.from('chantier_fournitures').select('*').eq('chantier_id', id);
        if (f) setFournituresPrevu(f);

        // 7. Récupération Catalogue Matériel (Pour le select)
        const { data: cat } = await supabase.from('materiel').select('*').order('nom');
        if (cat) setCatalogueMateriel(cat);

    } catch (error) {
        console.error("Erreur chargement global:", error);
        alert("Erreur lors du chargement des données.");
    } finally {
        setLoading(false);
    }
  }

  // =================================================================================================
  //                                      LOGIQUE MÉTIER
  // =================================================================================================

  // --- CALCUL AVANCEMENT (Tâches + Sous-Tâches) ---
  const updateProgress = async (currentTasks: any[]) => {
    let totalConsumed = 0;
    
    currentTasks.forEach(t => {
        if (t.subtasks && t.subtasks.length > 0) {
            // Si sous-tâches, on somme celles qui sont faites
            t.subtasks.forEach((st: any) => {
                if (st.done) totalConsumed += (parseFloat(st.heures) || 0);
            });
        } else {
            // Sinon tâche simple
            if (t.done) totalConsumed += (t.objectif_heures || 0);
        }
    });

    // Mise à jour DB
    await supabase.from('chantiers').update({ heures_consommees: totalConsumed }).eq('id', id);
    
    // Mise à jour locale
    setChantier((prev: any) => ({ ...prev, heures_consommees: totalConsumed }));
  };

  // --- SAUVEGARDE GLOBALE ---
  const handleSave = async () => {
    const dateDebutSafe = chantier.date_debut === "" ? null : chantier.date_debut;
    const dateFinSafe = chantier.date_fin === "" ? null : chantier.date_fin;

    // Payload complet aligné avec la BDD
    const toSave = {
        nom: chantier.nom,
        client: chantier.client,
        adresse: chantier.adresse,
        responsable: chantier.responsable || null, // UUID ou null
        client_email: chantier.client_email,
        client_telephone: chantier.client_telephone,
        type: chantier.type,
        type_precision: chantier.type === 'Autre' ? chantier.type_precision : null,
        date_debut: dateDebutSafe,
        date_fin: dateFinSafe,
        statut: chantier.statut,
        heures_budget: chantier.heures_budget || 0,
        effectif_prevu: chantier.effectif_prevu || 0,
        taux_reussite: chantier.taux_reussite || 100,
        risques: chantier.risques,
        epi: chantier.epi,
        mesures_obligatoires: chantier.mesures_obligatoires,
        mesures_acqpa: acqpaData 
    };
    
    const { error } = await supabase.from('chantiers').update(toSave).eq('id', id);
    
    if (error) {
        console.error(error);
        alert("Erreur lors de la sauvegarde : " + error.message);
    } else {
        alert('✅ Chantier sauvegardé avec succès !');
        fetchChantierData();
    }
  };

  // --- GESTION FOURNITURES ---
  const addFourniture = async () => {
      if(!newFourniture.nom) return;
      
      const { error } = await supabase.from('chantier_fournitures').insert([{
          chantier_id: id,
          nom: newFourniture.nom,
          qte_prevue: newFourniture.qte_prevue || 0,
          qte_restante: newFourniture.qte_prevue || 0, // Initial = Prévu
          unite: newFourniture.unite,
          seuil_alerte: newFourniture.seuil || 0
      }]);

      if(error) {
          alert("Erreur ajout fourniture: " + error.message);
      } else {
          setNewFourniture({ nom: '', qte_prevue: 0, unite: 'U', seuil: 5 });
          fetchChantierData();
      }
  };

  const updateStock = async (fournitureId: string, delta: number, current: number) => {
      const newVal = Math.max(0, current + delta);
      
      // Optimistic UI update
      setFournituresPrevu(prev => prev.map(f => f.id === fournitureId ? { ...f, qte_restante: newVal } : f));
      
      // DB Update
      await supabase.from('chantier_fournitures').update({ qte_restante: newVal }).eq('id', fournitureId);
  };

  // --- GESTION MATÉRIEL ---
  const handleAddMateriel = async () => {
      if (!newMat.materiel_id) return alert("Sélectionnez un matériel");
      
      const { error } = await supabase.from('chantier_materiel').insert([{
          chantier_id: id,
          materiel_id: newMat.materiel_id,
          date_debut: newMat.date_debut || null,
          date_fin: newMat.date_fin || null,
          qte_prise: newMat.qte || 1,
          statut: 'prevu'
      }]);
      
      if (!error) { 
          setShowAddMaterielModal(false); 
          fetchChantierData(); 
      } else {
          alert("Erreur ajout matériel : " + error.message);
      }
  };

  const deleteMateriel = async (matId: string) => {
      if (confirm('Retirer ce matériel du chantier ?')) {
          await supabase.from('chantier_materiel').delete().eq('id', matId);
          fetchChantierData();
      }
  };

  // --- GESTION TÂCHES & SOUS-TÂCHES ---
  const addTask = async () => {
    if (!newTaskLabel) return;
    const { data, error } = await supabase.from('chantier_tasks').insert([{ 
        chantier_id: id, 
        label: newTaskLabel, 
        objectif_heures: 0, 
        done: false, 
        subtasks: [] 
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
          id: Date.now(), // ID temporaire unique
          label: newSubTask.label,
          heures: parseFloat(newSubTask.heures.toString()) || 0,
          date: newSubTask.date,
          done: false
      }];

      // Recalcul du total d'heures pour la tâche parente
      const newTotalHours = updatedSubtasks.reduce((acc, curr) => acc + (parseFloat(curr.heures) || 0), 0);

      // Sauvegarde
      await supabase.from('chantier_tasks').update({ 
          subtasks: updatedSubtasks,
          objectif_heures: newTotalHours
      }).eq('id', parentId);

      const newTasks = tasks.map(t => t.id === parentId ? { ...t, subtasks: updatedSubtasks, objectif_heures: newTotalHours } : t);
      setTasks(newTasks);
      updateProgress(newTasks);
      
      // Reset form
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

  // --- GESTION ACQPA ---
  const addCouche = () => setAcqpaData({ ...acqpaData, couches: [...(acqpaData.couches || []), { type: '', lot: '', methode: '', dilution: '' }] });
  const removeCouche = (index: number) => { const n = [...acqpaData.couches]; n.splice(index, 1); setAcqpaData({ ...acqpaData, couches: n }); };
  const updateCouche = (index: number, field: string, value: string) => { const n = [...acqpaData.couches]; n[index][field] = value; setAcqpaData({ ...acqpaData, couches: n }); };
  
  // --- GESTION CHECKBOXES ARRAY ---
  const toggleArrayItem = (field: 'risques' | 'epi', value: string) => {
    const current = chantier[field] || [];
    setChantier({ ...chantier, [field]: current.includes(value) ? current.filter((i: string) => i !== value) : [...current, value] });
  };
  
  // --- GESTION DOCUMENTS ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    const file = e.target.files[0];
    const filePath = `${id}/${Math.random()}.${file.name.split('.').pop()}`;
    
    const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
    if(uploadError) { alert("Erreur upload"); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);
    
    await supabase.from('chantier_documents').insert([{ 
        chantier_id: id, 
        nom: file.name, 
        url: publicUrl, 
        type: file.type.startsWith('image/') ? 'image' : 'pdf' 
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

  if (loading) return <div className="h-screen flex items-center justify-center font-['Fredoka'] text-[#34495e] font-bold"><div className="animate-spin mr-3"><Truck/></div> Chargement du chantier...</div>;
  
  const percent = chantier.heures_budget > 0 ? Math.round((chantier.heures_consommees / chantier.heures_budget) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#f0f3f4] font-['Fredoka'] pb-20 text-gray-800 ml-0 md:ml-0 transition-all">
      
      {/* HEADER FIXE */}
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
        
        {/* BARRE DE NAVIGATION (TABS) */}
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

        {/* ============================================================================================ */}
        {/* ONGLET 1 : INFOS & TÂCHES                                      */}
        {/* ============================================================================================ */}
        {activeTab === 'infos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
                
                {/* COLONNE GAUCHE : IDENTIFICATION */}
                <div className="space-y-6">
                    {/* Carte 1 : Identification */}
                    <div className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-100 space-y-4">
                        <h3 className="font-black uppercase text-gray-700 mb-4 flex items-center gap-2"><FileText size={20}/> Identification Complète</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nom du Chantier</label>
                                <input value={chantier.nom || ''} onChange={e => setChantier({...chantier, nom: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none border border-transparent focus:border-[#00b894] transition-colors" />
                            </div>
                            
                            {/* Bloc Client Enrichi */}
                            <div className="col-span-2 grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nom Client</label>
                                    <input value={chantier.client || ''} onChange={e => setChantier({...chantier, client: e.target.value})} className="w-full bg-white p-2 rounded-lg font-bold outline-none" placeholder="Nom de l'entreprise..." />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1"><Phone size={10}/> Téléphone</label>
                                    <input value={chantier.client_telephone || ''} onChange={e => setChantier({...chantier, client_telephone: e.target.value})} className="w-full bg-white p-2 rounded-lg font-bold outline-none" placeholder="06..." />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1"><Mail size={10}/> Email</label>
                                    <input value={chantier.client_email || ''} onChange={e => setChantier({...chantier, client_email: e.target.value})} className="w-full bg-white p-2 rounded-lg font-bold outline-none" placeholder="@..." />
                                </div>
                            </div>

                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Localisation</label>
                                <input value={chantier.adresse || ''} onChange={e => setChantier({...chantier, adresse: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none" />
                            </div>

                            {/* Type + Précision Conditionnelle */}
                            <div className={chantier.type === 'Autre' ? 'col-span-1' : 'col-span-2'}>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type</label>
                                <select value={chantier.type || 'Industriel'} onChange={e => setChantier({...chantier, type: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none cursor-pointer">
                                    {TYPE_CHANTIER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                            {chantier.type === 'Autre' && (
                                <div className="col-span-1">
                                    <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Précision</label>
                                    <input value={chantier.type_precision || ''} onChange={e => setChantier({...chantier, type_precision: e.target.value})} className="w-full bg-blue-50 text-blue-900 p-3 rounded-xl font-bold outline-none" placeholder="Ex: Nucléaire..." />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Carte 2 : Planning & Options */}
                    <div className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-100 space-y-4">
                        <h3 className="font-black uppercase text-gray-700 mb-4 flex items-center gap-2"><Calendar size={20}/> Planning & Ressources</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date Début</label>
                                <input type="date" value={chantier.date_debut || ''} onChange={e => setChantier({...chantier, date_debut: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date Fin</label>
                                <input type="date" value={chantier.date_fin || ''} onChange={e => setChantier({...chantier, date_fin: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none" />
                            </div>
                            
                            {/* Responsable Chantier Dynamique */}
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Responsable Chantier</label>
                                <div className="flex items-center bg-gray-50 rounded-xl px-2 mt-1 border border-transparent focus-within:border-blue-300 transition-colors">
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

                            {/* Statut avec Pondération */}
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Statut & Pondération</label>
                                <div className="flex gap-2 mt-1">
                                    <select 
                                        value={chantier.statut || 'en_cours'} 
                                        onChange={e => setChantier({...chantier, statut: e.target.value})} 
                                        className={`flex-1 bg-gray-50 p-3 rounded-xl font-bold outline-none cursor-pointer ${chantier.statut === 'potentiel' ? 'text-blue-600 bg-blue-50' : ''}`}
                                    >
                                        <option value="planifie">Planifié</option>
                                        <option value="en_cours">En Cours</option>
                                        <option value="potentiel">Probable (Offre)</option>
                                        <option value="termine">Terminé</option>
                                    </select>
                                    
                                    {/* Champ % qui apparaît seulement si Potentiel */}
                                    {chantier.statut === 'potentiel' && (
                                        <div className="w-24 bg-blue-50 border border-blue-200 rounded-xl flex items-center px-2 animate-in slide-in-from-left-2">
                                            <Percent size={14} className="text-blue-400 mr-1"/>
                                            <input 
                                                type="number" 
                                                min="0" max="100" 
                                                value={chantier.taux_reussite || 0} 
                                                onChange={e => setChantier({...chantier, taux_reussite: parseInt(e.target.value) || 0})}
                                                className="w-full bg-transparent text-center font-black text-blue-700 outline-none"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Budget Heures</label>
                                <div className="flex items-center bg-gray-50 rounded-xl px-2 mt-1">
                                    <Clock size={16} className="text-gray-400 mr-2"/>
                                    <input type="number" value={chantier.heures_budget || 0} onChange={e => setChantier({...chantier, heures_budget: parseFloat(e.target.value) || 0})} className="w-full bg-transparent p-3 font-bold outline-none" />
                                </div>
                            </div>
                        </div>

                        {/* Toggle ACQPA */}
                        <div className="mt-2 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
                            <div><h4 className="font-black text-[#0984e3] uppercase">Mesures ACQPA</h4><p className="text-xs text-blue-400 font-bold">Activer le module qualité</p></div>
                            <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={chantier.mesures_obligatoires || false} onChange={e => setChantier({...chantier, mesures_obligatoires: e.target.checked})} className="sr-only peer" /><div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0984e3]"></div></label>
                        </div>
                    </div>
                </div>

                {/* COLONNE DROITE : TÂCHES & SOUS-TÂCHES */}
                <div className="bg-[#34495e] rounded-[30px] p-6 shadow-xl text-white relative overflow-hidden flex flex-col h-full min-h-[600px]">
                    <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><CheckCircle2 size={200} /></div>
                    <h3 className="font-black uppercase text-xl mb-4 flex items-center gap-2 relative z-10"><CheckCircle2 size={20}/> Tâches & Planning</h3>
                    
                    {/* Ajout Tâche Principale */}
                    <div className="flex gap-2 mb-4 relative z-10">
                        <input 
                            placeholder="Nouvelle tâche principale..." 
                            value={newTaskLabel} 
                            onChange={(e) => setNewTaskLabel(e.target.value)} 
                            onKeyDown={(e) => e.key === 'Enter' && addTask()} 
                            className="flex-1 bg-white/10 rounded-xl p-3 text-sm font-bold text-white placeholder-white/40 outline-none border border-white/5 focus:bg-white/20 transition-colors" 
                        />
                        <button onClick={addTask} className="bg-[#ff9f43] text-white p-3 rounded-xl hover:bg-[#e67e22] shadow-lg transition-transform active:scale-95"><Plus size={20}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2 relative z-10">
                        {tasks.map((t) => (
                            <div key={t.id} className="bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                                {/* Header Tâche */}
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => toggleTask(t)}>
                                        {t.done ? <CheckCircle2 size={20} className="text-[#00b894] shrink-0" /> : <Circle size={20} className="text-[#ff9f43] shrink-0" />}
                                        <span className={`text-sm font-black uppercase ${t.done ? 'line-through opacity-40' : 'text-[#ff9f43]'}`}>{t.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs bg-white/10 px-2 py-1 rounded font-bold">{t.objectif_heures}h</span>
                                        <button onClick={() => setActiveParentTask(activeParentTask === t.id ? null : t.id)} className="text-white/50 hover:text-white transition-colors" title="Ajouter sous-tâche"><Plus size={16}/></button>
                                        <button onClick={() => deleteTask(t.id)} className="text-white/20 hover:text-red-400 transition-colors" title="Supprimer"><Trash2 size={16}/></button>
                                    </div>
                                </div>

                                {/* Liste Sous-Tâches */}
                                <div className="space-y-1 pl-4 border-l-2 border-white/10">
                                    {t.subtasks && t.subtasks.map((st: any) => (
                                        <div key={st.id} className="flex items-center justify-between text-xs py-1 group/sub">
                                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleSubTask(t.id, st.id)}>
                                                {st.done ? <CheckCircle2 size={12} className="text-green-400"/> : <Circle size={12} className="text-white/30"/>}
                                                <span className={st.done ? 'line-through text-white/30' : 'text-white/80'}>{st.label}</span>
                                            </div>
                                            <div className="flex gap-2 text-white/50">
                                                <span>{st.date ? new Date(st.date).toLocaleDateString() : ''}</span>
                                                <span className="font-bold text-white">{st.heures}h</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Formulaire Ajout Sous-Tâche */}
                                {activeParentTask === t.id && (
                                    <div className="mt-3 bg-black/20 p-3 rounded-lg flex flex-col gap-2 animate-in fade-in">
                                        <input type="text" placeholder="Nom de la sous-tâche..." className="bg-transparent text-xs text-white placeholder-white/30 outline-none border-b border-white/10 p-1" value={newSubTask.label} onChange={e => setNewSubTask({...newSubTask, label: e.target.value})} />
                                        <div className="flex gap-2">
                                            <input type="date" className="bg-transparent text-xs text-white/70 outline-none w-24 border-b border-white/10 p-1" value={newSubTask.date} onChange={e => setNewSubTask({...newSubTask, date: e.target.value})} />
                                            <input type="number" placeholder="Heures" className="bg-transparent text-xs text-white outline-none w-16 text-center border-b border-white/10 p-1" value={newSubTask.heures || ''} onChange={e => setNewSubTask({...newSubTask, heures: parseFloat(e.target.value) || 0})} />
                                            <button onClick={() => addSubTask(t.id)} className="bg-green-500 text-white px-3 py-1 rounded text-[10px] font-bold uppercase ml-auto hover:bg-green-600 transition-colors">Ajouter</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        {tasks.length === 0 && (
                            <div className="text-center py-10 opacity-30">
                                <CheckCircle2 size={40} className="mx-auto mb-2"/>
                                <p className="text-sm font-bold">Aucune tâche planifiée</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* ============================================================================================ */}
        {/* ONGLET 2 : LOGISTIQUE & MATÉRIEL                               */}
        {/* ============================================================================================ */}
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
                                <tr><td colSpan={5} className="p-10 text-center text-gray-400 font-bold">Aucun matériel prévu sur ce chantier.</td></tr>
                            ) : (
                                materielPrevu.map(m => (
                                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <span className="font-bold text-sm text-gray-800">{m.materiel?.nom || 'Inconnu'}</span>
                                            <div className="text-[10px] text-gray-400">{m.materiel?.categorie}</div>
                                        </td>
                                        <td className="p-4"><span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${m.materiel?.type_stock === 'Interne' ? 'bg-gray-100 text-gray-500' : 'bg-purple-100 text-purple-600'}`}>{m.materiel?.type_stock || 'N/A'}</span></td>
                                        <td className="p-4 text-xs font-bold text-gray-600">{m.date_debut ? `${new Date(m.date_debut).toLocaleDateString()} ➔ ${new Date(m.date_fin).toLocaleDateString()}` : 'Dates non définies'}</td>
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

        {/* ============================================================================================ */}
        {/* ONGLET 3 : FOURNITURES (NOUVEAU)                               */}
        {/* ============================================================================================ */}
        {activeTab === 'fournitures' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
                
                {/* Formulaire Ajout Fourniture */}
                <div className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-100 h-fit">
                    <h3 className="font-black uppercase text-gray-700 mb-4 flex items-center gap-2"><Package className="text-yellow-500"/> Ajouter Fourniture</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Nom Produit</label>
                            <input value={newFourniture.nom} onChange={e => setNewFourniture({...newFourniture, nom: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold text-sm outline-none focus:bg-white border border-transparent focus:border-yellow-400 transition-colors" placeholder="Ex: Diluant, Scotch..." />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Quantité</label>
                                <input type="number" value={newFourniture.qte_prevue || ''} onChange={e => setNewFourniture({...newFourniture, qte_prevue: parseFloat(e.target.value) || 0})} className="w-full bg-gray-50 p-3 rounded-xl font-bold text-sm outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Unité</label>
                                <select value={newFourniture.unite} onChange={e => setNewFourniture({...newFourniture, unite: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold text-sm outline-none cursor-pointer">
                                    <option value="U">Unité</option>
                                    <option value="L">Litres</option>
                                    <option value="Kg">Kilos</option>
                                    <option value="M2">m²</option>
                                    <option value="Rlx">Rouleaux</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Seuil Alerte</label>
                            <input type="number" value={newFourniture.seuil || ''} onChange={e => setNewFourniture({...newFourniture, seuil: parseFloat(e.target.value) || 0})} className="w-full bg-gray-50 p-3 rounded-xl font-bold text-sm outline-none text-orange-500" />
                        </div>
                        <button onClick={addFourniture} className="w-full bg-yellow-400 hover:bg-yellow-500 text-white font-black uppercase py-3 rounded-xl shadow-lg transition-all active:scale-95">Ajouter au stock</button>
                    </div>
                </div>

                {/* Liste & Gestion Stock */}
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
                                {fournituresPrevu.length === 0 && (
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic">Aucune fourniture listée.</td></tr>
                                )}
                                {fournituresPrevu.map(f => (
                                    <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                        <td className="p-3">
                                            {f.nom}
                                            {f.qte_restante <= f.seuil_alerte && (
                                                <div className="text-[9px] text-red-500 font-bold flex items-center gap-1 mt-1"><AlertCircle size={10}/> Stock bas !</div>
                                            )}
                                        </td>
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
                                            <button onClick={() => updateStock(f.id, -1, f.qte_restante)} className="w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center font-black transition-colors" title="Consommer 1">-</button>
                                            <button onClick={() => updateStock(f.id, 1, f.qte_restante)} className="w-8 h-8 rounded-full bg-green-50 text-green-500 hover:bg-green-100 flex items-center justify-center font-black transition-colors" title="Ajouter 1">+</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {/* ============================================================================================ */}
        {/* ONGLET 4 : PLANNING GANTT (NOUVEAU)                            */}
        {/* ============================================================================================ */}
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
                                <div key={st.id} className="flex items-center gap-4 mb-1 pl-8 relative group">
                                    <CornerDownRight size={14} className="text-gray-300 absolute left-2 top-2"/>
                                    <div className="w-40 text-xs text-gray-500 truncate">{st.label}</div>
                                    <div className="flex-1 bg-gray-50 h-6 rounded-full relative">
                                        <div className={`absolute top-0 h-full rounded-full flex items-center px-2 text-[9px] text-white font-bold ${st.done ? 'bg-blue-400' : 'bg-orange-300'}`} 
                                             style={{ 
                                                 left: `${(new Date(st.date || new Date()).getDate() % 30) * 3}%`, // Simulation position temporelle
                                                 width: `${Math.max(5, st.heures * 2)}%` 
                                             }}>
                                            {st.date ? new Date(st.date).toLocaleDateString() : 'N/A'}
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

        {/* ============================================================================================ */}
        {/* ONGLET 5 : HSE / SÉCURITÉ                                      */}
        {/* ============================================================================================ */}
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

        {/* ============================================================================================ */}
        {/* ONGLET 6 : ACQPA                                               */}
        {/* ============================================================================================ */}
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

        {/* ============================================================================================ */}
        {/* ONGLET 7 : DOCUMENTS                                           */}
        {/* ============================================================================================ */}
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

      {/* ============================================================================================ */}
      {/* MODALE ACQPA (COMPLÈTE)                                        */}
      {/* ============================================================================================ */}
      {showACQPAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-[30px] w-full max-w-5xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                <div className="bg-[#0984e3] p-6 text-white flex justify-between items-center shrink-0">
                    <div><h2 className="text-2xl font-black uppercase tracking-tight">Formulaire ACQPA</h2><p className="text-blue-100 font-bold text-xs uppercase tracking-widest">Contrôle Qualité Peinture Industrielle</p></div>
                    <button onClick={() => setShowACQPAModal(false)} className="bg-white/20 p-2 rounded-full hover:bg-white/40 transition-colors"><X size={24} /></button>
                </div>
                <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                    {/* SECTION 1 : Ambiance */}
                    <section>
                        <h3 className="flex items-center gap-2 font-black text-gray-800 uppercase text-lg mb-4 border-b border-gray-100 pb-2"><Thermometer className="text-[#0984e3]"/> Ambiance</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {[{l:'Temp. Air (°C)',k:'temp_air'},{l:'Temp. Support (°C)',k:'temp_support'},{l:'Hygrométrie (%)',k:'hygrometrie'},{l:'Point Rosée (°C)',k:'point_rosee'},{l:'Delta T',k:'delta_t'}].map(f=><div key={f.k}><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">{f.l}</label><input type="number" className="w-full bg-gray-50 border border-gray-100 p-2 rounded-xl font-bold text-gray-800 text-center outline-none focus:border-[#0984e3] focus:bg-white transition-colors" value={acqpaData[f.k]||''} onChange={e=>setAcqpaData({...acqpaData,[f.k]:e.target.value})}/></div>)}
                        </div>
                    </section>
                    {/* SECTION 2 : Support */}
                    <section>
                        <h3 className="flex items-center gap-2 font-black text-gray-800 uppercase text-lg mb-4 border-b border-gray-100 pb-2"><Layers className="text-[#0984e3]"/> Préparation Support</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[{l:'Degré de Soin',k:'degre_soin'},{l:'Propreté',k:'proprete'},{l:'Rugosité (µm)',k:'rugosite'},{l:'Sels Solubles',k:'sels'}].map(f=><div key={f.k}><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">{f.l}</label><input type="text" className="w-full bg-gray-50 border border-gray-100 p-2 rounded-xl font-bold text-gray-800 outline-none focus:border-[#0984e3] focus:bg-white transition-colors" value={acqpaData[f.k]||''} onChange={e=>setAcqpaData({...acqpaData,[f.k]:e.target.value})}/></div>)}
                        </div>
                    </section>
                    {/* SECTION 3 : Couches */}
                    <section>
                        <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2"><h3 className="flex items-center gap-2 font-black text-gray-800 uppercase text-lg"><Droplets className="text-[#0984e3]"/> Produits & Couches</h3><button onClick={addCouche} className="flex items-center gap-1 bg-blue-50 text-[#0984e3] px-3 py-1 rounded-lg text-xs font-black uppercase hover:bg-blue-100 transition-colors"><Plus size={14}/> Ajouter</button></div>
                        <div className="space-y-4">
                            {acqpaData.couches && acqpaData.couches.map((c:any,i:number)=>(<div key={i} className="bg-gray-50 p-4 rounded-xl relative group"><div className="absolute -top-3 left-3 bg-[#0984e3] text-white text-[10px] font-bold px-2 py-0.5 rounded">Couche {i+1}</div><button onClick={()=>removeCouche(i)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button><div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2"><div><label className="text-[9px] font-bold text-gray-400 uppercase">Type</label><input className="w-full bg-white border border-gray-200 p-2 rounded-lg font-bold" value={c.type} onChange={e=>updateCouche(i,'type',e.target.value)}/></div><div><label className="text-[9px] font-bold text-gray-400 uppercase">Lot</label><input className="w-full bg-white border border-gray-200 p-2 rounded-lg font-bold" value={c.lot} onChange={e=>updateCouche(i,'lot',e.target.value)}/></div><div><label className="text-[9px] font-bold text-gray-400 uppercase">Méthode</label><input className="w-full bg-white border border-gray-200 p-2 rounded-lg font-bold" value={c.methode} onChange={e=>updateCouche(i,'methode',e.target.value)}/></div><div><label className="text-[9px] font-bold text-gray-400 uppercase">Dilution</label><input type="number" className="w-full bg-white border border-gray-200 p-2 rounded-lg font-bold" value={c.dilution} onChange={e=>updateCouche(i,'dilution',e.target.value)}/></div></div></div>))}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                            <div className="col-span-2 md:col-span-1"><label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Date Appli</label><input type="date" className="w-full bg-gray-50 p-2 rounded-xl font-bold text-gray-800 outline-none border border-gray-100 focus:border-[#0984e3]" value={acqpaData.app_date || ''} onChange={e => setAcqpaData({...acqpaData, app_date: e.target.value})} /></div>
                             <div className="col-span-2 md:col-span-1"><label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Applicateur</label><input className="w-full bg-gray-50 p-2 rounded-xl font-bold text-gray-800 outline-none border border-gray-100 focus:border-[#0984e3]" value={acqpaData.app_nom || ''} onChange={e => setAcqpaData({...acqpaData, app_nom: e.target.value})} /></div>
                             <div><label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">DFT Théorique (µm)</label><input type="number" className="w-full bg-gray-50 p-2 rounded-xl font-bold text-center text-gray-800 outline-none border border-gray-100 focus:border-[#0984e3]" value={acqpaData.dft_theo || ''} onChange={e => setAcqpaData({...acqpaData, dft_theo: e.target.value})} /></div>
                        </div>
                    </section>
                    {/* SECTION 4 : Contrôles */}
                    <section>
                        <h3 className="flex items-center gap-2 font-black text-gray-800 uppercase text-lg mb-4 border-b border-gray-100 pb-2"><Ruler className="text-[#0984e3]"/> Contrôles Finaux</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            {[{l:'Ep. Humide',k:'ep_humide'},{l:'Ep. Sèche',k:'dft_mesure'},{l:'Adhérence',k:'adherence'},{l:'Défauts',k:'defauts',t:'text'},{l:'Retouches',k:'retouches',t:'text'}].map(f=><div key={f.k}><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">{f.l}</label><input type={f.t||'number'} className="w-full bg-gray-50 border border-gray-100 p-2 rounded-xl font-bold text-gray-800 text-center outline-none focus:border-[#0984e3] focus:bg-white transition-colors" value={acqpaData[f.k]||''} onChange={e=>setAcqpaData({...acqpaData,[f.k]:e.target.value})}/></div>)}
                        </div>
                    </section>
                </div>
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-4"><button onClick={()=>{setShowACQPAModal(false);handleSave()}} className="bg-[#0984e3] text-white px-8 py-3 rounded-xl font-black uppercase shadow-lg hover:scale-105 transition-transform">Enregistrer & Fermer</button></div>
            </div>
        </div>
      )}

      {/* ============================================================================================ */}
      {/* MODALE AJOUT MATÉRIEL                                          */}
      {/* ============================================================================================ */}
      {showAddMaterielModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[30px] w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95">
                <h3 className="font-black text-xl text-[#2d3436] mb-4 flex items-center gap-2"><Truck className="text-[#6c5ce7]"/> Ajouter Matériel</h3>
                <div className="space-y-4">
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase">Matériel</label><select className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none cursor-pointer" onChange={e => setNewMat({...newMat, materiel_id: e.target.value})}><option value="">Sélectionner...</option>{catalogueMateriel.map(m => <option key={m.id} value={m.id}>{m.nom} ({m.type_stock})</option>)}</select></div>
                    <div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-bold text-gray-400 uppercase">Début</label><input type="date" className="w-full bg-gray-50 p-3 rounded-xl font-bold" value={newMat.date_debut} onChange={e => setNewMat({...newMat, date_debut: e.target.value})} /></div><div><label className="text-[10px] font-bold text-gray-400 uppercase">Fin</label><input type="date" className="w-full bg-gray-50 p-3 rounded-xl font-bold" value={newMat.date_fin} onChange={e => setNewMat({...newMat, date_fin: e.target.value})} /></div></div>
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase">Quantité</label><input type="number" min="1" className="w-full bg-gray-50 p-3 rounded-xl font-bold" value={newMat.qte} onChange={e => setNewMat({...newMat, qte: parseInt(e.target.value)})} /></div>
                </div>
                <div className="mt-6 flex justify-end gap-2"><button onClick={() => setShowAddMaterielModal(false)} className="px-4 py-2 text-gray-400 font-bold hover:bg-gray-50 rounded-xl">Annuler</button><button onClick={handleAddMateriel} className="bg-[#6c5ce7] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#5b4bc4]">Confirmer</button></div>
            </div>
        </div>
      )}

    </div>
  );
}
