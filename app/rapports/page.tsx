"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FileText, Plus, Calculator, PencilRuler, Save, Trash2, ChevronRight, CheckCircle2, AlertTriangle, Settings, Layers, Pipette, Share2, Wifi, WifiOff, User, Calendar, Briefcase, Ruler, X, AlertCircle, MapPin, Printer, Square, CheckSquare, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Dexie, { Table } from 'dexie';

class OfflineDB extends Dexie {
  reports!: Table<any>;
  constructor() { super('AltradHSE_Offline'); this.version(1).stores({ reports: '++id, chantier_id, date, status, is_synced' }); }
}
const db = typeof window !== 'undefined' ? new OfflineDB() : null;

const ScientificEngine = {
  calculateSurface: (t: string, d: any) => t === 'rectangle' ? d.L * d.l : t === 'cylindre' ? Math.PI * d.D * d.H : 0,
  calculatePaint: (s: number, m: number, r: number) => r ? (s * m) / (r * 10) : 0,
  calculateAbrasive: (s: number, d: string) => (s * ({ 'Sa1': 15, 'Sa2': 25, 'Sa2.5': 40, 'Sa3': 55 }[d] || 0)) / 1000
};

const SketchTool = ({ type, dims }: { type: string, dims: any }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    let isMounted = true;
    const renderSketch = async () => {
      if (!svgRef.current || typeof window === 'undefined') return;
      try {
        const rough = (await import('roughjs')).default;
        if (!isMounted || !svgRef.current) return;
        const rc = rough.svg(svgRef.current), node = svgRef.current;
        while (node.firstChild) node.removeChild(node.firstChild);
        if (type === 'rectangle') {
          const w = Math.max(dims.L * 10, 50), h = Math.max(dims.l * 10, 30), x = 50, y = 50;
          node.appendChild(rc.rectangle(x, y, w, h, { roughness: 1.5, stroke: '#2d3436', strokeWidth: 2 }));
          const tL = document.createElementNS("http://www.w3.org/2000/svg", "text");
          tL.setAttribute("x", (x + w / 2 - 10).toString()); tL.setAttribute("y", (y - 15).toString()); tL.setAttribute("fill", "#0984e3"); tL.textContent = `${dims.L}m`;
          node.appendChild(tL);
          const tl = document.createElementNS("http://www.w3.org/2000/svg", "text");
          tl.setAttribute("x", (x - 30).toString()); tl.setAttribute("y", (y + h / 2).toString()); tl.setAttribute("fill", "#d63031"); tl.textContent = `${dims.l}m`;
          node.appendChild(tl);
        }
      } catch (e) {}
    };
    renderSketch();
    return () => { isMounted = false; };
  }, [type, dims]);
  return <svg ref={svgRef} width="100%" height="250" className="bg-gray-50 rounded-xl border border-gray-100 shadow-inner" />;
};

