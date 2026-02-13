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

// Imports des référentiels HSE Altrad
import { 
  RISK_DATABASE, 
  VGP_RULES, 
  EQUIPMENT_TYPES, 
  Q3SRE_REFERENTIAL, 
  OST_THEMES, 
  CAUSERIE_THEMES 
} from '@/app/hse/data';

// =================================================================================================
// 1. DÉFINITION DES TYPES & INTERFACES (Architecture Altrad OS v3.2)
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
  habilitations: IHabilitation[]; 
  chantier_affecte_id?: string;
}

interface IMateriel {
  id: string;
  libelle: string;
  type: string; 
  categorie: string; 
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

interface PrejobProps {
  chantier: IChantier;
  equipe: IUser[];
  animateurId: string;
}

// =================================================================================================
// 2. COMPOSANT MAÎTRE (Router de Navigation HSE)
// =================================================================================================

export default function HSEUltimateModule() {
  // --- ÉTATS DE NAVIGATION ---
  const [view, setView] = useState<'dashboard'|'generator'|'vgp'|'terrain'|'causerie'|'history'|'prejob'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [activeChantierId, setActiveChantierId] = useState<string>("");

  // --- DATA STORES ---
  const [chantiers, setChantiers] = useState<IChantier[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [materiel, setMateriel] = useState<IMateriel[]>([]);
  const [activeEquipe, setActiveEquipe] = useState<IUser[]>([]);

  // --- CHARGEMENT INITIAL ---
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const { data: chs } = await supabase.from('chantiers').select('*');
        if (chs) setChantiers(chs);
        const { data: emps } = await supabase.from('employes').select('*, habilitations(*)');
        if (emps) setUsers(emps as any);
        const { data: mats } = await supabase.from('materiel').select('*');
        if (mats) setMateriel(mats);
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
    };
    init();
  }, []);

  // --- MISE À JOUR ÉQUIPE DYNAMIQUE ---
  useEffect(() => {
    if (activeChantierId) {
      const fetchTeam = async () => {
        const { data: planning } = await supabase
          .from('planning')
          .select('*, employes(*, habilitations(*))')
          .eq('chantier_id', activeChantierId);
        if (planning) {
          const team = planning.map((p: any) => p.employes);
          setActiveEquipe(team.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i) as any);
        }
      };
      fetchTeam();
    }
  }, [activeChantierId]);

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50">
      <div className="animate-spin mb-4 text-red-600"><ShieldCheck size={48}/></div>
      <p className="font-black text-lg animate-pulse uppercase tracking-widest text-gray-400">Altrad OS HSE Sync...</p>
    </div>
  );

  const activeChantier = chantiers.find(c => c.id === activeChantierId);
  const activeMateriel = materiel.filter(m => m.chantier_actuel_id === activeChantierId);

  return (
    <div className="flex min-h-screen bg-[#f3f4f6] font-sans text-gray-800">
      
      {/* SIDEBAR NAVIGATION (Adaptée ordinateur) */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 z-50 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-black uppercase text-gray-900 leading-none italic tracking-tighter">ALTRAD<span className="text-red-600">.OS</span></h1>
          <p className="text-[9px] font-bold text-gray-400 tracking-[0.2em] mt-1 uppercase leading-none">Intelligence Suite v3.2</p>
        </div>

        <div className="p-4 bg-gray-50/50 border-b border-gray-100">
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block flex items-center gap-1">
            <Factory size={10}/> Projet en cours
          </label>
          <select 
            className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-black text-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-red-500/20 transition-all"
            value={activeChantierId}
            onChange={(e) => setActiveChantierId(e.target.value)}
          >
            <option value="">-- CHOISIR --</option>
            {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          <NavBtn id="dashboard" icon={LayoutDashboard} label="Tableau de Bord" active={view} set={setView} />
          <div className="pt-6 pb-1 px-3"><p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Terrain</p></div>
          <NavBtn id="prejob" icon={ClipboardCheck} label="Prejob & Fin Poste" active={view} set={setView} disabled={!activeChantierId} />
          <NavBtn id="terrain" icon={Camera} label="Visites VMT / Q3SRE" active={view} set={setView} disabled={!activeChantierId} />
          <NavBtn id="causerie" icon={Megaphone} label="Causeries Sécurité" active={view} set={setView} disabled={!activeChantierId} />
          <div className="pt-6 pb-1 px-3"><p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Technique</p></div>
          <NavBtn id="vgp" icon={Wrench} label="Registre Matériel" active={view} set={setView} disabled={!activeChantierId} />
          <NavBtn id="generator" icon={FileText} label="Générateur PPSPS" active={view} set={setView} disabled={!activeChantierId} />
          <NavBtn id="history" icon={History} label="Archives HSE" active={view} set={setView} />
        </nav>

        <div className="p-6 border-t border-gray-100 text-center">
          <p className="text-[9px] text-gray-300 font-bold uppercase tracking-widest italic leading-relaxed">© 2026 Altrad Services Sud-Est</p>
        </div>
      </aside>

      <main className="flex-1 h-screen overflow-hidden flex flex-col relative bg-[#f8f9fa]">
        
        {/* HEADER CONTEXTUEL RÉDUIT POUR PC */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0 shadow-sm z-40">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-3 text-gray-900 leading-none">
              {view === 'prejob' && <ClipboardCheck className="text-red-600" size={22}/>}
              {view.replace('_', ' ')}
            </h2>
          </div>

          {activeChantier && (
            <div className="flex items-center gap-6 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 shadow-inner">
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-900 uppercase leading-none mb-1">{activeChantier.client}</p>
                <div className="flex items-center gap-1 justify-end text-[9px] text-gray-400 font-bold italic leading-none">
                  <MapPin size={10}/> {activeChantier.adresse}
                </div>
              </div>
              <div className="h-8 w-8 bg-red-600 rounded-full flex items-center justify-center border-2 border-white shadow-lg text-white font-black text-[10px] uppercase">
                {activeChantier.nom.substring(0,2)}
              </div>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto pb-20">
              {view === 'dashboard' && <DashboardModule chantiers={chantiers} materiel={materiel} />}
              {view === 'prejob' && <PrejobBriefingModule chantier={activeChantier!} equipe={activeEquipe} animateurId={activeChantier?.responsable_id || ''} />}
              {view === 'terrain' && <FieldVisits chantier={activeChantier!} equipe={activeEquipe} />}
              {view === 'causerie' && <SafetyTalks chantier={activeChantier!} equipe={activeEquipe} />}
              {view === 'vgp' && <VGPTracker materiel={activeMateriel} chantierId={activeChantierId} onRefresh={fetchGlobalData} />}
              {view === 'generator' && <DocumentGenerator chantier={activeChantier!} equipe={activeEquipe} materiel={activeMateriel} users={users} />}
              {view === 'history' && <CauserieArchives chantiers={chantiers} onRefresh={fetchGlobalData} />}
          </div>
        </div>
      </main>
    </div>
  );
}

// =================================================================================================
// MODULE 1: DASHBOARD (Affichage PC Optimisé)
// =================================================================================================
function DashboardModule({ chantiers, materiel }: { chantiers: IChantier[], materiel: IMateriel[] }) {
  const vgpPerimees = materiel.filter(m => {
    const freq = VGP_RULES[m.categorie as keyof typeof VGP_RULES] || 12;
    const lastDate = new Date(m.derniere_vgp);
    const nextDate = new Date(lastDate.setMonth(lastDate.getMonth() + freq));
    return nextDate < new Date();
  }).length;

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Taux TF" val="2.1" sub="-0.5" icon={AlertOctagon} color="blue" />
        <StatCard label="Chantiers" val={chantiers.length} sub="Actifs" icon={HardHat} color="indigo" />
        <StatCard label="Alertes VGP" val={vgpPerimees} sub="Critique" icon={Siren} color="red" />
        <StatCard label="Briefing" val="98%" sub="Signature" icon={Megaphone} color="orange" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[350px]">
        <div className="lg:col-span-2 bg-white p-8 rounded-[30px] shadow-sm border border-gray-100 flex flex-col">
          <h3 className="font-black text-gray-800 mb-6 flex items-center gap-3 uppercase text-[10px] tracking-widest leading-none"><ArrowRight size={14} className="text-red-500"/> Évolution Taux de Fréquence 2026</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[{n:'Jan', v:4.2}, {n:'Fev', v:3.8}, {n:'Mar', v:2.1}, {n:'Avr', v:1.5}]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
              <XAxis dataKey="n" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
              <RechartsTooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}/>
              <Bar dataKey="v" fill="#ef4444" radius={[6,6,0,0]} barSize={40}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-8 rounded-[30px] shadow-sm border border-gray-100 flex flex-col items-center justify-center relative overflow-hidden">
           <h3 className="font-black text-gray-800 mb-4 uppercase text-[10px] tracking-widest absolute top-8 left-8 italic opacity-40">Registre VGP</h3>
           <div className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[{name:'OK', v:materiel.length - vgpPerimees}, {name:'KO', v:vgpPerimees}]} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="v">
                  <Cell fill="#10b981" /><Cell fill="#ef4444" />
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pb-6">
               <span className="text-4xl font-black text-gray-900 tracking-tighter">{materiel.length > 0 ? (((materiel.length - vgpPerimees)/materiel.length) * 100).toFixed(0) : 100}%</span>
               <span className="text-[8px] uppercase font-black text-gray-400">Conformité</span>
            </div>
           </div>
        </div>
      </div>
    </div>
  );
}

// =================================================================================================
// MODULE 2: SUIVI MATÉRIEL & VGP (Planification & Alertes PC)
// =================================================================================================
function VGPTracker({ materiel, chantierId, onRefresh }: { materiel: IMateriel[], chantierId: string, onRefresh: () => void }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEquip, setNewEquip] = useState({ libelle: '', type: 'interne', categorie: 'Levage', numero_serie: '', derniere_vgp: '' });
  const [isSaving, setIsSaving] = useState(false);

  const getPlanningStatus = (last: string, cat: string) => {
    const freq = VGP_RULES[cat as keyof typeof VGP_RULES] || 12; 
    const lastDate = new Date(last);
    const nextDate = new Date(lastDate.setMonth(lastDate.getMonth() + freq));
    const now = new Date();
    const diffDays = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'EXPIRÉ', color: 'bg-red-600 text-white', alert: true };
    if (diffDays <= 15) return { label: 'ALERTE 15j', color: 'bg-orange-500 text-white animate-pulse', alert: true };
    return { label: 'VALIDE', color: 'bg-emerald-500 text-white', alert: false };
  };

  const handleSaveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase.from('materiel').insert([{ ...newEquip, chantier_actuel_id: chantierId, statut: 'operationnel' }]);
      if (error) throw error;
      setShowAddModal(false); onRefresh();
    } catch (err: any) { alert(err.message); } finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-end bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h3 className="text-xl font-black text-gray-800 uppercase flex items-center gap-3 italic leading-none">
            <Wrench className="text-red-600" size={24}/> Sécurité Machine
          </h3>
          <p className="text-gray-400 font-bold mt-1.5 uppercase text-[9px] tracking-[0.2em]">Registre et planification VGP</p>
        </div>
        <div className="flex gap-3">
           <div className="bg-orange-50 p-2.5 rounded-xl flex items-center gap-2 border border-orange-100 shadow-inner">
              <BellRing className="text-orange-500 animate-bounce" size={16}/>
              <span className="text-[8px] font-black uppercase text-orange-600 italic leading-none">Alerte Maintenance</span>
           </div>
           <button onClick={() => setShowAddModal(true)} className="bg-black text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all shadow-xl active:scale-95">
             <Plus size={14} className="mr-1 inline"/> Ajouter
           </button>
        </div>
      </div>

      <div className="bg-white rounded-[30px] shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b">
            <tr>
              <th className="p-6">Machine / ID</th>
              <th className="p-6">Catégorie</th>
              <th className="p-6 text-center">Échéance</th>
              <th className="p-6 text-center">État Altrad</th>
              <th className="p-6 text-center">Rapport</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {materiel.map(m => {
              const status = getPlanningStatus(m.derniere_vgp, m.categorie);
              return (
                <tr key={m.id} className={`transition-all ${status.alert ? 'bg-orange-50/10' : 'hover:bg-gray-50/50'}`}>
                  <td className="p-6">
                    <div className="font-black text-gray-800 text-sm uppercase italic leading-none mb-1">{m.libelle}</div>
                    <div className="text-[9px] text-gray-400 font-black tracking-widest uppercase flex items-center gap-2">
                      S/N: {m.numero_serie} {m.type === 'location' && <span className="text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded italic">LOUÉ</span>}
                    </div>
                  </td>
                  <td className="p-6"><span className="px-2 py-1 rounded-lg text-[8px] font-black uppercase bg-white border border-gray-100 shadow-sm text-gray-500">{m.categorie}</span></td>
                  <td className="p-6 text-center font-black text-gray-800 text-xs">
                    {new Date(new Date(m.derniere_vgp).setMonth(new Date(m.derniere_vgp).getMonth() + (VGP_RULES[m.categorie as keyof typeof VGP_RULES] || 12))).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="p-6 text-center">
                    <span className={`px-4 py-1.5 rounded-full text-[8px] font-black inline-flex items-center gap-2 shadow-sm ${status.color}`}>
                      {status.alert ? <AlertTriangle size={12}/> : <CheckCircle2 size={12}/>} {status.label}
                    </span>
                  </td>
                  <td className="p-6 text-center"><button className="p-2 bg-gray-50 rounded-lg text-gray-400 hover:text-red-600 transition-all"><Printer size={16}/></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
           <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-10 animate-in zoom-in-95 border-4 border-white">
              <h2 className="text-xl font-black uppercase tracking-tighter mb-8 flex items-center gap-4 border-b pb-4 leading-none"><Truck size={32} className="text-red-600"/> Nouvelle Machine</h2>
              <form onSubmit={handleSaveEquipment} className="space-y-6">
                  <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Libellé</label><input required className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black uppercase text-sm outline-none focus:border-red-500 transition-all" value={newEquip.libelle} onChange={e=>setNewEquip({...newEquip, libelle: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">N° Série</label><input required className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black uppercase text-sm outline-none focus:border-red-500 transition-all" value={newEquip.numero_serie} onChange={e=>setNewEquip({...newEquip, numero_serie: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">VGP</label><input required type="date" className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black text-sm outline-none focus:border-red-500 transition-all" value={newEquip.derniere_vgp} onChange={e=>setNewEquip({...newEquip, derniere_vgp: e.target.value})} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Type</label><select className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black uppercase text-xs appearance-none" value={newEquip.type} onChange={e=>setNewEquip({...newEquip, type: e.target.value})}><option value="interne">Altrad</option><option value="location">Loueur</option></select></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Catégorie</label><select className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black uppercase text-xs appearance-none" value={newEquip.categorie} onChange={e=>setNewEquip({...newEquip, categorie: e.target.value})}>{Object.keys(VGP_RULES).map(k=><option key={k} value={k}>{k}</option>)}</select></div>
                  </div>
                  <div className="flex gap-4 pt-6">
                    <button type="button" onClick={()=>setShowAddModal(false)} className="flex-1 p-4 rounded-2xl font-black uppercase text-gray-400 bg-gray-100 transition-all hover:bg-gray-200">Annuler</button>
                    <button type="submit" disabled={isSaving} className="flex-[2] p-4 rounded-2xl font-black uppercase text-white bg-red-600 shadow-xl active:scale-95 transition-all text-sm italic tracking-tighter">Valider l'Affectation</button>
                  </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}

// =================================================================================================
// MODULE 3: PREJOB BRIEFING & DEBRIEFING (Fidèle REVETEMENT + HABILITATIONS + PC)
// =================================================================================================
function PrejobBriefingModule({ chantier, equipe, animateurId }: PrejobProps) {
  const [step, setStep] = useState(1);
  const [generalInfo, setGeneralInfo] = useState({ zone: '', poste: '' });
  const [checks, setChecks] = useState<any>({});
  const [epi, setEpi] = useState<any>({ "Tenue base": true, "Chaussures": true, "Casque jugulaire": true });
  
  // LOGIQUE DE DEBRIEFING (Correction Schema Cache Supabase)
  const [debriefData, setDebriefData] = useState({
    scope_realise: "",
    evenement_secu: false,
    detail_evenement: "",
    matériel_ko: false,
    zone_rangee: true,
    remontees: ""
  });

  const [isSaving, setIsSaving] = useState(false);
  const sigCanvas = useRef<any>(null);

  const checkMemberValidity = (user: IUser) => {
    if (!user.habilitations || user.habilitations.length === 0) return { ok: false, msg: "ABSENT" };
    const now = new Date();
    const expired = user.habilitations.filter(h => new Date(h.date_echeance) < now);
    if (expired.length > 0) return { ok: false, msg: `EXP : ${expired[0].libelle}` };
    return { ok: true, msg: "OK" };
  };

  const pointsBriefing = [
    "Zone disponible et dégagée / risques pris en compte", "Vérification absence risque plomb/amiante",
    "Description travaux / phases critiques identifiées", "Rôle de chacun dans l'équipe défini",
    "Modes de communication définis (verbal/gestuelle)", "Moyens de secours accessibles (douche, lave œil)",
    "Fiches de données sécurité (FDS) consultées", "Zones de stockage et tri des déchets respectées",
    "Minute d’Arrêt Sécurité (MAS) effectuée"
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
        debriefing: debriefData, // Colonne ajoutée par le script SQL
        date: new Date().toISOString()
      }]);
      if (error) throw error;
      alert("✅ Rapport Journalier Archivé.");
      setStep(1);
    } catch (e: any) { alert("Erreur Archivage : " + e.message); } finally { setIsSaving(false); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-6 pb-20">
      <div className="bg-white rounded-[40px] shadow-2xl border-4 border-white overflow-hidden shadow-black/5">
        
        {/* HEADER RESPONSIVE PC/TABLETTE */}
        <div className={`p-10 text-white flex justify-between items-center transition-all duration-700 ${step === 4 ? 'bg-[#10b981]' : 'bg-[#e21118]'}`}>
          <div>
            <h1 className="text-3xl font-black uppercase italic leading-none tracking-tighter">
              {step === 4 ? 'DEBRIEFING FIN DE POSTE' : 'PREJOB BRIEFING'}
            </h1>
            <p className="font-bold opacity-80 mt-2 uppercase tracking-[0.4em] text-[9px] italic leading-none">ALTRAD SERVICES Sud-Est</p>
          </div>
          {step === 4 ? <CheckCircle size={48} className="opacity-20" /> : <ClipboardCheck size={48} className="opacity-20" />}
        </div>

        <div className="p-10 space-y-12">
          
          {step === 1 && (
            <div className="space-y-12 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-6">Unité / Zone</label><input className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black uppercase shadow-inner text-lg outline-none focus:border-red-500 transition-all italic" value={generalInfo.zone} onChange={e=>setGeneralInfo({...generalInfo, zone: e.target.value})} placeholder="Saisir zone..." /></div>
                 <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-6">Poste / Scope</label><input className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black uppercase shadow-inner text-lg outline-none focus:border-red-500 transition-all italic" value={generalInfo.poste} onChange={e=>setGeneralInfo({...generalInfo, poste: e.target.value})} placeholder="Saisir scope..." /></div>
              </div>
              
              <div className="bg-red-50/50 p-10 rounded-[40px] border border-red-100">
                 <h3 className="font-black text-red-900 uppercase mb-8 flex items-center gap-4 text-lg tracking-tighter italic border-b border-red-200/50 pb-4"><Users size={28}/> HABILITATIONS ÉQUIPE</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {equipe.map(m => {
                      const status = checkMemberValidity(m);
                      return (
                        <div key={m.id} className={`p-6 rounded-2xl border flex items-center justify-between transition-all bg-white group shadow-sm ${status.ok ? 'border-gray-100 hover:border-emerald-300' : 'border-red-500 animate-pulse'}`}>
                           <div className="flex items-center gap-4">
                             <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-lg ${status.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-red-100 text-red-700'}`}>{m.nom[0]}</div>
                             <div>
                                <p className="font-black text-xs uppercase italic leading-none">{m.nom} {m.prenom}</p>
                                <p className={`text-[8px] font-black uppercase tracking-widest mt-1.5 px-2 py-0.5 rounded-full inline-block ${status.ok ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-600'}`}>{status.msg}</p>
                             </div>
                           </div>
                           {!status.ok && <ShieldAlert className="text-red-600" size={18}/>}
                        </div>
                      )
                    })}
                 </div>
              </div>
              <button onClick={()=>setStep(2)} className="w-full bg-black text-white py-6 rounded-3xl font-black uppercase shadow-xl flex items-center justify-center gap-6 hover:scale-[1.01] transition-all hover:bg-gray-900 active:scale-95 text-xl tracking-tighter italic leading-none">Vérifications Sécurité <ArrowRight size={24}/></button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-12 animate-in slide-in-from-right-6">
               <h3 className="text-2xl font-black uppercase text-emerald-900 italic tracking-tighter border-b-4 border-emerald-100 pb-4 flex items-center gap-4"><ListChecks size={32}/> FIN DE POSTE</h3>
               
               <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-6">Commentaires sur l'avancement / Scope réalisé</label>
                  <textarea 
                    className="w-full p-8 bg-gray-50 border-2 border-gray-100 rounded-3xl text-lg font-bold shadow-inner outline-none focus:border-emerald-500 h-48 transition-all italic leading-relaxed" 
                    value={debriefData.scope_realise}
                    onChange={e => setDebriefData({...debriefData, scope_realise: e.target.value})}
                    placeholder="Quels sont les points marquants ?..."
                  ></textarea>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    {label: "Évènement sécurité même mineur ?", key: "evenement_secu", icon: ShieldAlert},
                    {label: "Problématique matériel ?", key: "matériel_ko", icon: Wrench},
                    {label: "Zone rangée et déchets évacués ?", key: "zone_rangee", icon: Truck},
                    {label: "Remontées terrain opérateurs ?", key: "remontees", icon: MessageSquare}
                  ].map(item => (
                    <div key={item.key} className="bg-white p-6 rounded-3xl border-2 border-gray-50 shadow-sm flex items-center justify-between group hover:border-emerald-300 transition-all">
                       <div className="flex items-center gap-4 max-w-[70%]">
                          <div className="p-2.5 bg-gray-100 rounded-xl group-hover:bg-emerald-50 transition-colors"><item.icon size={20} className="text-gray-400 group-hover:text-emerald-600"/></div>
                          <span className="text-xs font-black uppercase text-gray-700 leading-tight italic tracking-tighter">{item.label}</span>
                       </div>
                       <div className="flex gap-3">
                          <button onClick={() => setDebriefData({...debriefData, [item.key]: false})} className={`px-5 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${!debriefData[item.key as keyof typeof debriefData] ? 'bg-red-500 text-white shadow-md' : 'bg-gray-100 text-gray-300'}`}>NON</button>
                          <button onClick={() => setDebriefData({...debriefData, [item.key]: true})} className={`px-5 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${debriefData[item.key as keyof typeof debriefData] ? 'bg-emerald-500 text-white shadow-md' : 'bg-gray-100 text-gray-300'}`}>OUI</button>
                       </div>
                    </div>
                  ))}
               </div>

               <div className="flex gap-6 pt-10">
                  <button onClick={()=>setStep(3)} className="flex-1 bg-gray-50 text-gray-300 py-6 rounded-2xl font-black uppercase text-sm transition-all hover:bg-gray-100">Retour Signatures</button>
                  <button disabled={isSaving} onClick={handleArchiveFullReport} className="flex-[3] bg-[#10b981] text-white py-6 rounded-2xl font-black uppercase shadow-2xl flex items-center justify-center gap-6 text-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50 tracking-tighter italic">
                    {isSaving ? <Clock className="animate-spin" size={24}/> : <Save size={28} />} TRANSMETTRE & ARCHIVER
                  </button>
               </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-12 animate-in slide-in-from-right-6">
               <div className="bg-yellow-50 p-10 rounded-[40px] border border-yellow-200 shadow-inner relative overflow-hidden">
                  <PenTool className="absolute -right-20 -bottom-20 text-yellow-100 size-[300px] opacity-20 -rotate-12" />
                  <h4 className="font-black uppercase text-yellow-900 mb-8 flex items-center gap-6 relative z-10 tracking-tighter text-3xl italic leading-none"><PenTool size={40}/> ÉMARGEMENT TACTILE</h4>
                  <div className="space-y-6 relative z-10">
                    {equipe.map(membre => {
                      const status = checkMemberValidity(membre);
                      return (
                        <div key={membre.id} className={`bg-white p-8 rounded-3xl border-2 flex flex-col md:flex-row items-center justify-between gap-10 shadow-sm transition-all ${status.ok ? 'border-yellow-200' : 'border-red-400 bg-red-50 grayscale'}`}>
                           <div className="flex items-center gap-6">
                              <div className={`h-16 w-16 rounded-2xl flex items-center justify-center font-black text-3xl shadow-inner border-4 border-white ${status.ok ? 'bg-yellow-100 text-yellow-600' : 'bg-red-200 text-red-700'}`}>{membre.nom[0]}</div>
                              <div><h3 className="font-black text-xl uppercase tracking-tighter italic leading-none mb-2">{membre.nom} {membre.prenom}</h3><p className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic leading-none">Altrad Digital Signature</p></div>
                           </div>
                           {status.ok ? (
                              <div className="bg-gray-50 rounded-2xl h-[120px] w-full md:w-[400px] border-4 border-dashed border-gray-200 relative overflow-hidden group shadow-inner">
                                 <SignatureCanvas ref={sigCanvas} penColor='black' canvasProps={{width: 400, height: 120, className: 'sigCanvas'}} />
                                 <button onClick={()=>sigCanvas.current.clear()} className="absolute bottom-4 right-4 p-3 bg-white rounded-xl text-gray-300 hover:text-red-600 shadow-lg border-2 border-gray-50"><Trash2 size={20}/></button>
                              </div>
                           ) : <div className="bg-red-100/50 p-10 rounded-2xl w-full md:w-[400px] text-center border-2 border-red-200 shadow-inner"><Lock className="mx-auto mb-4 text-red-600" size={32}/><p className="font-black text-red-700 uppercase italic text-xs leading-none">SIGNATURE BLOQUÉE : {status.msg}</p></div>}
                        </div>
                      )
                    })}
                  </div>
               </div>
               <div className="flex gap-8">
                  <button onClick={()=>setStep(2)} className="flex-1 bg-gray-50 text-gray-300 py-6 rounded-3xl font-black uppercase text-sm shadow-inner transition-all hover:bg-gray-100">Retour Checklist</button>
                  <button onClick={()=>setStep(4)} className="flex-[3] bg-black text-white py-6 rounded-3xl font-black uppercase shadow-2xl flex items-center justify-center gap-8 text-xl hover:bg-[#10b981] transition-all active:scale-95 italic leading-none tracking-tighter shadow-black/30">PASSER AU DÉBRIEFING FINAL <ChevronRight size={32}/></button>
               </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-12 animate-in slide-in-from-right-6">
               <h3 className="text-2xl font-black uppercase text-gray-800 border-b-8 border-orange-100 pb-6 italic tracking-tighter leading-none">Points à Échanger (Vérifications)</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pointsBriefing.map(p => (
                    <label key={p} className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all cursor-pointer shadow-sm ${checks[p] ? 'bg-emerald-50 border-emerald-500 scale-[0.98]' : 'bg-gray-50 hover:bg-white hover:border-gray-300'}`}>
                       <span className="text-xs font-black uppercase text-gray-700 leading-tight pr-10 italic tracking-tighter">{p}</span>
                       <input type="checkbox" className="w-8 h-8 rounded-xl text-emerald-600 border-gray-300 focus:ring-0 shadow-inner" checked={checks[p] || false} onChange={()=>setChecks({...checks, [p]: !checks[p]})} />
                    </label>
                  ))}
               </div>
               <div className="flex gap-6 pt-10">
                  <button onClick={()=>setStep(1)} className="flex-1 bg-gray-50 text-gray-300 py-6 rounded-3xl font-black uppercase transition-all hover:bg-gray-100 active:scale-95 shadow-inner text-sm italic leading-none">Retour Infos</button>
                  <button onClick={()=>setStep(3)} className="flex-[3] bg-black text-white py-6 rounded-3xl font-black uppercase shadow-2xl flex items-center justify-center gap-6 hover:bg-gray-900 active:scale-95 transition-all text-xl tracking-tighter italic leading-none">Valider Points <ArrowRight size={32}/></button>
               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// =================================================================================================
// MODULE 5: ARCHIVES (Consultation & Nettoyage)
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
    <div className="space-y-10 animate-in fade-in">
      <div className="bg-white p-12 rounded-[50px] shadow-sm border border-gray-100 transition-all hover:shadow-xl group relative">
        <div className="flex justify-between items-center mb-16 border-b-8 border-gray-50 pb-10">
          <h3 className="text-3xl font-black uppercase text-gray-900 flex items-center gap-6 tracking-tighter italic leading-none"><History className="text-red-600" size={56} /> Registre Global HSE</h3>
          <button onClick={fetchArchives} className="p-10 bg-gray-50 rounded-full hover:bg-red-50 transition-all shadow-inner"><Clock size={44} className="text-gray-400" /></button>
        </div>
        
        {loading ? (<div className="py-40 text-center font-black text-gray-200 animate-pulse uppercase tracking-[1em] text-3xl italic">Synchronisation...</div>) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {archives.map(item => (
              <div key={item.id} className="bg-gray-50 p-12 rounded-[55px] border border-gray-100 hover:border-red-500 hover:shadow-2xl transition-all cursor-pointer group relative shadow-md">
                <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id, item.theme); }} className="absolute top-10 right-10 p-4 bg-white rounded-full text-gray-200 hover:text-red-600 shadow-xl opacity-0 group-hover:opacity-100 transition-all border-4 border-gray-50"><Trash2 size={24}/></button>
                <div onClick={() => setSelectedArchive(item)}>
                  <div className="mb-8"><span className="bg-white px-6 py-2.5 rounded-full text-[11px] font-black text-gray-400 border-2 border-gray-100 uppercase tracking-[0.3em]">{new Date(item.date).toLocaleDateString('fr-FR')}</span></div>
                  <h4 className="font-black text-gray-800 uppercase text-2xl mb-4 leading-tight h-20 line-clamp-2 italic tracking-tighter">{item.theme}</h4>
                  <p className="text-sm font-black text-red-600 mb-12 tracking-widest uppercase flex items-center gap-4"><MapPin size={14}/> {item.chantiers?.nom}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- MODULES SECONDAIRES RESTAURÉS (VMT / CAUSERIES / GENERATOR PC) ---
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
    <div className="max-w-5xl mx-auto bg-white p-12 rounded-[50px] shadow-2xl border animate-in fade-in border-gray-100">
      <div className="flex justify-between items-start border-b-4 border-gray-50 pb-8 mb-10"><div><h1 className="text-3xl font-black text-gray-900 uppercase flex items-center gap-5 tracking-tighter"><Megaphone className="text-red-600" size={40}/> Causerie Hebdo</h1><p className="text-xs text-gray-400 font-black mt-2 tracking-widest uppercase">HSE Management Altrad</p></div><div className="text-right text-xs font-black uppercase text-gray-300 italic tracking-widest">HSE-FORM-042</div></div>
      <div className="grid grid-cols-2 gap-10 mb-10"><div><label className="text-[10px] font-black text-gray-400 uppercase block mb-3">Thématique Traitée</label><select className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black uppercase text-xs" value={theme} onChange={e => setTheme(e.target.value)}><option value="">-- Sélectionner un thème --</option>{CAUSERIE_THEMES.map(t => <option key={t} value={t}>{t}</option>)}</select></div><div><label className="text-[10px] font-black text-gray-400 uppercase block mb-3">Animateur Altrad</label><select className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black uppercase text-xs" value={animateurId} onChange={e => setAnimateurId(e.target.value)}><option value="">-- Sélectionner l'animateur --</option>{equipe.map(u => <option key={u.id} value={u.id}>{u.nom} {u.prenom}</option>)}</select></div></div>
      <div className="mb-10"><label className="text-[10px] font-black text-gray-400 uppercase block mb-3 italic tracking-widest">Observations terrain des opérateurs & Points critiques</label><textarea className="w-full p-6 bg-orange-50/20 border-2 border-orange-50 rounded-3xl text-lg font-bold h-48 outline-none shadow-inner transition-all focus:border-orange-200" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Saisir les remarques remontées par l'équipe..."></textarea></div>
      <div><label className="text-[10px] font-black text-gray-400 uppercase mb-6 block flex justify-between items-center tracking-widest"><span>Tableau d'Émargement</span><span className="bg-gray-100 px-4 py-2 rounded-full text-gray-500 font-black tracking-widest">{equipe.length} personnels</span></label><div className="border-4 border-gray-50 rounded-[40px] overflow-hidden shadow-inner"><table className="w-full text-left"><thead className="bg-gray-100/50 text-[10px] font-black uppercase border-b text-gray-400"><tr><th className="p-6 text-xs">Intervenant</th><th className="p-6 text-center text-xs">Signer</th></tr></thead><tbody className="bg-white">{equipe.map(u => (<tr key={u.id} className="border-b-2 border-gray-50 last:border-0 hover:bg-red-50 transition-all group"><td className="p-6 flex items-center gap-6"><div className="h-10 w-10 bg-gray-100 rounded-xl flex items-center justify-center font-black uppercase">{u.nom[0]}{u.prenom[0]}</div><div className="font-black text-lg italic uppercase tracking-tighter text-gray-800">{u.nom} {u.prenom}</div></td><td className="p-6 text-center"><input type="checkbox" className="w-8 h-8 rounded-xl text-red-600 border-2 border-gray-100 focus:ring-0 cursor-pointer" checked={participants.includes(u.id)} onChange={() => toggleParticipant(u.id)} /></td></tr>))}</tbody></table></div></div>
      <div className="mt-16 flex justify-end pt-8 border-t-4 border-gray-50"><button onClick={handleArchive} disabled={isSaving} className="bg-red-600 text-white px-12 py-5 rounded-2xl font-black uppercase hover:bg-black transition-all shadow-xl flex items-center gap-5 text-xl active:scale-95">{isSaving ? <Clock className="animate-spin" /> : <Save size={24}/>} Finaliser l'Archivage HSE</button></div>
    </div>
  );
}

function FieldVisits({ chantier, equipe }: { chantier: IChantier, equipe: IUser[] }) {
  const [pointControle, setPointControle] = useState('');
  const [observations, setObservations] = useState('');
  const [auteurId, setAuteurId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveVisit = async () => {
    if (!pointControle || !auteurId) return alert("Données manquantes.");
    setIsSaving(true);
    const { error } = await supabase.from('visites_terrain').insert([{ chantier_id: chantier.id, point_controle: pointControle, observations, auteur_id: auteurId, date: new Date().toISOString() }]);
    if (!error) { alert("✅ Rapport Transmis !"); setObservations(''); }
    setIsSaving(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in">
      <div className="lg:col-span-2 bg-white p-12 rounded-[50px] shadow-sm border border-gray-100 space-y-12">
        <h3 className="text-3xl font-black mb-10 flex items-center gap-6 uppercase text-gray-800 tracking-tighter leading-none"><Camera className="text-blue-500" size={32}/> Saisie Terrain VMT</h3>
        <div className="space-y-6">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-6 italic">Point de contrôle (Référentiel Altrad)</label>
          <select className="w-full p-6 bg-gray-50 border-2 border-gray-100 rounded-3xl text-xl font-black appearance-none outline-none focus:border-blue-300" value={pointControle} onChange={e => setPointControle(e.target.value)}><option value="">-- Choisir un item --</option>{Q3SRE_REFERENTIAL.points_controle.map(p => <option key={p} value={p}>{p}</option>)}</select>
          <textarea className="w-full p-10 bg-gray-50 border-2 border-gray-100 rounded-[40px] h-64 text-2xl font-bold italic outline-none focus:ring-4 focus:ring-black/5" value={observations} onChange={e => setObservations(e.target.value)} placeholder="Observations et écarts constatés sur zone..."></textarea>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-6 italic">Signataire / Auditeur</label>
          <select className="w-full p-6 bg-gray-50 border-2 border-gray-100 rounded-3xl text-xl font-black appearance-none outline-none focus:border-blue-300" value={auteurId} onChange={e => setAuteurId(e.target.value)}><option value="">-- Qui audite ? --</option>{equipe.map(u => <option key={u.id} value={u.id}>{u.nom} {u.prenom}</option>)}</select>
        </div>
        <button disabled={isSaving} onClick={handleSaveVisit} className="w-full bg-emerald-600 text-white font-black py-8 rounded-[40px] shadow-xl hover:bg-emerald-700 flex items-center justify-center gap-6 text-2xl uppercase tracking-tighter italic">{isSaving ? <Clock className="animate-spin" /> : <Save size={32}/>} ENREGISTRER L'AUDIT</button>
      </div>
      <div className="bg-white p-10 rounded-[50px] shadow-sm border border-gray-100 h-fit text-center space-y-10">
          <HardHat size={120} className="mx-auto text-gray-100"/>
          <p className="font-black text-gray-300 uppercase tracking-[0.3em] text-xs">VMT & Q3SRE Mobile v1.0</p>
      </div>
    </div>
  );
}

// --- UTILS UI ---

const NavBtn = ({id, icon: Icon, label, active, set, disabled}: any) => (
  <button 
    onClick={() => !disabled && set(id)} 
    disabled={disabled}
    className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase transition-all 
      ${active === id ? 'bg-red-50 text-red-600 shadow-sm ring-2 ring-red-500/10' : 'text-gray-400 hover:bg-gray-50 hover:text-black'} 
      ${disabled ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:scale-[1.01] active:scale-95'}`}
  >
    <div className={`p-2 rounded-lg ${active === id ? 'bg-red-600 text-white' : 'bg-gray-50 text-gray-300 shadow-inner'}`}><Icon size={18} /></div> {label}
    {!disabled && active === id && <ChevronRight size={14} className="ml-auto opacity-40 animate-pulse"/>}
  </button>
);

const StatCard = ({ label, val, sub, icon: Icon, color }: any) => {
  const themes:any = { red: "bg-red-50 text-red-600 border-red-100 shadow-red-50", blue: "bg-blue-50 text-blue-600 border-blue-100 shadow-blue-50", green: "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-50", indigo: "bg-indigo-50 text-indigo-600 border-indigo-100 shadow-indigo-50", orange: "bg-orange-50 text-orange-600 border-orange-100 shadow-orange-50" };
  return (
    <div className={`p-8 rounded-[40px] border flex items-start justify-between bg-white shadow-sm hover:shadow-2xl transition-all cursor-default group ${themes[color].split(' ')[2]}`}>
      <div>
        <p className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em] text-gray-500 mb-4 leading-none italic">{label}</p>
        <p className="text-4xl font-black text-gray-900 tracking-[-0.05em] leading-none group-hover:scale-105 transition-transform origin-left">{val}</p>
        <p className={`text-[9px] font-black mt-6 uppercase ${themes[color].split(' ')[1]} tracking-widest flex items-center gap-3 bg-white/50 px-3 py-1 rounded-full italic shadow-sm w-fit leading-none`}><Clock size={12}/> {sub}</p>
      </div>
      <div className={`p-4 rounded-2xl shadow-xl transition-all group-hover:rotate-12 ${themes[color].split(' ').slice(0,2).join(' ')} shadow-inner border-4 border-white`}><Icon size={28}/></div>
    </div>
  )
};
