"use client";

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, FileText, Wrench, Camera, Megaphone, 
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Clock, 
  MapPin, Phone, Mail, User, Calendar, Printer, Save, 
  Plus, Trash2, Search, ArrowRight, Download, Eye,
  AlertOctagon, Siren, HardHat, FileCheck, X, ChevronRight,
  ClipboardList, Stethoscope, Factory, Truck, Edit, ClipboardCheck
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
  const [view, setView] = useState<'dashboard'|'generator'|'vgp'|'terrain'|'causerie'>('dashboard');
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
          {!activeChantierId && view !== 'dashboard' ? (
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
              {view === 'vgp' && <VGPTracker materiel={activeMateriel} />}
              {view === 'terrain' && <FieldVisits chantier={activeChantier!} />}
              {view === 'causerie' && <SafetyTalks chantier={activeChantier!} equipe={activeEquipe} />}
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
// MODULE 2: SUIVI MATÉRIEL & VGP (Calcul Automatique)
// =================================================================================================
function VGPTracker({ materiel }: { materiel: IMateriel[] }) {
  
  // Algorithme de calcul d'état VGP
  const getStatus = (last: string, cat: string) => {
    const freq = VGP_RULES[cat as keyof typeof VGP_RULES] || 12; 
    
    const lastDate = new Date(last);
    const nextDate = new Date(lastDate.setMonth(lastDate.getMonth() + freq));
    const now = new Date();
    
    const diffTime = nextDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'PÉRIMÉ', color: 'bg-red-100 text-red-700 border-red-200 ring-1 ring-red-200', days: diffDays, urgent: true };
    if (diffDays < 30) return { label: 'URGENT', color: 'bg-orange-100 text-orange-700 border-orange-200 ring-1 ring-orange-200', days: diffDays, urgent: false };
    return { label: 'VALIDE', color: 'bg-green-50 text-green-700 border-green-200', days: diffDays, urgent: false };
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
        <button className="bg-black text-white px-6 py-3 rounded-xl text-xs font-bold uppercase hover:bg-gray-800 transition-colors flex items-center gap-2 shadow-lg">
          <Plus size={16}/> Nouvel Équipement
        </button>
      </div>

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
                      {m.type === 'location' && <span className="text-purple-500 font-bold bg-purple-50 px-2 py-0.5 rounded">EXTERNE</span>}
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
// MODULE 3: GÉNÉRATEUR INTELLIGENT (Moteurs de rendu distincts)
// =================================================================================================
function DocumentGenerator({ chantier, equipe, materiel, users }: { chantier: IChantier, equipe: IUser[], materiel: IMateriel[], users: IUser[] }) {
  const [docType, setDocType] = useState<'ppsps'|'modop'|'rex'|'causerie'>('ppsps');
  
  // États Formulaires
  const [selectedRisks, setSelectedRisks] = useState<string[]>([]);
  const [modopSteps, setModopSteps] = useState([{ phase: "Préparation", risque: "Chute de hauteur", prevention: "Harnais double longe" }]);
  const [secours, setSecours] = useState({ sst: [], hopital: "Hôpital de Lyon (Référencé)", pompier: "18" });

  // --- AUTOMATISME: Héritage des données Réelles ---
  useEffect(() => {
    // 1. Détection des SST réels dans l'équipe affectée au planning
    const sstMembers = equipe.filter(u => u.habilitations?.includes("SST")).map(u => `${u.nom} ${u.prenom}`);
    setSecours(prev => ({ ...prev, sst: sstMembers as any }));

    // 2. Pré-cochage des risques selon les travaux déclarés
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
    } catch (err) {
        alert("Erreur génération PDF.");
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-full animate-in fade-in slide-in-from-bottom-4">
      {/* GAUCHE : SÉLECTEUR & ACTIONS */}
      <div className="col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
        <h3 className="font-black text-gray-700 mb-6 uppercase flex items-center gap-2"><FileText size={20}/> Catalogue Documents</h3>
        <div className="space-y-3">
          {[
            {id: 'ppsps', label: 'PPSPS', desc: 'Plan Particulier Sécurité', color: 'border-red-500 bg-red-50 text-red-700'},
            {id: 'modop', label: 'Mode Opératoire', desc: 'Fiche technique de tâche', color: 'border-blue-500 bg-blue-50 text-blue-700'},
            {id: 'rex', label: 'REX Chantier', desc: 'Retour expérience', color: 'border-purple-500 bg-purple-50 text-purple-700'},
            {id: 'causerie', label: 'Fiche Causerie', desc: 'Animation sécurité', color: 'border-orange-500 bg-orange-50 text-orange-700'},
          ].map((t: any) => (
            <button 
              key={t.id} 
              onClick={() => setDocType(t.id)}
              className={`w-full text-left p-4 rounded-xl border-l-4 transition-all group ${docType === t.id ? t.color + ' shadow-md' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
            >
              <div className="font-bold flex justify-between">
                  {t.label}
                  {docType === t.id && <CheckCircle2 size={16}/>}
              </div>
              <div className="text-[10px] opacity-70 group-hover:opacity-100">{t.desc}</div>
            </button>
          ))}
        </div>
        <div className="mt-auto pt-6 border-t border-gray-100 text-center">
          <button onClick={generatePDF} className="w-full bg-black text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition-transform active:scale-95">
            <Download size={20}/> TÉLÉCHARGER LE DOCUMENT
          </button>
        </div>
      </div>

      {/* DROITE : FORMULAIRE CONTEXTUEL COMPLET */}
      <div className="col-span-9 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 overflow-y-auto">
        <h3 className="text-xl font-black text-gray-800 uppercase mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
          <Edit className="text-gray-400"/> Éditeur Dynamique : {docType.toUpperCase()}
        </h3>

        {docType === 'ppsps' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="bg-red-50 p-6 rounded-xl border border-red-100 shadow-sm shadow-red-50">
              <h4 className="font-bold text-red-800 mb-4 flex items-center gap-2"><Siren size={20}/> Organisation des Secours (Données Réelles)</h4>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-red-400 uppercase tracking-wider mb-2 block">Centre de soin local</label>
                  <input type="text" className="w-full p-3 bg-white border border-red-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-red-500 transition-all" value={secours.hopital} onChange={e => setSecours({...secours, hopital: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-red-400 uppercase tracking-wider mb-2 block">SST Identifiés au Planning ({secours.sst.length})</label>
                  <div className="flex flex-wrap gap-2 mt-2 bg-white p-3 rounded-lg border border-red-200 min-h-[42px]">
                    {(secours.sst as any).map((s:string) => (
                      <span key={s} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200 flex items-center gap-1">
                        <CheckCircle2 size={12}/> {s}
                      </span>
                    ))}
                    {(secours.sst as any).length === 0 && <span className="text-red-500 text-xs font-bold italic flex items-center gap-1"><AlertTriangle size={12}/> Aucun sauveteur (SST) détecté !</span>}
                  </div>
                </div>
              </div>
            </div>
            
            <div>
                <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><ShieldCheck size={20}/> Inventaire des Risques (Base RISK_DB)</h4>
                <div className="grid grid-cols-2 gap-3 mt-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                {RISK_DATABASE.map(r => (
                    <label key={r.id} className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-all ${selectedRisks.includes(r.task) ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white hover:bg-gray-50 border-gray-200'}`}>
                    <input type="checkbox" className="mt-1" checked={selectedRisks.includes(r.task)} onChange={(e) => e.target.checked ? setSelectedRisks([...selectedRisks, r.task]) : setSelectedRisks(selectedRisks.filter(x => x !== r.task))} />
                    <div>
                        <div className="text-xs font-bold text-gray-800">{r.task}</div>
                        <div className="text-[10px] text-gray-500 uppercase mt-0.5">{r.category}</div>
                    </div>
                    </label>
                ))}
                </div>
            </div>
          </div>
        )}

        {docType === 'modop' && (
          <div className="space-y-6 animate-in fade-in">
            <h4 className="font-bold text-gray-700 flex items-center gap-2 uppercase tracking-tighter text-sm"><ClipboardList className="text-blue-500"/> Décomposition Technique du Travail</h4>
            <div className="space-y-4">
              {modopSteps.map((step, i) => (
                <div key={i} className="grid grid-cols-12 gap-3 items-center bg-gray-50 p-5 rounded-2xl border border-gray-200 relative group transition-all hover:bg-white hover:shadow-lg">
                  <div className="col-span-1 font-black text-gray-300 text-xl">{i+1}</div>
                  <div className="col-span-4">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Désignation de la Phase</label>
                      <input type="text" className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-blue-500" placeholder="Phase" value={step.phase} onChange={e => {const n=[...modopSteps]; n[i].phase=e.target.value; setModopSteps(n)}} />
                  </div>
                  <div className="col-span-3">
                      <label className="text-[9px] font-bold text-red-400 uppercase tracking-widest block mb-1">Danger Associé</label>
                      <input type="text" className="w-full p-2.5 bg-white border border-red-100 rounded-xl text-sm font-bold text-red-700 outline-none focus:border-red-400" placeholder="Risque" value={step.risque} onChange={e => {const n=[...modopSteps]; n[i].risque=e.target.value; setModopSteps(n)}} />
                  </div>
                  <div className="col-span-3">
                      <label className="text-[9px] font-bold text-green-400 uppercase tracking-widest block mb-1">Moyen de Prévention</label>
                      <input type="text" className="w-full p-2.5 bg-white border border-green-100 rounded-xl text-sm font-bold text-green-700 outline-none focus:border-green-400" placeholder="Mesure" value={step.prevention} onChange={e => {const n=[...modopSteps]; n[i].prevention=e.target.value; setModopSteps(n)}} />
                  </div>
                  <div className="col-span-1 text-center pt-4">
                      <button onClick={() => {const n=[...modopSteps]; n.splice(i,1); setModopSteps(n)}} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
                  </div>
                </div>
              ))}
              <button onClick={() => setModopSteps([...modopSteps, {phase:"", risque:"", prevention:""}])} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-400 font-bold uppercase text-xs hover:border-blue-500 hover:text-blue-500 transition-all flex items-center justify-center gap-2">
                  <Plus size={18}/> Insérer une étape technique supplémentaire
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =================================================================================================
// MODULE 4: FIELD VISITS (Mobile First & Tactile)
// =================================================================================================
function FieldVisits({ chantier }: { chantier: IChantier }) {
  const [visitType, setVisitType] = useState('vmt');
  const [photo, setPhoto] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<string>(''); 

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="lg:col-span-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[{id:'vmt', l:'VMT Manager'}, {id:'q3sre', l:'Audit Q3SRE'}, {id:'ost', l:'Observatoire OST'}].map(t => (
          <button key={t.id} onClick={()=>setVisitType(t.id)} className={`px-6 py-5 rounded-2xl font-black uppercase text-xs flex-1 transition-all ${visitType===t.id ? 'bg-black text-white shadow-xl scale-105' : 'bg-white border border-gray-200 text-gray-400 hover:bg-gray-50'}`}>
            {t.l}
          </button>
        ))}
      </div>

      <div className="lg:col-span-2 bg-white p-8 rounded-[40px] shadow-sm border border-gray-200">
        <h3 className="font-bold text-xl mb-8 flex items-center gap-3 uppercase text-gray-800">
          <Camera className="text-blue-500" size={24}/> Saisie Terrain : {visitType.toUpperCase()}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Domaine Audit</label><select className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-black"><option>Sécurité</option><option>Qualité</option><option>Environnement</option></select></div>
          <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Code OTP Projet</label><input type="text" className="w-full p-4 bg-gray-100 border border-gray-200 rounded-2xl text-sm font-bold text-gray-400 outline-none" value={`OTP-${chantier.nom.substring(0,4).toUpperCase()}`} readOnly/></div>
          
          <div className="md:col-span-2">
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Point de contrôle (Référentiel Altrad)</label>
             <select className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-black" value={checklist} onChange={e => setChecklist(e.target.value)}>
                <option value="">-- Choisir un point de contrôle --</option>
                {Q3SRE_REFERENTIAL.points_controle.map(p => <option key={p} value={p}>{p}</option>)}
             </select>
          </div>

          <div className="md:col-span-2 mt-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Preuve Visuelle (Capture APN)</label>
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
        </div>

        <button className="w-full mt-10 bg-emerald-600 text-white font-black py-6 rounded-3xl shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 active:scale-95">
          <Save size={24}/> TRANSMETTRE AU RESPONSABLE HSE
        </button>
      </div>
      
      {/* Historique Latéral */}
      <div className="hidden lg:block bg-white p-8 rounded-[40px] shadow-sm border border-gray-200 h-fit">
          <h3 className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mb-6 border-b pb-4">Archives de la semaine</h3>
          <div className="space-y-6">
              {[1,2,3].map(i => (
                  <div key={i} className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-md transition-all cursor-pointer">
                      <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center font-black text-xs border text-gray-400 shadow-sm">0{i}</div>
                      <div>
                          <p className="text-xs font-black text-gray-800 uppercase italic">Audit Q3SRE</p>
                          <p className="text-[10px] text-gray-400 font-bold mt-0.5">{new Date().toLocaleDateString()}</p>
                      </div>
                  </div>
              ))}
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
    setParticipants(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleArchive = async () => {
    if (!theme || !animateurId) {
      alert("Veuillez sélectionner un thème et un animateur.");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('causeries_archives').insert([{
        chantier_id: chantier.id,
        animateur_id: animateurId,
        theme: theme,
        notes: notes,
        participants: participants,
        date: new Date().toISOString()
      }]);

      if (error) throw error;
      alert("✅ Causerie archivée avec succès !");
      // Reset form
      setTheme("");
      setNotes("");
      setParticipants([]);
    } catch (e: any) {
      alert("Erreur lors de l'archivage : " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto bg-white p-12 rounded-[50px] shadow-2xl border border-gray-100 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-start border-b-4 border-gray-50 pb-8 mb-10">
        <div>
          <h1 className="text-3xl font-black text-gray-900 uppercase flex items-center gap-4">
              <Megaphone className="text-red-600" size={40}/> Causerie Hebdomadaire
          </h1>
          <p className="text-sm text-gray-400 font-bold mt-2 uppercase tracking-widest">Référentiel Altrad HSE-FORM-042</p>
        </div>
        <div className="text-right">
          <p className="font-black text-gray-900 text-xl italic uppercase">{chantier.nom}</p>
          <div className="flex items-center justify-end gap-2 text-gray-400 mt-2 font-bold">
              <Calendar size={18}/>
              <p className="text-sm">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-10 mb-10">
        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Thématique du Jour</label>
          <select 
            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-black text-gray-700 outline-none focus:border-red-500 transition-all shadow-inner" 
            value={theme} 
            onChange={e => setTheme(e.target.value)}
          >
             <option value="">-- Sélectionner un thème --</option>
             {CAUSERIE_THEMES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Animateur / Chef de Chantier</label>
          <select 
            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-black text-gray-700 outline-none focus:border-red-500 transition-all shadow-inner"
            value={animateurId}
            onChange={e => setAnimateurId(e.target.value)}
          >
            <option value="">-- Sélectionner l'animateur --</option>
            {equipe.map(u => <option key={u.id} value={u.id}>{u.nom} {u.prenom}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-10">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Notes de séance / Remontées des opérateurs</label>
        <textarea 
          className="w-full p-6 bg-orange-50/30 border-2 border-orange-100 rounded-[30px] text-sm font-bold text-gray-700 h-40 outline-none focus:border-orange-300 transition-all placeholder:text-orange-200" 
          placeholder="Saisir les échanges et les points de vigilance identifiés par l'équipe..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        ></textarea>
      </div>

      <div>
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 block flex justify-between items-center">
            <span>Tableau d'Émargement Digital</span>
            <span className="bg-gray-100 px-3 py-1 rounded-full text-gray-500 font-bold">{equipe.length} personnels convoqués via le planning</span>
        </label>
        <div className="border-2 border-gray-50 rounded-[35px] overflow-hidden shadow-inner">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-[10px] font-black uppercase text-gray-500 border-b border-gray-100">
              <tr><th className="p-5">Collaborateur</th><th className="p-5">Habilitation Clef</th><th className="p-5 text-center">Émarger</th></tr>
            </thead>
            <tbody className="text-sm bg-white">
              {equipe.map(u => (
                <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors group">
                  <td className="p-5 flex items-center gap-4">
                    <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center font-black text-gray-400 group-hover:bg-red-500 group-hover:text-white transition-colors">
                      {u.nom.substring(0,1)}{u.prenom.substring(0,1)}
                    </div>
                    <div>
                      <div className="font-black text-gray-800 text-base uppercase italic">{u.nom} {u.prenom}</div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{u.role}</div>
                    </div>
                  </td>
                  <td className="p-5">
                    <div className="flex flex-wrap gap-1">
                      {u.habilitations?.slice(0, 2).map(h => <span key={h} className="text-[8px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-black uppercase">{h}</span>)}
                    </div>
                  </td>
                  <td className="p-5 text-center">
                    <input 
                      type="checkbox" 
                      className="w-7 h-7 rounded-xl text-red-600 focus:ring-red-500 border-gray-200 cursor-pointer shadow-sm" 
                      checked={participants.includes(u.id)}
                      onChange={() => toggleParticipant(u.id)}
                    />
                  </td>
                </tr>
              ))}
              {equipe.length === 0 && (
                <tr><td colSpan={3} className="p-20 text-center text-gray-300 font-black uppercase italic">Aucun personnel affecté à ce chantier au planning aujourd'hui.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mt-12 flex justify-between items-center pt-8 border-t-2 border-gray-50">
        <p className="text-[10px] font-bold text-gray-300 max-w-xs uppercase italic">L'archivage de ce document vaut pour validation des consignes de sécurité journalières.</p>
        <button 
          onClick={handleArchive}
          disabled={isSaving}
          className="bg-red-600 text-white px-12 py-5 rounded-2xl font-black uppercase hover:bg-black transition-all shadow-xl shadow-red-100 flex items-center gap-3 active:scale-95 disabled:opacity-50"
        >
            {isSaving ? <Clock className="animate-spin" size={24}/> : <Save size={24}/>}
            Finaliser & Archiver
        </button>
      </div>
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
  const themes:any = { 
    red: "bg-red-50 text-red-600 border-red-100 shadow-red-50", 
    blue: "bg-blue-50 text-blue-600 border-blue-100 shadow-blue-50", 
    green: "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-50", 
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100 shadow-indigo-50",
    orange: "bg-orange-50 text-orange-600 border-orange-100 shadow-orange-50" 
  };
  return (
    <div className={`p-6 rounded-[30px] border flex items-start justify-between shadow-sm hover:shadow-xl transition-all cursor-default bg-white ${themes[color].split(' ')[2]}`}>
      <div>
        <p className="text-[10px] font-black uppercase opacity-60 tracking-widest text-gray-500">{label}</p>
        <p className="text-4xl font-black mt-2 text-gray-900 tracking-tighter">{val}</p>
        <p className={`text-[10px] font-black mt-2 uppercase ${themes[color].split(' ')[1]}`}>{sub}</p>
      </div>
      <div className={`p-4 rounded-2xl shadow-sm ${themes[color].split(' ').slice(0,2).join(' ')}`}><Icon size={28}/></div>
    </div>
  )
};
