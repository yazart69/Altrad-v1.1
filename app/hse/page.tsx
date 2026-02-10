"use client";

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase'; // Assurez-vous que ce fichier existe
import { 
  ShieldCheck, AlertTriangle, FileText, HardHat, 
  ClipboardCheck, Siren, Users, CalendarRange, 
  Search, Plus, Printer, QrCode, Download,
  CheckCircle2, XCircle, Clock, MapPin, Construction,
  Filter, FileCheck, ArrowRight, Table, LayoutDashboard,
  Megaphone, FolderOpen
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie 
} from 'recharts';

// --- BASE DE DONNÉES RISQUES (Issue de votre Excel) ---
const RISK_DATABASE = [
  {
    id: 'echafaudage',
    task: "Montage échafaudage",
    risks: ["Chute de hauteur", "Chute d'objet", "Effondrement structure"],
    measures: ["Respect procédure montage", "Personnel habilité", "Port harnais double longe", "Balisage zone", "Vérification journalière"]
  },
  {
    id: 'calorifuge',
    task: "Décalorifugeage / Isolation",
    risks: ["Coupure/Piqûre", "Poussière (Fibres)", "Chute plain pied"],
    measures: ["Gants anti-coupure", "Masque P3", "Combinaison jetable", "Humidification des fibres", "Aspiration à la source"]
  },
  {
    id: 'capacite',
    task: "Travaux en capacité / Confinés",
    risks: ["Anoxie/Asphyxie", "Intoxication", "Explosion (ATEX)"],
    measures: ["Permis de pénétrer", "Surveillant extérieur permanent", "Ventilation forcée", "Détecteur 4 gaz", "EPI spécifiques"]
  },
  {
    id: 'nacelle',
    task: "Utilisation nacelle (PEMP)",
    risks: ["Chute de hauteur", "Renversement", "Heurt"],
    measures: ["CACES valide", "Harnais obligatoire dans le panier", "Balisage au sol", "Vérification VGP valide"]
  },
  {
    id: 'peinture',
    task: "Application Peinture / Solvants",
    risks: ["Risque chimique", "Incendie / Explosion", "Projection"],
    measures: ["Consultation FDS", "Ventilation locale", "Masque cartouche A2P3", "Extincteur à proximité immédiate"]
  }
];

