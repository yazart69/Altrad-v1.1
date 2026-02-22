"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, FileText, Wrench, Camera, Megaphone, ShieldCheck, AlertTriangle, 
  CheckCircle2, HardHat, FileCheck, X, ChevronRight, ClipboardCheck, Factory, 
  Truck, QrCode, ExternalLink, UserPlus, Paperclip, Loader2, Printer, AlertOctagon, 
  Siren, Activity, ArrowRight, Plus, Eye, ArrowLeft, Users,
  Trophy
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// ============================================================================
// COMPOSANT MAÎTRE
// ============================================================================

export default function HSEDashboardPage() {
  const router = useRouter();
  const [view, setView] = useState<'dashboard'|'vgp'|'terrain'|'causerie'|'accueils'>('dashboard');
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

  // CORRECTION ICI : On a ajouté 'vmt' aux options permises par TypeScript
  const navigateToTool = (tool: 'prejob' | 'accueil' | 'audit' | 'causerie' | 'rex') => {
    if (!activeChantierId) return toast.error("Sélectionnez un chantier d'abord");
    router.push(`/hse/${tool}?cid=${activeChantierId}`);
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-red-600" size={40}/></div>;

  return (
    <div className="flex min-h-screen bg-[#f8f9fa] font-['Fredoka'] text-gray-800">
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
            <UserPlus size={22} className="text-green-500 group-hover:text-white" /> Réaliser Accueil
          </button>
          <button onClick={() => navigateToTool('audit')} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase transition-all hover:bg-blue-500 group">
            <Camera size={22} className="text-blue-500 group-hover:text-white" /> Visite VMT / Q3SRE
          </button>
          
          <div className="pt-8 pb-2 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Registres & Audits</div>
          <NavButton id="accueils" icon={Users} label="Registre Accueils" active={view} set={setView} />
          <NavButton id="vgp" icon={Wrench} label="Suivi VGP / Matériel" active={view} set={setView} />
          <button onClick={() => navigateToTool('causerie')} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase transition-all hover:bg-orange-500 group">
    <Megaphone size={22} className="text-orange-500 group-hover:text-white" /> Minute Sécurité
</button>
          <button onClick={() => navigateToTool('rex')} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase transition-all hover:bg-purple-500 group">
    <Trophy size={22} className="text-purple-500 group-hover:text-white" /> REX
</button>
        </nav>
      </aside>

      {/* CONTENU PRINCIPAL */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
            {view === 'dashboard' && <HSECockpit stats={stats} chantiers={chantiers} setView={setView} />}
            {view === 'accueils' && <RegistreAccueils />}
            {view === 'vgp' && <VGPModule materiel={materiel} />}
            {view === 'causerie' && <div className="p-20 text-center text-gray-300 font-black uppercase border-4 border-dashed rounded-[40px]">Module Causerie en cours de déploiement</div>}
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// SOUS-COMPOSANTS
// ============================================================================

function HSECockpit({ stats, chantiers, setView }: any) {
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
                <div onClick={() => setView('accueils')} className="cursor-pointer">
                    <StatCard label="Accueils Sécurité" val={stats.activeInductions} sub="Total validés (Cliquez pour voir)" icon={UserPlus} color="blue" />
                </div>
                <div onClick={() => setView('vgp')} className="cursor-pointer">
                    <StatCard label="Alertes VGP" val={stats.vgpAlerts} sub="Matériel à contrôler" icon={AlertOctagon} color={stats.vgpAlerts > 0 ? "red" : "green"} />
                </div>
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

// ============================================================================
// MODULE : REGISTRE DES ACCUEILS 
// ============================================================================
function RegistreAccueils() {
    const [accueils, setAccueils] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAccueil, setSelectedAccueil] = useState<any>(null);

    useEffect(() => {
        const fetchAccueils = async () => {
            const { data } = await supabase.from('hse_accueils_securite').select('*, chantiers(nom)').order('created_at', { ascending: false });
            setAccueils(data || []);
            setLoading(false);
        };
        fetchAccueils();
    }, []);

    if (selectedAccueil) {
        return (
            <div className="animate-in fade-in">
                <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                        @page { size: A4 portrait; margin: 10mm; }
                        body * { visibility: hidden; }
                        .print-container, .print-container * { visibility: visible; }
                        .print-container { position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; margin: 0; padding: 0; box-shadow: none; border: none; }
                        .no-print { display: none !important; }
                    }
                `}}/>

                <div className="flex justify-between items-center mb-6 no-print">
                    <button onClick={() => setSelectedAccueil(null)} className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200 text-gray-500 hover:text-black font-bold transition-all">
                        <ArrowLeft size={18}/> Retour à la liste
                    </button>
                    <button onClick={() => { setTimeout(() => window.print(), 300); }} className="bg-[#2d3436] hover:bg-black text-white px-6 py-2.5 rounded-xl font-black uppercase text-xs flex items-center gap-2 shadow-lg transition-all">
                        <Printer size={16}/> Imprimer la fiche d'accueil
                    </button>
                </div>

                <div className="print-container bg-white p-10 rounded-[35px] shadow-2xl border border-gray-100 max-w-3xl mx-auto text-sm">
                    <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tight">FICHE D'ACCUEIL SÉCURITÉ</h1>
                            <p className="text-sm font-bold text-gray-500 uppercase mt-1">Nouveau personnel / Sous-traitant</p>
                        </div>
                        <div className="text-right">
                            <p className="border border-black px-3 py-1 font-bold uppercase text-xs">Date : {new Date(selectedAccueil.created_at).toLocaleDateString()}</p>
                            <p className="text-xs font-bold text-gray-500 mt-2">Réf. Chantier : {selectedAccueil.chantiers?.nom}</p>
                        </div>
                    </div>

                    <div className="bg-gray-50 border border-gray-300 p-4 mb-6">
                        <h2 className="font-black uppercase border-b border-gray-300 pb-1 mb-3 text-sm">1. Identification de l'arrivant</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div><span className="text-gray-500 uppercase text-xs mr-2">Nom :</span> <span className="font-bold">{selectedAccueil.nom}</span></div>
                            <div><span className="text-gray-500 uppercase text-xs mr-2">Prénom :</span> <span className="font-bold">{selectedAccueil.prenom}</span></div>
                            <div><span className="text-gray-500 uppercase text-xs mr-2">Entreprise :</span> <span className="font-bold">{selectedAccueil.entreprise}</span></div>
                            <div><span className="text-gray-500 uppercase text-xs mr-2">Statut :</span> <span className="font-bold uppercase">{selectedAccueil.type_personnel}</span></div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h2 className="font-black uppercase border-b border-gray-300 pb-1 mb-3 text-sm">2. Documents Supports Présentés</h2>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <p><span className="text-gray-500 mr-2">PPSPS / PDP :</span> <span className="font-bold">{selectedAccueil.documents_cadres?.ppsps || 'N/A'}</span></p>
                            <p><span className="text-gray-500 mr-2">PHSE :</span> <span className="font-bold">{selectedAccueil.documents_cadres?.phse || 'N/A'}</span></p>
                            <p><span className="text-gray-500 mr-2">Plan Qualité (PQC) :</span> <span className="font-bold">{selectedAccueil.documents_cadres?.pqc || 'N/A'}</span></p>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h2 className="font-black uppercase border-b border-gray-300 pb-1 mb-3 text-sm">3. Points abordés lors de la sensibilisation</h2>
                        <ul className="list-disc pl-5 space-y-1 text-xs font-bold text-gray-800">
                            {(selectedAccueil.checklist_validee || []).map((item: string, idx: number) => (
                                <li key={idx}>{item}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="mb-8">
                        <h2 className="font-black uppercase border-b border-gray-300 pb-1 mb-3 text-sm">4. Contrôles préalables (Aptitudes)</h2>
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-1">
                                <span className="font-bold">Aptitude Médicale à jour</span>
                                <span className={`font-black uppercase ${selectedAccueil.controles_prealables?.aptitude_medicale ? 'text-green-600' : 'text-red-600'}`}>
                                    {selectedAccueil.controles_prealables?.aptitude_medicale ? 'Oui' : 'Non'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center border-b border-gray-100 pb-1">
                                <span className="font-bold">Carte BTP (ou pièce d'identité)</span>
                                <span className={`font-black uppercase ${selectedAccueil.controles_prealables?.carte_btp ? 'text-green-600' : 'text-red-600'}`}>
                                    {selectedAccueil.controles_prealables?.carte_btp ? 'Oui' : 'Non'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center border-b border-gray-100 pb-1">
                                <span className="font-bold">Habilitations spécifiques (Hauteur, Élec...)</span>
                                <span className={`font-black uppercase ${selectedAccueil.controles_prealables?.habilitations_specifiques ? 'text-green-600' : 'text-red-600'}`}>
                                    {selectedAccueil.controles_prealables?.habilitations_specifiques ? 'Oui' : 'Non'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="border border-black">
                        <div className="bg-gray-100 border-b border-black p-2 font-black uppercase text-xs">Engagement et Émargement de l'arrivant</div>
                        <p className="p-2 text-[10px] italic text-gray-600 text-justify">
                            "Je soussigné(e) atteste avoir suivi la sensibilisation au démarrage du chantier. J'ai pris connaissance des documents cadres et je m'engage à respecter les consignes QHSE applicables. J'atteste disposer des aptitudes médicales requises pour mon poste."
                        </p>
                        <div className="p-4 flex items-center justify-center min-h-[120px]">
                            {selectedAccueil.signature_url ? (
                                <img src={selectedAccueil.signature_url} alt="Signature" className="max-h-20" />
                            ) : (
                                <span className="text-gray-300 italic">Aucune signature</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black uppercase text-gray-800 flex items-center gap-3">
                    <Users className="text-blue-500" /> Registre des Accueils Sécurité
                </h2>
            </div>

            {loading ? (
                <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-gray-400" size={40} /></div>
            ) : (
                <div className="bg-white rounded-[35px] border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Arrivant</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Entreprise / Statut</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Chantier d'accueil</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {accueils.length === 0 && <tr><td colSpan={5} className="p-10 text-center font-bold text-gray-400">Aucun accueil enregistré.</td></tr>}
                            {accueils.map((acc:any) => (
                                <tr key={acc.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-6 text-sm font-bold text-gray-500">{new Date(acc.created_at).toLocaleDateString()}</td>
                                    <td className="p-6 font-black text-gray-800 uppercase">{acc.nom} {acc.prenom}</td>
                                    <td className="p-6">
                                        <div className="text-sm font-bold text-gray-600">{acc.entreprise}</div>
                                        <div className="text-[9px] font-black text-blue-500 uppercase mt-1">{acc.type_personnel}</div>
                                    </td>
                                    <td className="p-6 text-sm font-bold text-[#0984e3] flex items-center gap-2 mt-2">
                                        <ShieldCheck size={14}/> {acc.chantiers?.nom || 'Inconnu'}
                                    </td>
                                    <td className="p-6 text-right">
                                        <button onClick={() => setSelectedAccueil(acc)} className="p-3 bg-white rounded-xl text-gray-400 hover:text-blue-500 border border-gray-200 shadow-sm transition-all" title="Consulter la fiche">
                                            <Eye size={18}/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// VGP MODULE
// ============================================================================
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