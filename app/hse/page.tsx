"use client";

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ShieldCheck, AlertTriangle, FileText, HardHat, 
  ClipboardCheck, Siren, Users, CalendarRange, 
  Search, Plus, Printer, QrCode, Download,
  CheckCircle2, XCircle, Clock, MapPin, Construction,
  Filter, FileCheck, ArrowRight, Table, LayoutDashboard,
  Megaphone, FolderOpen, Save, Trash2, Edit
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie 
} from 'recharts';

// --- BASE DE DONNÉES RISQUES COMPLETE (Issue de vos fichiers Excel) ---
const RISK_DATABASE = [
  // --- LOGISTIQUE & PRÉPARATION ---
  { id: 'TCA-14', category: 'Logistique', task: "Approvisionnement / Préparation chantier", risks: ["Accident trajet", "Chute objet", "Choc/Coup", "Chute plain-pied", "Incidence musculaire"], measures: ["Respect code route", "Véhicule bon état", "Arrimage matériel", "Respect techniques manutention", "EPI obligatoires", "Balisage zone"] },
  { id: 'TCA-18', category: 'Logistique', task: "Déplacement sur chantier (Piéton/Véhicule)", risks: ["Accident trajet", "Choc/Coup", "Chute plain-pied", "Coactivité"], measures: ["Respect voies circulation", "Vigilance coactivité", "Port EPI (Casque/Chaussures)", "Ne pas courir", "Vigilance sol glissant"] },
  { id: 'TCA-17', category: 'Logistique', task: "Chargement / Déchargement", risks: ["Choc/Coup", "TMS", "Ecrasement", "Pollution"], measures: ["Protocole sécurité site", "Règle 3 points d'appuis", "Outils aide manutention", "Kit anti-pollution", "Gants protection 4542"] },
  { id: 'TCA-21', category: 'Logistique', task: "Circulation routière", risks: ["Accident routier", "Incendie", "Substance dangereuse"], measures: ["Véhicule contrôlé", "Arrimage charges", "Pas de téléphone au volant", "Extincteur ABC", "Kit urgence"] },

  // --- TRAVAUX EN HAUTEUR & ECHAFAUDAGE ---
  { id: 'ECH-01', category: 'Hauteur', task: "Montage échafaudage", risks: ["Chute hauteur", "Chute objet", "Effondrement"], measures: ["Personnel habilité", "Harnais double longe", "Balisage zone montage", "Vérification stabilité sol", "Cales sous pieds", "Contrôle journalier"] },
  { id: 'ECH-02', category: 'Hauteur', task: "Démontage échafaudage", risks: ["Chute hauteur", "Chute objet", "Coincement"], measures: ["Zone interdite balisée", "Descente matériel à la poulie", "Ordre et propreté plateaux", "Harnais attaché en permanence"] },
  { id: 'TCA-05', category: 'Hauteur', task: "Travaux sur échafaudage fixe", risks: ["Chute hauteur", "Chute objet", "Encombrement"], measures: ["Trappes fermées", "Plinthes en place", "Respect charges admissibles", "Aucun stockage excessif"] },
  { id: 'TCA-06', category: 'Hauteur', task: "Travaux sur échafaudage roulant", risks: ["Renversement", "Chute hauteur"], measures: ["Roues bloquées", "Stabilisateurs sortis", "Pas de déplacement avec personnel", "Sol plan et stable"] },
  { id: 'TCA-09', category: 'Hauteur', task: "Travaux avec Nacelle (PEMP)", risks: ["Chute hauteur", "Ejection", "Heurt structure"], measures: ["CACES valide", "Harnais attaché dans panier", "Balisage sol", "Vérification VGP", "Surveillant au sol"] },
  { id: 'TCA-12', category: 'Hauteur', task: "Travaux à l'échelle / Escabeau", risks: ["Chute hauteur", "Déséquilibre"], measures: ["Travail ponctuel uniquement", "3 points d'appui", "Maintien par tiers", "Echelle attachée en tête"] },
  { id: 'TCA-25', category: 'Hauteur', task: "Utilisation PIR / PIRL", risks: ["Chute hauteur", "Basculement"], measures: ["Freins bloqués", "Stabilisateurs installés", "Gardes-corps fermés", "Inspection visuelle avant usage"] },

  // --- ISOLATION & CALORIFUGE ---
  { id: 'ISO-02', category: 'Isolation', task: "Décalorifugeage", risks: ["Coupure", "Poussière (Fibres)", "Chute plain-pied"], measures: ["Gants anti-coupure", "Masque P3", "Combinaison jetable", "Humidification", "Tri déchets"] },
  { id: 'ISO-03', category: 'Isolation', task: "Pose isolant / Tôle", risks: ["Coupure tôle", "Projection", "TMS"], measures: ["Gants manutention", "Lunettes protection", "Outils adaptés", "Etabli de découpe stable"] },
  { id: 'ISO-01', category: 'Isolation', task: "Préfabrication atelier", risks: ["Coupure", "Bruit", "Poussière"], measures: ["Protections machines en place", "Aspiration locale", "EPI complets (Bouchons, Lunettes)"] },

  // --- PEINTURE & TRAITEMENT DE SURFACE ---
  { id: 'PRS-01', category: 'Peinture', task: "Brossage / Grattage manuel", risks: ["Coupure", "Poussière", "Projection"], measures: ["Gants adaptés", "Masque P1/P2", "Lunettes étanches"] },
  { id: 'PRS-06', category: 'Peinture', task: "Sablage / Grenaillage", risks: ["Projection abrasif", "Bruit", "Poussière", "Fouettement flexible"], measures: ["Heaume ventilé", "Combinaison sablage", "Câbles anti-fouettement", "Homme mort fonctionnel", "Balisage strict"] },
  { id: 'PRS-09', category: 'Peinture', task: "Application Peinture (Pistolet/Airless)", risks: ["Chimique", "Incendie", "Projection haute pression"], measures: ["Masque cartouche A2P3", "Combinaison étanche", "Extincteur zone", "Mise à la terre matériel", "FDS consultée"] },
  { id: 'PRS-08', category: 'Peinture', task: "Mélange Peinture", risks: ["Emanations COV", "Eclaboussure"], measures: ["Local ventilé", "Bac rétention", "Lunettes + Gants néoprène/nitrile", "Kit lavage oculaire"] },

  // --- RISQUES SPÉCIFIQUES & AMBIANCES ---
  { id: 'CET-04', category: 'Spécifique', task: "Travaux en capacité confinée", risks: ["Anoxie", "Intoxication", "Explosion"], measures: ["Permis de pénétrer", "Surveillant obligatoire", "Détecteur 4 gaz", "Ventilation mécanique", "Masque auto-sauveteur"] },
  { id: 'CET-10', category: 'Spécifique', task: "Zone ATEX", risks: ["Explosion", "Incendie"], measures: ["Matériel antidéflagrant", "Pas de téléphone/allumette", "Permis de feu", "Explosimètre permanent", "Vêtements antistatiques"] },
  { id: 'CET-08', category: 'Spécifique', task: "Voisinage électrique", risks: ["Electrisation", "Arc électrique"], measures: ["Habilitation H0/B0", "Respect distances sécurité", "Balisage physique", "Outillage isolé"] },
  { id: 'CET-09', category: 'Spécifique', task: "Travaux proximité eau", risks: ["Noyade", "Chute"], measures: ["Gilet sauvetage", "Bouée couronne", "Travail en binôme", "Balisage berge"] },
  { id: 'TCA-23', category: 'Spécifique', task: "Utilisation outils coupants", risks: ["Coupure grave"], measures: ["Cutter lame rétractable OBLIGATOIRE", "Gants niveau 5", "Pas de coupe vers soi"] }
];

