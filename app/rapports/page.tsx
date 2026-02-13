"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Plus, Calculator, PencilRuler, Save, 
  Trash2, ChevronRight, CheckCircle2, AlertTriangle, 
  Settings, Layers, Pipette, Share2, Wifi, WifiOff,
  User, Calendar, Briefcase, Ruler, X, AlertCircle,
  Thermometer, Droplets, Box, Zap, Download, Pencil,
  Target, HardHat, TrendingUp, History, MessageSquare,
  ClipboardList, CheckCircle, ArrowRight, Sun, CloudRain, Cloud, Snowflake, Printer
} from 'lucide-react';
import { supabase } from '@/lib/supabase'; // Assurez-vous que ce path est correct
import Dexie, { Table } from 'dexie';

// =================================================================================================
// 1. TYPES & INTERFACES (STRUCTURE DE DONNÉES RÉUNION)
// =================================================================================================
interface Action {
  id: string;
  desc: string;
  responsable: string;
  echeance: string;
  statut: 'en_cours' | 'fait' | 'bloque';
}

interface Topic {
  id: string;
  titre: string;
  contenu: string;
  actions: Action[];
  category: 'Technique' | 'Planning' | 'Budget' | 'Sécurité';
}

interface Participant {
  userId: string;
  nom: string;
  role: string;
  statut: 'present' | 'absent' | 'excuse';
}

interface MeetingMeta {
  date: string;
  heure: string;
  lieu: string;
  meteo: string;
}

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
        const lateral = Math.PI * D * L;
        const bases = ends ? 2 * (Math.PI * Math.pow(R, 2)) : 0;
        return lateral + bases;
      case 'cone': 
        return Math.PI * R * Math.sqrt(Math.pow(R, 2) + Math.pow(h, 2));
      case 'sphere': 
        return 4 * Math.PI * Math.pow(R, 2);
      default: return 0;
    }
  },

  // Moteur de consommation Peinture (Standard ACQPA)
  calculatePaintConsumtion: (surface: number, eps: number, vs: number, loss: number) => {
    if (!vs || vs === 0) return { theoretical: 0, practical: 0 };
    const theoretical = (surface * eps) / (10 * vs);
    const practical = theoretical / (1 - (loss / 100));
    return { theoretical, practical };
  },

  // Moteur de Sablage (Tonnage Abrasif)
  calculateAbrasive: (surface: number, degree: string) => {
    const consumptionMap: any = { 'Sa2': 35, 'Sa2.5': 45, 'Sa3': 55 };
    const baseCons = consumptionMap[degree] || 45;
    return (surface * baseCons * 1.2) / 1000; // Tonnage + 20% marge
  },

  // Module Diagnostic Environnemental (Point de Rosée Magnus-Tetens)
  calculateDewPoint: (T: number, RH: number) => {
    const a = 17.27;
    const b = 237.7;
    const gamma = ((a * T) / (b + T)) + Math.log(RH / 100);
    return (b * gamma) / (a - gamma);
  }
};

// =================================================================================================
// 3. COMPOSANT SKETCH GENERATOR (ROUGH.JS SVG)
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
      const config = { stroke: '#2d3436', strokeWidth: 1.5, roughness: 1.2 };

      if (type === 'plat') {
        const w = Math.min(dims.L * 15, 250);
        const h = Math.min(dims.l * 15, 140);
        const x = center.x - w/2;
        const y = center.y - h/2;
        node.appendChild(rc.rectangle(x, y, w, h, { ...config, fill: 'rgba(9, 132, 227, 0.05)', fillStyle: 'hachure' }));
        node.appendChild(rc.line(x, y + h + 15, x + w, y + h + 15, { stroke: '#0984e3' }));
      } 
      else if (type === 'cylindre') {
        const d = Math.min(dims.D * 15, 100);
        const l = Math.min(dims.L * 10, 200);
        const x = center.x - l/2;
        node.appendChild(rc.ellipse(x, center.y, d/2, d, config));
        node.appendChild(rc.line(x, center.y - d/2, x + l, center.y - d/2, config));
        node.appendChild(rc.line(x, center.y + d/2, x + l, center.y + d/2, config));
      }
    };
    render();
    return () => { isMounted = false; };
  }, [type, dims]);

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-inner p-4 relative overflow-hidden group print:hidden">
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <PencilRuler size={14} className="text-blue-500" />
        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Visualisation Géométrique</span>
      </div>
      <svg ref={svgRef} width="100%" height="220" />
    </div>
  );
};

