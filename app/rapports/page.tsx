"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Plus, Calculator, PencilRuler, Save, 
  Trash2, ChevronRight, CheckCircle2, AlertTriangle, 
  Settings, Layers, Pipette, Share2, Wifi, WifiOff,
  User, Calendar, Briefcase, Ruler, X, AlertCircle,
  Thermometer, Droplets, Box, Zap, Download, Pencil,
  Target, HardHat, TrendingUp, History
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Dexie, { Table } from 'dexie';

// =================================================================================================
// 1. BASE DE DONNÉES LOCALE (PERSISTANTE & OFFLINE - NE JAMAIS SUPPRIMER)
// =================================================================================================
class OfflineDB extends Dexie {
  reports!: Table<any>;
  tasks!: Table<any>;
  constructor() {
    super('AltradHSE_Intelligent_Meeting');
    this.version(2).stores({
      reports: '++id, chantier_id, date, status, is_synced',
      tasks: '++id, chantier_id, status, deadline'
    });
  }
}

const db = typeof window !== 'undefined' ? new OfflineDB() : null;

// =================================================================================================
// 2. MOTEUR SCIENTIFIQUE D'INGÉNIERIE (SCIENTIFIC ENGINE - STANDARDS ACQPA)
// =================================================================================================
const ScientificEngine = {
  // Calculs de surfaces complexes
  calculateSurface: (type: string, dims: any) => {
    const { L, l, D, h, ends } = dims;
    const R = D / 2;
    switch (type) {
      case 'plat': 
        return L * l;
      case 'cylindre': 
        // Surface latérale : π * D * L
        const lateral = Math.PI * D * L;
        // Ajout des fonds (2 * π * R²) si sélectionnés
        const bases = ends ? 2 * (Math.PI * Math.pow(R, 2)) : 0;
        return lateral + bases;
      case 'cone': 
        // Surface latérale d'un cône : π * R * √(R² + h²)
        return Math.PI * R * Math.sqrt(Math.pow(R, 2) + Math.pow(h, 2));
      case 'sphere': 
        // Surface d'une sphère : 4 * π * R²
        return 4 * Math.PI * Math.pow(R, 2);
      default: return 0;
    }
  },

  // Moteur de consommation Peinture (Standard ACQPA)
  calculatePaintConsumtion: (surface: number, eps: number, vs: number, loss: number) => {
    if (!vs || vs === 0) return { theoretical: 0, practical: 0 };
    // Consommation Théorique (Ct) en L = (S * EPS) / (10 * VS)
    const theoretical = (surface * eps) / (10 * vs);
    // Consommation Pratique (Cp) = Ct / (1 - P)
    const practical = theoretical / (1 - (loss / 100));
    return { theoretical, practical };
  },

  // Moteur de Sablage (Tonnage Abrasif)
  calculateAbrasive: (surface: number, degree: string) => {
    // Consommation moyenne kg/m² selon Sa
    const consumptionMap: any = { 'Sa2': 35, 'Sa2.5': 45, 'Sa3': 55 };
    const baseCons = consumptionMap[degree] || 45;
    // Tonnage = (Surface * Cons) * 1.2 (Marge sécu 20%)
    return (surface * baseCons * 1.2) / 1000;
  },

  // Module Diagnostic Environnemental (Calcul Point de Rosée)
  calculateDewPoint: (T: number, RH: number) => {
    const a = 17.27;
    const b = 237.7;
    const gamma = ((a * T) / (b + T)) + Math.log(RH / 100);
    return (b * gamma) / (a - gamma);
  }
};

