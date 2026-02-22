"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, Save, FileText, UploadCloud, X, Eye, Trash2, AlertTriangle, Shield, CheckSquare, 
  Thermometer, Droplets, Layers, Ruler, ClipboardCheck, FolderOpen, Calendar, MonitorPlay, 
  CheckCircle2, Circle, Clock, Plus, Minus, Users, Percent, Truck, Package, Wrench, Mail, 
  Phone, BarChart2, CornerDownRight, AlertCircle, UserPlus, Palette, Box, AlertOctagon, 
  Search, TrendingUp, TrendingDown, UserCheck, Scale, Printer, PieChart, Target, 
  Euro, HardHat, Briefcase, Zap, MapPin, Calculator, Wallet, Receipt, Hash, Check, LayoutDashboard,
  CreditCard, FileCheck, CalendarClock, BellRing, Pencil
} from 'lucide-react';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

// --- CONSTANTES ---
const RISK_OPTIONS = ['Amiante', 'Plomb', 'Silice', 'ATEX', 'Hauteur', 'Levage', 'Confiné', 'Électrique', 'Chimique', 'Coactivité'];
const EPI_OPTIONS = ['Casque', 'Harnais', 'Chaussures de sécurité', 'Combinaison', 'Protections respiratoires', 'Gants', 'Protections auditives', 'Lunettes', 'Masque ventilé', 'Gilet haute visibilité'];

// --- INTERFACES ---
interface IChantier {
  id?: string; nom: string; client: string; adresse: string; client_email: string; client_telephone: string;
  numero_otp: string; responsable: string; chef_chantier_id: string; equipe_ids: string[];
  date_debut: string; date_fin: string; type: string; statut: string;
  heures_budget: number; heures_consommees: number; effectif_prevu: number; taux_reussite: number; 
  montant_marche: number; taux_horaire_moyen: number; cpi: number;
  cout_fournitures_prevu: number; cout_sous_traitance_prevu: number; cout_location_prevu: number; frais_generaux: number;
  cout_fournitures_reel: number; cout_sous_traitance_reel: number; cout_location_reel: number; frais_generaux_reel: number;
  risques: string[]; epi: string[]; mesures_obligatoires: boolean; mesures_acqpa?: any;
}

// --- HOOK MÉTIER (DATA & API) ---
function useChantierData(id: string) {
  const [loading, setLoading] = useState(true);
  const [chantier, setChantier] = useState<IChantier>({
    nom: '', client: '', adresse: '', client_email: '', client_telephone: '', numero_otp: '', responsable: '', chef_chantier_id: '', equipe_ids: [],
    date_debut: '', date_fin: '', type: 'Industriel', statut: 'en_cours', heures_budget: 0, heures_consommees: 0, effectif_prevu: 0, taux_reussite: 100, 
    montant_marche: 0, taux_horaire_moyen: 24, cpi: 19, cout_fournitures_prevu: 0, cout_sous_traitance_prevu: 0, cout_location_prevu: 0, frais_generaux: 0,
    cout_fournitures_reel: 0, cout_sous_traitance_reel: 0, cout_location_reel: 0, frais_generaux_reel: 0, risques: [], epi: [], mesures_obligatoires: false
  });
  
  const [acqpaData, setAcqpaData] = useState<any>({ couches: [{ type: '', lot: '', methode: '', dilution: '' }] });
  const [tasks, setTasks] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [employes, setEmployes] = useState<any[]>([]); 
  const [materielPrevu, setMaterielPrevu] = useState<any[]>([]); 
  const [fournituresPrevu, setFournituresPrevu] = useState<any[]>([]);
  const [catalogueMateriel, setCatalogueMateriel] = useState<any[]>([]);
  const [stockFournitures, setStockFournitures] = useState<any[]>([]); 
  const [facturationList, setFacturationList] = useState<any[]>([]);

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
            supabase.from('fournitures_stock').select('*').order('nom'),
            supabase.from('chantier_facturation').select('*').eq('chantier_id', id).order('date_echeance', { ascending: true }) 
        ]);

        if (results[0].status === 'fulfilled' && results[0].value.data) setEmployes(results[0].value.data);
        if (results[1].status === 'fulfilled' && results[1].value.data) {
            const c = results[1].value.data;
            setChantier({
                ...c, date_debut: c.date_debut || '', date_fin: c.date_fin || '', effectif_prevu: c.effectif_prevu || 0, taux_reussite: c.taux_reussite ?? 100,
                montant_marche: c.montant_marche || 0, taux_horaire_moyen: c.taux_horaire_moyen || 24, cpi: c.cpi || 19,
                risques: c.risques || [], epi: c.epi || [], mesures_obligatoires: c.mesures_obligatoires || false
            });
            const currentAcqpa = c.mesures_acqpa || {};
            if (!currentAcqpa.couches) currentAcqpa.couches = [{ type: '', lot: '', methode: '', dilution: '' }];
            setAcqpaData(currentAcqpa);
        }
        if (results[2].status === 'fulfilled' && results[2].value.data) setTasks(results[2].value.data.map((task: any) => ({ ...task, subtasks: Array.isArray(task.subtasks) ? task.subtasks : [] })));
        if (results[3].status === 'fulfilled' && results[3].value.data) setDocuments(results[3].value.data);
        if (results[4].status === 'fulfilled' && results[4].value.data) setMaterielPrevu(results[4].value.data);
        if (results[5].status === 'fulfilled' && results[5].value.data) setFournituresPrevu(results[5].value.data);
        if (results[6].status === 'fulfilled' && results[6].value.data) setCatalogueMateriel(results[6].value.data);
        if (results[7].status === 'fulfilled' && results[7].value.data) setStockFournitures(results[7].value.data);
        if (results[8].status === 'fulfilled' && results[8].value.data) setFacturationList(results[8].value.data);
    } catch (error: any) { console.error("Erreur chargement:", error); toast.error("Erreur lors du chargement des données"); } finally { setLoading(false); }
  };

  useEffect(() => { fetchChantierData(); }, [id]);

  const finances = useMemo(() => {
    const tauxCharge = (chantier.taux_horaire_moyen || 0) + (chantier.cpi || 0);
    const tsValides = facturationList.filter((f: any) => (f.type === 'TS' || f.type === 'PlusValue') && f.statut !== 'prevu');
    const mvValides = facturationList.filter((f: any) => f.type === 'MoinsValue' && f.statut !== 'prevu');
    const totalTS = tsValides.reduce((acc: number, f: any) => acc + (f.montant || 0), 0);
    const totalMoinsValues = mvValides.reduce((acc: number, f: any) => acc + (f.montant || 0), 0);
    const montantMarcheInitial = chantier.montant_marche || 0;
    const montantMarcheActif = montantMarcheInitial + totalTS - totalMoinsValues;

    const facturesEnvoyees = facturationList.filter((f: any) => (f.type === 'Facture' || f.type === 'Acompte' || f.type === 'Solde') && f.statut !== 'prevu');
    const totalFacture = facturesEnvoyees.reduce((acc: number, f: any) => acc + (f.montant || 0), 0);
    const facturesPayees = facturationList.filter((f: any) => f.statut === 'paye');
    const totalEncaisse = facturesPayees.reduce((acc: number, f: any) => acc + (f.montant || 0), 0);
    const percentFacturation = montantMarcheActif > 0 ? Math.round((totalFacture / montantMarcheActif) * 100) : 0;

    const coutMO_Reel = (chantier.heures_consommees || 0) * tauxCharge;
    const coutDirect_Reel = coutMO_Reel + (chantier.cout_fournitures_reel || 0) + (chantier.cout_sous_traitance_reel || 0) + (chantier.cout_location_reel || 0);
    const margeBrute = montantMarcheActif - coutDirect_Reel;
    const margeNette = margeBrute - (chantier.frais_generaux_reel || 0);
    const tauxMargeNette = montantMarcheActif > 0 ? (margeNette / montantMarcheActif) * 100 : 0;

    return { tauxCharge, totalTS, totalMoinsValues, montantMarcheInitial, montantMarcheActif, totalFacture, totalEncaisse, percentFacturation, coutMO_Reel, margeNette, tauxMargeNette };
  }, [chantier, facturationList]);

  const actions = {
    handleSave: async () => {
        const toastId = toast.loading('Sauvegarde en cours...');
        const toSave = { ...chantier, mesures_acqpa: acqpaData, chef_chantier_id: chantier.chef_chantier_id || null, date_debut: chantier.date_debut || null, date_fin: chantier.date_fin || null };
        const { error } = await supabase.from('chantiers').update(toSave).eq('id', id);
        if (error) {
            toast.error("Erreur : " + error.message, { id: toastId });
        } else { 
            toast.success('Sauvegardé avec succès !', { id: toastId }); 
            fetchChantierData(); 
        }
    },
    refresh: fetchChantierData,
    updateChantierTotalHours: async (currentTasks: any[]) => {
      const totalRealConsumed = currentTasks.filter((t: any) => t.done).reduce((sum: number, t: any) => sum + (parseFloat(t.heures_reelles) || t.objectif_heures || 0), 0);
      await supabase.from('chantiers').update({ heures_consommees: totalRealConsumed }).eq('id', id);
      setChantier((prev: any) => ({ ...prev, heures_consommees: totalRealConsumed }));
    }
  };

  return { 
    state: { id, loading, chantier, acqpaData, tasks, documents, employes, materielPrevu, fournituresPrevu, catalogueMateriel, stockFournitures, facturationList }, 
    setters: { setChantier, setAcqpaData, setTasks, setDocuments, setMaterielPrevu, setFournituresPrevu }, 
    finances, 
    actions 
  };
}

