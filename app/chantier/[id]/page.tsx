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
  Euro, HardHat, Briefcase, Zap, MapPin, Calculator, Wallet, Receipt, DollarSign
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
    // Financier - Prévisionnel
    montant_marche: 0, 
    budget_euro: 0, // Budget MO Prévu
    taux_horaire_moyen: 45, 
    cpi: 0, // Coût Production Indirect
    cout_fournitures_prevu: 0,
    cout_sous_traitance_prevu: 0,
    cout_location_prevu: 0,
    frais_generaux: 0, // Prévu
    // Financier - Réel
    cout_fournitures_reel: 0,
    cout_sous_traitance_reel: 0,
    cout_location_reel: 0,
    frais_generaux_reel: 0,
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
                // Financier
                montant_marche: c.montant_marche || 0,
                budget_euro: c.budget_euro || 0, 
                taux_horaire_moyen: c.taux_horaire_moyen || 45,
                cpi: c.cpi || 0,
                cout_fournitures_prevu: c.cout_fournitures_prevu || 0,
                cout_sous_traitance_prevu: c.cout_sous_traitance_prevu || 0,
                cout_location_prevu: c.cout_location_prevu || 0,
                frais_generaux: c.frais_generaux || 0,
                // Réels
                cout_fournitures_reel: c.cout_fournitures_reel || 0,
                cout_sous_traitance_reel: c.cout_sous_traitance_reel || 0,
                cout_location_reel: c.cout_location_reel || 0,
                frais_generaux_reel: c.frais_generaux_reel || 0,
                statut: c.statut || 'en_cours', risques: c.risques || [], epi: c.epi || [],
                mesures_acqpa: c.mesures_acqpa || {}, type_precision: c.type_precision || '',
                client_email: c.client_email || '', client_telephone: c.client_telephone || ''
            });
            const currentAcqpa = c.mesures_acqpa || {};
            if (!currentAcqpa.couches) currentAcqpa.couches = [{ type: '', lot: '', methode: '', dilution: '' }];
            setAcqpaData(currentAcqpa);
            setNewMat(prev => ({...prev, date_debut: c.date_debut || '', date_fin: c.date_fin || ''}));
        }
        if (results[2].status === 'fulfilled' && results[2].value.data) setTasks(results[2].value.data.map((task: any) => ({ ...task, subtasks: Array.isArray(task.subtasks) ? task.subtasks : [] })));
        if (results[3].status === 'fulfilled' && results[3].value.data) setDocuments(results[3].value.data);
        if (results[4].status === 'fulfilled' && results[4].value.data) setMaterielPrevu(results[4].value.data);
        if (results[5].status === 'fulfilled' && results[5].value.data) setFournituresPrevu(results[5].value.data);
        if (results[6].status === 'fulfilled' && results[6].value.data) setCatalogueMateriel(results[6].value.data);
        if (results[7].status === 'fulfilled' && results[7].value.data) setStockFournitures(results[7].value.data);
    } catch (error: any) { console.error("Erreur chargement:", error); } finally { setLoading(false); }
  };

  useEffect(() => { fetchChantierData(); }, [id]);

  // --- ACTIONS & SAUVEGARDE ---
  const updateChantierTotalHours = async (currentTasks: any[]) => {
    const totalRealConsumed = currentTasks.filter(t => t.done).reduce((sum, t) => sum + (parseFloat(t.heures_reelles) || t.objectif_heures || 0), 0);
    await supabase.from('chantiers').update({ heures_consommees: totalRealConsumed }).eq('id', id);
    setChantier((prev: any) => ({ ...prev, heures_consommees: totalRealConsumed }));
  };

  const handleSave = async () => {
    const toSave = { 
        ...chantier, mesures_acqpa: acqpaData, responsable: chantier.responsable || null,
        // Sauvegarde Financière Complète
        montant_marche: chantier.montant_marche,
        cout_fournitures_prevu: chantier.cout_fournitures_prevu,
        cout_sous_traitance_prevu: chantier.cout_sous_traitance_prevu,
        cout_location_prevu: chantier.cout_location_prevu,
        frais_generaux: chantier.frais_generaux,
        taux_horaire_moyen: chantier.taux_horaire_moyen,
        cpi: chantier.cpi,
        budget_euro: chantier.budget_euro,
        // Sauvegarde des Réels
        cout_fournitures_reel: chantier.cout_fournitures_reel,
        cout_sous_traitance_reel: chantier.cout_sous_traitance_reel,
        cout_location_reel: chantier.cout_location_reel,
        frais_generaux_reel: chantier.frais_generaux_reel
    };
    const { error } = await supabase.from('chantiers').update(toSave).eq('id', id);
    if (error) alert("Erreur : " + error.message); else { alert('✅ Données financières mises à jour !'); fetchChantierData(); }
  };

  // --- CALCULS KPI FINANCIERS ---
  const percentHeures = chantier.heures_budget > 0 ? Math.round((chantier.heures_consommees / chantier.heures_budget) * 100) : 0;
  
  // 1. Coûts Main d'Oeuvre
  const coutMO_Prevu = chantier.budget_euro || (chantier.heures_budget * chantier.taux_horaire_moyen);
  const coutMO_Reel = chantier.heures_consommees * chantier.taux_horaire_moyen;
  const coutMO_Reel_Total = coutMO_Reel + (chantier.heures_consommees * chantier.cpi); // MO + CPI

  // 2. Coûts Directs Totaux
  const coutDirect_Prevu = coutMO_Prevu + chantier.cout_fournitures_prevu + chantier.cout_sous_traitance_prevu + chantier.cout_location_prevu;
  const coutDirect_Reel = coutMO_Reel + chantier.cout_fournitures_reel + chantier.cout_sous_traitance_reel + chantier.cout_location_reel;

  // 3. Marge Brute
  const margeBrute = chantier.montant_marche - coutDirect_Reel;
  const tauxMargeBrute = chantier.montant_marche > 0 ? (margeBrute / chantier.montant_marche) * 100 : 0;

  // 4. Marge Nette (Avec Frais Généraux + CPI Impact)
  // CPI est déjà inclus dans coutMO_Reel_Total si on veut le voir comme un coût de production
  // Ou on peut l'ajouter ici.
  // Formule standard : Marge Nette = Prix Vente - (Coût Directs + Frais Généraux + CPI global)
  const totalCoutComplet = coutDirect_Reel + chantier.frais_generaux_reel + (chantier.heures_consommees * chantier.cpi);
  const margeNette = chantier.montant_marche - totalCoutComplet;
  const tauxMargeNette = chantier.montant_marche > 0 ? (margeNette / chantier.montant_marche) * 100 : 0;

  // Helpers Gestion Tâches
  const updateTaskField = async (taskId: string, field: string, value: any) => { const { error } = await supabase.from('chantier_tasks').update({ [field]: value }).eq('id', taskId); if (!error) { const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, [field]: value } : t); setTasks(updatedTasks); if (field === 'heures_reelles' || field === 'done') updateChantierTotalHours(updatedTasks); } };
  const toggleTask = async (task: any) => { const newStatus = !task.done; const realHoursValue = newStatus ? (task.heures_reelles || task.objectif_heures) : 0; const updatedSubtasks = (task.subtasks || []).map((st: any) => ({ ...st, done: newStatus })); const { error } = await supabase.from('chantier_tasks').update({ done: newStatus, heures_reelles: realHoursValue, subtasks: updatedSubtasks }).eq('id', task.id); if (!error) { const newTasks = tasks.map(t => t.id === task.id ? { ...t, done: newStatus, heures_reelles: realHoursValue, subtasks: updatedSubtasks } : t); setTasks(newTasks); updateChantierTotalHours(newTasks); } };
  const addSubTask = async (parentId: string) => { if(!newSubTask.label) return; const parentTask = tasks.find(t => t.id === parentId); const updatedSubtasks = [...(parentTask.subtasks || []), { id: Date.now(), label: newSubTask.label, heures: parseFloat(newSubTask.heures.toString()) || 0, effectif: parseInt(newSubTask.effectif.toString()) || 1, date: newSubTask.date, done: false }]; const newTotalHours = updatedSubtasks.reduce((acc, curr) => acc + (parseFloat(curr.heures) || 0), 0); await supabase.from('chantier_tasks').update({ subtasks: updatedSubtasks, objectif_heures: newTotalHours }).eq('id', parentId); const newTasks = tasks.map(t => t.id === parentId ? { ...t, subtasks: updatedSubtasks, objectif_heures: newTotalHours } : t); setTasks(newTasks); setNewSubTask({ label: '', heures: 0, date: '', effectif: 1 }); setActiveParentTask(null); };
  const toggleSubTask = async (parentId: string, subtaskId: number) => { const parentTask = tasks.find(t => t.id === parentId); const updatedSubtasks = parentTask.subtasks.map((st: any) => st.id === subtaskId ? { ...st, done: !st.done } : st); const allDone = updatedSubtasks.every((st: any) => st.done); const { error } = await supabase.from('chantier_tasks').update({ subtasks: updatedSubtasks, done: allDone, heures_reelles: allDone ? (parentTask.heures_reelles || parentTask.objectif_heures) : parentTask.heures_reelles }).eq('id', parentId); if (!error) { const newTasks = tasks.map(t => t.id === parentId ? { ...t, subtasks: updatedSubtasks, done: allDone } : t); setTasks(newTasks); updateChantierTotalHours(newTasks); } };
  const addTask = async () => { if (!newTaskLabel) return; const { data } = await supabase.from('chantier_tasks').insert([{ chantier_id: id, label: newTaskLabel, objectif_heures: 0, heures_reelles: 0, done: false, subtasks: [] }]).select(); if (data) setTasks([data[0], ...tasks]); setNewTaskLabel(""); };
  const deleteTask = async (taskId: string) => { if(confirm('Supprimer ?')) { await supabase.from('chantier_tasks').delete().eq('id', taskId); const updatedList = tasks.filter(t => t.id !== taskId); setTasks(updatedList); updateChantierTotalHours(updatedList); } };
  
  // Helpers Logistique
  const addFourniture = async () => { if(!newFourniture.fourniture_ref_id) return alert("Sélectionnez un produit"); const payload = { chantier_id: id, fourniture_ref_id: newFourniture.fourniture_ref_id, qte_prevue: newFourniture.qte_prevue || 0, qte_consommee: 0 }; const { error } = await supabase.from('chantier_fournitures').insert([payload]); if(error) alert("Erreur: " + error.message); else { setNewFourniture({ fourniture_ref_id: '', qte_prevue: 0 }); setSupplySearch(""); fetchChantierData(); } };
  const updateConsommation = async (fId: string, val: number) => { const newVal = Math.max(0, val); setFournituresPrevu(prev => prev.map(f => f.id === fId ? { ...f, qte_consommee: newVal } : f)); await supabase.from('chantier_fournitures').update({ qte_consommee: newVal }).eq('id', fId); };
  const deleteFourniture = async (fId: string) => { if(confirm("Supprimer ?")) { await supabase.from('chantier_fournitures').delete().eq('id', fId); fetchChantierData(); } };
  const handleAddMateriel = async () => { if (!newMat.materiel_id) return alert("Sélectionnez un matériel"); const { error } = await supabase.from('chantier_materiel').insert([{ chantier_id: id, materiel_id: newMat.materiel_id, date_debut: newMat.date_debut || null, date_fin: newMat.date_fin || null, qte_prise: newMat.qte || 1, statut: 'prevu' }]); if (!error) { setShowAddMaterielModal(false); fetchChantierData(); }};
  const deleteMateriel = async (matId: string) => { if (confirm('Supprimer ?')) { await supabase.from('chantier_materiel').delete().eq('id', matId); fetchChantierData(); } };
  
  // Helpers Autres
  const handlePrint = () => { window.print(); };
  const getSelectedUnit = () => { const selected = stockFournitures.find(s => s.id === newFourniture.fourniture_ref_id); return selected ? selected.unite : ''; };
  const filteredStock = stockFournitures.filter(s => s.nom.toLowerCase().includes(supplySearch.toLowerCase()) || (s.ral && s.ral.includes(supplySearch)));
  const addCouche = () => setAcqpaData({ ...acqpaData, couches: [...(acqpaData.couches || []), { type: '', lot: '', methode: '', dilution: '' }] });
  const removeCouche = (index: number) => { const n = [...acqpaData.couches]; n.splice(index, 1); setAcqpaData({ ...acqpaData, couches: n }); };
  const updateCouche = (index: number, field: string, value: string) => { const n = [...acqpaData.couches]; n[index][field] = value; setAcqpaData({ ...acqpaData, couches: n }); };
  const toggleArrayItem = (field: 'risques' | 'epi', value: string) => { const current = chantier[field] || []; setChantier({ ...chantier, [field]: current.includes(value) ? current.filter((i: string) => i !== value) : [...current, value] }); };
  const deleteDocument = async (docId: string) => { if(confirm('Supprimer ?')) { await supabase.from('chantier_documents').delete().eq('id', docId); fetchChantierData(); } };
  const handleFileUpload = async (e: any) => { if (!e.target.files?.length) return; setUploading(true); const file = e.target.files[0]; const filePath = `${id}/${Math.random()}.${file.name.split('.').pop()}`; const { error } = await supabase.storage.from('documents').upload(filePath, file); if(!error) { const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath); await supabase.from('chantier_documents').insert([{ chantier_id: id, nom: file.name, url: publicUrl, type: file.type.startsWith('image/') ? 'image' : 'pdf' }]); fetchChantierData(); } setUploading(false); };

  if (loading) return <div className="h-screen flex items-center justify-center font-['Fredoka'] text-[#34495e] font-bold"><div className="animate-spin mr-3"><Truck/></div> Chargement...</div>;
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
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Rentabilité : <span className={tauxMargeNette >= 0 ? "text-emerald-500" : "text-red-500"}>{tauxMargeNette.toFixed(1)}%</span></p>
                </div>
            </div>
            <button onClick={handleSave} className="bg-[#00b894] hover:bg-[#00a383] text-white px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-200 transition-all hover:scale-105 active:scale-95 font-bold uppercase flex items-center gap-2"><Save size={18} /> Sauvegarder</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 print:max-w-none print:p-2">
        
        {/* NAV BAR */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar print:hidden">
            {[
                { id: 'suivi', label: 'Dashboard Financier', icon: PieChart, color: 'bg-[#00b894]' },
                { id: 'infos', label: 'Infos & Budget', icon: FileText, color: 'bg-[#34495e]' },
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

        {/* --- DASHBOARD FINANCIER & SUIVI (Onglet Principal) --- */}
        {activeTab === 'suivi' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 print:space-y-4">
                
                {/* Header Impression */}
                <div className="flex justify-between items-end border-b border-gray-200 pb-4 mb-6">
                    <div>
                        <h2 className="text-3xl font-black uppercase text-[#2d3436] tracking-tight">Bilan Financier & Rentabilité</h2>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{chantier.nom} — {chantier.type} — {new Date().toLocaleDateString()}</p>
                    </div>
                    <button onClick={handlePrint} className="bg-[#2d3436] text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold uppercase text-xs shadow-lg print:hidden hover:scale-105 transition-transform"><Printer size={18}/> Imprimer Rapport</button>
                </div>

                {/* 1. GRILLE DE SAISIE RAPIDE (Input Réels) - UNIQUEMENT SUR DASHBOARD */}
                <div className="bg-[#f8f9fa] border border-dashed border-gray-300 p-4 rounded-2xl print:hidden">
                    <h4 className="text-xs font-black uppercase text-gray-500 mb-3 flex items-center gap-2"><Calculator size={14}/> Saisie Rapide des Coûts Réels</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div><label className="text-[9px] font-bold text-gray-400 uppercase">Taux Horaire + CPI</label><div className="flex gap-1"><input type="number" className="w-full bg-white p-2 rounded-lg text-xs font-bold border border-gray-200" value={chantier.taux_horaire_moyen} onChange={e => setChantier({...chantier, taux_horaire_moyen: parseFloat(e.target.value)||0})} placeholder="Taux" /><input type="number" className="w-full bg-white p-2 rounded-lg text-xs font-bold border border-gray-200" value={chantier.cpi} onChange={e => setChantier({...chantier, cpi: parseFloat(e.target.value)||0})} placeholder="CPI" /></div></div>
                        <div><label className="text-[9px] font-bold text-gray-400 uppercase">Matériaux Réel</label><input type="number" className="w-full bg-white p-2 rounded-lg text-xs font-bold border border-gray-200" value={chantier.cout_fournitures_reel} onChange={e => setChantier({...chantier, cout_fournitures_reel: parseFloat(e.target.value)||0})} /></div>
                        <div><label className="text-[9px] font-bold text-gray-400 uppercase">Sous-Traitance Réel</label><input type="number" className="w-full bg-white p-2 rounded-lg text-xs font-bold border border-gray-200" value={chantier.cout_sous_traitance_reel} onChange={e => setChantier({...chantier, cout_sous_traitance_reel: parseFloat(e.target.value)||0})} /></div>
                        <div><label className="text-[9px] font-bold text-gray-400 uppercase">Location Réel</label><input type="number" className="w-full bg-white p-2 rounded-lg text-xs font-bold border border-gray-200" value={chantier.cout_location_reel} onChange={e => setChantier({...chantier, cout_location_reel: parseFloat(e.target.value)||0})} /></div>
                        <div><label className="text-[9px] font-bold text-gray-400 uppercase">Frais Généraux Réel</label><input type="number" className="w-full bg-white p-2 rounded-lg text-xs font-bold border border-gray-200" value={chantier.frais_generaux_reel} onChange={e => setChantier({...chantier, frais_generaux_reel: parseFloat(e.target.value)||0})} /></div>
                    </div>
                </div>

                {/* 2. KPI FINANCIERS MAJEURS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
                    {/* Montant Marché */}
                    <div className="bg-white p-5 rounded-[25px] shadow-sm border border-gray-100 relative overflow-hidden group print:border-gray-300">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-blue-600"><Receipt size={50}/></div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Montant Marché</p>
                        <div className="text-3xl font-black text-[#2d3436] mt-1">{chantier.montant_marche.toLocaleString()} €</div>
                        <div className="mt-2 text-xs font-bold text-blue-500">Facturé au client</div>
                    </div>

                    {/* Marge Brute */}
                    <div className="bg-white p-5 rounded-[25px] shadow-sm border border-gray-100 relative overflow-hidden group print:border-gray-300">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-600"><Wallet size={50}/></div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Marge Brute</p>
                        <div className={`text-3xl font-black mt-1 ${margeBrute >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{margeBrute.toLocaleString()} €</div>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black">{tauxMargeBrute.toFixed(1)}%</span>
                        </div>
                    </div>

                    {/* Marge Nette */}
                    <div className="bg-white p-5 rounded-[25px] shadow-sm border border-gray-100 relative overflow-hidden group print:border-gray-300">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-purple-600"><Target size={50}/></div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Marge Nette</p>
                        <div className={`text-3xl font-black mt-1 ${margeNette >= 0 ? 'text-purple-600' : 'text-red-500'}`}>{margeNette.toLocaleString()} €</div>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-black">{tauxMargeNette.toFixed(1)}%</span>
                            <span className="text-[9px] font-bold text-gray-400">Après CPI & Frais</span>
                        </div>
                    </div>

                    {/* Budget MO */}
                    <div className="bg-white p-5 rounded-[25px] shadow-sm border border-gray-100 relative overflow-hidden group print:border-gray-300">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-orange-500"><HardHat size={50}/></div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Budget M.O.</p>
                        <div className="text-3xl font-black text-orange-500 mt-1">{coutMOReel.toLocaleString()} €</div>
                        <p className="text-[10px] font-bold text-gray-400 mt-1">Sur {coutMOPrevu.toLocaleString()} € prévu</p>
                    </div>
                </div>

                {/* 3. GRAPHIQUES DE DELTA (BUDGET vs RÉEL) */}
                <div className="bg-white rounded-[30px] p-8 shadow-sm border border-gray-100 print:shadow-none print:border-gray-300 no-break">
                    <h3 className="font-black uppercase text-gray-700 mb-6 flex items-center gap-2"><PieChart className="text-[#6c5ce7]"/> Comparatif Coûts (Prévu vs Réel)</h3>
                    <div className="space-y-6">
                        {/* Main d'Oeuvre */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs font-bold uppercase">
                                <span className="text-gray-600 flex items-center gap-2"><Users size={14}/> Main d'Oeuvre</span>
                                <span className={coutMOReel > coutMOPrevu ? 'text-red-500' : 'text-emerald-600'}>{coutMOReel.toLocaleString()}€ / {coutMOPrevu.toLocaleString()}€</span>
                            </div>
                            <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden flex relative">
                                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-black/10 z-10"></div>
                                <div className="h-full bg-blue-300" style={{width: '50%'}}></div>
                                <div className={`h-full ${coutMOReel > coutMOPrevu ? 'bg-red-400' : 'bg-emerald-400'}`} style={{width: `${Math.min(50, (coutMOReel / Math.max(1, coutMOPrevu)) * 50)}%`}}></div>
                            </div>
                        </div>
                        {/* Matériaux */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs font-bold uppercase">
                                <span className="text-gray-600 flex items-center gap-2"><Package size={14}/> Matériaux / Fournitures</span>
                                <span className={chantier.cout_fournitures_reel > chantier.cout_fournitures_prevu ? 'text-red-500' : 'text-emerald-600'}>{chantier.cout_fournitures_reel.toLocaleString()}€ / {chantier.cout_fournitures_prevu.toLocaleString()}€</span>
                            </div>
                            <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden flex relative">
                                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-black/10 z-10"></div>
                                <div className="h-full bg-blue-300" style={{width: '50%'}}></div>
                                <div className={`h-full ${chantier.cout_fournitures_reel > chantier.cout_fournitures_prevu ? 'bg-red-400' : 'bg-emerald-400'}`} style={{width: `${Math.min(50, (chantier.cout_fournitures_reel / Math.max(1, chantier.cout_fournitures_prevu)) * 50)}%`}}></div>
                            </div>
                        </div>
                        {/* Sous-traitance */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs font-bold uppercase">
                                <span className="text-gray-600 flex items-center gap-2"><Briefcase size={14}/> Sous-Traitance</span>
                                <span className={chantier.cout_sous_traitance_reel > chantier.cout_sous_traitance_prevu ? 'text-red-500' : 'text-emerald-600'}>{chantier.cout_sous_traitance_reel.toLocaleString()}€ / {chantier.cout_sous_traitance_prevu.toLocaleString()}€</span>
                            </div>
                            <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden flex relative">
                                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-black/10 z-10"></div>
                                <div className="h-full bg-blue-300" style={{width: '50%'}}></div>
                                <div className={`h-full ${chantier.cout_sous_traitance_reel > chantier.cout_sous_traitance_prevu ? 'bg-red-400' : 'bg-emerald-400'}`} style={{width: `${Math.min(50, (chantier.cout_sous_traitance_reel / Math.max(1, chantier.cout_sous_traitance_prevu)) * 50)}%`}}></div>
                            </div>
                        </div>
                        {/* Locations */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs font-bold uppercase">
                                <span className="text-gray-600 flex items-center gap-2"><Truck size={14}/> Location Matériel</span>
                                <span className={chantier.cout_location_reel > chantier.cout_location_prevu ? 'text-red-500' : 'text-emerald-600'}>{chantier.cout_location_reel.toLocaleString()}€ / {chantier.cout_location_prevu.toLocaleString()}€</span>
                            </div>
                            <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden flex relative">
                                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-black/10 z-10"></div>
                                <div className="h-full bg-blue-300" style={{width: '50%'}}></div>
                                <div className={`h-full ${chantier.cout_location_reel > chantier.cout_location_prevu ? 'bg-red-400' : 'bg-emerald-400'}`} style={{width: `${Math.min(50, (chantier.cout_location_reel / Math.max(1, chantier.cout_location_prevu)) * 50)}%`}}></div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        )}
        {/* --- ONGLET 1 : INFOS (AVEC SAISIE DES BUDGETS) --- */}
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
                    
                    {/* SAISIE DU BUDGET FINANCIER */}
                    <div className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-100 space-y-4">
                        <h3 className="font-black uppercase text-gray-700 mb-4 flex items-center gap-2"><Euro size={20}/> Budgets Prévisionnels (HT)</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                                <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Montant Marché (Vente)</label>
                                <input type="number" value={chantier.montant_marche || 0} onChange={e => setChantier({...chantier, montant_marche: parseFloat(e.target.value) || 0})} className="w-full bg-transparent p-2 font-black text-xl text-emerald-800 outline-none" />
                            </div>
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Budget Matériaux</label><input type="number" value={chantier.cout_fournitures_prevu || 0} onChange={e => setChantier({...chantier, cout_fournitures_prevu: parseFloat(e.target.value) || 0})} className="w-full bg-gray-50 p-2 rounded-lg font-bold text-sm outline-none" /></div>
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Budget Sous-Traitance</label><input type="number" value={chantier.cout_sous_traitance_prevu || 0} onChange={e => setChantier({...chantier, cout_sous_traitance_prevu: parseFloat(e.target.value) || 0})} className="w-full bg-gray-50 p-2 rounded-lg font-bold text-sm outline-none" /></div>
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Budget Location</label><input type="number" value={chantier.cout_location_prevu || 0} onChange={e => setChantier({...chantier, cout_location_prevu: parseFloat(e.target.value) || 0})} className="w-full bg-gray-50 p-2 rounded-lg font-bold text-sm outline-none" /></div>
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Frais Généraux (Prévu)</label><input type="number" value={chantier.frais_generaux || 0} onChange={e => setChantier({...chantier, frais_generaux: parseFloat(e.target.value) || 0})} className="w-full bg-gray-50 p-2 rounded-lg font-bold text-sm outline-none" /></div>
                        </div>
                    </div>
                </div>

                {/* TACHES & PLANNING */}
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

        {/* --- AUTRES ONGLETS (LOGISTIQUE, ETC.) --- */}
        {activeTab === 'logistique' && (
            <div className="animate-in fade-in slide-in-from-bottom-4"><div className="flex justify-between items-center mb-6 print:hidden"><h3 className="text-xl font-black text-gray-700 uppercase flex items-center gap-2"><Truck className="text-[#6c5ce7]"/> Matériel & Locations</h3><button onClick={() => setShowAddMaterielModal(true)} className="bg-[#6c5ce7] text-white px-6 py-2.5 rounded-xl font-bold uppercase text-xs shadow-lg hover:bg-[#5b4bc4] transition-all flex items-center gap-2"><Plus size={16}/> Ajouter / Réserver</button></div><div className="bg-white rounded-[30px] p-1 shadow-sm border border-gray-100 overflow-hidden print:border-none print:shadow-none"><table className="w-full"><thead className="bg-gray-50 border-b border-gray-100"><tr><th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase">Matériel</th><th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase">Type</th><th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase">Période</th><th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase">Quantité</th><th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase print:hidden">Action</th></tr></thead><tbody className="divide-y divide-gray-50">{materielPrevu.map(m => (<tr key={m.id} className="hover:bg-gray-50 transition-colors"><td className="p-4 font-bold text-sm text-gray-800">{m.materiel?.nom}</td><td className="p-4"><span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${m.materiel?.type_stock === 'Interne' ? 'bg-gray-100 text-gray-500' : 'bg-purple-100 text-purple-600'}`}>{m.materiel?.type_stock}</span></td><td className="p-4 text-xs font-bold text-gray-600">{m.date_debut} ➔ {m.date_fin}</td><td className="p-4 text-center font-black text-gray-800">{m.qte_prise}</td><td className="p-4 text-center print:hidden"><button onClick={() => deleteMateriel(m.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button></td></tr>))}</tbody></table></div></div>
        )}
        
        {/* MODALES */}
        {showACQPAModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto print:hidden">
            <div className="bg-white rounded-[30px] w-full max-w-5xl shadow-2xl p-8 custom-scrollbar">
                <div className="flex justify-between mb-4"><h2>ACQPA</h2><button onClick={() => setShowACQPAModal(false)}><X/></button></div>
                {/* Contenu ACQPA Simplifié pour l'exemple (gardez votre version complète) */}
                <p>Contenu ACQPA</p>
            </div>
          </div>
        )}
        
        {showAddMaterielModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:hidden">
              <div className="bg-white rounded-[30px] w-full max-w-md shadow-2xl p-6">
                  <h3>Ajouter Matériel</h3>
                  <div className="mt-4 space-y-4">
                      <select className="w-full bg-gray-50 p-3 rounded" onChange={e => setNewMat({...newMat, materiel_id: e.target.value})}><option>Choisir...</option>{catalogueMateriel.map(m=><option key={m.id} value={m.id}>{m.nom}</option>)}</select>
                      <button onClick={handleAddMateriel} className="bg-blue-500 text-white px-4 py-2 rounded w-full">Valider</button>
                      <button onClick={()=>setShowAddMaterielModal(false)} className="text-gray-500 w-full mt-2">Annuler</button>
                  </div>
              </div>
          </div>
        )}

    </div>
  );
}
