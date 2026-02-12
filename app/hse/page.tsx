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
  coordonnees_gps: { lat: number; lng: number };
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
  chantier_affecte_id: string;
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

  // --- DATA STORES (Simulés pour l'instant, à remplacer par fetch Supabase) ---
  const [chantiers, setChantiers] = useState<IChantier[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [materiel, setMateriel] = useState<IMateriel[]>([]);

  // --- CALCUL DES DONNÉES CONTEXTUELLES ---
  const activeChantier = chantiers.find(c => c.id === activeChantierId);
  const activeEquipe = users.filter(u => u.chantier_affecte_id === activeChantierId);
  const activeMateriel = materiel.filter(m => m.chantier_actuel_id === activeChantierId);

  // --- CHARGEMENT INITIAL (Simulation API) ---
  useEffect(() => {
    // Simulation d'un appel API vers Supabase
    setTimeout(() => {
      setChantiers([{
        id: "CH-2026-001",
        nom: "Rénovation Cuve Framatome",
        client: "FRAMATOME",
        adresse: "Avenue Jean Jaurès, 69007 Lyon",
        coordonnees_gps: { lat: 45.728, lng: 4.832 },
        date_debut: "2026-02-15",
        date_fin: "2026-06-15",
        effectif_prevu: 6,
        responsable_id: "USR-001",
        type_travaux: ["Peinture", "Sablage", "Échafaudage"],
        infos_acqpa: { systeme_homologue: "C5-M", epaisseur_totale_visee: 260 }
      }]);

      setUsers([
        { id: "USR-004", nom: "Dupont", prenom: "Jean", role: "employe", email: "j.dupont@altrad.os", telephone: "06 12 34 56 78", habilitations: ["SST", "CACES R486", "Travail en hauteur"], chantier_affecte_id: "CH-2026-001" },
        { id: "USR-001", nom: "Martin", prenom: "Paul", role: "chef_chantier", email: "p.martin@altrad.os", telephone: "06 99 88 77 66", habilitations: ["SST", "Encadrement"], chantier_affecte_id: "CH-2026-001" }
      ]);

      setMateriel([
        { id: "MAT-882", libelle: "Nacelle Élévatrice Haulotte", type: "location", categorie: "Levage", numero_serie: "HX-99827-B", derniere_vgp: "2025-11-20", statut: "operationnel", chantier_actuel_id: "CH-2026-001" },
        { id: "MAT-102", libelle: "Compresseur Atlas", type: "interne", categorie: "Pression", numero_serie: "CP-2022-X", derniere_vgp: "2024-01-15", statut: "operationnel", chantier_actuel_id: "CH-2026-001" },
        { id: "MAT-303", libelle: "Harnais Sécurité", type: "interne", categorie: "EPI_Harnais", numero_serie: "PZL-99", derniere_vgp: "2025-06-01", statut: "operationnel", chantier_actuel_id: "CH-2026-001" }
      ]);

      setLoading(false);
    }, 800);
  }, []);

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 text-gray-500">
      <div className="animate-spin mb-4"><ShieldCheck size={48} className="text-red-600"/></div>
      <p className="font-bold text-lg animate-pulse">Initialisation du Module HSE...</p>
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

        {/* Sélecteur de Contexte (Critique pour l'héritage) */}
        <div className="p-4 bg-gray-50/50 border-b border-gray-100">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2 block flex items-center gap-1">
            <Factory size={12}/> Contexte Chantier
          </label>
          <select 
            className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-red-500 transition-all shadow-sm"
            value={activeChantierId}
            onChange={(e) => setActiveChantierId(e.target.value)}
          >
            <option value="">-- SÉLECTIONNER --</option>
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
            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40 select-none pointer-events-none">
              <HardHat size={80} className="mb-6 text-gray-300"/>
              <h3 className="text-2xl font-black text-gray-400 mb-2">AUCUN CHANTIER SÉLECTIONNÉ</h3>
              <p className="text-gray-400 font-medium">Veuillez sélectionner un projet dans le menu latéral pour accéder aux outils.</p>
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
    const nextDate = new Date(new Date(m.derniere_vgp).setMonth(new Date(m.derniere_vgp).getMonth() + freq));
    return nextDate < new Date();
  }).length;

  const chartData = [{n:'Jan', v:4.2}, {n:'Fev', v:3.8}, {n:'Mar', v:2.1}, {n:'Avr', v:0.0}, {n:'Mai', v:1.2}];
  const pieData = [
    {name: 'VGP Conformes', value: materiel.length - vgpPerimees, color: '#10b981'}, 
    {name: 'VGP Périmées', value: vgpPerimees, color: '#ef4444'}
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Taux de Fréquence (TF)" val="2.1" sub="-0.5 vs N-1" icon={AlertOctagon} color="blue" />
        <StatCard label="Chantiers Actifs" val={chantiers.length} sub="En cours de prod." icon={HardHat} color="indigo" />
        <StatCard label="Matériel Non Conforme" val={vgpPerimees} sub="Action immédiate requise" icon={Siren} color={vgpPerimees > 0 ? "red" : "green"} />
        <StatCard label="Causeries Réalisées" val="12" sub="Objectif Mensuel: 15" icon={Megaphone} color="orange" />
      </div>
      
      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-96">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="font-bold text-gray-700 mb-6 flex items-center gap-2"><ArrowRight size={16} className="text-red-500"/> Évolution Taux de Fréquence (12 mois)</h3>
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
          <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2"><ArrowRight size={16} className="text-emerald-500"/> Conformité Parc Matériel</h3>
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
               <span className="text-4xl font-black text-gray-800">{materiel.length > 0 ? ((materiel.length - vgpPerimees)/materiel.length * 100).toFixed(0) : 0}%</span>
               <span className="text-[10px] uppercase font-bold text-gray-400">Disponibilité</span>
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
    // Récupération de la fréquence dans le fichier data.ts via la catégorie
    const freq = VGP_RULES[cat as keyof typeof VGP_RULES] || 12; // 12 mois par défaut
    
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
      
      {/* En-tête Module */}
      <div className="flex justify-between items-end">
        <div>
          <h3 className="text-2xl font-black text-gray-800 uppercase flex items-center gap-3">
            <Wrench className="text-orange-500" size={28}/> Registre de Sécurité
          </h3>
          <p className="text-gray-500 font-medium mt-1">Suivi réglementaire des équipements affectés au chantier.</p>
        </div>
        <button className="bg-black text-white px-6 py-3 rounded-xl text-xs font-bold uppercase hover:bg-gray-800 transition-colors flex items-center gap-2 shadow-lg">
          <Plus size={16}/> Ajouter un équipement
        </button>
      </div>

      {/* Tableau de suivi */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
            <tr>
              <th className="p-5">Équipement / Série</th>
              <th className="p-5">Catégorie (Règle VGP)</th>
              <th className="p-5">Dernière VGP</th>
              <th className="p-5">Prochaine Échéance</th>
              <th className="p-5 text-center">Statut Réglementaire</th>
              <th className="p-5 text-center">Rapport</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-sm">
            {materiel.length === 0 && (
              <tr><td colSpan={6} className="p-10 text-center text-gray-400 italic">Aucun matériel affecté à ce chantier.</td></tr>
            )}
            {materiel.map(m => {
              const status = getStatus(m.derniere_vgp, m.categorie);
              return (
                <tr key={m.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="p-5">
                    <div className="font-bold text-gray-800 text-base">{m.libelle}</div>
                    <div className="text-xs text-gray-400 font-mono mt-1 flex items-center gap-2">
                      <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">S/N: {m.numero_serie}</span>
                      {m.type === 'location' && <span className="text-purple-500 font-bold bg-purple-50 px-2 py-0.5 rounded">LOXAM</span>}
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
  const [secours, setSecours] = useState({ sst: [], hopital: "Hôpital Edouard Herriot (Lyon)", pompier: "18" });

  // --- AUTOMATISME: Héritage des données (Data Mapping) ---
  useEffect(() => {
    // 1. Détection des SST dans l'équipe
    const sstMembers = equipe.filter(u => u.habilitations.includes("SST")).map(u => `${u.nom} ${u.prenom}`);
    setSecours(prev => ({ ...prev, sst: sstMembers as any }));

    // 2. Pré-cochage des risques selon les travaux
    if (chantier) {
        const autoRisks: string[] = [];
        if (chantier.type_travaux.includes("Peinture")) autoRisks.push("Inhalation solvants", "Projection");
        if (chantier.type_travaux.includes("Échafaudage")) autoRisks.push("Chute de hauteur", "Chute d'objet");
        setSelectedRisks(prev => [...new Set([...prev, ...autoRisks])]);
    }
  }, [equipe, chantier]);

  // --- MOTEUR D'EXPORT PDF (Logique Distincte par Type - CORRECTION BUILD SSR) ---
  const generatePDF = async () => {
    try {
        // Importation dynamique de jsPDF uniquement côté client
        const { jsPDF } = await import("jspdf");
        const doc = new jsPDF();
        const today = new Date().toLocaleDateString();

        // En-tête Commun ALTRAD
        doc.setFillColor(200, 200, 200);
        doc.rect(0, 0, 210, 25, 'F');
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("ALTRAD SERVICES - Agence Sud-Est", 10, 15);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Projet: ${chantier.nom}`, 140, 10);
        doc.text(`Date: ${today}`, 140, 15);
        doc.text(`Réf: DOC-${docType.toUpperCase()}-${chantier.id}`, 140, 20);

        // --- LOGIQUE SPÉCIFIQUE PPSPS ---
        if (docType === 'ppsps') {
          doc.setFontSize(22);
          doc.setTextColor(220, 0, 0); 
          doc.text("PLAN PARTICULIER DE SÉCURITÉ (PPSPS)", 105, 45, { align: "center" });
          
          doc.setFontSize(12);
          doc.setTextColor(0, 0, 0);
          
          doc.setFillColor(240, 240, 240);
          doc.rect(10, 55, 190, 8, 'F');
          doc.setFont("helvetica", "bold");
          doc.text("1. RENSEIGNEMENTS GÉNÉRAUX", 12, 61);
          
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.text(`Maître d'Ouvrage : ${chantier.client}`, 15, 75);
          doc.text(`Adresse du site : ${chantier.adresse}`, 15, 82);
          doc.text(`Effectif moyen : ${chantier.effectif_prevu} personnes`, 15, 89);
          doc.text(`Responsable Chantier : ${users.find(u => u.id === chantier.responsable_id)?.nom || 'Non défini'}`, 15, 96);

          doc.setFillColor(240, 240, 240);
          doc.rect(10, 110, 190, 8, 'F');
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.text("2. ORGANISATION DES SECOURS", 12, 116);
          
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.text(`Hôpital de référence : ${secours.hopital}`, 15, 130);
          doc.text(`Numéros d'urgence : Pompiers (18) - SAMU (15) - Interne (XXXX)`, 15, 137);
          
          doc.setFont("helvetica", "bold");
          doc.text(`Sauveteurs Secouristes du Travail (SST) présents :`, 15, 147);
          doc.setFont("helvetica", "normal");
          (secours.sst as any).forEach((sst: string, i: number) => {
            doc.text(`• ${sst}`, 20, 154 + (i*6));
          });

          doc.setFillColor(240, 240, 240);
          doc.rect(10, 180, 190, 8, 'F');
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.text("3. ANALYSE DES RISQUES SPÉCIFIQUES", 12, 186);
          
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          selectedRisks.forEach((r, i) => {
            doc.text(`- ${r}`, 15, 196 + (i*6));
          });
        } 
        else if (docType === 'modop') {
          doc.setFontSize(22);
          doc.setTextColor(0, 100, 200); 
          doc.text("MODE OPÉRATOIRE TECHNIQUE", 105, 45, { align: "center" });
          
          if (chantier.type_travaux.includes("Peinture")) {
            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100);
            doc.text(`SYSTÈME PEINTURE : ${chantier.infos_acqpa?.systeme_homologue || 'Standard'} (${chantier.infos_acqpa?.epaisseur_totale_visee} µm)`, 105, 55, { align: "center" });
          }

          doc.setTextColor(0,0,0);
          doc.setFont("helvetica", "bold");
          doc.text("MATÉRIEL ENGAGÉ :", 10, 70);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          let matY = 80;
          materiel.forEach((m) => {
              doc.text(`• ${m.libelle} (${m.type})`, 15, matY);
              matY += 6;
          });

          let y = matY + 10;
          doc.setFont("helvetica", "bold");
          doc.text("PHASAGE DES OPÉRATIONS :", 10, y);
          y += 10;
          
          modopSteps.forEach((step, i) => {
            doc.setDrawColor(200, 200, 200);
            doc.rect(10, y, 190, 25); 
            
            doc.setFontSize(14);
            doc.setTextColor(100, 100, 100);
            doc.text(`${i+1}`, 18, y+16); 
            
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            doc.text(`${step.phase}`, 30, y+10);
            
            doc.setFontSize(9);
            doc.setTextColor(200, 0, 0);
            doc.text(`RISQUE: ${step.risque}`, 30, y+18);
            
            doc.setTextColor(0, 150, 0);
            doc.text(`PRÉVENTION: ${step.prevention}`, 110, y+18);
            
            y += 30;
          });
        }

        doc.save(`${docType}_${chantier.nom}.pdf`);
    } catch (err) {
        console.error("Erreur génération PDF:", err);
        alert("Une erreur est survenue lors de la génération du PDF.");
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-full animate-in fade-in slide-in-from-bottom-4">
      {/* GAUCHE : SÉLECTEUR & ACTIONS */}
      <div className="col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
        <h3 className="font-black text-gray-700 mb-6 uppercase flex items-center gap-2"><FileText size={20}/> Type de Document</h3>
        <div className="space-y-3">
          {[
            {id: 'ppsps', label: 'PPSPS', desc: 'Plan Particulier Sécurité', color: 'border-red-500 bg-red-50 text-red-700'},
            {id: 'modop', label: 'Mode Opératoire', desc: 'Fiche technique de tâche', color: 'border-blue-500 bg-blue-50 text-blue-700'},
            {id: 'rex', label: 'Bilan Fin Chantier (REX)', desc: 'Retour expérience', color: 'border-purple-500 bg-purple-50 text-purple-700'},
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
        <div className="mt-auto pt-6 border-t border-gray-100">
          <button onClick={generatePDF} className="w-full bg-black text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition-transform active:scale-95">
            <Download size={20}/> TÉLÉCHARGER PDF
          </button>
        </div>
      </div>

      {/* DROITE : FORMULAIRE CONTEXTUEL */}
      <div className="col-span-9 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 overflow-y-auto">
        <h3 className="text-xl font-black text-gray-800 uppercase mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
          <Edit className="text-gray-400"/> Édition : {docType.toUpperCase()}
        </h3>

        {/* --- FORMULAIRE PPSPS --- */}
        {docType === 'ppsps' && (
          <div className="space-y-8 animate-in fade-in">
            {/* Bloc Secours Pré-rempli */}
            <div className="bg-red-50 p-6 rounded-xl border border-red-100">
              <h4 className="font-bold text-red-800 mb-4 flex items-center gap-2"><Siren size={20}/> Organisation des Secours (Automatique)</h4>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-red-400 uppercase tracking-wider mb-2 block">Hôpital de référence</label>
                  <input type="text" className="w-full p-3 bg-white border border-red-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-red-500 transition-all" value={secours.hopital} onChange={e => setSecours({...secours, hopital: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-red-400 uppercase tracking-wider mb-2 block">SST sur le chantier (Détectés via Habilitations)</label>
                  <div className="flex flex-wrap gap-2 mt-2 bg-white p-3 rounded-lg border border-red-200 min-h-[42px]">
                    {(secours.sst as any).map((s:string) => (
                      <span key={s} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200 flex items-center gap-1">
                        <CheckCircle2 size={12}/> {s}
                      </span>
                    ))}
                    {(secours.sst as any).length === 0 && <span className="text-red-500 text-xs font-bold italic flex items-center gap-1"><AlertTriangle size={12}/> Aucun SST dans l'équipe actuelle !</span>}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Sélection Risques (Base de Données) */}
            <div>
                <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><ShieldCheck size={20}/> Risques Spécifiques (Cocher pour inclure)</h4>
                <div className="grid grid-cols-2 gap-3 mt-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                {RISK_DATABASE.slice(0, 12).map(r => (
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

        {/* --- FORMULAIRE MODE OPÉRATOIRE --- */}
        {docType === 'modop' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800 text-sm font-medium flex items-center gap-3">
              <HardHat size={20}/>
              Détection auto : Travaux de <strong>{chantier.type_travaux.join(', ')}</strong>. Les risques génériques ont été pré-chargés.
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-gray-700 flex items-center gap-2"><ClipboardList/> Chronologie des Opérations</h4>
              {modopSteps.map((step, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm relative group">
                  <div className="col-span-1 font-black text-gray-300 text-center text-xl">{i+1}</div>
                  <div className="col-span-4">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Phase</label>
                      <input type="text" className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 outline-none" placeholder="Phase" value={step.phase} onChange={e => {const n=[...modopSteps]; n[i].phase=e.target.value; setModopSteps(n)}} />
                  </div>
                  <div className="col-span-3">
                      <label className="text-[9px] font-bold text-red-400 uppercase tracking-widest block mb-1">Risque Majeur</label>
                      <input type="text" className="w-full p-2 bg-white border border-red-200 rounded-lg text-sm font-bold text-red-700 outline-none" placeholder="Risque" value={step.risque} onChange={e => {const n=[...modopSteps]; n[i].risque=e.target.value; setModopSteps(n)}} />
                  </div>
                  <div className="col-span-3">
                      <label className="text-[9px] font-bold text-green-400 uppercase tracking-widest block mb-1">Prévention</label>
                      <input type="text" className="w-full p-2 bg-white border border-green-200 rounded-lg text-sm font-bold text-green-700 outline-none" placeholder="Prévention" value={step.prevention} onChange={e => {const n=[...modopSteps]; n[i].prevention=e.target.value; setModopSteps(n)}} />
                  </div>
                  <div className="col-span-1 text-center pt-4">
                      <button onClick={() => {const n=[...modopSteps]; n.splice(i,1); setModopSteps(n)}} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                  </div>
                </div>
              ))}
              <button onClick={() => setModopSteps([...modopSteps, {phase:"", risque:"", prevention:""}])} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 font-bold uppercase text-xs hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center gap-2">
                  <Plus size={16}/> Ajouter une étape
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
      {/* Tab Bar interne pour mobile */}
      <div className="lg:col-span-3 flex gap-2 overflow-x-auto pb-2">
        {[{id:'vmt', l:'VMT Manager'}, {id:'q3sre', l:'Contrôle Q3SRE'}, {id:'ost', l:'Observation (OST)'}].map(t => (
          <button key={t.id} onClick={()=>setVisitType(t.id)} className={`px-6 py-4 rounded-xl font-black uppercase text-xs flex-1 lg:flex-none transition-all ${visitType===t.id ? 'bg-black text-white shadow-lg scale-105' : 'bg-white border border-gray-200 text-gray-500'}`}>
            {t.l}
          </button>
        ))}
      </div>

      <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
        <h3 className="font-bold text-lg mb-6 flex items-center gap-2 uppercase text-gray-800">
          {visitType === 'vmt' && <Camera className="text-blue-500"/>}
          {visitType === 'q3sre' && <ClipboardCheck className="text-emerald-500"/>}
          {visitType === 'ost' && <Eye className="text-orange-500"/>}
          Nouveau Rapport : {visitType}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Domaine</label><select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none"><option>Sécurité</option><option>Qualité</option><option>Environnement</option></select></div>
          <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">N° OTP</label><input type="text" className="w-full p-3 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-gray-400 outline-none" placeholder="Auto-Fill" value="OTP-2026-X" readOnly/></div>
          
          <div className="md:col-span-2">
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Point de contrôle (Référentiel)</label>
             <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none" value={checklist} onChange={e => setChecklist(e.target.value)}>
                <option value="">-- Choisir un point de contrôle --</option>
                {Q3SRE_REFERENTIAL.points_controle.map(p => <option key={p} value={p}>{p}</option>)}
             </select>
          </div>

          <div className="md:col-span-2 mt-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Preuve Photo (Tap to shoot)</label>
            <div className="border-2 border-dashed border-gray-300 rounded-2xl h-48 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors cursor-pointer relative overflow-hidden bg-gray-50">
              {photo ? <img src={photo} className="w-full h-full object-cover" /> : (
                <>
                  <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                      <Camera size={32} className="text-gray-400"/>
                  </div>
                  <p className="text-xs font-black uppercase tracking-wider">Ajouter une photo</p>
                </>
              )}
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                if (e.target.files && e.target.files[0]) setPhoto(URL.createObjectURL(e.target.files[0]));
              }}/>
            </div>
          </div>
        </div>

        <button className="w-full mt-8 bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 active:scale-95">
          <Save size={20}/> ENREGISTRER LA VISITE
        </button>
      </div>
      
      {/* Historique Rapide */}
      <div className="hidden lg:block bg-white p-6 rounded-3xl shadow-sm border border-gray-200 h-fit">
          <h3 className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mb-4">Derniers Rapports</h3>
          <div className="space-y-4">
              {[1,2,3].map(i => (
                  <div key={i} className="flex gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center font-bold text-xs border text-gray-500">{i}</div>
                      <div>
                          <p className="text-xs font-bold text-gray-800">Visite Q3SRE</p>
                          <p className="text-[10px] text-gray-400">{new Date().toLocaleDateString()}</p>
                      </div>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
}

// =================================================================================================
// MODULE 5: CAUSERIES (Template Word Strict)
// =================================================================================================
function SafetyTalks({ chantier, equipe }: { chantier: IChantier, equipe: IUser[] }) {
  const [theme, setTheme] = useState("");

  return (
    <div className="max-w-4xl mx-auto bg-white p-10 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-start border-b-2 border-gray-100 pb-6 mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 uppercase flex items-center gap-3">
              <Megaphone className="text-orange-500" size={32}/> Causerie Sécurité
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Ref: HSE-FORM-042 (Rev C)</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-gray-800 text-lg">{chantier.nom}</p>
          <div className="flex items-center justify-end gap-2 text-gray-500 mt-1">
              <Calendar size={14}/>
              <p className="text-sm">{new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Thème abordé</label>
          <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none" value={theme} onChange={e => setTheme(e.target.value)}>
             <option value="">-- Sélectionner --</option>
             {CAUSERIE_THEMES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Animateur</label>
          <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none">
            {equipe.map(u => <option key={u.id}>{u.nom} {u.prenom}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-8">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Points clés discutés / Remontées terrain</label>
        <textarea className="w-full p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm font-medium text-gray-700 h-32 outline-none focus:border-yellow-400 transition-all" placeholder="Notes de la séance..."></textarea>
      </div>

      <div>
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block flex justify-between">
            <span>Émargement des participants</span>
            <span className="text-gray-400 font-normal">{equipe.length} personnes convoquées</span>
        </label>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-500 border-b border-gray-200">
              <tr><th className="p-4">Nom Prénom</th><th className="p-4">Fonction</th><th className="p-4 text-center">Présent</th></tr>
            </thead>
            <tbody className="text-sm bg-white">
              {equipe.map(u => (
                <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-bold text-gray-800">{u.nom} {u.prenom}</td>
                  <td className="p-4 text-gray-500">{u.role}</td>
                  <td className="p-4 text-center"><input type="checkbox" className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mt-10 flex justify-end pt-6 border-t border-gray-100">
        <button className="bg-black text-white px-8 py-4 rounded-xl font-bold uppercase hover:bg-gray-800 transition-all shadow-lg flex items-center gap-2">
            <Save size={18}/> Clôturer & Archiver
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
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all 
      ${active === id ? 'bg-red-50 text-red-600 shadow-sm ring-1 ring-red-100' : 'text-gray-500 hover:bg-gray-50 hover:text-black'} 
      ${disabled ? 'opacity-40 cursor-not-allowed grayscale' : ''}`}
  >
    <Icon size={18} /> {label}
    {!disabled && active === id && <ChevronRight size={14} className="ml-auto opacity-50"/>}
  </button>
);

const StatCard = ({ label, val, sub, icon: Icon, color }: any) => {
  const themes:any = { 
    red: "bg-red-50 text-red-600 border-red-100", 
    blue: "bg-blue-50 text-blue-600 border-blue-100", 
    green: "bg-emerald-50 text-emerald-600 border-emerald-100", 
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100" 
  };
  return (
    <div className={`p-5 rounded-2xl border flex items-start justify-between shadow-sm hover:shadow-md transition-shadow cursor-default bg-white ${themes[color].split(' ')[2]}`}>
      <div>
        <p className="text-[10px] font-black uppercase opacity-60 tracking-wider text-gray-500">{label}</p>
        <p className="text-3xl font-black mt-1 text-gray-800">{val}</p>
        <p className={`text-xs font-bold mt-1 ${themes[color].split(' ')[1]}`}>{sub}</p>
      </div>
      <div className={`p-3 rounded-xl ${themes[color].split(' ').slice(0,2).join(' ')}`}><Icon size={24}/></div>
    </div>
  )
};
