"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ShieldCheck, AlertTriangle, FileText, HardHat, 
  ClipboardCheck, Siren, Users, CalendarRange, 
  Search, Plus, Printer, QrCode, FileInput, Download,
  CheckCircle2, XCircle, Clock
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie 
} from 'recharts';

export default function HSEPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  
  // Données
  const [documents, setDocuments] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]); // Causeries, Accidents
  const [controles, setControles] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [stats, setStats] = useState({ 
    accidents: 0, 
    vgpRetard: 0, 
    habilitationsExpirees: 0,
    causeriesMois: 0
  });

  // --- CHARGEMENT ---
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Documents (Global + Chantier)
    const { data: docs } = await supabase.from('hse_documents').select('*, chantiers(nom)').order('created_at', { ascending: false });
    
    // 2. Événements (Causeries, Accidents)
    const { data: evts } = await supabase.from('hse_events').select('*, chantiers(nom)').order('date_event', { ascending: false });
    
    // 3. Contrôles Matériel
    const { data: ctrls } = await supabase.from('hse_materiel_controles').select('*, chantiers(nom)');
    
    // 4. Staff & Habilitations
    const { data: empl } = await supabase.from('employes').select('*');

    if (docs) setDocuments(docs);
    if (evts) setEvents(evts);
    if (ctrls) setControles(ctrls);
    if (empl) setStaff(empl);

    // Calcul Stats
    const now = new Date();
    const vgpRetard = ctrls?.filter(c => new Date(c.date_prochaine_verif) < now).length || 0;
    const accidents = evts?.filter(e => e.type === 'accident').length || 0;
    // Logique simplifiée pour habilitations (exemple sur SST)
    const habExp = empl?.filter(e => e.sst_date && new Date(e.sst_date) < now).length || 0;

    setStats({
      accidents,
      vgpRetard,
      habilitationsExpirees: habExp,
      causeriesMois: evts?.filter(e => e.type === 'causerie').length || 0
    });

    setLoading(false);
  };

  // --- ACTIONS SIMULÉES ---
  const handleGeneratePPSPS = () => {
    const nomChantier = prompt("Nom du chantier pour ce PPSPS ?");
    if(!nomChantier) return;
    alert(`🤖 GÉNÉRATEUR INTELLIGENT\n\nCréation du PPSPS pour : ${nomChantier}...\n\n1. Analyse des risques : OK\n2. Récupération adresse : OK\n3. Import effectifs : OK\n\n📄 Document généré !`);
  };

  // --- COMPOSANTS UI ---
  
  // Onglet Dashboard
  const DashboardView = () => (
    <div className="space-y-6 animate-in fade-in">
      {/* Tuiles Alertes */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
           <div>
             <p className="text-xs font-bold text-gray-400 uppercase">Accidents (Année)</p>
             <p className={`text-3xl font-black ${stats.accidents > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{stats.accidents}</p>
           </div>
           <div className="bg-red-50 p-3 rounded-xl text-red-500"><Siren size={24}/></div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
           <div>
             <p className="text-xs font-bold text-gray-400 uppercase">VGP à faire</p>
             <p className={`text-3xl font-black ${stats.vgpRetard > 0 ? 'text-orange-500' : 'text-gray-800'}`}>{stats.vgpRetard}</p>
           </div>
           <div className="bg-orange-50 p-3 rounded-xl text-orange-500"><ClipboardCheck size={24}/></div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
           <div>
             <p className="text-xs font-bold text-gray-400 uppercase">Habilitations Exp.</p>
             <p className="text-3xl font-black text-blue-500">{stats.habilitationsExpirees}</p>
           </div>
           <div className="bg-blue-50 p-3 rounded-xl text-blue-500"><Users size={24}/></div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
           <div>
             <p className="text-xs font-bold text-gray-400 uppercase">Causeries (Mois)</p>
             <p className="text-3xl font-black text-emerald-500">{stats.causeriesMois}</p>
           </div>
           <div className="bg-emerald-50 p-3 rounded-xl text-emerald-500"><ShieldCheck size={24}/></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique Accidents */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[300px]">
          <h3 className="font-black text-gray-800 mb-4 uppercase text-sm">Répartition Événements</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              {name: 'Causeries', val: events.filter(e => e.type === 'causerie').length},
              {name: 'Accidents', val: events.filter(e => e.type === 'accident').length},
              {name: 'Presqu\'acc.', val: events.filter(e => e.type === 'presqu_accident').length},
              {name: 'Visites', val: events.filter(e => e.type === 'visite').length},
            ]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f2f6"/>
              <XAxis dataKey="name" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: '#f8f9fa'}}/>
              <Bar dataKey="val" fill="#0984e3" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Dernières Actions */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <h3 className="font-black text-gray-800 mb-4 uppercase text-sm">Fil d'actualité Sécurité</h3>
          <div className="space-y-4">
            {events.slice(0, 4).map(evt => (
              <div key={evt.id} className="flex items-start gap-3 border-b border-gray-50 pb-3 last:border-0">
                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${evt.type === 'accident' ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{evt.titre || evt.type}</p>
                  <p className="text-xs text-gray-400">{new Date(evt.date_event).toLocaleDateString()} • {evt.chantiers?.nom || 'Global'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Onglet Documents (Le cœur du système)
  const DocumentsView = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center bg-blue-900 text-white p-6 rounded-2xl shadow-lg">
        <div>
          <h2 className="text-2xl font-black uppercase">Documents & Générateurs</h2>
          <p className="text-blue-200 text-sm mt-1">Base documentaire synchronisée</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleGeneratePPSPS} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-3 rounded-xl font-bold text-xs uppercase flex items-center gap-2 shadow-lg transition-all">
            <Settings size={16} className="animate-spin-slow"/> Générer PPSPS
          </button>
          <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl font-bold text-xs uppercase flex items-center gap-2 transition-all">
            <Plus size={16}/> Upload
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 font-black text-xs text-gray-400 uppercase">Document</th>
              <th className="p-4 font-black text-xs text-gray-400 uppercase">Type</th>
              <th className="p-4 font-black text-xs text-gray-400 uppercase">Chantier</th>
              <th className="p-4 font-black text-xs text-gray-400 uppercase">Validité</th>
              <th className="p-4 font-black text-xs text-gray-400 uppercase text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {documents.map(doc => (
              <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-bold text-gray-800 flex items-center gap-3">
                  <div className="bg-gray-100 p-2 rounded text-gray-500"><FileText size={16}/></div>
                  {doc.nom}
                </td>
                <td className="p-4"><span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-[10px] font-black uppercase">{doc.type}</span></td>
                <td className="p-4 text-xs font-bold text-gray-500">{doc.chantiers?.nom || '🏢 Global Entreprise'}</td>
                <td className="p-4 text-xs font-bold text-gray-500">{doc.validite_date || 'Permanente'}</td>
                <td className="p-4 text-right">
                  <button className="text-gray-400 hover:text-blue-500"><Download size={18}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Onglet Habilitations (Matrice)
  const StaffView = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-black text-gray-800 uppercase">Suivi Habilitations & Formations</h3>
          <button className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold uppercase">Ajouter Habilitation</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 font-black text-xs text-gray-400 uppercase">Collaborateur</th>
                <th className="p-4 font-black text-xs text-gray-400 uppercase text-center">SST</th>
                <th className="p-4 font-black text-xs text-gray-400 uppercase text-center">Élec.</th>
                <th className="p-4 font-black text-xs text-gray-400 uppercase text-center">CACES</th>
                <th className="p-4 font-black text-xs text-gray-400 uppercase text-center">Trav. Hauteur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staff.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="p-4 font-bold text-sm">{emp.nom} {emp.prenom}</td>
                  {/* Cellules avec code couleur automatique */}
                  {['sst_date', 'elec_date', 'caces_date', 'travail_hauteur_date'].map(field => {
                    const date = emp[field];
                    const isValid = date && new Date(date) > new Date();
                    const isSoon = date && new Date(date) < new Date(new Date().setMonth(new Date().getMonth() + 2)); // 2 mois
                    
                    let bg = "bg-gray-100"; let text = "text-gray-400"; let icon = "-";
                    if(date) {
                      if(!isValid) { bg="bg-red-100"; text="text-red-500"; icon="Expire"; }
                      else if(isSoon) { bg="bg-orange-100"; text="text-orange-500"; icon="Bientôt"; }
                      else { bg="bg-emerald-100"; text="text-emerald-500"; icon="OK"; }
                    }

                    return (
                      <td key={field} className="p-4 text-center">
                        <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-black uppercase ${bg} ${text}`}>
                          {icon}
                        </div>
                        {date && <div className="text-[8px] text-gray-400 mt-1">{date}</div>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Onglet Contrôles (VGP)
  const EquipmentView = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between hover:border-blue-500 transition-all group">
          <div className="text-left">
            <h3 className="font-black text-gray-800 uppercase">EPI & Harnais</h3>
            <p className="text-xs text-gray-400 mt-1">Registre des vérifications</p>
          </div>
          <HardHat className="text-gray-300 group-hover:text-blue-500" size={32}/>
        </button>
        <button className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between hover:border-orange-500 transition-all group">
          <div className="text-left">
            <h3 className="font-black text-gray-800 uppercase">Levage & Machines</h3>
            <p className="text-xs text-gray-400 mt-1">Suivi VGP</p>
          </div>
          <ClipboardCheck className="text-gray-300 group-hover:text-orange-500" size={32}/>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 font-black text-xs text-gray-400 uppercase">Équipement</th>
              <th className="p-4 font-black text-xs text-gray-400 uppercase">Localisation</th>
              <th className="p-4 font-black text-xs text-gray-400 uppercase">Dernière Vérif.</th>
              <th className="p-4 font-black text-xs text-gray-400 uppercase">Prochaine Vérif.</th>
              <th className="p-4 font-black text-xs text-gray-400 uppercase text-center">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {controles.map(ctrl => {
              const isLate = new Date(ctrl.date_prochaine_verif) < new Date();
              return (
                <tr key={ctrl.id} className="hover:bg-gray-50">
                  <td className="p-4 font-bold text-sm">{ctrl.nom} <span className="text-gray-400 text-xs font-normal">({ctrl.type})</span></td>
                  <td className="p-4 text-xs font-bold text-gray-500">{ctrl.chantiers?.nom || 'Dépôt'}</td>
                  <td className="p-4 text-xs text-gray-500">{ctrl.date_derniere_verif}</td>
                  <td className={`p-4 text-xs font-bold ${isLate ? 'text-red-500' : 'text-gray-500'}`}>{ctrl.date_prochaine_verif}</td>
                  <td className="p-4 text-center">
                    {isLate 
                      ? <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-[10px] font-black uppercase">Retard</span>
                      : <span className="bg-emerald-100 text-emerald-600 px-2 py-1 rounded text-[10px] font-black uppercase">Conforme</span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f0f3f4] p-6 font-['Fredoka'] text-gray-800">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase text-[#2d3436] flex items-center gap-3">
            <ShieldCheck className="text-emerald-500" size={32}/>
            Centrale <span className="text-emerald-500">HSE</span>
          </h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">Pilotage Sécurité & Conformité</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-white text-gray-600 px-4 py-2 rounded-xl text-xs font-bold uppercase border border-gray-200 flex items-center gap-2 hover:bg-gray-50">
            <QrCode size={16}/> Badge Chantier
          </button>
          <button className="bg-[#2d3436] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase flex items-center gap-2 shadow-lg hover:bg-black">
            <Printer size={16}/> Rapport Mensuel
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex overflow-x-auto gap-4 mb-6 pb-2 no-scrollbar">
        {[
          { id: 'dashboard', label: 'Vue Globale', icon: LayoutDashboard },
          { id: 'documents', label: 'Documents & Générateurs', icon: FileText },
          { id: 'causeries', label: 'Causeries & Accidents', icon: Siren },
          { id: 'staff', label: 'Habilitations', icon: Users },
          { id: 'materiel', label: 'Matériel & VGP', icon: ClipboardCheck },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs uppercase transition-all whitespace-nowrap ${
              activeTab === tab.id 
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' 
              : 'bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            {/* Note: Icons need to be imported or passed differently in real implementation, simplified here */}
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENU */}
      {activeTab === 'dashboard' && <DashboardView />}
      {activeTab === 'documents' && <DocumentsView />}
      {activeTab === 'causeries' && (
        <div className="bg-white p-10 rounded-3xl text-center text-gray-400 font-bold">
          <Siren size={48} className="mx-auto mb-4 opacity-20"/>
          Module Causeries : Liste des quarts d'heure sécurité & Déclaration accident
        </div>
      )}
      {activeTab === 'staff' && <StaffView />}
      {activeTab === 'materiel' && <EquipmentView />}

    </div>
  );
}

// Dummy icon import for the map above to work without errors
import { LayoutDashboard, Settings } from 'lucide-react';