// =================================================================================================
// 4. COMPOSANT PRINCIPAL : TERMINAL DE RÉUNION & CALCUL
// =================================================================================================
export default function Rapports() {
  const [isOnline, setIsOnline] = useState(true);
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [selectedChantier, setSelectedChantier] = useState<string>("");

  // --- STATE RÉUNION (Meeting Orchestrator) ---
  const [meetingMeta, setMeetingMeta] = useState<MeetingMeta>({
    date: new Date().toISOString().split('T')[0],
    heure: '09:00',
    lieu: 'Algeco Principal',
    meteo: 'Ensoleillé'
  });

  // Mock Team (Simule des données venant de Supabase/Dexie)
  const [team, setTeam] = useState<Participant[]>([
    { userId: 'u1', nom: 'Jean Dupont', role: 'Chef de Chantier', statut: 'present' },
    { userId: 'u2', nom: 'Marie Curie', role: 'Architecte', statut: 'present' },
    { userId: 'u3', nom: 'Paul Martin', role: 'Client', statut: 'absent' },
  ]);

  const [topics, setTopics] = useState<Topic[]>([]);
  
  // États temporaires pour l'ajout
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicContent, setNewTopicContent] = useState("");
  const [newTopicCategory, setNewTopicCategory] = useState<Topic['category']>("Technique");

  // --- STATE SCIENTIFIQUE ---
  const [geoMode, setGeoMode] = useState('plat');
  const [dims, setDims] = useState({ L: 20, l: 10, D: 5, h: 5, ends: true });
  const [paintParams, setPaintParams] = useState({ eps: 260, vs: 70, layers: 3, loss: 35 });
  const [abrasiveDegree, setAbrasiveDegree] = useState('Sa2.5');
  const [env, setEnv] = useState({ tAir: 22, rh: 65, tSteel: 19 });

  // --- LOGIQUE CALCULS ---
  const surface = ScientificEngine.calculateSurface(geoMode, dims);
  const paint = ScientificEngine.calculatePaintConsumtion(surface, paintParams.eps, paintParams.vs, paintParams.loss);
  const abrasiveTonnage = ScientificEngine.calculateAbrasive(surface, abrasiveDegree);
  const dewPoint = ScientificEngine.calculateDewPoint(env.tAir, env.rh);
  const deltaT = env.tSteel - dewPoint;
  const isSafeToApply = deltaT > 3;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      // Simulation load chantiers
      setChantiers([{id: 'C01', nom: 'Rénovation Tour A'}, {id: 'C02', nom: 'Maintenance Hangar 4'}]);
    }
  }, []);

  // --- LOGIQUE RÉUNION ---

  const handleAttendance = (userId: string, newStatus: string) => {
    setTeam(team.map(p => p.userId === userId ? { ...p, statut: newStatus as any } : p));
  };

  const addTopic = () => {
    if (!newTopicTitle) return;
    const topic: Topic = {
      id: Date.now().toString(),
      titre: newTopicTitle,
      contenu: newTopicContent,
      category: newTopicCategory,
      actions: []
    };
    setTopics([topic, ...topics]);
    setNewTopicTitle("");
    setNewTopicContent("");
  };

  const addActionToTopic = (topicId: string) => {
    const desc = prompt("Description de l'action :");
    if (!desc) return;
    
    setTopics(topics.map(t => {
      if (t.id === topicId) {
        return {
          ...t,
          actions: [...t.actions, {
            id: Math.random().toString(36).substr(2,9),
            desc,
            responsable: team[0].userId, // Default to first user
            echeance: new Date().toISOString().split('T')[0],
            statut: 'en_cours'
          }]
        };
      }
      return t;
    }));
  };

  // --- FONCTION D'INTÉGRATION CLÉ : CALCULATEUR -> RÉUNION ---
  const importCalculationToMeeting = () => {
    const content = `
      Surface calculée (${geoMode}): ${surface.toFixed(2)} m².
      Système: ${paintParams.layers} couches, EPS ${paintParams.eps}µm.
      Besoin peinture (pratique): ${paint.practical.toFixed(1)} L.
      Conditions: T°Acier ${env.tSteel}°C (Delta ${deltaT.toFixed(1)}°C).
    `;
    
    const topic: Topic = {
      id: "calc_" + Date.now(),
      titre: `Etude Technique - Zone ${geoMode.toUpperCase()}`,
      contenu: content.trim(),
      category: 'Technique',
      actions: []
    };
    
    setTopics([topic, ...topics]);
    // Scroll to top of notes
    const notesPanel = document.getElementById('meeting-panel');
    if(notesPanel) notesPanel.scrollTop = 0;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#f4f7f9] p-4 lg:p-8 font-sans text-gray-900 print:bg-white print:p-0">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* HEADER (Non imprimé si simple, mais gardons le titre pour le rapport) */}
        <div className="bg-white rounded-[40px] p-6 shadow-xl border border-white flex flex-col lg:flex-row justify-between items-center gap-6 print:shadow-none print:border-none print:rounded-none print:mb-8">
          <div className="flex items-center gap-6">
            <div className="bg-red-600 p-4 rounded-3xl text-white shadow-lg shadow-red-100 print:hidden">
              <Zap size={32} fill="white" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-gray-900">Rapport de Chantier</h1>
              <div className="flex items-center gap-3 print:hidden">
                <span className={`flex items-center gap-1.5 text-[10px] font-black px-3 py-1 rounded-full uppercase ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {isOnline ? <Wifi size={12}/> : <WifiOff size={12}/>} {isOnline ? 'Online' : 'Offline'}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-l pl-3 border-gray-200">Altrad OS v4.2</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-gray-100/50 p-2 rounded-[30px] border border-gray-100 print:hidden">
            <select 
              value={selectedChantier} 
              onChange={(e) => setSelectedChantier(e.target.value)}
              className="bg-transparent border-none font-black text-sm px-6 outline-none min-w-[250px] text-gray-600"
            >
              <option value="">-- SÉLECTIONNER CHANTIER --</option>
              {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            <button onClick={handlePrint} className="bg-black text-white px-8 py-4 rounded-[22px] font-black uppercase text-xs hover:bg-gray-800 transition-all shadow-xl active:scale-95 flex items-center gap-3">
              <Printer size={18}/> PDF / Print
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* =====================================================================================
              MODULE DE GAUCHE : ORCHESTRATEUR DE RÉUNION (Meeting Logic)
             ===================================================================================== */}
          <div className="xl:col-span-5 space-y-6">
            <div id="meeting-panel" className="bg-white rounded-[50px] p-8 shadow-sm border border-gray-100 min-h-[800px] flex flex-col print:shadow-none print:border print:border-black print:min-h-0">
              
              <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-6 print:border-black">
                <h2 className="text-xl font-black uppercase italic flex items-center gap-3">
                  <MessageSquare size={24} className="text-red-600"/> Minutes
                </h2>
                <div className="text-right">
                   <p className="text-sm font-bold text-gray-800">{new Date(meetingMeta.date).toLocaleDateString()}</p>
                   <p className="text-xs text-gray-400 font-bold">{meetingMeta.lieu}</p>
                </div>
              </div>

              {/* 1. CONFIGURATION RÉUNION (Méta) */}
              <div className="grid grid-cols-2 gap-4 mb-6 print:grid-cols-4">
                <div className="bg-gray-50 p-4 rounded-2xl print:bg-white print:border print:border-gray-300">
                  <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Météo</label>
                  <select 
                    value={meetingMeta.meteo}
                    onChange={e => setMeetingMeta({...meetingMeta, meteo: e.target.value})}
                    className="bg-transparent font-bold w-full outline-none text-sm appearance-none"
                  >
                    <option>Ensoleillé</option><option>Nuageux</option><option>Pluvieux</option>
                  </select>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl print:bg-white print:border print:border-gray-300">
                  <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Heure Début</label>
                  <input type="time" value={meetingMeta.heure} onChange={e => setMeetingMeta({...meetingMeta, heure: e.target.value})} className="bg-transparent font-bold w-full outline-none text-sm" />
                </div>
              </div>

              {/* 2. PARTICIPANTS */}
              <div className="mb-8">
                <h3 className="text-xs font-black uppercase text-gray-400 mb-3 tracking-widest flex items-center gap-2"><User size={12}/> Équipe & Présences</h3>
                <div className="space-y-2">
                  {team.map(member => (
                    <div key={member.userId} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100 print:border-b print:rounded-none">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${member.statut === 'present' ? 'bg-emerald-500' : member.statut === 'absent' ? 'bg-red-500' : 'bg-orange-400'}`} />
                        <div>
                          <p className="text-xs font-bold text-gray-800 leading-none">{member.nom}</p>
                          <p className="text-[9px] text-gray-400 uppercase font-bold">{member.role}</p>
                        </div>
                      </div>
                      <select 
                        value={member.statut}
                        onChange={(e) => handleAttendance(member.userId, e.target.value)}
                        className="text-[10px] font-black uppercase bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none print:hidden"
                      >
                        <option value="present">Présent</option>
                        <option value="absent">Absent</option>
                        <option value="excuse">Excusé</option>
                      </select>
                      {/* Affichage print statique */}
                      <span className="hidden print:block text-[10px] uppercase font-bold">{member.statut}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. INPUT NOUVEAU SUJET (Caché à l'impression) */}
              <div className="bg-gray-50 rounded-[35px] p-6 border-2 border-dashed border-gray-200 mb-8 print:hidden">
                <input 
                  type="text" 
                  value={newTopicTitle}
                  onChange={e => setNewTopicTitle(e.target.value)}
                  placeholder="Titre du point (ex: Accès Zone 3)"
                  className="w-full bg-transparent font-black text-gray-800 mb-3 outline-none"
                />
                <textarea 
                  value={newTopicContent}
                  onChange={(e) => setNewTopicContent(e.target.value)}
                  placeholder="Détails, décisions et observations..."
                  className="w-full bg-transparent text-gray-600 text-sm font-medium outline-none h-20 resize-none"
                />
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    {['Technique', 'Planning', 'Budget', 'Sécurité'].map((cat: any) => (
                      <button 
                        key={cat} 
                        onClick={() => setNewTopicCategory(cat)}
                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all border ${newTopicCategory === cat ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-200'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <button onClick={addTopic} className="bg-red-600 text-white p-3 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all">
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              {/* 4. LISTE DES SUJETS (Le coeur du rapport) */}
              <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {topics.length === 0 && <div className="text-center text-gray-300 py-10 italic text-sm">Aucun point abordé pour le moment.</div>}
                
                {topics.map(topic => (
                  <div key={topic.id} className="bg-white border border-gray-100 p-6 rounded-[30px] shadow-sm group print:border-black print:rounded-none print:shadow-none print:break-inside-avoid">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-wider ${
                          topic.category === 'Sécurité' ? 'bg-red-100 text-red-600' : 
                          topic.category === 'Planning' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {topic.category}
                        </span>
                        <h4 className="font-bold text-gray-800">{topic.titre}</h4>
                      </div>
                      <button onClick={() => setTopics(topics.filter(t => t.id !== topic.id))} className="text-gray-300 hover:text-red-500 print:hidden"><Trash2 size={14}/></button>
                    </div>
                    
                    <p className="text-sm text-gray-600 leading-relaxed mb-4 whitespace-pre-line">{topic.contenu}</p>

                    {/* Actions liées au sujet */}
                    {topic.actions.length > 0 && (
                      <div className="bg-gray-50 rounded-xl p-3 space-y-2 print:bg-white print:border print:border-gray-200">
                        {topic.actions.map(act => (
                          <div key={act.id} className="flex items-center gap-3 text-xs">
                            <input type="checkbox" checked={act.statut === 'fait'} readOnly className="rounded text-red-600 focus:ring-red-500" />
                            <span className="flex-1 font-medium text-gray-700">{act.desc}</span>
                            <span className="font-bold text-gray-400 text-[9px] uppercase">{act.responsable} - {new Date(act.echeance).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-gray-50 flex justify-end print:hidden">
                      <button onClick={() => addActionToTopic(topic.id)} className="text-[10px] font-black uppercase text-blue-600 flex items-center gap-1 hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors">
                        <CheckCircle size={12}/> Ajouter Action
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* =====================================================================================
              MODULE DE DROITE : MOTEUR SCIENTIFIQUE (Scientific Engine)
             ===================================================================================== */}
          <div className="xl:col-span-7 space-y-8 print:hidden">
            <div className="bg-white rounded-[50px] p-10 shadow-sm border border-gray-100 relative overflow-hidden">
              <Calculator size={300} className="absolute -right-20 -bottom-20 text-gray-50 opacity-50 pointer-events-none" />
              
              <div className="flex items-center justify-between mb-12 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 p-4 rounded-3xl text-white shadow-xl shadow-blue-100">
                    <Calculator size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter">Moteur Scientifique (ACQPA)</h2>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest italic leading-none">Étude de métrés et consommations</p>
                  </div>
                </div>
                <div className="flex bg-gray-50 p-2 rounded-2xl border border-gray-100">
                  {['plat', 'cylindre', 'cone', 'sphere'].map(m => (
                    <button key={m} onClick={() => setGeoMode(m)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${geoMode === m ? 'bg-white text-blue-600 shadow-sm border border-gray-100' : 'text-gray-400'}`}>{m}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 relative z-10">
                <div className="space-y-10">
                  <div className="grid grid-cols-2 gap-8">
                    {geoMode === 'plat' && (
                      <>
                        <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Longueur (m)</label><input type="number" value={dims.L} onChange={e=>setDims({...dims, L: parseFloat(e.target.value)})} className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-400 rounded-3xl p-5 font-black text-xl outline-none" /></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Largeur (m)</label><input type="number" value={dims.l} onChange={e=>setDims({...dims, l: parseFloat(e.target.value)})} className="w-full bg-gray-50 border-2 border-transparent focus:border-red-400 rounded-3xl p-5 font-black text-xl outline-none" /></div>
                      </>
                    )}
                    {geoMode === 'cylindre' && (
                      <>
                        <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Diamètre Ø (m)</label><input type="number" value={dims.D} onChange={e=>setDims({...dims, D: parseFloat(e.target.value)})} className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-400 rounded-3xl p-5 font-black text-xl outline-none" /></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Longueur L (m)</label><input type="number" value={dims.L} onChange={e=>setDims({...dims, L: parseFloat(e.target.value)})} className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-400 rounded-3xl p-5 font-black text-xl outline-none" /></div>
                      </>
                    )}
                  </div>

                  <div className="bg-blue-50/50 p-8 rounded-[40px] border border-blue-100 space-y-8">
                    <h4 className="text-xs font-black uppercase text-blue-900 flex items-center gap-2 tracking-widest leading-none"><Pipette size={18}/> Système de Peinture</h4>
                    <div className="grid grid-cols-3 gap-6">
                      <div><label className="text-[8px] font-black uppercase text-gray-400 block mb-2 leading-none">EPS (µm)</label><input type="number" value={paintParams.eps} onChange={e=>setPaintParams({...paintParams, eps: parseFloat(e.target.value)})} className="w-full bg-white rounded-2xl p-4 font-black outline-none border border-blue-100 shadow-sm" /></div>
                      <div><label className="text-[8px] font-black uppercase text-gray-400 block mb-2 leading-none">Extrait Sec %</label><input type="number" value={paintParams.vs} onChange={e=>setPaintParams({...paintParams, vs: parseFloat(e.target.value)})} className="w-full bg-white rounded-2xl p-4 font-black outline-none border border-blue-100 shadow-sm" /></div>
                      <div><label className="text-[8px] font-black uppercase text-gray-400 block mb-2 leading-none">Perte %</label><input type="number" value={paintParams.loss} onChange={e=>setPaintParams({...paintParams, loss: parseFloat(e.target.value)})} className="w-full bg-white rounded-2xl p-4 font-black outline-none border border-blue-100 shadow-sm" /></div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-8 rounded-[40px] border border-gray-200 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase text-gray-700 flex items-center gap-2 tracking-widest">Sablage (Tonnage)</h4>
                      <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase italic tracking-widest leading-none">Standard abrasif BIG BAG</p>
                    </div>
                    <div className="flex gap-2">
                      {['Sa2', 'Sa2.5', 'Sa3'].map(deg => (
                        <button key={deg} onClick={() => setAbrasiveDegree(deg)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${abrasiveDegree === deg ? 'bg-black text-white' : 'bg-white border text-gray-400'}`}>{deg}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <SketchGenerator type={geoMode} dims={dims} />

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white border-2 border-gray-100 p-8 rounded-[40px] shadow-sm">
                      <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 leading-none flex items-center gap-2"><Ruler size={12}/> Surface</p>
                      <p className="text-4xl font-black text-gray-800 italic">{surface.toFixed(2)}<span className="text-sm font-bold ml-1 opacity-40 uppercase">m²</span></p>
                    </div>
                    <div className="bg-red-600 p-8 rounded-[40px] shadow-xl shadow-red-100 text-white relative overflow-hidden">
                      <Droplets className="absolute -right-2 -bottom-2 opacity-10" size={80} />
                      <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-2 leading-none">Besoin (Pratique)</p>
                      <p className="text-4xl font-black italic">{paint.practical.toFixed(1)}<span className="text-sm font-bold ml-1 opacity-60">L</span></p>
                    </div>
                  </div>

                  {/* DIAGNOSTIC ACQPA ROSÉE */}
                  <div className={`p-8 rounded-[45px] border-4 transition-all duration-500 flex items-center justify-between shadow-lg ${isSafeToApply ? 'bg-emerald-50 border-emerald-100 shadow-emerald-50' : 'bg-red-50 border-red-100 animate-pulse shadow-red-50'}`}>
                    <div className="flex items-center gap-5">
                      <div className={`p-4 rounded-3xl ${isSafeToApply ? 'bg-emerald-500' : 'bg-red-600'} text-white shadow-xl`}>
                        {isSafeToApply ? <CheckCircle2 size={32} /> : <AlertTriangle size={32} />}
                      </div>
                      <div>
                        <h4 className="text-lg font-black uppercase italic leading-none text-gray-800">ACQPA ROSÉE</h4>
                        <p className={`text-[9px] font-black uppercase mt-2 tracking-[0.2em] ${isSafeToApply ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isSafeToApply ? 'Application Autorisée' : 'Danger Condensation'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none italic">SUPPORT/ROSÉE</p>
                      <p className={`text-2xl font-black italic ${isSafeToApply ? 'text-emerald-600' : 'text-red-600'}`}>+{deltaT.toFixed(1)}°C</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTON : LE PONT ENTRE LES DEUX MONDES */}
              <div className="mt-16 pt-12 border-t-4 border-gray-50 flex flex-col md:flex-row gap-6 relative z-10">
                <button onClick={importCalculationToMeeting} className="flex-1 bg-black text-white py-8 rounded-[35px] font-black uppercase text-sm shadow-2xl flex items-center justify-center gap-4 hover:bg-emerald-600 transition-all active:scale-95 group">
                  <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                  Injecter ce calcul dans le Rapport
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