// --- COMPOSANT PRINCIPAL (ORCHESTRATEUR) ---
export default function ChantierDetail() {
  const params = useParams();
  const id = params?.id as string;
  const data = useChantierData(id);
  const [activeTab, setActiveTab] = useState('suivi'); 

  if (data.state.loading) return <div className="h-screen flex items-center justify-center font-['Fredoka'] text-[#34495e] font-bold"><div className="animate-spin mr-3"><Truck/></div> Chargement...</div>;

  return (
    <div className="min-h-screen bg-[#f0f3f4] font-['Fredoka'] pb-20 text-gray-800 ml-0 md:ml-0 transition-all print:bg-white print:p-0 print:m-0 print:w-full">
      <style jsx global>{` @media print { @page { size: landscape; margin: 5mm; } body { -webkit-print-color-adjust: exact; background: white; } nav, aside, .sidebar, .print-hidden { display: none !important; } .no-break { break-inside: avoid; } } `}</style>
      
      {/* TOASTER POUR LES NOTIFICATIONS */}
      <Toaster position="bottom-right" toastOptions={{ style: { fontFamily: 'Fredoka', fontWeight: 'bold' } }} />

      {/* HEADER */}
      <div className="bg-white/90 backdrop-blur-md sticky top-0 z-30 border-b border-gray-200 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <Link href="/chantier" className="bg-white p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-black hover:scale-105 transition-all"><ArrowLeft size={20} /></Link>
                <div>
                    <h1 className="text-xl font-black uppercase tracking-tight text-[#2d3436]">{data.state.chantier.nom}</h1>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Marge Nette : <span className={data.finances.tauxMargeNette >= 0 ? "text-emerald-500" : "text-red-500"}>{data.finances.tauxMargeNette.toFixed(1)}%</span></p>
                </div>
            </div>
            <button onClick={data.actions.handleSave} className="bg-[#00b894] hover:bg-[#00a383] text-white px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-200 transition-all hover:scale-105 active:scale-95 font-bold uppercase flex items-center gap-2"><Save size={18} /> Sauvegarder</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 print:max-w-none print:p-2">
        {/* TABS NAVIGATION */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar print:hidden">
            {[ 
              { id: 'suivi', label: 'Dashboard & Factures', icon: PieChart, color: 'bg-[#00b894]' }, 
              { id: 'infos', label: 'Infos Chantier', icon: FileText, color: 'bg-[#34495e]' }, 
              { id: 'logistique', label: 'Matériel & Loc.', icon: Truck, color: 'bg-[#6c5ce7]' }, 
              { id: 'fournitures', label: 'Fournitures', icon: Package, color: 'bg-[#fdcb6e]' }, 
              { id: 'planning', label: 'Tâches & Planning', icon: BarChart2, color: 'bg-[#00b894]' }, 
              { id: 'hse', label: 'Sécurité / EPI', icon: Shield, color: 'bg-[#e17055]' }, 
              { id: 'acqpa', label: 'Mesures ACQPA', icon: ClipboardCheck, color: 'bg-[#0984e3]' }, 
              { id: 'docs', label: 'Photos / Docs', icon: UploadCloud, color: 'bg-[#6c5ce7]' } 
            ].map((tab: any) => ( 
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-5 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all shadow-sm flex items-center gap-2 ${activeTab === tab.id ? `${tab.color} text-white shadow-lg scale-105` : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50'}`}><tab.icon size={16} /> {tab.label}</button> 
            ))}
        </div>

        {/* RENDU DES ONGLETS VIA SOUS-COMPOSANTS */}
        {activeTab === 'suivi' && <DashboardTab data={data} />}
        {activeTab === 'infos' && <InfosTab data={data} />}
        {activeTab === 'logistique' && <LogistiqueTab data={data} />}
        {activeTab === 'fournitures' && <FournituresTab data={data} />}
        {activeTab === 'planning' && <PlanningTab data={data} />}
        {activeTab === 'hse' && <HseTab data={data} />}
        {activeTab === 'acqpa' && <AcqpaTab data={data} />}
        {activeTab === 'docs' && <DocsTab data={data} />}
      </div>
    </div>
  );
}

// ============================================================================
// SOUS-COMPOSANTS (ONGLETS ISOLÉS)
// ============================================================================

function DashboardTab({ data }: { data: any }) {
  const { state: { chantier, facturationList }, setters: { setChantier }, finances, actions } = data;
  const [newFacture, setNewFacture] = useState({ type: 'Facture', label: '', montant: 0, date_emission: '', date_echeance: '', statut: 'prevu' });

  const { pieStyle, chartData } = useMemo(() => {
    const d = [
      { label: 'M.O.', value: finances.coutMO_Reel, color: '#3b82f6' }, 
      { label: 'Matériaux', value: chantier.cout_fournitures_reel || 0, color: '#f97316' }, 
      { label: 'Sous-Traitance', value: chantier.cout_sous_traitance_reel || 0, color: '#a855f7' }, 
      { label: 'Location', value: chantier.cout_location_reel || 0, color: '#ec4899' }, 
      { label: 'Frais Génx', value: chantier.frais_generaux_reel || 0, color: '#64748b' }, 
      { label: 'Marge', value: Math.max(0, finances.margeNette), color: '#10b981' }
    ];
    const totalChart = Math.max(finances.montantMarcheActif, d.reduce((acc: number, curr: any) => acc + curr.value, 0));
    let currentAngle = 0;
    const gradientParts = d.map((item: any) => { 
      const percentage = totalChart > 0 ? (item.value / totalChart) * 100 : 0; 
      const endAngle = currentAngle + percentage; 
      const str = `${item.color} ${currentAngle}% ${endAngle}%`; currentAngle = endAngle; return str; 
    }).join(', ');
    return { pieStyle: { background: `conic-gradient(${gradientParts}, transparent 0)` }, chartData: d };
  }, [finances, chantier]);

  const handleAddFacture = async () => {
    if(!newFacture.label || !newFacture.montant) return toast.error("Veuillez remplir le libellé et le montant");
    const toastId = toast.loading("Ajout en cours...");
    const { error } = await supabase.from('chantier_facturation').insert([{ ...newFacture, chantier_id: chantier.id }]);
    if(!error) { 
        setNewFacture({ type: 'Facture', label: '', montant: 0, date_emission: '', date_echeance: '', statut: 'prevu' }); 
        toast.success("Ligne de facturation ajoutée !", { id: toastId });
        actions.refresh(); 
    } else {
        toast.error("Erreur lors de l'ajout", { id: toastId });
    }
  };
  const deleteFacture = async (fid: string) => { if(confirm('Supprimer cette ligne ?')) { await supabase.from('chantier_facturation').delete().eq('id', fid); actions.refresh(); toast.success("Ligne supprimée"); } };
  const toggleFactureRecu = async (facture: any) => { const newStatus = facture.statut === 'paye' ? 'envoye' : 'paye'; await supabase.from('chantier_facturation').update({ statut: newStatus }).eq('id', facture.id); actions.refresh(); toast.success("Statut mis à jour"); };
  const isOverdue = (f: any) => { if (f.statut === 'paye') return false; const today = new Date().toISOString().split('T')[0]; return f.date_echeance && f.date_echeance < today; };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 print:space-y-4">
        <div className="flex justify-between items-end border-b border-gray-200 pb-4 mb-6"><div><h2 className="text-3xl font-black uppercase text-[#2d3436] tracking-tight">Rapport Financier</h2><p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{chantier.nom} — {chantier.type} — {new Date().toLocaleDateString()}</p></div><button onClick={() => window.print()} className="bg-[#2d3436] text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold uppercase text-xs shadow-lg print:hidden hover:scale-105 transition-transform"><Printer size={18}/> Imprimer Rapport</button></div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:grid-cols-4">
            <div className="bg-white p-5 rounded-[25px] shadow-sm border border-gray-100 relative overflow-hidden group print:border-gray-300">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-blue-600"><Receipt size={50}/></div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Montant Marché Final</p>
                <div className="text-3xl font-black text-[#2d3436] mt-1">{finances.montantMarcheActif.toLocaleString()} €</div>
                <div className="mt-2 text-[9px] font-bold text-blue-400">Base: {finances.montantMarcheInitial.toLocaleString()} € {finances.totalTS > 0 && <span className="text-emerald-600"> + {finances.totalTS}€ (TS)</span>} {finances.totalMoinsValues > 0 && <span className="text-red-500"> - {finances.totalMoinsValues}€ (MV)</span>}</div>
            </div>
            <div className="bg-white p-5 rounded-[25px] shadow-sm border border-gray-100 relative overflow-hidden group print:border-gray-300"><div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-600"><Wallet size={50}/></div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Marge Nette</p><div className={`text-3xl font-black mt-1 ${finances.margeNette >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{finances.margeNette.toLocaleString()} €</div><div className="flex items-center gap-2 mt-2"><span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black">{finances.tauxMargeNette.toFixed(1)}%</span></div></div>
            <div className="bg-white p-5 rounded-[25px] shadow-sm border border-gray-100 relative overflow-hidden group print:border-gray-300"><div className="absolute top-0 right-0 p-4 opacity-10 text-purple-600"><CreditCard size={50}/></div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Facturé Client</p><div className="text-3xl font-black text-purple-600 mt-1">{finances.totalFacture.toLocaleString()} €</div><div className="mt-2 text-xs font-bold text-gray-400">{finances.percentFacturation}% du Marché</div></div>
            <div className="bg-white p-5 rounded-[25px] shadow-sm border border-gray-100 relative overflow-hidden group print:border-gray-300"><div className="absolute top-0 right-0 p-4 opacity-10 text-orange-500"><HardHat size={50}/></div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Coût M.O. (Chargé)</p><div className="text-3xl font-black text-orange-500 mt-1">{finances.coutMO_Reel.toLocaleString()} €</div><p className="text-[10px] font-bold text-gray-400 mt-1">Taux: {chantier.taux_horaire_moyen} + {chantier.cpi} €/h</p></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
            <div className="bg-white rounded-[30px] p-8 shadow-sm border border-gray-100 print:shadow-none print:border-gray-300 no-break flex flex-col items-center">
                <h3 className="font-black uppercase text-gray-700 mb-6 flex items-center gap-2 self-start"><PieChart className="text-[#6c5ce7]"/> Répartition Prix Vente</h3>
                <div className="flex items-center gap-8 w-full justify-center">
                    <div className="relative w-48 h-48 rounded-full border-4 border-white shadow-xl" style={pieStyle}><div className="absolute inset-0 flex items-center justify-center"><div className="bg-white w-24 h-24 rounded-full flex items-center justify-center shadow-inner"><span className="font-black text-xs text-gray-400">Total Vente</span></div></div></div>
                    <div className="space-y-2 text-xs">{chartData.map((d: any, i: number) => (<div key={i} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{backgroundColor: d.color}}></div><span className="font-bold text-gray-600">{d.label}</span><span className="font-black text-gray-800">{Math.round((d.value/finances.montantMarcheActif)*100)}%</span></div>))}</div>
                </div>
            </div>
            <div className="bg-[#f8f9fa] border border-dashed border-gray-300 p-6 rounded-[30px] print:hidden">
                <h4 className="text-sm font-black uppercase text-gray-500 mb-4 flex items-center gap-2"><Calculator size={16}/> Saisie Rapide Coûts Réels</h4>
                <div className="space-y-4">
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase">Taux Horaire + CPI</label><div className="flex gap-2"><div className="flex-1 relative"><Euro size={14} className="absolute left-3 top-3 text-gray-400"/><input type="number" className="w-full bg-white pl-8 p-3 rounded-xl text-sm font-bold border border-gray-200 outline-none" value={chantier.taux_horaire_moyen} onChange={e => setChantier({...chantier, taux_horaire_moyen: parseFloat(e.target.value)||0})} placeholder="Taux" /></div><div className="flex-1 relative"><AlertOctagon size={14} className="absolute left-3 top-3 text-gray-400"/><input type="number" className="w-full bg-white pl-8 p-3 rounded-xl text-sm font-bold border border-gray-200 outline-none" value={chantier.cpi} onChange={e => setChantier({...chantier, cpi: parseFloat(e.target.value)||0})} placeholder="CPI" /></div></div><p className="text-[10px] text-blue-500 font-bold mt-1 text-right">Taux Chargé = {finances.tauxCharge} €/h</p></div>
                    <div className="grid grid-cols-2 gap-4"><div><label className="text-[9px] font-bold text-gray-400 uppercase">Matériaux Réel</label><input type="number" className="w-full bg-white p-3 rounded-xl text-sm font-bold border border-gray-200 outline-none" value={chantier.cout_fournitures_reel} onChange={e => setChantier({...chantier, cout_fournitures_reel: parseFloat(e.target.value)||0})} /></div><div><label className="text-[9px] font-bold text-gray-400 uppercase">Sous-Traitance Réel</label><input type="number" className="w-full bg-white p-3 rounded-xl text-sm font-bold border border-gray-200 outline-none" value={chantier.cout_sous_traitance_reel} onChange={e => setChantier({...chantier, cout_sous_traitance_reel: parseFloat(e.target.value)||0})} /></div><div><label className="text-[9px] font-bold text-gray-400 uppercase">Location Réel</label><input type="number" className="w-full bg-white p-3 rounded-xl text-sm font-bold border border-gray-200 outline-none" value={chantier.cout_location_reel} onChange={e => setChantier({...chantier, cout_location_reel: parseFloat(e.target.value)||0})} /></div><div><label className="text-[9px] font-bold text-gray-400 uppercase">Frais Généraux Réel</label><input type="number" className="w-full bg-white p-3 rounded-xl text-sm font-bold border border-gray-200 outline-none" value={chantier.frais_generaux_reel} onChange={e => setChantier({...chantier, frais_generaux_reel: parseFloat(e.target.value)||0})} /></div></div>
                </div>
            </div>
        </div>
        
        <div className="bg-white rounded-[30px] p-8 shadow-sm border border-gray-100 print:shadow-none print:border-gray-300 no-break">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-black uppercase text-gray-700 flex items-center gap-2"><FileCheck className="text-[#6c5ce7]"/> Suivi Facturation & TS</h3>
                <div className="text-right"><p className="text-[10px] font-bold uppercase text-gray-400">Reste à Facturer</p><p className="text-xl font-black text-blue-600">{(finances.montantMarcheActif - finances.totalFacture).toLocaleString()} €</p></div>
            </div>
            <div className="w-full bg-gray-100 h-6 rounded-full overflow-hidden flex relative mb-6 border border-gray-200">
                  <div className="h-full bg-green-400 flex items-center justify-center text-[10px] font-black text-white" style={{width: `${finances.montantMarcheActif > 0 ? (finances.totalEncaisse/finances.montantMarcheActif)*100 : 0}%`}}>Enc.</div>
                  <div className="h-full bg-blue-400 flex items-center justify-center text-[10px] font-black text-white" style={{width: `${finances.montantMarcheActif > 0 ? ((finances.totalFacture - finances.totalEncaisse)/finances.montantMarcheActif)*100 : 0}%`}}>Fact.</div>
            </div>
            <table className="w-full text-left text-xs mb-4">
                <thead className="bg-gray-50 uppercase text-gray-400 font-black"><tr><th className="p-3 rounded-l-lg">Type</th><th className="p-3">Libellé</th><th className="p-3">Envoi</th><th className="p-3">Echéance</th><th className="p-3 text-right">Montant HT</th><th className="p-3 text-center">Reçu</th><th className="p-3 text-center print:hidden">Action</th></tr></thead>
                <tbody className="divide-y divide-gray-50 font-bold text-gray-700">
                    {facturationList.map((f: any) => (
                        <tr key={f.id} className={f.type === 'TS' ? 'bg-purple-50/50' : f.type === 'MoinsValue' ? 'bg-red-50/50' : ''}>
                            <td className="p-3"><span className={`px-2 py-1 rounded text-[9px] uppercase ${f.type==='Facture'?'bg-blue-100 text-blue-600':f.type==='TS'?'bg-purple-100 text-purple-600':'bg-gray-100'}`}>{f.type}</span></td>
                            <td className="p-3">{f.label}</td>
                            <td className="p-3 text-gray-500">{f.date_emission || '-'}</td>
                            <td className={`p-3 ${isOverdue(f) ? 'text-red-500 font-black flex items-center gap-1' : 'text-gray-500'}`}>{isOverdue(f) && <AlertCircle size={12}/>} {f.date_echeance || '-'}</td>
                            <td className={`p-3 text-right ${f.type === 'MoinsValue' ? 'text-red-500' : ''}`}>{f.montant.toLocaleString()} €</td>
                            <td className="p-3 text-center"><div onClick={() => toggleFactureRecu(f)} className={`w-5 h-5 rounded mx-auto cursor-pointer flex items-center justify-center border-2 transition-all ${f.statut === 'paye' ? 'bg-green-500 border-green-500' : 'border-gray-300 bg-white'}`}>{f.statut === 'paye' && <Check size={14} className="text-white"/>}</div></td>
                            <td className="p-3 text-center print:hidden"><button onClick={() => deleteFacture(f.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14}/></button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl print:hidden">
                <select className="bg-white p-2 rounded-lg text-xs font-bold outline-none border border-gray-200" value={newFacture.type} onChange={e => setNewFacture({...newFacture, type: e.target.value})}><option value="Facture">Facture</option><option value="Acompte">Acompte</option><option value="TS">Travaux Suppl.</option><option value="PlusValue">+ Value</option><option value="MoinsValue">- Value</option><option value="Solde">Solde</option></select>
                <input type="text" placeholder="Libellé..." className="flex-1 bg-white p-2 rounded-lg text-xs outline-none border border-gray-200" value={newFacture.label} onChange={e => setNewFacture({...newFacture, label: e.target.value})} />
                <input type="number" placeholder="Montant HT" className="w-24 bg-white p-2 rounded-lg text-xs outline-none border border-gray-200" value={newFacture.montant} onChange={e => setNewFacture({...newFacture, montant: parseFloat(e.target.value)})} />
                <div className="flex flex-col gap-1">
                    <input type="date" title="Date Envoi" className="bg-white p-1 rounded-lg text-[10px] outline-none border border-gray-200" value={newFacture.date_emission} onChange={e => setNewFacture({...newFacture, date_emission: e.target.value})} />
                    <input type="date" title="Echéance" className="bg-white p-1 rounded-lg text-[10px] outline-none border border-gray-200 text-red-400" value={newFacture.date_echeance} onChange={e => setNewFacture({...newFacture, date_echeance: e.target.value})} />
                </div>
                <button onClick={handleAddFacture} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"><Plus size={16}/></button>
            </div>
        </div>
    </div>
  );
}

function InfosTab({ data }: { data: any }) {
  const { state: { chantier, employes }, setters: { setChantier } } = data;
  const [showTeamSelector, setShowTeamSelector] = useState(false);

  const toggleTeamMember = (empId: string) => { 
    const currentTeam = chantier.equipe_ids || []; 
    if (currentTeam.includes(empId)) setChantier({...chantier, equipe_ids: currentTeam.filter((id: string) => id !== empId)}); 
    else setChantier({...chantier, equipe_ids: [...currentTeam, empId]}); 
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
                <div className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-100 space-y-4">
                    <h3 className="font-black uppercase text-gray-700 mb-4 flex items-center gap-2"><FileText size={20}/> Identification & Client</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nom Chantier</label><input value={chantier.nom || ''} onChange={e => setChantier({...chantier, nom: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none border border-transparent focus:border-[#00b894] transition-colors" /></div>
                        <div className="col-span-2"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Numéro d'Affaire / OTP</label><div className="flex items-center bg-gray-50 rounded-xl px-2 mt-1"><Hash size={16} className="text-gray-400 mr-2"/><input value={chantier.numero_otp || ''} onChange={e => setChantier({...chantier, numero_otp: e.target.value})} className="w-full bg-transparent p-3 font-bold outline-none" /></div></div>
                        <div className="col-span-2 grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Statut</label><select className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none border border-transparent focus:border-[#00b894] transition-colors cursor-pointer" value={chantier.statut || 'en_cours'} onChange={e => setChantier({...chantier, statut: e.target.value})}><option value="planifie">Planifié</option><option value="probable">Probable</option><option value="en_cours">En cours</option><option value="stand_by">En Stand-by</option><option value="termine">Terminé</option></select></div>
                            <div>{chantier.statut === 'probable' && (<div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">% Obtention</label><div className="flex items-center bg-gray-50 rounded-xl px-3 border border-transparent focus-within:border-[#00b894] transition-colors"><input type="number" min="0" max="100" className="w-full bg-transparent p-3 font-bold outline-none" value={chantier.taux_reussite || 0} onChange={e => setChantier({...chantier, taux_reussite: parseFloat(e.target.value) || 0})} /><Percent size={14} className="text-gray-400" /></div></div>)}</div>
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Début Prévu</label><div className="flex items-center bg-gray-50 rounded-xl px-3 border border-transparent focus-within:border-[#00b894] transition-colors"><Calendar size={14} className="text-gray-400 mr-2" /><input type="date" className="w-full bg-transparent p-3 font-bold outline-none" value={chantier.date_debut || ''} onChange={e => setChantier({...chantier, date_debut: e.target.value})} /></div></div>
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fin Prévue</label><div className="flex items-center bg-gray-50 rounded-xl px-3 border border-transparent focus-within:border-[#00b894] transition-colors"><Calendar size={14} className="text-gray-400 mr-2" /><input type="date" className="w-full bg-transparent p-3 font-bold outline-none" value={chantier.date_fin || ''} onChange={e => setChantier({...chantier, date_fin: e.target.value})} /></div></div>
                        </div>
                        <div className="col-span-2 p-4 bg-gray-50 rounded-2xl border border-gray-100 grid grid-cols-2 gap-4"><div className="col-span-2"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Client</label><input value={chantier.client || ''} onChange={e => setChantier({...chantier, client: e.target.value})} className="w-full bg-white p-2 rounded-lg font-bold outline-none" /></div><div className="col-span-2"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Adresse</label><input value={chantier.adresse || ''} onChange={e => setChantier({...chantier, adresse: e.target.value})} className="w-full bg-white p-2 rounded-lg font-bold outline-none" /></div><div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1"><Phone size={10}/> Tel</label><input value={chantier.client_telephone || ''} onChange={e => setChantier({...chantier, client_telephone: e.target.value})} className="w-full bg-white p-2 rounded-lg font-bold outline-none" /></div><div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1"><Mail size={10}/> Email</label><input value={chantier.client_email || ''} onChange={e => setChantier({...chantier, client_email: e.target.value})} className="w-full bg-white p-2 rounded-lg font-bold outline-none" /></div></div>
                    </div>
                </div>
            </div>
            
            <div className="space-y-6">
                <div className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-100 space-y-4">
                    <h3 className="font-black uppercase text-gray-700 mb-4 flex items-center gap-2"><Users size={20}/> Ressources Humaines</h3>
                    <div className="space-y-4">
                        <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Chargé d'Affaire (Responsable)</label><div className="flex items-center bg-gray-50 rounded-xl px-2 mt-1"><Briefcase size={16} className="text-gray-400 mr-2"/><input value={chantier.responsable || ''} onChange={e => setChantier({...chantier, responsable: e.target.value})} className="w-full bg-transparent p-3 font-bold outline-none" placeholder="Nom du responsable..." /></div></div>
                        <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Responsable Sur Site (Chef)</label><div className="flex items-center bg-gray-50 rounded-xl px-2 mt-1 border border-transparent focus-within:border-blue-300 transition-colors"><UserCheck size={16} className="text-gray-400 mr-2"/><select className="w-full bg-transparent p-3 font-bold outline-none cursor-pointer" value={chantier.chef_chantier_id || ''} onChange={(e) => setChantier({...chantier, chef_chantier_id: e.target.value})}><option value="">Sélectionner un chef...</option>{employes.map((emp: any) => (<option key={emp.id} value={emp.id}>{emp.nom} {emp.prenom}</option>))}</select></div></div>
                        <div className="relative"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Équipe Terrain (Multisélection)</label><div className="mt-1 bg-gray-50 p-3 rounded-xl font-bold cursor-pointer flex justify-between items-center" onClick={() => setShowTeamSelector(!showTeamSelector)}><span>{chantier.equipe_ids?.length || 0} Compagnons sélectionnés</span><Plus size={16} className="text-gray-400"/></div>{showTeamSelector && (<div className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto z-50 p-2">{employes.map((emp: any) => (<div key={emp.id} onClick={() => toggleTeamMember(emp.id)} className={`flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-gray-50 ${chantier.equipe_ids?.includes(emp.id) ? 'bg-blue-50 text-blue-600' : ''}`}><span className="text-sm font-bold">{emp.nom} {emp.prenom}</span>{chantier.equipe_ids?.includes(emp.id) && <Check size={14}/>}</div>))}</div>)}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-black uppercase text-gray-700 mb-4 flex items-center gap-2"><Euro size={20}/> Budgets Prévisionnels (HT)</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 bg-emerald-50 p-3 rounded-xl border border-emerald-100"><label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Montant Marché (Vente)</label><input type="number" value={chantier.montant_marche || 0} onChange={e => setChantier({...chantier, montant_marche: parseFloat(e.target.value) || 0})} className="w-full bg-transparent p-2 font-black text-xl text-emerald-800 outline-none" /></div>
                    <div className="col-span-2 bg-blue-50 p-3 rounded-xl border border-blue-100"><label className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">Budget M.O. (Calculé)</label><div className="grid grid-cols-3 gap-2 mt-1"><div><label className="text-[8px] uppercase">Heures</label><input type="number" value={chantier.heures_budget || 0} onChange={e => setChantier({...chantier, heures_budget: parseFloat(e.target.value) || 0})} className="w-full bg-white rounded p-1 font-bold text-center" placeholder="H"/></div><div><label className="text-[8px] uppercase">Taux</label><input type="number" value={chantier.taux_horaire_moyen} onChange={e => setChantier({...chantier, taux_horaire_moyen: parseFloat(e.target.value) || 0})} className="w-full bg-white rounded p-1 font-bold text-center" placeholder="€"/></div><div><label className="text-[8px] uppercase">CPI</label><input type="number" value={chantier.cpi} onChange={e => setChantier({...chantier, cpi: parseFloat(e.target.value) || 0})} className="w-full bg-white rounded p-1 font-bold text-center" placeholder="€"/></div></div><div className="text-right mt-2 font-black text-blue-800 text-lg">Total: {((chantier.heures_budget || 0) * (chantier.taux_horaire_moyen + chantier.cpi)).toLocaleString()} €</div></div>
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Matériaux Prévu</label><input type="number" value={chantier.cout_fournitures_prevu || 0} onChange={e => setChantier({...chantier, cout_fournitures_prevu: parseFloat(e.target.value) || 0})} className="w-full bg-gray-50 p-2 rounded-lg font-bold text-sm outline-none" /></div><div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sous-Traitance Prévu</label><input type="number" value={chantier.cout_sous_traitance_prevu || 0} onChange={e => setChantier({...chantier, cout_sous_traitance_prevu: parseFloat(e.target.value) || 0})} className="w-full bg-gray-50 p-2 rounded-lg font-bold text-sm outline-none" /></div><div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Location Prévu</label><input type="number" value={chantier.cout_location_prevu || 0} onChange={e => setChantier({...chantier, cout_location_prevu: parseFloat(e.target.value) || 0})} className="w-full bg-gray-50 p-2 rounded-lg font-bold text-sm outline-none" /></div><div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Frais Généraux (Prévu)</label><input type="number" value={chantier.frais_generaux || 0} onChange={e => setChantier({...chantier, frais_generaux: parseFloat(e.target.value) || 0})} className="w-full bg-gray-50 p-2 rounded-lg font-bold text-sm outline-none" /></div>
                </div>
            </div>
            
            <div className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-black uppercase text-gray-700 mb-4 flex items-center gap-2"><LayoutDashboard size={20}/> Options & ACQPA</h3>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <div><h4 className="font-bold text-gray-800">Module ACQPA</h4><p className="text-xs text-gray-400">Activer le suivi qualité peinture</p></div>
                    <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={chantier.mesures_obligatoires || false} onChange={e => setChantier({...chantier, mesures_obligatoires: e.target.checked})} className="sr-only peer" /><div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00b894]"></div></label>
                </div>
            </div>
        </div>
    </div>
  );
}

function LogistiqueTab({ data }: { data: any }) {
  const { state: { chantier, materielPrevu, catalogueMateriel }, actions } = data;
  const [showAddMaterielModal, setShowAddMaterielModal] = useState(false);
  const [newMat, setNewMat] = useState({ materiel_id: '', date_debut: chantier.date_debut || '', date_fin: chantier.date_fin || '', qte: 1 });

  const handleAddMateriel = async () => { 
    if (!newMat.materiel_id) return toast.error("Veuillez sélectionner un matériel"); 
    const toastId = toast.loading("Ajout en cours...");
    const { error } = await supabase.from('chantier_materiel').insert([{ chantier_id: chantier.id, materiel_id: newMat.materiel_id, date_debut: newMat.date_debut || null, date_fin: newMat.date_fin || null, qte_prise: newMat.qte || 1, statut: 'prevu' }]); 
    if (!error) { 
        toast.success("Matériel ajouté !", { id: toastId });
        setShowAddMaterielModal(false); 
        actions.refresh(); 
    } else {
        toast.error("Erreur d'ajout", { id: toastId });
    }
  };
  const deleteMateriel = async (matId: string) => { if (confirm('Supprimer ?')) { await supabase.from('chantier_materiel').delete().eq('id', matId); actions.refresh(); toast.success("Supprimé"); } };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center mb-6 print:hidden">
          <h3 className="text-xl font-black text-gray-700 uppercase flex items-center gap-2"><Truck className="text-[#6c5ce7]"/> Matériel & Locations</h3>
          <button onClick={() => setShowAddMaterielModal(true)} className="bg-[#6c5ce7] text-white px-6 py-2.5 rounded-xl font-bold uppercase text-xs shadow-lg hover:bg-[#5b4bc4] transition-all flex items-center gap-2"><Plus size={16}/> Ajouter / Réserver</button>
      </div>
      <div className="bg-white rounded-[30px] p-1 shadow-sm border border-gray-100 overflow-hidden print:border-none print:shadow-none"><table className="w-full"><thead className="bg-gray-50 border-b border-gray-100"><tr><th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase">Matériel</th><th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase">Type</th><th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase">Période</th><th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase">Quantité</th><th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase print:hidden">Action</th></tr></thead><tbody className="divide-y divide-gray-50">{materielPrevu.map((m: any) => (<tr key={m.id} className="hover:bg-gray-50 transition-colors"><td className="p-4 font-bold text-sm text-gray-800">{m.materiel?.nom}</td><td className="p-4"><span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${m.materiel?.type_stock === 'Interne' ? 'bg-gray-100 text-gray-500' : 'bg-purple-100 text-purple-600'}`}>{m.materiel?.type_stock}</span></td><td className="p-4 text-xs font-bold text-gray-600">{m.date_debut} ➔ {m.date_fin}</td><td className="p-4 text-center font-black text-gray-800">{m.qte_prise}</td><td className="p-4 text-center print:hidden"><button onClick={() => deleteMateriel(m.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button></td></tr>))}</tbody></table></div>
      
      {showAddMaterielModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[30px] w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95">
                <h3 className="font-black text-xl text-[#2d3436] mb-4 flex items-center gap-2"><Truck className="text-[#6c5ce7]"/> Ajouter Matériel</h3>
                <div className="space-y-4">
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase">Matériel</label><select className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none cursor-pointer" onChange={e => setNewMat({...newMat, materiel_id: e.target.value})}><option value="">Sélectionner...</option>{catalogueMateriel.map((m: any) => <option key={m.id} value={m.id}>{m.nom} ({m.type_stock})</option>)}</select></div>
                    <div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-bold text-gray-400 uppercase">Début</label><input type="date" className="w-full bg-gray-50 p-3 rounded-xl font-bold" value={newMat.date_debut} onChange={e => setNewMat({...newMat, date_debut: e.target.value})} /></div><div><label className="text-[10px] font-bold text-gray-400 uppercase">Fin</label><input type="date" className="w-full bg-gray-50 p-3 rounded-xl font-bold" value={newMat.date_fin} onChange={e => setNewMat({...newMat, date_fin: e.target.value})} /></div></div>
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase">Quantité</label><input type="number" min="1" className="w-full bg-gray-50 p-3 rounded-xl font-bold" value={newMat.qte} onChange={e => setNewMat({...newMat, qte: parseInt(e.target.value)})} /></div>
                </div>
                <div className="mt-6 flex justify-end gap-2"><button onClick={() => setShowAddMaterielModal(false)} className="px-4 py-2 text-gray-400 font-bold hover:bg-gray-50 rounded-xl">Annuler</button><button onClick={handleAddMateriel} className="bg-[#6c5ce7] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#5b4bc4]">Confirmer</button></div>
            </div>
        </div>
      )}
    </div>
  )
}

function FournituresTab({ data }: { data: any }) {
  const { state: { chantier, fournituresPrevu, stockFournitures }, setters: { setFournituresPrevu }, actions } = data;
  const [supplySearch, setSupplySearch] = useState(""); 
  const [showSupplyList, setShowSupplyList] = useState(false); 
  const searchWrapperRef = useRef<HTMLDivElement>(null); 
  const [newFourniture, setNewFourniture] = useState({ fourniture_ref_id: '', qte_prevue: 0 });

  useEffect(() => {
    function handleClickOutside(event: any) { if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target)) setShowSupplyList(false); }
    document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []); 

  const filteredStock = stockFournitures.filter((s: any) => s.nom.toLowerCase().includes(supplySearch.toLowerCase()) || (s.ral && s.ral.includes(supplySearch)));
  const getSelectedUnit = () => { const selected = stockFournitures.find((s: any) => s.id === newFourniture.fourniture_ref_id); return selected ? selected.unite : ''; };
  
  const addFourniture = async () => { 
      if(!newFourniture.fourniture_ref_id) return toast.error("Veuillez sélectionner un produit"); 
      const selectedItem = stockFournitures.find((s: any) => s.id === newFourniture.fourniture_ref_id); 
      const payload = { chantier_id: chantier.id, fourniture_ref_id: newFourniture.fourniture_ref_id, nom: selectedItem?.nom || 'Sans nom', unite: selectedItem?.unite || 'u', qte_prevue: newFourniture.qte_prevue || 0, qte_consommee: 0 }; 
      
      const toastId = toast.loading("Ajout du besoin...");
      const { error } = await supabase.from('chantier_fournitures').insert([payload]); 
      if(error) {
          toast.error("Erreur: " + error.message, { id: toastId });
      } else { 
          setNewFourniture({ fourniture_ref_id: '', qte_prevue: 0 }); 
          setSupplySearch(""); 
          toast.success("Produit ajouté !", { id: toastId });
          actions.refresh(); 
      } 
  };
  const updateConsommation = async (fId: string, val: number) => { const newVal = Math.max(0, val); setFournituresPrevu((prev: any[]) => prev.map((f: any) => f.id === fId ? { ...f, qte_consommee: newVal } : f)); await supabase.from('chantier_fournitures').update({ qte_consommee: newVal }).eq('id', fId); };
  const deleteFourniture = async (fId: string) => { if(confirm("Supprimer ?")) { await supabase.from('chantier_fournitures').delete().eq('id', fId); actions.refresh(); toast.success("Produit supprimé"); } };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
            <div className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-100 h-fit overflow-visible z-20">
                <h3 className="font-black uppercase text-gray-700 mb-4 flex items-center gap-2"><Package className="text-yellow-500"/> Ajouter Besoin</h3>
                <div className="space-y-4">
                    <div className="relative" ref={searchWrapperRef}>
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Produit</label>
                        <div className="relative"><input type="text" className="w-full bg-gray-50 p-3 pl-10 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-yellow-400 transition-colors" placeholder="Chercher..." value={supplySearch} onChange={(e) => { setSupplySearch(e.target.value); setShowSupplyList(true); if(newFourniture.fourniture_ref_id) setNewFourniture({...newFourniture, fourniture_ref_id: ''}); }} onFocus={() => setShowSupplyList(true)} /><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/></div>
                        {showSupplyList && supplySearch && (<div className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto z-50">{filteredStock.map((s: any) => (<div key={s.id} className="p-3 hover:bg-yellow-50 cursor-pointer border-b border-gray-50 last:border-0" onClick={() => { setSupplySearch(s.nom); setNewFourniture({...newFourniture, fourniture_ref_id: s.id}); setShowSupplyList(false); }}><div className="font-bold text-sm text-gray-800">{s.nom}</div><div className="text-[10px] text-gray-400">{s.ral} - {s.qte_stock} {s.unite} dispo</div></div>))}</div>)}
                    </div>
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase">Quantité Prévue ({getSelectedUnit()})</label><input type="number" value={newFourniture.qte_prevue || ''} onChange={e => setNewFourniture({...newFourniture, qte_prevue: parseFloat(e.target.value) || 0})} className="w-full bg-gray-50 p-3 rounded-xl font-bold text-sm outline-none focus:border-yellow-400 border border-transparent" /></div>
                    <button onClick={addFourniture} disabled={!newFourniture.fourniture_ref_id} className="w-full bg-yellow-400 hover:bg-yellow-500 text-white font-black uppercase py-3 rounded-xl shadow-lg">Valider le besoin</button>
                </div>
            </div>
            <div className="lg:col-span-2 bg-white rounded-[30px] p-6 shadow-sm border border-gray-100 z-10"><h3 className="font-black uppercase text-gray-700 mb-4 flex items-center gap-2"><TrendingUp className="text-blue-500"/> Besoins Atelier</h3><div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400"><tr><th className="p-3">Produit</th><th className="p-3 text-center">Prévu</th><th className="p-3 text-center bg-blue-50/50 text-blue-600">Stock Magasin</th><th className="p-3 text-center bg-orange-50/50 text-orange-600">À Commander</th><th className="p-3 text-right">Statut</th></tr></thead><tbody className="divide-y divide-gray-50">{fournituresPrevu.map((f: any) => { const stockInfo = f.fournitures_stock || {}; const aCommander = Math.max(0, f.qte_prevue - stockInfo.qte_stock); return (<tr key={f.id} className="hover:bg-gray-50 transition-colors"><td className="p-3 font-bold text-sm text-gray-800">{f.nom}<button onClick={() => deleteFourniture(f.id)} className="ml-2 text-gray-300 hover:text-red-500"><Trash2 size={12}/></button></td><td className="p-3 text-center font-black">{f.qte_prevue} {f.unite}</td><td className="p-3 text-center font-bold text-blue-600 bg-blue-50/20">{stockInfo.qte_stock}</td><td className={`p-3 text-center font-black bg-orange-50/20 ${aCommander > 0 ? 'text-red-500' : 'text-gray-300'}`}>{aCommander > 0 ? aCommander : '-'}</td><td className="p-3 text-right">{stockInfo.qte_stock >= f.qte_prevue ? (<span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">Stock OK</span>) : (<span className="text-[9px] font-black uppercase text-orange-600 bg-orange-50 px-2 py-1 rounded-lg border border-orange-100">Commander</span>)}</td></tr>); })}</tbody></table></div></div>
        </div>
        
        <div className="bg-white rounded-[35px] p-8 shadow-xl border border-gray-100 relative overflow-hidden">
            <div className="flex justify-between items-center mb-6 relative z-10"><div><h3 className="text-xl font-black uppercase text-gray-700 flex items-center gap-2"><Scale className="text-emerald-500"/> Saisie Consommation Terrain</h3><p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Mise à jour du stock déporté</p></div></div>
            <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-gray-50 text-[11px] font-black uppercase text-gray-400"><tr><th className="p-4">Fourniture</th><th className="p-4 text-center">Quantité Utilisée</th><th className="p-4 text-center bg-emerald-50/50 text-emerald-700">Stock Chantier Restant</th></tr></thead><tbody className="divide-y divide-gray-100">{fournituresPrevu.map((f: any) => { const prevu = f.qte_prevue || 1; const conso = f.qte_consommee || 0; return (<tr key={f.id} className="hover:bg-gray-50/80 transition-all group"><td className="p-4"><p className="font-black text-gray-800">{f.nom}</p><span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase">Init: {prevu} {f.unite}</span></td><td className="p-4 text-center"><div className="flex items-center justify-center gap-2"><button onClick={() => updateConsommation(f.id, conso - 1)} className="w-7 h-7 bg-gray-100 text-gray-500 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><Minus size={14}/></button><input type="number" className="w-20 text-center font-black text-sm bg-gray-50 border-2 border-transparent focus:border-emerald-400 rounded-lg py-1 outline-none" value={conso} onChange={(e) => updateConsommation(f.id, parseFloat(e.target.value) || 0)} /><button onClick={() => updateConsommation(f.id, conso + 1)} className="w-7 h-7 bg-gray-100 text-gray-500 rounded-lg flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all"><Plus size={14}/></button></div></td><td className="p-4 text-center bg-emerald-50/30 font-black text-emerald-700">{Math.max(0, prevu - conso)} {f.unite}</td></tr>); })}</tbody></table></div>
        </div>
    </div>
  )
}

function PlanningTab({ data }: { data: any }) {
  const { state: { chantier, tasks, employes }, setters: { setTasks }, actions } = data;
  const [newTaskLabel, setNewTaskLabel] = useState("");
  const [activeParentTask, setActiveParentTask] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingSubTaskData, setEditingSubTaskData] = useState<any>(null);
  const [newSubTask, setNewSubTask] = useState({ label: '', heures: 0, date: '', effectif: 1 });

  const getTaskDateRange = (subtasks: any[]) => {
      if (!subtasks || subtasks.length === 0) return '';
      const dates = subtasks.map((st: any) => new Date(st.date)).filter((d: any) => !isNaN(d.getTime()));
      if (dates.length === 0) return '';
      const minDate = new Date(Math.min(...dates.map((d: any) => d.getTime()))); const maxDate = new Date(Math.max(...dates.map((d: any) => d.getTime())));
      const format = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      if (minDate.getTime() === maxDate.getTime()) return `Le ${format(minDate)}`; return `Du ${format(minDate)} au ${format(maxDate)}`;
  };
  
  const updateTaskField = async (taskId: string, field: string, value: any) => { const { error } = await supabase.from('chantier_tasks').update({ [field]: value }).eq('id', taskId); if (!error) { const updatedTasks = tasks.map((t: any) => t.id === taskId ? { ...t, [field]: value } : t); setTasks(updatedTasks); if (field === 'heures_reelles' || field === 'done') actions.updateChantierTotalHours(updatedTasks); } };
  const toggleTask = async (task: any) => { const newStatus = !task.done; const realHoursValue = newStatus ? (task.heures_reelles || task.objectif_heures) : 0; const updatedSubtasks = (task.subtasks || []).map((st: any) => ({ ...st, done: newStatus, avancement: newStatus ? 100 : 0 })); const { error } = await supabase.from('chantier_tasks').update({ done: newStatus, heures_reelles: realHoursValue, subtasks: updatedSubtasks }).eq('id', task.id); if (!error) { const newTasks = tasks.map((t: any) => t.id === task.id ? { ...t, done: newStatus, heures_reelles: realHoursValue, subtasks: updatedSubtasks } : t); setTasks(newTasks); actions.updateChantierTotalHours(newTasks); } };
  const addTask = async () => { if (!newTaskLabel) return; const { data: d } = await supabase.from('chantier_tasks').insert([{ chantier_id: chantier.id, label: newTaskLabel, objectif_heures: 0, heures_reelles: 0, done: false, subtasks: [] }]).select(); if (d) setTasks([d[0], ...tasks]); setNewTaskLabel(""); toast.success("Tâche ajoutée"); };
  const deleteTask = async (taskId: string) => { if(confirm('Supprimer cette tâche et ses sous-tâches ?')) { await supabase.from('chantier_tasks').delete().eq('id', taskId); const updatedList = tasks.filter((t: any) => t.id !== taskId); setTasks(updatedList); actions.updateChantierTotalHours(updatedList); toast.success("Tâche supprimée"); } };
  const saveTaskLabel = async (taskId: string, newLabel: string) => { const { error } = await supabase.from('chantier_tasks').update({ label: newLabel }).eq('id', taskId); if(!error) { setTasks(tasks.map((t: any) => t.id === taskId ? { ...t, label: newLabel } : t)); setEditingTaskId(null); } };
  const addSubTask = async (parentId: string) => { if(!newSubTask.label) return; const parentTask = tasks.find((t: any) => t.id === parentId); const updatedSubtasks = [...(parentTask.subtasks || []), { id: Date.now(), label: newSubTask.label, heures: parseFloat(newSubTask.heures.toString()) || 0, effectif: parseInt(newSubTask.effectif.toString()) || 1, date: newSubTask.date, done: false, avancement: 0 }]; const newTotalHours = updatedSubtasks.reduce((acc: number, curr: any) => acc + (parseFloat(curr.heures) || 0), 0); await supabase.from('chantier_tasks').update({ subtasks: updatedSubtasks, objectif_heures: newTotalHours }).eq('id', parentId); const newTasks = tasks.map((t: any) => t.id === parentId ? { ...t, subtasks: updatedSubtasks, objectif_heures: newTotalHours } : t); setTasks(newTasks); setNewSubTask({ label: '', heures: 0, date: '', effectif: 1 }); setActiveParentTask(null); toast.success("Sous-tâche ajoutée"); };
  const toggleSubTask = async (parentId: string, subtaskId: number) => { const parentTask = tasks.find((t: any) => t.id === parentId); const updatedSubtasks = parentTask.subtasks.map((st: any) => st.id === subtaskId ? { ...st, done: !st.done, avancement: !st.done ? 100 : 0 } : st); const allDone = updatedSubtasks.every((st: any) => st.done); const { error } = await supabase.from('chantier_tasks').update({ subtasks: updatedSubtasks, done: allDone, heures_reelles: allDone ? (parentTask.heures_reelles || parentTask.objectif_heures) : parentTask.heures_reelles }).eq('id', parentId); if (!error) { const newTasks = tasks.map((t: any) => t.id === parentId ? { ...t, subtasks: updatedSubtasks, done: allDone } : t); setTasks(newTasks); actions.updateChantierTotalHours(newTasks); } };
  const deleteSubTask = async (parentId: string, subTaskId: number) => { if(!confirm("Supprimer cette sous-tâche ?")) return; const parentTask = tasks.find((t: any) => t.id === parentId); const updatedSubtasks = parentTask.subtasks.filter((st: any) => st.id !== subTaskId); const newTotalHours = updatedSubtasks.reduce((acc: number, curr: any) => acc + (parseFloat(curr.heures) || 0), 0); const { error } = await supabase.from('chantier_tasks').update({ subtasks: updatedSubtasks, objectif_heures: newTotalHours }).eq('id', parentId); if(!error) { setTasks(tasks.map((t: any) => t.id === parentId ? { ...t, subtasks: updatedSubtasks, objectif_heures: newTotalHours } : t)); toast.success("Sous-tâche supprimée"); } };
  const saveSubTaskFull = async (parentId: string, subTaskId: number) => { if(!editingSubTaskData) return; const parentTask = tasks.find((t: any) => t.id === parentId); const updatedSubtasks = parentTask.subtasks.map((st: any) => st.id === subTaskId ? { ...st, label: editingSubTaskData.label, date: editingSubTaskData.date, effectif: parseInt(editingSubTaskData.effectif)||1, heures: parseFloat(editingSubTaskData.heures)||0 } : st); const newTotalHours = updatedSubtasks.reduce((acc: number, curr: any) => acc + (parseFloat(curr.heures) || 0), 0); const { error } = await supabase.from('chantier_tasks').update({ subtasks: updatedSubtasks, objectif_heures: newTotalHours }).eq('id', parentId); if(!error) { setTasks(tasks.map((t: any) => t.id === parentId ? { ...t, subtasks: updatedSubtasks, objectif_heures: newTotalHours } : t)); setEditingSubTaskData(null); } };
  const updateSubTaskProgress = async (parentId: string, subTaskId: number, avancement: number) => { const safeVal = Math.min(100, Math.max(0, avancement || 0)); const parentTask = tasks.find((t: any) => t.id === parentId); const updatedSubtasks = parentTask.subtasks.map((st: any) => st.id === subTaskId ? { ...st, avancement: safeVal, done: safeVal === 100 } : st); const { error } = await supabase.from('chantier_tasks').update({ subtasks: updatedSubtasks }).eq('id', parentId); if (!error) setTasks(tasks.map((t: any) => t.id === parentId ? { ...t, subtasks: updatedSubtasks } : t)); };
  
  const handleSectionPrint = (sectionId: string) => { const style = document.createElement('style'); style.id = 'print-section-style'; style.innerHTML = `@media print { body * { visibility: hidden; } #${sectionId}, #${sectionId} * { visibility: visible; } #${sectionId} { position: absolute; left: 0; top: 0; width: 100%; margin:0; padding:0; box-shadow:none; height: auto !important; min-height: 0 !important; display: block !important;} .custom-scrollbar { overflow: visible !important; height: auto !important; max-height: none !important; display: block !important; flex: none !important;} .flex-1 { flex: none !important; } .no-print { display: none !important; } }`; document.head.appendChild(style); window.print(); document.head.removeChild(style); };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        {/* 1. GESTION TÂCHES & SOUS-TÂCHES (Interactif) */}
        <div id="tasks-view" className="bg-[#34495e] rounded-[30px] p-6 shadow-xl text-white relative flex flex-col min-h-[500px]">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none print:hidden"><CheckCircle2 size={200} /></div>
            <div className="flex justify-between items-center mb-4 relative z-10"><h3 className="font-black uppercase text-xl flex items-center gap-2"><CheckCircle2 size={20}/> Tâches</h3><button onClick={() => handleSectionPrint('tasks-view')} className="bg-white/10 p-2 rounded-lg hover:bg-white/20 transition-colors print:hidden"><Printer size={18}/></button></div>
            <div className="flex gap-2 mb-4 relative z-10 print:hidden"><input placeholder="Nouvelle étape..." value={newTaskLabel} onChange={(e) => setNewTaskLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} className="flex-1 bg-white/10 rounded-xl p-3 text-sm font-bold text-white placeholder-white/40 outline-none border border-white/5 focus:bg-white/20 transition-colors" /><button onClick={addTask} className="bg-[#ff9f43] text-white p-3 rounded-xl hover:bg-[#e67e22] shadow-lg transition-transform active:scale-95"><Plus size={20}/></button></div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2 relative z-10">
                {tasks.map((t: any) => (
                    <div key={t.id} className={`p-4 rounded-2xl border transition-all ${t.done ? 'bg-black/20 border-transparent opacity-80' : 'bg-white/5 border-white/5'}`}>
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-start gap-3 flex-1">
                                <button onClick={() => toggleTask(t)} className={`mt-1 transition-colors ${t.done ? 'text-[#00b894]' : 'text-gray-500 hover:text-white'}`}>{t.done ? <CheckCircle2 size={24} /> : <Circle size={24} />}</button>
                                <div className="flex-1">
                                    {editingTaskId === t.id ? (
                                        <div className="flex gap-2 mb-2"><input className="bg-white/10 text-white rounded p-1 text-sm font-bold w-full outline-none focus:ring-1 ring-[#ff9f43]" defaultValue={t.label} onBlur={(e) => saveTaskLabel(t.id, e.target.value)} autoFocus onKeyDown={(e) => e.key === 'Enter' && saveTaskLabel(t.id, (e.target as HTMLInputElement).value)} /></div>
                                    ) : (
                                        <div className="flex justify-between group">
                                            <p className={`text-sm font-black uppercase tracking-tight ${t.done ? 'line-through text-gray-500' : 'text-[#ff9f43]'}`}>{t.label}{getTaskDateRange(t.subtasks) && <span className="text-[10px] font-bold text-gray-400 ml-2 normal-case border border-gray-500 px-1 rounded">({getTaskDateRange(t.subtasks)})</span>}</p>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity print:hidden"><button onClick={() => setEditingTaskId(t.id)} className="text-blue-400 hover:text-white"><Pencil size={14}/></button><button onClick={() => deleteTask(t.id)} className="text-red-400 hover:text-red-500"><Trash2 size={14}/></button></div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 mt-1"><div className="flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-lg border border-white/5"><UserPlus size={10} className="text-blue-400"/><select className="bg-transparent text-[9px] font-bold text-blue-200 outline-none cursor-pointer w-24" value={t.responsable_id || ''} onChange={(e) => updateTaskField(t.id, 'responsable_id', e.target.value)}><option value="" className="text-gray-800">Assigner...</option>{employes.map((emp: any) => <option key={emp.id} value={emp.id} className="text-gray-800">{emp.nom} {emp.prenom}</option>)}</select></div></div>
                                </div>
                            </div>
                            <div className="text-right pl-4">
                                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase justify-end"><Clock size={10}/> Prévu: {t.objectif_heures}h</div>
                                {t.done && (<div className="mt-1 flex items-center gap-2 justify-end animate-in fade-in"><span className="text-[9px] font-black uppercase text-[#ff9f43]">Réel :</span><input type="number" className="w-12 bg-white/10 text-center rounded border border-white/10 text-[10px] font-black py-0.5 outline-none focus:border-[#ff9f43] text-white" value={t.heures_reelles} onChange={(e) => updateTaskField(t.id, 'heures_reelles', parseFloat(e.target.value) || 0)} /></div>)}
                            </div>
                        </div>

                        <div className="mt-3 space-y-1 pl-4 border-l-2 border-white/10">
                            {t.subtasks && t.subtasks.map((st: any) => (
                                <React.Fragment key={st.id}>
                                    {editingSubTaskData?.id === st.id ? (
                                        <div className="flex flex-wrap items-center gap-2 w-full bg-black/30 p-2 rounded mb-1 border border-white/10">
                                            <input className="bg-white/10 text-white rounded p-1 text-[11px] flex-1 outline-none font-bold" value={editingSubTaskData.label} onChange={e => setEditingSubTaskData({...editingSubTaskData, label: e.target.value})} />
                                            <input type="date" className="bg-white/10 text-white rounded p-1 text-[11px] outline-none" value={editingSubTaskData.date} onChange={e => setEditingSubTaskData({...editingSubTaskData, date: e.target.value})} />
                                            <div className="flex items-center gap-1"><Users size={10} className="text-blue-400"/><input type="number" className="bg-white/10 text-white rounded p-1 text-[11px] w-10 outline-none text-center" value={editingSubTaskData.effectif} onChange={e => setEditingSubTaskData({...editingSubTaskData, effectif: e.target.value})} title="Effectif" /></div>
                                            <div className="flex items-center gap-1"><Clock size={10} className="text-orange-400"/><input type="number" className="bg-white/10 text-white rounded p-1 text-[11px] w-12 outline-none text-center" value={editingSubTaskData.heures} onChange={e => setEditingSubTaskData({...editingSubTaskData, heures: e.target.value})} title="Heures" /></div>
                                            <div className="flex gap-1 ml-auto"><button onClick={(e) => { e.stopPropagation(); saveSubTaskFull(t.id, st.id); }} className="bg-green-500 px-2 py-1 rounded text-white text-[10px] font-bold hover:bg-green-600">OK</button><button onClick={(e) => { e.stopPropagation(); setEditingSubTaskData(null); }} className="bg-red-500 px-2 py-1 rounded text-white text-[10px] font-bold hover:bg-red-600">X</button></div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between text-[11px] py-1 group">
                                            <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => toggleSubTask(t.id, st.id)}>
                                                {st.done ? <CheckCircle2 size={12} className="text-green-400"/> : <Circle size={12} className="text-white/30"/>}
                                                <span className={`${st.done ? 'line-through text-white/30' : 'text-white/80'} hover:text-white flex items-center gap-2`}>{st.label}{st.date && <span className="text-[9px] text-[#00b894] font-bold">[{new Date(st.date).toLocaleDateString('fr-FR')}]</span>}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-bold text-white/40 hidden md:inline">{st.heures}h / {st.effectif}p</span>
                                                <div className="flex items-center gap-1 bg-black/30 px-1 rounded border border-white/10" title="% Avancement"><input type="number" min="0" max="100" className="bg-transparent w-8 text-[9px] font-bold text-white outline-none text-right" value={st.avancement || 0} onChange={(e) => updateSubTaskProgress(t.id, st.id, parseInt(e.target.value))} onClick={(e) => e.stopPropagation()}/><span className="text-[9px] text-white/50">%</span></div>
                                                <div className="opacity-0 group-hover:opacity-100 flex gap-1 print:hidden"><button onClick={(e) => { e.stopPropagation(); setEditingSubTaskData({id: st.id, label: st.label, date: st.date || '', heures: st.heures, effectif: st.effectif}); }} className="text-blue-400 hover:text-white"><Pencil size={10}/></button><button onClick={(e) => { e.stopPropagation(); deleteSubTask(t.id, st.id); }} className="text-red-400 hover:text-red-500"><Trash2 size={10}/></button></div>
                                            </div>
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                            {!t.done && <button onClick={() => setActiveParentTask(activeParentTask === t.id ? null : t.id)} className="text-[9px] font-black uppercase text-white/20 hover:text-white/50 py-1 transition-colors print:hidden">+ Ajouter sous-tâche</button>}
                        </div>
                        {activeParentTask === t.id && (<div className="mt-3 bg-black/20 p-3 rounded-lg flex flex-col gap-2 animate-in fade-in"><input type="text" placeholder="Nom de la sous-tâche..." className="bg-transparent text-xs text-white placeholder-white/30 outline-none border-b border-white/10 p-1" value={newSubTask.label} onChange={e => setNewSubTask({...newSubTask, label: e.target.value})} /><div className="flex gap-2 items-center"><input type="date" className="bg-transparent text-xs text-white/70 outline-none w-24 border-b border-white/10 p-1" value={newSubTask.date} onChange={e => setNewSubTask({...newSubTask, date: e.target.value})} /><div className="flex items-center gap-1 bg-white/5 rounded px-2"><Users size={12} className="text-blue-400"/><input type="number" placeholder="P" className="bg-transparent text-xs text-white outline-none w-10 text-center p-1" value={newSubTask.effectif || ''} onChange={e => setNewSubTask({...newSubTask, effectif: parseInt(e.target.value) || 1})} /></div><div className="flex items-center gap-1 bg-white/5 rounded px-2"><Clock size={12} className="text-orange-400"/><input type="number" placeholder="H" className="bg-transparent text-xs text-white outline-none w-10 text-center p-1" value={newSubTask.heures || ''} onChange={e => setNewSubTask({...newSubTask, heures: parseFloat(e.target.value) || 0})} /></div><button onClick={() => addSubTask(t.id)} className="bg-green-500 text-white px-3 py-1 rounded text-[10px] font-bold uppercase ml-auto hover:bg-green-600 transition-colors">Ajouter</button></div></div>)}
                    </div>
                ))}
            </div>
        </div>

        {/* 2. GANTT VISUEL */}
        <div id="planning-view" className="bg-white rounded-[30px] p-8 shadow-sm border border-gray-100 relative">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-black uppercase text-gray-700 flex items-center gap-2"><BarChart2 className="text-[#00b894]"/> Tâches & Planning (Gantt)</h3>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl"><Users size={18} className="text-blue-600"/><span className="text-sm font-black text-blue-800">Effectif Total : {chantier.effectif_prevu} pers.</span></div>
                    <button onClick={() => handleSectionPrint('planning-view')} className="bg-gray-100 p-2 rounded-lg hover:bg-gray-200 transition-colors print:hidden"><Printer size={18} className="text-gray-600"/></button>
                </div>
            </div>
            <div className="space-y-6">
                {tasks.map((t: any, idx: number) => (
                    <div key={t.id} className="relative">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-48 font-bold text-sm truncate" title={t.label}>{t.label}{getTaskDateRange(t.subtasks) && <div className="text-[9px] text-gray-400 mt-0.5">{getTaskDateRange(t.subtasks)}</div>}</div>
                            <div className="flex-1 bg-gray-100 h-8 rounded-full relative overflow-hidden"><div className="absolute top-0 left-0 h-full bg-[#00b894] opacity-80 flex items-center px-3 text-[10px] text-white font-bold" style={{ width: `${Math.min(100, Math.max(10, t.objectif_heures * 2))}%` }}>{t.objectif_heures}h</div></div>
                        </div>
                        {t.subtasks && t.subtasks.map((st: any) => {
                            const leftPos = (new Date(st.date || new Date()).getDate() % 30) * 3; const targetWidth = Math.max(15, st.heures * 2); const safeWidth = Math.min(targetWidth, 100 - leftPos); const isDone = st.done || st.avancement === 100;
                            return (
                                <div key={st.id} className="flex items-center gap-4 mb-1 pl-8 relative group">
                                    <CornerDownRight size={14} className="text-gray-300 absolute left-2 top-2"/>
                                    <div className="w-40 text-xs text-gray-500 truncate flex justify-between pr-4"><span>{st.label}</span><span className="font-black text-blue-500">{st.effectif}p</span></div>
                                    <div className="flex-1 bg-gray-50 h-6 rounded-full relative overflow-hidden border border-gray-100">
                                        <div className={`absolute top-0 h-full rounded-full overflow-hidden flex items-center justify-center px-2 text-[9px] text-white font-bold ${isDone ? 'bg-blue-400' : 'bg-orange-300'}`} style={{ left: `${leftPos}%`, width: `${safeWidth}%` }}>
                                            <div className="absolute left-0 top-0 h-full bg-black/20 transition-all duration-300" style={{ width: `${st.avancement || 0}%` }}></div>
                                            <span className="relative z-10">{st.heures}h | {st.avancement || 0}%</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    </div>
  )
}

function HseTab({ data }: { data: any }) {
  const { state: { chantier }, setters: { setChantier } } = data;
  const toggleArrayItem = (field: 'risques' | 'epi', value: string) => { const current = (chantier as any)[field] || []; setChantier({ ...chantier, [field]: current.includes(value) ? current.filter((i: string) => i !== value) : [...current, value] }); };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
        <div className="bg-[#e17055] text-white rounded-[30px] p-6 shadow-xl relative overflow-hidden"><h3 className="font-black uppercase text-xl mb-4 flex items-center gap-2"><AlertTriangle/> Alertes Risques</h3><div className="space-y-3 relative z-10">{RISK_OPTIONS.map((risk: string) => (<label key={risk} className="flex items-center gap-3 bg-white/10 p-3 rounded-xl cursor-pointer hover:bg-white/20 transition-colors border border-white/5"><div onClick={() => toggleArrayItem('risques', risk)} className={`w-5 h-5 rounded flex items-center justify-center border-2 border-white ${chantier.risques?.includes(risk) ? 'bg-white' : 'bg-transparent'}`}>{chantier.risques?.includes(risk) && <CheckSquare size={14} className="text-[#e17055]" />}</div><span className="font-bold text-sm uppercase">{risk}</span></label>))}</div><AlertTriangle size={150} className="absolute -right-5 -bottom-5 text-orange-900 opacity-10 rotate-12 pointer-events-none" /></div>
        <div className="bg-[#00b894] text-white rounded-[30px] p-6 shadow-xl relative overflow-hidden"><h3 className="font-black uppercase text-xl mb-4 flex items-center gap-2"><Shield/> EPI Obligatoires</h3><div className="grid grid-cols-2 gap-3 relative z-10">{EPI_OPTIONS.map((epi: string) => (<label key={epi} className="flex items-center gap-3 bg-white/10 p-3 rounded-xl cursor-pointer hover:bg-white/20 transition-colors border border-white/5"><div onClick={() => toggleArrayItem('epi', epi)} className={`w-5 h-5 rounded flex items-center justify-center border-2 border-white ${chantier.epi?.includes(epi) ? 'bg-white' : 'bg-transparent'}`}>{chantier.epi?.includes(epi) && <CheckSquare size={14} className="text-[#00b894]" />}</div><span className="font-bold text-[11px] uppercase leading-tight">{epi}</span></label>))}</div><Shield size={150} className="absolute -right-5 -bottom-5 text-emerald-900 opacity-10 rotate-12 pointer-events-none" /></div>
    </div>
  )
}

function AcqpaTab({ data }: { data: any }) {
  const { state: { acqpaData }, setters: { setAcqpaData }, actions } = data;
  const [showACQPAModal, setShowACQPAModal] = useState(false);
  const addCouche = () => { setAcqpaData({ ...acqpaData, couches: [...(acqpaData.couches || []), { type: '', lot: '', methode: '', dilution: '' }] }); toast.success("Couche ajoutée"); };
  const removeCouche = (index: number) => { const n = [...acqpaData.couches]; n.splice(index, 1); setAcqpaData({ ...acqpaData, couches: n }); toast.success("Couche supprimée"); };
  const updateCouche = (index: number, field: string, value: string) => { const n = [...acqpaData.couches]; n[index][field] = value; setAcqpaData({ ...acqpaData, couches: n }); };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4">
        <div className="space-y-6">
            <div className="bg-[#0984e3] text-white p-6 rounded-[30px] shadow-xl flex justify-between items-center relative overflow-hidden"><div className="relative z-10"><h3 className="font-black uppercase text-xl">Relevés Peinture (ACQPA)</h3><p className="text-blue-200 font-bold text-sm">Suivi qualité application</p></div><button onClick={() => setShowACQPAModal(true)} className="bg-white text-[#0984e3] px-6 py-3 rounded-xl font-black uppercase shadow-lg hover:scale-105 transition-transform relative z-10">Ouvrir / Modifier</button><ClipboardCheck size={100} className="absolute -right-0 -bottom-5 text-blue-900 opacity-10 rotate-12 pointer-events-none" /></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4"><div className="bg-white p-4 rounded-[20px] shadow-sm border-l-4 border-blue-400"><p className="text-[10px] font-bold text-gray-400 uppercase">Hygrométrie</p><p className="text-xl font-black text-gray-800">{acqpaData.hygrometrie || '--'} %</p></div><div className="bg-white p-4 rounded-[20px] shadow-sm border-l-4 border-green-400"><p className="text-[10px] font-bold text-gray-400 uppercase">DFT Moy.</p><p className="text-xl font-black text-gray-800">{acqpaData.dft_mesure || '--'} µm</p></div><div className="bg-white p-4 rounded-[20px] shadow-sm border-l-4 border-purple-400"><p className="text-[10px] font-bold text-gray-400 uppercase">Inspecteur</p><p className="text-xl font-black text-gray-800 truncate">{acqpaData.inspecteur_nom || '--'}</p></div><div className="bg-white p-4 rounded-[20px] shadow-sm border-l-4 border-orange-400"><p className="text-[10px] font-bold text-gray-400 uppercase">Couches</p><p className="text-xl font-black text-gray-800">{acqpaData.couches?.length || 0}</p></div></div>
        </div>
        
        {showACQPAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto print:hidden">
            <div className="bg-white rounded-[30px] w-full max-w-5xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                <div className="bg-[#0984e3] p-6 text-white flex justify-between items-center shrink-0"><div><h2 className="text-2xl font-black uppercase tracking-tight">Formulaire ACQPA</h2><p className="text-blue-100 font-bold text-xs uppercase tracking-widest">Contrôle Qualité Peinture</p></div><button onClick={() => setShowACQPAModal(false)} className="bg-white/20 p-2 rounded-full hover:bg-white/40 transition-colors"><X size={24} /></button></div>
                <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                    <section><h3 className="flex items-center gap-2 font-black text-gray-800 uppercase text-lg mb-4 border-b border-gray-100 pb-2"><Thermometer className="text-[#0984e3]"/> Ambiance</h3><div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">{[{l:'Temp. Air (°C)',k:'temp_air'},{l:'Temp. Support (°C)',k:'temp_support'},{l:'Hygrométrie (%)',k:'hygrometrie'},{l:'Point Rosée (°C)',k:'point_rosee'},{l:'Delta T',k:'delta_t'}].map((f: any)=><div key={f.k}><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">{f.l}</label><input type="number" className="w-full bg-gray-50 border border-gray-100 p-2 rounded-xl font-bold text-gray-800 text-center outline-none focus:border-[#0984e3] focus:bg-white transition-colors" value={acqpaData[f.k]||''} onChange={e=>setAcqpaData({...acqpaData,[f.k]:e.target.value})}/></div>)}</div></section>
                    <section><h3 className="flex items-center gap-2 font-black text-gray-800 uppercase text-lg mb-4 border-b border-gray-100 pb-2"><Layers className="text-[#0984e3]"/> Préparation Support</h3><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{[{l:'Degré de Soin',k:'degre_soin'},{l:'Propreté',k:'proprete'},{l:'Rugosité (µm)',k:'rugosite'},{l:'Sels Solubles',k:'sels'}].map((f: any)=><div key={f.k}><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">{f.l}</label><input type="text" className="w-full bg-gray-50 border border-gray-100 p-2 rounded-xl font-bold text-gray-800 outline-none focus:border-[#0984e3] focus:bg-white transition-colors" value={acqpaData[f.k]||''} onChange={e=>setAcqpaData({...acqpaData,[f.k]:e.target.value})}/></div>)}</div></section>
                    <section><div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2"><h3 className="flex items-center gap-2 font-black text-gray-800 uppercase text-lg"><Droplets className="text-[#0984e3]"/> Produits & Couches</h3><button onClick={addCouche} className="flex items-center gap-1 bg-blue-50 text-[#0984e3] px-3 py-1 rounded-lg text-xs font-black uppercase hover:bg-blue-100 transition-colors"><Plus size={14}/> Ajouter</button></div><div className="space-y-4">{acqpaData.couches && acqpaData.couches.map((c:any,i:number)=>(<div key={i} className="bg-gray-50 p-4 rounded-xl relative group"><div className="absolute -top-3 left-3 bg-[#0984e3] text-white text-[10px] font-bold px-2 py-0.5 rounded">Couche {i+1}</div><button onClick={()=>removeCouche(i)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button><div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2"><div><label className="text-[9px] font-bold text-gray-400 uppercase">Type</label><input className="w-full bg-white border border-gray-200 p-2 rounded-lg font-bold" value={c.type} onChange={e=>updateCouche(i,'type',e.target.value)}/></div><div><label className="text-[9px] font-bold text-gray-400 uppercase">Lot</label><input className="w-full bg-white border border-gray-200 p-2 rounded-lg font-bold" value={c.lot} onChange={e=>updateCouche(i,'lot',e.target.value)}/></div><div><label className="text-[9px] font-bold text-gray-400 uppercase">Méthode</label><input className="w-full bg-white border border-gray-200 p-2 rounded-lg font-bold" value={c.methode} onChange={e=>updateCouche(i,'methode',e.target.value)}/></div><div><label className="text-[9px] font-bold text-gray-400 uppercase">Dilution</label><input type="number" className="w-full bg-white border border-gray-200 p-2 rounded-lg font-bold" value={c.dilution} onChange={e=>updateCouche(i,'dilution',e.target.value)}/></div></div></div>))}</div><div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6"><div className="col-span-2 md:col-span-1"><label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Date Appli</label><input type="date" className="w-full bg-gray-50 p-2 rounded-xl font-bold text-gray-800 outline-none border border-gray-100 focus:border-[#0984e3]" value={acqpaData.app_date || ''} onChange={e => setAcqpaData({...acqpaData, app_date: e.target.value})} /></div><div className="col-span-2 md:col-span-1"><label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Applicateur</label><input className="w-full bg-gray-50 p-2 rounded-xl font-bold text-gray-800 outline-none border border-gray-100 focus:border-[#0984e3]" value={acqpaData.app_nom || ''} onChange={e => setAcqpaData({...acqpaData, app_nom: e.target.value})} /></div><div><label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">DFT Théorique (µm)</label><input type="number" className="w-full bg-gray-50 p-2 rounded-xl font-bold text-center text-gray-800 outline-none border border-gray-100 focus:border-[#0984e3]" value={acqpaData.dft_theo || ''} onChange={e => setAcqpaData({...acqpaData, dft_theo: e.target.value})} /></div></div></section>
                    <section><h3 className="flex items-center gap-2 font-black text-gray-800 uppercase text-lg mb-4 border-b border-gray-100 pb-2"><Ruler className="text-[#0984e3]"/> Contrôles Finaux</h3><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">{[{l:'Ep. Humide',k:'ep_humide'},{l:'Ep. Sèche',k:'dft_mesure'},{l:'Adhérence',k:'adherence'},{l:'Défauts',k:'defauts',t:'text'},{l:'Retouches',k:'retouches',t:'text'}].map((f: any)=><div key={f.k}><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">{f.l}</label><input type={f.t||'number'} className="w-full bg-gray-50 border border-gray-100 p-2 rounded-xl font-bold text-gray-800 text-center outline-none focus:border-[#0984e3] focus:bg-white transition-colors" value={acqpaData[f.k]||''} onChange={e=>setAcqpaData({...acqpaData,[f.k]:e.target.value})}/></div>)}</div></section>
                </div>
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-4"><button onClick={()=>{setShowACQPAModal(false);actions.handleSave()}} className="bg-[#0984e3] text-white px-8 py-3 rounded-xl font-black uppercase shadow-lg hover:scale-105 transition-transform">Enregistrer & Fermer</button></div>
            </div>
        </div>
      )}
    </div>
  )
}

function DocsTab({ data }: { data: any }) {
  const { state: { chantier, documents }, actions } = data;
  const [uploading, setUploading] = useState(false);

  const deleteDocument = async (docId: string) => { if(confirm('Supprimer ?')) { await supabase.from('chantier_documents').delete().eq('id', docId); actions.refresh(); toast.success("Document supprimé"); } };
  const handleFileUpload = async (e: any) => { 
      if (!e.target.files?.length) return; 
      setUploading(true); 
      const toastId = toast.loading("Upload en cours...");
      const file = e.target.files[0]; 
      const filePath = `${chantier.id}/${Math.random()}.${file.name.split('.').pop()}`; 
      const { error } = await supabase.storage.from('documents').upload(filePath, file); 
      
      if(!error) { 
          const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath); 
          await supabase.from('chantier_documents').insert([{ chantier_id: chantier.id, nom: file.name, url: publicUrl, type: file.type.startsWith('image/') ? 'image' : 'pdf' }]); 
          toast.success("Document ajouté avec succès", { id: toastId });
          actions.refresh(); 
      } else {
          toast.error("Erreur d'upload", { id: toastId });
      }
      setUploading(false); 
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4">
        <div className="bg-[#6c5ce7] p-8 rounded-[30px] text-white shadow-xl flex flex-col items-center justify-center text-center border-4 border-dashed border-white/20 relative overflow-hidden group mb-6 hover:bg-[#5f27cd] cursor-pointer transition-colors"><UploadCloud size={40} className="mb-2" /><p className="font-black uppercase text-xl">Ajouter Photos / Docs</p><input type="file" onChange={handleFileUpload} disabled={uploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" /></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{documents.map((doc: any) => (<div key={doc.id} className="bg-white p-3 rounded-[25px] shadow-sm h-[180px] flex flex-col relative group hover:shadow-lg transition-all border border-gray-100"><div className="flex-1 bg-gray-50 rounded-[15px] mb-2 flex items-center justify-center overflow-hidden">{doc.type === 'image' ? <img src={doc.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform"/> : <FileText size={40} className="text-gray-300"/>}</div><div className="flex justify-between items-center px-2"><p className="text-xs font-bold text-gray-600 truncate w-20">{doc.nom}</p><div className="flex gap-2"><a href={doc.url} target="_blank" className="text-gray-400 hover:text-blue-500"><Eye size={16}/></a><button onClick={() => deleteDocument(doc.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button></div></div></div>))}</div>
    </div>
  )
}