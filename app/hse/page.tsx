"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // Pour la navigation vers les pages dédiées
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, FileText, Wrench, Camera, Megaphone, 
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Clock, 
  MapPin, User, Users, Calendar, Printer, Save, 
  Plus, Trash2, Search, ArrowRight, Download, Eye,
  AlertOctagon, Siren, HardHat, FileCheck, X, ChevronRight,
  ClipboardList, Stethoscope, Factory, Truck, Edit, History,
  PenTool, QrCode, ExternalLink // Ajout d'icônes
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend 
} from 'recharts';

// Import des données métiers centralisées
import { 
  RISK_DATABASE, VGP_RULES, EQUIPMENT_TYPES, Q3SRE_REFERENTIAL, OST_THEMES, CAUSERIE_THEMES 
} from '@/app/hse/data';

// --- TYPES ---
interface IChantier {
  id: string; nom: string; client: string; adresse: string;
  date_debut: string; date_fin: string;
  responsable_id: string; type_travaux: string[];
}
interface IUser {
  id: string; nom: string; prenom: string; role: string; habilitations: string[];
}
interface IMateriel {
  id: string; libelle: string; type: string; categorie: string; numero_serie: string;
  derniere_vgp: string; statut: 'operationnel' | 'maintenance' | 'rebut'; chantier_actuel_id: string;
}

