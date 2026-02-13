"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Plus, Calculator, PencilRuler, Save, 
  Trash2, ChevronRight, CheckCircle2, AlertTriangle, 
  Settings, Layers, Pipette, Share2, Wifi, WifiOff,
  User, Calendar, Briefcase, Ruler, X, AlertCircle, MapPin
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
  const [meetingTab, setMeetingTab] = useState<'notes' | 'calculs' | 'actions'>('notes');
  
  // Données connectées
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [selectedChantier, setSelectedChantier] = useState<string>("");
  const [chantierDetails, setChantierDetails] = useState<any>(null); // Pour stocker les infos réelles du chantier sélectionné

  const [notes, setNotes] = useState<any[]>([]);
  const [calculs, setCalculs] = useState<any[]>([]);
  const [activeNote, setActiveNote] = useState("");
  const [noteCategory, setNoteCategory] = useState("Technique");

  const [calcForm, setCalcForm] = useState({ L: 10, l: 5, microns: 200, rendement: 5, degree: 'Sa2.5' });

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
      // On récupère uniquement les chantiers actifs
      const { data, error } = await supabase
        .from('chantiers')
        .select('id, nom')
        .eq('statut', 'actif') // Filtre optionnel selon ta structure
        .order('nom', { ascending: true });
      
      if (error) throw error;
      if (data) setChantiers(data);
    } catch (e) {
      console.error("Erreur chargement chantiers:", e);
    }
  }

  // 3. Fetch des détails complets quand on sélectionne un chantier (Sidebar dynamique)
  useEffect(() => {
    async function getDetails() {
      if (!selectedChantier) {
        setChantierDetails(null);
        return;
      }
      
      try {
        // ASSURE-TOI QUE CES COLONNES EXISTENT DANS TA TABLE 'chantiers'
        // Exemple: ville, client, avancement (int), budget_conso (int)
        const { data, error } = await supabase
          .from('chantiers')
          .select('*')
          .eq('id', selectedChantier)
          .single();

        if (error) throw error;
        setChantierDetails(data);
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

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER & SYNC STATUS */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 gap-4">
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
          
          {/* ZONE PRINCIPALE (Notes & Calculs) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-[35px] p-8 shadow-sm border border-gray-100 min-h-[600px] flex flex-col">
              
              {/* Infos contextuelles du chantier sélectionné */}
              {chantierDetails && (
                <div className="mb-6 flex items-center gap-4 text-xs font-bold text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-1"><MapPin size={14}/> {chantierDetails.ville || 'Localisation inconnue'}</div>
                  <div className="w-px h-4 bg-gray-300"></div>
                  <div className="flex items-center gap-1"><User size={14}/> Client: {chantierDetails.client || 'N/A'}</div>
                </div>
              )}

              <div className="flex items-center gap-2 mb-8 bg-gray-50 p-2 rounded-2xl self-start">
                {['notes', 'calculs', 'actions'].map((t: any) => (
                  <button 
                    key={t} 
                    onClick={() => setMeetingTab(t)}
                    className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${meetingTab === t ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {t}
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
            </div>
          </div>

          {/* SIDEBAR DYNAMIQUE (Données réelles) */}
          <div className="space-y-6">
            <div className="bg-[#1e272e] rounded-[35px] p-8 text-white shadow-xl relative overflow-hidden transition-all">
               <AlertTriangle size={150} className="absolute -right-10 -bottom-10 opacity-5" />
               <h3 className="text-xl font-black uppercase italic mb-6 flex items-center gap-2"><AlertCircle className="text-yellow-400" /> Indicateurs Clés</h3>
               
               {chantierDetails ? (
                   <div className="space-y-4 relative z-10">
                     <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                       <div className="bg-red-500/20 p-2 rounded-lg"><Layers size={20} className="text-red-400" /></div>
                       <div>
                         <p className="text-xs font-black uppercase text-red-400">Budget Consommé</p>
                         {/* Utilisation des données réelles du chantier si dispo, sinon 0 */}
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
