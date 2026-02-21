"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FileText, Plus, Calculator, PencilRuler, Save, Trash2, ChevronRight, CheckCircle2, AlertTriangle, Settings, Layers, Pipette, Share2, Wifi, WifiOff, User, Calendar, Briefcase, Ruler, X, AlertCircle, MapPin, Printer, Square, CheckSquare, Clock, Camera, CloudRain, Wind, ThermometerSnowflake, ThermometerSun, Pencil } from 'lucide-react';
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
  const [savedNotes, setSavedNotes] = useState<any[]>([]); 
  
  const [calculs, setCalculs] = useState<any[]>([]);
  const [activeNote, setActiveNote] = useState("");
  const [noteCategory, setNoteCategory] = useState("Technique");
  
  const [noteSeverity, setNoteSeverity] = useState("Info");
  const [noteWeather, setNoteWeather] = useState<string[]>([]);
  const [notePhoto, setNotePhoto] = useState<string | null>(null);

  // States pour les fonctionnalités d'édition et d'impression des notes
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editNoteText, setEditNoteText] = useState("");
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const [selectedPrintNotes, setSelectedPrintNotes] = useState<number[]>([]);

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
      if (!selectedChantier) { setChantierDetails(null); setMateriels([]); setFournitures([]); setLocations([]); setTaches([]); setSavedNotes([]); setSelectedPrintNotes([]); return; }
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

        const { data: rData } = await supabase.from('reunions').select('id, notes').eq('chantier_id', selectedChantier).order('date', { ascending: false });
        if (rData) {
          const allSaved = rData.flatMap((r: any) => (r.notes || []).map((n: any) => ({ ...n, reunion_id: r.id })));
          setSavedNotes(allSaved);
        } else {
          setSavedNotes([]);
        }
      } catch (e) {}
    }
    getDetails();
  }, [selectedChantier]);

  const toggleWeather = (w: string) => {
    if (noteWeather.includes(w)) setNoteWeather(noteWeather.filter(item => item !== w));
    else setNoteWeather([...noteWeather, w]);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setNotePhoto(url);
    }
  };

  const addNote = () => {
    if (!activeNote && !notePhoto) return;
    setNotes([{ 
        id: Date.now(), 
        category: noteCategory, 
        severity: noteSeverity,
        weather: noteWeather,
        text: activeNote, 
        photo: notePhoto,
        type: 'observation', 
        timestamp: new Date().toISOString() 
    }, ...notes]);
    setActiveNote("");
    setNoteSeverity("Info");
    setNoteWeather([]);
    setNotePhoto(null);
  };

  const saveReport = async () => {
    if (!selectedChantier) return alert("Veuillez sélectionner un chantier réel avant d'enregistrer.");
    const report = { chantier_id: selectedChantier, date: new Date().toISOString(), notes, calculs, metriques_techniques: { surface: surfaceCalculated, peinture: paintNeeded, abrasif: sandNeeded }, is_synced: false };
    
    const reportToSave = { ...report };
    if (db) try { await db.reports.add(reportToSave); } catch (e) {}
    
    if (isOnline) {
      try {
        const { data, error } = await supabase.from('reunions').insert([report]).select('id').single();
        if (error) throw error;
        alert("Rapport synchronisé avec la base de données centrale !");
        const savedWithReunionId = notes.map(n => ({...n, reunion_id: data.id}));
        setSavedNotes([...savedWithReunionId, ...savedNotes]);
        setNotes([]);
      } catch (e: any) { alert("Erreur Sync Supabase: " + e.message); }
    } else {
      alert("Rapport enregistré localement (En attente de connexion).");
      setSavedNotes([...notes, ...savedNotes]);
      setNotes([]);
    }
  };

  const handleUpdateNote = async (reunionId: string, noteId: number) => {
    if (!reunionId) return alert("Erreur: ID Réunion manquant.");
    try {
        const { data } = await supabase.from('reunions').select('notes').eq('id', reunionId).single();
        if (data && data.notes) {
            const updatedNotes = data.notes.map((n: any) => n.id === noteId ? { ...n, text: editNoteText } : n);
            const { error } = await supabase.from('reunions').update({ notes: updatedNotes }).eq('id', reunionId);
            if (error) throw error;
            setSavedNotes(savedNotes.map(n => n.id === noteId ? { ...n, text: editNoteText } : n));
        }
    } catch (e) {
        console.error(e);
        alert("Erreur lors de la mise à jour de la note.");
    }
    setEditingNoteId(null);
  };

  const handleDeleteNote = async (reunionId: string, noteId: number) => {
    if (!reunionId) return alert("Erreur: ID Réunion manquant.");
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette note de l'historique ?")) return;
    try {
        const { data } = await supabase.from('reunions').select('notes').eq('id', reunionId).single();
        if (data && data.notes) {
            const updatedNotes = data.notes.filter((n: any) => n.id !== noteId);
            const { error } = await supabase.from('reunions').update({ notes: updatedNotes }).eq('id', reunionId);
            if (error) throw error;
            setSavedNotes(savedNotes.filter(n => n.id !== noteId));
            setSelectedPrintNotes(selectedPrintNotes.filter(id => id !== noteId));
        }
    } catch (e) {
        console.error(e);
        alert("Erreur lors de la suppression de la note.");
    }
  };

  const togglePrintNote = (id: number) => {
    if (selectedPrintNotes.includes(id)) setSelectedPrintNotes(selectedPrintNotes.filter(nId => nId !== id));
    else setSelectedPrintNotes([...selectedPrintNotes, id]);
  };

  const toggleSelectAllPrint = () => {
    if (selectedPrintNotes.length === savedNotes.length) setSelectedPrintNotes([]);
    else setSelectedPrintNotes(savedNotes.map(n => n.id));
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
      <div className="max-w-7xl mx-auto space-y-6 container print:max-w-full print:w-full print:m-0 print:space-y-0">
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

        <div className="w-full main print:block print:w-full print:max-w-full">
          <div className="w-full space-y-6 print:w-full print:max-w-full print:block print:space-y-0">
            <div className={`bg-white rounded-[35px] p-8 shadow-sm border border-gray-100 min-h-[600px] flex flex-col w-full ${meetingTab === 'recap_hebdo' || meetingTab === 'notes' ? 'print:border-none print:shadow-none print:p-0 print:m-0 print:block print:w-full print:max-w-full' : ''}`}>
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
                <div className="flex-1 flex flex-col animate-in fade-in relative w-full print:w-full print:max-w-full">
                  
                  {/* CSS D'IMPRESSION POUR LES NOTES */}
                  <style>{`
                    @media print { 
                      @page { size: ${printFormat}; margin: 15mm; } 
                      html, body, #__next, #root, main, .layout, .dashboard, .content-wrapper, .scroll-container { 
                        height: auto !important; min-height: auto !important; max-height: none !important; 
                        overflow: visible !important; width: 100% !important; background: #fff !important; 
                        margin: 0 !important; padding: 0 !important; display: block !important; position: static !important; 
                      } 
                      .wrapper, .container, .main, .print-reset { 
                        height: auto !important; min-height: auto !important; max-height: none !important; 
                        overflow: visible !important; width: 100% !important; max-width: 100% !important; 
                        display: block !important; margin: 0 !important; padding: 0 !important; 
                        border: none !important; box-shadow: none !important; 
                      } 
                      aside, nav, header, footer:not(.print-footer) { display: none !important; } 
                      .print-hidden { display: none !important; } 
                      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } 
                      table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse; } 
                      .break-inside-avoid { page-break-inside: avoid; break-inside: avoid; margin-bottom: 24px; width: 100%; display: block; } 
                      tr { page-break-inside: avoid; page-break-after: auto; } 
                      thead { display: table-header-group; } 
                      tfoot { display: table-footer-group; } 
                    }
                  `}</style>

                  <div className="print-hidden w-full">
                      <div className="flex flex-col gap-4 mb-8 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <select value={noteCategory} onChange={(e) => setNoteCategory(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-[10px] font-black uppercase text-gray-600 outline-none">
                                    <option>Technique</option><option>Planning</option><option>Budget</option><option>Sécurité</option><option>Matériel</option>
                                </select>
                                <select value={noteSeverity} onChange={(e) => setNoteSeverity(e.target.value)} className={`border rounded-lg px-3 py-2 text-[10px] font-black uppercase outline-none ${noteSeverity === 'BLOQUANT' ? 'bg-red-50 border-red-200 text-red-600' : noteSeverity === 'À surveiller' ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-gray-200 text-gray-600'}`}>
                                    <option>Info</option><option>À surveiller</option><option>BLOQUANT</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200">
                                <button onClick={()=>toggleWeather('Pluie')} className={`p-1.5 rounded-md transition-all ${noteWeather.includes('Pluie') ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-50'}`}><CloudRain size={14}/></button>
                                <button onClick={()=>toggleWeather('Vent')} className={`p-1.5 rounded-md transition-all ${noteWeather.includes('Vent') ? 'bg-gray-200 text-gray-700' : 'text-gray-400 hover:bg-gray-50'}`}><Wind size={14}/></button>
                                <button onClick={()=>toggleWeather('Gel')} className={`p-1.5 rounded-md transition-all ${noteWeather.includes('Gel') ? 'bg-cyan-100 text-cyan-600' : 'text-gray-400 hover:bg-gray-50'}`}><ThermometerSnowflake size={14}/></button>
                                <button onClick={()=>toggleWeather('Canicule')} className={`p-1.5 rounded-md transition-all ${noteWeather.includes('Canicule') ? 'bg-orange-100 text-orange-500' : 'text-gray-400 hover:bg-gray-50'}`}><ThermometerSun size={14}/></button>
                            </div>
                        </div>
                        
                        <div className="relative">
                          <textarea value={activeNote} onChange={(e) => setActiveNote(e.target.value)} placeholder={selectedChantier ? "Constat terrain, alerte ou observation..." : "Sélectionnez un chantier pour commencer..."} disabled={!selectedChantier} className="w-full bg-white border border-gray-200 focus:border-black rounded-xl p-4 font-medium text-gray-700 outline-none transition-all h-24 resize-none disabled:opacity-50 disabled:cursor-not-allowed" />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <label className="cursor-pointer bg-white border border-gray-200 p-2 rounded-lg text-gray-500 hover:text-black hover:border-gray-400 transition-all flex items-center gap-2 text-[10px] font-bold uppercase">
                                    <Camera size={14} /> {notePhoto ? 'Photo ajoutée' : 'Ajouter Photo'}
                                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                                </label>
                                {notePhoto && <img src={notePhoto} onClick={() => setExpandedPhoto(notePhoto)} alt="preview" className="h-8 w-8 object-cover rounded-md border border-gray-200 cursor-zoom-in" />}
                            </div>
                            <button onClick={addNote} disabled={!selectedChantier || (!activeNote && !notePhoto)} className="bg-black text-white px-4 py-2 rounded-lg text-xs font-black uppercase flex items-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-50"><Plus size={16} /> Créer Note</button>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {notes.length > 0 && (
                          <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase text-gray-400 mb-2 border-b pb-2">Brouillon (Non enregistré)</h3>
                            {notes.map((n) => (
                              <div key={n.id} className={`group bg-white border p-5 rounded-2xl hover:shadow-md transition-all flex items-start gap-4 ${n.severity === 'BLOQUANT' ? 'border-red-200 bg-red-50/30' : 'border-gray-100'}`}>
                                <div className={`w-1 h-full min-h-[40px] rounded-full ${n.severity === 'BLOQUANT' ? 'bg-red-500' : n.severity === 'À surveiller' ? 'bg-orange-400' : 'bg-blue-500'}`} />
                                <div className="flex-1">
                                  <div className="flex flex-wrap justify-between items-center mb-2 gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${n.severity === 'BLOQUANT' ? 'bg-red-100 text-red-600' : n.severity === 'À surveiller' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                                            {n.severity === 'BLOQUANT' && <AlertTriangle size={10} className="inline mr-1"/>}
                                            {n.severity}
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><Layers size={10}/> {n.category}</span>
                                        {n.weather && n.weather.length > 0 && (
                                            <span className="text-[10px] font-bold text-blue-400 flex items-center gap-1 border-l pl-2 ml-1"><CloudRain size={10}/> {n.weather.join(', ')}</span>
                                        )}
                                    </div>
                                    <span className="text-[9px] font-bold text-gray-400">{new Date(n.timestamp).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</span>
                                  </div>
                                  <p className={`font-medium leading-relaxed text-sm ${n.severity === 'BLOQUANT' ? 'text-red-900 font-bold' : 'text-gray-700'}`}>{n.text}</p>
                                  {n.photo && (
                                      <div className="mt-3">
                                          <img src={n.photo} onClick={() => setExpandedPhoto(n.photo)} alt="Note attachment" className="max-h-32 rounded-lg border border-gray-200 object-cover cursor-zoom-in" />
                                      </div>
                                  )}
                                </div>
                                <button onClick={() => setNotes(notes.filter(item => item.id !== n.id))} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                              </div>
                            ))}
                          </div>
                        )}

                        {(savedNotes.length > 0) && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between border-b pb-2 mt-8 mb-4">
                              <h3 className="text-xs font-black uppercase text-gray-400">Historique des notes</h3>
                              <div className="flex items-center gap-4">
                                <button onClick={toggleSelectAllPrint} className="text-xs font-bold text-gray-500 hover:text-black transition-colors">{selectedPrintNotes.length === savedNotes.length ? 'Tout désélectionner' : 'Tout sélectionner'}</button>
                                <div className="flex items-center gap-2">
                                  <select value={printFormat} onChange={e => setPrintFormat(e.target.value)} className="bg-white border border-gray-200 rounded-md px-2 py-1 text-[10px] font-bold outline-none">
                                    <option value="A4 portrait">A4 Portrait</option><option value="A4 landscape">A4 Paysage</option><option value="A3 portrait">A3 Portrait</option><option value="A3 landscape">A3 Paysage</option>
                                  </select>
                                  <button onClick={() => { if(selectedPrintNotes.length===0) alert("Sélectionnez au moins une note."); else window.print(); }} className="bg-black text-white px-3 py-1.5 rounded-md text-[10px] font-black uppercase flex items-center gap-2 hover:bg-gray-800 transition-all shadow-sm"><Printer size={12} /> Imprimer ({selectedPrintNotes.length})</button>
                                </div>
                              </div>
                            </div>
                            
                            {savedNotes.map((n, i) => (
                              <div key={n.id || i} className={`bg-white border p-5 rounded-2xl flex items-start gap-4 transition-all ${selectedPrintNotes.includes(n.id) ? 'ring-2 ring-black border-transparent' : 'border-gray-100'} ${n.severity === 'BLOQUANT' ? 'bg-red-50/20' : ''}`}>
                                <div onClick={() => togglePrintNote(n.id)} className="cursor-pointer mt-1">
                                  {selectedPrintNotes.includes(n.id) ? <CheckSquare size={18} className="text-black" /> : <Square size={18} className="text-gray-300" />}
                                </div>
                                <div className={`w-1 h-full min-h-[40px] rounded-full ${n.severity === 'BLOQUANT' ? 'bg-red-500' : n.severity === 'À surveiller' ? 'bg-orange-400' : 'bg-blue-500'}`} />
                                <div className="flex-1">
                                  <div className="flex flex-wrap justify-between items-center mb-2 gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${n.severity === 'BLOQUANT' ? 'bg-red-100 text-red-600' : n.severity === 'À surveiller' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                                            {n.severity === 'BLOQUANT' && <AlertTriangle size={10} className="inline mr-1"/>}
                                            {n.severity || 'INFO'}
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><Layers size={10}/> {n.category}</span>
                                        {n.weather && n.weather.length > 0 && (
                                            <span className="text-[10px] font-bold text-blue-400 flex items-center gap-1 border-l pl-2 ml-1"><CloudRain size={10}/> {n.weather.join(', ')}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-[9px] font-bold text-gray-400">{new Date(n.timestamp).toLocaleDateString('fr-FR')} {new Date(n.timestamp).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</span>
                                      <div className="flex gap-2">
                                        <button onClick={() => { setEditingNoteId(n.id); setEditNoteText(n.text); }} className="text-gray-300 hover:text-blue-500 transition-colors"><Pencil size={14}/></button>
                                        <button onClick={() => handleDeleteNote(n.reunion_id, n.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {editingNoteId === n.id ? (
                                    <div className="mt-2 flex flex-col gap-2">
                                      <textarea value={editNoteText} onChange={(e) => setEditNoteText(e.target.value)} className="w-full bg-gray-50 border border-gray-200 focus:border-blue-400 rounded-lg p-3 text-sm text-gray-700 outline-none h-20 resize-none" />
                                      <div className="flex justify-end gap-2">
                                        <button onClick={() => setEditingNoteId(null)} className="px-3 py-1.5 rounded-md text-[10px] font-bold text-gray-500 hover:bg-gray-100 uppercase">Annuler</button>
                                        <button onClick={() => handleUpdateNote(n.reunion_id, n.id)} className="px-3 py-1.5 rounded-md text-[10px] font-bold bg-black text-white hover:bg-gray-800 uppercase">Enregistrer</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className={`font-medium leading-relaxed text-sm ${n.severity === 'BLOQUANT' ? 'text-red-900 font-bold' : 'text-gray-700'}`}>{n.text}</p>
                                  )}

                                  {n.photo && (
                                      <div className="mt-3">
                                          <img src={n.photo} onClick={() => setExpandedPhoto(n.photo)} alt="Note attachment" className="max-h-32 rounded-lg border border-gray-200 object-cover cursor-zoom-in opacity-90 hover:opacity-100 transition-opacity" />
                                      </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {notes.length === 0 && savedNotes.length === 0 && <p className="text-center text-gray-300 text-sm italic mt-10">Aucune note pour le moment.</p>}
                      </div>
                  </div>

                  {/* VUE IMPRESSION DES NOTES */}
                  <table className="hidden print:table w-full bg-white print:p-0 print:border-none text-black text-xs md:text-sm print-reset">
                    <thead className="print:table-header-group w-full">
                      <tr>
                        <td className="pb-4 border-b-[3px] border-black mb-6 w-full align-bottom">
                          <div className="flex justify-between items-end w-full">
                            <div>
                              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight">Journal des Notes & Constats</h2>
                              <div className="text-sm font-bold text-gray-600 uppercase mt-2 flex flex-col gap-1">
                                <div>Chantier : <span className="text-black">{chantierDetails?.nom || 'NON SÉLECTIONNÉ'}</span></div>
                                <div>N° OTP : <span className="text-black">{chantierDetails?.numero_otp || 'Non défini'}</span></div>
                              </div>
                            </div>
                            <div className="text-right text-xs font-medium print:bg-transparent p-3 rounded-lg print:border-black">
                              <p className="mb-1 uppercase font-bold print:text-black">Édité le :</p>
                              <p className="font-bold print:text-black text-sm">{new Date().toLocaleDateString('fr-FR')}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </thead>
                    <tbody className="w-full">
                      <tr>
                        <td className="pt-6 w-full">
                          <div className="grid grid-cols-1 gap-6 w-full">
                            {savedNotes.filter(n => selectedPrintNotes.includes(n.id)).map((n) => (
                              <div key={n.id} className="break-inside-avoid w-full border border-gray-300 rounded-xl p-4">
                                <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-3">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${n.severity === 'BLOQUANT' ? 'border-red-500 text-red-600' : n.severity === 'À surveiller' ? 'border-orange-500 text-orange-600' : 'border-gray-500 text-gray-600'}`}>
                                      {n.severity === 'BLOQUANT' && <AlertTriangle size={10} className="inline mr-1"/>}
                                      {n.severity || 'INFO'}
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-500 border-l border-gray-300 pl-2">{n.category}</span>
                                    {n.weather && n.weather.length > 0 && <span className="text-[10px] font-bold text-gray-500 border-l border-gray-300 pl-2 flex items-center gap-1"><CloudRain size={10}/> {n.weather.join(', ')}</span>}
                                  </div>
                                  <span className="text-[10px] font-bold text-gray-500">{new Date(n.timestamp).toLocaleDateString('fr-FR')} {new Date(n.timestamp).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                                <p className={`font-medium leading-relaxed text-sm ${n.severity === 'BLOQUANT' ? 'text-black font-black' : 'text-gray-800'}`}>{n.text}</p>
                                {n.photo && (
                                  <div className="mt-4 break-inside-avoid">
                                    <img src={n.photo} alt="Photo Note" className="max-h-48 rounded-lg border border-gray-300 object-contain" />
                                  </div>
                                )}
                              </div>
                            ))}
                            {selectedPrintNotes.length === 0 && <p className="text-center text-gray-400 italic py-10">Aucune note sélectionnée pour l'impression.</p>}
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
                <div className="flex-1 animate-in fade-in relative w-full print:w-full print:max-w-full">
                  <style>{`
                    @media print { 
                      @page { size: ${printFormat}; margin: 15mm; } 
                      html, body, #__next, #root, main, .layout, .dashboard, .content-wrapper, .scroll-container { 
                        height: auto !important; min-height: auto !important; max-height: none !important; 
                        overflow: visible !important; width: 100% !important; background: #fff !important; 
                        margin: 0 !important; padding: 0 !important; display: block !important; position: static !important; 
                      } 
                      .wrapper, .container, .main, .print-reset { 
                        height: auto !important; min-height: auto !important; max-height: none !important; 
                        overflow: visible !important; width: 100% !important; max-width: 100% !important; 
                        display: block !important; margin: 0 !important; padding: 0 !important; 
                        border: none !important; box-shadow: none !important; 
                      } 
                      aside, nav, header, footer:not(.print-footer) { display: none !important; } 
                      .print-hidden { display: none !important; } 
                      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } 
                      table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse; } 
                      th, td { overflow: hidden; word-wrap: break-word; } 
                      .break-inside-avoid { page-break-inside: avoid; break-inside: avoid; margin-bottom: 24px; width: 100%; display: block; } 
                      tr { page-break-inside: avoid; page-break-after: auto; } 
                      thead { display: table-header-group; } 
                      tfoot { display: table-footer-group; } 
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
                                    <th className="py-2 px-1 w-[35%]">Tâche / Sous-tâche</th><th className="py-2 px-1 text-center w-[15%]">Responsable</th><th className="py-2 px-1 text-center w-[10%]">Effectif</th><th className="py-2 px-1 text-center w-[10%]">Hrs Prév.</th><th className="py-2 px-1 text-center w-[10%]">Hrs Réel.</th><th className="py-2 px-1 text-center w-[10%]">% Avanc.</th><th className="py-2 px-1 text-center w-[10%]">Fait</th>
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
                                    <th className="py-2 px-1 w-[35%]">Désignation</th><th className="py-2 px-1 text-center w-[13%]">Qté Prévue</th><th className="py-2 px-1 text-center w-[13%]">Qté Utilisée</th><th className="py-2 px-1 text-center w-[13%]">Qté Dispo</th><th className="py-2 px-1 text-center w-[13%]">Dispo OK</th><th className="py-2 px-1 text-center w-[13%]">Commandé</th>
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
                                  }) : <tr><td colSpan={6} className="py-4 text-center text-gray-400 italic">Aucune fourniture listée...</td></tr>}
                                </tbody>
                              </table>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 break-inside-avoid w-full">
                              <div>
                                <h3 className="text-xs font-black uppercase bg-gray-100 print:bg-gray-200 p-2 mb-3 border-l-4 border-black">3. Matériels sur Chantier</h3>
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="border-b-2 border-gray-300">
                                      <th className="py-2 px-1 w-[55%]">Désignation</th><th className="py-2 px-1 text-center w-[15%]">Présent</th><th className="py-2 px-1 text-center w-[15%]">Manquant</th><th className="py-2 px-1 text-center w-[15%]">En Panne</th>
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
                                    <tr className="border-b-2 border-gray-300"><th className="py-2 px-1 w-[50%]">Machine</th><th className="py-2 px-1 text-center w-[25%]">Fin prévue</th><th className="py-2 px-1 text-center w-[25%]">Retour OK</th></tr>
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
        </div>
      </div>
      
      {/* Lightbox / Modal pour agrandir la photo */}
      {expandedPhoto && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 print-hidden" onClick={() => setExpandedPhoto(null)}>
            <img src={expandedPhoto} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
            <button className="absolute top-6 right-6 text-white hover:text-red-500 transition-colors bg-black/50 p-2 rounded-full"><X size={32}/></button>
        </div>
      )}
    </div>
  );
}
