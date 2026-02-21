"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Plus, Calculator, PencilRuler, Save, 
  Trash2, ChevronRight, CheckCircle2, AlertTriangle, 
  Settings, Layers, Pipette, Share2, Wifi, WifiOff,
  User, Calendar, Briefcase, Ruler, X, AlertCircle, MapPin,
  Printer, Square, CheckSquare, Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Dexie, { Table } from 'dexie';

// =================================================================================================
// 1. BASE DE DONNÉES LOCALE (Dexie.js)
// =================================================================================================
class OfflineDB extends Dexie {
  reports!: Table<any>;
  constructor() {
    super('AltradHSE_Offline');
    this.version(1).stores({
      reports: '++id, chantier_id, date, status, is_synced'
    });
  }
}

const db = typeof window !== 'undefined' ? new OfflineDB() : null;

// =================================================================================================
// 2. MOTEUR SCIENTIFIQUE
// =================================================================================================
const ScientificEngine = {
  calculateSurface: (type: string, dims: any) => {
    switch (type) {
      case 'rectangle': return dims.L * dims.l;
      case 'cylindre': return Math.PI * dims.D * dims.H;
      default: return 0;
    }
  },
  calculatePaint: (surface: number, microns: number, rendement: number) => {
    if (!rendement) return 0;
    return (surface * microns) / (rendement * 10);
  },
  calculateAbrasive: (surface: number, degree: string) => {
    const factors: any = { 'Sa1': 15, 'Sa2': 25, 'Sa2.5': 40, 'Sa3': 55 };
    return (surface * (factors[degree] || 0)) / 1000;
  }
};

// =================================================================================================
// 3. COMPOSANT SKETCH (Dynamic Import)
// =================================================================================================
const SketchTool = ({ type, dims }: { type: string, dims: any }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let isMounted = true;

    const renderSketch = async () => {
      if (!svgRef.current || typeof window === 'undefined') return;
      
      try {
        const roughModule = await import('roughjs');
        const rough = roughModule.default;
        
        if (!isMounted || !svgRef.current) return;
        
        const rc = rough.svg(svgRef.current);
        const node = svgRef.current;
        
        while (node.firstChild) node.removeChild(node.firstChild);

        if (type === 'rectangle') {
          const w = Math.max(dims.L * 10, 50); 
          const h = Math.max(dims.l * 10, 30);
          const x = 50; const y = 50;

          const rect = rc.rectangle(x, y, w, h, { roughness: 1.5, stroke: '#2d3436', strokeWidth: 2 });
          node.appendChild(rect);

          // Cotes dynamiques
          const textL = document.createElementNS("http://www.w3.org/2000/svg", "text");
          textL.setAttribute("x", (x + w / 2 - 10).toString());
          textL.setAttribute("y", (y - 15).toString());
          textL.setAttribute("fill", "#0984e3");
          textL.textContent = `${dims.L}m`;
          node.appendChild(textL);
          
          const textl = document.createElementNS("http://www.w3.org/2000/svg", "text");
          textl.setAttribute("x", (x - 30).toString());
          textl.setAttribute("y", (y + h / 2).toString());
          textl.setAttribute("fill", "#d63031");
          textl.textContent = `${dims.l}m`;
          node.appendChild(textl);
        }
      } catch (error) {
        console.error("Erreur Rough.js:", error);
      }
    };

    renderSketch();
    return () => { isMounted = false; };
  }, [type, dims]);

  return <svg ref={svgRef} width="100%" height="250" className="bg-gray-50 rounded-xl border border-gray-100 shadow-inner" />;
};