// =================================================================================================
// 3. COMPOSANT SKETCH GENERATOR (ROUGH.JS SVG COTÉ)
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

      const center = { x: 200, y: 110 };
      const config = { stroke: '#2d3436', strokeWidth: 1.5, roughness: 1.2, bowing: 2 };

      if (type === 'plat') {
        const w = Math.min(dims.L * 15, 250);
        const h = Math.min(dims.l * 15, 140);
        const x = center.x - w/2;
        const y = center.y - h/2;
        
        node.appendChild(rc.rectangle(x, y, w, h, { ...config, fill: 'rgba(9, 132, 227, 0.05)', fillStyle: 'hachure' }));
        
        // Cotations
        node.appendChild(rc.line(x, y + h + 15, x + w, y + h + 15, { stroke: '#0984e3' })); // L
        node.appendChild(rc.line(x - 15, y, x - 15, y + h, { stroke: '#d63031' })); // l
      } 
      else if (type === 'cylindre') {
        const d = Math.min(dims.D * 15, 100);
        const l = Math.min(dims.L * 10, 200);
        const x = center.x - l/2;
        
        node.appendChild(rc.ellipse(x, center.y, d/2, d, config));
        node.appendChild(rc.line(x, center.y - d/2, x + l, center.y - d/2, config));
        node.appendChild(rc.line(x, center.y + d/2, x + l, center.y + d/2, config));
        node.appendChild(rc.ellipse(x + l, center.y, d/2, d, { ...config, strokeLineDash: [5, 5] }));
      }
    };
    render();
    return () => { isMounted = false; };
  }, [type, dims]);

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-inner p-4 relative overflow-hidden group">
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <PencilRuler size={14} className="text-blue-500" />
        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Croquis Technique Temps Réel</span>
      </div>
      <svg ref={svgRef} width="100%" height="220" />
    </div>
  );
};

