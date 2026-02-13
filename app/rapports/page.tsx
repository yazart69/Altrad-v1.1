"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Plus, Calculator, PencilRuler, Save, 
  Trash2, ChevronRight, CheckCircle2, AlertTriangle, 
  Settings, Layers, Pipette, Share2, Wifi, WifiOff,
  User, Calendar, Briefcase, Ruler, X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Dexie, { Table } from 'dexie';

// =================================================================================================
// 1. BASE DE DONNÉES LOCALE (SÉCURISÉE POUR LE SSR - NE JAMAIS SUPPRIMER)
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

// Initialisation sécurisée : évite l'erreur "window is not defined" au build Vercel
const db = typeof window !== 'undefined' ? new OfflineDB() : null;

// =================================================================================================
// 2. MOTEUR DE CALCUL TECHNIQUE (SCIENTIFIC ENGINE)
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
// 3. COMPOSANT CROQUIS SVG COTÉ (IMPORT DYNAMIQUE SÉCURISÉ POUR VERCEL)
// =================================================================================================
const SketchTool = ({ type, dims }: { type: string, dims: any }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let isMounted = true;

    const renderSketch = async () => {
      if (!svgRef.current || typeof window === 'undefined') return;
      
      try {
        // Chargement dynamique de Rough.js uniquement côté client (Browser)
        const roughModule = await import('roughjs');
        const rough = roughModule.default;
        
        if (!isMounted || !svgRef.current) return;
        
        const rc = rough.svg(svgRef.current);
        const node = svgRef.current;
        
        // Nettoyage du SVG avant nouveau rendu
        while (node.firstChild) node.removeChild(node.firstChild);

        if (type === 'rectangle') {
          const w = Math.max(dims.L * 10, 50); 
          const h = Math.max(dims.l * 10, 30);
          const x = 50; const y = 50;

          // Dessin de la forme principale
          const rect = rc.rectangle(x, y, w, h, { roughness: 1.5, stroke: '#2d3436', strokeWidth: 2 });
          node.appendChild(rect);

          // Dessin de la cote horizontale
          const lineH = rc.line(x, y - 20, x + w, y - 20, { stroke: '#0984e3', strokeWidth: 1 });
          node.appendChild(lineH);
          
          const textL = document.createElementNS("http://www.w3.org/2000/svg", "text");
          textL.setAttribute("x", (x + w / 2 - 10).toString());
          textL.setAttribute("y", (y - 25).toString());
          textL.setAttribute("fill", "#0984e3");
          textL.setAttribute("font-size", "12");
          textL.setAttribute("font-weight", "bold");
          textL.textContent = `${dims.L}m`;
          node.appendChild(textL);

          // Dessin de la cote verticale
          const lineV = rc.line(x + w + 20, y, x + w + 20, y + h, { stroke: '#d63031', strokeWidth: 1 });
          node.appendChild(lineV);
          
          const textl = document.createElementNS("http://www.w3.org/2000/svg", "text");
          textl.setAttribute("x", (x + w + 25).toString());
          textl.setAttribute("y", (y + h / 2).toString());
          textl.setAttribute("fill", "#d63031");
          textl.setAttribute("font-size", "12");
          textl.setAttribute("font-weight", "bold");
          textl.textContent = `${dims.l}m`;
          node.appendChild(textl);
        }
      } catch (error) {
        console.error("Erreur lors du rendu Rough.js:", error);
      }
    };

    renderSketch();
    return () => { isMounted = false; };
  }, [type, dims]);

  return <svg ref={svgRef} width="400" height="250" className="bg-gray-50 rounded-xl border border-gray-100 shadow-inner" />;
};

