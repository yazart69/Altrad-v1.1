"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, Save, FileText, UploadCloud, X, Eye, Trash2, AlertTriangle, Shield, CheckSquare, 
  Thermometer, Droplets, Layers, Ruler, ClipboardCheck, FolderOpen, Calendar, MonitorPlay, 
  CheckCircle2, Circle, Clock, Plus, Minus, Users, Percent, Truck, Package, Wrench, Mail, 
  Phone, BarChart2, CornerDownRight, AlertCircle, UserPlus, Palette, Box, AlertOctagon, 
  Search, TrendingUp, TrendingDown, UserCheck, Scale, Printer, PieChart, Target, 
  Euro, HardHat, Briefcase, Zap, MapPin, Calculator, Wallet
} from 'lucide-react';
import Link from 'next/link';

// --- CONSTANTES ---
const RISK_OPTIONS = ['Amiante', 'Plomb', 'Silice', 'ATEX', 'Hauteur', 'Levage', 'Confiné', 'Électrique', 'Chimique', 'Coactivité'];
const EPI_OPTIONS = ['Casque', 'Harnais', 'Chaussures de sécurité', 'Combinaison', 'Protections respiratoires', 'Gants', 'Protections auditives', 'Lunettes', 'Masque ventilé', 'Gilet haute visibilité'];

