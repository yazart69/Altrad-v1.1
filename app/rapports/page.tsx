"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Plus, Calculator, PencilRuler, Save, 
  Trash2, ChevronRight, CheckCircle2, AlertTriangle, 
  Settings, Layers, Pipette, Share2, Wifi, WifiOff,
  User, Calendar, Briefcase, Ruler, X, AlertCircle,
  Thermometer, Droplets, Box, Zap, Download, Pencil
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Dexie, { Table } from 'dexie';

// =================================================================================================
// 1. BASE DE DONNÉES LOCALE (PERSISTANTE & OFFLINE)
// =================================================================================================
class OfflineDB extends Dexie {
  reports!: Table<any>;
  constructor() {
    super('AltradHSE_Meeting_v2');
    this.version(1).stores({
      reports: '++id, chantier_id, date, status, is_synced'
    });
  }
}

const db = typeof window !== 'undefined' ? new OfflineDB() : null;

// =================================================================================================
// 2. MOTEUR SCIENTIFIQUE (SCIENTIFIC CALCULATOR & ACQPA STANDARDS)
// =================================================================================================
const ScientificEngine = {
  // Calculs de surfaces complexes
  calculateSurface: (type: string, dims: any) => {
    const { L, l, D, h } = dims;
    const R = D / 2;
    switch (type) {
      case 'rectangle': return L * l;
      case 'cylindre': 
        // Surface latérale + 2 bases si nécessaire
        return (Math.PI * D * L) + (dims.bases ? 2 * (Math.PI * Math.pow(R, 2)) : 0);
      case 'cone': 
        // Surface latérale d'un cône
        return Math.PI * R * Math.sqrt(Math.pow(R, 2) + Math.pow(h, 2));
      case 'sphere': 
        return 4 * Math.PI * Math.pow(R, 2);
      default: return 0;
    }
  },

  // Calcul de consommation Peinture selon standard ACQPA
  calculatePaint: (surface: number, eps: number, vs: number, loss: number) => {
    if (!vs || vs === 0) return { theoretical: 0, practical: 0 };
    const theoretical = (surface * eps) / (10 * vs);
    const practical = theoretical / (1 - (loss / 100));
    return { theoretical, practical };
  },

  // Calcul Abrasif selon degré de soin Sa
  calculateAbrasive: (surface: number, degree: string) => {
    const consumptionMap: any = { 'Sa1': 15, 'Sa2': 25, 'Sa2.5': 45, 'Sa3': 60 };
    const base = surface * (consumptionMap[degree] || 45);
    return (base * 1.2) / 1000; // Tonnage avec marge de sécurité 20%
  },

  // Calcul du Point de Rosée (Magnus-Tetens Approximation)
  calculateDewPoint: (T: number, RH: number) => {
    const a = 17.27; const b = 237.7;
    const gamma = ((a * T) / (b + T)) + Math.log(RH / 100);
    return (b * gamma) / (a - gamma);
  }
};

// =================================================================================================
// 3. GÉNÉRATEUR DE CROQUIS TECHNIQUE (ROUGH.JS SVG ENGINE)
// =================================================================================================
const SketchGenerator = ({ type, dims }: { type: string, dims: any }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let isMounted = true;
    const render = async () => {
      if (!svgRef.current || typeof window === 'undefined') return;
      const roughModule = await import('roughjs');
      const rough = roughModule.default;
      if (!isMounted || !svgRef.current) return;
      
      const rc = rough.svg(svgRef.current);
      const node = svgRef.current;
      while (node.firstChild) node.removeChild(node.firstChild);

      const margin = 60;
      const scale = 15; // Échelle de visualisation

      if (type === 'rectangle' || type === 'plat') {
        const w = Math.min(dims.L * scale, 280);
        const h = Math.min(dims.l * scale, 150);
        
        // Forme
        node.appendChild(rc.rectangle(margin, margin, w, h, { roughness: 1.2, fill: 'rgba(9, 132, 227, 0.1)', fillStyle: 'hachure' }));
        
        // Cote L
        node.appendChild(rc.line(margin, margin + h + 20, margin + w, margin + h + 20, { stroke: '#636e72' }));
        const tL = document.createElementNS("http://www.w3.org/2000/svg", "text");
        tL.setAttribute("x", (margin + w/2 - 15).toString()); tL.setAttribute("y", (margin + h + 40).toString());
        tL.setAttribute("style", "font-size: 10px; font-weight: bold; fill: #2d3436");
        tL.textContent = `${dims.L}m`; node.appendChild(tL);

        // Cote l
        node.appendChild(rc.line(margin + w + 20, margin, margin + w + 20, margin + h, { stroke: '#636e72' }));
      }

      if (type === 'cylindre') {
        const d = Math.min(dims.D * scale, 120);
        const l = Math.min(dims.L * scale, 250);
        
        node.appendChild(rc.ellipse(margin + d/2, margin + d/2, d, d, { roughness: 1.5 }));
        node.appendChild(rc.rectangle(margin + d/2, margin, l, d, { roughness: 1.2 }));
      }
    };
    render();
    return () => { isMounted = false; };
  }, [type, dims]);

  return (
    <div className="relative group">
      <div className="absolute top-2 left-2 bg-white/80 px-2 py-1 rounded text-[8px] font-black uppercase tracking-tighter border border-gray-200">Visualisation Auto-cotée</div>
      <svg ref={svgRef} width="100%" height="220" className="bg-white rounded-2xl border border-gray-100" />
    </div>
  );
};

