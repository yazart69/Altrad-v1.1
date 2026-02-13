"use client";

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, FileText, Wrench, Camera, Megaphone, 
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Clock, 
  MapPin, Phone, Mail, User, Calendar, Printer, Save, 
  Plus, Trash2, Search, ArrowRight, Download, Eye,
  AlertOctagon, Siren, HardHat, FileCheck, X, ChevronRight,
  ClipboardList, Stethoscope, Factory, Truck, Edit, ClipboardCheck, History
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend 
} from 'recharts';

// Suppression de l'import statique pour éviter les erreurs de build SSR
// import { jsPDF } from "jspdf"; 

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
  const [view, setView] = useState<'dashboard'|'generator'|'vgp'|'terrain'|'causerie'|'history'>('dashboard');
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
// MODULE 3: GÉNÉRATEUR INTELLIGENT
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
// MODULE 4: FIELD VISITS (Mobile First - Connecté Supabase + GÉNÉRATEUR PDF D'AUDIT)
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

  // --- MOTEUR DE GÉNÉRATION PDF D'AUDIT TECHNIQUE ---
  const downloadAuditPDF = async (visitData: any) => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const author = equipe.find(u => u.id === visitData.auteur_id);
      
      // Header pro Altrad
      doc.setFillColor(33, 37, 41);
      doc.rect(0, 0, 210, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("RAPPORT D'AUDIT TERRAIN HSE", 105, 15, { align: "center" });
      doc.setFontSize(10);
      doc.text("ALTRAD SERVICES - Direction Performance HSE", 105, 25, { align: "center" });

      // Bloc Projet
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text("1. CONTEXTE PROJET", 15, 50);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Projet : ${chantier.nom}`, 20, 60);
      doc.text(`Client : ${chantier.client}`, 20, 67);
      doc.text(`Lieu : ${chantier.adresse}`, 20, 74);
      doc.text(`Date Audit : ${new Date(visitData.date || Date.now()).toLocaleString()}`, 20, 81);

      // Détails Audit
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("2. DÉTAILS DU CONTRÔLE", 15, 100);
      doc.setFontSize(10);
      doc.setFillColor(240, 240, 240);
      doc.rect(15, 105, 180, 50, 'F');
      
      doc.setFont("helvetica", "bold");
      doc.text(`Type d'inspection : ${visitData.type?.toUpperCase()}`, 20, 115);
      doc.text(`Domaine audité : ${visitData.domaine}`, 20, 123);
      doc.text(`Point de contrôle :`, 20, 131);
      doc.setFont("helvetica", "normal");
      doc.text(`${visitData.point_controle}`, 20, 139, { maxWidth: 170 });

      // Bloc Observations
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("3. OBSERVATIONS ET ACTIONS", 15, 175);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`${visitData.observations || 'Le point de contrôle est jugé conforme. Aucune action corrective immédiate n\'est requise.'}`, 15, 185, { maxWidth: 180 });

      // Auteur et signature num
      doc.setFont("helvetica", "bold");
      doc.text(`Auditeur Altrad : ${author ? author.prenom + ' ' + author.nom : 'Responsable Chantier'}`, 15, 230);
      
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("Généré numériquement via ALTRAD.OS - L'original est archivé sur le serveur HSE.", 105, 285, { align: "center" });

      doc.save(`Audit_${visitData.type}_${chantier.nom.substring(0,5)}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la génération du rapport PDF.");
    }
  };

  const handleSaveVisit = async () => {
    if (!pointControle || !auteurId) return alert("Veuillez remplir les champs obligatoires.");
    setIsSaving(true);
    
    const visitPayload = {
        chantier_id: chantier.id,
        type: visitType,
        domaine,
        point_controle: pointControle,
        observations,
        auteur_id: auteurId,
        photo_url: photo 
    };

    try {
      const { error } = await supabase.from('visites_terrain').insert([visitPayload]);
      if (error) throw error;
      
      // Téléchargement automatique du PDF à la création
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
        <h3 className="font-bold text-xl mb-8 flex items-center gap-3 uppercase text-gray-800">
          <Camera className="text-blue-500" size={24}/> Saisie Terrain : {visitType.toUpperCase()}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Domaine</label>
            <select className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 outline-none" value={domaine} onChange={e => setDomaine(e.target.value)}>
              <option>Sécurité</option><option>Qualité</option><option>Environnement</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Auteur (Équipe présente)</label>
            <select className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 outline-none" value={auteurId} onChange={e => setAuteurId(e.target.value)}>
              <option value="">-- Qui audite ? --</option>
              {equipe.map(u => <option key={u.id} value={u.id}>{u.nom} {u.prenom}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Item de contrôle</label>
             <select className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 outline-none" value={pointControle} onChange={e => setPointControle(e.target.value)}>
                <option value="">-- Choisir un point du référentiel --</option>
                {Q3SRE_REFERENTIAL.points_controle.map(p => <option key={p} value={p}>{p}</option>)}
             </select>
          </div>

          <div className="md:col-span-2 mt-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Support Visuel (Photo)</label>
            <div className="border-2 border-dashed border-gray-300 rounded-[30px] h-64 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 transition-all cursor-pointer relative overflow-hidden bg-gray-50 group">
              {photo ? <img src={photo} className="w-full h-full object-cover" alt="prevue" /> : (
                <>
                  <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform">
                      <Camera size={40} className="text-gray-300"/>
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest">Prendre une Photo</p>
                </>
              )}
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" capture="environment" onChange={(e) => {
                if (e.target.files && e.target.files[0]) setPhoto(URL.createObjectURL(e.target.files[0]));
              }}/>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Observations détaillées</label>
            <textarea className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl h-24 font-medium text-sm text-gray-700 outline-none" value={observations} onChange={e => setObservations(e.target.value)} placeholder="Décrire les écarts observés..."></textarea>
          </div>
        </div>

        <button disabled={isSaving} onClick={handleSaveVisit} className="w-full mt-10 bg-emerald-600 text-white font-black py-6 rounded-3xl shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 active:scale-95">
          {isSaving ? <Clock className="animate-spin" size={24}/> : <Save size={24}/>}
          VALIDER & ÉMETTRE LE RAPPORT PDF
        </button>
      </div>

      {/* Colonne Archives des rapports récents */}
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-200 h-fit">
          <h3 className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mb-6 border-b pb-4 italic">Audits déjà archivés</h3>
          <div className="space-y-6">
              {recentVisits.map(v => (
                  <div key={v.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border hover:shadow-md transition-all group">
                      <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center font-black text-xs border text-emerald-500 shadow-sm uppercase">{v.type}</div>
                      <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-gray-800 uppercase italic truncate">{v.point_controle}</p>
                          <p className="text-[10px] text-gray-400 font-bold mt-0.5">{new Date(v.date).toLocaleDateString()}</p>
                      </div>
                      <button onClick={() => downloadAuditPDF(v)} className="p-2 text-gray-300 hover:text-blue-500 transition-colors">
                        <Printer size={18}/>
                      </button>
                  </div>
              ))}
              {recentVisits.length === 0 && <p className="text-center text-gray-300 font-bold uppercase text-[9px] py-10 italic tracking-widest">Aucune donnée trouvée</p>}
          </div>
      </div>
    </div>
  );
}

// =================================================================================================
// MODULE 5: CAUSERIES (Template Word Strict & Équipe Réelle)
// =================================================================================================
function SafetyTalks({ chantier, equipe }: { chantier: IChantier, equipe: IUser[] }) {
  const [theme, setTheme] = useState("");
  const [notes, setNotes] = useState("");
  const [animateurId, setAnimateurId] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const toggleParticipant = (userId: string) => {
    setParticipants(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const handleArchive = async () => {
    if (!theme || !animateurId) return alert("Veuillez sélectionner un thème et un animateur.");
    setIsSaving(true);
    try {
      const { error } = await supabase.from('causeries_archives').insert([{
        chantier_id: chantier.id,
        animateur_id: animateurId,
        theme,
        notes,
        participants,
        date: new Date().toISOString()
      }]);
      if (error) throw error;
      alert("✅ Causerie archivée !");
      setTheme(""); setNotes(""); setParticipants([]);
    } catch (e: any) { alert(e.message); } finally { setIsSaving(false); }
  };

  return (
    <div className="max-w-5xl mx-auto bg-white p-12 rounded-[50px] shadow-2xl border border-gray-100 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-start border-b-4 border-gray-50 pb-8 mb-10">
        <div>
          <h1 className="text-3xl font-black text-gray-900 uppercase flex items-center gap-4"><Megaphone className="text-red-600" size={40}/> Causerie Hebdomadaire</h1>
          <p className="text-sm text-gray-400 font-bold mt-2 uppercase tracking-widest tracking-tighter">Référentiel Altrad HSE-FORM-042 (V2.1)</p>
        </div>
        <div className="text-right">
          <p className="font-black text-gray-900 text-xl italic uppercase tracking-tighter">{chantier.nom}</p>
          <div className="flex items-center justify-end gap-2 text-gray-400 mt-2 font-bold"><Calendar size={18}/><p className="text-sm">{new Date().toLocaleDateString()}</p></div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-10 mb-10">
        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Thème traité</label>
          <select className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-black text-gray-700" value={theme} onChange={e => setTheme(e.target.value)}>
             <option value="">-- Sélectionner --</option>
             {CAUSERIE_THEMES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Animateur Altrad</label>
          <select className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-black text-gray-700" value={animateurId} onChange={e => setAnimateurId(e.target.value)}>
            <option value="">-- Sélectionner l'animateur --</option>
            {equipe.map(u => <option key={u.id} value={u.id}>{u.nom} {u.prenom}</option>)}
          </select>
        </div>
      </div>
      <div className="mb-10">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Compte-rendu et points de vigilance</label>
        <textarea className="w-full p-6 bg-orange-50/30 border-2 border-orange-100 rounded-[30px] text-sm font-bold text-gray-700 h-40" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Saisir les échanges et les remarques des opérateurs..."></textarea>
      </div>
      <div>
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 block flex justify-between items-center">
            <span>Tableau d'Émargement Digital</span>
            <span className="bg-gray-100 px-3 py-1 rounded-full text-gray-500 font-bold">{equipe.length} personnels identifiés au planning</span>
        </label>
        <div className="border-2 border-gray-50 rounded-[35px] overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-500 border-b"><tr><th className="p-5">Collaborateur</th><th className="p-5 text-center">Émarger</th></tr></thead>
            <tbody className="text-sm bg-white">
              {equipe.map(u => (
                <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors group">
                  <td className="p-5 flex items-center gap-4"><div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center font-black text-gray-400 group-hover:bg-red-500 group-hover:text-white transition-colors">{u.nom[0]}{u.prenom[0]}</div><div className="font-black text-gray-800 text-base italic">{u.nom} {u.prenom}</div></td>
                  <td className="p-5 text-center"><input type="checkbox" className="w-7 h-7 rounded-xl text-red-600 shadow-sm border-gray-200 cursor-pointer" checked={participants.includes(u.id)} onChange={() => toggleParticipant(u.id)} /></td>
                </tr>
              ))}
              {equipe.length === 0 && (<tr><td colSpan={2} className="p-20 text-center text-gray-300 font-black uppercase italic">Aucun personnel au planning.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-12 flex justify-end pt-8 border-t-2 border-gray-50">
        <button onClick={handleArchive} disabled={isSaving} className="bg-red-600 text-white px-12 py-5 rounded-2xl font-black uppercase hover:bg-black transition-all shadow-xl shadow-red-100 flex items-center gap-3">
            {isSaving ? <Clock className="animate-spin" size={24}/> : <Save size={24}/>} Finaliser & Archiver
        </button>
      </div>
    </div>
  );
}

// =================================================================================================
// MODULE 6: ARCHIVES CAUSERIES (Consultation & Historique)
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

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-black text-gray-800 uppercase flex items-center gap-3"><History className="text-gray-400" /> Historique HSE</h3>
          <button onClick={fetchArchives} className="p-2 hover:bg-gray-100 rounded-full"><Clock size={20} className="text-gray-400" /></button>
        </div>
        {loading ? (
          <div className="py-20 text-center font-bold text-gray-300 animate-pulse uppercase italic">Chargement des données...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {archives.map(item => (
              <div key={item.id} onClick={() => setSelectedArchive(item)} className="bg-gray-50 p-6 rounded-3xl border border-gray-100 hover:border-red-200 hover:shadow-lg transition-all cursor-pointer group">
                <span className="bg-white px-3 py-1 rounded-full text-[10px] font-black text-gray-400 border">{new Date(item.date).toLocaleDateString()}</span>
                <h4 className="font-black text-gray-800 uppercase mb-1 mt-4">{item.theme}</h4>
                <p className="text-xs font-bold text-red-600 mb-4 tracking-tighter">{item.chantiers?.nom}</p>
                <div className="flex items-center gap-2 pt-4 border-t border-gray-200"><div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center font-black text-[10px] text-gray-500">{item.animateur?.nom[0]}{item.animateur?.prenom[0]}</div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Animé par {item.animateur?.nom}</p></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedArchive && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[50px] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b-4 border-gray-50 flex justify-between items-center bg-gray-50/50">
              <div><h2 className="text-2xl font-black text-gray-900 uppercase leading-none">{selectedArchive.theme}</h2><p className="text-xs font-bold text-red-600 uppercase mt-2 italic tracking-tighter">{selectedArchive.chantiers?.nom}</p></div>
              <button onClick={() => setSelectedArchive(null)} className="p-3 bg-white rounded-full hover:text-red-500 transition-colors shadow-sm"><X size={24}/></button>
            </div>
            <div className="p-8 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4"><div className="bg-gray-50 p-4 rounded-2xl"><p className="text-[10px] font-black text-gray-400 uppercase mb-1">Date Séance</p><p className="font-bold text-gray-800">{new Date(selectedArchive.date).toLocaleDateString('fr-FR', { dateStyle: 'full' })}</p></div><div className="bg-gray-50 p-4 rounded-2xl"><p className="text-[10px] font-black text-gray-400 uppercase mb-1">Animateur</p><p className="font-bold text-gray-800">{selectedArchive.animateur?.prenom} {selectedArchive.animateur?.nom}</p></div></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Notes consignées</p><div className="bg-orange-50/30 p-6 rounded-3xl border border-orange-100 text-sm font-medium text-gray-700 italic leading-relaxed">"{selectedArchive.notes || 'Aucune note spécifique saisie.'}"</div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- COMPOSANTS UI UTILITAIRES ---

const NavBtn = ({id, icon: Icon, label, active, set, disabled}: any) => (
  <button 
    onClick={() => !disabled && set(id)} 
    disabled={disabled}
    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[11px] font-black uppercase transition-all 
      ${active === id ? 'bg-red-50 text-red-600 shadow-sm ring-2 ring-red-500/10' : 'text-gray-400 hover:bg-gray-50 hover:text-black'} 
      ${disabled ? 'opacity-30 cursor-not-allowed grayscale' : ''}`}
  >
    <Icon size={20} /> {label}
    {!disabled && active === id && <ChevronRight size={16} className="ml-auto opacity-50"/>}
  </button>
);

const StatCard = ({ label, val, sub, icon: Icon, color }: any) => {
  const themes:any = { red: "bg-red-50 text-red-600 border-red-100", blue: "bg-blue-50 text-blue-600 border-blue-100", green: "bg-emerald-50 text-emerald-600 border-emerald-100", indigo: "bg-indigo-50 text-indigo-600 border-indigo-100", orange: "bg-orange-50 text-orange-600 border-orange-100" };
  return (
    <div className={`p-6 rounded-[30px] border flex items-start justify-between shadow-sm hover:shadow-xl transition-all cursor-default bg-white ${themes[color].split(' ')[2]}`}>
      <div>
        <p className="text-[10px] font-black uppercase opacity-60 tracking-widest text-gray-500">{label}</p>
        <p className="text-4xl font-black mt-2 text-gray-900 tracking-tighter leading-none">{val}</p>
        <p className={`text-[10px] font-black mt-2 uppercase ${themes[color].split(' ')[1]}`}>{sub}</p>
      </div>
      <div className={`p-4 rounded-2xl shadow-sm ${themes[color].split(' ').slice(0,2).join(' ')}`}><Icon size={28}/></div>
    </div>
  )
};