// =================================================================================================
// 4. COMPOSANT PRINCIPAL (RESTE INCHANGÉ MAIS SÉCURISÉ)
// =================================================================================================
export default function Rapports() {
  const [isOnline, setIsOnline] = useState(true);
  const [meetingTab, setMeetingTab] = useState<'notes' | 'calculs' | 'actions'>('notes');
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [selectedChantier, setSelectedChantier] = useState<string>("");
  
  const [notes, setNotes] = useState<any[]>([]);
  const [calculs, setCalculs] = useState<any[]>([]);
  const [activeNote, setActiveNote] = useState("");
  const [noteCategory, setNoteCategory] = useState("Technique");

  const [calcForm, setCalcForm] = useState({ L: 10, l: 5, microns: 200, rendement: 5, degree: 'Sa2.5' });

  useEffect(() => {
    if (typeof window !== 'undefined') {
        setIsOnline(navigator.onLine);
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        fetchChantiers();
        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
        };
    }
  }, []);

  async function fetchChantiers() {
    const { data } = await supabase.from('chantiers').select('id, nom');
    if (data) setChantiers(data);
  }

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
    const report = {
      chantier_id: selectedChantier,
      date: new Date().toISOString(),
      notes,
      calculs,
      is_synced: false
    };

    if (db) {
        try {
          await db.reports.add(report);
        } catch (e) {
          console.error("Erreur IndexedDB:", e);
        }
    }
    
    if (isOnline) {
      const { error } = await supabase.from('reunions').insert([report]);
      if (!error) alert("Rapport synchronisé avec Supabase !");
    } else {
      alert("Rapport enregistré localement (Mode Hors-ligne).");
    }
  };

  const surfaceCalculated = ScientificEngine.calculateSurface('rectangle', { L: calcForm.L, l: calcForm.l });
  const paintNeeded = ScientificEngine.calculatePaint(surfaceCalculated, calcForm.microns, calcForm.rendement);
  const sandNeeded = ScientificEngine.calculateAbrasive(surfaceCalculated, calcForm.degree);

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-4 md:p-8 font-['Fredoka']">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER & SYNC STATUS */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-black p-3 rounded-2xl text-white shadow-lg shadow-gray-200">
              <FileText size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-gray-800">Réunion Chantier Intelligente</h1>
              <div className="flex items-center gap-2">
                {isOnline ? 
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 uppercase bg-emerald-50 px-2 py-0.5 rounded-full"><Wifi size={12}/> Online Sync</span> :
                  <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase bg-red-50 px-2 py-0.5 rounded-full"><WifiOff size={12}/> Mode Hors-Ligne</span>
                }
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">• Altrad Services v3.1</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <select 
              value={selectedChantier} 
              onChange={(e) => setSelectedChantier(e.target.value)}
              className="bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-sm text-gray-700 outline-none focus:ring-2 focus:ring-black transition-all"
            >
              <option value="">Sélectionner Chantier...</option>
              {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            <button onClick={saveReport} className="bg-black text-white px-6 py-3 rounded-xl font-black uppercase text-xs shadow-xl flex items-center gap-2 hover:scale-105 transition-all active:scale-95">
              <Save size={16}/> Terminer & Archiver
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-[35px] p-8 shadow-sm border border-gray-100 min-h-[600px] flex flex-col">
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
                        placeholder="Prendre une note de réunion..."
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-2xl p-4 font-medium text-gray-700 outline-none transition-all h-32 resize-none"
                      />
                      <div className="absolute bottom-3 right-3 flex gap-2">
                        <select value={noteCategory} onChange={(e) => setNoteCategory(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-[10px] font-black uppercase text-gray-500 outline-none">
                          <option>Technique</option>
                          <option>Planning</option>
                          <option>Budget</option>
                          <option>Sécurité</option>
                        </select>
                        <button onClick={addNote} className="bg-black text-white p-2 rounded-xl hover:bg-gray-800 transition-colors"><Plus size={20} /></button>
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
                        <button className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {meetingTab === 'calculs' && (
                <div className="flex-1 animate-in fade-in">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <h3 className="font-black uppercase text-gray-700 flex items-center gap-2 border-b border-gray-100 pb-2"><Settings size={18} className="text-blue-500"/> Paramètres de métré</h3>
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
                          <div><p className="text-[9px] font-black uppercase opacity-50">Surface</p><p className="text-lg font-black">{surfaceCalculated}m²</p></div>
                          <div><p className="text-[9px] font-black uppercase opacity-50">Peinture</p><p className="text-lg font-black">{paintNeeded.toFixed(1)}L</p></div>
                          <div><p className="text-[9px] font-black uppercase opacity-50">Abrasif</p><p className="text-lg font-black">{sandNeeded.toFixed(2)}T</p></div>
                        </div>
                      </div>
                   </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[#1e272e] rounded-[35px] p-8 text-white shadow-xl relative overflow-hidden">
               <AlertTriangle size={150} className="absolute -right-10 -bottom-10 opacity-5" />
               <h3 className="text-xl font-black uppercase italic mb-6 flex items-center gap-2"><AlertCircle className="text-yellow-400" /> Alertes Systèmes</h3>
               <div className="space-y-4 relative z-10">
                 <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                   <div className="bg-red-500/20 p-2 rounded-lg"><Layers size={20} className="text-red-400" /></div>
                   <div><p className="text-xs font-black uppercase text-red-400">Budget Consommé</p><p className="text-[10px] font-bold opacity-60">82% atteint / 55% de prod.</p></div>
                 </div>
               </div>
            </div>
            <div className="bg-white rounded-[35px] p-8 shadow-sm border border-gray-100">
               <h3 className="font-black text-gray-700 uppercase text-sm mb-6 flex items-center gap-2"><Layers size={18} /> Rentabilité</h3>
               <div className="space-y-4">
                 <div>
                   <div className="flex justify-between text-[10px] font-black uppercase mb-1"><span>Production</span><span>65%</span></div>
                   <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden"><div className="bg-emerald-500 h-full w-[65%]" /></div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
