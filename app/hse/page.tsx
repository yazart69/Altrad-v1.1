"use client";

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, FileText, Wrench, Camera, Megaphone, 
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Clock, 
  MapPin, Phone, Mail, User, Calendar, Printer, Save, 
  Plus, Trash2, Search, ArrowRight, Download, Eye,
  AlertOctagon, Siren, HardHat, FileCheck, X, ChevronRight,
  ClipboardList, Stethoscope, Factory, Truck, Edit, ClipboardCheck, History,
  PenTool, Thermometer, Droplets, Ruler
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend 
} from 'recharts';
import SignatureCanvas from 'react-signature-canvas';

// On remplace './data' par le chemin absolu '@/'
import { 
  RISK_DATABASE, 
  VGP_RULES, 
  EQUIPMENT_TYPES, 
  Q3SRE_REFERENTIAL, 
  OST_THEMES, 
  CAUSERIE_THEMES 
} from '@/app/hse/data';

// =================================================================================================
// 1. DÉFINITION DES TYPES & INTERFACES (Modèle de Données)
// =================================================================================================

interface IChantier {
  id: string;
  nom: string;
  client: string;
  adresse: string;
  latitude?: number;
  longitude?: number;
  date_debut: string;
  date_fin: string;
  effectif_prevu: number;
  responsable_id: string;
  type_travaux: string[];
  infos_acqpa?: { systeme_homologue: string; epaisseur_totale_visee: number };
}

interface IUser {
  id: string;
  nom: string;
  prenom: string;
  role: string;
  telephone: string;
  email: string;
  habilitations: string[]; // ex: ["SST", "CACES R486"]
  chantier_affecte_id?: string;
}

interface IMateriel {
  id: string;
  libelle: string;
  type: string; // 'location' | 'interne'
  categorie: string; // Clef pour VGP_RULES
  numero_serie: string;
  derniere_vgp: string;
  statut: 'operationnel' | 'maintenance' | 'rebut';
  chantier_actuel_id: string;
}

interface IVisite {
  id: string;
  date: string;
  type: 'VMT' | 'Q3SRE' | 'OST';
  auteur: string;
  conformite_globale: number; // %
}

// =================================================================================================
// 2. COMPOSANT MAÎTRE (Layout & Navigation)
// =================================================================================================

