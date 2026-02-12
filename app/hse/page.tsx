"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, FileText, Wrench, Camera, Megaphone, 
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Clock, 
  MapPin, Phone, Mail, User, Calendar, Printer, Save, 
  Plus, Trash2, Search, ArrowRight, Download, Eye,
  AlertOctagon, Siren, HardHat, FileCheck, X, ChevronRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend 
} from 'recharts';
import { jsPDF } from "jspdf"; 

// IMPORTATION DES DONNÉES MÉTIERS (Connexion avec votre fichier data.ts)
import { 
  RISK_DATABASE, 
  VGP_RULES, 
  EQUIPMENT_TYPES, 
  Q3SRE_REFERENTIAL, 
  OST_THEMES, 
  CAUSERIE_THEMES 
} from './data';

// --- TYPAGE STRICT DES DONNÉES ---

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
  habilitations: string[];
  chantier_affecte_id: string;
}

interface IMateriel {
  id: string;
  libelle: string;
  type: string; 
  numero_serie: string;
  derniere_vgp: string;
  frequence_vgp_mois: number;
  statut: 'operationnel' | 'maintenance' | 'rebut';
  chantier_actuel_id: string;
}

// --- COMPOSANT PRINCIPAL ---

export default function HSEUltimateModule() {
  // Navigation & État Global
  const [view, setView] = useState<'dashboard'|'generator'|'vgp'|'terrain'|'causerie'>('dashboard');
  const [loading, setLoading] = useState(true);
  
  // Données "Vives" (Simulées ou Fetchées)
  const [chantiers, setChantiers] = useState<IChantier[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [materiel, setMateriel] = useState<IMateriel[]>([]);
  
  // Contexte Actuel
  const [activeChantierId, setActiveChantierId] = useState<string>("");
  
  // Calculs dérivés
  const activeChantier = chantiers.find(c => c.id === activeChantierId);
  const activeEquipe = users.filter(u => u.chantier_affecte_id === activeChantierId);
  const activeMateriel = materiel.filter(m => m.chantier_actuel_id === activeChantierId);

  // --- INITIALISATION ---
  useEffect(() => {
    // Simulation du chargement des données depuis Supabase
    // Dans la réalité, remplacez par : const { data } = await supabase.from('...').select('*');
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
        { id: "USR-004", nom: "Dupont", prenom: "Jean", role: "employe", telephone: "06 12 34 56 78", habilitations: ["SST", "CACES R486", "Travail en hauteur"], chantier_affecte_id: "CH-2026-001" },
        { id: "USR-001", nom: "Martin", prenom: "Paul", role: "chef_chantier", telephone: "06 99 88 77 66", habilitations: ["SST", "Encadrement"], chantier_affecte_id: "CH-2026-001" }
      ]);

      setMateriel([
        { id: "MAT-882", libelle: "Nacelle Élévatrice Haulotte", type: "Levage", numero_serie: "HX-99827-B", derniere_vgp: "2025-11-20", frequence_vgp_mois: 6, statut: "operationnel", chantier_actuel_id: "CH-2026-001" },
        { id: "MAT-102", libelle: "Compresseur Atlas", type: "Pression", numero_serie: "CP-2022-X", derniere_vgp: "2024-01-15", frequence_vgp_mois: 12, statut: "operationnel", chantier_actuel_id: "CH-2026-001" }
      ]);

      setLoading(false);
    }, 500);
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-bold">Chargement du Système HSE...</div>;

  return (
    <div className="flex min-h-screen bg-[#f3f4f6] font-sans text-gray-800">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 z-50">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-black uppercase text-gray-900 leading-none">ALTRAD<span className="text-red-600">.HSE</span></h1>
          <p className="text-[10px] font-bold text-gray-400 tracking-widest mt-1">SÉCURITÉ & QUALITÉ</p>
        </div>

        <div className="p-4">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2 block">Contexte Chantier</label>
          <select 
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-red-100 transition-all" 
            value={activeChantierId}
            onChange={(e) => setActiveChantierId(e.target.value)}
          >
            <option value="">-- SÉLECTIONNER --</option>
            {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <NavBtn id="dashboard" icon={LayoutDashboard} label="Tableau de Bord" active={view} set={setView} />
          <div className="pt-4 pb-1"><p className="text-[10px] font-black text-gray-300 uppercase">Bureau des Méthodes</p></div>
          <NavBtn id="generator" icon={FileText} label="Générateur Documents" active={view} set={setView} disabled={!activeChantierId} />
          <NavBtn id="vgp" icon={Wrench} label="Suivi Matériel & VGP" active={view} set={setView} disabled={!activeChantierId} />
          <div className="pt-4 pb-1"><p className="text-[10px] font-black text-gray-300 uppercase">Terrain & Ops</p></div>
          <NavBtn id="terrain" icon={Camera} label="Visites (VMT / Q3SRE)" active={view} set={setView} disabled={!activeChantierId} />
          <NavBtn id="causerie" icon={Megaphone} label="Causeries & Accueil" active={view} set={setView} disabled={!activeChantierId} />
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 h-screen overflow-hidden flex flex-col relative">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-3">
            {view === 'dashboard' && <LayoutDashboard className="text-gray-400"/>}
            {view === 'generator' && <FileText className="text-blue-500"/>}
            {view === 'vgp' && <Wrench className="text-orange-500"/>}
            {view === 'terrain' && <Camera className="text-emerald-500"/>}
            {view === 'causerie' && <Megaphone className="text-purple-500"/>}
            {view === 'dashboard' ? 'Vue Globale' : view.replace('_', ' ')}
          </h2>
          {activeChantier && (
            <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
              <span className="flex items-center gap-1"><MapPin size={14}/> {activeChantier.adresse}</span>
              <span className="flex items-center gap-1"><Users size={14}/> {activeEquipe.length} Pers.</span>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {!activeChantierId && view !== 'dashboard' ? (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
              <HardHat size={64} className="mb-4 text-gray-400"/>
              <p className="text-lg font-bold">Veuillez sélectionner un chantier dans le menu latéral.</p>
            </div>
          ) : (
            <>
              {view === 'dashboard' && <DashboardModule chantiers={chantiers} materiel={materiel} />}
              {view === 'generator' && <DocumentGenerator chantier={activeChantier!} equipe={activeEquipe} materiel={activeMateriel} />}
              {view === 'vgp' && <VGPTracker materiel={activeMateriel} />}
              {view === 'terrain' && <FieldVisits chantier={activeChantier!} />}
              {view === 'causerie' && <SafetyTalks chantier={activeChantier!} equipe={activeEquipe} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// MODULE 1: DASHBOARD (Indicateurs Clés)
// ============================================================================
function DashboardModule({ chantiers, materiel }: { chantiers: IChantier[], materiel: IMateriel[] }) {
  const vgpPerimees = materiel.filter(m => {
    const nextDate = new Date(new Date(m.derniere_vgp).setMonth(new Date(m.derniere_vgp).getMonth() + m.frequence_vgp_mois));
    return nextDate < new Date();
  }).length;

  const chartData = [{name: 'Jan', TF: 4.2}, {name: 'Fév', TF: 3.8}, {name: 'Mar', TF: 2.5}, {name: 'Avr', TF: 0.0}, {name: 'Mai', TF: 1.2}];
  const pieData = [
    {name: 'VGP OK', value: materiel.length - vgpPerimees, color: '#10b981'}, 
    {name: 'VGP HS', value: vgpPerimees, color: '#ef4444'}
  ];

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Taux de Fréquence" val="2.1" sub="-0.5 vs N-1" icon={AlertOctagon} color="blue" />
        <StatCard label="Chantiers Actifs" val={chantiers.length} sub="En cours" icon={HardHat} color="indigo" />
        <StatCard label="VGP Périmées" val={vgpPerimees} sub="Action requise" icon={Siren} color={vgpPerimees > 0 ? "red" : "green"} />
        <StatCard label="Causeries / Mois" val="8" sub="Objectif: 12" icon={Megaphone} color="orange" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-96">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="font-bold text-gray-700 mb-4">Évolution Accidentologie</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="name"/>
              <YAxis allowDecimals={false}/>
              <RechartsTooltip/>
              <Bar dataKey="TF" fill="#ef4444" radius={[4,4,0,0]} barSize={40}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="font-bold text-gray-700 mb-4">État du Parc Matériel</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Pie>
              <RechartsTooltip />
              <Legend verticalAlign="bottom"/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODULE 2: SUIVI VGP & MATÉRIEL
// ============================================================================
function VGPTracker({ materiel }: { materiel: IMateriel[] }) {
  // Calcul VGP status
  const getStatus = (last: string, freq: number) => {
    const lastDate = new Date(last);
    const nextDate = new Date(lastDate.setMonth(lastDate.getMonth() + freq));
    const now = new Date();
    const diffTime = nextDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'PÉRIMÉ', color: 'bg-red-100 text-red-700 border-red-200', days: diffDays };
    if (diffDays < 30) return { label: 'URGENT', color: 'bg-orange-100 text-orange-700 border-orange-200', days: diffDays };
    return { label: 'VALIDE', color: 'bg-green-50 text-green-700 border-green-200', days: diffDays };
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div>
          <h3 className="font-black text-gray-800 text-lg flex items-center gap-2"><Wrench className="text-orange-500"/> REGISTRE DE SÉCURITÉ</h3>
          <p className="text-xs text-gray-500 mt-1">Calcul automatique des échéances réglementaires.</p>
        </div>
        <button className="bg-black text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-gray-800 transition-colors flex items-center gap-2">
          <Plus size={16}/> Ajouter Équipement
        </button>
      </div>

      <table className="w-full text-left">
        <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-wider">
          <tr>
            <th className="p-4">Équipement / Série</th>
            <th className="p-4">Catégorie</th>
            <th className="p-4">Dernière VGP</th>
            <th className="p-4">Échéance</th>
            <th className="p-4 text-center">État</th>
            <th className="p-4 text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-sm">
          {materiel.map(m => {
            const status = getStatus(m.derniere_vgp, m.frequence_vgp_mois);
            return (
              <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4">
                  <div className="font-bold text-gray-800">{m.libelle}</div>
                  <div className="text-xs text-gray-400 font-mono mt-0.5">{m.numero_serie}</div>
                </td>
                <td className="p-4">
                  <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-600 border">
                    {m.type}
                  </span>
                </td>
                <td className="p-4 text-gray-600">{new Date(m.derniere_vgp).toLocaleDateString()}</td>
                <td className="p-4 font-medium">
                  {new Date(new Date(m.derniere_vgp).setMonth(new Date(m.derniere_vgp).getMonth() + m.frequence_vgp_mois)).toLocaleDateString()}
                </td>
                <td className="p-4 text-center">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black border inline-flex items-center gap-1 ${status.color}`}>
                    {status.days < 0 ? <XCircle size={12}/> : <CheckCircle2 size={12}/>}
                    {status.label} ({status.days > 0 ? `J+${status.days}` : `J${status.days}`})
                  </span>
                </td>
                <td className="p-4 text-center">
                  <button className="text-gray-400 hover:text-blue-600 transition-colors"><Eye size={18}/></button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// MODULE 3: GÉNÉRATEUR INTELLIGENT
// ============================================================================
function DocumentGenerator({ chantier, equipe, materiel }: { chantier: IChantier, equipe: IUser[], materiel: IMateriel[] }) {
  const [docType, setDocType] = useState<'ppsps'|'modop'|'rex'|'causerie'>('ppsps');
  const [selectedRisks, setSelectedRisks] = useState<string[]>([]);
  const [modopSteps, setModopSteps] = useState([{ phase: "Préparation", risque: "Chute", prevention: "Harnais" }]);
  const [secours, setSecours] = useState({ sst: [], hopital: "Hôpital Edouard Herriot (Lyon)", pompier: "18" });

  useEffect(() => {
    // Auto-détection SST
    const sstMembers = equipe.filter(u => u.habilitations.includes("SST")).map(u => `${u.nom} ${u.prenom}`);
    setSecours(prev => ({ ...prev, sst: sstMembers as any }));
  }, [equipe]);

  const generatePDF = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString();

    doc.setFontSize(10);
    doc.text("ALTRAD SERVICES - Agence Sud-Est", 10, 10);
    doc.text(`Projet: ${chantier.nom}`, 150, 10);
    doc.text(`Date: ${today}`, 150, 15);
    doc.line(10, 20, 200, 20);

    if (docType === 'ppsps') {
      doc.setFontSize(18);
      doc.setTextColor(220, 0, 0);
      doc.text("PLAN PARTICULIER DE SÉCURITÉ (PPSPS)", 105, 35, { align: "center" });
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("1. RENSEIGNEMENTS GÉNÉRAUX", 10, 50);
      doc.setFontSize(10);
      doc.text(`Maître d'Ouvrage : ${chantier.client}`, 15, 60);
      doc.text(`Adresse du site : ${chantier.adresse}`, 15, 65);
      doc.text(`Responsable : ${users.find(u => u.id === chantier.responsable_id)?.nom || 'Non défini'}`, 15, 70);

      doc.setFontSize(12);
      doc.text("2. ORGANISATION DES SECOURS", 10, 90);
      doc.setFontSize(10);
      doc.text(`Hôpital : ${secours.hopital}`, 15, 100);
      doc.text(`SST présents :`, 15, 105);
      (secours.sst as any).forEach((sst: string, i: number) => {
        doc.text(`- ${sst}`, 20, 112 + (i*5));
      });

      doc.setFontSize(12);
      doc.text("3. RISQUES & PRÉVENTION", 10, 140);
      doc.setFontSize(10);
      selectedRisks.forEach((r, i) => {
        doc.text(`- ${r}`, 15, 150 + (i*5));
      });

    } else if (docType === 'modop') {
      doc.setFontSize(18);
      doc.setTextColor(0, 100, 200);
      doc.text("MODE OPÉRATOIRE TECHNIQUE", 105, 35, { align: "center" });
      
      if (chantier.type_travaux.includes("Peinture")) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`SYSTÈME PEINTURE : ${chantier.infos_acqpa?.systeme_homologue || 'Standard'}`, 105, 45, { align: "center" });
      }

      doc.setTextColor(0,0,0);
      doc.text("PHASAGE DES OPÉRATIONS :", 10, 60);
      
      let y = 70;
      modopSteps.forEach((step, i) => {
        doc.rect(10, y, 190, 20);
        doc.setFontSize(11);
        doc.text(`Phase ${i+1} : ${step.phase}`, 15, y+8);
        doc.setFontSize(9);
        doc.text(`Risque: ${step.risque}`, 15, y+15);
        doc.text(`Prévention: ${step.prevention}`, 100, y+15);
        y += 25;
      });
    }

    doc.save(`${docType}_${chantier.nom}.pdf`);
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-full animate-in fade-in">
      <div className="col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
        <h3 className="font-black text-gray-700 mb-6 uppercase">Type de Document</h3>
        <div className="space-y-3">
          {[
            {id: 'ppsps', label: 'PPSPS', color: 'border-red-500 bg-red-50 text-red-700'},
            {id: 'modop', label: 'Mode Opératoire', color: 'border-blue-500 bg-blue-50 text-blue-700'},
            {id: 'rex', label: 'Bilan Fin Chantier (REX)', color: 'border-purple-500 bg-purple-50 text-purple-700'},
            {id: 'causerie', label: 'Fiche Causerie', color: 'border-orange-500 bg-orange-50 text-orange-700'},
          ].map((t: any) => (
            <button 
              key={t.id} 
              onClick={() => setDocType(t.id)}
              className={`w-full text-left p-4 rounded-xl border-l-4 transition-all ${docType === t.id ? t.color + ' shadow-md' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
            >
              <div className="font-bold">{t.label}</div>
            </button>
          ))}
        </div>
        <div className="mt-auto">
          <button onClick={generatePDF} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95">
            <Download size={20}/> TÉLÉCHARGER PDF
          </button>
        </div>
      </div>

      <div className="col-span-9 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 overflow-y-auto">
        <h3 className="text-xl font-black text-gray-800 uppercase mb-6 flex items-center gap-2">
          <Edit className="text-gray-400"/> Édition : {docType.toUpperCase()}
        </h3>

        {docType === 'ppsps' && (
          <div className="space-y-8">
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Siren className="text-red-500"/> Organisation des Secours (Pré-rempli)</h4>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="label-form">Hôpital de référence</label>
                  <input type="text" className="input-form" value={secours.hopital} onChange={e => setSecours({...secours, hopital: e.target.value})} />
                </div>
                <div>
                  <label className="label-form">SST sur le chantier (Auto-détectés)</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(secours.sst as any).map((s:string) => (
                      <span key={s} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200 flex items-center gap-1">
                        <CheckCircle2 size={12}/> {s}
                      </span>
                    ))}
                    {(secours.sst as any).length === 0 && <span className="text-red-500 text-xs font-bold italic">Aucun SST détecté dans l'équipe !</span>}
                  </div>
                </div>
              </div>
            </div>
            
            <h4 className="font-bold text-gray-700 mt-6 border-b pb-2">Sélection des Risques (Base de Données)</h4>
            <div className="grid grid-cols-2 gap-3 mt-4">
               {RISK_DATABASE.slice(0, 10).map(r => (
                 <label key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 border border-gray-200">
                   <input type="checkbox" onChange={(e) => e.target.checked ? setSelectedRisks([...selectedRisks, r.task]) : setSelectedRisks(selectedRisks.filter(x => x !== r.task))} />
                   <div>
                     <div className="text-xs font-bold text-gray-800">{r.task}</div>
                     <div className="text-[10px] text-gray-500">{r.category}</div>
                   </div>
                 </label>
               ))}
            </div>
          </div>
        )}

        {docType === 'modop' && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800 text-sm font-medium flex items-center gap-3">
              <HardHat size={20}/>
              Le système a détecté des travaux de type : <strong>{chantier.type_travaux.join(', ')}</strong>. Les risques associés ont été pré-chargés.
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-gray-700">Chronologie des Tâches</h4>
              {modopSteps.map((step, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="col-span-1 font-black text-gray-300 text-center text-lg">{i+1}</div>
                  <div className="col-span-4"><input type="text" className="input-form" placeholder="Phase" value={step.phase} onChange={e => {const n=[...modopSteps]; n[i].phase=e.target.value; setModopSteps(n)}} /></div>
                  <div className="col-span-3"><input type="text" className="input-form border-red-200" placeholder="Risque" value={step.risque} onChange={e => {const n=[...modopSteps]; n[i].risque=e.target.value; setModopSteps(n)}} /></div>
                  <div className="col-span-3"><input type="text" className="input-form border-green-200" placeholder="Prévention" value={step.prevention} onChange={e => {const n=[...modopSteps]; n[i].prevention=e.target.value; setModopSteps(n)}} /></div>
                  <div className="col-span-1 text-center"><button onClick={() => {const n=[...modopSteps]; n.splice(i,1); setModopSteps(n)}} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button></div>
                </div>
              ))}
              <button onClick={() => setModopSteps([...modopSteps, {phase:"", risque:"", prevention:""}])} className="text-blue-600 font-bold text-sm flex items-center gap-1 hover:underline">+ Ajouter une étape</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MODULE 4: FIELD VISITS (Mobile First)
// ============================================================================
function FieldVisits({ chantier }: { chantier: IChantier }) {
  const [visitType, setVisitType] = useState('vmt');
  const [photo, setPhoto] = useState<string | null>(null);
  // Utilisation de la liste des points de contrôle depuis data.ts
  const [checklist, setChecklist] = useState<string>(''); 

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in">
      <div className="lg:col-span-3 flex gap-2 overflow-x-auto pb-2">
        {[{id:'vmt', l:'VMT Manager'}, {id:'q3sre', l:'Contrôle Q3SRE'}, {id:'ost', l:'Observation (OST)'}].map(t => (
          <button key={t.id} onClick={()=>setVisitType(t.id)} className={`px-6 py-3 rounded-xl font-black uppercase text-sm flex-1 lg:flex-none ${visitType===t.id ? 'bg-black text-white shadow-lg' : 'bg-white border text-gray-500'}`}>
            {t.l}
          </button>
        ))}
      </div>

      <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h3 className="font-bold text-lg mb-6 flex items-center gap-2 uppercase">
          {visitType === 'vmt' && <Camera className="text-blue-500"/>}
          {visitType === 'q3sre' && <ClipboardCheck className="text-emerald-500"/>}
          {visitType === 'ost' && <Eye className="text-orange-500"/>}
          Nouveau Rapport : {visitType}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div><label className="label-form">Domaine</label><select className="input-form"><option>Sécurité</option><option>Qualité</option><option>Environnement</option></select></div>
          <div><label className="label-form">N° OTP</label><input type="text" className="input-form" placeholder="Auto-Fill" value="OTP-2026-X"/></div>
          
          <div className="md:col-span-2">
             <label className="label-form">Point de contrôle (Référentiel)</label>
             <select className="input-form" value={checklist} onChange={e => setChecklist(e.target.value)}>
                <option value="">-- Choisir --</option>
                {/* Utilisation dynamique des données importées */}
                {Q3SRE_REFERENTIAL.points_controle.map(p => <option key={p} value={p}>{p}</option>)}
             </select>
          </div>

          <div className="md:col-span-2 mt-4">
            <label className="label-form">Preuve Photo</label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors cursor-pointer relative">
              <Camera size={32} className="mb-2"/>
              <p className="text-xs font-bold uppercase">Prendre une photo</p>
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                if (e.target.files && e.target.files[0]) setPhoto(URL.createObjectURL(e.target.files[0]));
              }}/>
            </div>
            {photo && <div className="mt-2 h-32 rounded-lg overflow-hidden border border-gray-200"><img src={photo} className="w-full h-full object-cover"/></div>}
          </div>
        </div>

        <button className="w-full mt-8 bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
          <Save size={20}/> ENREGISTRER LA VISITE
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// MODULE 5: CAUSERIES (Template Word Strict)
// ============================================================================
function SafetyTalks({ chantier, equipe }: { chantier: IChantier, equipe: IUser[] }) {
  const [theme, setTheme] = useState("");

  return (
    <div className="max-w-4xl mx-auto bg-white p-10 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in">
      <div className="flex justify-between items-start border-b-2 border-gray-100 pb-6 mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 uppercase">Causerie Sécurité</h1>
          <p className="text-sm text-gray-500 font-medium">Ref: HSE-FORM-042 (Rev C)</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-gray-800">{chantier.nom}</p>
          <p className="text-sm text-gray-500">{new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <label className="label-form">Thème abordé</label>
          <select className="input-form" value={theme} onChange={e => setTheme(e.target.value)}>
             <option value="">-- Sélectionner --</option>
             {CAUSERIE_THEMES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label-form">Animateur</label>
          <select className="input-form">
            {equipe.map(u => <option key={u.id}>{u.nom} {u.prenom}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-8">
        <label className="label-form">Points clés discutés / Remontées terrain</label>
        <textarea className="input-form h-32 bg-yellow-50 border-yellow-200" placeholder="Notes de la séance..."></textarea>
      </div>

      <div>
        <label className="label-form mb-4 block">Émargement des participants</label>
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500">
              <tr><th className="p-3">Nom Prénom</th><th className="p-3">Fonction</th><th className="p-3 text-center">Présent</th></tr>
            </thead>
            <tbody className="text-sm">
              {equipe.map(u => (
                <tr key={u.id} className="border-b border-gray-50 last:border-0">
                  <td className="p-3 font-bold">{u.nom} {u.prenom}</td>
                  <td className="p-3 text-gray-500">{u.role}</td>
                  <td className="p-3 text-center"><input type="checkbox" className="w-5 h-5 rounded text-blue-600"/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mt-10 flex justify-end">
        <button className="bg-black text-white px-8 py-3 rounded-xl font-bold uppercase hover:bg-gray-800">Clôturer & Archiver</button>
      </div>
    </div>
  );
}

// --- UI UTILS ---
const NavBtn = ({id, icon: Icon, label, active, set, disabled}: any) => (
  <button 
    onClick={() => !disabled && set(id)} 
    disabled={disabled}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all ${active === id ? 'bg-red-50 text-red-600 shadow-sm ring-1 ring-red-100' : 'text-gray-500 hover:bg-gray-50 hover:text-black'} ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
  >
    <Icon size={18} /> {label}
    {disabled ? null : <ChevronRight size={14} className="ml-auto opacity-30"/>}
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
    <div className={`p-5 rounded-2xl border flex items-start justify-between shadow-sm ${themes[color]}`}>
      <div>
        <p className="text-[10px] font-black uppercase opacity-60 tracking-wider">{label}</p>
        <p className="text-3xl font-black mt-1">{val}</p>
        <p className="text-xs font-bold opacity-80 mt-1">{sub}</p>
      </div>
      <div className="bg-white/60 p-2 rounded-lg backdrop-blur-sm"><Icon size={24}/></div>
    </div>
  )
};
