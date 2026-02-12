"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ShieldCheck, AlertTriangle, FileText, HardHat, 
  ClipboardCheck, Siren, Users, CalendarRange, 
  Search, Plus, Printer, QrCode, Download,
  CheckCircle2, XCircle, Clock, MapPin, Construction,
  Filter, FileCheck, ArrowRight, Table, LayoutDashboard,
  Megaphone, FolderOpen, Save, Trash2, Edit, CloudSun, Zap, Wind
} from 'lucide-react';
import { RISK_DATABASE } from './data'; // IMPORTATION DE LA DATA

export default function HSEPlatform() {
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [selectedChantier, setSelectedChantier] = useState<string | null>(null);
  
  // Data
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]); 
  const [staff, setStaff] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);

  // Generator States
  const [docType, setDocType] = useState("ppsps"); // ppsps, mode_op, analyse_risque, minirex
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [contextData, setContextData] = useState({ meteo: 'Soleil', coactivite: 'Non', atex: 'Non', permis: 'N/A' });
  
  // Formulaires
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

  // --- GENERATEUR DOCUMENTAIRE ---
  const generateDocument = () => {
    if (!selectedChantier) return alert("Sélectionnez un chantier.");
    if (selectedTasks.length === 0) return alert("Sélectionnez au moins une tâche.");

    const chantier = chantiers.find(c => c.id === selectedChantier);
    const risks = RISK_DATABASE.filter(r => selectedTasks.includes(r.id));
    
    let title = "DOCUMENT SÉCURITÉ";
    if (docType === 'ppsps') title = "PLAN PARTICULIER DE SÉCURITÉ (PPSPS)";
    else if (docType === 'mode_op') title = "MODE OPÉRATOIRE & ANALYSE RISQUES";
    else if (docType === 'analyse_risque') title = "ANALYSE DE RISQUES (ADR)";
    else if (docType === 'minirex') title = "MINI REX / RETOUR EXPÉRIENCE";

    const w = window.open('', '_blank');
    w?.document.write(`
      <html><head><title>${title}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:40px;color:#333;font-size:12px;line-height:1.4;}
        h1{color:#e74c3c;border-bottom:3px solid #e74c3c;padding-bottom:10px;text-transform:uppercase;font-size:24px;}
        h2{background:#eee;padding:8px 15px;border-left:5px solid #2c3e50;margin-top:30px;text-transform:uppercase;font-size:16px;}
        .header-box{border:1px solid #ccc;padding:15px;display:flex;justify-content:space-between;margin-bottom:30px;background:#f9f9f9;}
        table{width:100%;border-collapse:collapse;margin-top:15px;font-size:11px;}
        th,td{border:1px solid #999;padding:8px;text-align:left;vertical-align:top;}
        th{background:#2c3e50;color:white;}
        .danger{color:#c0392b;font-weight:bold;}
        .measure{color:#27ae60;}
        .context-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px;}
        .context-item{border:1px solid #eee;padding:10px;text-align:center;font-weight:bold;}
        .signature-box{margin-top:50px;display:flex;justify-content:space-between;border:1px solid #000;padding:20px;}
      </style></head><body>
      
      <div class="header-box">
        <div>
            <strong>ALTRAD SERVICES</strong><br>
            Agence Sud-Est
        </div>
        <div style="text-align:right;">
            <strong>Projet :</strong> ${chantier.nom}<br>
            <strong>Date :</strong> ${new Date().toLocaleDateString()}<br>
            <strong>Réf :</strong> HSE-${new Date().getFullYear()}-${Math.floor(Math.random()*1000)}
        </div>
      </div>

      <h1>${title}</h1>

      <div class="context-grid">
         <div class="context-item">MÉTÉO : ${contextData.meteo}</div>
         <div class="context-item">COACTIVITÉ : ${contextData.coactivite}</div>
         <div class="context-item">ZONE ATEX : ${contextData.atex}</div>
      </div>

      <h2>1. DESCRIPTION DES TRAVAUX & MOYENS</h2>
      <p><strong>Lieu :</strong> ${chantier.adresse}</p>
      <p><strong>Description :</strong> Intervention sur site comprenant ${risks.map(r => r.task).join(', ')}.</p>

      <h2>2. ANALYSE DÉTAILLÉE DES RISQUES</h2>
      <table>
        <thead><tr><th width="25%">OPÉRATION</th><th width="35%">RISQUES IDENTIFIÉS</th><th width="40%">MESURES DE PRÉVENTION</th></tr></thead>
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

      <h2>3. SECOURS & URGENCES</h2>
      <table style="width:50%;">
         <tr><td><strong>Pompiers</strong></td><td>18</td></tr>
         <tr><td><strong>SAMU</strong></td><td>15</td></tr>
         <tr><td><strong>Responsable Chantier</strong></td><td>__________________</td></tr>
      </table>
      
      <div class="signature-box">
        <div><strong>Visa Rédateur :</strong><br><br></div>
        <div><strong>Visa Responsable Chantier :</strong><br><br></div>
        <div><strong>Visa Client (si requis) :</strong><br><br></div>
      </div>

      <script>window.print();</script>
      </body></html>
    `);
  };

  // --- ACTIONS CRUD ---
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
                        {/* TYPE DOCUMENT */}
                        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
                          {['ppsps', 'mode_op', 'analyse_risque', 'minirex'].map(t => (
                            <button key={t} onClick={() => setDocType(t)} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase whitespace-nowrap ${docType===t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                              {t.replace('_', ' ')}
                            </button>
                          ))}
                        </div>

                        {/* CONTEXTE CHANTIER */}
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6 grid grid-cols-2 gap-4">
                           <div>
                               <label className="text-xs font-bold text-gray-400 block mb-1">Météo / Conditions</label>
                               <select className="w-full p-2 bg-white rounded border" value={contextData.meteo} onChange={(e)=>setContextData({...contextData, meteo: e.target.value})}>
                                   <option>Soleil / Normal</option><option>Pluie</option><option>Vent violent</option><option>Canicule</option><option>Grand Froid</option>
                               </select>
                           </div>
                           <div>
                               <label className="text-xs font-bold text-gray-400 block mb-1">Coactivité</label>
                               <select className="w-full p-2 bg-white rounded border" value={contextData.coactivite} onChange={(e)=>setContextData({...contextData, coactivite: e.target.value})}>
                                   <option>Non</option><option>Oui (Faible)</option><option>Oui (Forte)</option>
                               </select>
                           </div>
                           <div>
                               <label className="text-xs font-bold text-gray-400 block mb-1">Zone ATEX</label>
                               <select className="w-full p-2 bg-white rounded border" value={contextData.atex} onChange={(e)=>setContextData({...contextData, atex: e.target.value})}>
                                   <option>Non</option><option>Oui (Zone 1/21)</option><option>Oui (Zone 2/22)</option>
                               </select>
                           </div>
                           <div>
                               <label className="text-xs font-bold text-gray-400 block mb-1">Permis requis</label>
                               <input type="text" className="w-full p-2 bg-white rounded border" placeholder="Feu, Pénétrer..." value={contextData.permis} onChange={(e)=>setContextData({...contextData, permis: e.target.value})}/>
                           </div>
                        </div>

                        <p className="text-xs font-bold uppercase text-gray-500 mb-2">Sélectionner les tâches à risques :</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                          {RISK_DATABASE.map(r => (
                            <label key={r.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedTasks.includes(r.id) ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white hover:bg-gray-50 border-gray-100'}`}>
                              <input type="checkbox" className="mt-1" checked={selectedTasks.includes(r.id)} onChange={(e) => {
                                e.target.checked ? setSelectedTasks([...selectedTasks, r.id]) : setSelectedTasks(selectedTasks.filter(x => x !== r.id))
                              }}/>
                              <div>
                                <div className="font-bold text-sm text-gray-800">{r.task}</div>
                                <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">{r.category} • {r.risks.length} risques</div>
                              </div>
                            </label>
                          ))}
                        </div>

                        <button onClick={generateDocument} className="w-full mt-6 bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-green-700 flex items-center justify-center gap-2">
                          <Printer size={20}/> GÉNÉRER LE DOCUMENT
                        </button>
                      </>
                    )}
                  </div>
                  
                  {/* Liste Documents Générés */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-sm mb-4">HISTORIQUE DOCUMENTS</h3>
                    <div className="space-y-3">
                      {docs.slice(0,10).map(d => (
                        <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-blue-500"/>
                            <div>
                                <p className="text-xs font-bold text-gray-700">{d.nom}</p>
                                <p className="text-[10px] text-gray-400">{new Date(d.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <span className="text-[9px] bg-white border px-2 py-1 rounded font-bold uppercase">{d.type}</span>
                        </div>
                      ))}
                      {docs.length === 0 && <p className="text-center text-gray-400 text-xs italic">Aucun document généré.</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* VUE CAUSERIES & ACCIDENTS */}
              {view === 'causeries' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Formulaire */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2"><Megaphone/> DÉCLARATION ÉVÉNEMENT</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-gray-500">Type</label>
                          <select className="w-full p-2 border rounded bg-gray-50" value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value})}>
                            <option value="causerie">Causerie / 1/4h Sécu</option>
                            <option value="accident">Accident</option>
                            <option value="presqu_accident">Presqu'accident</option>
                            <option value="visite">Visite Chantier</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500">Date</label>
                          <input type="date" className="w-full p-2 border rounded bg-gray-50" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500">Titre / Thème</label>
                        <input type="text" className="w-full p-2 border rounded bg-gray-50" placeholder="Ex: Port des EPI" value={newEvent.titre} onChange={e => setNewEvent({...newEvent, titre: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500">Description / Détails</label>
                        <textarea className="w-full p-2 border rounded bg-gray-50 h-24" value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})}></textarea>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500">Participants (Noms)</label>
                        <textarea className="w-full p-2 border rounded bg-gray-50 h-16" placeholder="Jean, Paul, Pierre..." value={newEvent.participants} onChange={e => setNewEvent({...newEvent, participants: e.target.value})}></textarea>
                      </div>
                      <button onClick={saveEvent} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow transition-colors">ENREGISTRER L'ÉVÉNEMENT</button>
                    </div>
                  </div>

                  {/* Liste */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 overflow-y-auto max-h-[600px]">
                    <h3 className="font-bold text-lg mb-4 text-gray-800">HISTORIQUE</h3>
                    {events.length === 0 && <p className="text-center text-gray-400 italic">Aucun événement enregistré.</p>}
                    {events.map(e => (
                      <div key={e.id} className="p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${e.type==='accident'?'bg-red-100 text-red-600':'bg-blue-100 text-blue-600'}`}>{e.type}</span>
                                <span className="text-xs text-gray-400">{new Date(e.date_event).toLocaleDateString()}</span>
                            </div>
                            <h4 className="font-bold text-sm text-gray-800">{e.titre}</h4>
                            <p className="text-xs text-gray-500 mt-1">{e.chantiers?.nom || 'Chantier Inconnu'}</p>
                            <p className="text-xs text-gray-400 mt-2 italic line-clamp-2">{e.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VUE PLAN D'ACTIONS */}
              {view === 'actions' && (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                      <label className="text-xs font-bold text-gray-500">Nouvelle Action Corrective</label>
                      <input type="text" className="w-full p-3 bg-gray-50 border rounded-lg" placeholder="Description de l'action..." value={newAction.description} onChange={e => setNewAction({...newAction, description: e.target.value})} />
                    </div>
                    <div className="w-full md:w-48">
                      <label className="text-xs font-bold text-gray-500">Responsable</label>
                      <input type="text" className="w-full p-3 bg-gray-50 border rounded-lg" value={newAction.responsable} onChange={e => setNewAction({...newAction, responsable: e.target.value})} />
                    </div>
                    <div className="w-full md:w-40">
                      <label className="text-xs font-bold text-gray-500">Échéance</label>
                      <input type="date" className="w-full p-3 bg-gray-50 border rounded-lg" value={newAction.echeance} onChange={e => setNewAction({...newAction, echeance: e.target.value})} />
                    </div>
                    <button onClick={saveAction} className="bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-lg font-bold w-full md:w-auto flex items-center justify-center shadow transition-colors">
                        <Plus size={20}/> Ajouter
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase">
                        <tr><th className="p-4">Action</th><th className="p-4">Chantier</th><th className="p-4">Resp.</th><th className="p-4">Échéance</th><th className="p-4 text-center">Statut</th></tr>
                      </thead>
                      <tbody>
                        {actions.map(a => (
                          <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="p-4 font-bold text-sm text-gray-700">{a.description}</td>
                            <td className="p-4 text-xs text-gray-500">{a.chantiers?.nom}</td>
                            <td className="p-4 text-xs text-gray-500">{a.responsable}</td>
                            <td className="p-4 text-xs text-gray-500">{new Date(a.echeance).toLocaleDateString()}</td>
                            <td className="p-4 text-center">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${a.statut==='en_cours'?'bg-orange-100 text-orange-600':'bg-green-100 text-green-600'}`}>{a.statut.replace('_', ' ')}</span>
                            </td>
                          </tr>
                        ))}
                         {actions.length === 0 && (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic">Aucune action en cours.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VUE DASHBOARD (Conservée) */}
              {view === 'dashboard' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div><p className="text-xs font-bold text-gray-400 uppercase">Accidents</p><p className="text-3xl font-black text-red-500">{events.filter(e=>e.type==='accident').length}</p></div>
                        <Siren className="text-red-100" size={40}/>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div><p className="text-xs font-bold text-gray-400 uppercase">Causeries</p><p className="text-3xl font-black text-blue-500">{events.filter(e=>e.type==='causerie').length}</p></div>
                        <Megaphone className="text-blue-100" size={40}/>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div><p className="text-xs font-bold text-gray-400 uppercase">Actions Ouvertes</p><p className="text-3xl font-black text-orange-500">{actions.filter(a=>a.statut==='en_cours').length}</p></div>
                        <CheckCircle2 className="text-orange-100" size={40}/>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div><p className="text-xs font-bold text-gray-400 uppercase">Habilitations Exp.</p><p className="text-3xl font-black text-purple-500">0</p></div>
                        <Users className="text-purple-100" size={40}/>
                    </div>
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
