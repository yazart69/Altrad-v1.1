"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ShieldCheck, AlertTriangle, FileText, HardHat, 
  ClipboardCheck, Siren, Users, CalendarRange, 
  Search, Plus, Printer, QrCode, Download,
  CheckCircle2, XCircle, Clock, MapPin, Construction,
  Filter, FileCheck, ArrowRight, Table, LayoutDashboard,
  Megaphone, FolderOpen, Save, Trash2, Edit, CloudSun, Zap, Wind,
  Wrench, Camera, Eye, AlertOctagon, FileBarChart
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import { RISK_DATABASE } from './data'; // Supposant que le fichier data.ts précédent est présent

// --- TYPES & INTERFACES (Architecture Robuste) ---

type ViewType = 'dashboard' | 'generator' | 'visits' | 'equipment' | 'safety_talks';

interface IChantier {
  id: string;
  nom: string;
  adresse: string;
  client: string;
  responsable: string;
  date_debut: string;
  date_fin: string;
}

interface IEquipment {
  id: string;
  type: string;
  marque: string;
  modele: string;
  num_serie: string;
  date_last_vgp: string;
  periodicite: number; // en mois
  statut: 'en_service' | 'maintenance' | 'rebut';
  chantier_id: string | null;
}

interface IVisit {
  id: string;
  date: string;
  type: 'VMT' | 'Q3SRE' | 'OST';
  chantier_id: string;
  domaine: string;
  conformite: boolean;
  details: any; // JSONB pour les champs spécifiques
}

// --- COMPOSANT PRINCIPAL ---