// =================================================================================================
// 4. COMPOSANT PRINCIPAL : RAPPORT & RÉUNION INTELLIGENT
// =================================================================================================
export default function Rapports() {
  const [meetingTab, setMeetingTab] = useState<'notes' | 'calculs' | 'ts' | 'actions'>('notes');
  const [isOnline, setIsOnline] = useState(true);
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [selectedChantier, setSelectedChantier] = useState<string>("");

  // Gestion de réunion
  const [notes, setNotes] = useState<any[]>([]);
  const [activeNote, setActiveNote] = useState("");
  const [noteCategory, setNoteCategory] = useState("Technique");
  const [decideur, setDecideur] = useState("");

  // Moteur de calcul
  const [geoMode, setGeoMode] = useState('plat');
  const [dims, setDims] = useState({ L: 20, l: 10, D: 5, h: 5, ends: true });
  const [paintParams, setPaintParams] = useState({ eps: 260, vs: 70, layers: 3, loss: 35 });
  const [abrasiveDegree, setAbrasiveDegree] = useState('Sa2.5');
  const [env, setEnv] = useState({ tAir: 22, rh: 65, tSteel: 19 });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const handleStatus = () => setIsOnline(navigator.onLine);
      window.addEventListener('online', handleStatus);
      window.addEventListener('offline', handleStatus);
      fetchInitialData();
      return () => {
        window.removeEventListener('online', handleStatus);
        window.removeEventListener('offline', handleStatus);
      };
    }
  }, []);

  async function fetchInitialData() {
    const { data } = await supabase.from('chantiers').select('*');
    if (data) setChantiers(data);
  }

  // LOGIQUE DE CALCULS EN TEMPS RÉEL
  const surface = ScientificEngine.calculateSurface(geoMode, dims);
  const paintResults = ScientificEngine.calculatePaintConsumtion(surface, paintParams.eps, paintParams.vs, paintParams.loss);
  const abrasiveTonnage = ScientificEngine.calculateAbrasive(surface, abrasiveDegree);
  const dewPoint = ScientificEngine.calculateDewPoint(env.tAir, env.rh);
  const isSafeToApply = env.tSteel > (dewPoint + 3);

  const handleAddNote = () => {
    if (!activeNote) return;
    const note = {
      id: Date.now(),
      category: noteCategory,
      text: activeNote,
      decideur,
      timestamp: new Date().toISOString(),
      isValidated: false
    };
    setNotes([note, ...notes]);
    setActiveNote("");
  };

  const createTS = async () => {
    const chantier = chantiers.find(c => c.id === selectedChantier);
    const prix_m2 = chantier?.prix_m2 || 48;
    const total_ttc = surface * prix_m2;

    const tsData = {
      chantier_id: selectedChantier,
      designation: `TS Réunion : Traitement ${geoMode} (${surface.toFixed(2)}m²)`,
      surface,
      montant: total_ttc,
      status: 'En attente signature'
    };

    alert(`Génération TS Flash : ${total_ttc.toFixed(2)}€ pour ${surface.toFixed(2)}m²`);
    // Logique d'insertion Supabase ici
  };

  return (
    <div className="min-h-screen bg-[#f4f7f9] p-4 lg:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* TOP COMMAND CENTER */}
        <div className="bg-white rounded-[40px] p-6 shadow-xl border border-white flex flex-col lg:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="bg-red-600 p-4 rounded-3xl text-white shadow-lg shadow-red-100">
              <Zap size={32} fill="white" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-gray-800">Terminal de Réunion Expert</h1>
              <div className="flex items-center gap-3">
                <span className={`flex items-center gap-1.5 text-[10px] font-black px-3 py-1 rounded-full uppercase ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {isOnline ? <Wifi size={12}/> : <WifiOff size={12}/>} {isOnline ? 'Système Synchronisé' : 'Mode Offline'}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none border-l pl-3 border-gray-200">Altrad Engineering Suite v4.2</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-gray-100/50 p-2 rounded-[30px] border border-gray-100">
            <select 
              value={selectedChantier} 
              onChange={(e) => setSelectedChantier(e.target.value)}
              className="bg-transparent border-none font-black text-sm px-6 outline-none min-w-[250px] text-gray-600"
            >
              <option value="">Sélectionner le chantier...</option>
              {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            <button className="bg-black text-white px-10 py-4 rounded-[22px] font-black uppercase text-xs hover:bg-red-600 transition-all shadow-xl active:scale-95 flex items-center gap-3">
              <Save size={18}/> Clôturer la Réunion
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* PANNEAU GAUCHE : NOTES ET ACTIONS */}
          <div className="xl:col-span-4 space-y-8 flex flex-col">
            <div className="bg-white rounded-[50px] p-8 shadow-sm border border-gray-100 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black uppercase italic flex items-center gap-3"><MessageSquare size={24} className="text-red-600"/> Ordre du jour & Notes</h2>
                <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
                  {['notes', 'actions'].map((t: any) => (
                    <button key={t} onClick={() => setMeetingTab(t)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${meetingTab === t ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}>{t}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-6 flex-1 flex flex-col">
                <div className="bg-gray-50 rounded-[35px] p-6 border-2 border-dashed border-gray-200">
                  <textarea 
                    value={activeNote}
                    onChange={(e) => setActiveNote(e.target.value)}
                    placeholder="Saisir un point abordé, une décision ou un blocage..."
                    className="w-full bg-transparent text-gray-700 font-bold placeholder:text-gray-300 outline-none h-32 resize-none text-lg"
                  />
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                    <div className="flex gap-2">
                      <select value={noteCategory} onChange={(e) => setNoteCategory(e.target.value)} className="bg-white border rounded-xl px-3 py-2 text-[10px] font-black uppercase text-gray-500 outline-none shadow-sm">
                        <option>Technique</option><option>Planning</option><option>Budget</option><option>Sécurité</option>
                      </select>
                      <input 
                        placeholder="Décideur..." 
                        value={decideur}
                        onChange={(e) => setDecideur(e.target.value)}
                        className="bg-white border rounded-xl px-3 py-2 text-[10px] font-black uppercase w-24 outline-none shadow-sm"
                      />
                    </div>
                    <button onClick={handleAddNote} className="bg-red-600 text-white p-4 rounded-2xl shadow-lg shadow-red-100 hover:scale-110 active:scale-95 transition-all">
                      <Plus size={24} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {notes.map(n => (
                    <div key={n.id} className="bg-white border border-gray-100 p-6 rounded-[30px] shadow-sm hover:shadow-md transition-all group flex gap-4">
                      <div className={`w-1.5 h-12 rounded-full shrink-0 ${n.category === 'Sécurité' ? 'bg-red-500' : n.category === 'Budget' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">{n.category} • {n.decideur || 'Non spécifié'}</span>
                          <span className="text-[9px] font-bold text-gray-300">{new Date(n.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-gray-700 font-bold leading-relaxed">{n.text}</p>
                      </div>
                      <button className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"><Trash2 size={18}/></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* PANNEAU DROIT : CALCULATEUR SCIENTIFIQUE ACQPA */}
          <div className="xl:col-span-8 space-y-8">
            <div className="bg-white rounded-[60px] p-10 shadow-sm border border-gray-100 relative overflow-hidden">
              <Calculator size={300} className="absolute -right-20 -bottom-20 text-gray-50 opacity-50 pointer-events-none" />
              
              <div className="flex items-center justify-between mb-12 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 p-4 rounded-3xl text-white shadow-xl shadow-blue-100">
                    <Calculator size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter">Moteur de Calcul Technique</h2>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest italic">Standard ACQPA / FROSIO / SSPC</p>
                  </div>
                </div>
                <div className="flex bg-gray-50 p-2 rounded-2xl border border-gray-100">
                  {['plat', 'cylindre', 'cone', 'sphere'].map(m => (
                    <button key={m} onClick={() => setGeoMode(m)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${geoMode === m ? 'bg-white text-blue-600 shadow-sm border border-gray-100' : 'text-gray-400'}`}>{m}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 relative z-10">
                {/* CONFIGURATION DES PARAMÈTRES */}
                <div className="space-y-10">
                  <div className="grid grid-cols-2 gap-8">
                    {geoMode === 'plat' && (
                      <>
                        <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Longueur (m)</label><input type="number" value={dims.L} onChange={e=>setDims({...dims, L: parseFloat(e.target.value)})} className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-400 rounded-3xl p-5 font-black text-xl outline-none transition-all" /></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Largeur (m)</label><input type="number" value={dims.l} onChange={e=>setDims({...dims, l: parseFloat(e.target.value)})} className="w-full bg-gray-50 border-2 border-transparent focus:border-red-400 rounded-3xl p-5 font-black text-xl outline-none transition-all" /></div>
                      </>
                    )}
                    {geoMode === 'cylindre' && (
                      <>
                        <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Diamètre Ø (m)</label><input type="number" value={dims.D} onChange={e=>setDims({...dims, D: parseFloat(e.target.value)})} className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-400 rounded-3xl p-5 font-black text-xl outline-none transition-all" /></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Longueur L (m)</label><input type="number" value={dims.L} onChange={e=>setDims({...dims, L: parseFloat(e.target.value)})} className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-400 rounded-3xl p-5 font-black text-xl outline-none transition-all" /></div>
                      </>
                    )}
                  </div>

                  <div className="bg-blue-50/50 p-8 rounded-[40px] border border-blue-100 space-y-8">
                    <h4 className="text-xs font-black uppercase text-blue-900 flex items-center gap-2 tracking-widest"><Pipette size={18}/> Système de Peinture & Perte</h4>
                    <div className="grid grid-cols-3 gap-6">
                      <div><label className="text-[8px] font-black uppercase text-gray-400 block mb-2">EPS (Microns)</label><input type="number" value={paintParams.eps} onChange={e=>setPaintParams({...paintParams, eps: parseFloat(e.target.value)})} className="w-full bg-white rounded-2xl p-4 font-black outline-none border border-blue-100 shadow-sm" /></div>
                      <div><label className="text-[8px] font-black uppercase text-gray-400 block mb-2">Extrait Sec %</label><input type="number" value={paintParams.vs} onChange={e=>setPaintParams({...paintParams, vs: parseFloat(e.target.value)})} className="w-full bg-white rounded-2xl p-4 font-black outline-none border border-blue-100 shadow-sm" /></div>
                      <div><label className="text-[8px] font-black uppercase text-gray-400 block mb-2">Perte % (Curseur)</label><input type="number" value={paintParams.loss} onChange={e=>setPaintParams({...paintParams, loss: parseFloat(e.target.value)})} className="w-full bg-white rounded-2xl p-4 font-black outline-none border border-blue-100 shadow-sm" /></div>
                    </div>
                    <div className="pt-2">
                       <input type="range" min="0" max="70" value={paintParams.loss} onChange={e=>setPaintParams({...paintParams, loss: parseInt(e.target.value)})} className="w-full h-1.5 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                    </div>
                  </div>

                  <div className="bg-gray-50 p-8 rounded-[40px] border border-gray-200 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase text-gray-700 flex items-center gap-2 tracking-widest"><TrendingUp size={18}/> Préparation de surface</h4>
                      <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase italic tracking-widest">Calcul du tonnage abrasif</p>
                    </div>
                    <div className="flex gap-2">
                      {['Sa2', 'Sa2.5', 'Sa3'].map(deg => (
                        <button key={deg} onClick={() => setAbrasiveDegree(deg)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${abrasiveDegree === deg ? 'bg-black text-white' : 'bg-white border text-gray-400'}`}>{deg}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RÉSULTATS D'INGÉNIERIE & SKETCH */}
                <div className="space-y-8">
                  <SketchGenerator type={geoMode} dims={dims} />

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white border-2 border-gray-100 p-8 rounded-[40px] shadow-sm group hover:border-blue-500 transition-all">
                      <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 leading-none flex items-center gap-2"><Ruler size={12}/> Surface à traiter</p>
                      <p className="text-4xl font-black text-gray-800 italic">{surface.toFixed(2)}<span className="text-sm font-bold ml-1 opacity-40">m²</span></p>
                    </div>
                    <div className="bg-red-600 p-8 rounded-[40px] shadow-xl shadow-red-100 text-white relative overflow-hidden group">
                      <Droplets className="absolute -right-2 -bottom-2 opacity-10" size={80} />
                      <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-2 leading-none">Besoin Peinture (Pratique)</p>
                      <p className="text-4xl font-black italic">{paintResults.practical.toFixed(1)}<span className="text-sm font-bold ml-1 opacity-60">L</span></p>
                      <p className="text-[8px] font-bold mt-2 uppercase opacity-40 italic tracking-widest">Théorique: {paintResults.theoretical.toFixed(1)}L</p>
                    </div>
                  </div>

                  <div className="bg-[#1e272e] p-8 rounded-[40px] text-white flex justify-between items-center group">
                    <div className="flex items-center gap-5">
                      <div className="bg-white/10 p-4 rounded-3xl group-hover:rotate-6 transition-transform"><Box size={24} className="text-blue-400"/></div>
                      <div>
                        <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Estimation Abrasif</p>
                        <p className="text-2xl font-black italic">{abrasiveTonnage.toFixed(2)}<span className="text-xs ml-1 opacity-50 uppercase">Tonnes</span></p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[14px] font-black text-blue-400 italic">~ {Math.ceil(abrasiveTonnage)} BigBags</p>
                       <p className="text-[8px] font-bold opacity-30 uppercase tracking-tighter mt-1">Sablage {abrasiveDegree}</p>
                    </div>
                  </div>

                  {/* MODULE ACQPA : DIAGNOSTIC CONDENSATION */}
                  <div className={`p-8 rounded-[45px] border-4 transition-all duration-500 flex items-center justify-between shadow-lg ${isSafeToApply ? 'bg-emerald-50 border-emerald-100 shadow-emerald-50' : 'bg-red-50 border-red-100 animate-pulse shadow-red-50'}`}>
                    <div className="flex items-center gap-5">
                      <div className={`p-4 rounded-3xl ${isSafeToApply ? 'bg-emerald-500' : 'bg-red-600'} text-white shadow-xl`}>
                        {isSafeToApply ? <CheckCircle2 size={32} /> : <AlertTriangle size={32} />}
                      </div>
                      <div>
                        <h4 className="text-lg font-black uppercase italic leading-none text-gray-800">Diagnostic ACQPA</h4>
                        <p className={`text-[9px] font-black uppercase mt-2 tracking-[0.2em] ${isSafeToApply ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isSafeToApply ? 'Application Autorisée' : 'Application Interdite : Risque de Rosée'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">Delta Support/Rosée</p>
                      <p className={`text-2xl font-black italic ${isSafeToApply ? 'text-emerald-600' : 'text-red-600'}`}>+{deltaT.toFixed(1)}°C</p>
                      <p className="text-[8px] font-black text-gray-300 uppercase italic">Seuil Norme: +3.0°C</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* GENERATION TS FLASH */}
              <div className="mt-16 pt-12 border-t-4 border-gray-50 flex flex-col md:flex-row gap-6 relative z-10">
                <button onClick={createTS} className="flex-1 bg-black text-white py-8 rounded-[35px] font-black uppercase text-sm shadow-2xl flex items-center justify-center gap-4 hover:bg-blue-600 transition-all active:scale-95 group">
                  <Zap size={22} className="group-hover:animate-pulse" fill="white" />
                  Générer Fiche TS & Devis Flash
                </button>
                <button className="flex-1 bg-gray-50 text-gray-400 py-8 rounded-[35px] font-black uppercase text-sm flex items-center justify-center gap-4 hover:bg-gray-100 transition-all">
                  <Download size={22}/> Compte-rendu PDF Technique
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =================================================================================================
// 5. UTILITAIRES UI (RESPONSIVE NAVIGATION)
// =================================================================================================
const NavBtn = ({id, icon: Icon, label, active, set, disabled}: any) => (
  <button 
    onClick={() => !disabled && set(id)} 
    disabled={disabled}
    className={`w-full flex items-center gap-4 px-6 py-5 rounded-[25px] text-[11px] font-black uppercase transition-all shadow-sm
      ${active === id ? 'bg-black text-white shadow-black/20' : 'bg-white text-gray-400 hover:bg-gray-50 hover:text-black'} 
      ${disabled ? 'opacity-20 cursor-not-allowed filter grayscale' : 'hover:scale-[1.02] active:scale-95'}`}
  >
    <div className={`p-2 rounded-xl ${active === id ? 'bg-red-600 text-white' : 'bg-gray-50 text-gray-300'}`}><Icon size={18} /></div> 
    {label}
    {!disabled && active === id && <ChevronRight size={16} className="ml-auto opacity-50 animate-pulse"/>}
  </button>
);

const StatCard = ({ label, val, sub, icon: Icon, color }: any) => {
  const themes:any = { 
    red: "bg-red-50 text-red-600 border-red-100", blue: "bg-blue-50 text-blue-600 border-blue-100", 
    green: "bg-emerald-50 text-emerald-600 border-emerald-100", indigo: "bg-indigo-50 text-indigo-600 border-indigo-100", 
    orange: "bg-orange-50 text-orange-600 border-orange-100" 
  };
  return (
    <div className={`p-10 rounded-[50px] border flex items-start justify-between bg-white shadow-sm hover:shadow-xl transition-all cursor-default group`}>
      <div className="space-y-6">
        <p className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em] text-gray-500 mb-2 leading-none italic">{label}</p>
        <p className="text-5xl font-black text-gray-900 tracking-tighter leading-none group-hover:scale-105 transition-transform origin-left italic">{val}</p>
        <p className={`text-[10px] font-black mt-4 uppercase ${themes[color].split(' ')[1]} tracking-widest bg-gray-50 px-3 py-1.5 rounded-full inline-block`}>{sub}</p>
      </div>
      <div className={`p-6 rounded-[30px] shadow-xl group-hover:rotate-12 transition-transform ${themes[color].split(' ').slice(0,2).join(' ')} shadow-inner border-2 border-white`}><Icon size={32}/></div>
    </div>
  )
};