// =================================================================================================
// 4. COMPOSANT PRINCIPAL (CONNECTÉ)
// =================================================================================================
export default function Rapports() {
  const [isOnline, setIsOnline] = useState(true);
  const [meetingTab, setMeetingTab] = useState<'notes' | 'calculs' | 'actions' | 'recap_hebdo'>('notes');
  
  // Données connectées
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [selectedChantier, setSelectedChantier] = useState<string>("");
  const [chantierDetails, setChantierDetails] = useState<any>(null); // Pour stocker les infos réelles du chantier sélectionné

  const [notes, setNotes] = useState<any[]>([]);
  const [calculs, setCalculs] = useState<any[]>([]);
  const [activeNote, setActiveNote] = useState("");
  const [noteCategory, setNoteCategory] = useState("Technique");

  const [calcForm, setCalcForm] = useState({ L: 10, l: 5, microns: 200, rendement: 5, degree: 'Sa2.5' });

  // Données connectées pour Récap Hebdo
  const [materiels, setMateriels] = useState<any[]>([]);
  const [fournitures, setFournitures] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [taches, setTaches] = useState<any[]>([]);
  
  // Bonus & Print settings
  const [printFormat, setPrintFormat] = useState('A4 portrait');
  const [controleLe, setControleLe] = useState(new Date().toISOString().split('T')[0]);
  const [commandeApasser, setCommandeApasser] = useState("");
  const [risqueIdentifie, setRisqueIdentifie] = useState("");

  // 1. Initialisation & Listeners
  useEffect(() => {
    if (typeof window !== 'undefined') {
        setIsOnline(navigator.onLine);
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        // Charger la liste initiale des chantiers réels
        fetchChantiersList();

        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
        };
    }
  }, []);

  // 2. Fetch de la liste simple (ID + Nom)
  async function fetchChantiersList() {
    try {
      // Correction : Suppression du filtre 'statut' qui causait probablement une erreur 400
      const { data, error } = await supabase
        .from('chantiers')
        .select('id, nom')
        .order('nom', { ascending: true });
      
      if (error) throw error;
      if (data) setChantiers(data);
    } catch (e) {
      console.error("Erreur chargement chantiers:", e);
    }
  }

  // 3. Fetch des détails complets quand on sélectionne un chantier (Sidebar dynamique + Récap Hebdo)
  useEffect(() => {
    async function getDetails() {
      if (!selectedChantier) {
        setChantierDetails(null);
        setMateriels([]); setFournitures([]); setLocations([]); setTaches([]);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('chantiers')
          .select('*')
          .eq('id', selectedChantier)
          .single();

        if (error) throw error;
        setChantierDetails(data);

        // Fetch des données réelles connectées (tolérance d'erreur si tables manquantes)
        const fetchSafe = async (table: string) => {
          const { data } = await supabase.from(table).select('*').eq('chantier_id', selectedChantier);
          return data || [];
        };

        setMateriels(await fetchSafe('materiels'));
        setFournitures(await fetchSafe('fournitures'));
        setLocations(await fetchSafe('locations'));
        setTaches(await fetchSafe('taches'));

      } catch (e) {
        console.error("Erreur détails chantier:", e);
      }
    }
    getDetails();
  }, [selectedChantier]);

  const addNote = () => {
    if (!activeNote) return;
    const newNote = {
      id: Date.now(),
      category: noteCategory,
      text: activeNote,
      type: 'observation',
      timestamp: new Date().toISOString()
    };
    setNotes([newNote, ...notes]);
    setActiveNote("");
  };

  const saveReport = async () => {
    if (!selectedChantier) {
      alert("Veuillez sélectionner un chantier réel avant d'enregistrer.");
      return;
    }

    const report = {
      chantier_id: selectedChantier,
      date: new Date().toISOString(),
      notes,
      calculs,
      // On lie aussi les métriques calculées
      metriques_techniques: {
        surface: surfaceCalculated,
        peinture: paintNeeded,
        abrasif: sandNeeded
      },
      is_synced: false
    };

    // 1. Sauvegarde Locale (Toujours)
    if (db) {
        try {
          await db.reports.add(report);
        } catch (e) {
          console.error("Erreur IndexedDB:", e);
        }
    }
    
    // 2. Sauvegarde Cloud (Si Online)
    if (isOnline) {
      try {
        const { error } = await supabase.from('reunions').insert([report]);
        if (error) throw error;
        alert("Rapport synchronisé avec la base de données centrale !");
        // Reset optionnel
        setNotes([]);
      } catch (e: any) {
        alert("Erreur Sync Supabase: " + e.message);
      }
    } else {
      alert("Rapport enregistré localement (En attente de connexion).");
    }
  };

  const surfaceCalculated = ScientificEngine.calculateSurface('rectangle', { L: calcForm.L, l: calcForm.l });
  const paintNeeded = ScientificEngine.calculatePaint(surfaceCalculated, calcForm.microns, calcForm.rendement);
  const sandNeeded = ScientificEngine.calculateAbrasive(surfaceCalculated, calcForm.degree);

  // Fonction utilitaire pour alertes locations
  const isExpiringSoon = (dateString: string) => {
    if (!dateString) return false;
    const diffDays = Math.ceil((new Date(dateString).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER & SYNC STATUS */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 gap-4 print-hidden">
          <div className="flex items-center gap-4">
            <div className="bg-black p-3 rounded-2xl text-white shadow-lg shadow-gray-200">
              <FileText size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-gray-800">Réunion Chantier</h1>
              <div className="flex items-center gap-2">
                {isOnline ? 
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 uppercase bg-emerald-50 px-2 py-0.5 rounded-full"><Wifi size={12}/> Connecté</span> :
                  <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase bg-red-50 px-2 py-0.5 rounded-full"><WifiOff size={12}/> Mode Hors-Ligne</span>
                }
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">• Altrad Services v3.1</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <select 
              value={selectedChantier} 
              onChange={(e) => setSelectedChantier(e.target.value)}
              className="flex-1 md:w-64 bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-sm text-gray-700 outline-none focus:ring-2 focus:ring-black transition-all"
            >
              <option value="">-- Sélectionner Chantier --</option>
              {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            <button onClick={saveReport} className="bg-black text-white px-6 py-3 rounded-xl font-black uppercase text-xs shadow-xl flex items-center gap-2 hover:scale-105 transition-all active:scale-95 whitespace-nowrap">
              <Save size={16}/> Enregistrer
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* ZONE PRINCIPALE (Notes & Calculs & Récap) */}
          <div className="lg:col-span-2 space-y-6">
            <div className={`bg-white rounded-[35px] p-8 shadow-sm border border-gray-100 min-h-[600px] flex flex-col ${meetingTab === 'recap_hebdo' ? 'print-container-wrapper' : ''}`}>
              
              {/* Infos contextuelles du chantier sélectionné */}
              {chantierDetails && meetingTab !== 'recap_hebdo' && (
                <div className="mb-6 flex items-center gap-4 text-xs font-bold text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-1"><MapPin size={14}/> {chantierDetails.ville || 'Localisation inconnue'}</div>
                  <div className="w-px h-4 bg-gray-300"></div>
                  <div className="flex items-center gap-1"><User size={14}/> Client: {chantierDetails.client || 'N/A'}</div>
                </div>
              )}

              <div className="flex items-center gap-2 mb-8 bg-gray-50 p-2 rounded-2xl self-start print-hidden">
                {['notes', 'calculs', 'actions', 'recap_hebdo'].map((t: any) => (
                  <button 
                    key={t} 
                    onClick={() => setMeetingTab(t)}
                    className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${meetingTab === t ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {t === 'recap_hebdo' ? 'Récap Hebdo' : t}
                  </button>
                ))}
              </div>

              {meetingTab === 'notes' && (
                <div className="flex-1 flex flex-col animate-in fade-in">
                  <div className="flex gap-4 mb-8">
                    <div className="flex-1 relative">
                      <textarea 
                        value={activeNote}
                        onChange={(e) => setActiveNote(e.target.value)}
                        placeholder={selectedChantier ? "Prendre une note..." : "Sélectionnez un chantier pour commencer..."}
                        disabled={!selectedChantier}
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-2xl p-4 font-medium text-gray-700 outline-none transition-all h-32 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <div className="absolute bottom-3 right-3 flex gap-2">
                        <select value={noteCategory} onChange={(e) => setNoteCategory(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-[10px] font-black uppercase text-gray-500 outline-none">
                          <option>Technique</option>
                          <option>Planning</option>
                          <option>Budget</option>
                          <option>Sécurité</option>
                        </select>
                        <button onClick={addNote} disabled={!selectedChantier} className="bg-black text-white p-2 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"><Plus size={20} /></button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {notes.map((n) => (
                      <div key={n.id} className="group bg-white border border-gray-100 p-5 rounded-2xl hover:shadow-md transition-all flex items-start gap-4">
                        <div className={`w-1 h-10 rounded-full ${n.category === 'Sécurité' ? 'bg-red-500' : 'bg-blue-500'}`} />
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{n.category}</span>
                            <span className="text-[9px] font-bold text-gray-300">{new Date(n.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-gray-700 font-medium leading-relaxed">{n.text}</p>
                        </div>
                        <button onClick={() => setNotes(notes.filter(item => item.id !== n.id))} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                      </div>
                    ))}
                    {notes.length === 0 && <p className="text-center text-gray-300 text-sm italic mt-10">Aucune note pour le moment.</p>}
                  </div>
                </div>
              )}

              {meetingTab === 'calculs' && (
                <div className="flex-1 animate-in fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <h3 className="font-black uppercase text-gray-700 flex items-center gap-2 border-b border-gray-100 pb-2"><Settings size={18} className="text-blue-500"/> Paramètres</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div><label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Longueur (m)</label><input type="number" value={calcForm.L} onChange={(e)=>setCalcForm({...calcForm, L: parseFloat(e.target.value)})} className="w-full bg-gray-50 rounded-xl p-3 font-bold outline-none border-2 border-transparent focus:border-blue-400" /></div>
                          <div><label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Largeur (m)</label><input type="number" value={calcForm.l} onChange={(e)=>setCalcForm({...calcForm, l: parseFloat(e.target.value)})} className="w-full bg-gray-50 rounded-xl p-3 font-bold outline-none border-2 border-transparent focus:border-red-400" /></div>
                          <div><label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Épaisseur (µm)</label><input type="number" value={calcForm.microns} onChange={(e)=>setCalcForm({...calcForm, microns: parseFloat(e.target.value)})} className="w-full bg-gray-50 rounded-xl p-3 font-bold outline-none" /></div>
                          <div><label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Rendement (m²/L)</label><input type="number" value={calcForm.rendement} onChange={(e)=>setCalcForm({...calcForm, rendement: parseFloat(e.target.value)})} className="w-full bg-gray-50 rounded-xl p-3 font-bold outline-none" /></div>
                        </div>
                      </div>
                      <div className="flex flex-col items-center justify-center">
                        <SketchTool type="rectangle" dims={{ L: calcForm.L, l: calcForm.l }} />
                        <div className="w-full mt-4 p-4 bg-blue-50 rounded-2xl border border-blue-100 grid grid-cols-3 gap-2 text-center text-blue-800">
                          <div><p className="text-[9px] font-black uppercase opacity-50">Surface</p><p className="text-lg font-black">{surfaceCalculated.toFixed(2)}m²</p></div>
                          <div><p className="text-[9px] font-black uppercase opacity-50">Peinture</p><p className="text-lg font-black">{paintNeeded.toFixed(1)}L</p></div>
                          <div><p className="text-[9px] font-black uppercase opacity-50">Abrasif</p><p className="text-lg font-black">{sandNeeded.toFixed(2)}T</p></div>
                        </div>
                      </div>
                    </div>
                </div>
              )}

              {meetingTab === 'recap_hebdo' && (
                <div className="flex-1 animate-in fade-in relative">
                  
                  {/* CSS D'IMPRESSION GLOBAL (Injecté uniquement si onglet actif) */}
                  <style>{`
                    @media print {
                      body * { visibility: hidden; }
                      #print-recap-area, #print-recap-area * { visibility: visible; }
                      #print-recap-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
                      @page { size: ${printFormat}; margin: 10mm; }
                      .print-hidden { display: none !important; }
                      .break-inside-avoid { page-break-inside: avoid; break-inside: avoid; }
                    }
                  `}</style>

                  {/* Barre d'action Impression */}
                  <div className="flex flex-wrap justify-between items-center mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200 print-hidden">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-black uppercase text-gray-500">Format d'impression :</label>
                      <select value={printFormat} onChange={e => setPrintFormat(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-black">
                        <option value="A4 portrait">A4 Portrait</option>
                        <option value="A4 landscape">A4 Paysage</option>
                        <option value="A3 portrait">A3 Portrait</option>
                        <option value="A3 landscape">A3 Paysage</option>
                      </select>
                    </div>
                    <button onClick={() => window.print()} className="bg-black text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase flex items-center gap-2 hover:bg-gray-800 transition-all shadow-md">
                      <Printer size={16} /> Imprimer Document
                    </button>
                  </div>

                  {/* DOCUMENT RÉCAPITULATIF POUR IMPRESSION */}
                  <div id="print-recap-area" className="bg-white print:p-0 print:border-none w-full text-black">
                    
                    {/* En-tête Document */}
                    <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end break-inside-avoid">
                      <div>
                        <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight">Fiche Récapitulative Hebdomadaire</h2>
                        <div className="text-sm font-bold text-gray-600 uppercase mt-2 flex items-center gap-4">
                          <span>Chantier : <span className="text-black">{chantierDetails?.nom || 'NON SÉLECTIONNÉ'}</span></span>
                          {chantierDetails?.ville && <span>| Ville : <span className="text-black">{chantierDetails.ville}</span></span>}
                        </div>
                      </div>
                      <div className="text-right text-xs font-medium bg-gray-50 p-3 rounded-lg border border-gray-200 print:border-black print:bg-white">
                        <p className="mb-1 uppercase font-bold text-gray-500 print:text-black">Contrôlé le :</p>
                        <input type="date" value={controleLe} onChange={e => setControleLe(e.target.value)} className="bg-transparent font-bold outline-none border-b border-gray-300 print:border-none" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      
                      {/* SECTION 1 : MATÉRIELS */}
                      <div className="break-inside-avoid">
                        <h3 className="text-xs font-black uppercase bg-gray-100 print:bg-gray-200 p-2 mb-3 border-l-4 border-black">1. Matériels sur Chantier</h3>
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b-2 border-gray-300">
                              <th className="py-2 px-1">Désignation</th>
                              <th className="py-2 px-1">État Maintenance</th>
                              <th className="py-2 px-1 text-center w-20">Présent</th>
                              <th className="py-2 px-1 text-center w-20">Manquant</th>
                            </tr>
                          </thead>
                          <tbody>
                            {materiels.length > 0 ? materiels.map(m => (
                              <tr key={m.id} className="border-b border-gray-200">
                                <td className="py-2 px-1 font-bold">{m.nom}</td>
                                <td className={`py-2 px-1 font-medium ${m.etat === 'En panne' ? 'text-red-500 print:text-black print:font-black' : ''}`}>
                                  {m.etat === 'En panne' && <AlertTriangle size={12} className="inline mr-1 text-red-500 print-hidden" />}
                                  {m.etat || 'Opérationnel'}
                                </td>
                                <td className="py-2 px-1 text-center"><Square size={16} className="mx-auto text-gray-300 print:text-black"/></td>
                                <td className="py-2 px-1 text-center"><Square size={16} className="mx-auto text-gray-300 print:text-black"/></td>
                              </tr>
                            )) : <tr><td colSpan={4} className="py-4 text-center text-gray-400 italic">Aucun matériel listé...</td></tr>}
                          </tbody>
                        </table>
                      </div>

                      {/* SECTION 2 : FOURNITURES */}
                      <div className="break-inside-avoid">
                        <h3 className="text-xs font-black uppercase bg-gray-100 print:bg-gray-200 p-2 mb-3 border-l-4 border-black">2. Fournitures & Consommables</h3>
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b-2 border-gray-300">
                              <th className="py-2 px-1">Désignation</th>
                              <th className="py-2 px-1 text-center">Qté Prévue</th>
                              <th className="py-2 px-1 text-center">Qté Dispo</th>
                              <th className="py-2 px-1 text-center w-20">Dispo OK</th>
                              <th className="py-2 px-1 text-center w-24">Commandé</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fournitures.length > 0 ? fournitures.map(f => {
                              const alertQty = f.quantite_dispo < (f.seuil_alerte || f.quantite_prevue);
                              return (
                                <tr key={f.id} className={`border-b border-gray-200 ${alertQty ? 'bg-red-50 print:bg-white' : ''}`}>
                                  <td className="py-2 px-1 font-bold flex items-center gap-2">
                                    {alertQty && <AlertTriangle size={14} className="text-red-500 print:text-black" />} {f.nom}
                                  </td>
                                  <td className="py-2 px-1 text-center">{f.quantite_prevue || '-'}</td>
                                  <td className={`py-2 px-1 text-center font-bold ${alertQty ? 'text-red-600 print:text-black' : ''}`}>{f.quantite_dispo || 0}</td>
                                  <td className="py-2 px-1 text-center"><Square size={16} className="mx-auto text-gray-300 print:text-black"/></td>
                                  <td className="py-2 px-1 text-center"><Square size={16} className="mx-auto text-gray-300 print:text-black"/></td>
                                </tr>
                              );
                            }) : <tr><td colSpan={5} className="py-4 text-center text-gray-400 italic">Aucune fourniture listée...</td></tr>}
                          </tbody>
                        </table>
                      </div>

                      {/* SECTION 3 : LOCATIONS & TÂCHES (Sur 2 colonnes en format paysage/A3 si place dispo) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 break-inside-avoid">
                        
                        {/* Locations */}
                        <div>
                          <h3 className="text-xs font-black uppercase bg-gray-100 print:bg-gray-200 p-2 mb-3 border-l-4 border-black flex items-center gap-2">
                            <Clock size={14} /> Locations en cours
                          </h3>
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b-2 border-gray-300">
                                <th className="py-2 px-1">Machine</th>
                                <th className="py-2 px-1">Fin prévue</th>
                                <th className="py-2 px-1 text-center w-16">Retour</th>
                              </tr>
                            </thead>
                            <tbody>
                              {locations.length > 0 ? locations.map(l => {
                                const crit = isExpiringSoon(l.date_fin);
                                return (
                                  <tr key={l.id} className="border-b border-gray-200">
                                    <td className="py-2 px-1 font-bold">{l.nom}</td>
                                    <td className={`py-2 px-1 ${crit ? 'text-orange-500 font-bold print:text-black' : ''}`}>{l.date_fin || 'N/A'}</td>
                                    <td className="py-2 px-1 text-center"><Square size={16} className="mx-auto text-gray-300 print:text-black"/></td>
                                  </tr>
                                );
                              }) : <tr><td colSpan={3} className="py-2 text-gray-400 italic">Aucune location...</td></tr>}
                            </tbody>
                          </table>
                        </div>

                        {/* Tâches */}
                        <div>
                          <h3 className="text-xs font-black uppercase bg-gray-100 print:bg-gray-200 p-2 mb-3 border-l-4 border-black">Tâches Semaine</h3>
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b-2 border-gray-300">
                                <th className="py-2 px-1">Tâche</th>
                                <th className="py-2 px-1">Responsable</th>
                                <th className="py-2 px-1 text-center w-16">Statut</th>
                              </tr>
                            </thead>
                            <tbody>
                              {taches.length > 0 ? taches.map(t => (
                                <tr key={t.id} className="border-b border-gray-200">
                                  <td className="py-2 px-1 font-bold">{t.nom}</td>
                                  <td className="py-2 px-1">{t.responsable || '-'}</td>
                                  <td className="py-2 px-1 text-center"><Square size={16} className="mx-auto text-gray-300 print:text-black"/></td>
                                </tr>
                              )) : <tr><td colSpan={3} className="py-2 text-gray-400 italic">Aucune tâche assignée...</td></tr>}
                            </tbody>
                          </table>
                        </div>

                      </div>

                      {/* SECTION 4 : ZONES TEXTES (Commandes & Risques) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 break-inside-avoid print:mt-4">
                        <div className="border border-gray-300 print:border-black rounded-lg p-3">
                          <label className="text-[10px] font-black uppercase text-gray-500 print:text-black mb-2 block">📦 Commandes à passer en urgence</label>
                          <textarea 
                            value={commandeApasser} onChange={e => setCommandeApasser(e.target.value)}
                            className="w-full h-20 resize-none outline-none text-xs print:bg-transparent" placeholder="Saisir ou laisser vide pour écrire au stylo..."
                          />
                        </div>
                        <div className="border border-gray-300 print:border-black rounded-lg p-3">
                          <label className="text-[10px] font-black uppercase text-gray-500 print:text-black mb-2 block flex items-center gap-1"><AlertTriangle size={12}/> Risques Identifiés (Météo, Blocage...)</label>
                          <textarea 
                            value={risqueIdentifie} onChange={e => setRisqueIdentifie(e.target.value)}
                            className="w-full h-20 resize-none outline-none text-xs print:bg-transparent" placeholder="Saisir ou laisser vide pour écrire au stylo..."
                          />
                        </div>
                      </div>

                      {/* SECTION 5 : SIGNATURES */}
                      <div className="mt-8 pt-6 border-t-2 border-black grid grid-cols-3 gap-4 text-sm font-bold break-inside-avoid">
                        <div>
                          <p className="uppercase mb-8">Chef d'équipe :</p>
                          <div className="w-48 border-b border-dotted border-black"></div>
                        </div>
                        <div>
                          <p className="uppercase mb-8">Date :</p>
                          <div className="w-32 border-b border-dotted border-black"></div>
                        </div>
                        <div className="text-right">
                          <p className="uppercase mb-4">Validation :</p>
                          <div className="flex justify-end gap-6">
                            <label className="flex items-center gap-2"><Square size={16}/> OK</label>
                            <label className="flex items-center gap-2"><Square size={16}/> Réserve</label>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* SIDEBAR DYNAMIQUE (Données réelles) - Cachée à l'impression */}
          <div className="space-y-6 print-hidden">
            <div className="bg-[#1e272e] rounded-[35px] p-8 text-white shadow-xl relative overflow-hidden transition-all">
               <AlertTriangle size={150} className="absolute -right-10 -bottom-10 opacity-5" />
               <h3 className="text-xl font-black uppercase italic mb-6 flex items-center gap-2"><AlertCircle className="text-yellow-400" /> Indicateurs Clés</h3>
               
               {chantierDetails ? (
                   <div className="space-y-4 relative z-10">
                     <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                       <div className="bg-red-500/20 p-2 rounded-lg"><Layers size={20} className="text-red-400" /></div>
                       <div>
                         <p className="text-xs font-black uppercase text-red-400">Budget Consommé</p>
                         <p className="text-lg font-bold">{chantierDetails.budget_conso || 0}% <span className="text-[10px] opacity-60 font-normal">du global</span></p>
                       </div>
                     </div>
                     <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                       <div className="bg-blue-500/20 p-2 rounded-lg"><Calendar size={20} className="text-blue-400" /></div>
                       <div>
                         <p className="text-xs font-black uppercase text-blue-400">Date Fin Prévue</p>
                         <p className="text-sm font-bold">{chantierDetails.date_fin || 'Non définie'}</p>
                       </div>
                     </div>
                   </div>
               ) : (
                   <div className="text-center py-10 opacity-50">
                       <p className="text-sm">Sélectionnez un chantier pour voir les KPI en temps réel.</p>
                   </div>
               )}
            </div>

            <div className="bg-white rounded-[35px] p-8 shadow-sm border border-gray-100">
               <h3 className="font-black text-gray-700 uppercase text-sm mb-6 flex items-center gap-2"><Layers size={18} /> Avancement Réel</h3>
               {chantierDetails ? (
                   <div className="space-y-4">
                     <div>
                       <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                           <span>Production</span>
                           <span>{chantierDetails.avancement || 0}%</span>
                       </div>
                       <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                           <div 
                             className="bg-emerald-500 h-full transition-all duration-1000 ease-out" 
                             style={{ width: `${chantierDetails.avancement || 0}%` }} 
                           />
                       </div>
                     </div>
                     <p className="text-xs text-gray-400 italic mt-2">Données synchronisées depuis la table 'chantiers'.</p>
                   </div>
               ) : (
                   <div className="h-20 flex items-center justify-center text-gray-300 text-xs">En attente de sélection...</div>
               )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