export default function HSEUltimate() {
  // Navigation & State
  const [view, setView] = useState<ViewType>('dashboard');
  const [selectedChantierId, setSelectedChantierId] = useState<string>('');
  const [chantiers, setChantiers] = useState<IChantier[]>([]);
  const [loading, setLoading] = useState(true);

  // Load Data
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      const { data } = await supabase.from('chantiers').select('*').eq('statut', 'en_cours');
      if (data) setChantiers(data);
      setLoading(false);
    };
    initData();
  }, []);

  const currentChantier = chantiers.find(c => c.id === selectedChantierId);

  return (
    <div className="flex min-h-screen bg-[#f8f9fa] font-sans text-gray-800">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 z-20 shadow-sm">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="bg-red-600 text-white p-2 rounded-lg"><ShieldCheck size={24}/></div>
          <div>
            <h1 className="text-lg font-black uppercase text-gray-900 leading-none">ALTRAD<span className="text-red-600">.OS</span></h1>
            <p className="text-[10px] font-bold text-gray-400 tracking-widest mt-1">MODULE HSE ULTIME</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Pilotage</p>
          <NavBtn id="dashboard" icon={LayoutDashboard} label="Dashboard & KPI" view={view} set={setView} />
          
          <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-6 mb-2">Opérations Terrain</p>
          <NavBtn id="generator" icon={FileText} label="Générateur Documents" view={view} set={setView} />
          <NavBtn id="visits" icon={Camera} label="Visites Terrain (VMT)" view={view} set={setView} />
          <NavBtn id="safety_talks" icon={Megaphone} label="Causeries & Sécurité" view={view} set={setView} />
          
          <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-6 mb-2">Logistique Sûre</p>
          <NavBtn id="equipment" icon={Wrench} label="Suivi Matériel & VGP" view={view} set={setView} />
        </nav>

        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center font-bold text-gray-600">JD</div>
            <div>
              <p className="text-xs font-bold text-gray-900">John Doe</p>
              <p className="text-[10px] text-gray-500">Resp. Q3SRE</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* TOP BAR: CONTEXTE CHANTIER */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shrink-0 shadow-sm z-10">
          <div>
            <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">{view.replace('_', ' ')}</h2>
            <p className="text-xs text-gray-400 font-medium mt-1">Espace de travail sécurisé</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end mr-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contexte Chantier</span>
              <select 
                className="bg-gray-50 border-none text-sm font-bold uppercase text-gray-800 outline-none cursor-pointer py-2 px-3 rounded-lg focus:ring-2 focus:ring-red-100 transition-all" 
                onChange={(e) => setSelectedChantierId(e.target.value)} 
                value={selectedChantierId}
              >
                <option value="">-- SÉLECTIONNER UN PROJET --</option>
                {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            {selectedChantierId && (
               <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold border border-green-100">
                 <Construction size={14}/> {currentChantier?.adresse || 'Site Inconnu'}
               </div>
            )}
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {!selectedChantierId && view !== 'dashboard' ? (
             <div className="h-full flex flex-col items-center justify-center opacity-50">
                <HardHat size={80} className="text-gray-300 mb-4"/>
                <h3 className="text-xl font-bold text-gray-400">Veuillez sélectionner un chantier pour accéder aux modules.</h3>
             </div>
          ) : (
            <>
              {view === 'dashboard' && <DashboardHSE />}
              {view === 'generator' && <DocumentGenerator chantier={currentChantier} />}
              {view === 'visits' && <FieldVisits chantierId={selectedChantierId} />}
              {view === 'equipment' && <EquipmentManager chantierId={selectedChantierId} />}
              {view === 'safety_talks' && <SafetyTalks chantierId={selectedChantierId} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// 1. MODULE DASHBOARD HSE (Indicateurs Avancés)
// ============================================================================
function DashboardHSE() {
  const data = [{name: 'Jan', TF: 4.2}, {name: 'Fév', TF: 3.8}, {name: 'Mar', TF: 2.5}, {name: 'Avr', TF: 0.0}, {name: 'Mai', TF: 1.2}];
  const pieData = [{name: 'VGP OK', value: 85, color: '#10b981'}, {name: 'VGP À faire', value: 10, color: '#f59e0b'}, {name: 'Retard', value: 5, color: '#ef4444'}];

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Taux de Fréquence (TF)" val="2.1" sub="-0.5 vs N-1" icon={FileBarChart} color="blue" />
        <StatCard label="Taux de Gravité (TG)" val="0.04" sub="Stable" icon={AlertOctagon} color="indigo" />
        <StatCard label="Jours sans Accident" val="142" sub="Record: 320" icon={ShieldCheck} color="emerald" />
        <StatCard label="VGP Périmées" val="3" sub="Action immédiate" icon={Siren} color="red" />
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-80">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><ArrowRight size={16} className="text-red-500"/> Évolution Taux de Fréquence</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: '#f9fafb'}} />
              <Bar dataKey="TF" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-80">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><ArrowRight size={16} className="text-emerald-500"/> Conformité Matériel (VGP)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. MODULE GÉNÉRATEUR DOCUMENTAIRE (Architecture Différenciée)
// ============================================================================
function DocumentGenerator({ chantier }: { chantier: any }) {
  const [docType, setDocType] = useState<'ppsps' | 'modop' | 'adr' | 'rex'>('ppsps');
  const [selectedRisks, setSelectedRisks] = useState<string[]>([]);
  
  // États spécifiques pour Mode Opératoire
  const [modopSteps, setModopSteps] = useState([{ etape: '', risque: '', moyen: '' }]);
  const [modopTools, setModopTools] = useState('');

  // États spécifiques pour PPSPS
  const [secours, setSecours] = useState({ hopital: '', sst: '', pompier: '18' });

  // --- MOTEUR DE RENDU PDF (SIMULÉ) ---
  const handlePrint = () => {
    // Factory Pattern pour le contenu
    let contentHTML = '';

    if (docType === 'ppsps') {
      contentHTML = `
        <div class="doc-header ppsps">PLAN PARTICULIER DE SÉCURITÉ (PPSPS)</div>
        <div class="section">
          <h3>1. RENSEIGNEMENTS GÉNÉRAUX</h3>
          <p><strong>Chantier :</strong> ${chantier.nom}<br><strong>Adresse :</strong> ${chantier.adresse}</p>
          <p><strong>Effectif prévu :</strong> ${chantier.effectif_prevu || 'Non défini'}</p>
        </div>
        <div class="section">
          <h3>2. ORGANISATION DES SECOURS</h3>
          <table class="full-width">
            <tr><td><strong>SST sur site :</strong></td><td>${secours.sst}</td></tr>
            <tr><td><strong>Centre Hospitalier :</strong></td><td>${secours.hopital}</td></tr>
            <tr><td><strong>Point de Rassemblement :</strong></td><td>Entrée principale</td></tr>
          </table>
        </div>
        <div class="section">
          <h3>3. ANALYSE DES RISQUES IMPORTÉS</h3>
          <ul>${selectedRisks.map(r => `<li>${r}</li>`).join('')}</ul>
        </div>
      `;
    } else if (docType === 'modop') {
      contentHTML = `
        <div class="doc-header modop">MODE OPÉRATOIRE TECHNIQUE</div>
        <div class="section">
          <h3>1. MOYENS MATÉRIELS & OUTILLAGE</h3>
          <p>${modopTools || 'Liste outillage à définir...'}</p>
        </div>
        <div class="section">
          <h3>2. DÉROULEMENT CHRONOLOGIQUE</h3>
          <table class="full-width">
            <thead><tr><th>PHASE</th><th>RISQUE</th><th>MOYEN PRÉVENTION</th></tr></thead>
            <tbody>
              ${modopSteps.map((s, i) => `<tr><td>${i+1}. ${s.etape}</td><td>${s.risque}</td><td>${s.moyen}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // Fenêtre d'impression
    const w = window.open('', '_blank');
    w?.document.write(`
      <html><head><title>EXPORT ${docType.toUpperCase()}</title>
      <style>
        body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; }
        .doc-header { font-size: 24px; font-weight: bold; padding: 20px; text-align: center; border: 3px solid #333; margin-bottom: 30px; }
        .ppsps { border-color: #ef4444; color: #ef4444; }
        .modop { border-color: #2563eb; color: #2563eb; }
        .section { margin-bottom: 25px; }
        h3 { border-bottom: 2px solid #ddd; padding-bottom: 5px; text-transform: uppercase; font-size: 14px; background: #f9f9f9; padding: 5px; }
        .full-width { width: 100%; border-collapse: collapse; }
        td, th { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 12px; }
        th { background: #eee; }
      </style>
      </head><body>
      <div style="text-align: right; margin-bottom: 20px; font-size: 10px;">Généré par Altrad.OS - ${new Date().toLocaleDateString()}</div>
      ${contentHTML}
      <script>window.print();</script></body></html>
    `);
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-full">
      {/* GAUCHE : SÉLECTEUR & OPTIONS */}
      <div className="col-span-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
        <h3 className="font-black text-gray-700 mb-6 uppercase flex items-center gap-2"><FileText/> Type de Document</h3>
        <div className="space-y-2">
          {[
            {id: 'ppsps', label: 'PPSPS', desc: 'Plan Particulier Sécurité', color: 'bg-red-50 text-red-700 border-red-200'},
            {id: 'modop', label: 'Mode Opératoire', desc: 'Fiche technique de tâche', color: 'bg-blue-50 text-blue-700 border-blue-200'},
            {id: 'adr', label: 'Analyse de Risques', desc: 'Matrice de criticité', color: 'bg-orange-50 text-orange-700 border-orange-200'},
            {id: 'rex', label: 'Mini REX', desc: 'Retour expérience fin chantier', color: 'bg-purple-50 text-purple-700 border-purple-200'},
          ].map((type: any) => (
            <button 
              key={type.id} 
              onClick={() => setDocType(type.id)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${docType === type.id ? type.color : 'bg-white border-gray-100 hover:bg-gray-50'}`}
            >
              <div className="font-bold">{type.label}</div>
              <div className="text-[10px] opacity-70">{type.desc}</div>
            </button>
          ))}
        </div>
        
        <div className="mt-auto pt-6 border-t border-gray-100">
          <button onClick={handlePrint} className="w-full bg-black text-white py-4 rounded-xl font-bold uppercase flex items-center justify-center gap-2 hover:bg-gray-900 transition-colors shadow-lg">
            <Printer size={20}/> Générer & Imprimer
          </button>
        </div>
      </div>

      {/* DROITE : FORMULAIRE CONTEXTUEL (SWITCH) */}
      <div className="col-span-8 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 overflow-y-auto">
        
        {docType === 'ppsps' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-4">
              <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2"><Siren size={18}/> Organisation des Secours</h4>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-gray-500">Hôpital le plus proche</label><input type="text" className="input-std" value={secours.hopital} onChange={e=>setSecours({...secours, hopital: e.target.value})} placeholder="Nom et Ville..."/></div>
                <div><label className="text-xs font-bold text-gray-500">Sauveteurs Secouristes (SST)</label><input type="text" className="input-std" value={secours.sst} onChange={e=>setSecours({...secours, sst: e.target.value})} placeholder="Noms des SST..."/></div>
              </div>
            </div>
            
            <h4 className="font-bold text-gray-800 border-b pb-2">RISQUES DU CHANTIER (Sélection)</h4>
            <div className="grid grid-cols-2 gap-3">
               {RISK_DATABASE.slice(0,6).map(r => (
                 <label key={r.id} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                   <input type="checkbox" onChange={(e) => e.target.checked ? setSelectedRisks([...selectedRisks, r.task]) : setSelectedRisks(selectedRisks.filter(x => x !== r.task))} />
                   <span className="text-xs font-medium">{r.task}</span>
                 </label>
               ))}
            </div>
          </div>
        )}

        {docType === 'modop' && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Outillage & Matériel Spécifique</label>
              <textarea className="input-std h-20" placeholder="Ex: Compresseur 5000L, Sableuse, Echafaudage classe 4..." value={modopTools} onChange={e => setModopTools(e.target.value)}></textarea>
            </div>

            <h4 className="font-bold text-gray-800 border-b pb-2 mt-4">CHRONOLOGIE DES OPÉRATIONS</h4>
            {modopSteps.map((step, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-start">
                <div className="col-span-1 pt-3 text-center font-bold text-gray-400">{idx+1}</div>
                <div className="col-span-4"><input type="text" className="input-std" placeholder="Description de l'étape" value={step.etape} onChange={e => {const n=[...modopSteps]; n[idx].etape=e.target.value; setModopSteps(n)}} /></div>
                <div className="col-span-3"><input type="text" className="input-std border-orange-200 bg-orange-50" placeholder="Risque" value={step.risque} onChange={e => {const n=[...modopSteps]; n[idx].risque=e.target.value; setModopSteps(n)}} /></div>
                <div className="col-span-3"><input type="text" className="input-std border-green-200 bg-green-50" placeholder="Prévention" value={step.moyen} onChange={e => {const n=[...modopSteps]; n[idx].moyen=e.target.value; setModopSteps(n)}} /></div>
                <div className="col-span-1 pt-1"><button onClick={() => {const n=[...modopSteps]; n.splice(idx,1); setModopSteps(n)}} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button></div>
              </div>
            ))}
            <button onClick={() => setModopSteps([...modopSteps, {etape:'', risque:'', moyen:''}])} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">+ Ajouter une étape</button>
          </div>
        )}

      </div>
    </div>
  );
}

// ============================================================================
// 3. MODULE SUIVI MATÉRIEL & VGP (Registre Sécurité)
// ============================================================================
function EquipmentManager({ chantierId }: { chantierId: string }) {
  const [equipments, setEquipments] = useState<IEquipment[]>([]);
  
  // Mock Data pour démo
  useEffect(() => {
    setEquipments([
      { id: '1', type: 'Nacelle', marque: 'Haulotte', modele: 'Star 10', num_serie: 'H12345', date_last_vgp: '2023-08-15', periodicite: 6, statut: 'en_service', chantier_id: chantierId },
      { id: '2', type: 'Harnais', marque: 'Petzl', modele: 'Avao', num_serie: 'P98765', date_last_vgp: '2023-01-10', periodicite: 12, statut: 'en_service', chantier_id: chantierId },
      { id: '3', type: 'Compresseur', marque: 'Atlas Copco', modele: 'XAS 88', num_serie: 'C555', date_last_vgp: '2022-12-01', periodicite: 12, statut: 'maintenance', chantier_id: chantierId },
    ]);
  }, [chantierId]);

  // Calcul VGP status
  const getVgpStatus = (date: string, freq: number) => {
    const last = new Date(date);
    const next = new Date(last.setMonth(last.getMonth() + freq));
    const now = new Date();
    const diffTime = next.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { color: 'bg-red-100 text-red-700 border-red-200', label: 'PÉRIMÉE', icon: AlertTriangle };
    if (diffDays < 30) return { color: 'bg-orange-100 text-orange-700 border-orange-200', label: `J-${diffDays}`, icon: Clock };
    return { color: 'bg-green-50 text-green-700 border-green-200', label: 'OK', icon: CheckCircle2 };
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <h3 className="font-black text-gray-700 uppercase flex items-center gap-2"><Wrench/> Registre de Sécurité & VGP</h3>
        <button className="bg-black text-white px-4 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2"><Plus size={16}/> Ajouter Matériel</button>
      </div>
      <table className="w-full text-left">
        <thead className="bg-gray-50 text-xs font-black text-gray-400 uppercase">
          <tr>
            <th className="p-4">Équipement</th>
            <th className="p-4">Identification</th>
            <th className="p-4">Dernière VGP</th>
            <th className="p-4">État VGP</th>
            <th className="p-4 text-center">Statut</th>
            <th className="p-4 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {equipments.map(eq => {
            const status = getVgpStatus(eq.date_last_vgp, eq.periodicite);
            return (
              <tr key={eq.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="p-4">
                  <div className="font-bold text-gray-800">{eq.type}</div>
                  <div className="text-xs text-gray-500">{eq.marque} {eq.modele}</div>
                </td>
                <td className="p-4 text-xs font-mono bg-gray-50 rounded w-fit">{eq.num_serie}</td>
                <td className="p-4 text-gray-600">{new Date(eq.date_last_vgp).toLocaleDateString()}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border flex items-center gap-1 w-fit ${status.color}`}>
                    <status.icon size={12}/> {status.label}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <span className={`w-3 h-3 rounded-full inline-block ${eq.statut === 'en_service' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                </td>
                <td className="p-4 text-center flex justify-center gap-2">
                  <button className="p-2 hover:bg-gray-200 rounded-lg text-gray-500"><Download size={16}/></button>
                  <button className="p-2 hover:bg-gray-200 rounded-lg text-blue-500"><Edit size={16}/></button>
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
// 4. MODULE VISITES TERRAIN (Formulaire Mobile-First)
// ============================================================================
function FieldVisits({ chantierId }: { chantierId: string }) {
  const [visitType, setVisitType] = useState('vmt');
  
  // Champs spécifiques demandés
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    sous_traitant: 'Non',
    domaine: 'Sécurité',
    agence: 'Sud-Est',
    otp: '',
    local: '',
    site: '',
    // Q3SRE specific
    ligne_defense: '',
    point_controle: '',
    resultat: 'conforme',
    actions: 'non',
    // OST specific
    observation: 'Port des EPI',
    commentaire: ''
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in">
      {/* Menu Type de Visite (Style Tab Mobile) */}
      <div className="lg:col-span-3 flex gap-2 overflow-x-auto pb-2">
        {[{id:'vmt', l:'VMT Manager'}, {id:'q3sre', l:'Contrôle Q3SRE'}, {id:'ost', l:'Observation (OST)'}].map(t => (
          <button key={t.id} onClick={()=>setVisitType(t.id)} className={`px-6 py-3 rounded-xl font-black uppercase text-sm flex-1 lg:flex-none ${visitType===t.id ? 'bg-black text-white shadow-lg' : 'bg-white border text-gray-500'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* Formulaire de Saisie */}
      <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h3 className="font-bold text-lg mb-6 flex items-center gap-2 uppercase">
          {visitType === 'vmt' && <Users className="text-blue-500"/>}
          {visitType === 'q3sre' && <ClipboardCheck className="text-emerald-500"/>}
          {visitType === 'ost' && <Eye className="text-orange-500"/>}
          Nouveau Rapport : {visitType}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div><label className="label-form">Date Visite *</label><input type="date" className="input-form" value={formData.date} onChange={e=>setFormData({...formData, date:e.target.value})}/></div>
          <div><label className="label-form">Concerne Sous-Traitant ?</label><select className="input-form" value={formData.sous_traitant} onChange={e=>setFormData({...formData, sous_traitant:e.target.value})}><option>Non</option><option>Oui</option></select></div>
          
          <div><label className="label-form">Domaine *</label><select className="input-form" value={formData.domaine} onChange={e=>setFormData({...formData, domaine:e.target.value})}><option>Sécurité</option><option>Qualité</option><option>Environnement</option></select></div>
          <div><label className="label-form">N° OTP *</label><input type="text" className="input-form" placeholder="Ex: 2023-P-123" value={formData.otp} onChange={e=>setFormData({...formData, otp:e.target.value})}/></div>
          
          <div className="md:col-span-2"><label className="label-form">Localisation / Équipement</label><input type="text" className="input-form" placeholder="Zone, Bâtiment, Machine..." value={formData.local} onChange={e=>setFormData({...formData, local:e.target.value})}/></div>

          {/* CHAMPS SPÉCIFIQUES Q3SRE */}
          {visitType === 'q3sre' && (
            <>
              <div className="md:col-span-2 border-t pt-4 mt-2"><p className="text-xs font-black text-emerald-600 uppercase mb-4">Points de Contrôle</p></div>
              <div><label className="label-form">Ligne de Défense *</label><input type="text" className="input-form" value={formData.ligne_defense} onChange={e=>setFormData({...formData, ligne_defense:e.target.value})}/></div>
              <div><label className="label-form">Résultat *</label><select className="input-form" value={formData.resultat} onChange={e=>setFormData({...formData, resultat:e.target.value})}><option value="conforme">✅ Conforme</option><option value="non_conforme">❌ Non Conforme</option><option value="na">N/A</option></select></div>
            </>
          )}

          {/* CHAMPS SPÉCIFIQUES OST */}
          {visitType === 'ost' && (
            <>
              <div className="md:col-span-2 border-t pt-4 mt-2"><p className="text-xs font-black text-orange-600 uppercase mb-4">Observation Comportementale</p></div>
              <div className="md:col-span-2"><label className="label-form">Thème *</label><select className="input-form" value={formData.observation} onChange={e=>setFormData({...formData, observation:e.target.value})}><option>Port des EPI</option><option>Respect Balisage</option><option>Travail en Hauteur</option><option>Coactivité</option></select></div>
              <div className="md:col-span-2"><label className="label-form">Commentaire</label><textarea className="input-form h-24" value={formData.commentaire} onChange={e=>setFormData({...formData, commentaire:e.target.value})}></textarea></div>
            </>
          )}

          {/* ZONE PHOTO (DRAG & DROP SIMULÉ) */}
          <div className="md:col-span-2 mt-4">
            <label className="label-form">Preuve Photo</label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors cursor-pointer">
              <Camera size={32} className="mb-2"/>
              <p className="text-xs font-bold uppercase">Glisser une photo ou cliquer ici</p>
            </div>
          </div>
        </div>

        <button className="w-full mt-8 bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
          <Save size={20}/> ENREGISTRER LA VISITE
        </button>
      </div>

      {/* Historique Rapide */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h3 className="font-bold text-sm mb-4 uppercase text-gray-500">Dernières Visites</h3>
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg">
              <div className={`w-2 h-12 rounded-full ${i===1?'bg-red-500':'bg-green-500'}`}></div>
              <div>
                <p className="text-xs font-bold text-gray-800">Visite Q3SRE #{100+i}</p>
                <p className="text-[10px] text-gray-500">Il y a {i} jours • Par J.Doe</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 5. MODULE CAUSERIES (Template Word Strict)
// ============================================================================
function SafetyTalks({ chantierId }: { chantierId: string }) {
  // Ce composant reprendrait la logique du formulaire "EXEMPLE CAUSERIE.docx"
  // Pour la concision, je mets les champs clés demandés
  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in">
      <div className="border-b pb-4 mb-6 flex justify-between items-center">
        <h3 className="font-black text-xl text-gray-800 uppercase flex items-center gap-2"><Megaphone/> Causerie / Minute Sécurité</h3>
        <span className="text-xs font-bold bg-gray-100 px-3 py-1 rounded-full text-gray-500">Réf: FORM-HSE-042</span>
      </div>
      
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div><label className="label-form">Date</label><input type="date" className="input-form" /></div>
        <div><label className="label-form">Animateur</label><input type="text" className="input-form" /></div>
        <div><label className="label-form">Thème abordé</label><input type="text" className="input-form" placeholder="Ex: Risque routier..."/></div>
      </div>

      <div className="space-y-4 mb-8">
        <div>
          <label className="label-form">Message particulier du manager</label>
          <textarea className="input-form h-20" placeholder="Points clés à retenir..."></textarea>
        </div>
        <div>
          <label className="label-form">Remontées Terrain / Échanges</label>
          <textarea className="input-form h-20" placeholder="Questions posées par l'équipe..."></textarea>
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <div className="bg-gray-50 p-3 text-xs font-bold uppercase border-b flex justify-between">
          <span>Liste de présence (Signature Tablette)</span>
          <span>Total: 0</span>
        </div>
        <div className="p-8 text-center text-gray-400 italic">
          Zone de signature digitale en attente de participants...
        </div>
      </div>
    </div>
  );
}

// --- UTILS UI ---
const NavBtn = ({id, icon: Icon, label, view, set}: any) => (
  <button onClick={() => set(id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all ${view === id ? 'bg-black text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50 hover:text-black'}`}>
    <Icon size={18} /> {label}
  </button>
);

const StatCard = ({ label, val, sub, icon: Icon, color }: any) => {
  const c = { 
    blue: "text-blue-600 bg-blue-50 border-blue-100", 
    red: "text-red-600 bg-red-50 border-red-100", 
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    indigo: "text-indigo-600 bg-indigo-50 border-indigo-100" 
  };
  return (
    <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">{label}</p>
        <p className="text-3xl font-black text-gray-800">{val}</p>
        <p className="text-xs font-bold text-gray-400 mt-1">{sub}</p>
      </div>
      <div className={`p-3 rounded-xl border ${(c as any)[color]}`}><Icon size={24}/></div>
    </div>
  )
};