export default function HSEPlatform() {
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [selectedChantier, setSelectedChantier] = useState<string | null>(null);
  
  // Data
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]); // Causeries, Accidents
  const [staff, setStaff] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);

  // Generator States
  const [docType, setDocType] = useState("ppsps"); // ppsps, mode_op, analyse_risque
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  
  // Formulaires (Nouveau)
  const [newEvent, setNewEvent] = useState<any>({ type: 'causerie', titre: '', date: '', description: '', participants: '' });
  const [newAction, setNewAction] = useState<any>({ description: '', responsable: '', echeance: '', priorite: 'moyenne' });

  // --- INITIALISATION ---
  useEffect(() => { fetchGlobalData(); }, []);
  useEffect(() => { fetchOperationalData(); }, [selectedChantier]);

  const fetchGlobalData = async () => {
    const { data } = await supabase.from('chantiers').select('*').eq('statut', 'en_cours');
    if (data) setChantiers(data);
  };

  const fetchOperationalData = async () => {
    setLoading(true);
    let qDocs = supabase.from('hse_documents').select('*, chantiers(nom)');
    let qEvents = supabase.from('hse_events').select('*, chantiers(nom)').order('date_event', { ascending: false });
    let qActions = supabase.from('hse_actions').select('*, chantiers(nom)').order('echeance', { ascending: true });
    let qStaff = supabase.from('employes').select('*'); 

    if (selectedChantier) {
      qDocs = qDocs.or(`chantier_id.eq.${selectedChantier},chantier_id.is.null`);
      qEvents = qEvents.eq('chantier_id', selectedChantier);
      qActions = qActions.eq('chantier_id', selectedChantier);
    }

    const [rDocs, rEvents, rActions, rStaff] = await Promise.all([qDocs, qEvents, qActions, qStaff]);

    if (rDocs.data) setDocs(rDocs.data);
    if (rEvents.data) setEvents(rEvents.data);
    if (rActions.data) setActions(rActions.data);
    if (rStaff.data) setStaff(rStaff.data);
    
    setLoading(false);
  };

  // --- GENERATEUR DOCUMENTAIRE PUISSANT ---
  const generateDocument = () => {
    if (!selectedChantier) return alert("Sélectionnez un chantier.");
    if (selectedTasks.length === 0) return alert("Sélectionnez au moins une tâche.");

    const chantier = chantiers.find(c => c.id === selectedChantier);
    const risks = RISK_DATABASE.filter(r => selectedTasks.includes(r.id));
    const title = docType === 'ppsps' ? 'PPSPS SIMPLIFIÉ' : docType === 'mode_op' ? 'MODE OPÉRATOIRE' : 'ANALYSE DE RISQUES';

    const w = window.open('', '_blank');
    w?.document.write(`
      <html><head><title>${title}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:30px;color:#333;font-size:12px;}
        h1{color:#e74c3c;border-bottom:2px solid #e74c3c;padding-bottom:10px;text-transform:uppercase;}
        .header{background:#f5f5f5;padding:15px;margin-bottom:20px;border-radius:5px;}
        table{width:100%;border-collapse:collapse;margin-top:15px;}
        th,td{border:1px solid #999;padding:8px;text-align:left;vertical-align:top;}
        th{background:#2c3e50;color:white;font-size:11px;}
        .cat{background:#eee;font-weight:bold;text-align:center;}
        .danger{color:#c0392b;font-weight:bold;}
        .measure{color:#27ae60;}
      </style></head><body>
      
      <div class="header">
        <h2 style="margin:0;">${title}</h2>
        <p><strong>CHANTIER :</strong> ${chantier.nom} (${chantier.adresse})</p>
        <p><strong>DATE :</strong> ${new Date().toLocaleDateString()}</p>
      </div>

      <h3>1. ANALYSE DÉTAILLÉE DES TÂCHES & RISQUES</h3>
      <table>
        <thead><tr><th width="25%">OPÉRATION / TÂCHE</th><th width="35%">RISQUES IDENTIFIÉS</th><th width="40%">MESURES DE PRÉVENTION OBLIGATOIRES</th></tr></thead>
        <tbody>
          ${risks.map(r => `
            <tr>
              <td><strong>${r.task}</strong><br><em style="font-size:10px;color:#666;">${r.category}</em></td>
              <td class="danger"><ul>${r.risks.map(x=>`<li>${x}</li>`).join('')}</ul></td>
              <td class="measure"><ul>${r.measures.map(x=>`<li>${x}</li>`).join('')}</ul></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h3>2. CONSIGNES SPÉCIFIQUES</h3>
      <p><strong>URGENCES :</strong> En cas d'accident, appeler le 15 (SAMU) ou 18 (Pompiers). Le point de rassemblement est situé à l'entrée principale.</p>
      <p><strong>COACTIVITÉ :</strong> Vigilance accrue lors des déplacements. Respect strict du balisage.</p>
      
      <br><br>
      <div style="border:1px solid #000;padding:20px;width:300px;">
        <strong>Visa Responsable Chantier :</strong><br><br><br>
      </div>

      <script>window.print();</script>
      </body></html>
    `);
  };

  // --- ACTIONS CRUD (Create/Read) ---
  const saveEvent = async () => {
    if (!selectedChantier) return alert("Sélectionnez un chantier.");
    if (!newEvent.titre || !newEvent.date) return alert("Remplissez les champs obligatoires.");

    const { error } = await supabase.from('hse_events').insert([{
      ...newEvent, chantier_id: selectedChantier, date_event: newEvent.date
    }]);

    if (error) alert("Erreur: " + error.message);
    else {
      setNewEvent({ type: 'causerie', titre: '', date: '', description: '', participants: '' });
      fetchOperationalData();
      alert("Enregistré !");
    }
  };

  const saveAction = async () => {
    if (!selectedChantier) return alert("Sélectionnez un chantier.");
    if (!newAction.description) return alert("Description requise.");

    const { error } = await supabase.from('hse_actions').insert([{
      ...newAction, chantier_id: selectedChantier
    }]);

    if (error) alert("Erreur: " + error.message);
    else {
      setNewAction({ description: '', responsable: '', echeance: '', priorite: 'moyenne' });
      fetchOperationalData();
      alert("Action ajoutée !");
    }
  };

  // --- RENDER ---
  return (
    <div className="flex min-h-screen bg-[#f8f9fa] font-sans text-gray-800">
      
      {/* SIDEBAR */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full sticky top-0">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-black uppercase text-gray-900 leading-none">HSE<span className="text-red-600">.Manager</span></h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NavBtn id="dashboard" icon={LayoutDashboard} label="Tableau de bord" view={view} set={setView} />
          <NavBtn id="documents" icon={FolderOpen} label="Générateur Documents" view={view} set={setView} />
          <NavBtn id="causeries" icon={Megaphone} label="Causeries / Accidents" view={view} set={setView} />
          <NavBtn id="actions" icon={CheckCircle2} label="Plan d'Actions" view={view} set={setView} />
          <NavBtn id="staff" icon={Users} label="Habilitations" view={view} set={setView} />
        </nav>
      </div>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* HEADER */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-gray-800 uppercase">{view.replace('_', ' ')}</h2>
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <select className="bg-transparent text-xs font-bold uppercase outline-none px-4 py-2 cursor-pointer" onChange={(e) => setSelectedChantier(e.target.value || null)} value={selectedChantier || ''}>
              <option value="">Sélectionner un chantier...</option>
              {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
        </header>

        {/* CONTENU */}
        <div className="flex-1 overflow-y-auto p-8">
          {loading ? <div className="text-center mt-20">Chargement...</div> : (
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in">
              
              {/* VUE GENERATEUR DOCUMENTS */}
              {view === 'documents' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><FileText/> CONFIGURATEUR DOCUMENTAIRE</h3>
                    
                    {!selectedChantier ? <div className="bg-orange-50 text-orange-600 p-4 rounded font-bold">⚠️ Sélectionnez un chantier pour commencer.</div> : (
                      <>
                        <div className="mb-6 flex gap-4">
                          {['ppsps', 'mode_op', 'analyse_risque'].map(t => (
                            <button key={t} onClick={() => setDocType(t)} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase ${docType===t ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                              {t.replace('_', ' ')}
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
                          {RISK_DATABASE.map(r => (
                            <label key={r.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedTasks.includes(r.id) ? 'bg-blue-50 border-blue-500' : 'bg-white hover:bg-gray-50'}`}>
                              <input type="checkbox" className="mt-1" checked={selectedTasks.includes(r.id)} onChange={(e) => {
                                e.target.checked ? setSelectedTasks([...selectedTasks, r.id]) : setSelectedTasks(selectedTasks.filter(x => x !== r.id))
                              }}/>
                              <div>
                                <div className="font-bold text-sm">{r.task}</div>
                                <div className="text-xs text-gray-500">{r.category} • {r.risks.length} risques</div>
                              </div>
                            </label>
                          ))}
                        </div>

                        <button onClick={generateDocument} className="w-full mt-6 bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-green-700 flex items-center justify-center gap-2">
                          <Printer size={20}/> GÉNÉRER {docType.toUpperCase().replace('_', ' ')}
                        </button>
                      </>
                    )}
                  </div>
                  
                  {/* Liste Documents Générés (Mockup pour l'instant) */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-sm mb-4">DERNIERS DOCUMENTS</h3>
                    <div className="space-y-3">
                      {docs.slice(0,5).map(d => (
                        <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <FileText size={14} className="text-blue-500"/>
                            <span className="text-xs font-bold">{d.nom}</span>
                          </div>
                          <span className="text-[10px] bg-gray-200 px-2 py-1 rounded">{d.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* VUE CAUSERIES & ACCIDENTS (ACTIVÉE) */}
              {view === 'causeries' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Formulaire */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-lg mb-4">NOUVEL ÉVÉNEMENT</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-gray-500">Type</label>
                          <select className="w-full p-2 border rounded" value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value})}>
                            <option value="causerie">Causerie / 1/4h Sécu</option>
                            <option value="accident">Accident</option>
                            <option value="presqu_accident">Presqu'accident</option>
                            <option value="visite">Visite Chantier</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500">Date</label>
                          <input type="date" className="w-full p-2 border rounded" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500">Titre / Thème</label>
                        <input type="text" className="w-full p-2 border rounded" placeholder="Ex: Port des EPI" value={newEvent.titre} onChange={e => setNewEvent({...newEvent, titre: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500">Description / Détails</label>
                        <textarea className="w-full p-2 border rounded h-24" value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})}></textarea>
                      </div>
                      <button onClick={saveEvent} className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg">ENREGISTRER</button>
                    </div>
                  </div>

                  {/* Liste */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 overflow-y-auto max-h-[600px]">
                    <h3 className="font-bold text-lg mb-4">HISTORIQUE</h3>
                    {events.map(e => (
                      <div key={e.id} className="p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${e.type==='accident'?'bg-red-100 text-red-600':'bg-blue-100 text-blue-600'}`}>{e.type}</span>
                            <h4 className="font-bold mt-1">{e.titre}</h4>
                            <p className="text-xs text-gray-500">{new Date(e.date_event).toLocaleDateString()} • {e.chantiers?.nom}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VUE PLAN D'ACTIONS (ACTIVÉE) */}
              {view === 'actions' && (
                <div className="space-y-6">
                  <div className="bg-white p-4 rounded-xl border border-gray-200 flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="text-xs font-bold text-gray-500">Nouvelle Action</label>
                      <input type="text" className="w-full p-2 border rounded" placeholder="Description de l'action..." value={newAction.description} onChange={e => setNewAction({...newAction, description: e.target.value})} />
                    </div>
                    <div className="w-40">
                      <label className="text-xs font-bold text-gray-500">Responsable</label>
                      <input type="text" className="w-full p-2 border rounded" value={newAction.responsable} onChange={e => setNewAction({...newAction, responsable: e.target.value})} />
                    </div>
                    <div className="w-40">
                      <label className="text-xs font-bold text-gray-500">Échéance</label>
                      <input type="date" className="w-full p-2 border rounded" value={newAction.echeance} onChange={e => setNewAction({...newAction, echeance: e.target.value})} />
                    </div>
                    <button onClick={saveAction} className="bg-emerald-500 text-white p-2 rounded-lg font-bold w-10 h-10 flex items-center justify-center">+</button>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase">
                        <tr><th className="p-4">Action</th><th className="p-4">Chantier</th><th className="p-4">Resp.</th><th className="p-4">Échéance</th><th className="p-4 text-center">Statut</th></tr>
                      </thead>
                      <tbody>
                        {actions.map(a => (
                          <tr key={a.id} className="border-b border-gray-50">
                            <td className="p-4 font-bold text-sm">{a.description}</td>
                            <td className="p-4 text-xs">{a.chantiers?.nom}</td>
                            <td className="p-4 text-xs">{a.responsable}</td>
                            <td className="p-4 text-xs">{new Date(a.echeance).toLocaleDateString()}</td>
                            <td className="p-4 text-center">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${a.statut==='en_cours'?'bg-orange-100 text-orange-600':'bg-green-100 text-green-600'}`}>{a.statut.replace('_', ' ')}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VUE DASHBOARD (Conservée) */}
              {view === 'dashboard' && (
                <div className="text-center py-10">
                  <h2 className="text-2xl font-bold mb-4">TABLEAU DE BORD SÉCURITÉ</h2>
                  <p className="text-gray-500">Sélectionnez un module dans le menu de gauche pour commencer.</p>
                </div>
              )}

            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const NavBtn = ({id, icon: Icon, label, view, set}: any) => (
  <button onClick={() => set(id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${view === id ? 'bg-black text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50 hover:text-black'}`}>
    <Icon size={18} /> {label}
  </button>
);

const StatCard = ({ label, val, icon: Icon, color }: any) => {
  const themes: any = { red: "bg-red-50 text-red-600", orange: "bg-orange-50 text-orange-600", emerald: "bg-emerald-50 text-emerald-600", blue: "bg-blue-50 text-blue-600", gray: "bg-white text-gray-800" };
  return (
    <div className={`p-5 rounded-2xl border flex items-center justify-between shadow-sm ${themes[color] || themes.gray}`}>
      <div><p className="text-[10px] font-black uppercase opacity-60 tracking-wider">{label}</p><p className="text-3xl font-black mt-1">{val}</p></div>
      <div className="bg-white/50 p-3 rounded-xl backdrop-blur-sm"><Icon size={24}/></div>
    </div>
  )
};
