"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, FileText, Wrench, Camera, Megaphone, ShieldCheck, AlertTriangle, 
  CheckCircle2, XCircle, Clock, MapPin, User, Users, Calendar, Printer, Save, Plus, 
  Trash2, Search, ArrowRight, Download, Eye, AlertOctagon, Siren, HardHat, FileCheck, 
  X, ChevronRight, ClipboardList, Stethoscope, Factory, Truck, Edit, History, 
  PenTool, QrCode, ExternalLink, UserPlus, ClipboardCheck, Paperclip, MessageSquare
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import SignatureCanvas from 'react-signature-canvas';
import { RISK_DATABASE, VGP_RULES, CAUSERIE_THEMES, Q3SRE_REFERENTIAL } from './data'; // Import local ./data

// --- TYPES ---
interface IChantier { id: string; nom: string; client: string; adresse: string; responsable_id: string; type_travaux: string[]; }
interface IUser { id: string; nom: string; prenom: string; role: string; habilitations: string[]; }
interface IMateriel { id: string; libelle: string; type: string; categorie: string; numero_serie: string; derniere_vgp: string; statut: string; chantier_actuel_id: string; }

// =================================================================================================
// COMPOSANT MAÎTRE : CONSOLE DE PILOTAGE HSE
// =================================================================================================
export default function HSEDashboardPage() {
  const router = useRouter();
  const [view, setView] = useState<'dashboard'|'generator'|'vgp'|'terrain'|'causerie'|'history'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [activeChantierId, setActiveChantierId] = useState<string>("");

  const [chantiers, setChantiers] = useState<IChantier[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [materiel, setMateriel] = useState<IMateriel[]>([]);
  const [activeEquipe, setActiveEquipe] = useState<IUser[]>([]);

  const activeChantier = chantiers.find(c => c.id === activeChantierId);
  const activeMateriel = materiel.filter(m => m.chantier_actuel_id === activeChantierId);

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
  async function fetchCurrentTeam(cid: string) { const { data } = await supabase.from('employes').select('*'); if(data) setActiveEquipe(data); }

  const navigateToTool = (tool: 'prejob' | 'accueil') => {
    if (!activeChantierId) return alert("Veuillez d'abord sélectionner un chantier actif.");
    router.push(`/hse/${tool}?cid=${activeChantierId}`);
  };

  const NavBtn = ({id, icon: Icon, label, active, set, disabled}: any) => (
    <button onClick={() => !disabled && set(id)} disabled={disabled} className={`w-full flex items-center gap-4 px-6 py-4 rounded-[20px] text-[11px] font-black uppercase transition-all ${active === id ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50 hover:text-black'} ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}>
      <Icon size={20} /> {label} {active === id && <ChevronRight size={14} className="ml-auto"/>}
    </button>
  );

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin text-red-600 mr-3"><ShieldCheck size={32}/></div><p className="font-bold text-gray-500">Chargement...</p></div>;

  return (
    <div className="flex min-h-screen bg-[#f3f4f6] font-sans text-gray-800">
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 z-50">
        <div className="p-6 border-b border-gray-100"><h1 className="text-xl font-black uppercase text-gray-900">ALTRAD<span className="text-red-600">.HSE</span></h1><p className="text-[10px] font-bold text-gray-400 tracking-widest mt-1">PILOTAGE SÉCURITÉ</p></div>
        <div className="p-4 bg-gray-50/50 border-b border-gray-100">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Factory size={12}/> Chantier Actif</label>
          <select className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-red-500 shadow-sm" value={activeChantierId} onChange={(e) => setActiveChantierId(e.target.value)}>
            <option value="">-- SÉLECTIONNER --</option>{chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          <NavBtn id="dashboard" icon={LayoutDashboard} label="Tableau de Bord" active={view} set={setView} />
          <div className="pt-6 pb-2"><p className="text-[10px] font-black text-gray-300 uppercase px-2">Méthodes & Matériel</p></div>
          <NavBtn id="generator" icon={FileText} label="Générateur Docs" active={view} set={setView} disabled={!activeChantierId} />
          <NavBtn id="vgp" icon={Wrench} label="Suivi VGP / Matériel" active={view} set={setView} disabled={!activeChantierId} />
          <div className="pt-6 pb-2"><p className="text-[10px] font-black text-gray-300 uppercase px-2">Terrain (Modules)</p></div>
          <button onClick={() => navigateToTool('prejob')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-[20px] text-[11px] font-black uppercase transition-all text-gray-500 hover:bg-red-50 hover:text-red-600 ${!activeChantierId && 'opacity-40 cursor-not-allowed'}`}><ClipboardCheck size={20} /> Pre-Job Briefing <ExternalLink size={14} className="ml-auto opacity-50"/></button>
          <button onClick={() => navigateToTool('accueil')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-[20px] text-[11px] font-black uppercase transition-all text-gray-500 hover:bg-green-50 hover:text-green-600 ${!activeChantierId && 'opacity-40 cursor-not-allowed'}`}><UserPlus size={20} /> Accueil Sécurité <ExternalLink size={14} className="ml-auto opacity-50"/></button>
          <div className="pt-2"></div>
          <NavBtn id="terrain" icon={Camera} label="Visite Terrain (VMT)" active={view} set={setView} disabled={!activeChantierId} />
          <NavBtn id="causerie" icon={Megaphone} label="Causerie QSSE" active={view} set={setView} disabled={!activeChantierId} />
        </nav>
      </aside>

      <main className="flex-1 h-screen overflow-hidden flex flex-col bg-[#f8f9fa]">
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {!activeChantierId && view !== 'dashboard' ? (
            <div className="flex flex-col items-center justify-center h-full opacity-40"><HardHat size={80} className="mb-4 text-gray-300"/><p className="font-black text-gray-400 text-xl">SÉLECTIONNEZ UN CHANTIER</p></div>
          ) : (
            <div className="max-w-7xl mx-auto pb-20">
               {view === 'dashboard' && <DashboardModule chantiers={chantiers} materiel={materiel} setView={setView}/>}
               {view === 'vgp' && <VGPTracker materiel={activeMateriel} chantierId={activeChantierId} onRefresh={fetchGlobalData} />}
               {/* Modules Avancés */}
               {view === 'terrain' && <VMTForm chantier={activeChantier!} equipe={activeEquipe} />}
               {view === 'causerie' && <CauserieForm chantier={activeChantier!} equipe={activeEquipe} />}
               {view === 'generator' && <div className="text-center py-20 text-gray-400 font-bold">Module Générateur (Même logique que Prejob)</div>}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// DASHBOARD MODULE
function DashboardModule({ chantiers, materiel, setView }: any) {
  const vgpPerimees = materiel.filter((m:any) => new Date(m.derniere_vgp) < new Date(new Date().setMonth(new Date().getMonth() - 12))).length;
  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div onClick={()=>setView('terrain')} className="cursor-pointer hover:scale-105 transition-all"><StatCard label="Taux Fréquence" val="1.2" sub="Objectif < 2.0" icon={AlertOctagon} color="blue" /></div>
        <div onClick={()=>setView('causerie')} className="cursor-pointer hover:scale-105 transition-all"><StatCard label="Causeries" val="8" sub="Ce mois-ci" icon={Megaphone} color="orange" /></div>
        <div onClick={()=>setView('vgp')} className="cursor-pointer hover:scale-105 transition-all"><StatCard label="VGP Périmées" val={vgpPerimees} sub="Matériel bloqué" icon={Siren} color={vgpPerimees>0?"red":"green"} /></div>
        <StatCard label="Chantiers Actifs" val={chantiers.length} sub="En cours" icon={Factory} color="indigo" />
      </div>
      <div className="h-64 bg-white rounded-3xl border border-gray-100 flex items-center justify-center text-gray-400 font-bold">Graphiques Statistiques (Placeholder)</div>
    </div>
  );
}

// VGP MODULE
function VGPTracker({ materiel, chantierId, onRefresh }: any) {
  const [newEq, setNewEq] = useState({ libelle: '', numero_serie: '', derniere_vgp: '' });
  const handleSave = async (e: any) => { e.preventDefault(); await supabase.from('materiel').insert([{...newEq, chantier_actuel_id: chantierId, categorie:'Levage', type:'interne', statut:'operationnel'}]); onRefresh(); alert('Ajouté!'); };
  return (
    <div className="space-y-6">
       <div className="flex justify-between"><h3 className="font-black text-xl">Parc Matériel</h3></div>
       <form onSubmit={handleSave} className="grid grid-cols-3 gap-4 bg-white p-4 rounded-xl shadow-sm"><input placeholder="Libellé" className="p-2 border rounded" onChange={e=>setNewEq({...newEq, libelle:e.target.value})}/><input placeholder="Série" className="p-2 border rounded" onChange={e=>setNewEq({...newEq, numero_serie:e.target.value})}/><button className="bg-black text-white rounded px-4 font-bold">Ajouter</button></form>
       <table className="w-full bg-white rounded-xl shadow-sm overflow-hidden text-sm"><thead className="bg-gray-50 text-left"><tr><th className="p-3">Nom</th><th className="p-3">Série</th><th className="p-3">VGP</th></tr></thead><tbody>{materiel.map((m:any)=><tr key={m.id} className="border-t"><td className="p-3 font-bold">{m.libelle}</td><td className="p-3">{m.numero_serie}</td><td className="p-3">{m.derniere_vgp}</td></tr>)}</tbody></table>
    </div>
  );
}

const StatCard = ({ label, val, sub, icon: Icon, color }: any) => {
  const themes:any = { red: "bg-red-50 text-red-600 border-red-100", blue: "bg-blue-50 text-blue-600 border-blue-100", green: "bg-emerald-50 text-emerald-600 border-emerald-100", indigo: "bg-indigo-50 text-indigo-600 border-indigo-100", orange: "bg-orange-50 text-orange-600 border-orange-100" };
  return (<div className={`p-6 rounded-[30px] border flex justify-between bg-white shadow-sm ${themes[color].split(' ')[2]}`}><div><p className="text-[10px] font-black uppercase opacity-60 text-gray-500 mb-2">{label}</p><p className="text-3xl font-black text-gray-900 leading-none">{val}</p><p className={`text-[9px] font-black mt-3 uppercase ${themes[color].split(' ')[1]}`}>{sub}</p></div><div className={`p-4 rounded-2xl ${themes[color].split(' ').slice(0,2).join(' ')}`}><Icon size={24}/></div></div>)
};

// =================================================================================================
// FORMULAIRE COMPLEXE : VISITE TERRAIN (VMT)
// =================================================================================================
function VMTForm({ chantier, equipe }: any) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: { vmt: true, q3sre: false, ost: false },
    is_sous_traitant: 'non',
    domaine: '', agence: '', otp: '', site: '', local: '',
    lignes_defense: [] as any[],
    individuel: [] as any[]
  });

  const addLigneDefense = () => setForm({...form, lignes_defense: [...form.lignes_defense, { ligne: '', point: '', resultat: '', explication: '' }]});
  const addIndividuel = () => setForm({...form, individuel: [...form.individuel, { nom: '', epi: '', culture: '', minute: '' }]});

  return (
    <div className="bg-white rounded-[40px] shadow-lg border border-gray-200 overflow-hidden max-w-4xl mx-auto">
       <div className="bg-[#e21118] p-6 text-white"><h2 className="text-2xl font-black uppercase text-center">VISITE TERRAIN</h2></div>
       <div className="p-8 space-y-8">
          
          {/* SECTION 1: TYPE */}
          <div className="bg-red-50/50 p-6 rounded-2xl border border-red-100">
             <h3 className="text-xs font-black uppercase text-red-600 mb-4 border-b border-red-200 pb-2">TYPE DE VISITE</h3>
             <div className="grid grid-cols-2 gap-6">
                <div><label className="text-[10px] font-bold text-gray-500 uppercase">Date Visite *</label><input type="date" className="w-full p-2 border rounded font-bold" value={form.date} onChange={e=>setForm({...form, date:e.target.value})}/></div>
                <div>
                   <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">Type de visite terrain *</label>
                   <div className="flex gap-4">
                      <label className="flex items-center gap-2 font-bold text-xs"><input type="checkbox" checked={form.type.vmt} onChange={()=>setForm({...form, type:{...form.type, vmt:!form.type.vmt}})}/> VMT</label>
                      <label className="flex items-center gap-2 font-bold text-xs"><input type="checkbox" checked={form.type.q3sre} onChange={()=>setForm({...form, type:{...form.type, q3sre:!form.type.q3sre}})}/> Contrôle Q3SRE</label>
                   </div>
                   <label className="flex items-center gap-2 font-bold text-xs mt-2"><input type="checkbox" checked={form.type.ost} onChange={()=>setForm({...form, type:{...form.type, ost:!form.type.ost}})}/> Observation situation travail</label>
                </div>
                <div className="col-span-2">
                   <label className="text-[10px] font-bold text-gray-500 uppercase">La visite concerne-t-elle un sous-traitant ?</label>
                   <select className="w-full p-2 border rounded font-bold mt-1" value={form.is_sous_traitant} onChange={e=>setForm({...form, is_sous_traitant:e.target.value})}><option value="non">Non</option><option value="oui">Oui</option></select>
                </div>
             </div>
          </div>

          {/* SECTION 2: DESCRIPTION */}
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
             <h3 className="text-xs font-black uppercase text-gray-600 mb-4 border-b border-gray-300 pb-2">DESCRIPTION DE LA VISITE</h3>
             <div className="grid grid-cols-3 gap-4 mb-4">
                <div><label className="text-[10px] font-bold uppercase">Domaine *</label><select className="w-full p-2 border rounded" value={form.domaine} onChange={e=>setForm({...form, domaine:e.target.value})}><option>Sécurité</option><option>Qualité</option></select></div>
                <div><label className="text-[10px] font-bold uppercase">Agence *</label><select className="w-full p-2 border rounded" value={form.agence} onChange={e=>setForm({...form, agence:e.target.value})}><option>Agence Lyon</option></select></div>
                <div><label className="text-[10px] font-bold uppercase">OTP *</label><input className="w-full p-2 border rounded" value={form.otp} onChange={e=>setForm({...form, otp:e.target.value})}/></div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-bold uppercase">Identification local / équipement</label><input className="w-full p-2 border rounded" value={form.local} onChange={e=>setForm({...form, local:e.target.value})}/></div>
                <div><label className="text-[10px] font-bold uppercase">Site</label><input className="w-full p-2 border rounded" value={form.site} onChange={e=>setForm({...form, site:e.target.value})}/></div>
             </div>
          </div>

          {/* SECTION 3: COLLECTIF */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
             <h3 className="text-xs font-black uppercase text-gray-600 mb-4 flex justify-between items-center">
                 <span>COLLECTIF: DÉTAIL DE LA VISITE</span>
                 <button onClick={addLigneDefense} className="bg-red-100 text-red-600 px-3 py-1 rounded text-[10px] font-black uppercase hover:bg-red-200">+ Ajouter Ligne</button>
             </h3>
             {form.lignes_defense.map((l, i) => (
                 <div key={i} className="p-4 mb-4 bg-gray-50 rounded-xl border border-gray-200">
                     <div className="grid grid-cols-2 gap-4 mb-2">
                        <select className="p-2 border rounded text-xs"><option>Technique (Matériel)</option><option>Humaine</option></select>
                        <select className="p-2 border rounded text-xs"><option>Balisage</option><option>EPI</option></select>
                     </div>
                     <textarea className="w-full p-2 border rounded text-xs h-16" placeholder="Explication du résultat..."></textarea>
                 </div>
             ))}
             {form.lignes_defense.length === 0 && <p className="text-center text-xs text-gray-400 italic">Aucune ligne de défense ajoutée.</p>}
          </div>

          {/* SECTION 4: INDIVIDUEL */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
             <h3 className="text-xs font-black uppercase text-gray-600 mb-4 flex justify-between items-center">
                 <span>INDIVIDUEL: OBSERVATION</span>
                 <button onClick={addIndividuel} className="bg-red-100 text-red-600 px-3 py-1 rounded text-[10px] font-black uppercase hover:bg-red-200">+ Ajouter Observation</button>
             </h3>
             {form.individuel.map((ind, i) => (
                 <div key={i} className="p-4 mb-4 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-2 gap-4">
                     <select className="p-2 border rounded text-xs"><option>-- Nom Prénom --</option>{equipe.map((u:any)=><option key={u.id}>{u.nom} {u.prenom}</option>)}</select>
                     <input className="p-2 border rounded text-xs" placeholder="Si hors liste..."/>
                     <select className="p-2 border rounded text-xs"><option>Port EPI: OK</option><option>NOK</option></select>
                     <select className="p-2 border rounded text-xs"><option>Culture SSE: Exemplaire</option><option>À améliorer</option></select>
                 </div>
             ))}
          </div>

          <button className="w-full bg-[#e21118] text-white font-black py-4 rounded-xl uppercase shadow-lg hover:bg-black transition-all">Enregistrer la Visite</button>
       </div>
    </div>
  );
}

// =================================================================================================
// FORMULAIRE COMPLEXE : CAUSERIE QSSE
// =================================================================================================
function CauserieForm({ chantier, equipe }: any) {
  const [activeTab, setActiveTab] = useState('nouveau');
  const sigPad = useRef<any>(null);

  return (
    <div className="max-w-4xl mx-auto">
       <div className="flex gap-4 mb-6">
          <button onClick={()=>setActiveTab('nouveau')} className={`px-6 py-3 rounded-xl font-black uppercase text-xs flex-1 ${activeTab==='nouveau' ? 'bg-black text-white' : 'bg-white border'}`}>Nouvelle Causerie</button>
          <button onClick={()=>setActiveTab('archives')} className={`px-6 py-3 rounded-xl font-black uppercase text-xs flex-1 ${activeTab==='archives' ? 'bg-black text-white' : 'bg-white border'}`}>Archives</button>
       </div>

       {activeTab === 'archives' ? (
          <div className="bg-white p-8 rounded-[40px] shadow-sm"><p className="text-center text-gray-400 font-bold">Liste des archives causeries (À connecter)...</p></div>
       ) : (
          <div className="bg-white rounded-[40px] shadow-lg border border-gray-200 overflow-hidden">
             <div className="p-8 space-y-8">
                 <div className="text-right"><h2 className="text-3xl font-black uppercase text-gray-800">CAUSERIE QSSE</h2></div>
                 <div className="grid grid-cols-2 gap-6">
                    <div><label className="text-[10px] font-bold text-gray-500 uppercase">Date</label><input type="date" className="w-full p-3 border rounded-xl font-bold bg-gray-50"/></div>
                    <div><label className="text-[10px] font-bold text-red-500 uppercase">N° de dossier / OTP *</label><input type="text" className="w-full p-3 border rounded-xl font-bold bg-gray-50" placeholder="Saisir OTP..."/></div>
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">Activité concernée</label>
                    <div className="flex flex-wrap gap-4">{['Revêtement', 'Echafaudage', 'Isolation', 'PPI', 'Agencement'].map(a => (<label key={a} className="flex items-center gap-2 text-xs font-bold"><input type="checkbox"/> {a}</label>))}<input placeholder="Autres :" className="p-1 border-b text-xs outline-none"/></div>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <input placeholder="Animateur (Nom Prénom)" className="w-full p-3 border rounded-xl bg-gray-50 font-bold text-sm"/>
                    <input placeholder="Co-animateur" className="w-full p-3 border rounded-xl bg-gray-50 font-bold text-sm"/>
                 </div>
                 <div className="border-2 border-dashed border-gray-300 rounded-xl h-40 relative bg-gray-50">
                     <SignatureCanvas ref={sigPad} penColor="black" canvasProps={{className: 'absolute inset-0 w-full h-full'}} />
                     <div className="absolute top-2 left-2 text-[10px] text-gray-400 font-bold">Signature Animateur</div>
                 </div>
                 <div><label className="text-[10px] font-bold text-gray-500 uppercase">Domaines</label><select className="w-full p-3 border rounded-xl font-bold text-sm mt-1"><option>Travaux en hauteur</option><option>Risque chimique</option></select></div>
                 <div><label className="text-[10px] font-bold text-gray-500 uppercase">Type de sensibilisation</label><select className="w-full p-3 border rounded-xl font-bold text-sm mt-1"><option>Rappel des règles</option><option>Retour d'expérience (REX)</option></select></div>
                 <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl"><span className="font-bold text-sm">Échange avec l'équipe ?</span><div className="flex items-center gap-2"><span className="text-xs">Non</span><div className="w-10 h-5 bg-gray-300 rounded-full relative cursor-pointer"><div className="w-5 h-5 bg-white rounded-full shadow-md absolute left-0"></div></div></div></div>
                 <div className="space-y-2"><div className="flex justify-between items-center"><span className="font-bold text-sm">Remontées d'information ?</span><div className="flex items-center gap-2"><span className="text-xs">Non</span><div className="w-10 h-5 bg-gray-300 rounded-full relative cursor-pointer"><div className="w-5 h-5 bg-white rounded-full shadow-md absolute left-0"></div></div></div></div><textarea className="w-full p-3 border rounded-xl text-xs h-20 bg-gray-50" placeholder="En cas de remontée d'informations du personnel..."></textarea></div>
                 <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 cursor-pointer hover:bg-white hover:border-red-400 transition-colors"><p className="text-red-500 font-bold text-sm uppercase flex items-center justify-center gap-2"><Paperclip size={16}/> Select Files</p><p className="text-xs text-gray-400 mt-1">Photos de la causerie (Preuve)</p></div>
                 <div className="flex justify-between items-center pt-6 border-t"><button className="text-red-500 font-bold uppercase text-xs border border-red-500 px-6 py-3 rounded-xl hover:bg-red-50">Cancel</button><button className="bg-[#e21118] text-white font-bold uppercase text-xs px-8 py-3 rounded-xl hover:bg-black transition-colors shadow-lg">Submit</button></div>
             </div>
          </div>
       )}
    </div>
  );
}