// =================================================================================================
// COMPOSANT MAÎTRE : CONSOLE DE PILOTAGE HSE (ALTRAD.OS)
// =================================================================================================
export default function HSEUltimateModule() {
  const router = useRouter();
  const [view, setView] = useState<'dashboard'|'generator'|'vgp'|'terrain'|'causerie'|'history'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [activeChantierId, setActiveChantierId] = useState<string>("");

  // Data Stores
  const [chantiers, setChantiers] = useState<IChantier[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [materiel, setMateriel] = useState<IMateriel[]>([]);
  const [activeEquipe, setActiveEquipe] = useState<IUser[]>([]);

  // Computed
  const activeChantier = chantiers.find(c => c.id === activeChantierId);
  const activeMateriel = materiel.filter(m => m.chantier_actuel_id === activeChantierId);

  // --- INIT ---
  useEffect(() => { fetchGlobalData(); }, []);
  useEffect(() => { if (activeChantierId) fetchCurrentTeam(activeChantierId); }, [activeChantierId]);

  async function fetchGlobalData() {
    setLoading(true);
    const results = await Promise.all([
        supabase.from('chantiers').select('*'),
        supabase.from('employes').select('*'),
        supabase.from('materiel').select('*')
    ]);
    if (results[0].data) setChantiers(results[0].data);
    if (results[1].data) setUsers(results[1].data);
    if (results[2].data) setMateriel(results[2].data);
    setLoading(false);
  }

  async function fetchCurrentTeam(cid: string) {
    // Récupération de l'équipe via le planning ou affectation directe
    // Simplification : on prend tous les employés pour la démo, ou filtrer si table de liaison existe
    const { data } = await supabase.from('employes').select('*'); // À affiner selon votre modèle de données
    if(data) setActiveEquipe(data); 
  }

  // Navigation vers les pages dédiées (Prejob / Accueil)
  const navigateToModule = (path: string) => {
    if(!activeChantierId) return alert("Veuillez sélectionner un chantier actif.");
    // On passe l'ID chantier en paramètre d'URL
    router.push(`/hse/${path}?cid=${activeChantierId}`);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin text-red-600"><ShieldCheck size={48}/></div></div>;

  return (
    <div className="flex min-h-screen bg-[#f3f4f6] font-sans text-gray-800">
      
      {/* SIDEBAR */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 z-50">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-black uppercase text-gray-900">ALTRAD<span className="text-red-600">.HSE</span></h1>
          <p className="text-[10px] font-bold text-gray-400 tracking-widest mt-1">PILOTAGE SÉCURITÉ</p>
        </div>

        {/* SELECTEUR CHANTIER */}
        <div className="p-4 bg-gray-50/50 border-b border-gray-100">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Factory size={12}/> Chantier Actif</label>
          <select 
            className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
            value={activeChantierId} onChange={(e) => setActiveChantierId(e.target.value)}
          >
            <option value="">-- SÉLECTIONNER --</option>
            {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          <NavBtn id="dashboard" icon={LayoutDashboard} label="Tableau de Bord" active={view} set={setView} />
          
          <div className="pt-6 pb-2"><p className="text-[10px] font-black text-gray-300 uppercase px-2">Méthodes & Matériel</p></div>
          <NavBtn id="generator" icon={FileText} label="Générateur Docs" active={view} set={setView} disabled={!activeChantierId} />
          <NavBtn id="vgp" icon={Wrench} label="Suivi VGP / Matériel" active={view} set={setView} disabled={!activeChantierId} />
          
          <div className="pt-6 pb-2"><p className="text-[10px] font-black text-gray-300 uppercase px-2">Terrain (Modules)</p></div>
          {/* BOUTONS VERS PAGES DÉDIÉES */}
          <button onClick={() => navigateToModule('prejob')} disabled={!activeChantierId} className={`w-full flex items-center gap-4 px-6 py-4 rounded-[20px] text-[11px] font-black uppercase transition-all text-gray-500 hover:bg-red-50 hover:text-red-600 ${!activeChantierId && 'opacity-50 cursor-not-allowed'}`}>
             <ClipboardCheck size={20} /> Pre-Job Briefing <ExternalLink size={12} className="ml-auto opacity-50"/>
          </button>
          <button onClick={() => navigateToModule('accueil')} disabled={!activeChantierId} className={`w-full flex items-center gap-4 px-6 py-4 rounded-[20px] text-[11px] font-black uppercase transition-all text-gray-500 hover:bg-green-50 hover:text-green-600 ${!activeChantierId && 'opacity-50 cursor-not-allowed'}`}>
             <UserPlus size={20} /> Accueil Sécurité <ExternalLink size={12} className="ml-auto opacity-50"/>
          </button>

          <div className="pt-2"></div>
          <NavBtn id="terrain" icon={Camera} label="Visites / Audits" active={view} set={setView} disabled={!activeChantierId} />
          <NavBtn id="causerie" icon={Megaphone} label="Causeries" active={view} set={setView} disabled={!activeChantierId} />
          <NavBtn id="history" icon={History} label="Archives" active={view} set={setView} />
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 h-screen overflow-hidden flex flex-col bg-[#f8f9fa]">
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0 shadow-sm z-40">
           <h2 className="text-2xl font-black text-gray-800 uppercase flex items-center gap-3">
             {view === 'dashboard' ? <LayoutDashboard className="text-gray-400"/> : null}
             {view === 'dashboard' ? 'Tableau de Bord HSE' : view.toUpperCase()}
           </h2>
           {activeChantier && <div className="text-right"><p className="text-xs font-bold text-gray-900">{activeChantier.client}</p><p className="text-[10px] text-gray-500 flex items-center justify-end gap-1"><MapPin size={10}/> {activeChantier.adresse}</p></div>}
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {!activeChantierId && view !== 'dashboard' && view !== 'history' ? (
            <div className="flex flex-col items-center justify-center h-full opacity-40">
                <HardHat size={80} className="mb-4 text-gray-300"/>
                <p className="font-black text-gray-400 text-xl">SÉLECTIONNEZ UN CHANTIER</p>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto pb-20">
               {view === 'dashboard' && <DashboardModule chantiers={chantiers} materiel={materiel} />}
               {view === 'generator' && <DocumentGenerator chantier={activeChantier!} equipe={activeEquipe} />}
               {view === 'vgp' && <VGPTracker materiel={activeMateriel} chantierId={activeChantierId} onRefresh={fetchGlobalData} />}
               {view === 'terrain' && <FieldVisits chantier={activeChantier!} equipe={activeEquipe} />}
               {view === 'causerie' && <SafetyTalks chantier={activeChantier!} equipe={activeEquipe} />}
               {view === 'history' && <CauserieArchives />}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const NavBtn = ({id, icon: Icon, label, active, set, disabled}: any) => (
  <button onClick={() => !disabled && set(id)} disabled={disabled} className={`w-full flex items-center gap-4 px-6 py-4 rounded-[20px] text-[11px] font-black uppercase transition-all ${active === id ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50 hover:text-black'} ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}>
    <Icon size={20} /> {label} {active === id && <ChevronRight size={14} className="ml-auto"/>}
  </button>
);
// =================================================================================================
// MODULE 1: DASHBOARD (KPIs & Vue d'ensemble)
// =================================================================================================
function DashboardModule({ chantiers, materiel }: { chantiers: IChantier[], materiel: IMateriel[] }) {
  const vgpPerimees = materiel.filter(m => {
    const freq = VGP_RULES[m.categorie as keyof typeof VGP_RULES] || 12;
    const nextDate = new Date(new Date(m.derniere_vgp).setMonth(new Date(m.derniere_vgp).getMonth() + freq));
    return nextDate < new Date();
  }).length;

  const chartData = [{n:'Jan', v:4.2}, {n:'Fev', v:3.8}, {n:'Mar', v:2.1}, {n:'Avr', v:0.0}, {n:'Mai', v:1.2}];
  const pieData = [{name: 'Conforme', value: materiel.length - vgpPerimees, color: '#10b981'}, {name: 'Périmé', value: vgpPerimees, color: '#ef4444'}];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Taux Fréquence" val="1.2" sub="Objectif < 2.0" icon={AlertOctagon} color="blue" />
        <StatCard label="Chantiers" val={chantiers.length} sub="Projets actifs" icon={Factory} color="indigo" />
        <StatCard label="VGP Périmées" val={vgpPerimees} sub="Matériel bloqué" icon={Siren} color={vgpPerimees > 0 ? "red" : "green"} />
        <StatCard label="Causeries" val="8" sub="Ce mois-ci" icon={Megaphone} color="orange" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-96">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="font-black text-gray-800 mb-6 uppercase text-xs tracking-widest">Évolution Taux de Fréquence</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/><XAxis dataKey="n" axisLine={false} tickLine={false} tick={{fontSize:10}}/><YAxis axisLine={false} tickLine={false} tick={{fontSize:10}}/><RechartsTooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius:'10px', border:'none', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.1)'}}/><Bar dataKey="v" fill="#ef4444" radius={[4,4,0,0]} barSize={40}/></BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="font-black text-gray-800 mb-2 uppercase text-xs tracking-widest">Conformité Matériel</h3>
          <div className="flex-1 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{pieData.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Legend verticalAlign="bottom"/></PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8 flex-col"><span className="text-3xl font-black">{Math.round(((materiel.length-vgpPerimees)/materiel.length)*100 || 0)}%</span><span className="text-[9px] uppercase font-bold text-gray-400">Opérationnel</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =================================================================================================
// MODULE 2: VGP TRACKER (Gestion Matériel)
// =================================================================================================
function VGPTracker({ materiel, chantierId, onRefresh }: { materiel: IMateriel[], chantierId: string, onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newEq, setNewEq] = useState({ libelle: '', type: 'interne', categorie: 'Levage', numero_serie: '', derniere_vgp: '' });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('materiel').insert([{ ...newEq, chantier_actuel_id: chantierId, statut: 'operationnel' }]);
    if(!error) { setShowAdd(false); onRefresh(); alert("Matériel ajouté !"); }
  };

  return (
    <div className="animate-in fade-in">
      <div className="flex justify-between items-end mb-6">
         <div><h3 className="text-xl font-black text-gray-800 uppercase flex items-center gap-2"><Wrench className="text-orange-500"/> Registre Matériel</h3><p className="text-xs text-gray-400 font-bold">Suivi des VGP et affectations</p></div>
         <button onClick={() => setShowAdd(true)} className="bg-black text-white px-5 py-3 rounded-xl text-xs font-bold uppercase shadow-lg flex items-center gap-2 hover:bg-gray-800"><Plus size={16}/> Ajouter</button>
      </div>

      {showAdd && (
        <div className="bg-gray-50 p-6 rounded-2xl mb-6 border border-gray-100">
           <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
              <input required placeholder="Libellé (ex: Nacelle)" className="p-3 rounded-xl border" value={newEq.libelle} onChange={e=>setNewEq({...newEq, libelle:e.target.value})} />
              <input required placeholder="N° Série" className="p-3 rounded-xl border" value={newEq.numero_serie} onChange={e=>setNewEq({...newEq, numero_serie:e.target.value})} />
              <select className="p-3 rounded-xl border" value={newEq.categorie} onChange={e=>setNewEq({...newEq, categorie:e.target.value})}>{Object.keys(VGP_RULES).map(k=><option key={k} value={k}>{k}</option>)}</select>
              <input required type="date" className="p-3 rounded-xl border" value={newEq.derniere_vgp} onChange={e=>setNewEq({...newEq, derniere_vgp:e.target.value})} />
              <button className="col-span-2 bg-orange-500 text-white py-3 rounded-xl font-bold uppercase">Enregistrer</button>
           </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase"><tr><th className="p-4">Matériel</th><th className="p-4">Catégorie</th><th className="p-4">Fin Validité</th><th className="p-4 text-center">État</th></tr></thead>
          <tbody className="text-sm">{materiel.map(m => {
             const freq = VGP_RULES[m.categorie as keyof typeof VGP_RULES] || 12;
             const next = new Date(new Date(m.derniere_vgp).setMonth(new Date(m.derniere_vgp).getMonth() + freq));
             const isLate = next < new Date();
             return (
               <tr key={m.id} className="border-b last:border-0 hover:bg-gray-50">
                 <td className="p-4"><div className="font-bold text-gray-800">{m.libelle}</div><div className="text-xs text-gray-400">{m.numero_serie}</div></td>
                 <td className="p-4"><span className="px-2 py-1 bg-gray-100 rounded text-xs font-bold uppercase">{m.categorie}</span></td>
                 <td className="p-4 font-mono font-bold text-gray-600">{next.toLocaleDateString()}</td>
                 <td className="p-4 text-center"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${isLate ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{isLate ? 'PÉRIMÉ' : 'CONFORME'}</span></td>
               </tr>
             )
          })}</tbody>
        </table>
        {materiel.length === 0 && <div className="p-8 text-center text-gray-400 text-sm italic">Aucun matériel affecté.</div>}
      </div>
    </div>
  );
}
// =================================================================================================
// MODULE 3: GÉNÉRATEUR DOCUMENTS (PPSPS, etc.)
// =================================================================================================
function DocumentGenerator({ chantier, equipe }: any) {
  const [type, setType] = useState('ppsps');
  
  const generate = async () => {
     try {
       const { jsPDF } = await import("jspdf");
       const doc = new jsPDF();
       doc.setFontSize(20); doc.text(type.toUpperCase(), 105, 20, { align: 'center' });
       doc.setFontSize(12); doc.text(`Chantier: ${chantier.nom}`, 20, 40);
       doc.text(`Client: ${chantier.client}`, 20, 50);
       doc.text(`Effectif: ${equipe.length} personnes`, 20, 60);
       doc.save(`${type}_${chantier.nom}.pdf`);
     } catch(e) { alert("Erreur génération PDF"); }
  };

  return (
    <div className="grid grid-cols-4 gap-6 animate-in fade-in">
       <div className="col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
          {['ppsps', 'modop', 'plan_prevention', 'fiche_securite'].map(t => (
            <button key={t} onClick={()=>setType(t)} className={`p-4 rounded-xl text-left font-bold uppercase text-xs transition-all ${type===t ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'hover:bg-gray-50'}`}>{t.replace('_', ' ')}</button>
          ))}
       </div>
       <div className="col-span-3 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <FileText size={60} className="text-gray-200 mb-4"/>
          <h3 className="text-xl font-black uppercase text-gray-800 mb-2">Générer {type.toUpperCase()}</h3>
          <p className="text-sm text-gray-400 max-w-md mb-8">Ce document sera pré-rempli avec les données du chantier (risques, effectifs, matériel) et prêt à être signé.</p>
          <button onClick={generate} className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase shadow-lg hover:scale-105 transition-transform flex items-center gap-2"><Download size={20}/> Télécharger PDF</button>
       </div>
    </div>
  );
}

// =================================================================================================
// MODULE 4: VISITES TERRAIN & CAUSERIES
// =================================================================================================
function FieldVisits({ chantier, equipe }: any) {
  const [obs, setObs] = useState('');
  const handleSave = async () => {
      if(!obs) return;
      await supabase.from('visites_terrain').insert([{ chantier_id: chantier.id, type: 'vmt', observations: obs, date: new Date().toISOString() }]);
      setObs(''); alert('Visite enregistrée !');
  };
  return (
    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 animate-in fade-in">
       <h3 className="font-black text-gray-800 uppercase mb-6 flex items-center gap-2"><Camera className="text-emerald-500"/> Rapport de Visite</h3>
       <textarea className="w-full p-4 bg-gray-50 rounded-2xl h-32 text-sm font-bold border-0 focus:ring-2 ring-emerald-100" placeholder="Observations, écarts, bonnes pratiques..." value={obs} onChange={e=>setObs(e.target.value)}></textarea>
       <button onClick={handleSave} className="mt-4 w-full bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase hover:bg-emerald-600 transition-colors">Enregistrer Visite</button>
    </div>
  );
}

function SafetyTalks({ chantier, equipe }: any) {
  const [theme, setTheme] = useState('');
  const handleSave = async () => {
     if(!theme) return;
     await supabase.from('causeries_archives').insert([{ chantier_id: chantier.id, theme, date: new Date().toISOString() }]);
     setTheme(''); alert('Causerie archivée !');
  };
  return (
    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 animate-in fade-in">
       <h3 className="font-black text-gray-800 uppercase mb-6 flex items-center gap-2"><Megaphone className="text-purple-500"/> Nouvelle Causerie</h3>
       <select className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm mb-4" value={theme} onChange={e=>setTheme(e.target.value)}>
          <option value="">-- Choisir un thème --</option>
          {CAUSERIE_THEMES.map(t => <option key={t} value={t}>{t}</option>)}
       </select>
       <button onClick={handleSave} className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black uppercase hover:bg-purple-700 transition-colors">Valider la séance</button>
    </div>
  );
}

function CauserieArchives() {
  const [archives, setArchives] = useState<any[]>([]);
  useEffect(() => { 
     supabase.from('causeries_archives').select('*, chantiers(nom)').order('date', {ascending:false}).then(({data}) => setArchives(data || [])); 
  }, []);
  return (
    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 animate-in fade-in">
       <h3 className="font-black text-gray-800 uppercase mb-6 flex items-center gap-2"><History className="text-gray-400"/> Historique</h3>
       <div className="space-y-4">
          {archives.map(a => (
             <div key={a.id} className="p-4 bg-gray-50 rounded-2xl border flex justify-between items-center">
                <div><p className="font-black text-sm text-gray-800">{a.theme}</p><p className="text-xs text-gray-400">{new Date(a.date).toLocaleDateString()} - {a.chantiers?.nom}</p></div>
                <button className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
             </div>
          ))}
          {archives.length === 0 && <p className="text-center text-gray-400 text-sm italic">Aucune archive.</p>}
       </div>
    </div>
  );
}

// --- COMPOSANTS UI ---
const StatCard = ({ label, val, sub, icon: Icon, color }: any) => {
  const themes:any = { 
    red: "bg-red-50 text-red-600 border-red-100", blue: "bg-blue-50 text-blue-600 border-blue-100", 
    green: "bg-emerald-50 text-emerald-600 border-emerald-100", indigo: "bg-indigo-50 text-indigo-600 border-indigo-100", 
    orange: "bg-orange-50 text-orange-600 border-orange-100" 
  };
  return (
    <div className={`p-6 rounded-[30px] border flex items-start justify-between bg-white shadow-sm ${themes[color].split(' ')[2]}`}>
      <div><p className="text-[10px] font-black uppercase opacity-60 tracking-widest text-gray-500 mb-2">{label}</p><p className="text-3xl font-black text-gray-900 tracking-tighter leading-none">{val}</p><p className={`text-[9px] font-black mt-3 uppercase ${themes[color].split(' ')[1]}`}>{sub}</p></div>
      <div className={`p-4 rounded-2xl ${themes[color].split(' ').slice(0,2).join(' ')}`}><Icon size={24}/></div>
    </div>
  )
};