// =================================================================================================
// 4. COMPOSANT PRINCIPAL : TERMINAL DE RÉUNION
// =================================================================================================
export default function Rapports() {
  const [meetingTab, setMeetingTab] = useState<'notes' | 'calculs' | 'ts'>('notes');
  const [isOnline, setIsOnline] = useState(true);
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [selectedChantier, setSelectedChantier] = useState<string>("");

  // States Réunion
  const [notes, setNotes] = useState<any[]>([]);
  const [activeNote, setActiveNote] = useState("");
  const [noteCategory, setNoteCategory] = useState("Technique");

  // States Calculateur Scientifique
  const [geoMode, setGeoMode] = useState('rectangle');
  const [dims, setDims] = useState({ L: 20, l: 10, D: 5, h: 5, bases: false });
  const [paintParams, setPaintParams] = useState({ eps: 250, vs: 70, loss: 30 });
  const [envParams, setEnvParams] = useState({ tAir: 22, rh: 65, tSteel: 18 });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      fetchChantiers();
    }
  }, []);

  async function fetchChantiers() {
    const { data } = await supabase.from('chantiers').select('id, nom, prix_unitaire_peinture');
    if (data) setChantiers(data);
  }

  // Calculs dynamiques
  const surface = ScientificEngine.calculateSurface(geoMode, dims);
  const paint = ScientificEngine.calculatePaint(surface, paintParams.eps, paintParams.vs, paintParams.loss);
  const abrasive = ScientificEngine.calculateAbrasive(surface, 'Sa2.5');
  const dewPoint = ScientificEngine.calculateDewPoint(envParams.tAir, envParams.rh);
  const deltaT = envParams.tSteel - dewPoint;

  const addNoteAsTask = () => {
    if (!activeNote) return;
    const note = { id: Date.now(), category: noteCategory, text: activeNote, timestamp: new Date().toISOString(), isTask: noteCategory === 'Planning' };
    setNotes([note, ...notes]);
    setActiveNote("");
  };

  const generateTS = () => {
    const chantier = chantiers.find(c => c.id === selectedChantier);
    const pu = chantier?.prix_unitaire_peinture || 45;
    const total = surface * pu;
    alert(`Génération Fiche TS : \nSurface: ${surface}m² \nPrix Unitaire: ${pu}€ \nTotal: ${total.toFixed(2)}€`);
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] p-4 lg:p-10 font-sans text-gray-900">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* TOP BAR SMART CONTROL */}
        <div className="flex flex-col lg:flex-row justify-between items-center bg-white p-6 rounded-[40px] shadow-xl border border-white gap-6">
          <div className="flex items-center gap-6">
            <div className="bg-red-600 p-4 rounded-3xl text-white shadow-lg shadow-red-200">
              <Zap size={32} fill="white" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter">Terminal de Réunion Altrad</h1>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
                {isOnline ? <Wifi size={14} className="text-emerald-500"/> : <WifiOff size={14} className="text-red-500"/>}
                HSE Engine v4.0 • Ingénierie de décision
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-[25px] border border-gray-100">
            <select 
              value={selectedChantier} 
              onChange={(e) => setSelectedChantier(e.target.value)}
              className="bg-transparent border-none font-black text-sm px-4 outline-none min-w-[200px]"
            >
              <option value="">Sélectionner Projet...</option>
              {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            <button className="bg-black text-white px-8 py-3 rounded-2xl font-black uppercase text-xs hover:bg-red-600 transition-all shadow-lg active:scale-95">
              <Save size={18} className="inline mr-2"/> Archiver Décisions
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
          
          {/* PANNEAU DE GAUCHE : NOTES & ACTIONS */}
          <div className="xl:col-span-4 space-y-8">
            <div className="bg-white rounded-[50px] p-8 shadow-sm border border-gray-100 h-full flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black uppercase italic flex items-center gap-3"><Edit size={24} className="text-red-600"/> Minutes Réunion</h2>
                <div className="flex gap-1">
                  {['notes', 'ts'].map((t: any) => (
                    <button key={t} onClick={() => setMeetingTab(t)} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${meetingTab === t ? 'bg-black text-white' : 'text-gray-400'}`}>{t}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-6 flex-1">
                <div className="relative">
                  <textarea 
                    value={activeNote}
                    onChange={(e) => setActiveNote(e.target.value)}
                    placeholder="Saisir une décision, un point bloquant ou un TS..."
                    className="w-full bg-gray-50 rounded-[30px] p-6 text-sm font-bold border-2 border-transparent focus:border-red-500 outline-none transition-all h-40 resize-none shadow-inner"
                  />
                  <div className="absolute bottom-4 right-4 flex items-center gap-3">
                    <select value={noteCategory} onChange={(e) => setNoteCategory(e.target.value)} className="bg-white border text-[10px] font-black uppercase px-3 py-2 rounded-xl outline-none">
                      <option>Technique</option><option>Planning</option><option>Budget</option><option>Sécurité</option>
                    </select>
                    <button onClick={addNoteAsTask} className="bg-red-600 text-white p-3 rounded-2xl hover:scale-110 transition-all shadow-lg shadow-red-100"><Plus size={24}/></button>
                  </div>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {notes.map(n => (
                    <div key={n.id} className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm flex gap-4 animate-in slide-in-from-left-2">
                      <div className={`w-2 h-12 rounded-full ${n.category === 'Sécurité' ? 'bg-red-500' : 'bg-blue-500'}`} />
                      <div className="flex-1">
                        <div className="flex justify-between text-[9px] font-black uppercase text-gray-300 mb-1">
                          <span>{n.category}</span>
                          <span>{new Date(n.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-sm font-bold text-gray-700">{n.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* PANNEAU CENTRAL : SCIENTIFIC ENGINE (CALCULS COMPLEXES) */}
          <div className="xl:col-span-8 space-y-8">
            <div className="bg-white rounded-[50px] p-10 shadow-sm border border-gray-100 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 text-gray-50 opacity-10 font-black text-[120px] select-none">MATHS</div>
              
              <div className="flex items-center gap-4 mb-10 border-b border-gray-100 pb-6 relative z-10">
                <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-100">
                  <Calculator size={28} />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tighter">Moteur d'Étude & Métrés Flash</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
                {/* Form Inputs */}
                <div className="space-y-8">
                  <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-4 italic">Sélection Géométrique</label>
                    <div className="flex gap-2">
                      {['rectangle', 'cylindre', 'cone', 'sphere'].map(m => (
                        <button key={m} onClick={() => setGeoMode(m)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${geoMode === m ? 'bg-black text-white shadow-lg' : 'bg-white border text-gray-400'}`}>{m}</button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {geoMode === 'rectangle' && (
                      <>
                        <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400">Longueur (m)</label><input type="number" value={dims.L} onChange={e=>setDims({...dims, L: parseFloat(e.target.value)})} className="w-full p-4 bg-gray-50 rounded-2xl font-black outline-none border-2 border-transparent focus:border-blue-500" /></div>
                        <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400">Largeur (m)</label><input type="number" value={dims.l} onChange={e=>setDims({...dims, l: parseFloat(e.target.value)})} className="w-full p-4 bg-gray-50 rounded-2xl font-black outline-none border-2 border-transparent focus:border-blue-500" /></div>
                      </>
                    )}
                    {geoMode === 'cylindre' && (
                      <>
                        <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400">Diamètre (m)</label><input type="number" value={dims.D} onChange={e=>setDims({...dims, D: parseFloat(e.target.value)})} className="w-full p-4 bg-gray-50 rounded-2xl font-black outline-none border-2 border-transparent focus:border-blue-500" /></div>
                        <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400">Longueur (m)</label><input type="number" value={dims.L} onChange={e=>setDims({...dims, L: parseFloat(e.target.value)})} className="w-full p-4 bg-gray-50 rounded-2xl font-black outline-none border-2 border-transparent focus:border-blue-500" /></div>
                      </>
                    )}
                  </div>

                  <div className="bg-red-50/50 p-6 rounded-3xl border border-red-100">
                    <h4 className="text-[10px] font-black uppercase text-red-600 mb-4 tracking-widest">Peinture (Standard ACQPA)</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div><label className="text-[8px] font-black uppercase text-gray-400">EPS (µm)</label><input type="number" value={paintParams.eps} onChange={e=>setPaintParams({...paintParams, eps: parseFloat(e.target.value)})} className="w-full p-3 bg-white rounded-xl font-bold" /></div>
                      <div><label className="text-[8px] font-black uppercase text-gray-400">E.Sec (%)</label><input type="number" value={paintParams.vs} onChange={e=>setPaintParams({...paintParams, vs: parseFloat(e.target.value)})} className="w-full p-3 bg-white rounded-xl font-bold" /></div>
                      <div><label className="text-[8px] font-black uppercase text-gray-400">Perte (%)</label><input type="number" value={paintParams.loss} onChange={e=>setPaintParams({...paintParams, loss: parseFloat(e.target.value)})} className="w-full p-3 bg-white rounded-xl font-bold" /></div>
                    </div>
                  </div>
                </div>

                {/* Croquis & Résultats */}
                <div className="space-y-8 flex flex-col justify-center">
                  <SketchGenerator type={geoMode} dims={dims} />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black p-6 rounded-[30px] text-white">
                      <p className="text-[9px] font-black uppercase opacity-50 tracking-[0.2em] mb-2 leading-none">Surface Totale</p>
                      <p className="text-3xl font-black italic">{surface.toFixed(2)}m²</p>
                    </div>
                    <div className="bg-red-600 p-6 rounded-[30px] text-white shadow-xl shadow-red-200">
                      <p className="text-[9px] font-black uppercase opacity-50 tracking-[0.2em] mb-2 leading-none">Peinture Pratique</p>
                      <p className="text-3xl font-black italic">{paint.practical.toFixed(1)}L</p>
                      <p className="text-[8px] font-bold opacity-70 mt-1 uppercase italic">Théorique: {paint.theoretical.toFixed(1)}L</p>
                    </div>
                  </div>

                  {/* Diagnostic Environnemental */}
                  <div className={`p-6 rounded-[35px] border-2 flex items-center justify-between transition-all ${deltaT > 3 ? 'bg-emerald-50 border-emerald-500' : 'bg-red-50 border-red-500 animate-pulse'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${deltaT > 3 ? 'bg-emerald-500' : 'bg-red-500'} text-white shadow-lg`}><Thermometer size={24}/></div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Diagnostic Application</p>
                        <p className="text-sm font-black uppercase">{deltaT > 3 ? 'Conditions Optimales' : 'Risque de condensation'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-xs font-black text-gray-400 uppercase">P.Rosée: {dewPoint.toFixed(1)}°C</p>
                       <p className="text-[10px] font-bold opacity-60">Delta: +{deltaT.toFixed(1)}°C</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTIONS FLASH */}
              <div className="mt-12 flex gap-4 relative z-10 border-t border-gray-50 pt-8">
                <button onClick={generateTS} className="flex-1 bg-black text-white p-6 rounded-3xl font-black uppercase text-xs shadow-xl flex items-center justify-center gap-3 hover:bg-red-600 transition-all">
                  <zap size={20}/> Générer Devis TS Flash
                </button>
                <button className="bg-gray-100 text-gray-400 p-6 rounded-3xl font-black uppercase text-xs flex items-center gap-2 hover:bg-gray-200 transition-all">
                  <Download size={20}/> Rapport PDF
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// --- UTILITAIRES UI (NE JAMAIS SUPPRIMER) ---
const NavBtn = ({id, icon: Icon, label, active, set, disabled}: any) => (
  <button 
    onClick={() => !disabled && set(id)} 
    disabled={disabled}
    className={`w-full flex items-center gap-4 px-6 py-5 rounded-[25px] text-[11px] font-black uppercase transition-all ${active === id ? 'bg-red-50 text-red-600 shadow-sm ring-2 ring-red-500/10' : 'text-gray-400 hover:bg-gray-50 hover:text-black'} ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
  >
    <Icon size={20} /> {label}
    {!disabled && active === id && <ChevronRight size={16} className="ml-auto opacity-50"/>}
  </button>
);

const StatCard = ({ label, val, sub, icon: Icon, color }: any) => {
  const themes:any = { 
    red: "bg-red-50 text-red-600 border-red-100", 
    blue: "bg-blue-50 text-blue-600 border-blue-100", 
    green: "bg-emerald-50 text-emerald-600 border-emerald-100", 
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100", 
    orange: "bg-orange-50 text-orange-600 border-orange-100" 
  };
  return (
    <div className={`p-8 rounded-[40px] border flex items-start justify-between bg-white shadow-sm hover:shadow-xl transition-all cursor-default`}>
      <div>
        <p className="text-[10px] font-black uppercase opacity-60 tracking-widest text-gray-500 mb-2">{label}</p>
        <p className="text-4xl font-black text-gray-900 tracking-tighter leading-none">{val}</p>
        <p className={`text-[10px] font-black mt-4 uppercase ${themes[color].split(' ')[1]}`}>{sub}</p>
      </div>
      <div className={`p-4 rounded-2xl shadow-sm ${themes[color].split(' ').slice(0,2).join(' ')}`}><Icon size={28}/></div>
    </div>
  )
};