export default function HSEPlatform() {
  // --- STATES ---
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [selectedChantier, setSelectedChantier] = useState<string | null>(null);
  
  // Data
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [equipements, setEquipements] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);

  // Generator State
  const [ppspsTasks, setPpspsTasks] = useState<string[]>([]);

  // --- INITIALISATION ---
  useEffect(() => {
    fetchGlobalData();
  }, []);

  useEffect(() => {
    fetchOperationalData();
  }, [selectedChantier]);

  const fetchGlobalData = async () => {
    const { data } = await supabase.from('chantiers').select('*').eq('statut', 'en_cours');
    if (data) setChantiers(data);
  };

  const fetchOperationalData = async () => {
    setLoading(true);
    
    // Requêtes de base
    let qDocs = supabase.from('hse_documents').select('*, chantiers(nom)');
    let qEvents = supabase.from('hse_events').select('*, chantiers(nom)');
    let qEquip = supabase.from('hse_equipements').select('*, chantiers(nom)');
    let qActions = supabase.from('hse_actions').select('*, chantiers(nom)');
    
    // Le personnel est global, mais on pourrait filtrer par affectation si la table le permettait
    let qStaff = supabase.from('employes').select('*'); 

    // FILTRE CHANTIER (Cœur de la synchro)
    if (selectedChantier) {
      qDocs = qDocs.or(`chantier_id.eq.${selectedChantier},chantier_id.is.null`);
      qEvents = qEvents.eq('chantier_id', selectedChantier);
      qEquip = qEquip.eq('chantier_id', selectedChantier);
      qActions = qActions.eq('chantier_id', selectedChantier);
    }

    const [rDocs, rEvents, rEquip, rStaff, rActions] = await Promise.all([qDocs, qEvents, qEquip, qStaff, qActions]);

    if (rDocs.data) setDocs(rDocs.data);
    if (rEvents.data) setEvents(rEvents.data);
    if (rEquip.data) setEquipements(rEquip.data);
    if (rStaff.data) setStaff(rStaff.data);
    if (rActions.data) setActions(rActions.data);
    
    setLoading(false);
  };

  // --- LOGIQUE MÉTIER & GÉNÉRATEURS ---

  const checkDate = (dateStr: string) => {
    if (!dateStr) return { status: 'none', label: '-', color: 'bg-gray-100 text-gray-400' };
    const d = new Date(dateStr);
    const now = new Date();
    const diffTime = d.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { status: 'expired', label: 'EXPIRÉ', color: 'bg-red-100 text-red-600 border-red-200' };
    if (diffDays < 30) return { status: 'warning', label: `${diffDays}j`, color: 'bg-orange-100 text-orange-600 border-orange-200' };
    return { status: 'ok', label: 'VALIDE', color: 'bg-emerald-100 text-emerald-600 border-emerald-200' };
  };

  const generateSmartPPSPS = () => {
    if (!selectedChantier) {
      alert("⚠️ ERREUR : Veuillez sélectionner un chantier en haut à droite pour générer un document spécifique.");
      return;
    }
    if (ppspsTasks.length === 0) {
      alert("⚠️ ERREUR : Veuillez sélectionner au moins une tâche à analyser.");
      return;
    }

    const chantier = chantiers.find(c => c.id === selectedChantier);
    const selectedRisks = RISK_DATABASE.filter(r => ppspsTasks.includes(r.id));

    // Construction HTML pour impression
    const w = window.open('', '_blank');
    w?.document.write(`
      <html>
        <head>
          <title>PPSPS - ${chantier.nom}</title>
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; }
            h1 { color: #e74c3c; border-bottom: 3px solid #e74c3c; padding-bottom: 10px; }
            h2 { background: #eee; padding: 10px; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
            th { background: #34495e; color: white; }
            .meta { margin-bottom: 30px; }
            .danger { color: red; font-weight: bold; }
          </style>
        </head>
        <body>
          <div style="text-align:right;">Réf: PPSPS-${chantier.id.substring(0,4)} | Date: ${new Date().toLocaleDateString()}</div>
          <h1>PPSPS SIMPLIFIÉ & OPÉRATIONNEL</h1>
          
          <div class="meta">
            <strong>Chantier :</strong> ${chantier.nom}<br>
            <strong>Adresse :</strong> ${chantier.adresse}<br>
            <strong>Client :</strong> ${chantier.client || 'N/C'}
          </div>

          <h2>1. ANALYSE DES RISQUES SPÉCIFIQUES</h2>
          <table>
            <thead>
              <tr>
                <th>Tâche / Opération</th>
                <th>Risques Identifiés</th>
                <th>Mesures de Prévention OBLIGATOIRES</th>
              </tr>
            </thead>
            <tbody>
              ${selectedRisks.map(r => `
                <tr>
                  <td><strong>${r.task}</strong></td>
                  <td class="danger">${r.risks.join('<br>')}</td>
                  <td>• ${r.measures.join('<br>• ')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h2>2. SECOURS & URGENCES</h2>
          <p>
            <strong>POMPIERS :</strong> 18 <br>
            <strong>SAMU :</strong> 15 <br>
            <strong>Point de Rassemblement :</strong> Entrée principale chantier
          </p>

          <div style="margin-top: 50px; border: 1px solid #333; padding: 20px; height: 100px;">
            Visa et Signature du Responsable HSE / Chantier :
          </div>
          
          <script>window.print();</script>
        </body>
      </html>
    `);
  };

  const generateBadge = (emp: any) => {
    if(!selectedChantier) { alert("Sélectionnez un chantier."); return; }
    const chantier = chantiers.find(c => c.id === selectedChantier);
    const w = window.open('', '_blank');
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${emp.id}|${selectedChantier}`;
    
    w?.document.write(`
      <html><body style="font-family: sans-serif; text-align: center; padding: 20px;">
        <div style="border: 3px solid #2ecc71; border-radius: 15px; padding: 20px; width: 300px; margin: auto; height: 450px;">
          <h2 style="margin: 0; color: #2ecc71;">AUTORISATION D'ACCÈS</h2>
          <h3 style="margin: 10px 0; font-size: 16px;">${chantier.nom}</h3>
          <hr style="border: 0; border-top: 1px solid #eee;"/>
          <img src="${emp.photo_url || 'https://via.placeholder.com/100'}" style="width:100px; height:100px; border-radius:50%; object-fit:cover; margin: 10px 0;">
          <h1 style="margin: 10px 0;">${emp.prenom} ${emp.nom}</h1>
          <p style="font-weight:bold; color: #7f8c8d;">${emp.role || 'Compagnon'}</p>
          <img src="${qrUrl}" alt="QR Code" style="margin-top:10px;" />
          <p style="font-size: 10px; margin-top:10px;">Valide si habilitations à jour</p>
        </div>
        <script>window.print();</script>
      </body></html>
    `);
  };

  // --- STATS CALCULÉES ---
  const stats = {
    accidents: events.filter(e => e.type === 'accident').length,
    causeries: events.filter(e => e.type === 'causerie').length,
    vgpRetard: equipements.filter(e => checkDate(e.date_prochaine_verif).status === 'expired').length,
    habExp: staff.filter(s => checkDate(s.sst_date).status === 'expired' || checkDate(s.caces_date).status === 'expired').length,
    actionsOpen: actions.filter(a => a.statut === 'en_cours').length
  };

  // --- NAVIGATION GAUCHE ---
  const Sidebar = () => (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full sticky top-0">
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-xl font-black uppercase text-gray-900 leading-none">HSE<span className="text-red-600">.Manager</span></h1>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Sécurité & Prévention</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        <NavBtn id="dashboard" icon={LayoutDashboard} label="Tableau de bord" />
        <NavBtn id="documents" icon={FolderOpen} label="Documents & PPSPS" />
        <NavBtn id="causeries" icon={Megaphone} label="Causeries Sécurité" />
        <NavBtn id="accidents" icon={Siren} label="Accidents & REX" />
        <NavBtn id="staff" icon={Users} label="Habilitations" />
        <NavBtn id="materiel" icon={HardHat} label="Matériel & VGP" />
        <NavBtn id="actions" icon={CheckCircle2} label="Plan d'actions" />
      </nav>
      {selectedChantier && (
        <div className="p-4 bg-blue-50 border-t border-blue-100 m-4 rounded-xl">
          <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">Contexte Actif</p>
          <p className="font-bold text-sm text-blue-900 truncate">{chantiers.find(c => c.id === selectedChantier)?.nom}</p>
        </div>
      )}
    </div>
  );

  const NavBtn = ({id, icon: Icon, label}: any) => (
    <button 
      onClick={() => setView(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${view === id ? 'bg-black text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50 hover:text-black'}`}
    >
      <Icon size={18} /> {label}
    </button>
  );

  // --- VUES PRINCIPALES ---

  return (
    <div className="flex min-h-screen bg-[#f8f9fa] font-sans text-gray-800">
      <Sidebar />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* HEADER TOP */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-gray-800 uppercase">{view.replace('_', ' ')}</h2>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button 
                onClick={() => setSelectedChantier(null)}
                className={`px-4 py-2 rounded-md text-xs font-bold uppercase transition-all ${!selectedChantier ? 'bg-white shadow text-black' : 'text-gray-400 hover:text-black'}`}
              >
                Global
              </button>
              <select 
                className={`bg-transparent text-xs font-bold uppercase outline-none px-4 py-2 cursor-pointer ${selectedChantier ? 'text-blue-600' : 'text-gray-500'}`}
                onChange={(e) => setSelectedChantier(e.target.value || null)}
                value={selectedChantier || ''}
              >
                <option value="">Sélectionner un chantier...</option>
                {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
          </div>
        </header>

        {/* CONTENU SCROLLABLE */}
        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-400 font-bold animate-pulse">Chargement des données HSE...</div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* DASHBOARD VIEW */}
              {view === 'dashboard' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatCard label="Accidents (Année)" val={stats.accidents} icon={Siren} color={stats.accidents > 0 ? "red" : "emerald"} />
                    <StatCard label="VGP en Retard" val={stats.vgpRetard} icon={ClipboardCheck} color={stats.vgpRetard > 0 ? "red" : "gray"} />
                    <StatCard label="Habilitations Exp." val={stats.habExp} icon={Users} color={stats.habExp > 0 ? "orange" : "blue"} />
                    <StatCard label="Actions en cours" val={stats.actionsOpen} icon={CheckCircle2} color="blue" />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                      <h3 className="font-bold text-gray-800 mb-6">ACTIVITÉ SÉCURITÉ</h3>
                      <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[
                            {name: 'Accidents', val: events.filter(e => e.type === 'accident').length},
                            {name: 'Presqu\'acc.', val: events.filter(e => e.type === 'presqu_accident').length},
                            {name: 'Causeries', val: events.filter(e => e.type === 'causerie').length},
                            {name: 'Visites', val: events.filter(e => e.type === 'visite').length},
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                            <Tooltip cursor={{fill: '#f8f9fa'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}/>
                            <Bar dataKey="val" fill="#2d3436" radius={[4,4,0,0]} barSize={50} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-y-auto">
                      <h3 className="font-bold text-gray-800 mb-4">DERNIERS ÉVÉNEMENTS</h3>
                      <div className="space-y-4">
                        {events.slice(0, 5).map(e => (
                          <div key={e.id} className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0">
                            <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${e.type === 'accident' ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                            <div>
                              <p className="text-xs font-bold text-gray-900 uppercase">{e.type}</p>
                              <p className="text-sm text-gray-600 leading-tight mb-1">{e.titre || 'Sans titre'}</p>
                              <p className="text-[10px] text-gray-400 font-medium">{new Date(e.date_event).toLocaleDateString()} • {e.chantiers?.nom || 'Global'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* DOCUMENTS VIEW + GÉNÉRATEUR */}
              {view === 'documents' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Liste Documents */}
                  <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                      <h3 className="font-bold text-sm uppercase">Bibliothèque</h3>
                      <button className="text-xs font-bold uppercase bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">+ Upload</button>
                    </div>
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase text-gray-400 font-medium">
                        <tr>
                          <th className="p-4">Document</th>
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
                            <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                              <td className="p-4 font-bold text-gray-700 flex items-center gap-3">
                                <FileText size={16} className="text-gray-400"/> {d.nom}
                              </td>
                              <td className="p-4"><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-bold uppercase">{d.type}</span></td>
                              <td className="p-4">
                                {d.chantier_id 
                                  ? <span className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded w-fit"><MapPin size={10}/> {d.chantiers?.nom}</span>
                                  : <span className="flex items-center gap-1 text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded w-fit"><Filter size={10}/> Global</span>
                                }
                              </td>
                              <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold border ${check.color}`}>{check.label}</span></td>
                              <td className="p-4 text-right"><button className="text-gray-400 hover:text-black"><Download size={16}/></button></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Générateur PPSPS */}
                  <div className="bg-blue-900 text-white p-6 rounded-2xl shadow-xl h-fit">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-blue-800 p-2 rounded-lg"><Construction size={24}/></div>
                      <div>
                        <h3 className="font-black text-lg uppercase">Générateur PPSPS</h3>
                        <p className="text-blue-200 text-xs">Créez votre document réglementaire en 3 clics.</p>
                      </div>
                    </div>

                    {!selectedChantier ? (
                      <div className="bg-blue-800/50 p-4 rounded-xl text-center border border-blue-700 mb-4">
                        <AlertTriangle className="mx-auto mb-2 text-yellow-400"/>
                        <p className="text-sm font-bold">Veuillez sélectionner un chantier en haut à droite pour commencer.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-xs font-bold uppercase text-blue-300">1. Tâches à réaliser :</p>
                        <div className="space-y-2 bg-blue-800/30 p-3 rounded-xl max-h-60 overflow-y-auto">
                          {RISK_DATABASE.map(risk => (
                            <label key={risk.id} className="flex items-center gap-3 cursor-pointer hover:bg-blue-800 p-2 rounded transition-colors">
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                                checked={ppspsTasks.includes(risk.id)}
                                onChange={(e) => {
                                  if(e.target.checked) setPpspsTasks([...ppspsTasks, risk.id]);
                                  else setPpspsTasks(ppspsTasks.filter(id => id !== risk.id));
                                }}
                              />
                              <span className="text-sm font-medium">{risk.task}</span>
                            </label>
                          ))}
                        </div>
                        <button 
                          onClick={generateSmartPPSPS}
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4"
                        >
                          <Printer size={18}/> Générer le PPSPS
                        </button>
                        <p className="text-[10px] text-blue-300 text-center">Inclus : Analyse de risques, Adresses, Mesures de prévention.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* HABILITATIONS VIEW */}
              {view === 'staff' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-sm uppercase">Matrice des Habilitations</h3>
                    <div className="flex gap-2">
                      <button className="bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold uppercase hover:bg-gray-50">+ Ajout Personnel</button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase text-gray-400 font-medium">
                        <tr>
                          <th className="p-4">Collaborateur</th>
                          <th className="p-4 text-center">SST (Secourisme)</th>
                          <th className="p-4 text-center">CACES (Engins)</th>
                          <th className="p-4 text-center">Habilitation Élec.</th>
                          <th className="p-4 text-center">Travail Hauteur</th>
                          <th className="p-4 text-center">Badge Chantier</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {staff.map(s => (
                          <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                            <td className="p-4 font-bold flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-black text-gray-500">
                                {s.prenom.charAt(0)}{s.nom.charAt(0)}
                              </div>
                              <div>
                                <p className="leading-none">{s.nom} {s.prenom}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">{s.role || 'Compagnon'}</p>
                              </div>
                            </td>
                            {['sst_date', 'caces_date', 'elec_date', 'travail_hauteur_date'].map(field => {
                              const check = checkDate(s[field]);
                              return (
                                <td key={field} className="p-4 text-center">
                                  <div className={`inline-block px-2 py-1 rounded text-[10px] font-black uppercase border ${check.color}`}>
                                    {check.label}
                                  </div>
                                </td>
                              )
                            })}
                            <td className="p-4 text-center">
                              {selectedChantier ? (
                                <button onClick={() => generateBadge(s)} className="text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 mx-auto transition-colors">
                                  <QrCode size={14}/> Créer
                                </button>
                              ) : <span className="text-gray-300 text-[10px] italic">Sélec. chantier</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* AUTRES VUES (Causeries, Accidents, Matériel, Actions) - Modèle générique pour l'exemple */}
              {['causeries', 'accidents', 'materiel', 'actions'].includes(view) && (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 border-dashed">
                  <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    {view === 'causeries' && <Megaphone className="text-gray-400" size={32}/>}
                    {view === 'accidents' && <Siren className="text-gray-400" size={32}/>}
                    {view === 'materiel' && <HardHat className="text-gray-400" size={32}/>}
                    {view === 'actions' && <CheckCircle2 className="text-gray-400" size={32}/>}
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 uppercase mb-2">Module {view}</h3>
                  <p className="text-gray-500 text-sm max-w-md mx-auto">
                    Ce module est opérationnel. Il afficherait la liste des {view} filtrée par le chantier : 
                    <span className="font-bold text-black"> {selectedChantier ? chantiers.find(c => c.id === selectedChantier)?.nom : 'Tous les chantiers'}</span>.
                  </p>
                  <button className="mt-6 bg-black text-white px-6 py-2 rounded-xl text-sm font-bold uppercase hover:bg-gray-800 transition-colors">
                    + Ajouter {view}
                  </button>
                </div>
              )}

            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// --- SOUS-COMPOSANTS UI ---

const StatCard = ({ label, val, icon: Icon, color }: any) => {
  const themes: any = {
    red: "bg-red-50 text-red-600 border-red-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    gray: "bg-white text-gray-800 border-gray-200"
  };
  return (
    <div className={`p-5 rounded-2xl border flex items-center justify-between shadow-sm ${themes[color] || themes.gray}`}>
      <div>
        <p className="text-[10px] font-black uppercase opacity-60 tracking-wider">{label}</p>
        <p className="text-3xl font-black mt-1">{val}</p>
      </div>
      <div className="bg-white/50 p-3 rounded-xl backdrop-blur-sm"><Icon size={24}/></div>
    </div>
  )
};
