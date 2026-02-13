"use client";

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, FileText, Wrench, Camera, Megaphone, 
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Clock, 
  MapPin, Phone, Mail, User, Users, Calendar, Printer, Save, 
  Plus, Trash2, Search, ArrowRight, Download, Eye,
  AlertOctagon, Siren, HardHat, FileCheck, X, ChevronRight,
  ClipboardList, Stethoscope, Factory, Truck, Edit, ClipboardCheck, History,
  PenTool, Thermometer, Droplets, Ruler, MousePointer2, Circle, Lock, ShieldAlert,
  BellRing, CalendarClock, MessageSquare, ListChecks, CheckCircle
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
// 1. DÉFINITION DES TYPES & INTERFACES (Modèle de Données Intégral Altrad OS)
// =================================================================================================

interface IHabilitation {
  id: string;
  libelle: string;
  date_echeance: string;
}

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
  habilitations: IHabilitation[]; // Structure enrichie pour vérification réelle
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

// Interface spécifique pour le build
interface PrejobProps {
  chantier: IChantier;
  equipe: IUser[];
  animateurId: string;
}

// =================================================================================================
// 2. COMPOSANT MAÎTRE (Layout & Navigation HSE Connectée)
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
      fetchCurrentTeamWithHabilitations(activeChantierId);
    }
  }, [activeChantierId]);

  async function fetchGlobalData() {
    setLoading(true);
    try {
      // 1. Chantiers réels
      const { data: chs } = await supabase.from('chantiers').select('*');
      if (chs) setChantiers(chs);

      // 2. Employés réels avec habilitations
      const { data: emps } = await supabase.from('employes').select('*, habilitations(*)');
      if (emps) setUsers(emps as any);

      // 3. Matériel réel
      const { data: mats } = await supabase.from('materiel').select('*');
      if (mats) setMateriel(mats);
    } catch (e) {
      console.error("Erreur de synchro HSE:", e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCurrentTeamWithHabilitations(chantierId: string) {
    // Jointure dynamique avec le planning pour savoir qui est sur place
    const { data: planning } = await supabase
      .from('planning')
      .select('*, employes(*, habilitations(*))')
      .eq('chantier_id', chantierId);
    
    if (planning) {
      const team = planning.map((p: any) => p.employes);
      // On retire les doublons éventuels
      const uniqueTeam = team.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
      setActiveEquipe(uniqueTeam as any);
    }
  }

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 text-gray-500">
      <div className="animate-spin mb-4"><ShieldCheck size={48} className="text-red-600"/></div>
      <p className="font-bold text-lg animate-pulse uppercase tracking-widest text-center">Initialisation Altrad HSE Suite...<br/><span className="text-[10px] opacity-50 tracking-normal italic">Vérification des habilitations et du registre matériel</span></p>
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
            <p className="text-xs text-gray-400 font-medium mt-1 uppercase">Pilotage de la performance sécurité</p>
          </div>

          {activeChantier && (
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs font-bold text-gray-900">{activeChantier.client}</p>
                <div className="flex items-center gap-1 justify-end text-xs text-gray-500 italic font-medium">
                  <MapPin size={12}/> {activeChantier.adresse}
                </div>
              </div>
              <div className="h-10 w-10 bg-red-600 rounded-full flex items-center justify-center border-2 border-white shadow-xl">
                <span className="font-bold text-xs text-white uppercase">{activeChantier.nom.substring(0,2)}</span>
              </div>
            </div>
          )}
        </header>

        {/* CONTENU SCROLLABLE */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
          
          {/* EMPTY STATE (Si aucun chantier sélectionné) */}
          {!activeChantierId && view !== 'dashboard' && view !== 'history' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40 select-none pointer-events-none text-center p-10 animate-in fade-in">
              <HardHat size={80} className="mb-6 text-gray-300 mx-auto"/>
              <h3 className="text-2xl font-black text-gray-400 mb-2 uppercase tracking-tighter italic">Projet Non Identifié</h3>
              <p className="text-gray-400 font-medium max-w-sm mx-auto uppercase text-[10px] tracking-[0.2em] leading-loose">Veuillez sélectionner un projet réel dans le menu de gauche pour charger l'équipe et le matériel associés.</p>
            </div>
          ) : (
            // ROUTEUR DE VUES
            <div className="max-w-7xl mx-auto pb-20">
              {view === 'dashboard' && <DashboardModule chantiers={chantiers} materiel={materiel} />}
              {view === 'generator' && <DocumentGenerator chantier={activeChantier!} equipe={activeEquipe} materiel={activeMateriel} users={users} />}
              {view === 'vgp' && <VGPTracker materiel={activeMateriel} chantierId={activeChantierId} onRefresh={fetchGlobalData} />}
              {view === 'terrain' && <FieldVisits chantier={activeChantier!} equipe={activeEquipe} />}
              {view === 'causerie' && <SafetyTalks chantier={activeChantier!} equipe={activeEquipe} />}
              {view === 'history' && <CauserieArchives chantiers={chantiers} onRefresh={fetchGlobalData} />}
              {view === 'prejob' && <PrejobBriefingModule chantier={activeChantier!} equipe={activeEquipe} animateurId={activeChantier?.responsable_id || ''} />}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// =================================================================================================
// MODULE 1: DASHBOARD (KPI DÉTAILLÉS)
// =================================================================================================
function DashboardModule({ chantiers, materiel }: { chantiers: IChantier[], materiel: IMateriel[] }) {
  const vgpPerimees = materiel.filter(m => {
    const freq = VGP_RULES[m.categorie as keyof typeof VGP_RULES] || 12;
    const lastDate = new Date(m.derniere_vgp);
    const nextDate = new Date(lastDate.setMonth(lastDate.getMonth() + freq));
    return nextDate < new Date();
  }).length;

  const chartData = [{n:'Jan', v:4.2}, {n:'Fev', v:3.8}, {n:'Mar', v:2.1}, {n:'Avr', v:1.5}, {n:'Mai', v:0.9}];
  const pieData = [
    {name: 'VGP Conformes', value: Math.max(0, materiel.length - vgpPerimees), color: '#10b981'}, 
    {name: 'VGP Périmées', value: vgpPerimees, color: '#ef4444'}
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <StatCard label="Indice TF" val="2.1" sub="-0.5 vs N-1" icon={AlertOctagon} color="blue" />
        <StatCard label="Chantiers Actifs" val={chantiers.length} sub="Projets en base" icon={HardHat} color="indigo" />
        <StatCard label="Matériel Non Conforme" val={vgpPerimees} sub="Action immédiate" icon={Siren} color={vgpPerimees > 0 ? "red" : "green"} />
        <StatCard label="Performance Briefing" val="98%" sub="Signature Matin" icon={Megaphone} color="orange" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 h-[450px]">
        <div className="lg:col-span-2 bg-white p-10 rounded-[50px] shadow-sm border border-gray-100 flex flex-col transition-all hover:shadow-xl group">
          <h3 className="font-black text-gray-800 mb-8 flex items-center gap-3 uppercase text-sm tracking-widest"><ArrowRight size={18} className="text-red-500 group-hover:translate-x-2 transition-transform"/> Évolution Taux de Fréquence (2026)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
              <XAxis dataKey="n" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
              <RechartsTooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}/>
              <Bar dataKey="v" fill="#ef4444" radius={[8,8,0,0]} barSize={60}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-10 rounded-[50px] shadow-sm border border-gray-100 flex flex-col transition-all hover:shadow-xl">
          <h3 className="font-black text-gray-800 mb-4 flex items-center gap-3 uppercase text-sm tracking-widest">Registre VGP</h3>
          <div className="flex-1 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <RechartsTooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-12">
               <span className="text-5xl font-black text-gray-900 tracking-tighter">{materiel.length > 0 ? (((materiel.length - vgpPerimees)/materiel.length) * 100).toFixed(0) : 100}%</span>
               <span className="text-[10px] uppercase font-black text-gray-400 tracking-[0.3em] mt-1">Conformité VGP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =================================================================================================
// MODULE 2: SUIVI MATÉRIEL (Registre & Planification VGP)
// =================================================================================================
function VGPTracker({ materiel, chantierId, onRefresh }: { materiel: IMateriel[], chantierId: string, onRefresh: () => void }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEquip, setNewEquip] = useState({ libelle: '', type: 'interne', categorie: 'Levage', numero_serie: '', derniere_vgp: '' });
  const [isSaving, setIsSaving] = useState(false);

  // LOGIQUE DE PLANIFICATION : Alerte si échéance < 15 jours
  const getPlanningStatus = (last: string, cat: string) => {
    const freq = VGP_RULES[cat as keyof typeof VGP_RULES] || 12; 
    const lastDate = new Date(last);
    const nextDate = new Date(lastDate.setMonth(lastDate.getMonth() + freq));
    const now = new Date();
    const diffTime = nextDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'EXPIRÉ', color: 'bg-red-600 text-white shadow-red-200', alert: true };
    if (diffDays <= 15) return { label: 'ALERTE 15j', color: 'bg-orange-500 text-white animate-pulse', alert: true };
    return { label: 'VALIDE', color: 'bg-green-50 text-green-700 border-green-200', alert: false };
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
      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      alert("Erreur base de données : " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex justify-between items-end bg-white p-10 rounded-[50px] shadow-sm border border-gray-100 transition-all hover:shadow-md">
        <div>
          <h3 className="text-3xl font-black text-gray-800 uppercase flex items-center gap-4 italic tracking-tighter leading-none">
            <Wrench className="text-red-600" size={32}/> Registre de Sécurité Machine
          </h3>
          <p className="text-gray-400 font-bold mt-2 uppercase text-[10px] tracking-[0.3em] ml-1">Planification des vérifications périodiques Altrad</p>
        </div>
        <div className="flex gap-4">
           <div className="bg-orange-50 p-3 rounded-xl flex items-center gap-3 border border-orange-100 shadow-inner">
              <BellRing className="text-orange-500 animate-bounce" size={18}/>
              <span className="text-[9px] font-black uppercase text-orange-600 italic tracking-widest leading-none">Maintenance</span>
           </div>
           <button onClick={() => setShowAddModal(true)} className="bg-black text-white px-8 py-4 rounded-[25px] text-xs font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-gray-900 flex items-center gap-3">
             <Plus size={20}/> Nouvel Équipement
           </button>
        </div>
      </div>

      <div className="bg-white rounded-[45px] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100/50 text-[11px] font-black text-gray-400 uppercase tracking-[0.4em] border-b-2">
            <tr>
              <th className="p-8">Équipement / Identifiant Unique</th>
              <th className="p-8">Catégorie VGP</th>
              <th className="p-8 text-center">Échéance</th>
              <th className="p-8 text-center">État Réglementaire</th>
              <th className="p-8 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {materiel.map(m => {
              const status = getPlanningStatus(m.derniere_vgp, m.categorie);
              return (
                <tr key={m.id} className={`transition-all ${status.alert ? 'bg-orange-50/20' : 'hover:bg-gray-50/50'}`}>
                  <td className="p-8">
                    <div className="font-black text-gray-800 text-lg uppercase italic tracking-tighter leading-none mb-1">{m.libelle}</div>
                    <div className="text-[10px] text-gray-400 font-black mt-2 tracking-[0.2em] uppercase flex items-center gap-3">
                      S/N: {m.numero_serie} {m.type === 'location' && <span className="bg-purple-100 text-purple-600 px-4 py-1 rounded-[8px] text-[8px] font-black italic border border-purple-200">LOCATION EXTERNE</span>}
                    </div>
                  </td>
                  <td className="p-8">
                    <div className="flex items-center gap-3 font-black text-gray-500">
                       <ShieldCheck size={18} className="text-emerald-500"/>
                       <span className="uppercase text-sm tracking-widest">{m.categorie}</span>
                    </div>
                  </td>
                  <td className="p-8 text-center font-black text-gray-800 text-sm italic">
                    <div className="flex flex-col items-center">
                       <CalendarClock size={22} className="text-gray-300 mb-2 opacity-50"/>
                       {new Date(new Date(m.derniere_vgp).setMonth(new Date(m.derniere_vgp).getMonth() + (VGP_RULES[m.categorie as keyof typeof VGP_RULES] || 12))).toLocaleDateString('fr-FR')}
                    </div>
                  </td>
                  <td className="p-8 text-center">
                    <span className={`px-6 py-3 rounded-full text-[9px] font-black inline-flex items-center gap-3 shadow-sm uppercase italic tracking-widest ${status.color}`}>
                      {status.alert ? <AlertTriangle size={14}/> : <CheckCircle2 size={14}/>}
                      {status.label}
                    </span>
                  </td>
                  <td className="p-8 text-center">
                     <button className="p-4 bg-gray-100 rounded-2xl text-gray-400 hover:text-red-600 transition-all shadow-sm active:scale-90 hover:bg-white hover:shadow-lg">
                        <Printer size={22}/>
                     </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-8 bg-black/70 backdrop-blur-xl animate-in fade-in">
           <div className="bg-white w-full max-w-2xl rounded-[60px] shadow-2xl p-16 animate-in zoom-in-95 border-4 border-white">
              <h2 className="text-3xl font-black uppercase tracking-tighter mb-12 flex items-center gap-6 border-b-4 border-gray-50 pb-8 italic leading-none"><Truck size={48} className="text-red-600"/> ENREGISTRER MACHINE</h2>
              <form onSubmit={handleSaveEquipment} className="space-y-8">
                  <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-6 italic">Libellé Commercial de l'Équipement</label><input required className="w-full p-8 bg-gray-50 border-2 border-gray-100 rounded-[40px] font-black uppercase shadow-inner text-xl outline-none focus:border-red-500 transition-all" value={newEquip.libelle} onChange={e=>setNewEquip({...newEquip, libelle: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-10">
                    <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-6 italic">N° de Série Altrad</label><input required className="w-full p-8 bg-gray-50 border-2 border-gray-100 rounded-[40px] font-black uppercase shadow-inner text-xl outline-none focus:border-red-500 transition-all" value={newEquip.numero_serie} onChange={e=>setNewEquip({...newEquip, numero_serie: e.target.value})} /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-6 italic">Dernière VGP</label><input required type="date" className="w-full p-8 bg-gray-50 border-2 border-gray-100 rounded-[40px] font-black shadow-inner text-xl outline-none focus:border-red-500 transition-all" value={newEquip.derniere_vgp} onChange={e=>setNewEquip({...newEquip, derniere_vgp: e.target.value})} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-12">
                    <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-6 italic">Type de Parc</label><select className="w-full p-8 bg-gray-50 border-2 border-gray-100 rounded-[40px] font-black uppercase shadow-inner cursor-pointer text-lg appearance-none" value={newEquip.type} onChange={e=>setNewEquip({...newEquip, type: e.target.value})}><option value="interne">Altrad Services</option><option value="location">Loueur Externe</option></select></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-6 italic">Périodicité VGP</label><select className="w-full p-8 bg-gray-50 border-2 border-gray-100 rounded-[40px] font-black uppercase shadow-inner cursor-pointer text-lg appearance-none" value={newEquip.categorie} onChange={e=>setNewEquip({...newEquip, categorie: e.target.value})}>{Object.keys(VGP_RULES).map(k=><option key={k} value={k}>{k}</option>)}</select></div>
                  </div>
                  <div className="flex gap-8 pt-10">
                    <button type="button" onClick={()=>setShowAddModal(false)} className="flex-1 p-8 rounded-[40px] font-black uppercase text-gray-300 bg-gray-50 transition-all hover:bg-gray-100 text-lg italic">Annuler</button>
                    <button type="submit" disabled={isSaving} className="flex-[2] p-8 rounded-[40px] font-black uppercase text-white bg-red-600 shadow-2xl shadow-red-200 active:scale-95 transition-all text-xl italic tracking-tighter">Valider l'Affectation au Projet</button>
                  </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}

// =================================================================================================
// MODULE 3: GÉNÉRATEUR INTELLIGENT (Moteurs complets)
// =================================================================================================
function DocumentGenerator({ chantier, equipe, materiel, users }: { chantier: IChantier, equipe: IUser[], materiel: IMateriel[], users: IUser[] }) {
  const [docType, setDocType] = useState<'ppsps'|'modop'|'rex'|'causerie'>('ppsps');
  const [selectedRisks, setSelectedRisks] = useState<string[]>([]);
  const [modopSteps, setModopSteps] = useState([{ phase: "Préparation", risque: "Chute de hauteur", prevention: "Harnais double longe" }]);
  const [secours, setSecours] = useState({ sst: [], hopital: "Hôpital de Lyon (Référencé)", pompier: "18" });

  useEffect(() => {
    const sstMembers = equipe.filter(u => u.habilitations?.some(h => h.libelle.includes("SST"))).map(u => `${u.nom} ${u.prenom}`);
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
        <h3 className="font-black text-gray-700 mb-6 uppercase flex items-center gap-2 tracking-tighter"><FileText size={20}/> Catalogue Documents</h3>
        <div className="space-y-3">
          {['ppsps', 'modop', 'rex', 'causerie'].map((t: any) => (
            <button key={t} onClick={() => setDocType(t as any)} className={`w-full text-left p-4 rounded-xl border-l-4 transition-all font-bold uppercase text-xs ${docType === t ? 'border-red-500 bg-red-50 text-red-700 shadow-md' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>{t}</button>
          ))}
        </div>
        <button onClick={generatePDF} className="mt-auto w-full bg-black text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition-transform active:scale-95">
          <Download size={20}/> TÉLÉCHARGER LE DOCUMENT
        </button>
      </div>
      <div className="col-span-9 bg-white p-8 rounded-2xl shadow-sm border overflow-y-auto">
        <h3 className="text-xl font-black uppercase mb-6 border-b pb-4 tracking-tighter italic">Éditeur Dynamique : {docType.toUpperCase()}</h3>
        <div className="space-y-8 animate-in fade-in">
            <div className="bg-red-50 p-6 rounded-xl border border-red-100">
              <h4 className="font-bold text-red-800 mb-4 flex items-center gap-2"><Siren size={20}/> Secours (Vérification Planning Temps Réel)</h4>
              <div className="flex flex-wrap gap-2">{(secours.sst as any).map((s:string) => (<span key={s} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200 flex items-center gap-1"><CheckCircle2 size={12}/> {s} (SST)</span>))}</div>
              {(secours.sst as any).length === 0 && <p className="text-red-600 text-xs font-black uppercase mt-2 italic flex items-center gap-1"><AlertTriangle size={14}/> Attention : Aucun Sauveteur Secouriste identifié sur site !</p>}
            </div>
            <div>
                <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2 uppercase tracking-widest text-[10px]"><ShieldCheck size={16}/> Analyse des Risques Métier (Base RISK_DB)</h4>
                <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                {RISK_DATABASE.map(r => (
                    <label key={r.id} className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${selectedRisks.includes(r.task) ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                    <input type="checkbox" className="mt-1 w-4 h-4 rounded text-blue-600" checked={selectedRisks.includes(r.task)} onChange={(e) => e.target.checked ? setSelectedRisks([...selectedRisks, r.task]) : setSelectedRisks(selectedRisks.filter(x => x !== r.task))} />
                    <div>
                        <div className="text-xs font-black text-gray-800 uppercase italic leading-tight">{r.task}</div>
                        <div className="text-[9px] text-gray-400 font-black uppercase mt-1 tracking-widest">{r.category}</div>
                    </div>
                    </label>
                ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

// =================================================================================================
// MODULE 4: FIELD VISITS (Audit + Générateur PDF Altrad)
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
      
      doc.setFillColor(33, 37, 41); doc.rect(0, 0, 210, 35, 'F'); doc.setTextColor(255, 255, 255);
      doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.text("RAPPORT D'AUDIT TERRAIN HSE", 105, 15, { align: "center" });
      doc.setFontSize(10); doc.text("ALTRAD SERVICES - DIRECTION PERFORMANCE HSE", 105, 25, { align: "center" });
      doc.setTextColor(0); doc.setFontSize(14); doc.text("1. CONTEXTE PROJET", 15, 50);
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text(`Projet : ${chantier.nom}`, 20, 60); doc.text(`Client : ${chantier.client}`, 20, 67); doc.text(`Lieu : ${chantier.adresse}`, 20, 74);
      doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text("2. DÉTAILS DU CONTRÔLE", 15, 100);
      doc.setFontSize(10); doc.setFillColor(240, 240, 240); doc.rect(15, 105, 180, 50, 'F');
      doc.text(`Type d'inspection : ${visitData.type?.toUpperCase()}`, 20, 115);
      doc.text(`Point de contrôle :`, 20, 131);
      doc.setFont("helvetica", "normal"); doc.text(`${visitData.point_controle}`, 20, 139, { maxWidth: 170 });
      doc.setFont("helvetica", "bold"); doc.text("3. OBSERVATIONS ET ACTIONS", 15, 175);
      doc.setFont("helvetica", "normal"); doc.text(`${visitData.observations || 'N/A'}`, 15, 185, { maxWidth: 180 });
      doc.setFont("helvetica", "bold"); doc.text(`Auditeur Altrad : ${author ? author.prenom + ' ' + author.nom : 'Collaborateur'}`, 15, 230);
      doc.save(`Audit_${visitData.type}_${chantier.nom.substring(0,5)}.pdf`);
    } catch (e) { console.error(e); }
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
          <button key={t.id} onClick={()=>setVisitType(t.id)} className={`px-6 py-5 rounded-2xl font-black uppercase text-xs flex-1 transition-all ${visitType===t.id ? 'bg-black text-white shadow-xl scale-105' : 'bg-white border text-gray-400 hover:bg-gray-50'}`}>{t.l}</button>
        ))}
      </div>

      <div className="lg:col-span-2 bg-white p-8 rounded-[40px] shadow-sm border border-gray-200">
        <h3 className="font-bold text-xl mb-8 flex items-center gap-3 uppercase text-gray-800"><Camera className="text-blue-500" size={24}/> Saisie Terrain : {visitType.toUpperCase()}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Domaine Audit</label><select className="w-full p-4 bg-gray-50 border rounded-2xl text-sm font-black shadow-inner" value={domaine} onChange={e => setDomaine(e.target.value)}><option>Sécurité</option><option>Qualité</option><option>Environnement</option></select></div>
          <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Observateur Autorisé</label><select className="w-full p-4 bg-gray-50 border rounded-2xl text-sm font-black shadow-inner" value={auteurId} onChange={e => setAuteurId(e.target.value)}><option value="">-- Qui audite ? --</option>{equipe.map(u => <option key={u.id} value={u.id}>{u.nom} {u.prenom}</option>)}</select></div>
          <div className="md:col-span-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Point de contrôle (Référentiel Altrad)</label><select className="w-full p-4 bg-gray-50 border rounded-2xl text-sm font-black shadow-inner" value={pointControle} onChange={e => setPointControle(e.target.value)}><option value="">-- Choisir un item --</option>{Q3SRE_REFERENTIAL.points_controle.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
          <div className="md:col-span-2 mt-4">
            <div className="border-2 border-dashed rounded-[30px] h-64 flex flex-col items-center justify-center text-gray-400 bg-gray-50 cursor-pointer overflow-hidden relative group transition-all hover:bg-white hover:border-blue-300 shadow-inner">
              {photo ? <img src={photo} className="w-full h-full object-cover" alt="prevue" /> : (<><Camera size={40} className="mb-2 group-hover:scale-110 transition-transform"/><p className="text-xs font-black uppercase tracking-widest italic">Capture Photo</p></>)}
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" capture="environment" onChange={(e) => { if (e.target.files && e.target.files[0]) setPhoto(URL.createObjectURL(e.target.files[0])); }}/>
            </div>
          </div>
          <div className="md:col-span-2"><textarea className="w-full p-4 bg-gray-50 border rounded-2xl h-24 font-bold text-sm outline-none focus:ring-2 focus:ring-black shadow-inner" value={observations} onChange={e => setObservations(e.target.value)} placeholder="Décrire l'écart ou la bonne pratique observée..."></textarea></div>
        </div>
        <button disabled={isSaving} onClick={handleSaveVisit} className="w-full mt-10 bg-emerald-600 text-white font-black py-6 rounded-3xl shadow-xl hover:bg-emerald-700 flex items-center justify-center gap-3 active:scale-95 transition-all shadow-emerald-200">{isSaving ? <Clock className="animate-spin" /> : <Save />} VALIDER & GÉNÉRER RAPPORT PDF</button>
      </div>

      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-200 h-fit space-y-8">
          <h3 className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mb-6 border-b pb-4 italic text-center">Historique Projet</h3>
          <div className="space-y-6">
              {recentVisits.map(v => (
                  <div key={v.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border hover:shadow-md transition-all group cursor-pointer shadow-sm">
                      <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center font-black text-xs border text-emerald-500 shadow-inner uppercase group-hover:bg-emerald-500 group-hover:text-white transition-all">{v.type}</div>
                      <div className="flex-1 min-w-0"><p className="text-xs font-black text-gray-800 uppercase italic truncate">{v.point_controle}</p><p className="text-[10px] text-gray-400 font-bold mt-0.5 tracking-widest">{new Date(v.date).toLocaleDateString()}</p></div>
                      <button onClick={() => downloadAuditPDF(v)} className="p-2 text-gray-300 hover:text-blue-500 transition-colors"><Printer size={18}/></button>
                  </div>
              ))}
              {recentVisits.length === 0 && <p className="text-center text-gray-300 font-black uppercase text-[9px] py-10 italic tracking-widest">Aucun audit archivé</p>}
          </div>
      </div>
    </div>
  );
}

// =================================================================================================
// MODULE 5: PREJOB BRIEFING (Fidèle à la Fiche REVETEMENT + HABILITATIONS + DEBRIEFING)
// =================================================================================================
function PrejobBriefingModule({ chantier, equipe, animateurId }: PrejobProps) {
  const [step, setStep] = useState(1);
  const [generalInfo, setGeneralInfo] = useState({ zone: '', poste: '' });
  const [checks, setChecks] = useState<any>({});
  const [epi, setEpi] = useState<any>({ "Tenue base": true, "Chaussures montantes": true, "Casque": true });
  
  // LOGIQUE DE DEBRIEFING (Fidèle à la Fiche REVETEMENT Word)
  const [debriefData, setDebriefData] = useState({
    scope_realise: "",
    evenement_secu: false,
    matériel_ko: false,
    zone_rangee: true,
    remontees: ""
  });

  const [isSaving, setIsSaving] = useState(false);
  const sigCanvas = useRef<any>(null);

  // LOGIQUE HABILITATIONS (VÉRIFICATION RÉELLE & BLOCAGE)
  const checkMemberValidity = (user: IUser) => {
    if (!user.habilitations || user.habilitations.length === 0) return { ok: false, msg: "HABILITATIONS ABSENTES" };
    const now = new Date();
    const expired = user.habilitations.filter(h => new Date(h.date_echeance) < now);
    if (expired.length > 0) return { ok: false, msg: `PÉRIMÉ : ${expired[0].libelle}` };
    return { ok: true, msg: "CONFORME" };
  };

  const pointsBriefing = [
    "Zone disponible et dégagée / risques pris en compte", 
    "Vérification absence plomb/amiante",
    "Description travaux / phases critiques identifiées", 
    "Rôle de chacun dans l'équipe défini",
    "Modes de communication définis (verbal/gestuelle)", 
    "Moyens de secours (douche, lave œil) accessibles",
    "Risques des produits (FDS) consultés", 
    "Stockage matériel / tri déchets respectés",
    "Minute d’Arrêt Sécurité (MAS)"
  ];

  const handleArchiveReport = async () => {
    if (!generalInfo.zone || !generalInfo.poste) return alert("Zone et Poste requis.");
    setIsSaving(true);
    try {
      const { error } = await supabase.from('hse_prejob_briefings').insert([{
        chantier_id: chantier.id,
        unite_zone: generalInfo.zone,
        poste_travail: generalInfo.poste,
        nb_personnes: equipe.length,
        briefing_check: checks,
        epi_selection: epi,
        debriefing: debriefData,
        date: new Date().toISOString()
      }]);
      if (error) throw error;
      alert("✅ Rapport Journalier Archivé sur Altrad OS.");
      setStep(1);
    } catch (e: any) { alert(e.message); } finally { setIsSaving(false); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-32">
      <div className="bg-white rounded-[80px] shadow-2xl border-4 border-white overflow-hidden animate-in zoom-in-95">
        
        {/* HEADER DYNAMIQUE SELON ÉTAPE */}
        <div className={`p-20 text-white flex justify-between items-center transition-all duration-1000 ${step === 4 ? 'bg-[#10b981]' : 'bg-[#e21118]'}`}>
          <div>
            <h1 className="text-5xl font-black uppercase italic leading-none tracking-tighter">
              {step === 4 ? 'DEBRIEFING FIN DE POSTE' : 'PREJOB BRIEFING'}
            </h1>
            <p className="font-bold opacity-80 mt-4 uppercase tracking-[0.5em] text-[12px] italic">ACTIVITÉ REVETEMENT - PERFORMANCE HSE</p>
          </div>
          {step === 4 ? <CheckCircle size={100} className="opacity-10" /> : <ClipboardCheck size={100} className="opacity-10" />}
        </div>

        <div className="p-20 space-y-20">
          
          {/* STEP 1 : CONTEXTE & HABILITATIONS */}
          {step === 1 && (
            <div className="space-y-16 animate-in fade-in">
              <div className="grid grid-cols-2 gap-12">
                 <div className="space-y-6"><label className="text-[14px] font-black uppercase text-gray-400 tracking-[0.4em] ml-12 italic">Unité / Zone d'intervention</label><input className="w-full p-10 bg-gray-50 border-4 border-gray-100 rounded-[60px] font-black uppercase shadow-inner text-3xl outline-none focus:border-red-500 transition-all" value={generalInfo.zone} onChange={e=>setGeneralInfo({...generalInfo, zone: e.target.value})} placeholder="Saisir zone..." /></div>
                 <div className="space-y-6"><label className="text-[14px] font-black uppercase text-gray-400 tracking-[0.4em] ml-12 italic">Poste de travail (Scope)</label><input className="w-full p-10 bg-gray-50 border-4 border-gray-100 rounded-[60px] font-black uppercase shadow-inner text-3xl outline-none focus:border-red-500 transition-all" value={generalInfo.poste} onChange={e=>setGeneralInfo({...generalInfo, poste: e.target.value})} placeholder="Détail poste..." /></div>
              </div>
              
              <div className="bg-red-50 p-16 rounded-[80px] border-4 border-red-100 shadow-inner">
                 <h3 className="font-black text-red-900 uppercase mb-12 flex items-center gap-8 text-3xl tracking-tighter italic border-b-4 border-red-200/50 pb-8"><Users size={56}/> CONTRÔLE HABILITATIONS ÉQUIPE</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {equipe.map(m => {
                      const status = checkMemberValidity(m);
                      return (
                        <div key={m.id} className={`p-10 rounded-[70px] border-4 flex items-center justify-between transition-all shadow-xl bg-white group hover:scale-[1.02] ${status.ok ? 'border-gray-50' : 'border-red-500 ring-8 ring-red-500/10 animate-pulse'}`}>
                           <div className="flex items-center gap-10">
                             <div className={`h-20 w-20 rounded-3xl flex items-center justify-center font-black text-4xl shadow-inner ${status.ok ? 'bg-emerald-100 text-emerald-600' : 'bg-red-200 text-red-700'}`}>{m.nom[0]}</div>
                             <div>
                                <p className="font-black text-2xl uppercase tracking-tighter italic leading-none">{m.nom} {m.prenom}</p>
                                <p className={`text-xs font-black uppercase tracking-[0.3em] mt-5 px-5 py-2 rounded-full inline-block shadow-sm ${status.ok ? 'bg-emerald-50 text-emerald-500' : 'bg-red-100 text-red-700 border border-red-200'}`}>{status.msg}</p>
                             </div>
                           </div>
                           {!status.ok && <ShieldAlert className="text-red-600" size={48}/>}
                        </div>
                      )
                    })}
                 </div>
              </div>
              <button onClick={()=>setStep(2)} className="w-full bg-black text-white py-12 rounded-[70px] font-black uppercase shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] flex items-center justify-center gap-10 hover:scale-[1.02] transition-all hover:bg-gray-900 active:scale-95 text-4xl tracking-tighter italic leading-none">DÉBUTER LE BRIEFING SÉCURITÉ <ArrowRight size={56}/></button>
            </div>
          )}

          {/* ÉTAPE 4 : DEBRIEFING (Logiciel Fin de Poste) */}
          {step === 4 && (
            <div className="space-y-20 animate-in slide-in-from-right-10">
               <h3 className="text-4xl font-black uppercase text-emerald-900 italic tracking-tighter border-b-8 border-emerald-100 pb-10 flex items-center gap-8"><ListChecks size={56}/> CONTRÔLE DE FIN DE POSTE</h3>
               
               <div className="space-y-10">
                  <label className="text-[14px] font-black uppercase text-gray-400 tracking-[0.5em] ml-16 italic">Avancement du scope et remarques de production</label>
                  <textarea 
                    className="w-full p-16 bg-gray-50 border-4 border-gray-100 rounded-[100px] text-3xl font-bold shadow-inner outline-none focus:border-emerald-500 h-96 transition-all italic leading-relaxed" 
                    value={debriefData.scope_realise}
                    onChange={e => setDebriefData({...debriefData, scope_realise: e.target.value})}
                    placeholder="Quels sont les points marquants de la journée ?..."
                  ></textarea>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  {[
                    {label: "Évènement sécurité survenu même mineur ?", key: "evenement_secu", icon: ShieldAlert},
                    {label: "Problématique rencontrée matériel ?", key: "matériel_ko", icon: Wrench},
                    {label: "Zone rangée et déchets évacués ?", key: "zone_rangee", icon: Truck},
                    {label: "Remontées terrain des opérateurs ?", key: "remontees", icon: MessageSquare}
                  ].map(item => (
                    <div key={item.key} className="bg-white p-12 rounded-[70px] border-4 border-gray-50 shadow-2xl flex items-center justify-between group hover:border-emerald-300 transition-all hover:scale-[1.02]">
                       <div className="flex items-center gap-6 max-w-[65%]">
                          <div className="p-5 bg-gray-100 rounded-3xl group-hover:bg-emerald-100 transition-colors"><item.icon size={32} className="text-gray-400 group-hover:text-emerald-600"/></div>
                          <span className="text-xl font-black uppercase text-gray-700 leading-tight italic tracking-tighter">{item.label}</span>
                       </div>
                       <div className="flex gap-4">
                          <button 
                            onClick={() => setDebriefData({...debriefData, [item.key]: false})}
                            className={`px-10 py-5 rounded-[25px] font-black text-xl uppercase transition-all shadow-md ${!debriefData[item.key as keyof typeof debriefData] ? 'bg-red-500 text-white scale-110 shadow-red-200' : 'bg-gray-100 text-gray-300'}`}
                          >NON</button>
                          <button 
                            onClick={() => setDebriefData({...debriefData, [item.key]: true})}
                            className={`px-10 py-5 rounded-[25px] font-black text-xl uppercase transition-all shadow-md ${debriefData[item.key as keyof typeof debriefData] ? 'bg-emerald-500 text-white scale-110 shadow-emerald-200' : 'bg-gray-100 text-gray-300'}`}
                          >OUI</button>
                       </div>
                    </div>
                  ))}
               </div>

               <div className="flex gap-12 pt-20">
                  <button onClick={()=>setStep(3)} className="flex-1 bg-gray-100 text-gray-300 py-12 rounded-[70px] font-black uppercase text-3xl transition-all hover:bg-gray-200 active:scale-95 shadow-inner leading-none tracking-tighter">RETOUR SIGNATURES</button>
                  <button disabled={isSaving} onClick={handleArchiveReport} className="flex-[3] bg-[#10b981] text-white py-12 rounded-[70px] font-black uppercase shadow-[0_50px_100px_-20px_rgba(16,185,129,0.5)] flex items-center justify-center gap-12 text-4xl hover:bg-black transition-all active:scale-95 disabled:opacity-50 tracking-[0.1em] italic leading-none shadow-emerald-200">
                    {isSaving ? <Clock className="animate-spin" size={64}/> : <Save size={72} />} TRANSMETTRE & CLÔTURER
                  </button>
               </div>
            </div>
          )}

          {/* ÉTAPES 2 & 3 MAINTENUES */}
          {step === 3 && (
            <div className="space-y-20 animate-in slide-in-from-right-10">
               <div className="bg-yellow-50 p-20 rounded-[100px] border-4 border-yellow-200 shadow-inner relative overflow-hidden">
                  <PenTool className="absolute -right-40 -bottom-40 text-yellow-100 size-[800px] opacity-40 -rotate-12" />
                  <h4 className="font-black uppercase text-yellow-900 mb-12 flex items-center gap-10 relative z-10 tracking-tighter text-6xl italic leading-none"><PenTool size={80}/> ÉMARGEMENT ÉQUIPE</h4>
                  <div className="space-y-16 relative z-10">
                    {equipe.map(membre => {
                      const status = checkMemberValidity(membre);
                      return (
                        <div key={membre.id} className={`bg-white p-12 rounded-[90px] border-4 flex flex-col md:flex-row items-center justify-between gap-16 shadow-2xl transition-all ${status.ok ? 'border-yellow-200 hover:border-yellow-400' : 'border-red-600 bg-red-50 grayscale'}`}>
                           <div className="flex items-center gap-10">
                              <div className={`h-32 w-32 rounded-[45px] flex items-center justify-center font-black text-6xl shadow-inner border-8 border-white ${status.ok ? 'bg-yellow-100 text-yellow-600' : 'bg-red-200 text-red-700'}`}>{membre.nom[0]}</div>
                              <div><h3 className="font-black text-5xl uppercase tracking-tighter italic leading-none mb-4">{membre.nom} {membre.prenom}</h3><p className="text-sm font-black text-gray-300 uppercase tracking-[0.6em] italic">Identity Digital Verified</p></div>
                           </div>
                           {status.ok ? (
                              <div className="bg-gray-100 rounded-[70px] h-[350px] w-full md:w-[800px] border-8 border-dashed border-gray-200 relative overflow-hidden group shadow-inner transition-all hover:bg-white hover:border-yellow-300">
                                 <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-gray-300 pointer-events-none uppercase tracking-[3em] opacity-40">Signature Tactile ici</div>
                                 <SignatureCanvas ref={sigCanvas} penColor='black' canvasProps={{width: 800, height: 350, className: 'sigCanvas'}} />
                                 <button onClick={()=>sigCanvas.current.clear()} className="absolute bottom-12 right-12 p-10 bg-white rounded-[40px] text-gray-300 hover:text-red-600 shadow-2xl transition-all hover:scale-110 active:scale-90 border-4 border-gray-50 shadow-black/20"><Trash2 size={48}/></button>
                              </div>
                           ) : (
                             <div className="bg-red-100 p-24 rounded-[80px] w-full md:w-[800px] text-center shadow-inner border-8 border-white"><Lock className="mx-auto mb-10 text-red-600" size={100}/><h2 className="text-4xl font-black text-red-900 uppercase italic mb-4">SIGNATURE INTERDITE</h2><p className="font-black text-red-600 uppercase tracking-widest text-xl bg-white px-8 py-4 rounded-full shadow-sm">{status.msg}</p></div>
                           )}
                        </div>
                      )
                    })}
                  </div>
               </div>
               <div className="flex gap-12">
                  <button onClick={()=>setStep(2)} className="flex-1 bg-gray-50 text-gray-300 py-12 rounded-[70px] font-black uppercase text-2xl shadow-inner active:scale-95 transition-all">Retour Checklist</button>
                  <button onClick={()=>setStep(4)} className="flex-[3] bg-black text-white py-12 rounded-[70px] font-black uppercase shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] flex items-center justify-center gap-12 text-5xl hover:bg-[#10b981] transition-all active:scale-95 italic leading-none tracking-tighter shadow-black/40">PASSER AU DÉBRIEFING FINAL <ChevronRight size={64}/></button>
               </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-16 animate-in slide-in-from-right-10">
               <h3 className="text-4xl font-black uppercase text-gray-800 border-b-[12px] border-orange-100 pb-10 italic tracking-tighter leading-none">Vérifications de Sécurité (Briefing)</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {pointsBriefing.map(p => (
                    <label key={p} className={`flex items-center justify-between p-12 rounded-[70px] border-4 transition-all cursor-pointer shadow-xl ${checks[p] ? 'bg-emerald-50 border-emerald-500 scale-[0.98] shadow-inner' : 'bg-gray-50 hover:bg-white hover:border-gray-300'}`}>
                       <span className="text-2xl font-black uppercase text-gray-700 leading-tight pr-12 italic tracking-tighter">{p}</span>
                       <input type="checkbox" className="w-16 h-16 rounded-[25px] text-emerald-600 border-gray-300 focus:ring-0 shadow-inner" checked={checks[p] || false} onChange={()=>setChecks({...checks, [p]: !checks[p]})} />
                    </label>
                  ))}
               </div>
               <div className="flex gap-10 pt-16">
                  <button onClick={()=>setStep(1)} className="flex-1 bg-gray-50 text-gray-300 py-12 rounded-[70px] font-black uppercase transition-all hover:bg-gray-100 active:scale-95 shadow-inner text-3xl italic leading-none">Retour Infos</button>
                  <button onClick={()=>setStep(3)} className="flex-[3] bg-black text-white py-12 rounded-[70px] font-black uppercase shadow-2xl flex items-center justify-center gap-12 hover:bg-gray-900 active:scale-95 transition-all text-5xl tracking-tighter italic leading-none">VALIDER POINTS <ArrowRight size={64}/></button>
               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// =================================================================================================
// MODULE 5: ARCHIVES (Consultation & Nettoyage Sécurisé)
// =================================================================================================
function CauserieArchives({ chantiers, onRefresh }: { chantiers: IChantier[], onRefresh: () => void }) {
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
    if (!confirm(`⚠️ SUPPRESSION IRRÉVERSIBLE : Voulez-vous supprimer l'archive "${theme}" du serveur HSE ?`)) return;
    const { error } = await supabase.from('causeries_archives').delete().eq('id', id);
    if (!error) {
      alert("✅ Rapport supprimé définitivement.");
      fetchArchives();
      onRefresh();
    }
  };

  return (
    <div className="space-y-16 animate-in fade-in">
      <div className="bg-white p-16 rounded-[100px] shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-24 border-b-8 border-gray-50 pb-16">
          <h3 className="text-5xl font-black uppercase text-gray-900 flex items-center gap-12 tracking-tighter italic leading-none"><History className="text-red-600" size={72} /> Registre Global HSE Altrad</h3>
          <button onClick={fetchArchives} className="p-10 bg-gray-50 rounded-40px hover:bg-red-50 transition-all shadow-inner"><Clock size={56} className="text-gray-400" /></button>
        </div>
        
        {loading ? (<div className="py-80 text-center font-black text-gray-200 animate-pulse uppercase tracking-[1em] text-4xl italic">Synchronisation Cloud...</div>) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20">
            {archives.map(item => (
              <div key={item.id} className="bg-gray-50 p-20 rounded-[90px] border border-gray-100 hover:border-red-500 hover:shadow-2xl transition-all cursor-pointer group relative shadow-lg">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(item.id, item.theme); }}
                  className="absolute top-12 right-12 p-8 bg-white rounded-full text-gray-200 hover:text-red-600 shadow-2xl opacity-0 group-hover:opacity-100 transition-all active:scale-90 hover:shadow-red-200 border-4 border-gray-50"
                >
                  <Trash2 size={40}/>
                </button>
                <div onClick={() => setSelectedArchive(item)}>
                  <div className="mb-12"><span className="bg-white px-10 py-4 rounded-full text-lg font-black text-gray-400 border-4 border-gray-100 uppercase tracking-widest leading-none">{new Date(item.date).toLocaleDateString('fr-FR')}</span></div>
                  <h4 className="font-black text-gray-800 uppercase text-4xl mb-8 leading-tight h-32 line-clamp-2 italic tracking-tighter">{item.theme}</h4>
                  <p className="text-xl font-black text-red-600 mb-20 tracking-widest uppercase flex items-center gap-6 bg-red-50 p-6 rounded-[30px] w-fit shadow-inner leading-none"><MapPin size={24}/> {item.chantiers?.nom}</p>
                  <div className="flex items-center gap-8 pt-16 border-t-8 border-gray-200">
                    <div className="h-24 w-24 bg-red-100 rounded-[35px] flex items-center justify-center font-black text-5xl text-red-600 border-8 border-red-200 shadow-inner uppercase shadow-red-200/50">{item.animateur?.nom[0]}</div>
                    <div><p className="text-sm font-black text-gray-400 uppercase leading-none mb-3 tracking-[0.2em]">Responsable Altrad</p><p className="text-2xl font-black text-gray-700 uppercase italic leading-none">{item.animateur?.nom}</p></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =================================================================================================
// 6. MODULES SECONDAIRES RESTAURÉS (VMT / CAUSERIES / GENERATOR)
// =================================================================================================

function SafetyTalks({ chantier, equipe }: { chantier: IChantier, equipe: IUser[] }) {
  const [theme, setTheme] = useState("");
  const [notes, setNotes] = useState("");
  const [animateurId, setAnimateurId] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const toggleParticipant = (userId: string) => { setParticipants(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]); };

  const handleArchive = async () => {
    if (!theme || !animateurId) return alert("Thème et animateur requis.");
    setIsSaving(true);
    try {
      const { error } = await supabase.from('causeries_archives').insert([{ chantier_id: chantier.id, animateur_id: animateurId, theme, notes, participants, date: new Date().toISOString() }]);
      if (error) throw error;
      alert("✅ Causerie archivée !");
      setTheme(""); setNotes(""); setParticipants([]);
    } catch (e: any) { alert(e.message); } finally { setIsSaving(false); }
  };

  return (
    <div className="max-w-5xl mx-auto bg-white p-16 rounded-[70px] shadow-2xl border animate-in fade-in border-gray-100">
      <div className="flex justify-between items-start border-b-8 border-gray-50 pb-12 mb-16"><div><h1 className="text-5xl font-black text-gray-900 uppercase flex items-center gap-8 tracking-tighter"><Megaphone className="text-red-600" size={56}/> Causerie Hebdo</h1><p className="text-lg text-gray-400 font-black mt-4 tracking-[0.4em] uppercase">HSE Management Altrad</p></div><div className="text-right text-sm font-black uppercase text-gray-300 italic tracking-widest">Référence : HSE-FORM-042</div></div>
      <div className="grid grid-cols-2 gap-16 mb-16"><div><label className="text-[12px] font-black text-gray-400 uppercase block mb-5 tracking-widest">Thématique Traitée</label><select className="w-full p-8 bg-gray-50 border-4 border-gray-50 rounded-[40px] font-black uppercase text-lg shadow-inner outline-none focus:border-red-500 transition-all cursor-pointer" value={theme} onChange={e => setTheme(e.target.value)}><option value="">-- Sélectionner un thème --</option>{CAUSERIE_THEMES.map(t => <option key={t} value={t}>{t}</option>)}</select></div><div><label className="text-[12px] font-black text-gray-400 uppercase block mb-5 tracking-widest">Animateur Altrad</label><select className="w-full p-8 bg-gray-50 border-4 border-gray-50 rounded-[40px] font-black uppercase text-lg shadow-inner outline-none focus:border-red-500 transition-all cursor-pointer" value={animateurId} onChange={e => setAnimateurId(e.target.value)}><option value="">-- Sélectionner l'animateur --</option>{equipe.map(u => <option key={u.id} value={u.id}>{u.nom} {u.prenom}</option>)}</select></div></div>
      <div className="mb-20"><label className="text-[12px] font-black text-gray-400 uppercase block mb-6 italic tracking-widest">Observations terrain des opérateurs & Points critiques</label><textarea className="w-full p-12 bg-orange-50/20 border-4 border-orange-50 rounded-[60px] text-2xl font-bold h-64 outline-none shadow-inner focus:border-orange-200 transition-all" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Saisir les remarques remontées par l'équipe..."></textarea></div>
      <div className="space-y-12">
        <label className="text-[12px] font-black text-gray-400 uppercase block flex justify-between items-center tracking-widest"><span>Tableau d'Émargement Digitalisé</span><span className="bg-gray-100 px-8 py-3 rounded-full text-gray-500 font-black tracking-[0.2em]">{equipe.length} personnels convoqués</span></label>
        <div className="border-4 border-gray-50 rounded-[60px] overflow-hidden shadow-2xl bg-gray-50/30"><table className="w-full text-left border-collapse"><thead className="bg-gray-100/50 text-[13px] font-black uppercase text-gray-400"><tr><th className="p-10">Intervenant Altrad</th><th className="p-10 text-center">Engagement & Signature</th></tr></thead><tbody className="bg-white">{equipe.map(u => (<tr key={u.id} className="border-b-4 border-gray-50 last:border-0 hover:bg-red-50 transition-all group"><td className="p-10 flex items-center gap-8"><div className="h-20 w-20 bg-gray-100 rounded-[25px] flex items-center justify-center font-black text-2xl group-hover:bg-red-600 group-hover:text-white group-hover:rotate-12 transition-all uppercase shadow-inner">{u.nom[0]}{u.prenom[0]}</div><div className="font-black text-3xl italic uppercase tracking-tighter text-gray-800">{u.nom} {u.prenom}</div></td><td className="p-10 text-center"><input type="checkbox" className="w-12 h-12 rounded-[15px] text-red-600 border-4 border-gray-100 shadow-inner focus:ring-0 cursor-pointer hover:scale-110 transition-transform" checked={participants.includes(u.id)} onChange={() => toggleParticipant(u.id)} /></td></tr>))}</tbody></table></div>
      </div>
      <div className="mt-24 flex justify-end pt-16 border-t-8 border-gray-50"><button onClick={handleArchive} disabled={isSaving} className="bg-red-600 text-white px-24 py-10 rounded-[50px] font-black uppercase hover:bg-black transition-all shadow-2xl flex items-center gap-8 text-2xl active:scale-95 shadow-red-200">{isSaving ? <Clock className="animate-spin" size={40}/> : <Save size={44}/>} Finaliser l'Archivage de la Séance HSE</button></div>
    </div>
  );
}

function FieldVisits({ chantier, equipe }: { chantier: IChantier, equipe: IUser[] }) {
  return <div className="p-80 text-center bg-white rounded-[150px] border-8 border-dashed border-gray-100 text-gray-200 font-black uppercase italic text-4xl tracking-[1em] shadow-inner animate-pulse">AUDITS TERRAIN VMT & Q3SRE</div>;
}

// --- UTILS UI MASSIFS ---

const NavBtn = ({id, icon: Icon, label, active, set, disabled}: any) => (
  <button 
    onClick={() => !disabled && set(id)} 
    disabled={disabled}
    className={`w-full flex items-center gap-8 px-10 py-10 rounded-[50px] text-[13px] font-black uppercase transition-all 
      ${active === id ? 'bg-red-50 text-red-600 shadow-2xl ring-8 ring-red-500/5 scale-105 translate-x-6' : 'text-gray-400 hover:bg-gray-50 hover:text-black hover:translate-x-4'} 
      ${disabled ? 'opacity-30 cursor-not-allowed grayscale' : 'active:scale-90'}`}
  >
    <div className={`p-5 rounded-[25px] ${active === id ? 'bg-red-600 text-white rotate-12 shadow-2xl shadow-red-300' : 'bg-gray-50 text-gray-400 shadow-inner'}`}><Icon size={40} /></div> {label}
  </button>
);

const StatCard = ({ label, val, sub, icon: Icon, color }: any) => {
  const themes:any = { red: "bg-red-50 text-red-600 shadow-red-50", blue: "bg-blue-50 text-blue-600 shadow-blue-50", green: "bg-emerald-50 text-emerald-600 shadow-emerald-50", indigo: "bg-indigo-50 text-indigo-600 shadow-indigo-50", orange: "bg-orange-50 text-orange-600 shadow-orange-50" };
  return (
    <div className={`p-16 rounded-[80px] border-4 flex items-start justify-between bg-white shadow-lg hover:shadow-2xl transition-all cursor-default group ${themes[color].split(' ')[2]}`}>
      <div>
        <p className="text-sm font-black uppercase opacity-60 tracking-[0.5em] text-gray-500 mb-8 leading-none italic">{label}</p>
        <p className="text-8xl font-black text-gray-900 tracking-[-0.08em] leading-none group-hover:scale-110 transition-transform origin-left">{val}</p>
        <p className={`text-sm font-black mt-12 uppercase ${themes[color].split(' ')[1]} tracking-[0.3em] flex items-center gap-6 bg-white/80 px-8 py-3 rounded-full w-fit shadow-sm italic`}><Clock size={20}/> {sub}</p>
      </div>
      <div className={`p-12 rounded-[50px] shadow-2xl transition-all group-hover:rotate-[25deg] ${themes[color].split(' ').slice(0,2).join(' ')} shadow-inner border-8 border-white`}><Icon size={80}/></div>
    </div>
  )
};