export default function ChantierDetail() {
  const params = useParams();
  const id = params?.id as string;
  
  // --- ÉTATS ---
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('suivi'); 
  const [showACQPAModal, setShowACQPAModal] = useState(false);
  const [showAddMaterielModal, setShowAddMaterielModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  // --- DATA ---
  const [chantier, setChantier] = useState<any>({
    nom: '', client: '', adresse: '', responsable: '', client_email: '', client_telephone: '',
    date_debut: '', date_fin: '', type: 'Industriel', type_precision: '', statut: 'en_cours',
    heures_budget: 0, heures_consommees: 0, effectif_prevu: 0, taux_reussite: 100, 
    budget_euro: 0, taux_horaire_moyen: 45, // Nouveaux champs financiers
    risques: [], epi: [], mesures_obligatoires: false
  });
  
  const [acqpaData, setAcqpaData] = useState<any>({ couches: [{ type: '', lot: '', methode: '', dilution: '' }] });
  const [tasks, setTasks] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [employes, setEmployes] = useState<any[]>([]); 
  const [materielPrevu, setMaterielPrevu] = useState<any[]>([]); 
  const [fournituresPrevu, setFournituresPrevu] = useState<any[]>([]);
  const [catalogueMateriel, setCatalogueMateriel] = useState<any[]>([]);
  const [stockFournitures, setStockFournitures] = useState<any[]>([]); 
  
  // --- FORMULAIRES ---
  const [newTaskLabel, setNewTaskLabel] = useState("");
  const [activeParentTask, setActiveParentTask] = useState<string | null>(null);
  const [newSubTask, setNewSubTask] = useState({ label: '', heures: 0, date: '', effectif: 1 });
  const [newMat, setNewMat] = useState({ materiel_id: '', date_debut: '', date_fin: '', qte: 1 });
  const [newFourniture, setNewFourniture] = useState({ fourniture_ref_id: '', qte_prevue: 0 });
  const [supplySearch, setSupplySearch] = useState(""); 
  const [showSupplyList, setShowSupplyList] = useState(false); 
  const searchWrapperRef = useRef<HTMLDivElement>(null); 

  useEffect(() => {
    function handleClickOutside(event: any) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target)) setShowSupplyList(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []); 

  // --- FETCH DATA ---
  const fetchChantierData = async () => {
    if (!id) return;
    setLoading(true);
    try {
        const results = await Promise.allSettled([
            supabase.from('employes').select('id, nom, prenom').order('nom'),
            supabase.from('chantiers').select('*').eq('id', id).single(),
            supabase.from('chantier_tasks').select('*, responsable:employes(id, nom, prenom)').eq('chantier_id', id).order('created_at', { ascending: false }),
            supabase.from('chantier_documents').select('*').eq('chantier_id', id).order('created_at', { ascending: false }),
            supabase.from('chantier_materiel').select('*, materiel(*)').eq('chantier_id', id),
            supabase.from('chantier_fournitures').select(`*, fournitures_stock ( id, nom, ral, conditionnement, qte_stock, unite )`).eq('chantier_id', id),
            supabase.from('materiel').select('*').order('nom'),
            supabase.from('fournitures_stock').select('*').order('nom')
        ]);

        if (results[0].status === 'fulfilled' && results[0].value.data) setEmployes(results[0].value.data);
        if (results[1].status === 'fulfilled' && results[1].value.data) {
            const c = results[1].value.data;
            setChantier({
                ...c,
                date_debut: c.date_debut || '', date_fin: c.date_fin || '',
                effectif_prevu: c.effectif_prevu || 0, taux_reussite: c.taux_reussite ?? 100,
                budget_euro: c.budget_euro || 0, taux_horaire_moyen: c.taux_horaire_moyen || 45,
                statut: c.statut || 'en_cours', risques: c.risques || [], epi: c.epi || [],
                mesures_acqpa: c.mesures_acqpa || {}, type_precision: c.type_precision || '',
                client_email: c.client_email || '', client_telephone: c.client_telephone || ''
            });
            const currentAcqpa = c.mesures_acqpa || {};
            if (!currentAcqpa.couches) currentAcqpa.couches = [{ type: '', lot: '', methode: '', dilution: '' }];
            setAcqpaData(currentAcqpa);
            setNewMat(prev => ({...prev, date_debut: c.date_debut || '', date_fin: c.date_fin || ''}));
        }
        if (results[2].status === 'fulfilled' && results[2].value.data) {
            setTasks(results[2].value.data.map((task: any) => ({ ...task, subtasks: Array.isArray(task.subtasks) ? task.subtasks : [] })));
        }
        if (results[3].status === 'fulfilled' && results[3].value.data) setDocuments(results[3].value.data);
        if (results[4].status === 'fulfilled' && results[4].value.data) setMaterielPrevu(results[4].value.data);
        if (results[5].status === 'fulfilled' && results[5].value.data) setFournituresPrevu(results[5].value.data);
        if (results[6].status === 'fulfilled' && results[6].value.data) setCatalogueMateriel(results[6].value.data);
        if (results[7].status === 'fulfilled' && results[7].value.data) setStockFournitures(results[7].value.data);
    } catch (error: any) {
        console.error("Erreur chargement:", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { fetchChantierData(); }, [id]);
  // --- ACTIONS & CALCULS ---

  // Calcul du coût réel MO basé sur les heures et le taux
  const calculateCoutReelMO = (heures: number) => {
      return heures * (chantier.taux_horaire_moyen || 45);
  };

  const updateChantierTotalHours = async (currentTasks: any[]) => {
    const totalRealConsumed = currentTasks.filter(t => t.done).reduce((sum, t) => sum + (parseFloat(t.heures_reelles) || t.objectif_heures || 0), 0);
    await supabase.from('chantiers').update({ heures_consommees: totalRealConsumed }).eq('id', id);
    setChantier((prev: any) => ({ ...prev, heures_consommees: totalRealConsumed }));
  };

  const handleSave = async () => {
    const toSave = { 
        ...chantier, 
        mesures_acqpa: acqpaData, 
        responsable: chantier.responsable || null,
        // On s'assure que les champs financiers sont sauvegardés
        budget_euro: chantier.budget_euro,
        taux_horaire_moyen: chantier.taux_horaire_moyen
    };
    const { error } = await supabase.from('chantiers').update(toSave).eq('id', id);
    if (error) alert("Erreur : " + error.message);
    else { alert('✅ Sauvegardé !'); fetchChantierData(); }
  };

  // --- CORRECTION ERREUR 400 : On n'envoie QUE les champs valides ---
  const addFourniture = async () => {
      if(!newFourniture.fourniture_ref_id) return alert("Sélectionnez un produit");
      
      // On prépare uniquement les données attendues par la table de liaison
      const payload = {
          chantier_id: id,
          fourniture_ref_id: newFourniture.fourniture_ref_id,
          qte_prevue: newFourniture.qte_prevue || 0,
          qte_consommee: 0
          // On NE MET PAS 'nom', 'unite' ici car ils sont dans la table stock jointe
      };

      const { error } = await supabase.from('chantier_fournitures').insert([payload]);

      if(error) {
          console.error("Erreur ajout fourniture:", error);
          alert("Erreur technique: " + error.message);
      } else {
          setNewFourniture({ fourniture_ref_id: '', qte_prevue: 0 });
          setSupplySearch("");
          fetchChantierData(); // On recharge pour avoir la jointure avec le nom
      }
  };

  const updateConsommation = async (fId: string, val: number) => { 
      const safeVal = Math.max(0, val);
      // Mise à jour optimiste
      setFournituresPrevu(prev => prev.map(f => f.id === fId ? { ...f, qte_consommee: safeVal } : f)); 
      // Envoi BDD
      await supabase.from('chantier_fournitures').update({ qte_consommee: safeVal }).eq('id', fId); 
  };

  const deleteFourniture = async (fId: string) => { 
      if(confirm("Supprimer ?")) { 
          await supabase.from('chantier_fournitures').delete().eq('id', fId); 
          fetchChantierData(); 
      } 
  };

  // --- Gestion Tâches ---
  const updateTaskField = async (taskId: string, field: string, value: any) => {
    const { error } = await supabase.from('chantier_tasks').update({ [field]: value }).eq('id', taskId);
    if (!error) {
        const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, [field]: value } : t);
        setTasks(updatedTasks);
        if (field === 'heures_reelles' || field === 'done') updateChantierTotalHours(updatedTasks);
    }
  };
  const toggleTask = async (task: any) => {
    const newStatus = !task.done;
    const realHoursValue = newStatus ? (task.heures_reelles || task.objectif_heures) : 0;
    const updatedSubtasks = (task.subtasks || []).map((st: any) => ({ ...st, done: newStatus }));
    const { error } = await supabase.from('chantier_tasks').update({ done: newStatus, heures_reelles: realHoursValue, subtasks: updatedSubtasks }).eq('id', task.id);
    if (!error) { const newTasks = tasks.map(t => t.id === task.id ? { ...t, done: newStatus, heures_reelles: realHoursValue, subtasks: updatedSubtasks } : t); setTasks(newTasks); updateChantierTotalHours(newTasks); }
  };
  const addSubTask = async (parentId: string) => {
      if(!newSubTask.label) return;
      const parentTask = tasks.find(t => t.id === parentId);
      const updatedSubtasks = [...(parentTask.subtasks || []), { id: Date.now(), label: newSubTask.label, heures: parseFloat(newSubTask.heures.toString()) || 0, effectif: parseInt(newSubTask.effectif.toString()) || 1, date: newSubTask.date, done: false }];
      const newTotalHours = updatedSubtasks.reduce((acc, curr) => acc + (parseFloat(curr.heures) || 0), 0);
      await supabase.from('chantier_tasks').update({ subtasks: updatedSubtasks, objectif_heures: newTotalHours }).eq('id', parentId);
      const newTasks = tasks.map(t => t.id === parentId ? { ...t, subtasks: updatedSubtasks, objectif_heures: newTotalHours } : t);
      setTasks(newTasks); setNewSubTask({ label: '', heures: 0, date: '', effectif: 1 }); setActiveParentTask(null);
  };
  const toggleSubTask = async (parentId: string, subtaskId: number) => {
      const parentTask = tasks.find(t => t.id === parentId);
      const updatedSubtasks = parentTask.subtasks.map((st: any) => st.id === subtaskId ? { ...st, done: !st.done } : st);
      const allDone = updatedSubtasks.every((st: any) => st.done);
      const { error } = await supabase.from('chantier_tasks').update({ subtasks: updatedSubtasks, done: allDone, heures_reelles: allDone ? (parentTask.heures_reelles || parentTask.objectif_heures) : parentTask.heures_reelles }).eq('id', parentId);
      if (!error) { const newTasks = tasks.map(t => t.id === parentId ? { ...t, subtasks: updatedSubtasks, done: allDone } : t); setTasks(newTasks); updateChantierTotalHours(newTasks); }
  };
  const addTask = async () => { if (!newTaskLabel) return; const { data } = await supabase.from('chantier_tasks').insert([{ chantier_id: id, label: newTaskLabel, objectif_heures: 0, heures_reelles: 0, done: false, subtasks: [] }]).select(); if (data) setTasks([data[0], ...tasks]); setNewTaskLabel(""); };
  const deleteTask = async (taskId: string) => { if(confirm('Supprimer ?')) { await supabase.from('chantier_tasks').delete().eq('id', taskId); const updatedList = tasks.filter(t => t.id !== taskId); setTasks(updatedList); updateChantierTotalHours(updatedList); } };
  
  // --- Autres ---
  const handleAddMateriel = async () => { if (!newMat.materiel_id) return alert("Sélectionnez un matériel"); const { error } = await supabase.from('chantier_materiel').insert([{ chantier_id: id, materiel_id: newMat.materiel_id, date_debut: newMat.date_debut || null, date_fin: newMat.date_fin || null, qte_prise: newMat.qte || 1, statut: 'prevu' }]); if (!error) { setShowAddMaterielModal(false); fetchChantierData(); }};
  const deleteMateriel = async (matId: string) => { if (confirm('Supprimer ?')) { await supabase.from('chantier_materiel').delete().eq('id', matId); fetchChantierData(); } };
  const addCouche = () => setAcqpaData({ ...acqpaData, couches: [...(acqpaData.couches || []), { type: '', lot: '', methode: '', dilution: '' }] });
  const removeCouche = (index: number) => { const n = [...acqpaData.couches]; n.splice(index, 1); setAcqpaData({ ...acqpaData, couches: n }); };
  const updateCouche = (index: number, field: string, value: string) => { const n = [...acqpaData.couches]; n[index][field] = value; setAcqpaData({ ...acqpaData, couches: n }); };
  const toggleArrayItem = (field: 'risques' | 'epi', value: string) => { const current = chantier[field] || []; setChantier({ ...chantier, [field]: current.includes(value) ? current.filter((i: string) => i !== value) : [...current, value] }); };
  const deleteDocument = async (docId: string) => { if(confirm('Supprimer ?')) { await supabase.from('chantier_documents').delete().eq('id', docId); fetchChantierData(); } };
  const handleFileUpload = async (e: any) => { if (!e.target.files?.length) return; setUploading(true); const file = e.target.files[0]; const filePath = `${id}/${Math.random()}.${file.name.split('.').pop()}`; const { error } = await supabase.storage.from('documents').upload(filePath, file); if(!error) { const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath); await supabase.from('chantier_documents').insert([{ chantier_id: id, nom: file.name, url: publicUrl, type: file.type.startsWith('image/') ? 'image' : 'pdf' }]); fetchChantierData(); } setUploading(false); };
  
  const handlePrint = () => { window.print(); };
  const getSelectedUnit = () => { const selected = stockFournitures.find(s => s.id === newFourniture.fourniture_ref_id); return selected ? selected.unite : ''; };
  const filteredStock = stockFournitures.filter(s => s.nom.toLowerCase().includes(supplySearch.toLowerCase()) || (s.ral && s.ral.includes(supplySearch)));

  if (loading) return <div className="h-screen flex items-center justify-center font-['Fredoka'] text-[#34495e] font-bold"><div className="animate-spin mr-3"><Truck/></div> Chargement...</div>;
  // --- CALCULS KPI DASHBOARD ---
  const finishedTasks = tasks.filter(t => t.done);
  const totalPlannedHours = finishedTasks.reduce((acc, t) => acc + (t.objectif_heures || 0), 0);
  const totalRealHours = finishedTasks.reduce((acc, t) => acc + (parseFloat(t.heures_reelles) || 0), 0);
  const globalDeltaHours = totalPlannedHours - totalRealHours;
  
  // KPI Financiers
  const budgetMO = chantier.budget_euro || 0;
  const coutReelMO = chantier.heures_consommees * chantier.taux_horaire_moyen;
  const margeMO = budgetMO - coutReelMO;
  const percentBudgetMO = budgetMO > 0 ? Math.round((coutReelMO / budgetMO) * 100) : 0;

  // KPI Logistique
  const matEnCours = materielPrevu.filter(m => m.statut === 'en_cours' || m.statut === 'prevu').length;
  const fournituresConsoTotal = fournituresPrevu.reduce((acc, f) => acc + (f.qte_consommee || 0), 0);
  const fournituresPrevuTotal = fournituresPrevu.reduce((acc, f) => acc + (f.qte_prevue || 0), 0);
  const percentFournitures = fournituresPrevuTotal > 0 ? Math.round((fournituresConsoTotal/fournituresPrevuTotal)*100) : 0;

  return (
    <div className="min-h-screen bg-[#f0f3f4] font-['Fredoka'] pb-20 text-gray-800 ml-0 md:ml-0 transition-all print:bg-white print:p-0 print:m-0 print:w-full">
      <style jsx global>{`
        @media print {
          @page { size: landscape; margin: 5mm; }
          body { -webkit-print-color-adjust: exact; background: white; }
          nav, aside, .sidebar, .print-hidden { display: none !important; }
          .no-break { break-inside: avoid; }
        }
      `}</style>

      {/* HEADER */}
      <div className="bg-white/90 backdrop-blur-md sticky top-0 z-30 border-b border-gray-200 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <Link href="/chantier" className="bg-white p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-black hover:scale-105 transition-all"><ArrowLeft size={20} /></Link>
                <div>
                    <h1 className="text-xl font-black uppercase tracking-tight text-[#2d3436]">{chantier.nom}</h1>
                    <div className="flex items-center gap-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Budget M.O : {coutReelMO}€ / {budgetMO}€</p>
                    </div>
                </div>
            </div>
            <button onClick={handleSave} className="bg-[#00b894] hover:bg-[#00a383] text-white px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-200 transition-all hover:scale-105 active:scale-95 font-bold uppercase flex items-center gap-2"><Save size={18} /> Sauvegarder</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 print:max-w-none print:p-2">
        
        {/* NAV BAR */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar print:hidden">
            {[
                { id: 'suivi', label: 'Suivi & KPI', icon: PieChart, color: 'bg-[#00b894]' },
                { id: 'infos', label: 'Infos & Tâches', icon: FileText, color: 'bg-[#34495e]' },
                { id: 'logistique', label: 'Matériel & Loc.', icon: Truck, color: 'bg-[#6c5ce7]' },
                { id: 'fournitures', label: 'Fournitures', icon: Package, color: 'bg-[#fdcb6e]' },
                { id: 'planning', label: 'Planning Gantt', icon: BarChart2, color: 'bg-[#00b894]' },
                { id: 'hse', label: 'Sécurité / EPI', icon: Shield, color: 'bg-[#e17055]' },
                { id: 'acqpa', label: 'Mesures ACQPA', icon: ClipboardCheck, color: 'bg-[#0984e3]' },
                { id: 'docs', label: 'Photos / Docs', icon: UploadCloud, color: 'bg-[#6c5ce7]' },
            ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-5 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all shadow-sm flex items-center gap-2 ${activeTab === tab.id ? `${tab.color} text-white shadow-lg scale-105` : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50'}`}><tab.icon size={16} /> {tab.label}</button>
            ))}
        </div>

        {/* --- ONGLET SUIVI AVANCEMENT (DASHBOARD) --- */}
        {activeTab === 'suivi' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 print:space-y-4">
                
                <div className="flex justify-between items-end border-b border-gray-200 pb-4 mb-6">
                    <div>
                        <h2 className="text-3xl font-black uppercase text-[#2d3436] tracking-tight">Rapport de Direction</h2>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{chantier.nom} — {chantier.type} — {new Date().toLocaleDateString()}</p>
                    </div>
                    <button onClick={handlePrint} className="bg-[#2d3436] text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold uppercase text-xs shadow-lg print:hidden hover:scale-105 transition-transform"><Printer size={18}/> Imprimer</button>
                </div>

                {/* KPI CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 print:grid-cols-3">
                    
                    {/* KPI 1: Budget MO Financier */}
                    <div className="bg-white p-5 rounded-[25px] shadow-sm border border-gray-100 relative overflow-hidden group print:border-gray-300">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-blue-600"><Euro size={50}/></div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Budget M.O. (€)</p>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-black text-[#2d3436]">{coutReelMO.toLocaleString()}€</span>
                            <span className="text-xs font-bold text-gray-400">/ {budgetMO.toLocaleString()}€</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full mt-3 overflow-hidden">
                            <div className={`h-full ${percentBudgetMO > 100 ? 'bg-red-500' : 'bg-[#0984e3]'}`} style={{width: `${Math.min(100, percentBudgetMO)}%`}}></div>
                        </div>
                        <p className={`text-[10px] font-black mt-2 uppercase ${percentBudgetMO > 100 ? 'text-red-500' : 'text-[#0984e3]'}`}>{percentBudgetMO}% Consommé</p>
                    </div>

                    {/* KPI 2: Rentabilité Nette */}
                    <div className="bg-white p-5 rounded-[25px] shadow-sm border border-gray-100 relative overflow-hidden group print:border-gray-300">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-600"><Wallet size={50}/></div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Marge M.O. Estimée</p>
                        <div className={`text-2xl font-black mt-2 ${margeMO >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {margeMO > 0 ? '+' : ''}{margeMO.toLocaleString()} €
                        </div>
                        <div className="flex items-center gap-1 mt-3">
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Taux moyen: {chantier.taux_horaire_moyen}€/h</span>
                        </div>
                    </div>

                    {/* KPI 3: Fournitures */}
                    <div className="bg-white p-5 rounded-[25px] shadow-sm border border-gray-100 relative overflow-hidden group print:border-gray-300">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-orange-500"><Package size={50}/></div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Conso Fournitures</p>
                        <div className="mt-3 space-y-2">
                            <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                                <span>Global</span>
                                <span className="text-orange-500">{percentFournitures}%</span>
                            </div>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
                             <div className="h-full bg-orange-400" style={{width: `${Math.min(100, percentFournitures)}%`}}></div>
                        </div>
                    </div>

                    {/* KPI 4: Locations */}
                    <div className="bg-white p-5 rounded-[25px] shadow-sm border border-gray-100 relative overflow-hidden group print:border-gray-300">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-purple-500"><Truck size={50}/></div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Parc Matériel</p>
                        <div className="flex flex-col items-center justify-center h-16">
                            <span className="text-3xl font-black text-purple-600">{matEnCours}</span>
                            <span className="text-[9px] font-bold text-gray-400 uppercase">Équipements actifs</span>
                        </div>
                    </div>

                    {/* KPI 5: Sous-traitance */}
                    <div className="bg-white p-5 rounded-[25px] shadow-sm border border-gray-100 relative overflow-hidden group print:border-gray-300">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-gray-600"><Briefcase size={50}/></div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sous-Traitance</p>
                        <div className="flex flex-col items-center justify-center h-16">
                            <span className="text-3xl font-black text-gray-300">0</span>
                            <span className="text-[9px] font-bold text-gray-400 uppercase">Prestataires</span>
                        </div>
                    </div>
                </div>

                {/* TABLEAU RENTABILITÉ TÂCHES */}
                <div className="bg-white rounded-[30px] p-8 shadow-sm border border-gray-100 print:shadow-none print:border-gray-300 no-break">
                    <h3 className="font-black uppercase text-gray-700 mb-6 flex items-center gap-2"><Target className="text-[#ff9f43]"/> Détail Rentabilité Opérationnelle (Top 10)</h3>
                    <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 uppercase text-gray-400 font-black">
                            <tr>
                                <th className="p-3 rounded-l-lg">Tâche</th>
                                <th className="p-3">Responsable</th>
                                <th className="p-3 text-center">H. Prévues</th>
                                <th className="p-3 text-center">H. Réelles</th>
                                <th className="p-3 text-right">Ecart Heures</th>
                                <th className="p-3 text-right rounded-r-lg">Impact Financier</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 font-bold text-gray-700">
                            {finishedTasks.slice(0, 10).map(t => {
                                const delta = (t.objectif_heures || 0) - (parseFloat(t.heures_reelles) || 0);
                                const impact = delta * chantier.taux_horaire_moyen;
                                return (
                                    <tr key={t.id}>
                                        <td className="p-3 truncate max-w-[200px]">{t.label}</td>
                                        <td className="p-3 text-gray-500">{t.responsable ? t.responsable.nom : '-'}</td>
                                        <td className="p-3 text-center">{t.objectif_heures}h</td>
                                        <td className="p-3 text-center">{t.heures_reelles}h</td>
                                        <td className={`p-3 text-right ${delta >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{delta > 0 ? '+' : ''}{delta.toFixed(1)}h</td>
                                        <td className={`p-3 text-right ${impact >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{impact > 0 ? '+' : ''}{impact.toLocaleString()}€</td>
                                    </tr>
                                );
                            })}
                            {finishedTasks.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-gray-400 italic">Aucune tâche terminée pour le moment.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
        {/* --- ONGLET 1 : INFOS (AVEC SAISIE FINANCIÈRE) --- */}
        {activeTab === 'infos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="space-y-6">
                    <div className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-100 space-y-4">
                        <h3 className="font-black uppercase text-gray-700 mb-4 flex items-center gap-2"><FileText size={20}/> Identification</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nom Chantier</label><input value={chantier.nom || ''} onChange={e => setChantier({...chantier, nom: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none border border-transparent focus:border-[#00b894] transition-colors" /></div>
                            <div className="col-span-2 grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <div className="col-span-2"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Client</label><input value={chantier.client || ''} onChange={e => setChantier({...chantier, client: e.target.value})} className="w-full bg-white p-2 rounded-lg font-bold outline-none" /></div>
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1"><Phone size={10}/> Tel</label><input value={chantier.client_telephone || ''} onChange={e => setChantier({...chantier, client_telephone: e.target.value})} className="w-full bg-white p-2 rounded-lg font-bold outline-none" /></div>
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1"><Mail size={10}/> Email</label><input value={chantier.client_email || ''} onChange={e => setChantier({...chantier, client_email: e.target.value})} className="w-full bg-white p-2 rounded-lg font-bold outline-none" /></div>
                            </div>
                            <div className="col-span-2"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Adresse</label><input value={chantier.adresse || ''} onChange={e => setChantier({...chantier, adresse: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none" /></div>
                        </div>
                    </div>
                    
                    {/* BLOC FINANCIER AJOUTÉ */}
                    <div className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-100 space-y-4">
                        <h3 className="font-black uppercase text-gray-700 mb-4 flex items-center gap-2"><Euro size={20}/> Données Financières</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Budget M.O. (€)</label>
                                <div className="flex items-center bg-gray-50 rounded-xl px-2 mt-1">
                                    <Euro size={16} className="text-gray-400 mr-2"/>
                                    <input type="number" value={chantier.budget_euro || 0} onChange={e => setChantier({...chantier, budget_euro: parseFloat(e.target.value) || 0})} className="w-full bg-transparent p-3 font-bold outline-none text-blue-600" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Taux Horaire Moyen</label>
                                <div className="flex items-center bg-gray-50 rounded-xl px-2 mt-1">
                                    <Calculator size={16} className="text-gray-400 mr-2"/>
                                    <input type="number" value={chantier.taux_horaire_moyen || 45} onChange={e => setChantier({...chantier, taux_horaire_moyen: parseFloat(e.target.value) || 0})} className="w-full bg-transparent p-3 font-bold outline-none" />
                                </div>
                            </div>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-700 font-bold border border-blue-100">
                            Coût réel estimé à ce jour : {(chantier.heures_consommees * (chantier.taux_horaire_moyen || 45)).toLocaleString()} €
                        </div>
                    </div>

                    <div className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-100 space-y-4">
                        <h3 className="font-black uppercase text-gray-700 mb-4 flex items-center gap-2"><Calendar size={20}/> Planning & Ressources</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date Début</label><input type="date" value={chantier.date_debut || ''} onChange={e => setChantier({...chantier, date_debut: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none" /></div>
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date Fin</label><input type="date" value={chantier.date_fin || ''} onChange={e => setChantier({...chantier, date_fin: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none" /></div>
                            <div className="col-span-2"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Responsable Chantier</label><div className="flex items-center bg-gray-50 rounded-xl px-2 mt-1 border border-transparent focus-within:border-blue-300 transition-colors"><Users size={16} className="text-gray-400 mr-2"/><select className="w-full bg-transparent p-3 font-bold outline-none cursor-pointer" value={chantier.responsable || ''} onChange={(e) => setChantier({...chantier, responsable: e.target.value})}>{employes.map(emp => (<option key={emp.id} value={emp.id}>{emp.nom} {emp.prenom}</option>))}</select></div></div>
                            <div className="col-span-2"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Statut & Pondération</label><div className="flex gap-2 mt-1"><select value={chantier.statut || 'en_cours'} onChange={e => setChantier({...chantier, statut: e.target.value})} className={`flex-1 bg-gray-50 p-3 rounded-xl font-bold outline-none cursor-pointer ${chantier.statut === 'potentiel' ? 'text-blue-600 bg-blue-50' : ''}`}><option value="planifie">Planifié</option><option value="en_cours">En Cours</option><option value="potentiel">Probable (Offre)</option><option value="termine">Terminé</option></select>{chantier.statut === 'potentiel' && (<div className="w-24 bg-blue-50 border border-blue-200 rounded-xl flex items-center px-2 animate-in slide-in-from-left-2"><Percent size={14} className="text-blue-400 mr-1"/><input type="number" min="0" max="100" value={chantier.taux_reussite || 0} onChange={e => setChantier({...chantier, taux_reussite: parseInt(e.target.value) || 0})} className="w-full bg-transparent text-center font-black text-blue-700 outline-none" /></div>)}</div></div>
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Budget Heures (Est.)</label><div className="flex items-center bg-gray-50 rounded-xl px-2 mt-1"><Clock size={16} className="text-gray-400 mr-2"/><input type="number" value={chantier.heures_budget || 0} onChange={e => setChantier({...chantier, heures_budget: parseFloat(e.target.value) || 0})} className="w-full bg-transparent p-3 font-bold outline-none" /></div></div>
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Effectif Total Prévu</label><div className="flex items-center bg-gray-50 rounded-xl px-2 mt-1"><Users size={16} className="text-gray-400 mr-2"/><input type="number" value={chantier.effectif_prevu || 0} onChange={e => setChantier({...chantier, effectif_prevu: parseInt(e.target.value) || 0})} className="w-full bg-transparent p-3 font-bold outline-none text-blue-600" /></div></div>
                        </div>
                        <div className="mt-2 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
                            <div><h4 className="font-black text-[#0984e3] uppercase">Mesures ACQPA</h4><p className="text-xs text-blue-400 font-bold">Activer le module qualité</p></div>
                            <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={chantier.mesures_obligatoires || false} onChange={e => setChantier({...chantier, mesures_obligatoires: e.target.checked})} className="sr-only peer" /><div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0984e3]"></div></label>
                        </div>
                    </div>
                </div>
                {/* TACHES & PLANNING (Colonne droite Infos) */}
                <div className="bg-[#34495e] rounded-[30px] p-6 shadow-xl text-white relative overflow-hidden flex flex-col h-full min-h-[600px]">
                    <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><CheckCircle2 size={200} /></div>
                    <h3 className="font-black uppercase text-xl mb-4 flex items-center gap-2 relative z-10"><CheckCircle2 size={20}/> Tâches & Planning</h3>
                    <div className="flex gap-2 mb-4 relative z-10"><input placeholder="Nouvelle étape..." value={newTaskLabel} onChange={(e) => setNewTaskLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} className="flex-1 bg-white/10 rounded-xl p-3 text-sm font-bold text-white placeholder-white/40 outline-none border border-white/5 focus:bg-white/20 transition-colors" /><button onClick={addTask} className="bg-[#ff9f43] text-white p-3 rounded-xl hover:bg-[#e67e22] shadow-lg transition-transform active:scale-95"><Plus size={20}/></button></div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2 relative z-10">
                        {tasks.map((t) => (
                            <div key={t.id} className={`p-4 rounded-2xl border transition-all ${t.done ? 'bg-black/20 border-transparent opacity-80' : 'bg-white/5 border-white/5'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-start gap-3">
                                        <button onClick={() => toggleTask(t)} className={`mt-1 transition-colors ${t.done ? 'text-[#00b894]' : 'text-gray-500 hover:text-white'}`}>{t.done ? <CheckCircle2 size={24} /> : <Circle size={24} />}</button>
                                        <div><p className={`text-sm font-black uppercase tracking-tight ${t.done ? 'line-through text-gray-500' : 'text-[#ff9f43]'}`}>{t.label}</p><div className="flex items-center gap-2 mt-1"><div className="flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-lg border border-white/5"><UserPlus size={10} className="text-blue-400"/><select className="bg-transparent text-[9px] font-bold text-blue-200 outline-none cursor-pointer w-24" value={t.responsable_id || ''} onChange={(e) => updateTaskField(t.id, 'responsable_id', e.target.value)}><option value="" className="text-gray-800">Assigner...</option>{employes.map(emp => <option key={emp.id} value={emp.id} className="text-gray-800">{emp.nom} {emp.prenom}</option>)}</select></div></div></div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase justify-end"><Clock size={10}/> Prévu: {t.objectif_heures}h</div>
                                        {t.done && (<div className="mt-1 flex items-center gap-2 justify-end animate-in fade-in"><span className="text-[9px] font-black uppercase text-[#ff9f43]">Réel :</span><input type="number" className="w-12 bg-white/10 text-center rounded border border-white/10 text-[10px] font-black py-0.5 outline-none focus:border-[#ff9f43] text-white" value={t.heures_reelles} onChange={(e) => updateTaskField(t.id, 'heures_reelles', parseFloat(e.target.value) || 0)} /></div>)}
                                    </div>
                                </div>
                                <div className="mt-3 space-y-1 pl-4 border-l-2 border-white/10">
                                    {t.subtasks && t.subtasks.map((st: any) => (
                                        <div key={st.id} className="flex items-center justify-between text-[11px] py-1">
                                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleSubTask(t.id, st.id)}>{st.done ? <CheckCircle2 size={12} className="text-green-400"/> : <Circle size={12} className="text-white/30"/>}<span className={st.done ? 'line-through text-white/30' : 'text-white/80'}>{st.label}</span></div><span className="text-[9px] font-bold text-white/40">{st.heures}h</span>
                                        </div>
                                    ))}
                                    {!t.done && <button onClick={() => setActiveParentTask(activeParentTask === t.id ? null : t.id)} className="text-[9px] font-black uppercase text-white/20 hover:text-white/50 py-1 transition-colors">+ Ajouter sous-tâche</button>}
                                </div>
                                {activeParentTask === t.id && (
                                    <div className="mt-3 bg-black/20 p-3 rounded-lg flex flex-col gap-2 animate-in fade-in"><input type="text" placeholder="Nom de la sous-tâche..." className="bg-transparent text-xs text-white placeholder-white/30 outline-none border-b border-white/10 p-1" value={newSubTask.label} onChange={e => setNewSubTask({...newSubTask, label: e.target.value})} /><div className="flex gap-2 items-center"><input type="date" className="bg-transparent text-xs text-white/70 outline-none w-24 border-b border-white/10 p-1" value={newSubTask.date} onChange={e => setNewSubTask({...newSubTask, date: e.target.value})} /><div className="flex items-center gap-1 bg-white/5 rounded px-2"><Users size={12} className="text-blue-400"/><input type="number" placeholder="P" className="bg-transparent text-xs text-white outline-none w-10 text-center p-1" value={newSubTask.effectif || ''} onChange={e => setNewSubTask({...newSubTask, effectif: parseInt(e.target.value) || 1})} /></div><div className="flex items-center gap-1 bg-white/5 rounded px-2"><Clock size={12} className="text-orange-400"/><input type="number" placeholder="H" className="bg-transparent text-xs text-white outline-none w-10 text-center p-1" value={newSubTask.heures || ''} onChange={e => setNewSubTask({...newSubTask, heures: parseFloat(e.target.value) || 0})} /></div><button onClick={() => addSubTask(t.id)} className="bg-green-500 text-white px-3 py-1 rounded text-[10px] font-bold uppercase ml-auto hover:bg-green-600 transition-colors">Ajouter</button></div></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}
        {/* ============================================================================================ */}
        {/* ONGLET 3 : LOGISTIQUE                                                                        */}
        {/* ============================================================================================ */}
        {activeTab === 'logistique' && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center mb-6 print:hidden"><h3 className="text-xl font-black text-gray-700 uppercase flex items-center gap-2"><Truck className="text-[#6c5ce7]"/> Matériel & Locations</h3><button onClick={() => setShowAddMaterielModal(true)} className="bg-[#6c5ce7] text-white px-6 py-2.5 rounded-xl font-bold uppercase text-xs shadow-lg hover:bg-[#5b4bc4] transition-all flex items-center gap-2"><Plus size={16}/> Ajouter / Réserver</button></div>
                <div className="bg-white rounded-[30px] p-1 shadow-sm border border-gray-100 overflow-hidden print:border-none print:shadow-none"><table className="w-full"><thead className="bg-gray-50 border-b border-gray-100"><tr><th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase">Matériel</th><th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase">Type</th><th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase">Période</th><th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase">Quantité</th><th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase print:hidden">Action</th></tr></thead><tbody className="divide-y divide-gray-50">{materielPrevu.map(m => (<tr key={m.id} className="hover:bg-gray-50 transition-colors"><td className="p-4 font-bold text-sm text-gray-800">{m.materiel?.nom}</td><td className="p-4"><span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${m.materiel?.type_stock === 'Interne' ? 'bg-gray-100 text-gray-500' : 'bg-purple-100 text-purple-600'}`}>{m.materiel?.type_stock}</span></td><td className="p-4 text-xs font-bold text-gray-600">{m.date_debut} ➔ {m.date_fin}</td><td className="p-4 text-center font-black text-gray-800">{m.qte_prise}</td><td className="p-4 text-center print:hidden"><button onClick={() => deleteMateriel(m.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button></td></tr>))}</tbody></table></div>
            </div>
        )}

        {/* ============================================================================================ */}
        {/* ONGLET 4 : FOURNITURES                                                                       */}
        {/* ============================================================================================ */}
        {activeTab === 'fournitures' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
                    <div className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-100 h-fit overflow-visible z-20"><h3 className="font-black uppercase text-gray-700 mb-4 flex items-center gap-2"><Package className="text-yellow-500"/> Ajouter Besoin</h3><div className="space-y-4"><div className="relative" ref={searchWrapperRef}><label className="text-[10px] font-bold text-gray-400 uppercase">Produit</label><div className="relative"><input type="text" className="w-full bg-gray-50 p-3 pl-10 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-yellow-400 transition-colors" placeholder="Chercher..." value={supplySearch} onChange={(e) => { setSupplySearch(e.target.value); setShowSupplyList(true); if(newFourniture.fourniture_ref_id) setNewFourniture({...newFourniture, fourniture_ref_id: ''}); }} onFocus={() => setShowSupplyList(true)} /><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/></div>{showSupplyList && supplySearch && (<div className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto z-50">{filteredStock.map(s => (<div key={s.id} className="p-3 hover:bg-yellow-50 cursor-pointer border-b border-gray-50 last:border-0" onClick={() => { setSupplySearch(s.nom); setNewFourniture({...newFourniture, fourniture_ref_id: s.id}); setShowSupplyList(false); }}><div className="font-bold text-sm text-gray-800">{s.nom}</div><div className="text-[10px] text-gray-400">{s.ral} - {s.qte_stock} {s.unite} dispo</div></div>))}</div>)}</div><div><label className="text-[10px] font-bold text-gray-400 uppercase">Quantité Prévue ({getSelectedUnit()})</label><input type="number" value={newFourniture.qte_prevue || ''} onChange={e => setNewFourniture({...newFourniture, qte_prevue: parseFloat(e.target.value) || 0})} className="w-full bg-gray-50 p-3 rounded-xl font-bold text-sm outline-none focus:border-yellow-400 border border-transparent" /></div><button onClick={addFourniture} disabled={!newFourniture.fourniture_ref_id} className="w-full bg-yellow-400 hover:bg-yellow-500 text-white font-black uppercase py-3 rounded-xl shadow-lg">Valider le besoin</button></div></div>
                    <div className="lg:col-span-2 bg-white rounded-[30px] p-6 shadow-sm border border-gray-100 z-10"><h3 className="font-black uppercase text-gray-700 mb-4 flex items-center gap-2"><TrendingUp className="text-blue-500"/> Besoins Atelier</h3><div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400"><tr><th className="p-3">Produit</th><th className="p-3 text-center">Prévu</th><th className="p-3 text-center bg-blue-50/50 text-blue-600">Stock Magasin</th><th className="p-3 text-center bg-orange-50/50 text-orange-600">À Commander</th><th className="p-3 text-right">Statut</th></tr></thead><tbody className="divide-y divide-gray-50">{fournituresPrevu.map(f => { const stockInfo = f.fournitures_stock || {}; const aCommander = Math.max(0, f.qte_prevue - stockInfo.qte_stock); return (<tr key={f.id} className="hover:bg-gray-50 transition-colors"><td className="p-3 font-bold text-sm text-gray-800">{f.nom}<button onClick={() => deleteFourniture(f.id)} className="ml-2 text-gray-300 hover:text-red-500"><Trash2 size={12}/></button></td><td className="p-3 text-center font-black">{f.qte_prevue} {f.unite}</td><td className="p-3 text-center font-bold text-blue-600 bg-blue-50/20">{stockInfo.qte_stock}</td><td className={`p-3 text-center font-black bg-orange-50/20 ${aCommander > 0 ? 'text-red-500' : 'text-gray-300'}`}>{aCommander > 0 ? aCommander : '-'}</td><td className="p-3 text-right">{stockInfo.qte_stock >= f.qte_prevue ? (<span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">Stock OK</span>) : (<span className="text-[9px] font-black uppercase text-orange-600 bg-orange-50 px-2 py-1 rounded-lg border border-orange-100">Commander</span>)}</td></tr>); })}</tbody></table></div></div>
                </div>
                <div className="bg-white rounded-[35px] p-8 shadow-xl border border-gray-100 relative overflow-hidden"><div className="flex justify-between items-center mb-6 relative z-10"><div><h3 className="text-xl font-black uppercase text-gray-700 flex items-center gap-2"><Scale className="text-emerald-500"/> Saisie Consommation Terrain</h3><p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Mise à jour du stock déporté</p></div></div><div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-gray-50 text-[11px] font-black uppercase text-gray-400"><tr><th className="p-4">Fourniture</th><th className="p-4 text-center">Quantité Utilisée</th><th className="p-4 text-center bg-emerald-50/50 text-emerald-700">Stock Chantier Restant</th></tr></thead><tbody className="divide-y divide-gray-100">{fournituresPrevu.map(f => { const prevu = f.qte_prevue || 1; const conso = f.qte_consommee || 0; return (<tr key={f.id} className="hover:bg-gray-50/80 transition-all group"><td className="p-4"><p className="font-black text-gray-800">{f.nom}</p><span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase">Init: {prevu} {f.unite}</span></td><td className="p-4 text-center"><div className="flex items-center justify-center gap-2"><button onClick={() => updateConsommation(f.id, conso - 1)} className="w-7 h-7 bg-gray-100 text-gray-500 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><Minus size={14}/></button><input type="number" className="w-20 text-center font-black text-sm bg-gray-50 border-2 border-transparent focus:border-emerald-400 rounded-lg py-1 outline-none" value={conso} onChange={(e) => updateConsommation(f.id, parseFloat(e.target.value) || 0)} /><button onClick={() => updateConsommation(f.id, conso + 1)} className="w-7 h-7 bg-gray-100 text-gray-500 rounded-lg flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all"><Plus size={14}/></button></div></td><td className="p-4 text-center bg-emerald-50/30 font-black text-emerald-700">{Math.max(0, prevu - conso)} {f.unite}</td></tr>); })}</tbody></table></div></div>
            </div>
        )}

        {/* ============================================================================================ */}
        {/* ONGLET 5 : PLANNING                                                                          */}
        {/* ============================================================================================ */}
        {activeTab === 'planning' && (
            <div className="bg-white rounded-[30px] p-8 shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4"><div className="flex justify-between items-center mb-6"><h3 className="font-black uppercase text-gray-700 flex items-center gap-2"><BarChart2 className="text-[#00b894]"/> Planning Gantt Prévisionnel</h3><div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl"><Users size={18} className="text-blue-600"/><span className="text-sm font-black text-blue-800">Effectif Total : {chantier.effectif_prevu} pers.</span></div></div><div className="space-y-6">{tasks.map((t, idx) => (<div key={t.id} className="relative"><div className="flex items-center gap-4 mb-2"><div className="w-48 font-bold text-sm truncate" title={t.label}>{t.label}</div><div className="flex-1 bg-gray-100 h-8 rounded-full relative overflow-hidden"><div className="absolute top-0 left-0 h-full bg-[#00b894] opacity-80 flex items-center px-3 text-[10px] text-white font-bold" style={{ width: `${Math.min(100, Math.max(10, t.objectif_heures * 2))}%` }}>{t.objectif_heures}h</div></div></div>{t.subtasks && t.subtasks.map((st: any) => (<div key={st.id} className="flex items-center gap-4 mb-1 pl-8 relative group"><CornerDownRight size={14} className="text-gray-300 absolute left-2 top-2"/><div className="w-40 text-xs text-gray-500 truncate flex justify-between pr-4"><span>{st.label}</span><span className="font-black text-blue-500">{st.effectif}p</span></div><div className="flex-1 bg-gray-50 h-6 rounded-full relative"><div className={`absolute top-0 h-full rounded-full flex items-center justify-center px-2 text-[9px] text-white font-bold ${st.done ? 'bg-blue-400' : 'bg-orange-300'}`} style={{ left: `${(new Date(st.date || new Date()).getDate() % 30) * 3}%`, width: `${Math.max(8, st.heures * 2)}%` }}>{st.heures}h | {st.effectif}p</div></div></div>))}</div>))}</div></div>
        )}
        {/* ============================================================================================ */}
        {/* ONGLET 6 : HSE                                                                               */}
        {/* ============================================================================================ */}
        {activeTab === 'hse' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4"><div className="bg-[#e17055] text-white rounded-[30px] p-6 shadow-xl relative overflow-hidden"><h3 className="font-black uppercase text-xl mb-4 flex items-center gap-2"><AlertTriangle/> Alertes Risques</h3><div className="space-y-3 relative z-10">{RISK_OPTIONS.map(risk => (<label key={risk} className="flex items-center gap-3 bg-white/10 p-3 rounded-xl cursor-pointer hover:bg-white/20 transition-colors border border-white/5"><div onClick={() => toggleArrayItem('risques', risk)} className={`w-5 h-5 rounded flex items-center justify-center border-2 border-white ${chantier.risques?.includes(risk) ? 'bg-white' : 'bg-transparent'}`}>{chantier.risques?.includes(risk) && <CheckSquare size={14} className="text-[#e17055]" />}</div><span className="font-bold text-sm uppercase">{risk}</span></label>))}</div><AlertTriangle size={150} className="absolute -right-5 -bottom-5 text-orange-900 opacity-10 rotate-12 pointer-events-none" /></div><div className="bg-[#00b894] text-white rounded-[30px] p-6 shadow-xl relative overflow-hidden"><h3 className="font-black uppercase text-xl mb-4 flex items-center gap-2"><Shield/> EPI Obligatoires</h3><div className="grid grid-cols-2 gap-3 relative z-10">{EPI_OPTIONS.map(epi => (<label key={epi} className="flex items-center gap-3 bg-white/10 p-3 rounded-xl cursor-pointer hover:bg-white/20 transition-colors border border-white/5"><div onClick={() => toggleArrayItem('epi', epi)} className={`w-5 h-5 rounded flex items-center justify-center border-2 border-white ${chantier.epi?.includes(epi) ? 'bg-white' : 'bg-transparent'}`}>{chantier.epi?.includes(epi) && <CheckSquare size={14} className="text-[#00b894]" />}</div><span className="font-bold text-[11px] uppercase leading-tight">{epi}</span></label>))}</div><Shield size={150} className="absolute -right-5 -bottom-5 text-emerald-900 opacity-10 rotate-12 pointer-events-none" /></div></div>
        )}

        {/* ============================================================================================ */}
        {/* ONGLET 7 : ACQPA (CORRIGÉ)                                                                   */}
        {/* ============================================================================================ */}
        {activeTab === 'acqpa' && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
                {!chantier.mesures_obligatoires ? (
                    <div className="bg-white rounded-[30px] p-10 text-center border border-gray-100 shadow-sm">
                        <ClipboardCheck size={50} className="text-gray-300 mx-auto mb-4" />
                        <h3 className="font-black text-gray-400 uppercase text-xl">Module Désactivé</h3>
                        <p className="text-gray-400 font-bold mb-4">Activez les mesures dans l'onglet Infos.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-[#0984e3] text-white p-6 rounded-[30px] shadow-xl flex justify-between items-center relative overflow-hidden">
                            <div className="relative z-10">
                                <h3 className="font-black uppercase text-xl">Relevés Peinture (ACQPA)</h3>
                                <p className="text-blue-200 font-bold text-sm">Suivi qualité application</p>
                            </div>
                            <button onClick={() => setShowACQPAModal(true)} className="bg-white text-[#0984e3] px-6 py-3 rounded-xl font-black uppercase shadow-lg hover:scale-105 transition-transform relative z-10">
                                Ouvrir / Modifier
                            </button>
                            <ClipboardCheck size={100} className="absolute -right-0 -bottom-5 text-blue-900 opacity-10 rotate-12 pointer-events-none" />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-[20px] shadow-sm border-l-4 border-blue-400"><p className="text-[10px] font-bold text-gray-400 uppercase">Hygrométrie</p><p className="text-xl font-black text-gray-800">{acqpaData.hygrometrie || '--'} %</p></div>
                            <div className="bg-white p-4 rounded-[20px] shadow-sm border-l-4 border-green-400"><p className="text-[10px] font-bold text-gray-400 uppercase">DFT Moy.</p><p className="text-xl font-black text-gray-800">{acqpaData.dft_mesure || '--'} µm</p></div>
                            <div className="bg-white p-4 rounded-[20px] shadow-sm border-l-4 border-purple-400"><p className="text-[10px] font-bold text-gray-400 uppercase">Inspecteur</p><p className="text-xl font-black text-gray-800 truncate">{acqpaData.inspecteur_nom || '--'}</p></div>
                            <div className="bg-white p-4 rounded-[20px] shadow-sm border-l-4 border-orange-400"><p className="text-[10px] font-bold text-gray-400 uppercase">Couches</p><p className="text-xl font-black text-gray-800">{acqpaData.couches?.length || 0}</p></div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* ============================================================================================ */}
        {/* ONGLET 8 : DOCUMENTS                                                                         */}
        {/* ============================================================================================ */}
        {activeTab === 'docs' && (
            <div className="animate-in fade-in slide-in-from-bottom-4"><div className="bg-[#6c5ce7] p-8 rounded-[30px] text-white shadow-xl flex flex-col items-center justify-center text-center border-4 border-dashed border-white/20 relative overflow-hidden group mb-6 hover:bg-[#5f27cd] cursor-pointer transition-colors"><UploadCloud size={40} className="mb-2" /><p className="font-black uppercase text-xl">Ajouter Photos / Docs</p><input type="file" onChange={handleFileUpload} disabled={uploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" /></div><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{documents.map(doc => (<div key={doc.id} className="bg-white p-3 rounded-[25px] shadow-sm h-[180px] flex flex-col relative group hover:shadow-lg transition-all border border-gray-100"><div className="flex-1 bg-gray-50 rounded-[15px] mb-2 flex items-center justify-center overflow-hidden">{doc.type === 'image' ? <img src={doc.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform"/> : <FileText size={40} className="text-gray-300"/>}</div><div className="flex justify-between items-center px-2"><p className="text-xs font-bold text-gray-600 truncate w-20">{doc.nom}</p><div className="flex gap-2"><a href={doc.url} target="_blank" className="text-gray-400 hover:text-blue-500"><Eye size={16}/></a><button onClick={() => deleteDocument(doc.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button></div></div></div>))}</div></div>
        )}

      </div>

      {/* MODALES ACQPA */}
      {showACQPAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto print:hidden">
            <div className="bg-white rounded-[30px] w-full max-w-5xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                <div className="bg-[#0984e3] p-6 text-white flex justify-between items-center shrink-0"><div><h2 className="text-2xl font-black uppercase tracking-tight">Formulaire ACQPA</h2><p className="text-blue-100 font-bold text-xs uppercase tracking-widest">Contrôle Qualité Peinture</p></div><button onClick={() => setShowACQPAModal(false)} className="bg-white/20 p-2 rounded-full hover:bg-white/40 transition-colors"><X size={24} /></button></div>
                <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                    <section><h3 className="flex items-center gap-2 font-black text-gray-800 uppercase text-lg mb-4 border-b border-gray-100 pb-2"><Thermometer className="text-[#0984e3]"/> Ambiance</h3><div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">{[{l:'Temp. Air (°C)',k:'temp_air'},{l:'Temp. Support (°C)',k:'temp_support'},{l:'Hygrométrie (%)',k:'hygrometrie'},{l:'Point Rosée (°C)',k:'point_rosee'},{l:'Delta T',k:'delta_t'}].map(f=><div key={f.k}><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">{f.l}</label><input type="number" className="w-full bg-gray-50 border border-gray-100 p-2 rounded-xl font-bold text-gray-800 text-center outline-none focus:border-[#0984e3] focus:bg-white transition-colors" value={acqpaData[f.k]||''} onChange={e=>setAcqpaData({...acqpaData,[f.k]:e.target.value})}/></div>)}</div></section>
                    <section><h3 className="flex items-center gap-2 font-black text-gray-800 uppercase text-lg mb-4 border-b border-gray-100 pb-2"><Layers className="text-[#0984e3]"/> Préparation Support</h3><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{[{l:'Degré de Soin',k:'degre_soin'},{l:'Propreté',k:'proprete'},{l:'Rugosité (µm)',k:'rugosite'},{l:'Sels Solubles',k:'sels'}].map(f=><div key={f.k}><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">{f.l}</label><input type="text" className="w-full bg-gray-50 border border-gray-100 p-2 rounded-xl font-bold text-gray-800 outline-none focus:border-[#0984e3] focus:bg-white transition-colors" value={acqpaData[f.k]||''} onChange={e=>setAcqpaData({...acqpaData,[f.k]:e.target.value})}/></div>)}</div></section>
                    <section><div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2"><h3 className="flex items-center gap-2 font-black text-gray-800 uppercase text-lg"><Droplets className="text-[#0984e3]"/> Produits & Couches</h3><button onClick={addCouche} className="flex items-center gap-1 bg-blue-50 text-[#0984e3] px-3 py-1 rounded-lg text-xs font-black uppercase hover:bg-blue-100 transition-colors"><Plus size={14}/> Ajouter</button></div><div className="space-y-4">{acqpaData.couches && acqpaData.couches.map((c:any,i:number)=>(<div key={i} className="bg-gray-50 p-4 rounded-xl relative group"><div className="absolute -top-3 left-3 bg-[#0984e3] text-white text-[10px] font-bold px-2 py-0.5 rounded">Couche {i+1}</div><button onClick={()=>removeCouche(i)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button><div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2"><div><label className="text-[9px] font-bold text-gray-400 uppercase">Type</label><input className="w-full bg-white border border-gray-200 p-2 rounded-lg font-bold" value={c.type} onChange={e=>updateCouche(i,'type',e.target.value)}/></div><div><label className="text-[9px] font-bold text-gray-400 uppercase">Lot</label><input className="w-full bg-white border border-gray-200 p-2 rounded-lg font-bold" value={c.lot} onChange={e=>updateCouche(i,'lot',e.target.value)}/></div><div><label className="text-[9px] font-bold text-gray-400 uppercase">Méthode</label><input className="w-full bg-white border border-gray-200 p-2 rounded-lg font-bold" value={c.methode} onChange={e=>updateCouche(i,'methode',e.target.value)}/></div><div><label className="text-[9px] font-bold text-gray-400 uppercase">Dilution</label><input type="number" className="w-full bg-white border border-gray-200 p-2 rounded-lg font-bold" value={c.dilution} onChange={e=>updateCouche(i,'dilution',e.target.value)}/></div></div></div>))}</div><div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6"><div className="col-span-2 md:col-span-1"><label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Date Appli</label><input type="date" className="w-full bg-gray-50 p-2 rounded-xl font-bold text-gray-800 outline-none border border-gray-100 focus:border-[#0984e3]" value={acqpaData.app_date || ''} onChange={e => setAcqpaData({...acqpaData, app_date: e.target.value})} /></div><div className="col-span-2 md:col-span-1"><label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Applicateur</label><input className="w-full bg-gray-50 p-2 rounded-xl font-bold text-gray-800 outline-none border border-gray-100 focus:border-[#0984e3]" value={acqpaData.app_nom || ''} onChange={e => setAcqpaData({...acqpaData, app_nom: e.target.value})} /></div><div><label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">DFT Théorique (µm)</label><input type="number" className="w-full bg-gray-50 p-2 rounded-xl font-bold text-center text-gray-800 outline-none border border-gray-100 focus:border-[#0984e3]" value={acqpaData.dft_theo || ''} onChange={e => setAcqpaData({...acqpaData, dft_theo: e.target.value})} /></div></div></section>
                    <section><h3 className="flex items-center gap-2 font-black text-gray-800 uppercase text-lg mb-4 border-b border-gray-100 pb-2"><Ruler className="text-[#0984e3]"/> Contrôles Finaux</h3><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">{[{l:'Ep. Humide',k:'ep_humide'},{l:'Ep. Sèche',k:'dft_mesure'},{l:'Adhérence',k:'adherence'},{l:'Défauts',k:'defauts',t:'text'},{l:'Retouches',k:'retouches',t:'text'}].map(f=><div key={f.k}><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">{f.l}</label><input type={f.t||'number'} className="w-full bg-gray-50 border border-gray-100 p-2 rounded-xl font-bold text-gray-800 text-center outline-none focus:border-[#0984e3] focus:bg-white transition-colors" value={acqpaData[f.k]||''} onChange={e=>setAcqpaData({...acqpaData,[f.k]:e.target.value})}/></div>)}</div></section>
                </div>
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-4"><button onClick={()=>{setShowACQPAModal(false);handleSave()}} className="bg-[#0984e3] text-white px-8 py-3 rounded-xl font-black uppercase shadow-lg hover:scale-105 transition-transform">Enregistrer & Fermer</button></div>
            </div>
        </div>
      )}

      {/* MODALE AJOUT MATÉRIEL */}
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
