"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, FileText, Wrench, Camera, Megaphone, ShieldCheck, AlertTriangle, 
  CheckCircle2, HardHat, FileCheck, X, ChevronRight, ClipboardCheck, Factory, 
  Truck, QrCode, ExternalLink, UserPlus, Paperclip, Loader2, Printer, AlertOctagon, 
  Siren, Activity, ArrowRight, Plus 
} from 'lucide-react';
import { RISK_DATABASE, VGP_RULES } from './data';
import toast, { Toaster } from 'react-hot-toast';

// ============================================================================
// COMPOSANT MAÎTRE
// ============================================================================

export default function HSEDashboardPage() {
  const router = useRouter();
  const [view, setView] = useState<'dashboard'|'vgp'|'terrain'|'causerie'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [activeChantierId, setActiveChantierId] = useState<string>("");

  const [chantiers, setChantiers] = useState<any[]>([]);
  const [materiel, setMateriel] = useState<any[]>([]);
  const [stats, setStats] = useState({ vgpAlerts: 0, activeInductions: 0 });

  const fetchData = async () => {
    setLoading(true);
    try {
        const [chanRes, matRes, hseRes] = await Promise.all([
            supabase.from('chantiers').select('*').neq('statut', 'termine'),
            supabase.from('materiel').select('*'),
            supabase.from('hse_accueils_securite').select('id', { count: 'exact', head: true })
        ]);

        if (chanRes.data) setChantiers(chanRes.data);
        if (matRes.data) setMateriel(matRes.data);
        
        // Calcul alertes VGP (plus de 12 mois sans contrôle)
        const limitDate = new Date();
        limitDate.setFullYear(limitDate.getFullYear() - 1);
        const alerts = (matRes.data || []).filter((m:any) => new Date(m.derniere_vgp) < limitDate).length;

        setStats({ vgpAlerts: alerts, activeInductions: hseRes.count || 0 });
    } catch (error) {
        toast.error("Erreur de synchronisation des données");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const navigateToTool = (tool: 'prejob' | 'accueil') => {
    if (!activeChantierId) return toast.error("Sélectionnez un chantier d'abord");
    router.push(`/hse/${tool}?cid=${activeChantierId}`);
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-red-600" size={40}/></div>;

  return (
    <div className="flex min-h-screen bg-[#f8f9fa] font-['Fredoka']">
      <Toaster position="bottom-right" />
      
      {/* SIDEBAR HSE */}
      <aside className="w-80 bg-[#2d3436] text-white flex flex-col h-screen sticky top-0 z-50">
        <div className="p-8 border-b border-white/10">
            <h1 className="text-2xl font-black uppercase tracking-tighter italic">ALTRAD<span className="text-red-500">.HSE</span></h1>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.3em] mt-1">Safety Management System</p>
        </div>

        <div className="p-6 bg-black/20 border-b border-white/10">
          <label className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Factory size={14}/> Zone d'intervention
          </label>
          <select 
            className="w-full p-4 bg-[#3d4446] border-none rounded-2xl text-sm font-bold text-white outline-none focus:ring-2 focus:ring-red-500 shadow-xl cursor-pointer"
            value={activeChantierId}
            onChange={(e) => setActiveChantierId(e.target.value)}
          >
            <option value="">-- CHOISIR CHANTIER --</option>
            {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto custom-scrollbar">
          <NavButton id="dashboard" icon={LayoutDashboard} label="Cockpit Sécurité" active={view} set={setView} />
          
          <div className="pt-8 pb-2 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Opérations Terrain</div>
          <button onClick={() => navigateToTool('prejob')} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase transition-all hover:bg-red-500 group">
            <ClipboardCheck size={22} className="text-red-500 group-hover:text-white" /> Pre-Job Briefing
          </button>
          <button onClick={() => navigateToTool('accueil')} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase transition-all hover:bg-green-500 group">
            <UserPlus size={22} className="text-green-500 group-hover:text-white" /> Accueil Sécurité
          </button>
          
          <div className="pt-8 pb-2 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Contrôles & Audits</div>
          <NavButton id="vgp" icon={Wrench} label="Suivi VGP / Matériel" active={view} set={setView} />
          <NavButton id="terrain" icon={Camera} label="Visite VMT / Q3SRE" active={view} set={setView} />
          <NavButton id="causerie" icon={Megaphone} label="Minute Sécurité" active={view} set={setView} />
        </nav>
      </aside>

      {/* CONTENU PRINCIPAL */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
            {view === 'dashboard' && <HSECockpit stats={stats} chantiers={chantiers} />}
            {view === 'vgp' && <VGPModule materiel={materiel} />}
            {view === 'terrain' && <div className="p-20 text-center text-gray-300 font-black uppercase border-4 border-dashed rounded-[40px]">Module Audit VMT en cours de déploiement</div>}
            {view === 'causerie' && <div className="p-20 text-center text-gray-300 font-black uppercase border-4 border-dashed rounded-[40px]">Module Causerie en cours de déploiement</div>}
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// SOUS-COMPOSANTS
// ============================================================================

function HSECockpit({ stats, chantiers }: any) {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black text-[#2d3436] uppercase tracking-tighter">Cockpit <span className="text-red-600">Sécurité</span></h2>
                    <p className="text-gray-400 font-bold uppercase text-xs mt-2 tracking-widest">Statistiques globales en temps réel</p>
                </div>
                <div className="flex gap-2">
                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-green-50 text-green-500 flex items-center justify-center"><ShieldCheck/></div>
                        <div><p className="text-[10px] font-black text-gray-400 uppercase">Taux Fréquence</p><p className="text-xl font-black text-gray-800">0.00</p></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label="Accueils Sécurité" val={stats.activeInductions} sub="Total validés" icon={UserPlus} color="blue" />
                <StatCard label="Alertes VGP" val={stats.vgpAlerts} sub="Matériel à contrôler" icon={AlertOctagon} color={stats.vgpAlerts > 0 ? "red" : "green"} />
                <StatCard label="Pre-Jobs" val="12" sub="Cette semaine" icon={ClipboardCheck} color="orange" />
            </div>

            <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100">
                <h3 className="font-black uppercase text-gray-700 mb-6 flex items-center gap-2">
                    <Activity size={20} className="text-red-500"/> 
                    Chantiers sous surveillance
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {chantiers.map((c:any) => (
                        <div key={c.id} className="p-5 rounded-[25px] bg-gray-50 border border-gray-100 flex justify-between items-center group hover:bg-white hover:shadow-lg transition-all">
                            <div>
                                <p className="font-black text-gray-800 uppercase text-sm">{c.nom}</p>
                                <p className="text-[10px] font-bold text-gray-400">{c.client}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                <ArrowRight size={16} className="text-gray-300 group-hover:text-red-500 transition-colors"/>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function VGPModule({ materiel }: any) {
    return (
        <div className="animate-in fade-in space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black uppercase text-gray-800">Registre de Sécurité Matériel</h2>
                <button className="bg-black text-white px-6 py-2.5 rounded-xl font-black uppercase text-xs shadow-lg hover:scale-105 transition-all flex items-center gap-2">
                    <Plus size={16}/> Ajouter Équipement
                </button>
            </div>
            <div className="bg-white rounded-[35px] border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Équipement</th>
                            <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">N° Série</th>
                            <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Dernier Contrôle</th>
                            <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Statut</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {materiel.map((m:any) => {
                            const isExpired = m.derniere_vgp ? (new Date(m.derniere_vgp) < new Date(new Date().setFullYear(new Date().getFullYear() - 1))) : true;
                            return (
                                <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-6 font-bold text-gray-800">{m.nom}</td>
                                    <td className="p-6 text-sm font-mono text-gray-500">{m.id.slice(0,8).toUpperCase()}</td>
                                    <td className="p-6 text-sm font-bold text-gray-600">{m.derniere_vgp ? new Date(m.derniere_vgp).toLocaleDateString() : 'Non vérifié'}</td>
                                    <td className="p-6">
                                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${isExpired ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                                            {isExpired ? 'À CONTRÔLER' : 'OPÉRATIONNEL'}
                                        </span>
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

const NavButton = ({id, icon: Icon, label, active, set, disabled}: any) => (
    <button 
        onClick={() => !disabled && set(id)} 
        disabled={disabled} 
        className={`w-full flex items-center gap-4 px-6 py-4 rounded-[22px] text-[11px] font-black uppercase transition-all ${active === id ? 'bg-red-600 text-white shadow-xl shadow-red-200' : 'text-gray-400 hover:bg-white/5 hover:text-white'} ${disabled ? 'opacity-20 cursor-not-allowed' : ''}`}
    >
        <Icon size={20} /> {label}
    </button>
);

const StatCard = ({ label, val, sub, icon: Icon, color }: any) => {
    const themes:any = { 
        red: "bg-red-50 text-red-600 border-red-100", 
        blue: "bg-blue-50 text-blue-600 border-blue-100", 
        green: "bg-emerald-50 text-emerald-600 border-emerald-100", 
        orange: "bg-orange-50 text-orange-600 border-orange-100" 
    };
    return (
        <div className="p-8 rounded-[35px] border bg-white shadow-sm flex justify-between items-start group hover:shadow-xl transition-all">
            <div>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3">{label}</p>
                <p className="text-4xl font-black text-gray-800 tracking-tighter leading-none">{val}</p>
                <p className={`text-[10px] font-bold mt-4 uppercase ${themes[color].split(' ')[1]}`}>{sub}</p>
            </div>
            <div className={`p-4 rounded-2xl ${themes[color].split(' ').slice(0,2).join(' ')} group-hover:scale-110 transition-transform`}>
                <Icon size={24}/>
            </div>
        </div>
    )
};