export default function Rapports() {
  const [isOnline, setIsOnline] = useState(true);
  const [meetingTab, setMeetingTab] = useState<'notes' | 'calculs' | 'actions' | 'recap_hebdo'>('notes');
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [selectedChantier, setSelectedChantier] = useState<string>("");
  const [chantierDetails, setChantierDetails] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [calculs, setCalculs] = useState<any[]>([]);
  const [activeNote, setActiveNote] = useState("");
  const [noteCategory, setNoteCategory] = useState("Technique");
  const [calcForm, setCalcForm] = useState({ L: 10, l: 5, microns: 200, rendement: 5, degree: 'Sa2.5' });
  const [materiels, setMateriels] = useState<any[]>([]);
  const [fournitures, setFournitures] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [taches, setTaches] = useState<any[]>([]);
  const [printFormat, setPrintFormat] = useState('A4 portrait');
  const [controleLe, setControleLe] = useState(new Date().toISOString().split('T')[0]);
  const [commandeApasser, setCommandeApasser] = useState("");
  const [risqueIdentifie, setRisqueIdentifie] = useState("");

  useEffect(() => {
    if (typeof window !== 'undefined') {
        setIsOnline(navigator.onLine);
        const handleOnline = () => setIsOnline(true), handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline); window.addEventListener('offline', handleOffline);
        supabase.from('chantiers').select('id, nom').order('nom', { ascending: true }).then(({data}) => data && setChantiers(data));
        return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
    }
  }, []);

  useEffect(() => {
    async function getDetails() {
      if (!selectedChantier) { setChantierDetails(null); setMateriels([]); setFournitures([]); setLocations([]); setTaches([]); return; }
      try {
        const { data } = await supabase.from('chantiers').select('*').eq('id', selectedChantier).single();
        setChantierDetails(data);
        const { data: fData } = await supabase.from('chantier_fournitures').select('*').eq('chantier_id', selectedChantier);
        setFournitures((fData || []).map((f: any) => ({ ...f, quantite_prevue: f.qte_prevue || 0, quantite_consommee: f.qte_consommee || 0, quantite_dispo: (f.qte_prevue || 0) - (f.qte_consommee || 0) })));
        const { data: cmData } = await supabase.from('chantier_materiel').select('*').eq('chantier_id', selectedChantier);
        if (cmData && cmData.length > 0) {
          const matIds = cmData.map((cm: any) => cm.materiel_id).filter(Boolean);
          const { data: matData } = matIds.length > 0 ? await supabase.from('materiel').select('*').in('id', matIds) : { data: [] };
          const merged = cmData.map((cm: any) => {
            const mat = (matData || []).find((m: any) => m.id === cm.materiel_id) || {};
            return { id: cm.id, nom: mat.nom || 'Matériel inconnu', etat: mat.etat || 'Opérationnel', date_fin: cm.date_fin, type_stock: mat.type_stock || 'Interne' };
          });
          setMateriels(merged.filter((m: any) => m.type_stock !== 'Externe')); setLocations(merged.filter((m: any) => m.type_stock === 'Externe'));
        } else { setMateriels([]); setLocations([]); }
        const { data: tData } = await supabase.from('chantier_tasks').select('*').eq('chantier_id', selectedChantier);
        const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        setTaches((tData || []).map((t: any) => {
          let sub = [];
          try { sub = typeof t.subtasks === 'string' ? JSON.parse(t.subtasks) : (t.subtasks || []); } catch(e) {}
          return { ...t, nom: t.label, responsable: t.responsable_id && isUUID(t.responsable_id) ? '' : (t.responsable_id || ''), effectif: t.effectif, heures_prevues: t.objectif_heures || 0, heures_reelles: t.heures_reelles || 0, subtasks: sub };
        }));
      } catch (e) {}
    }
    getDetails();
  }, [selectedChantier]);

  const addNote = () => {
    if (!activeNote) return;
    setNotes([{ id: Date.now(), category: noteCategory, text: activeNote, type: 'observation', timestamp: new Date().toISOString() }, ...notes]);
    setActiveNote("");
  };

  const saveReport = async () => {
    if (!selectedChantier) return alert("Veuillez sélectionner un chantier réel avant d'enregistrer.");
    const report = { chantier_id: selectedChantier, date: new Date().toISOString(), notes, calculs, metriques_techniques: { surface: surfaceCalculated, peinture: paintNeeded, abrasif: sandNeeded }, is_synced: false };
    if (db) try { await db.reports.add(report); } catch (e) {}
    if (isOnline) {
      try {
        const { error } = await supabase.from('reunions').insert([report]);
        if (error) throw error;
        alert("Rapport synchronisé avec la base de données centrale !"); setNotes([]);
      } catch (e: any) { alert("Erreur Sync Supabase: " + e.message); }
    } else alert("Rapport enregistré localement (En attente de connexion).");
  };

  const surfaceCalculated = ScientificEngine.calculateSurface('rectangle', { L: calcForm.L, l: calcForm.l });
  const paintNeeded = ScientificEngine.calculatePaint(surfaceCalculated, calcForm.microns, calcForm.rendement);
  const sandNeeded = ScientificEngine.calculateAbrasive(surfaceCalculated, calcForm.degree);
  const isExpiringSoon = (d: string) => { if (!d) return false; const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000); return diff <= 3 && diff >= 0; };

  const { filteredTaches, periodStr } = useMemo(() => {
    const d = new Date(controleLe);
    const day = d.getDay() || 7;
    const monday = new Date(d); monday.setDate(d.getDate() - day + 1); monday.setHours(0,0,0,0);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23,59,59,999);
    const friday = new Date(monday); friday.setDate(monday.getDate() + 4);
    const getWk = (dt: Date) => { const d2 = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate())); const dn = d2.getUTCDay() || 7; d2.setUTCDate(d2.getUTCDate() + 4 - dn); const ys = new Date(Date.UTC(d2.getUTCFullYear(),0,1)); return Math.ceil((((d2.getTime() - ys.getTime()) / 86400000) + 1)/7); };
    const wN = getWk(monday);
    const pStr = `Semaine ${wN < 10 ? '0'+wN : wN} du ${monday.toLocaleDateString('fr-FR', {day:'2-digit', month:'2-digit'})} au ${friday.toLocaleDateString('fr-FR', {day:'2-digit', month:'2-digit'})}`;
    const fT = taches.reduce((acc: any[], t) => {
      const sub = (t.subtasks || []).filter((st: any) => { if(!st.date) return false; const stD = new Date(st.date); return stD >= monday && stD <= sunday; });
      if (sub.length > 0) acc.push({ ...t, subtasks: sub });
      return acc;
    }, []);
    return { filteredTaches: fT, periodStr: pStr };
  }, [taches, controleLe]);

  return (
    <div className="min-h-screen bg-[#f8f9fa] print-reset p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6 print-reset">
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 gap-4 print-hidden">
          <div className="flex items-center gap-4">
            <div className="bg-black p-3 rounded-2xl text-white shadow-lg shadow-gray-200"><FileText size={28} /></div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-gray-800">Réunion Chantier</h1>
              <div className="flex items-center gap-2">
                {isOnline ? <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 uppercase bg-emerald-50 px-2 py-0.5 rounded-full"><Wifi size={12}/> Connecté</span> : <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase bg-red-50 px-2 py-0.5 rounded-full"><WifiOff size={12}/> Mode Hors-Ligne</span>}
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">• Altrad Services v3.1</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <select value={selectedChantier} onChange={(e) => setSelectedChantier(e.target.value)} className="flex-1 md:w-64 bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-sm text-gray-700 outline-none focus:ring-2 focus:ring-black transition-all">
              <option value="">-- Sélectionner Chantier --</option>
              {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            <button onClick={saveReport} className="bg-black text-white px-6 py-3 rounded-xl font-black uppercase text-xs shadow-xl flex items-center gap-2 hover:scale-105 transition-all active:scale-95 whitespace-nowrap"><Save size={16}/> Enregistrer</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print-reset">
          <div className="lg:col-span-2 space-y-6 print-reset">
            <div className={`bg-white rounded-[35px] p-8 shadow-sm border border-gray-100 min-h-[600px] flex flex-col ${meetingTab === 'recap_hebdo' ? 'print-reset' : ''}`}>
              {chantierDetails && meetingTab !== 'recap_hebdo' && (
                <div className="mb-6 flex items-center gap-4 text-xs font-bold text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100 print-hidden">
                  <div className="flex items-center gap-1"><MapPin size={14}/> {chantierDetails.ville || 'Localisation inconnue'}</div><div className="w-px h-4 bg-gray-300"></div><div className="flex items-center gap-1"><User size={14}/> Client: {chantierDetails.client || 'N/A'}</div>
                </div>
              )}
              <div className="flex items-center gap-2 mb-8 bg-gray-50 p-2 rounded-2xl self-start print-hidden">
                {['notes', 'calculs', 'actions', 'recap_hebdo'].map((t: any) => (
                  <button key={t} onClick={() => setMeetingTab(t)} className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${meetingTab === t ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>{t === 'recap_hebdo' ? 'Récap Hebdo' : t}</button>
                ))}
              </div>

              {meetingTab === 'notes' && (
                <div className="flex-1 flex flex-col animate-in fade-in print-hidden">
                  <div className="flex gap-4 mb-8">
                    <div className="flex-1 relative">
                      <textarea value={activeNote} onChange={(e) => setActiveNote(e.target.value)} placeholder={selectedChantier ? "Prendre une note..." : "Sélectionnez un chantier pour commencer..."} disabled={!selectedChantier} className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-2xl p-4 font-medium text-gray-700 outline-none transition-all h-32 resize-none disabled:opacity-50 disabled:cursor-not-allowed" />
                      <div className="absolute bottom-3 right-3 flex gap-2">
                        <select value={noteCategory} onChange={(e) => setNoteCategory(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-[10px] font-black uppercase text-gray-500 outline-none"><option>Technique</option><option>Planning</option><option>Budget</option><option>Sécurité</option></select>
                        <button onClick={addNote} disabled={!selectedChantier} className="bg-black text-white p-2 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"><Plus size={20} /></button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {notes.map((n) => (
                      <div key={n.id} className="group bg-white border border-gray-100 p-5 rounded-2xl hover:shadow-md transition-all flex items-start gap-4">
                        <div className={`w-1 h-10 rounded-full ${n.category === 'Sécurité' ? 'bg-red-500' : 'bg-blue-500'}`} />
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1"><span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{n.category}</span><span className="text-[9px] font-bold text-gray-300">{new Date(n.timestamp).toLocaleTimeString()}</span></div>
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
                <div className="flex-1 animate-in fade-in print-hidden">
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
                <div className="flex-1 animate-in fade-in relative w-full">
                  <style>{`
                    @media print { 
                      @page { size: ${printFormat}; margin: 15mm 10mm; } 
                      html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; height: auto !important; min-height: auto !important; overflow: visible !important; } 
                      aside, nav, header, footer:not(.print-footer), [class*="sidebar"], [class*="Sidebar"], [class*="menu"], [class*="Menu"], [class*="nav"] { display: none !important; } 
                      .print-hidden { display: none !important; } 
                      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } 
                      .print-reset, .print-reset * { overflow: visible !important; height: auto !important; min-height: auto !important; position: static !important; } 
                      .print-reset { margin: 0 !important; padding: 0 !important; max-width: none !important; width: 100% !important; box-shadow: none !important; border: none !important; background: transparent !important; display: block !important; } 
                      table { width: 100%; border-collapse: collapse; page-break-inside: auto; } 
                      tr { page-break-inside: avoid; page-break-after: auto; } 
                      thead { display: table-header-group; } 
                      tfoot { display: table-footer-group; } 
                      .break-inside-avoid { page-break-inside: avoid; break-inside: avoid; margin-bottom: 24px; width: 100%; display: block; } 
                    }
                  `}</style>
                  
                  <div className="flex flex-wrap justify-between items-center mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200 print-hidden">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-black uppercase text-gray-500">Format d'impression :</label>
                      <select value={printFormat} onChange={e => setPrintFormat(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-black">
                        <option value="A4 portrait">A4 Portrait</option><option value="A4 landscape">A4 Paysage</option><option value="A3 portrait">A3 Portrait</option><option value="A3 landscape">A3 Paysage</option>
                      </select>
                    </div>
                    <button onClick={() => window.print()} className="bg-black text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase flex items-center gap-2 hover:bg-gray-800 transition-all shadow-md"><Printer size={16} /> Imprimer Document</button>
                  </div>
                  
                  <table className="w-full bg-white print:p-0 print:border-none text-black text-xs md:text-sm print-reset">
                    <thead className="print:table-header-group w-full">
                      <tr>
                        <td className="pb-4 border-b-[3px] border-black mb-6 w-full align-bottom">
                          <div className="flex justify-between items-end w-full">
                            <div>
                              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight">Fiche Récapitulative Hebdomadaire</h2>
                              <div className="text-sm font-bold text-gray-600 uppercase mt-2 flex flex-col gap-1">
                                <div>Chantier : <span className="text-black">{chantierDetails?.nom || 'NON SÉLECTIONNÉ'}</span></div>
                                <div>N° OTP : <span className="text-black">{chantierDetails?.numero_otp || 'Non défini'}</span></div>
                                {chantierDetails?.ville && <div>Ville : <span className="text-black">{chantierDetails.ville}</span></div>}
                              </div>
                            </div>
                            <div className="text-right text-xs font-medium bg-gray-50 print:bg-transparent p-3 rounded-lg border border-gray-200 print:border-black">
                              <p className="mb-1 uppercase font-bold text-gray-500 print:text-black">Contrôlé le :</p>
                              <input type="date" value={controleLe} onChange={e => setControleLe(e.target.value)} className="bg-transparent font-bold outline-none border-b border-gray-300 print:border-none print:text-black" />
                              <p className="mt-2 font-black text-black text-[11px] bg-yellow-300 print:bg-gray-200 px-2 py-1 rounded">{periodStr}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </thead>
                    <tbody className="w-full">
                      <tr>
                        <td className="pt-6 w-full">
                          <div className="grid grid-cols-1 gap-6 w-full">
                            
                            <div className="break-inside-avoid w-full">
                              <h3 className="text-xs font-black uppercase bg-gray-100 print:bg-gray-200 p-2 mb-3 border-l-4 border-black">1. Tâches prévues cette semaine</h3>
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="border-b-2 border-gray-300">
                                    <th className="py-2 px-1">Tâche / Sous-tâche</th><th className="py-2 px-1 text-center">Responsable</th><th className="py-2 px-1 text-center w-12">Effectif</th><th className="py-2 px-1 text-center w-12">Hrs Prév.</th><th className="py-2 px-1 text-center w-16">Hrs Réel.</th><th className="py-2 px-1 text-center w-16">% Avanc.</th><th className="py-2 px-1 text-center w-12">Fait</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredTaches.length > 0 ? filteredTaches.map((t: any) => (
                                    <React.Fragment key={t.id || Math.random()}>
                                      <tr className="border-b border-gray-300 bg-gray-50 print:bg-gray-100">
                                        <td className="py-2 px-1 font-black">{t.nom || '-'}</td>
                                        <td className="py-2 px-1 text-center font-bold">{t.responsable ? t.responsable : <div className="w-20 mx-auto border-b border-dotted border-gray-400 h-4"></div>}</td>
                                        <td className="py-2 px-1 text-center font-bold">{t.effectif ? t.effectif : <div className="w-8 mx-auto border-b border-dotted border-gray-400 h-4"></div>}</td>
                                        <td className="py-2 px-1 text-center font-bold">{t.heures_prevues || '-'}</td>
                                        <td className="py-2 px-1"><div className="w-12 mx-auto border-b border-dotted border-gray-400 h-4"></div></td>
                                        <td className="py-2 px-1"><div className="w-12 mx-auto border-b border-dotted border-gray-400 h-4 relative"><span className="absolute right-0 bottom-0 text-[9px] text-gray-500">%</span></div></td>
                                        <td className="py-2 px-1 text-center"><Square size={16} className="mx-auto text-gray-400 print:text-black"/></td>
                                      </tr>
                                      {t.subtasks && t.subtasks.map((st: any) => (
                                        <tr key={st.id || Math.random()} className="border-b border-gray-200 text-[10px]">
                                          <td className="py-1.5 px-1 pl-6 flex items-center gap-2 text-gray-700"><ChevronRight size={10}/> {st.label || st.nom}</td>
                                          <td className="py-1.5 px-1 text-center"><div className="w-20 mx-auto border-b border-dotted border-gray-300 h-3"></div></td>
                                          <td className="py-1.5 px-1 text-center text-gray-500">{st.effectif ? st.effectif : <div className="w-8 mx-auto border-b border-dotted border-gray-300 h-3"></div>}</td>
                                          <td className="py-1.5 px-1 text-center text-gray-500">{st.heures || '-'}</td>
                                          <td className="py-1.5 px-1"><div className="w-10 mx-auto border-b border-dotted border-gray-300 h-3"></div></td>
                                          <td className="py-1.5 px-1"><div className="w-10 mx-auto border-b border-dotted border-gray-300 h-3 relative"><span className="absolute right-0 bottom-0 text-[8px] text-gray-400">%</span></div></td>
                                          <td className="py-1.5 px-1 text-center"><Square size={12} className="mx-auto text-gray-300 print:text-black"/></td>
                                        </tr>
                                      ))}
                                    </React.Fragment>
                                  )) : <tr><td colSpan={7} className="py-4 text-center text-gray-400 italic">Aucune tâche prévue pour cette semaine...</td></tr>}
                                </tbody>
                              </table>
                            </div>

                            <div className="break-inside-avoid w-full">
                              <h3 className="text-xs font-black uppercase bg-gray-100 print:bg-gray-200 p-2 mb-3 border-l-4 border-black">2. Fournitures & Consommables (À vérifier)</h3>
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="border-b-2 border-gray-300">
                                    <th className="py-2 px-1">Désignation</th><th className="py-2 px-1 text-center w-20">Qté Prévue</th><th className="py-2 px-1 text-center w-24">Qté Utilisée</th><th className="py-2 px-1 text-center w-20">Dispo OK</th><th className="py-2 px-1 text-center w-24">Commandé</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {fournitures.length > 0 ? fournitures.map(f => {
                                    const alertQty = f.quantite_dispo < (f.seuil_alerte || f.quantite_prevue);
                                    return (
                                      <tr key={f.id} className={`border-b border-gray-200 ${alertQty ? 'bg-red-50 print:bg-white' : ''}`}>
                                        <td className="py-2 px-1 font-bold flex items-center gap-2">{alertQty && <AlertTriangle size={14} className="text-red-500 print:text-black" />} {f.nom}</td>
                                        <td className="py-2 px-1 text-center">{f.quantite_prevue || '-'}</td>
                                        <td className="py-2 px-1"><div className="w-16 mx-auto border-b border-dotted border-gray-400 h-4"></div></td>
                                        <td className="py-2 px-1 text-center"><Square size={16} className="mx-auto text-gray-300 print:text-black"/></td><td className="py-2 px-1 text-center"><Square size={16} className="mx-auto text-gray-300 print:text-black"/></td>
                                      </tr>
                                    );
                                  }) : <tr><td colSpan={5} className="py-4 text-center text-gray-400 italic">Aucune fourniture listée...</td></tr>}
                                </tbody>
                              </table>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 break-inside-avoid w-full">
                              <div>
                                <h3 className="text-xs font-black uppercase bg-gray-100 print:bg-gray-200 p-2 mb-3 border-l-4 border-black">3. Matériels sur Chantier</h3>
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="border-b-2 border-gray-300">
                                      <th className="py-2 px-1">Désignation</th><th className="py-2 px-1 text-center w-16">Présent</th><th className="py-2 px-1 text-center w-16">Manquant</th><th className="py-2 px-1 text-center w-16">En Panne</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {materiels.length > 0 ? materiels.map(m => (
                                      <tr key={m.id} className="border-b border-gray-200">
                                        <td className="py-2 px-1 font-bold">{m.nom}</td>
                                        <td className="py-2 px-1 text-center"><Square size={16} className="mx-auto text-gray-300 print:text-black"/></td><td className="py-2 px-1 text-center"><Square size={16} className="mx-auto text-gray-300 print:text-black"/></td>
                                        <td className="py-2 px-1 text-center"><Square size={16} className="mx-auto text-gray-300 print:text-black"/></td>
                                      </tr>
                                    )) : <tr><td colSpan={4} className="py-4 text-center text-gray-400 italic">Aucun matériel listé...</td></tr>}
                                  </tbody>
                                </table>
                              </div>
                              <div>
                                <h3 className="text-xs font-black uppercase bg-gray-100 print:bg-gray-200 p-2 mb-3 border-l-4 border-black flex items-center gap-2"><Clock size={14} /> 4. Locations en cours</h3>
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="border-b-2 border-gray-300"><th className="py-2 px-1">Machine</th><th className="py-2 px-1 text-center w-24">Fin prévue</th><th className="py-2 px-1 text-center w-16">Retour OK</th></tr>
                                  </thead>
                                  <tbody>
                                    {locations.length > 0 ? locations.map(l => {
                                      const crit = isExpiringSoon(l.date_fin);
                                      return (
                                        <tr key={l.id} className="border-b border-gray-200">
                                          <td className="py-2 px-1 font-bold">{l.nom}</td><td className={`py-2 px-1 text-center ${crit ? 'text-orange-500 font-bold print:text-black' : ''}`}>{l.date_fin || 'N/A'}</td>
                                          <td className="py-2 px-1 text-center"><Square size={16} className="mx-auto text-gray-300 print:text-black"/></td>
                                        </tr>
                                      );
                                    }) : <tr><td colSpan={3} className="py-2 text-gray-400 italic">Aucune location...</td></tr>}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 break-inside-avoid print:mt-4 w-full">
                              <div className="border border-gray-300 print:border-black rounded-lg p-3">
                                <label className="text-[10px] font-black uppercase text-gray-500 print:text-black mb-2 block">📦 Commandes à passer en urgence</label>
                                <textarea value={commandeApasser} onChange={e => setCommandeApasser(e.target.value)} className="w-full h-20 resize-none outline-none text-xs print:bg-transparent" placeholder="Saisir ou laisser vide pour écrire au stylo..." />
                              </div>
                              <div className="border border-gray-300 print:border-black rounded-lg p-3">
                                <label className="text-[10px] font-black uppercase text-gray-500 print:text-black mb-2 block flex items-center gap-1"><AlertTriangle size={12}/> Risques Identifiés (Météo, Blocage...)</label>
                                <textarea value={risqueIdentifie} onChange={e => setRisqueIdentifie(e.target.value)} className="w-full h-20 resize-none outline-none text-xs print:bg-transparent" placeholder="Saisir ou laisser vide pour écrire au stylo..." />
                              </div>
                            </div>

                            <div className="mt-8 pt-6 border-t-[3px] border-black grid grid-cols-3 gap-4 text-sm font-bold break-inside-avoid w-full">
                              <div><p className="uppercase mb-12">Chef d'équipe :</p><div className="w-48 border-b border-dotted border-black"></div></div>
                              <div><p className="uppercase mb-2">Signature & Tampon :</p><div className="h-24 w-48 border-2 border-dashed border-gray-300 print:border-gray-500 rounded-lg"></div></div>
                              <div className="text-right">
                                <p className="uppercase mb-6">Validation :</p>
                                <div className="flex justify-end gap-6"><label className="flex items-center gap-2"><Square size={16}/> OK</label><label className="flex items-center gap-2"><Square size={16}/> Réserve</label></div>
                              </div>
                            </div>

                          </div>
                        </td>
                      </tr>
                    </tbody>
                    <tfoot className="print:table-footer-group w-full print-footer">
                      <tr>
                        <td className="pt-4 pb-2 text-center text-[9px] font-bold text-gray-400 uppercase tracking-widest border-t border-gray-200 mt-4">
                          Document généré le {new Date().toLocaleDateString('fr-FR')} - Altrad Services BTP - PZO V10
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                </div>
              )}
            </div>
          </div>
          <div className="space-y-6 print-hidden">
            <div className="bg-[#1e272e] rounded-[35px] p-8 text-white shadow-xl relative overflow-hidden transition-all">
               <AlertTriangle size={150} className="absolute -right-10 -bottom-10 opacity-5" />
               <h3 className="text-xl font-black uppercase italic mb-6 flex items-center gap-2"><AlertCircle className="text-yellow-400" /> Indicateurs Clés</h3>
               {chantierDetails ? (
                   <div className="space-y-4 relative z-10">
                     <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                       <div className="bg-red-500/20 p-2 rounded-lg"><Layers size={20} className="text-red-400" /></div>
                       <div><p className="text-xs font-black uppercase text-red-400">Budget Consommé</p><p className="text-lg font-bold">{chantierDetails.budget_conso || 0}% <span className="text-[10px] opacity-60 font-normal">du global</span></p></div>
                     </div>
                     <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                       <div className="bg-blue-500/20 p-2 rounded-lg"><Calendar size={20} className="text-blue-400" /></div>
                       <div><p className="text-xs font-black uppercase text-blue-400">Date Fin Prévue</p><p className="text-sm font-bold">{chantierDetails.date_fin || 'Non définie'}</p></div>
                     </div>
                   </div>
               ) : <div className="text-center py-10 opacity-50"><p className="text-sm">Sélectionnez un chantier pour voir les KPI en temps réel.</p></div>}
            </div>
            <div className="bg-white rounded-[35px] p-8 shadow-sm border border-gray-100">
               <h3 className="font-black text-gray-700 uppercase text-sm mb-6 flex items-center gap-2"><Layers size={18} /> Avancement Réel</h3>
               {chantierDetails ? (
                   <div className="space-y-4">
                     <div>
                       <div className="flex justify-between text-[10px] font-black uppercase mb-1"><span>Production</span><span>{chantierDetails.avancement || 0}%</span></div>
                       <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden"><div className="bg-emerald-500 h-full transition-all duration-1000 ease-out" style={{ width: `${chantierDetails.avancement || 0}%` }} /></div>
                     </div>
                     <p className="text-xs text-gray-400 italic mt-2">Données synchronisées depuis la table 'chantiers'.</p>
                   </div>
               ) : <div className="h-20 flex items-center justify-center text-gray-300 text-xs">En attente de sélection...</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
