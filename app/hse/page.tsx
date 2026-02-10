"use client";

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ShieldCheck, AlertTriangle, FileText, HardHat, 
  ClipboardCheck, Siren, Users, CalendarRange, 
  Search, Plus, Printer, QrCode, Download,
  CheckCircle2, XCircle, Clock, MapPin, Construction,
  Filter, FileCheck, ArrowRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie 
} from 'recharts';

// --- TYPES ---
type ViewMode = 'dashboard' | 'documents' | 'causeries' | 'accidents' | 'staff' | 'materiel' | 'actions' | 'badges';

export default function HSEPlatform() {
  const [view, setView] = useState<ViewMode>('dashboard');
  const [loading, setLoading] = useState(true);
  
  // --- STATE DONNÉES ---
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [selectedChantier, setSelectedChantier] = useState<string | null>(null); // NULL = GLOBAL
  
  const [docs, setDocs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [equipements, setEquipements] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  // --- INIT & SYNC ---
  useEffect(() => {
    fetchGlobalData();
  }, []);

  useEffect(() => {
    fetchOperationalData();
  }, [selectedChantier]); // Re-fetch quand on change de chantier

  const fetchGlobalData = async () => {
    const { data } = await supabase.from('chantiers').select('id, nom, adresse').eq('statut', 'en_cours');
    if (data) setChantiers(data);
  };

  const fetchOperationalData = async () => {
    setLoading(true);
    
    // Construction des requêtes de base
    let qDocs = supabase.from('hse_documents').select('*, chantiers(nom)');
    let qEvents = supabase.from('hse_events').select('*, chantiers(nom)');
    let qEquip = supabase.from('hse_equipements').select('*, chantiers(nom)');
    let qStaff = supabase.from('employes').select('*'); // Staff est global par défaut, mais on peut filtrer par affectation si besoin

    // Filtrage CHANTIER si sélectionné
    if (selectedChantier) {
      qDocs = qDocs.or(`chantier_id.eq.${selectedChantier},chantier_id.is.null`); // Voir Global + Chantier
      qEvents = qEvents.eq('chantier_id', selectedChantier);
      qEquip = qEquip.eq('chantier_id', selectedChantier);
    }

    const [rDocs, rEvents, rEquip, rStaff] = await Promise.all([qDocs, qEvents, qEquip, qStaff]);

    if (rDocs.data) setDocs(rDocs.data);
    if (rEvents.data) setEvents(rEvents.data);
    if (rEquip.data) setEquipements(rEquip.data);
    if (rStaff.data) setStaff(rStaff.data);
    
    setLoading(false);
  };

  // --- GENERATEURS (Logique Opérationnelle) ---
  const generatePPSPS = () => {
    if (!selectedChantier) {
      alert("⚠️ SÉCURITÉ : Veuillez sélectionner un chantier pour générer son PPSPS spécifique.");
      return;
    }
    const chantier = chantiers.find(c => c.id === selectedChantier);
    const w = window.open('', '_blank');
    w?.document.write(`
      <html><head><title>PPSPS - ${chantier.nom}</title></head>
      <body style="font-family: sans-serif; padding: 40px;">
        <h1 style="color: #2d3436;">PPSPS SIMPLIFIÉ</h1>
        <h2>Chantier : ${chantier.nom}</h2>
        <p>Adresse : ${chantier.adresse}</p>
        <hr/>
        <h3>1. Description des travaux</h3>
        <p>Travaux de construction / rénovation standard...</p>
        <h3>2. Analyse des Risques</h3>
        <ul>
          <li>Chutes de hauteur : Protection collective prioritaire.</li>
          <li>Électricité : Armoires fermées à clé.</li>
          <li>Coactivité : Planning de charge mis à jour hebdo.</li>
        </ul>
        <h3>3. Urgences</h3>
        <p>Pompiers : 18 | SAMU : 15 | Responsable HSE : 06...</p>
        <br/><br/>
        <p><i>Document généré automatiquement par Altrad.OS le ${new Date().toLocaleDateString()}</i></p>
        <script>window.print();</script>
      </body></html>
    `);
  };

  const generateBadge = (employe: any) => {
    if (!selectedChantier) {
        alert("Pour créer un badge d'accès, choisissez un chantier.");
        return;
    }
    const chantier = chantiers.find(c => c.id === selectedChantier);
    const w = window.open('', '_blank');
    // Simulation QR Code via API externe pour l'exemple opérationnel sans lib lourde
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${employe.id}-${selectedChantier}`;
    
    w?.document.write(`
      <html><body style="font-family: sans-serif; text-align: center; padding: 20px;">
        <div style="border: 2px solid black; border-radius: 10px; padding: 20px; width: 300px; margin: auto;">
          <h2 style="margin: 0; color: #e74c3c;">ACCÈS CHANTIER</h2>
          <h3 style="margin: 10px 0;">${chantier.nom}</h3>
          <hr/>
          <h1 style="margin: 20px 0;">${employe.prenom} ${employe.nom}</h1>
          <p>${employe.role || 'Compagnon'}</p>
          <img src="${qrUrl}" alt="QR Code" />
          <p style="font-size: 10px;">Valide pour la durée du chantier</p>
        </div>
        <script>window.print();</script>
      </body></html>
    `);
  };

  // --- UTILS DATE ---
  const checkDate = (dateStr: string) => {
    if (!dateStr) return { status: 'none', label: '-' };
    const d = new Date(dateStr);
    const now = new Date();
    const diffTime = d.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { status: 'expired', label: 'Expiré', color: 'bg-red-100 text-red-600' };
    if (diffDays < 30) return { status: 'warning', label: `${diffDays}j`, color: 'bg-orange-100 text-orange-600' };
    return { status: 'ok', label: 'OK', color: 'bg-emerald-100 text-emerald-600' };
  };

  // --- STATS CALCUL ---
  const stats = {
    accidents: events.filter(e => e.type === 'accident').length,
    causeries: events.filter(e => e.type === 'causerie').length,
    vgpRetard: equipements.filter(e => checkDate(e.date_prochaine_verif).status === 'expired').length,
    habExp: staff.filter(s => checkDate(s.sst_date).status === 'expired' || checkDate(s.caces_date).status === 'expired').length
  };

  // --- VUES COMPOSANTS ---

  const Dashboard = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Tile label="Accidents (Année)" val={stats.accidents} icon={Siren} color={stats.accidents > 0 ? "red" : "emerald"} />
        <Tile label="VGP Retard" val={stats.vgpRetard} icon={ClipboardCheck} color={stats.vgpRetard > 0 ? "red" : "gray"} />
        <Tile label="Habilitations Exp." val={stats.habExp} icon={Users} color={stats.habExp > 0 ? "orange" : "blue"} />
        <Tile label="Causeries Réalisées" val={stats.causeries} icon={ShieldCheck} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[320px]">
          <h3 className="font-black text-gray-800 mb-4 text-sm uppercase">Répartition Événements</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              {name: 'Accidents', val: events.filter(e => e.type === 'accident').length},
              {name: 'Presqu\'acc.', val: events.filter(e => e.type === 'presqu_accident').length},
              {name: 'Causeries', val: events.filter(e => e.type === 'causerie').length},
              {name: 'Visites', val: events.filter(e => e.type === 'visite').length},
            ]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip />
              <Bar dataKey="val" fill="#0984e3" radius={[4,4,0,0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-black text-gray-800 text-sm uppercase">Accès Rapide</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <ActionButton icon={FileText} label="Générer PPSPS" onClick={generatePPSPS} />
            <ActionButton icon={Siren} label="Déclarer Accident" onClick={() => setView('accidents')} />
            <ActionButton icon={Users} label="Créer Badge" onClick={() => setView('badges')} />
            <ActionButton icon={ShieldCheck} label="Nouvelle Causerie" onClick={() => setView('causeries')} />
          </div>
          <div className="mt-6 pt-6 border-t border-gray-100">
             <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Dernières Alertes</h4>
             {events.slice(0,2).map(e => (
               <div key={e.id} className="flex items-center gap-3 mb-2">
                 <div className={`w-2 h-2 rounded-full ${e.type==='accident'?'bg-red-500':'bg-blue-500'}`}></div>
                 <div className="flex-1">
                   <p className="text-xs font-bold">{e.type} - {e.titre || 'Sans titre'}</p>
                   <p className="text-[10px] text-gray-400">{new Date(e.date_event).toLocaleDateString()} - {e.chantiers?.nom}</p>
                 </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );

  const DocumentsList = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="font-black text-sm uppercase">Bibliothèque Documentaire</h3>
            <button onClick={generatePPSPS} className="bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase flex items-center gap-2">
                <FileText size={14}/> Générer PPSPS
            </button>
        </div>
        <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase text-gray-400">
                <tr>
                    <th className="p-4">Nom</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Portée</th>
                    <th className="p-4">Validité</th>
                    <th className="p-4 text-right">Action</th>
                </tr>
            </thead>
            <tbody className="text-sm">
                {docs.map(d => {
                    const check = checkDate(d.validite_date);
                    return (
                        <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="p-4 font-bold">{d.nom}</td>
                            <td className="p-4"><span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-[10px] font-black uppercase">{d.type}</span></td>
                            <td className="p-4">
                                {d.chantier_id 
                                    ? <span className="flex items-center gap-1 text-xs font-bold text-gray-600"><MapPin size={12}/> {d.chantiers?.nom}</span>
                                    : <span className="flex items-center gap-1 text-xs font-bold text-purple-600"><Filter size={12}/> Global</span>
                                }
                            </td>
                            <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold ${check.color}`}>{d.validite_date || 'Illimité'}</span></td>
                            <td className="p-4 text-right"><Download size={16} className="ml-auto text-gray-400 cursor-pointer hover:text-black"/></td>
                        </tr>
                    )
                })}
            </tbody>
        </table>
    </div>
  );

  const StaffMatrix = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="font-black text-sm uppercase">Matrice Habilitations</h3>
            {selectedChantier && <button onClick={() => setView('badges')} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase flex items-center gap-2"><QrCode size={14}/> Badges Chantier</button>}
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase text-gray-400">
                    <tr>
                        <th className="p-4">Collaborateur</th>
                        <th className="p-4 text-center">SST</th>
                        <th className="p-4 text-center">CACES</th>
                        <th className="p-4 text-center">Élec</th>
                        <th className="p-4 text-center">Hauteur</th>
                        <th className="p-4 text-center">Badge</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {staff.map(s => (
                        <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="p-4 font-bold">{s.nom} {s.prenom}</td>
                            {['sst_date', 'caces_date', 'elec_date', 'travail_hauteur_date'].map(field => {
                                const check = checkDate(s[field]);
                                return (
                                    <td key={field} className="p-4 text-center">
                                        <div className={`inline-block px-2 py-1 rounded text-[10px] font-black uppercase ${check.color}`}>{check.label}</div>
                                    </td>
                                )
                            })}
                            <td className="p-4 text-center">
                                <button onClick={() => generateBadge(s)} className="text-gray-400 hover:text-blue-600"><QrCode size={16}/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );

  const EquipmentCheck = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase text-gray-400">
                <tr>
                    <th className="p-4">Équipement</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Localisation</th>
                    <th className="p-4">Prochaine VGP</th>
                    <th className="p-4 text-center">État</th>
                </tr>
            </thead>
            <tbody className="text-sm">
                {equipements.map(e => {
                    const check = checkDate(e.date_prochaine_verif);
                    return (
                        <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="p-4 font-bold">{e.nom}</td>
                            <td className="p-4 text-xs text-gray-500 uppercase">{e.type}</td>
                            <td className="p-4 text-xs font-bold">{e.chantiers?.nom || 'Dépôt'}</td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold ${check.color}`}>{e.date_prochaine_verif}</span>
                            </td>
                            <td className="p-4 text-center">
                                {e.etat === 'conforme' ? <CheckCircle2 size={16} className="text-emerald-500 mx-auto"/> : <XCircle size={16} className="text-red-500 mx-auto"/>}
                            </td>
                        </tr>
                    )
                })}
            </tbody>
        </table>
    </div>
  );

  // --- LAYOUT ---
  return (
    <div className="min-h-screen bg-[#f0f3f4] font-sans text-gray-800 flex flex-col">
      
      {/* HEADER TOP BAR */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
            <div className="bg-red-600 text-white p-2 rounded-lg"><ShieldCheck size={24}/></div>
            <div>
                <h1 className="text-xl font-black uppercase text-gray-900 leading-none">HSE<span className="text-red-600">.Safety</span></h1>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pilotage Sécurité</p>
            </div>
        </div>

        {/* SELECTEUR CHANTIER - CRUCIAL POUR LA SYNCHRO */}
        <div className="flex items-center gap-3 bg-gray-100 p-1 rounded-xl">
            <button 
                onClick={() => setSelectedChantier(null)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${!selectedChantier ? 'bg-white shadow text-black' : 'text-gray-400 hover:text-gray-600'}`}
            >
                Global Entreprise
            </button>
            <div className="h-4 w-[1px] bg-gray-300"></div>
            <select 
                className={`bg-transparent text-xs font-bold uppercase outline-none px-2 py-2 cursor-pointer ${selectedChantier ? 'text-blue-600' : 'text-gray-400'}`}
                onChange={(e) => setSelectedChantier(e.target.value || null)}
                value={selectedChantier || ''}
            >
                <option value="">Sélectionner un chantier...</option>
                {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <nav className="px-6 pt-6 pb-2 overflow-x-auto">
        <div className="flex gap-2">
            <NavTab label="Tableau de bord" id="dashboard" icon={ShieldCheck} active={view} set={setView} />
            <NavTab label="Documents" id="documents" icon={FileText} active={view} set={setView} />
            <NavTab label="Causeries" id="causeries" icon={Users} active={view} set={setView} />
            <NavTab label="Accidents" id="accidents" icon={Siren} active={view} set={setView} />
            <NavTab label="Habilitations" id="staff" icon={ClipboardCheck} active={view} set={setView} />
            <NavTab label="Matériel & VGP" id="materiel" icon={HardHat} active={view} set={setView} />
        </div>
      </nav>

      {/* CONTENU PRINCIPAL */}
      <main className="flex-1 p-6 overflow-y-auto">
        {loading ? (
            <div className="flex items-center justify-center h-64 text-gray-400 font-bold animate-pulse">Chargement HSE...</div>
        ) : (
            <>
                {view === 'dashboard' && <Dashboard />}
                {view === 'documents' && <DocumentsList />}
                {view === 'staff' && <StaffMatrix />}
                {view === 'materiel' && <EquipmentCheck />}
                
                {/* Vues simples pour Causeries/Accidents (Tableau similaire) */}
                {(view === 'causeries' || view === 'accidents') && (
                    <div className="bg-white rounded-2xl p-8 text-center border border-gray-200">
                        <Construction size={48} className="mx-auto text-gray-300 mb-4"/>
                        <h3 className="font-black text-gray-400 uppercase">Module {view} actif</h3>
                        <p className="text-sm text-gray-400 mt-2">
                            Liste filtrée pour : <span className="text-black font-bold">{selectedChantier ? chantiers.find(c => c.id === selectedChantier)?.nom : 'Tous les chantiers'}</span>
                        </p>
                        <div className="mt-6 flex justify-center gap-4">
                            {events.filter(e => view === 'causeries' ? e.type === 'causerie' : e.type === 'accident').map(e => (
                                <div key={e.id} className="text-left bg-gray-50 p-4 rounded-xl border border-gray-200 w-64">
                                    <div className="font-bold text-sm mb-1">{e.titre || 'Événement'}</div>
                                    <div className="text-xs text-gray-500">{new Date(e.date_event).toLocaleDateString()}</div>
                                    <div className="mt-2 text-[10px] font-black uppercase bg-white px-2 py-1 rounded inline-block border border-gray-100">{e.chantiers?.nom}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {view === 'badges' && <StaffMatrix />} {/* Raccourci vers matrice pour générer */}
            </>
        )}
      </main>

    </div>
  );
}

// --- SOUS-COMPOSANTS ---

const Tile = ({ label, val, icon: Icon, color }: any) => {
    const colors: any = {
        red: "bg-red-50 text-red-600 border-red-100",
        orange: "bg-orange-50 text-orange-600 border-orange-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        gray: "bg-white text-gray-800 border-gray-100"
    };
    return (
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${colors[color] || colors.gray} shadow-sm`}>
            <div>
                <p className="text-[10px] font-bold uppercase opacity-60">{label}</p>
                <p className="text-3xl font-black tracking-tight">{val}</p>
            </div>
            <div className="bg-white/50 p-3 rounded-xl"><Icon size={24}/></div>
        </div>
    )
};

const ActionButton = ({ icon: Icon, label, onClick }: any) => (
    <button onClick={onClick} className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 border border-gray-100 hover:border-blue-200 rounded-xl transition-all group">
        <Icon size={24} className="mb-2 text-gray-400 group-hover:text-blue-600"/>
        <span className="text-[10px] font-black uppercase text-center">{label}</span>
    </button>
);

const NavTab = ({ label, id, icon: Icon, active, set }: any) => (
    <button 
        onClick={() => set(id)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap ${
            active === id 
            ? 'bg-black text-white shadow-lg' 
            : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-100'
        }`}
    >
        <Icon size={14}/> {label}
    </button>
);