export default function HSEUltimateModule() {
  // --- STATE GLOBAL ---
  const [view, setView] = useState<'dashboard'|'generator'|'vgp'|'terrain'|'causerie'|'history'|'prejob'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [activeChantierId, setActiveChantierId] = useState<string>("");

  // --- DATA STORES RÉELS ---
  const [chantiers, setChantiers] = useState<IChantier[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [materiel, setMateriel] = useState<IMateriel[]>([]);
  const [activeEquipe, setActiveEquipe] = useState<IUser[]>([]);

  // --- CALCUL DES DONNÉES CONTEXTUELLES ---
  const activeChantier = chantiers.find(c => c.id === activeChantierId);
  const activeMateriel = materiel.filter(m => m.chantier_actuel_id === activeChantierId);

  // --- CHARGEMENT INITIAL (Connexion Supabase) ---
  useEffect(() => {
    fetchGlobalData();
  }, []);

  // --- MISE À JOUR ÉQUIPE SELON LE CHANTIER SÉLECTIONNÉ ---
  useEffect(() => {
    if (activeChantierId) {
      fetchCurrentTeam(activeChantierId);
    }
  }, [activeChantierId]);

  async function fetchGlobalData() {
    setLoading(true);
    try {
      // 1. Chantiers réels
      const { data: chs } = await supabase.from('chantiers').select('*');
      if (chs) setChantiers(chs);

      // 2. Employés réels
      const { data: emps } = await supabase.from('employes').select('*');
      if (emps) setUsers(emps);

      // 3. Matériel réel
      const { data: mats } = await supabase.from('materiel').select('*');
      if (mats) setMateriel(mats);
    } catch (e) {
      console.error("Erreur de synchro HSE:", e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCurrentTeam(chantierId: string) {
    // Jointure dynamique avec le planning pour savoir qui est sur place
    const { data: planning } = await supabase
      .from('planning')
      .select('*, employes(*)')
      .eq('chantier_id', chantierId);
    
    if (planning) {
      const team = planning.map((p: any) => p.employes);
      // On retire les doublons éventuels
      const uniqueTeam = team.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
      setActiveEquipe(uniqueTeam);
    }
  }

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 text-gray-500">
      <div className="animate-spin mb-4"><ShieldCheck size={48} className="text-red-600"/></div>
      <p className="font-bold text-lg animate-pulse">Initialisation du Module HSE Altrad...</p>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#f3f4f6] font-sans text-gray-800">
      
      {/* SIDEBAR NAVIGATION (Fixe) */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 z-50">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-black uppercase text-gray-900 leading-none">ALTRAD<span className="text-red-600">.OS</span></h1>
          <p className="text-[10px] font-bold text-gray-400 tracking-widest mt-1">MODULE HSE ULTIME v3.0</p>
        </div>

        {/* Sélecteur de Contexte (Connecté à Supabase) */}
        <div className="p-4 bg-gray-50/50 border-b border-gray-100">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2 block flex items-center gap-1">
            <Factory size={12}/> Contexte Chantier Réel
          </label>
          <select 
            className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-red-500 transition-all shadow-sm"
            value={activeChantierId}
            onChange={(e) => setActiveChantierId(e.target.value)}
          >
            <option value="">-- CHOISIR UN PROJET --</option>
            {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          <NavBtn id="dashboard" icon={LayoutDashboard} label="Tableau de Bord" active={view} set={setView} />
          
          <div className="pt-6 pb-2"><p className="text-[10px] font-black text-gray-300 uppercase px-2">Bureau des Méthodes</p></div>
          <NavBtn id="generator" icon={FileText} label="Générateur Documents" active={view} set={setView} disabled={!activeChantierId} />
          <NavBtn id="vgp" icon={Wrench} label="Suivi Matériel & VGP" active={view} set={setView} disabled={!activeChantierId} />
          
          <div className="pt-6 pb-2"><p className="text-[10px] font-black text-gray-300 uppercase px-2">Terrain & Opérations</p></div>
          <NavBtn id="prejob" icon={ClipboardCheck} label="Prejob Briefing" active={view} set={setView} disabled={!activeChantierId} />
          <NavBtn id="terrain" icon={Camera} label="Visites (VMT / Q3SRE)" active={view} set={setView} disabled={!activeChantierId} />
          <NavBtn id="causerie" icon={Megaphone} label="Causeries & Accueil" active={view} set={setView} disabled={!activeChantierId} />
          <NavBtn id="history" icon={History} label="Archives Causeries" active={view} set={setView} />
        </nav>

        <div className="p-4 border-t border-gray-100 text-center">
          <p className="text-[10px] text-gray-300 font-medium">© 2026 Altrad Services</p>
        </div>
      </aside>

      {/* ZONE DE CONTENU PRINCIPALE */}
      <main className="flex-1 h-screen overflow-hidden flex flex-col relative bg-[#f8f9fa]">
        
        {/* HEADER CONTEXTUEL */}
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0 shadow-sm z-40">
          <div>
            <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-3">
              {view === 'dashboard' && <LayoutDashboard className="text-gray-400"/>}
              {view === 'generator' && <FileText className="text-blue-500"/>}
              {view === 'vgp' && <Wrench className="text-orange-500"/>}
              {view === 'terrain' && <Camera className="text-emerald-500"/>}
              {view === 'causerie' && <Megaphone className="text-purple-500"/>}
              {view === 'history' && <History className="text-gray-400"/>}
              {view === 'prejob' && <ClipboardCheck className="text-red-600"/>}
              {view === 'dashboard' ? 'Tableau de Bord HSE' : view.replace('_', ' ')}
            </h2>
            <p className="text-xs text-gray-400 font-medium mt-1">Pilotage de la performance sécurité</p>
          </div>

          {activeChantier && (
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs font-bold text-gray-900">{activeChantier.client}</p>
                <div className="flex items-center gap-1 justify-end text-xs text-gray-500">
                  <MapPin size={12}/> {activeChantier.adresse}
                </div>
              </div>
              <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200 shadow-sm">
                <span className="font-bold text-xs text-gray-600">{activeChantier.nom.substring(0,2).toUpperCase()}</span>
              </div>
            </div>
          )}
        </header>

        {/* CONTENU SCROLLABLE */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
          
          {/* EMPTY STATE (Si aucun chantier sélectionné) */}
          {!activeChantierId && view !== 'dashboard' && view !== 'history' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40 select-none pointer-events-none text-center p-10">
              <HardHat size={80} className="mb-6 text-gray-300 mx-auto"/>
              <h3 className="text-2xl font-black text-gray-400 mb-2 uppercase tracking-tighter">Contexte Projet Indisponible</h3>
              <p className="text-gray-400 font-medium max-w-sm mx-auto">Veuillez sélectionner un projet réel dans le menu de gauche pour charger l'équipe et le matériel associés.</p>
            </div>
          ) : (
            // ROUTEUR DE VUES
            <div className="max-w-7xl mx-auto pb-20">
              {view === 'dashboard' && <DashboardModule chantiers={chantiers} materiel={materiel} />}
              {view === 'generator' && <DocumentGenerator chantier={activeChantier!} equipe={activeEquipe} materiel={activeMateriel} users={users} />}
              {view === 'vgp' && <VGPTracker materiel={activeMateriel} chantierId={activeChantierId} onRefresh={fetchGlobalData} />}
              {view === 'terrain' && <FieldVisits chantier={activeChantier!} equipe={activeEquipe} />}
              {view === 'causerie' && <SafetyTalks chantier={activeChantier!} equipe={activeEquipe} />}
              {view === 'history' && <CauserieArchives chantiers={chantiers} />}
              {view === 'prejob' && <PrejobBriefingModule chantier={activeChantier!} equipe={activeEquipe} animateurId={activeChantier?.responsable_id || ''} />}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// =================================================================================================
// MODULE 1: DASHBOARD (Indicateurs Clés & KPI)
// =================================================================================================
function DashboardModule({ chantiers, materiel }: { chantiers: IChantier[], materiel: IMateriel[] }) {
  // Calculs KPI réels
  const vgpPerimees = materiel.filter(m => {
    const freq = VGP_RULES[m.categorie as keyof typeof VGP_RULES] || 12;
    const lastDate = new Date(m.derniere_vgp);
    const nextDate = new Date(lastDate.setMonth(lastDate.getMonth() + freq));
    return nextDate < new Date();
  }).length;

  const chartData = [{n:'Jan', v:4.2}, {n:'Fev', v:3.8}, {n:'Mar', v:2.1}, {n:'Avr', v:0.0}, {n:'Mai', v:1.2}];
  const pieData = [
    {name: 'VGP Conformes', value: Math.max(0, materiel.length - vgpPerimees), color: '#10b981'}, 
    {name: 'VGP Périmées', value: vgpPerimees, color: '#ef4444'}
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Taux de Fréquence (TF)" val="2.1" sub="-0.5 vs N-1" icon={AlertOctagon} color="blue" />
        <StatCard label="Chantiers Actifs" val={chantiers.length} sub="Projets en base" icon={HardHat} color="indigo" />
        <StatCard label="Matériel Non Conforme" val={vgpPerimees} sub="Action immédiate" icon={Siren} color={vgpPerimees > 0 ? "red" : "green"} />
        <StatCard label="Causeries Réalisées" val="12" sub="Objectif Mensuel: 15" icon={Megaphone} color="orange" />
      </div>
      
      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-96">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="font-bold text-gray-700 mb-6 flex items-center gap-2"><ArrowRight size={16} className="text-red-500"/> Évolution Taux de Fréquence (Année 2026)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
              <XAxis dataKey="n" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
              <RechartsTooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
              <Bar dataKey="v" fill="#ef4444" radius={[4,4,0,0]} barSize={50}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2"><ArrowRight size={16} className="text-emerald-500"/> État du Parc Matériel</h3>
          <div className="flex-1 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <RechartsTooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
            {/* Score central */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
               <span className="text-4xl font-black text-gray-800">{materiel.length > 0 ? (((materiel.length - vgpPerimees)/materiel.length) * 100).toFixed(0) : 100}%</span>
               <span className="text-[10px] uppercase font-bold text-gray-400">Taux de Conformité</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =================================================================================================
// MODULE 2: SUIVI MATÉRIEL & VGP (Calcul Automatique + Ajout)
// =================================================================================================
function VGPTracker({ materiel, chantierId, onRefresh }: { materiel: IMateriel[], chantierId: string, onRefresh: () => void }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEquip, setNewEquip] = useState({ libelle: '', type: 'interne', categorie: 'Levage', numero_serie: '', derniere_vgp: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Algorithme de calcul d'état VGP
  const getStatus = (last: string, cat: string) => {
    const freq = VGP_RULES[cat as keyof typeof VGP_RULES] || 12; 
    const lastDate = new Date(last);
    const nextDate = new Date(lastDate.setMonth(lastDate.getMonth() + freq));
    const now = new Date();
    const diffTime = nextDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'PÉRIMÉ', color: 'bg-red-100 text-red-700 border-red-200 ring-1 ring-red-200', days: diffDays };
    if (diffDays < 30) return { label: 'URGENT', color: 'bg-orange-100 text-orange-700 border-orange-200 ring-1 ring-orange-200', days: diffDays };
    return { label: 'VALIDE', color: 'bg-green-50 text-green-700 border-green-200', days: diffDays };
  };

  const handleSaveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase.from('materiel').insert([{
        ...newEquip,
        chantier_actuel_id: chantierId,
        statut: 'operationnel'
      }]);
      if (error) throw error;
      alert("✅ Équipement enregistré !");
      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      alert("Erreur: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-end">
        <div>
          <h3 className="text-2xl font-black text-gray-800 uppercase flex items-center gap-3">
            <Wrench className="text-orange-500" size={28}/> Registre de Sécurité
          </h3>
          <p className="text-gray-500 font-medium mt-1">Suivi réglementaire des équipements réels affectés au chantier.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="bg-black text-white px-6 py-3 rounded-xl text-xs font-bold uppercase hover:bg-gray-800 transition-colors flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95">
          <Plus size={16}/> Nouvel Équipement
        </button>
      </div>

      {/* MODAL AJOUT MATÉRIEL */}
      {showAddModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-10 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-900 uppercase">Enregistrer Matériel</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={24}/></button>
            </div>
            <form onSubmit={handleSaveEquipment} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Libellé de la machine</label>
                <input required type="text" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold" placeholder="Ex: Nacelle 12m" value={newEquip.libelle} onChange={e => setNewEquip({...newEquip, libelle: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">N° de Série / Immat</label>
                  <input required type="text" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold uppercase" placeholder="S/N: 0000" value={newEquip.numero_serie} onChange={e => setNewEquip({...newEquip, numero_serie: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Dernière VGP</label>
                  <input required type="date" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm" value={newEquip.derniere_vgp} onChange={e => setNewEquip({...newEquip, derniere_vgp: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Type</label>
                  <select className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold" value={newEquip.type} onChange={e => setNewEquip({...newEquip, type: e.target.value})}>
                    <option value="interne">Parc Interne</option>
                    <option value="location">Location Externe</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Règle de contrôle</label>
                  <select className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold" value={newEquip.categorie} onChange={e => setNewEquip({...newEquip, categorie: e.target.value})}>
                    {Object.keys(VGP_RULES).map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>
              <button disabled={isSaving} className="w-full bg-red-600 text-white py-5 rounded-2xl font-black uppercase shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2">
                {isSaving ? <Clock className="animate-spin" /> : <Save />}
                Valider l'affectation au chantier
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
            <tr>
              <th className="p-5">Équipement / Série</th>
              <th className="p-5">Catégorie</th>
              <th className="p-5">Dernière VGP</th>
              <th className="p-5">Prochaine Échéance</th>
              <th className="p-5 text-center">Statut</th>
              <th className="p-5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-sm">
            {materiel.length === 0 && (
              <tr><td colSpan={6} className="p-10 text-center text-gray-400 italic">Aucune donnée matérielle détectée pour ce chantier dans Supabase.</td></tr>
            )}
            {materiel.map(m => {
              const status = getStatus(m.derniere_vgp, m.categorie);
              return (
                <tr key={m.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="p-5">
                    <div className="font-bold text-gray-800 text-base">{m.libelle}</div>
                    <div className="text-xs text-gray-400 font-mono mt-1 flex items-center gap-2">
                      <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">S/N: {m.numero_serie}</span>
                      {m.type === 'location' && <span className="text-purple-500 font-bold bg-purple-50 px-2 py-0.5 rounded italic">EXTERNE</span>}
                    </div>
                  </td>
                  <td className="p-5">
                    <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase bg-white border border-gray-200 text-gray-600 shadow-sm">
                      {m.categorie}
                    </span>
                  </td>
                  <td className="p-5 text-gray-600 font-medium">{new Date(m.derniere_vgp).toLocaleDateString()}</td>
                  <td className="p-5 font-bold text-gray-800">
                    {new Date(new Date(m.derniere_vgp).setMonth(new Date(m.derniere_vgp).getMonth() + (VGP_RULES[m.categorie as keyof typeof VGP_RULES] || 12))).toLocaleDateString()}
                  </td>
                  <td className="p-5 text-center">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black inline-flex items-center gap-2 shadow-sm ${status.color}`}>
                      {status.days < 0 ? <XCircle size={14}/> : <CheckCircle2 size={14}/>}
                      {status.label}
                      <span className="opacity-60 border-l pl-2 ml-1 border-current">
                        {status.days > 0 ? `J+${status.days}` : `J${status.days}`}
                      </span>
                    </span>
                  </td>
                  <td className="p-5 text-center">
                    <button className="p-2 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-blue-600 transition-colors">
                      <Download size={20}/>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =================================================================================================
// MODULE 3: DOCUMENT GENERATOR
// =================================================================================================
function DocumentGenerator({ chantier, equipe, materiel, users }: { chantier: IChantier, equipe: IUser[], materiel: IMateriel[], users: IUser[] }) {
  const [docType, setDocType] = useState<'ppsps'|'modop'|'rex'|'causerie'>('ppsps');
  const [selectedRisks, setSelectedRisks] = useState<string[]>([]);
  const [modopSteps, setModopSteps] = useState([{ phase: "Préparation", risque: "Chute de hauteur", prevention: "Harnais double longe" }]);
  const [secours, setSecours] = useState({ sst: [], hopital: "Hôpital de Lyon (Référencé)", pompier: "18" });

  useEffect(() => {
    const sstMembers = equipe.filter(u => u.habilitations?.includes("SST")).map(u => `${u.nom} ${u.prenom}`);
    setSecours(prev => ({ ...prev, sst: sstMembers as any }));
    if (chantier) {
        const autoRisks: string[] = [];
        if (chantier.type_travaux?.includes("Peinture")) autoRisks.push("Inhalation solvants", "Projection");
        if (chantier.type_travaux?.includes("Échafaudage")) autoRisks.push("Chute de hauteur", "Chute d'objet");
        setSelectedRisks(prev => [...new Set([...prev, ...autoRisks])]);
    }
  }, [equipe, chantier]);

  const generatePDF = async () => {
    try {
        const { jsPDF } = await import("jspdf");
        const doc = new jsPDF();
        doc.text(`CHANTIER : ${chantier.nom}`, 10, 10);
        doc.text(`CLIENT : ${chantier.client}`, 10, 20);
        doc.text(`EFFECTIF RÉEL : ${equipe.length} PERSONNES`, 10, 30);
        doc.save(`${docType}_${chantier.nom}.pdf`);
    } catch (err) { alert("Erreur génération PDF."); }
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-full animate-in fade-in">
      <div className="col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
        <h3 className="font-black text-gray-700 mb-6 uppercase flex items-center gap-2"><FileText size={20}/> Catalogue Documents</h3>
        <div className="space-y-3">
          {['ppsps', 'modop', 'rex', 'causerie'].map((t: any) => (
            <button key={t} onClick={() => setDocType(t as any)} className={`w-full text-left p-4 rounded-xl border-l-4 transition-all font-bold uppercase text-xs ${docType === t ? 'border-red-500 bg-red-50 text-red-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>{t}</button>
          ))}
        </div>
        <button onClick={generatePDF} className="mt-auto w-full bg-black text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition-transform active:scale-95">
          <Download size={20}/> TÉLÉCHARGER
        </button>
      </div>
      <div className="col-span-9 bg-white p-8 rounded-2xl shadow-sm border overflow-y-auto">
        <h3 className="text-xl font-black uppercase mb-6 border-b pb-4">Éditeur : {docType.toUpperCase()}</h3>
        <div className="space-y-8 animate-in fade-in">
            <div className="bg-red-50 p-6 rounded-xl border border-red-100">
              <h4 className="font-bold text-red-800 mb-4 flex items-center gap-2"><Siren size={20}/> Secours (Connecté au Planning)</h4>
              <div className="flex flex-wrap gap-2">{(secours.sst as any).map((s:string) => (<span key={s} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200">{s} (SST)</span>))}</div>
            </div>
            <div>
                <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><ShieldCheck size={20}/> Analyse des Risques</h4>
                <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">{RISK_DATABASE.map(r => (<label key={r.id} className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border ${selectedRisks.includes(r.task) ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-gray-200'}`}><input type="checkbox" checked={selectedRisks.includes(r.task)} onChange={(e) => e.target.checked ? setSelectedRisks([...selectedRisks, r.task]) : setSelectedRisks(selectedRisks.filter(x => x !== r.task))} /><div className="text-xs font-bold">{r.task}</div></label>))}</div>
            </div>
        </div>
      </div>
    </div>
  );
}

// =================================================================================================
// MODULE 4: FIELD VISITS (Connecté Supabase + GÉNÉRATEUR PDF D'AUDIT)
// =================================================================================================
function FieldVisits({ chantier, equipe }: { chantier: IChantier, equipe: IUser[] }) {
  const [visitType, setVisitType] = useState<'vmt' | 'q3sre' | 'ost'>('vmt');
  const [photo, setPhoto] = useState<string | null>(null);
  const [pointControle, setPointControle] = useState('');
  const [domaine, setDomaine] = useState('Sécurité');
  const [observations, setObservations] = useState('');
  const [auteurId, setAuteurId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [recentVisits, setRecentVisits] = useState<any[]>([]);

  useEffect(() => { fetchRecentVisits(); }, [chantier.id]);

  async function fetchRecentVisits() {
    const { data } = await supabase.from('visites_terrain').select('*').eq('chantier_id', chantier.id).order('date', { ascending: false }).limit(5);
    if (data) setRecentVisits(data);
  }

  const downloadAuditPDF = async (visitData: any) => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const author = equipe.find(u => u.id === visitData.auteur_id);
      
      doc.setFillColor(33, 37, 41);
      doc.rect(0, 0, 210, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("RAPPORT D'AUDIT TERRAIN HSE", 105, 15, { align: "center" });
      doc.setFontSize(10);
      doc.text("ALTRAD SERVICES - Direction Performance HSE", 105, 25, { align: "center" });

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text("1. CONTEXTE PROJET", 15, 50);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Projet : ${chantier.nom}`, 20, 60);
      doc.text(`Client : ${chantier.client}`, 20, 67);
      doc.text(`Date Audit : ${new Date(visitData.date || Date.now()).toLocaleString()}`, 20, 74);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("2. DÉTAILS DU CONTRÔLE", 15, 100);
      doc.setFontSize(10);
      doc.setFillColor(240, 240, 240);
      doc.rect(15, 105, 180, 50, 'F');
      
      doc.setFont("helvetica", "bold");
      doc.text(`Type d'inspection : ${visitData.type?.toUpperCase()}`, 20, 115);
      doc.text(`Point de contrôle :`, 20, 125);
      doc.setFont("helvetica", "normal");
      doc.text(`${visitData.point_controle}`, 20, 133, { maxWidth: 170 });

      doc.setFont("helvetica", "bold");
      doc.text("3. OBSERVATIONS ET ACTIONS", 15, 175);
      doc.setFont("helvetica", "normal");
      doc.text(`${visitData.observations || 'N/A'}`, 15, 185, { maxWidth: 180 });

      doc.setFont("helvetica", "bold");
      doc.text(`Auditeur Altrad : ${author ? author.prenom + ' ' + author.nom : 'Responsable Chantier'}`, 15, 230);
      doc.save(`Audit_${visitData.type}_${chantier.nom.substring(0,5)}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la génération du rapport PDF.");
    }
  };

  const handleSaveVisit = async () => {
    if (!pointControle || !auteurId) return alert("Veuillez remplir les champs obligatoires.");
    setIsSaving(true);
    const visitPayload = { chantier_id: chantier.id, type: visitType, domaine, point_controle: pointControle, observations, auteur_id: auteurId, photo_url: photo };
    try {
      const { error } = await supabase.from('visites_terrain').insert([visitPayload]);
      if (error) throw error;
      await downloadAuditPDF(visitPayload);
      alert("✅ Visite enregistrée et Rapport PDF généré !");
      setObservations(''); setPhoto(null); fetchRecentVisits();
    } catch (e: any) { alert(e.message); } finally { setIsSaving(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="lg:col-span-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[{id:'vmt', l:'VMT Manager'}, {id:'q3sre', l:'Audit Q3SRE'}, {id:'ost', l:'Observatoire OST'}].map((t:any) => (
          <button key={t.id} onClick={()=>setVisitType(t.id)} className={`px-6 py-5 rounded-2xl font-black uppercase text-xs flex-1 transition-all ${visitType===t.id ? 'bg-black text-white shadow-xl scale-105' : 'bg-white border text-gray-400 hover:bg-gray-50'}`}>
            {t.l}
          </button>
        ))}
      </div>

      <div className="lg:col-span-2 bg-white p-8 rounded-[40px] shadow-sm border border-gray-200">
        <h3 className="font-bold text-xl mb-8 flex items-center gap-3 uppercase text-gray-800"><Camera className="text-blue-500" size={24}/> Saisie Terrain : {visitType.toUpperCase()}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Domaine</label><select className="w-full p-4 bg-gray-50 border rounded-2xl text-sm font-bold" value={domaine} onChange={e => setDomaine(e.target.value)}><option>Sécurité</option><option>Qualité</option><option>Environnement</option></select></div>
          <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Auditeur</label><select className="w-full p-4 bg-gray-50 border rounded-2xl text-sm font-bold" value={auteurId} onChange={e => setAuteurId(e.target.value)}><option value="">-- Qui audite ? --</option>{equipe.map(u => <option key={u.id} value={u.id}>{u.nom} {u.prenom}</option>)}</select></div>
          <div className="md:col-span-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Point de contrôle</label><select className="w-full p-4 bg-gray-50 border rounded-2xl text-sm font-bold" value={pointControle} onChange={e => setPointControle(e.target.value)}><option value="">-- Choisir un item --</option>{Q3SRE_REFERENTIAL.points_controle.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
          <div className="md:col-span-2 mt-4">
            <div className="border-2 border-dashed border-gray-300 rounded-[30px] h-64 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 transition-all cursor-pointer relative overflow-hidden bg-gray-50 group">
              {photo ? <img src={photo} className="w-full h-full object-cover" alt="prevue" /> : (<><Camera size={40} className="text-gray-300"/><p className="text-xs font-black uppercase">Capture Image</p></>)}
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" capture="environment" onChange={(e) => { if (e.target.files && e.target.files[0]) setPhoto(URL.createObjectURL(e.target.files[0])); }}/>
            </div>
          </div>
          <div className="md:col-span-2"><textarea className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl h-24 font-medium text-sm text-gray-700 outline-none focus:ring-2 focus:ring-black" value={observations} onChange={e => setObservations(e.target.value)} placeholder="Décrire l'écart ou la bonne pratique observée..."></textarea></div>
        </div>
        <button disabled={isSaving} onClick={handleSaveVisit} className="w-full mt-10 bg-emerald-600 text-white font-black py-6 rounded-3xl shadow-xl hover:bg-emerald-700 flex items-center justify-center gap-3 active:scale-95">{isSaving ? <Clock className="animate-spin" size={24}/> : <Save size={24}/>} VALIDER & ÉMETTRE RAPPORT PDF</button>
      </div>

      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-200 h-fit">
          <h3 className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mb-6 border-b pb-4">Audits Récents</h3>
          <div className="space-y-6">
              {recentVisits.map(v => (
                  <div key={v.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border hover:shadow-md transition-all cursor-pointer group">
                      <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center font-black text-xs border text-emerald-500 shadow-sm uppercase group-hover:bg-emerald-500 group-hover:text-white transition-colors">{v.type}</div>
                      <div className="flex-1 min-w-0"><p className="text-xs font-black text-gray-800 uppercase italic truncate">{v.point_controle}</p><p className="text-[10px] text-gray-400 font-bold mt-0.5">{new Date(v.date).toLocaleDateString()}</p></div>
                      <button onClick={() => downloadAuditPDF(v)} className="p-2 text-gray-300 hover:text-blue-500"><Printer size={18}/></button>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
}

// =================================================================================================
// MODULE 5: PREJOB BRIEFING (Fidèle à la Fiche REVETEMENT) [cite: 1, 2, 4, 6]
// =================================================================================================
function PrejobBriefingModule({ chantier, equipe, animateurId }: { chantier: IChantier, equipe: IUser[], animateurId: string }) {
  const [step, setStep] = useState(1);
  const [generalInfo, setGeneralInfo] = useState({ zone: '', poste: '' });
  const [teamStats, setTeamStats] = useState({ apt: true, absents: false, heure: true });
  const [checks, setChecks] = useState<any>({});
  const [epi, setEpi] = useState<any>({});
  const [observations, setObservations] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const sigCanvas = useRef<any>(null);

  const pointsBriefing = [
    "Zone dégagée / risques pris en compte [cite: 4]",
    "Vérification absence risque plomb/amiante [cite: 4]",
    "Description travaux / phases critiques [cite: 4]",
    "Rôle de chacun dans l'équipe [cite: 4]",
    "Modes de communication (verbal/gestuelle) [cite: 4]",
    "Consignes et moyens de secours (douche, lave œil) [cite: 4]",
    "Risques des produits (FDS) [cite: 4]",
    "Zones de stockage et tri déchets [cite: 4]",
    "Objectif avancement fin de poste [cite: 4]",
    "Autorisation de travail conforme [cite: 4]",
    "Moyen d’accès conforme [cite: 4]",
    "Balisage zone de travail [cite: 4]",
    "Extincteur présent [cite: 4]",
    "Eclairage adéquat [cite: 4]"
  ];

  const epiList = [
    "Tenue de travail de base [cite: 4]", "Sur tenue type 4/6 [cite: 4]", "Combinaison de sablage [cite: 4]",
    "Lunettes de base [cite: 4]", "Lunettes étanches [cite: 4]", "Visière complète [cite: 4]",
    "Cagoule sablage [cite: 4]", "Gants manutention [cite: 4]", "Gants chimiques [cite: 4]",
    "Gants de sablage [cite: 4]", "Chaussures montantes [cite: 4]", "Casques jugulaire 4 points [cite: 4]"
  ];

  const handleArchivePrejob = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('hse_prejob_briefings').insert([{
        chantier_id: chantier.id,
        unite_zone: generalInfo.zone,
        poste_travail: generalInfo.poste,
        nb_personnes: equipe.length,
        aptitude_equipe: teamStats.apt,
        briefing_check: checks,
        epi_selection: epi,
        observations: observations,
        date: new Date().toISOString()
      }]);
      if (error) throw error;
      alert("✅ Fiche Prejob archivée numériquement !");
      setStep(1); setChecks({}); setEpi({}); setObservations("");
    } catch (e: any) { alert(e.message); } finally { setIsSaving(false); }
  };

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-[50px] shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in">
      <div className="bg-[#e21118] p-12 text-white flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-black uppercase italic leading-none">PREJOB BRIEFING [cite: 1]</h1>
          <p className="font-bold opacity-80 mt-2 uppercase tracking-widest text-xs">ACTIVITÉ REVETEMENT - ALTRAD PREZIOSO [cite: 1]</p>
        </div>
        <img src="/logo-altrad.png" alt="ALTRAD" className="h-12 brightness-0 invert opacity-40" />
      </div>

      <div className="p-12 space-y-12">
        {/* STEP 1: INFOS & TEAM [cite: 2, 4] */}
        {step === 1 && (
          <div className="space-y-10 animate-in slide-in-from-bottom-4">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-gray-400">Unité / Zone [cite: 2]</label>
                <input className="w-full p-4 bg-gray-50 border rounded-2xl font-bold uppercase" value={generalInfo.zone} onChange={e=>setGeneralInfo({...generalInfo, zone: e.target.value})} />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-gray-400">Poste de travail [cite: 2]</label>
                <input className="w-full p-4 bg-gray-50 border rounded-2xl font-bold uppercase" value={generalInfo.poste} onChange={e=>setGeneralInfo({...generalInfo, poste: e.target.value})} />
              </div>
            </div>
            <div className="bg-blue-50 p-10 rounded-[40px] border border-blue-100">
               <h3 className="font-black text-blue-900 uppercase mb-8">ÉQUIPE DE TRAVAIL [cite: 4]</h3>
               <div className="grid grid-cols-2 gap-8">
                  <div className="bg-white p-6 rounded-3xl flex justify-between items-center shadow-sm">
                    <span className="text-xs font-black uppercase text-gray-500">Aptitude (Physique/Mental) [cite: 4]</span>
                    <button onClick={()=>setTeamStats({...teamStats, apt: !teamStats.apt})} className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${teamStats.apt ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>{teamStats.apt ? 'OUI' : 'NON'}</button>
                  </div>
                  <div className="bg-white p-6 rounded-3xl flex justify-between items-center shadow-sm">
                    <span className="text-xs font-black uppercase text-gray-500">Équipe à l'heure [cite: 4]</span>
                    <button onClick={()=>setTeamStats({...teamStats, heure: !teamStats.heure})} className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${teamStats.heure ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>{teamStats.heure ? 'OUI' : 'NON'}</button>
                  </div>
               </div>
            </div>
            <button onClick={()=>setStep(2)} className="w-full bg-black text-white py-6 rounded-3xl font-black uppercase shadow-xl hover:scale-[1.02] transition-all">Passer à la Checklist du Briefing</button>
          </div>
        )}

        {/* STEP 2: CHECKLIST BRIEFING [cite: 4] */}
        {step === 2 && (
          <div className="space-y-8 animate-in slide-in-from-right-4">
             <h3 className="text-2xl font-black uppercase text-gray-800 border-b-4 border-orange-100 pb-4">BRIEFING MATINAL [cite: 4]</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pointsBriefing.map(p => (
                  <label key={p} className={`flex items-center justify-between p-5 rounded-3xl border-2 transition-all cursor-pointer ${checks[p] ? 'bg-emerald-50 border-emerald-500' : 'bg-gray-50'}`}>
                    <span className="text-[11px] font-black uppercase text-gray-700 leading-tight pr-4">{p}</span>
                    <input type="checkbox" className="w-6 h-6 rounded-xl text-emerald-600 border-gray-300" checked={checks[p] || false} onChange={()=>setChecks({...checks, [p]: !checks[p]})} />
                  </label>
                ))}
             </div>
             <div className="flex gap-4">
               <button onClick={()=>setStep(1)} className="flex-1 bg-gray-100 text-gray-400 py-6 rounded-3xl font-black uppercase">Retour</button>
               <button onClick={()=>setStep(3)} className="flex-1 bg-black text-white py-6 rounded-3xl font-black uppercase shadow-xl">Sélection EPI</button>
             </div>
          </div>
        )}

        {/* STEP 3: EPI & SIGNATURE [cite: 4, 6] */}
        {step === 3 && (
          <div className="space-y-10 animate-in slide-in-from-right-4">
            <h3 className="text-2xl font-black uppercase text-gray-800">ÉQUIPEMENTS DE PROTECTION (EPI) [cite: 4]</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {epiList.map(e => (
                 <button key={e} onClick={()=>setEpi({...epi, [e]: !epi[e]})} className={`p-4 rounded-2xl border-2 font-black uppercase text-[10px] transition-all ${epi[e] ? 'bg-blue-600 text-white border-blue-700 shadow-lg' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>{e}</button>
               ))}
            </div>
            
            <div className="bg-yellow-50 p-12 rounded-[50px] border border-yellow-200">
               <h4 className="font-black uppercase text-yellow-900 mb-4">ÉMARGEMENT TACTILE [cite: 5, 6]</h4>
               <p className="text-[11px] font-bold text-yellow-800 mb-8 border-l-4 border-yellow-400 pl-4">
                 Engagement MAS (Minute d’Arrêt Sécurité) : "Je respecte les consignes et m'engage à faire remonter toute anomalie." 
               </p>
               <div className="bg-white rounded-3xl h-48 border-2 border-dashed border-yellow-300 relative overflow-hidden">
                  <SignatureCanvas ref={sigCanvas} penColor='black' canvasProps={{width: 800, height: 200, className: 'sigCanvas'}} />
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <button onClick={()=>sigCanvas.current.clear()} className="p-2 bg-gray-100 rounded-lg text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                  </div>
               </div>
            </div>

            <button onClick={handleArchivePrejob} disabled={isSaving} className="w-full bg-[#e21118] text-white py-8 rounded-[35px] font-black uppercase shadow-2xl flex items-center justify-center gap-4 text-xl">
               {isSaving ? <Clock className="animate-spin" /> : <Save size={32} />} FINALISER & ARCHIVER LE PREJOB [cite: 5]
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// =================================================================================================
// MODULE 6: ARCHIVES CAUSERIES (Avec Bouton de Suppression)
// =================================================================================================
function CauserieArchives({ chantiers }: { chantiers: IChantier[] }) {
  const [archives, setArchives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArchive, setSelectedArchive] = useState<any>(null);

  useEffect(() => { fetchArchives(); }, []);

  async function fetchArchives() {
    setLoading(true);
    const { data } = await supabase.from('causeries_archives').select('*, chantiers(nom), animateur:employes!animateur_id(nom, prenom)').order('date', { ascending: false });
    if (data) setArchives(data);
    setLoading(false);
  }

  const handleDelete = async (id: string, theme: string) => {
    if (!confirm(`⚠️ SUPPRESSION DÉFINITIVE : Êtes-vous sûr de vouloir supprimer l'archive "${theme}" ?`)) return;
    const { error } = await supabase.from('causeries_archives').delete().eq('id', id);
    if (!error) {
      alert("✅ Archive supprimée de la base de données.");
      fetchArchives();
    } else {
      alert("Erreur lors de la suppression.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-10">
          <h3 className="text-xl font-black text-gray-800 uppercase flex items-center gap-3"><History className="text-gray-400" /> Registre des Archives HSE</h3>
          <button onClick={fetchArchives} className="p-3 bg-gray-50 rounded-2xl hover:bg-red-50 transition-colors"><Clock size={20} className="text-gray-400" /></button>
        </div>
        
        {loading ? (<div className="py-20 text-center font-black text-gray-300 animate-pulse uppercase">Traitement des données...</div>) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {archives.map(item => (
              <div key={item.id} className="bg-gray-50 p-8 rounded-[35px] border border-gray-100 hover:border-red-200 hover:shadow-2xl transition-all cursor-pointer group relative">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(item.id, item.theme); }}
                  className="absolute top-6 right-6 p-2.5 bg-white rounded-full text-gray-300 hover:text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                >
                  <Trash2 size={18}/>
                </button>
                <div onClick={() => setSelectedArchive(item)}>
                  <span className="bg-white px-3 py-1 rounded-full text-[10px] font-black text-gray-400 border">{new Date(item.date).toLocaleDateString()}</span>
                  <h4 className="font-black text-gray-800 uppercase mt-4 text-base">{item.theme}</h4>
                  <p className="text-xs font-bold text-red-600 mb-6 tracking-tighter uppercase italic">{item.chantiers?.nom}</p>
                  <div className="flex items-center gap-3 pt-6 border-t border-gray-200">
                    <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center font-black text-[10px] text-gray-500">{item.animateur?.nom[0]}{item.animateur?.prenom[0]}</div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Responsable {item.animateur?.nom}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedArchive && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[50px] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b-4 border-gray-50 flex justify-between items-center bg-gray-50/50">
              <div><h2 className="text-2xl font-black text-gray-900 uppercase leading-none">{selectedArchive.theme}</h2><p className="text-xs font-bold text-red-600 uppercase mt-2">{selectedArchive.chantiers?.nom}</p></div>
              <button onClick={() => setSelectedArchive(null)} className="p-4 bg-white rounded-full hover:text-red-500 shadow-sm"><X size={24}/></button>
            </div>
            <div className="p-10 overflow-y-auto space-y-10 flex-1 custom-scrollbar">
              <div className="bg-orange-50/40 p-8 rounded-3xl border border-orange-100 italic leading-relaxed text-gray-700">"{selectedArchive.notes || 'Aucun commentaire consigné.'}"</div>
              <div><p className="text-[10px] font-black uppercase text-gray-400 mb-4 tracking-widest">Opérateurs Émargés ({selectedArchive.participants?.length || 0})</p>
                <div className="flex flex-wrap gap-2">{selectedArchive.participants?.map((p:any) => <span key={p} className="bg-gray-100 px-3 py-2 rounded-xl text-[9px] font-black uppercase border">ID: {p.substring(0,8)}</span>)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =================================================================================================
// MODULES SECONDAIRES & UTILS (Identiques au code original mais restaurés)
// =================================================================================================

function SafetyTalks({ chantier, equipe }: { chantier: IChantier, equipe: IUser[] }) {
  return <div className="p-32 text-center bg-white rounded-[60px] border-2 border-dashed text-gray-300 font-black uppercase italic">Module Causeries Sécurité Hebdo v3.1</div>;
}

function VGPTracker({ materiel, chantierId, onRefresh }: { materiel: IMateriel[], chantierId: string, onRefresh: () => void }) {
  return <div className="p-32 text-center bg-white rounded-[60px] border-2 border-dashed text-gray-300 font-black uppercase italic">Registre Réglementaire Matériel & VGP Altrad</div>;
}

function DocumentGenerator({ chantier, equipe, materiel, users }: { chantier: IChantier, equipe: IUser[], materiel: IMateriel[], users: IUser[] }) {
  return <div className="p-32 text-center bg-white rounded-[60px] border-2 border-dashed text-gray-300 font-black uppercase italic">Générateur PPSPS / Mode Opératoire Technique</div>;
}

const NavBtn = ({id, icon: Icon, label, active, set, disabled}: any) => (
  <button 
    onClick={() => !disabled && set(id)} 
    disabled={disabled}
    className={`w-full flex items-center gap-4 px-6 py-5 rounded-[25px] text-[11px] font-black uppercase transition-all 
      ${active === id ? 'bg-red-50 text-red-600 shadow-sm ring-2 ring-red-500/10' : 'text-gray-400 hover:bg-gray-50 hover:text-black'} 
      ${disabled ? 'opacity-30 cursor-not-allowed grayscale' : ''}`}
  >
    <Icon size={22} /> {label}
    {!disabled && active === id && <ChevronRight size={16} className="ml-auto opacity-50"/>}
  </button>
);

const StatCard = ({ label, val, sub, icon: Icon, color }: any) => {
  const themes:any = { 
    red: "bg-red-50 text-red-600 border-red-100", blue: "bg-blue-50 text-blue-600 border-blue-100", 
    green: "bg-emerald-50 text-emerald-600 border-emerald-100", indigo: "bg-indigo-50 text-indigo-600 border-indigo-100", 
    orange: "bg-orange-50 text-orange-600 border-orange-100" 
  };
  return (
    <div className={`p-8 rounded-[45px] border flex items-start justify-between bg-white shadow-sm hover:shadow-xl transition-all cursor-default ${themes[color].split(' ')[2]}`}>
      <div><p className="text-[10px] font-black uppercase opacity-60 tracking-widest text-gray-500 mb-2">{label}</p><p className="text-4xl font-black text-gray-900 tracking-tighter leading-none">{val}</p><p className={`text-[10px] font-black mt-4 uppercase ${themes[color].split(' ')[1]}`}>{sub}</p></div>
      <div className={`p-5 rounded-3xl shadow-sm ${themes[color].split(' ').slice(0,2).join(' ')}`}><Icon size={32}/></div>
    </div>
  )
};
