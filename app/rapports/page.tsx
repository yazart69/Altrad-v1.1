"use client";

import React, { useState, useEffect, useRef, useMemo, useImperativeHandle, forwardRef } from 'react';
import { FileText, Plus, Calculator, PencilRuler, Save, Trash2, ChevronRight, CheckCircle2, AlertTriangle, Settings, Layers, Pipette, Share2, Wifi, WifiOff, User, Calendar, Briefcase, Ruler, X, AlertCircle, MapPin, Printer, Square, CheckSquare, Clock, Camera, CloudRain, Wind, ThermometerSnowflake, ThermometerSun, Pencil, Undo, Type, Minus, Target, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Dexie, { Table } from 'dexie';

// --- CONFIGURATION DEXIE (OFFLINE STORAGE) ---
class OfflineDB extends Dexie {
  reports!: Table<any>;
  constructor() { 
    super('AltradHSE_Offline'); 
    this.version(1).stores({ reports: '++id, chantier_id, date, status, is_synced' }); 
  }
}
const db = typeof window !== 'undefined' ? new OfflineDB() : null;

const ScientificEngine = {
  calculateSurface: (t: string, d: any) => t === 'rectangle' ? d.L * d.l : t === 'cylindre' ? Math.PI * d.D * d.H : 0,
  calculatePaint: (s: number, m: number, r: number, loss: number = 0) => {
    const base = r ? (s * m) / (r * 10) : 0;
    return base * (1 + loss / 100);
  },
  calculateAbrasive: (s: number, d: string, loss: number = 0) => {
    const base = (s * ({ 'Sa1': 15, 'Sa2': 25, 'Sa2.5': 40, 'Sa3': 55 }[d] || 0)) / 1000;
    return base * (1 + loss / 100);
  },
  calculateDewPoint: (T: number, RH: number) => T - ((100 - RH) / 5)
};

// --- TYPES & DESSIN ---
type Point = { x: number; y: number };
type Stroke = 
  | { type: 'pencil'; path: Point[]; color: string }
  | { type: 'line'; start: Point; end: Point; color: string }
  | { type: 'rect'; start: Point; end: Point; color: string }
  | { type: 'text'; pos: Point; text: string; color: string };

const SketchTool = forwardRef(({ type, dims }: { type: string, dims: any }, ref) => {
  const canvasBaseRef = useRef<HTMLCanvasElement>(null);
  const canvasDrawRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState('#d63031');
  const [tool, setTool] = useState<'pencil'|'line'|'rect'|'text'>('pencil');
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useImperativeHandle(ref, () => ({
    exportImage: () => {
      const c = document.createElement('canvas');
      c.width = 1000; c.height = 500;
      const ctx = c.getContext('2d');
      if (!ctx) return null;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,1000,500);
      if (canvasBaseRef.current) ctx.drawImage(canvasBaseRef.current, 0, 0);
      if (canvasDrawRef.current) ctx.drawImage(canvasDrawRef.current, 0, 0);
      return c.toDataURL('image/png');
    },
    clearStrokes: () => setStrokes([])
  }));

  useEffect(() => {
    const renderBase = async () => {
      if (!canvasBaseRef.current) return;
      const rough = (await import('roughjs')).default;
      const canvas = canvasBaseRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0,0, 1000, 500);
      const rc = rough.canvas(canvas);
      if (type === 'rectangle') {
        const scale = Math.min(600 / (dims.L || 1), 300 / (dims.l || 1));
        const w = (dims.L || 1) * scale, h = (dims.l || 1) * scale;
        const x = (1000 - w) / 2, y = (500 - h) / 2;
        rc.rectangle(x, y, w, h, { roughness: 1.5, stroke: '#2d3436', strokeWidth: 3, fill: 'rgba(9, 132, 227, 0.05)' });
        ctx.font = 'bold 24px sans-serif'; ctx.fillStyle = '#0984e3'; ctx.textAlign = 'center';
        ctx.fillText(`${dims.L}m`, x + w / 2, y - 20);
        ctx.fillStyle = '#d63031'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(`${dims.l}m`, x - 20, y + h / 2);
      } else {
        const scale = Math.min(300 / (dims.D || 1), 300 / (dims.H || 1));
        const w = (dims.D || 1) * scale, h = (dims.H || 1) * scale, ex = w * 0.3;
        const x = 500, y = (500 - h) / 2;
        rc.ellipse(x, y, w, ex, { roughness: 1.5, stroke: '#2d3436', strokeWidth: 3 });
        rc.line(x - w/2, y, x - w/2, y + h, { stroke: '#2d3436', strokeWidth: 3 });
        rc.line(x + w/2, y, x + w/2, y + h, { stroke: '#2d3436', strokeWidth: 3 });
        rc.ellipse(x, y + h, w, ex, { roughness: 1.5, stroke: '#2d3436', strokeWidth: 3 });
        ctx.font = 'bold 24px sans-serif'; ctx.fillStyle = '#0984e3'; ctx.textAlign = 'center';
        ctx.fillText(`Ø${dims.D}m`, x, y - ex/2 - 20);
        ctx.fillStyle = '#d63031'; ctx.textAlign = 'left'; ctx.fillText(`${dims.H}m`, x + w/2 + 30, y + h/2);
      }
    };
    renderBase();
  }, [type, dims]);

  useEffect(() => {
    const ctx = canvasDrawRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0,0, 1000, 500);
    const drawS = (s: Stroke) => {
      ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = 4; ctx.lineCap = 'round';
      if (s.type === 'pencil') { ctx.beginPath(); ctx.moveTo(s.path[0].x, s.path[0].y); s.path.forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke(); }
      else if (s.type === 'line') { ctx.beginPath(); ctx.moveTo(s.start.x, s.start.y); ctx.lineTo(s.end.x, s.end.y); ctx.stroke(); }
      else if (s.type === 'rect') ctx.strokeRect(s.start.x, s.start.y, s.end.x - s.start.x, s.end.y - s.start.y);
      else if (s.type === 'text') { ctx.font = 'bold 24px sans-serif'; ctx.fillText(s.text, s.pos.x, s.pos.y); }
    };
    strokes.forEach(drawS);
    if (currentStroke) drawS(currentStroke);
  }, [strokes, currentStroke]);

  const getCoords = (e: any) => {
    const rect = canvasDrawRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * (1000 / rect.width), y: (clientY - rect.top) * (500 / rect.height) };
  };

  return (
    <div className="relative w-full aspect-[21/9] bg-white rounded-3xl border-2 border-gray-100 shadow-sm overflow-hidden group print:border-black">
      <canvas ref={canvasBaseRef} width={1000} height={500} className="absolute inset-0 w-full h-full pointer-events-none z-0" />
      <canvas ref={canvasDrawRef} width={1000} height={500} className="absolute inset-0 w-full h-full touch-none z-10 cursor-crosshair"
        onPointerDown={(e) => {
          const pos = getCoords(e); if (!pos) return;
          if (tool === 'text') { const t = window.prompt("Texte :"); if(t) setStrokes([...strokes, {type:'text', pos, text:t, color}]); return; }
          setIsDrawing(true);
          if (tool === 'pencil') setCurrentStroke({type:'pencil', path:[pos], color});
          else if (tool === 'line') setCurrentStroke({type:'line', start:pos, end:pos, color});
          else if (tool === 'rect') setCurrentStroke({type:'rect', start:pos, end:pos, color});
        }}
        onPointerMove={(e) => {
          if (!isDrawing || !currentStroke) return;
          const pos = getCoords(e); if (!pos) return;
          if (currentStroke.type === 'pencil') setCurrentStroke({...currentStroke, path:[...currentStroke.path, pos]});
          else if (currentStroke.type === 'line' || currentStroke.type === 'rect') setCurrentStroke({...currentStroke, end:pos});
        }}
        onPointerUp={() => { if(isDrawing && currentStroke) setStrokes([...strokes, currentStroke]); setIsDrawing(false); setCurrentStroke(null); }}
      />
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/95 p-2 rounded-2xl shadow-xl z-20 opacity-0 group-hover:opacity-100 transition-opacity print-hidden">
        <button onClick={()=>setTool('pencil')} className={`p-1.5 rounded-lg ${tool==='pencil'?'bg-black text-white':'text-gray-400'}`}><Pencil size={16}/></button>
        <button onClick={()=>setTool('line')} className={`p-1.5 rounded-lg ${tool==='line'?'bg-black text-white':'text-gray-400'}`}><Minus size={16}/></button>
        <button onClick={()=>setTool('rect')} className={`p-1.5 rounded-lg ${tool==='rect'?'bg-black text-white':'text-gray-400'}`}><Square size={16}/></button>
        <button onClick={()=>setTool('text')} className={`p-1.5 rounded-lg ${tool==='text'?'bg-black text-white':'text-gray-400'}`}><Type size={16}/></button>
        <div className="w-px h-4 bg-gray-200 mx-2" />
        {['#d63031', '#0984e3', '#00b894', '#2d3436'].map(c => <button key={c} onClick={()=>setColor(c)} className="w-5 h-5 rounded-full" style={{backgroundColor:c}} />)}
        <button onClick={()=>setStrokes(strokes.slice(0,-1))} className="p-1.5 text-gray-500"><Undo size={16}/></button>
      </div>
    </div>
  );
});

SketchTool.displayName = 'SketchTool';

// --- MAIN PAGE ---
export default function Rapports() {
  // Offline & Sync States
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Layout States
  const [meetingTab, setMeetingTab] = useState<'notes'|'calculs'|'actions'|'recap_hebdo'>('actions');
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [selectedChantier, setSelectedChantier] = useState("");
  const [chantierDetails, setChantierDetails] = useState<any>(null);
  
  // Notes States
  const [notes, setNotes] = useState<any[]>([]);
  const [savedNotes, setSavedNotes] = useState<any[]>([]);
  const [activeNote, setActiveNote] = useState("");
  const [noteCategory, setNoteCategory] = useState("Technique");
  const [noteSeverity, setNoteSeverity] = useState("Info");
  const [noteWeather, setNoteWeather] = useState<string[]>([]);
  const [notePhoto, setNotePhoto] = useState<string|null>(null);
  const [expandedPhoto, setExpandedPhoto] = useState<string|null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editNoteText, setEditNoteText] = useState("");
  const [selectedPrintNotes, setSelectedPrintNotes] = useState<number[]>([]);

  // Calculs States
  const [metreHistory, setMetreHistory] = useState<any[]>([]);
  const [calcForm, setCalcForm] = useState({ type: 'rectangle', L: 10, l: 5, D: 2, H: 5, microns: 200, rendement: 5, degree: 'Sa2.5', pertes: 20, name: '' });
  const [dewPointForm, setDewPointForm] = useState({ T_amb: 20, RH: 65, T_acier: 18 });
  const [showAbrasive, setShowAbrasive] = useState(true);
  const [showDewPoint, setShowDewPoint] = useState(true);
  const sketchRef = useRef<any>(null);

  // Actions States
  const [actionsList, setActionsList] = useState<any[]>([]);
  const [actionForm, setActionForm] = useState({ titre: '', responsable: '', delai: '' });

  // Common States
  const [printFormat, setPrintFormat] = useState('A4 portrait');
  const [controleLe, setControleLe] = useState(new Date().toISOString().split('T')[0]);

  // --- INITIALIZATION ---
  const updatePendingCount = async () => { if (db) setPendingSyncCount(await db.reports.count()); };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      window.addEventListener('online', () => { setIsOnline(true); sync(); });
      window.addEventListener('offline', () => setIsOnline(false));
      supabase.from('chantiers').select('id, nom').order('nom').then(({data}) => data && setChantiers(data));
      updatePendingCount();
    }
  }, []);

  const loadDetails = async () => {
    if (!selectedChantier) { setChantierDetails(null); setSavedNotes([]); setActionsList([]); setMetreHistory([]); return; }
    const { data: c } = await supabase.from('chantiers').select('*').eq('id', selectedChantier).single();
    setChantierDetails(c);
    const { data: r } = await supabase.from('reunions').select('id, notes, actions, calculs').eq('chantier_id', selectedChantier).order('date', { ascending: false });
    if (r) {
      setSavedNotes(r.flatMap(re => (re.notes || []).map((n:any) => ({...n, reunion_id: re.id}))));
      setActionsList(r.flatMap(re => (re.actions || []).map((a:any) => ({...a, reunion_id: re.id}))));
      setMetreHistory(r.flatMap(re => (re.calculs || [])));
    }
  };

  useEffect(() => { loadDetails(); }, [selectedChantier]);

  // --- HANDLERS ---
  const handlePhoto = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNotePhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const sync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
        const pending = await db?.reports.toArray() || [];
        for (const report of pending) {
            // Upload images to Supabase Storage if they are Base64
            const finalNotes = await Promise.all((report.notes || []).map(async (n:any) => {
                if (n.photo?.startsWith('data:image')) {
                    const res = await fetch(n.photo);
                    const blob = await res.blob();
                    const path = `notes/${report.chantier_id}_${Date.now()}.png`;
                    const { error } = await supabase.storage.from('chantier_media').upload(path, blob);
                    if (!error) {
                        const { data } = supabase.storage.from('chantier_media').getPublicUrl(path);
                        n.photo = data.publicUrl;
                    }
                }
                return n;
            }));

            const { error } = await supabase.from('reunions').insert([{
                chantier_id: report.chantier_id,
                date: report.date,
                notes: finalNotes,
                actions: report.actions,
                calculs: report.calculs,
                metriques_techniques: report.metriques_techniques
            }]);
            if (!error) await db?.reports.delete(report.id);
        }
        await updatePendingCount(); 
        loadDetails();
    } catch (e) { console.error(e); }
    setIsSyncing(false);
  };

  const save = async () => {
    if (!selectedChantier) return alert("Sélectionnez un chantier.");
    const report = {
      chantier_id: selectedChantier,
      date: new Date().toISOString(),
      notes,
      actions: actionsList.filter(a => a.isNew).map(({isNew, ...rest}) => rest),
      calculs: metreHistory,
      metriques_techniques: { surface: totalMetre.surface, paint: totalMetre.paint }
    };
    if (db) await db.reports.add(report);
    setNotes([]); setMetreHistory([]); updatePendingCount();
    if (isOnline) sync();
  };

  const handleUpdateNote = async (reunionId: string, noteId: number) => {
    if (!reunionId || reunionId === 'local') return;
    const { data } = await supabase.from('reunions').select('notes').eq('id', reunionId).single();
    if (data) {
        const updated = data.notes.map((n:any) => n.id === noteId ? {...n, text: editNoteText} : n);
        await supabase.from('reunions').update({ notes: updated }).eq('id', reunionId);
        setSavedNotes(savedNotes.map(n => n.id === noteId ? {...n, text: editNoteText} : n));
    }
    setEditingNoteId(null);
  };

  const handleDeleteNote = async (reunionId: string, noteId: number) => {
    if (!reunionId || !window.confirm("Supprimer ?")) return;
    const { data } = await supabase.from('reunions').select('notes').eq('id', reunionId).single();
    if (data) {
        const updated = data.notes.filter((n:any) => n.id !== noteId);
        await supabase.from('reunions').update({ notes: updated }).eq('id', reunionId);
        setSavedNotes(savedNotes.filter(n => n.id !== noteId));
    }
  };

  const totalMetre = metreHistory.reduce((acc, curr) => ({
    surface: acc.surface + curr.surface, paint: acc.paint + curr.paint
  }), { surface: 0, paint: 0 });

  const periodStr = useMemo(() => {
    const d = new Date(controleLe);
    return `Semaine du ${d.toLocaleDateString()}`;
  }, [controleLe]);

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-4 md:p-8">
      <style>{`
        @media print { 
          @page { size: ${printFormat}; margin: 15mm; } 
          * { overflow: visible !important; }
          html, body { height: auto !important; background: #fff !important; } 
          .print-document { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; } 
          .print-hidden { display: none !important; } 
        }
      `}</style>

      {/* --- HEADER --- */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-[30px] shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 print-hidden">
          <div className="flex items-center gap-4">
            <div className="bg-black p-3 rounded-2xl text-white"><FileText size={28} /></div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight">Réunion Chantier</h1>
              <div className="flex items-center gap-2 text-[10px] font-bold">
                {isOnline ? <span className="text-emerald-500">● CONNECTÉ</span> : <span className="text-red-500">● HORS-LIGNE</span>}
                {pendingSyncCount > 0 && <button onClick={sync} className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-orange-200 transition-colors">
                    <RefreshCw size={10} className={isSyncing?'animate-spin':''}/> SYNC ({pendingSyncCount})
                </button>}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <select value={selectedChantier} onChange={(e)=>setSelectedChantier(e.target.value)} className="bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold outline-none border-none">
              <option value="">Sélectionner Chantier</option>
              {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            <button onClick={save} className="bg-black text-white px-6 py-3 rounded-xl font-black text-xs uppercase shadow-lg shadow-black/10 hover:scale-105 transition-all">ENREGISTRER</button>
          </div>
        </div>

        {/* --- MAIN TABS --- */}
        <div className="bg-white rounded-[35px] p-8 shadow-sm border border-gray-100 min-h-[600px] flex flex-col">
          <div className="flex items-center gap-2 mb-8 bg-gray-50 p-2 rounded-2xl self-start print-hidden">
            {['notes', 'calculs', 'actions', 'recap_hebdo'].map((t: any) => (
              <button key={t} onClick={() => setMeetingTab(t)} className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${meetingTab === t ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}>
                {t === 'recap_hebdo' ? 'Récap Hebdo' : t}
              </button>
            ))}
          </div>

          {meetingTab === 'actions' && (
            <div className="flex-1 animate-in fade-in space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-2xl print-hidden">
                    <input type="text" placeholder="Action..." value={actionForm.titre} onChange={e=>setActionForm({...actionForm, titre:e.target.value})} className="md:col-span-2 p-3 rounded-xl border-none font-bold text-sm" />
                    <input type="text" placeholder="Qui ?" value={actionForm.responsable} onChange={e=>setActionForm({...actionForm, responsable:e.target.value})} className="p-3 rounded-xl border-none font-bold text-sm" />
                    <button onClick={()=>{ if(actionForm.titre) setActionsList([{id:Date.now(), ...actionForm, statut:'À faire', isNew:true}, ...actionsList]); setActionForm({titre:'', responsable:'', delai:''}); }} className="bg-black text-white rounded-xl font-black text-xs uppercase">AJOUTER</button>
                </div>
                <div className="space-y-2">
                    {actionsList.map(a => (
                        <div key={a.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl bg-white shadow-sm hover:border-black transition-all">
                            <div><p className="font-bold text-gray-800">{a.titre}</p><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{a.responsable}</p></div>
                            <div className="flex items-center gap-4">
                                <button onClick={()=>{
                                    const next = a.statut === 'À faire' ? 'En cours' : a.statut === 'En cours' ? 'Fait' : 'À faire';
                                    setActionsList(actionsList.map(x=>x.id===a.id?{...x, statut:next, isModified:!a.isNew}:x));
                                }} className={`text-[10px] font-black px-4 py-1.5 rounded-full border transition-all ${a.statut==='Fait'?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                    {a.statut}
                                </button>
                                <button onClick={()=>setActionsList(actionsList.filter(x=>x.id!==a.id))} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}

          {meetingTab === 'notes' && (
            <div className="flex-1 animate-in fade-in space-y-6">
                <div className="bg-gray-50 p-6 rounded-2xl space-y-4 print-hidden border border-gray-100 shadow-inner">
                    <textarea value={activeNote} onChange={e=>setActiveNote(e.target.value)} className="w-full p-4 rounded-xl border-none h-28 font-medium text-gray-700 focus:ring-2 focus:ring-black transition-all" placeholder="Constat terrain, alerte ou observation..." />
                    <div className="flex justify-between items-center">
                        <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-xl border text-xs font-bold text-gray-500 hover:text-black">
                            <Camera size={14}/> {notePhoto?'Photo prête':'Prendre Photo'}
                            <input type="file" capture="environment" accept="image/*" className="hidden" onChange={handlePhoto} />
                        </label>
                        <button onClick={() => { if(activeNote || notePhoto) setNotes([{id:Date.now(), text:activeNote, photo:notePhoto, timestamp:new Date().toISOString(), severity:noteSeverity}, ...notes]); setActiveNote(""); setNotePhoto(null); }} className="bg-black text-white px-8 py-2 rounded-xl font-black text-xs uppercase">Ajouter au rapport</button>
                    </div>
                </div>
                <div className="space-y-4">
                    {notes.map(n => (
                        <div key={n.id} className="p-5 border border-gray-200 bg-white rounded-2xl shadow-sm relative group flex gap-4">
                            <div className="w-1 h-12 bg-black rounded-full" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-700 leading-relaxed">{n.text}</p>
                                {n.photo && <img src={n.photo} className="mt-3 rounded-xl max-h-48 object-cover cursor-zoom-in border border-gray-100" onClick={()=>setExpandedPhoto(n.photo)} />}
                            </div>
                            <button onClick={()=>setNotes(notes.filter(x=>x.id!==n.id))} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"><X size={18}/></button>
                        </div>
                    ))}
                    {savedNotes.map(n => (
                        <div key={n.id} className="p-5 border border-gray-100 bg-gray-50/50 rounded-2xl opacity-70 flex gap-4">
                            <div className="w-1 h-12 bg-gray-300 rounded-full" />
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{new Date(n.timestamp).toLocaleDateString('fr-FR')}</span>
                                    <button onClick={()=>handleDeleteNote(n.reunion_id, n.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14}/></button>
                                </div>
                                <p className="text-sm text-gray-600">{n.text}</p>
                                {n.photo && <img src={n.photo} className="mt-2 rounded-xl max-h-32 object-cover border border-gray-200" onClick={()=>setExpandedPhoto(n.photo)} />}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}

          {meetingTab === 'calculs' && (
            <div className="flex-1 animate-in fade-in space-y-8">
              <SketchTool ref={sketchRef} type={calcForm.type} dims={calcForm} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-100">
                <div className="space-y-4">
                  <div className="flex gap-2 bg-gray-50 p-1 rounded-xl">
                    <button onClick={()=>setCalcForm({...calcForm, type:'rectangle'})} className={`flex-1 p-3 rounded-lg text-[10px] font-black transition-all ${calcForm.type==='rectangle'?'bg-white text-black shadow-sm':'text-gray-400'}`}>RECTANGLE</button>
                    <button onClick={()=>setCalcForm({...calcForm, type:'cylindre'})} className={`flex-1 p-3 rounded-lg text-[10px] font-black transition-all ${calcForm.type==='cylindre'?'bg-white text-black shadow-sm':'text-gray-400'}`}>CYLINDRE</button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Largeur / Ø</label>
                        <input type="number" value={calcForm.type==='rectangle'?calcForm.L:calcForm.D} onChange={e=>setCalcForm({...calcForm, [calcForm.type==='rectangle'?'L':'D']: parseFloat(e.target.value)})} className="w-full p-3 border border-gray-200 rounded-xl font-bold bg-gray-50 focus:bg-white" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Longueur / H</label>
                        <input type="number" value={calcForm.type==='rectangle'?calcForm.l:calcForm.H} onChange={e=>setCalcForm({...calcForm, [calcForm.type==='rectangle'?'l':'H']: parseFloat(e.target.value)})} className="w-full p-3 border border-gray-200 rounded-xl font-bold bg-gray-50 focus:bg-white" />
                    </div>
                  </div>
                  <button onClick={()=>{
                    const img = sketchRef.current.exportImage();
                    const s = ScientificEngine.calculateSurface(calcForm.type, calcForm);
                    setMetreHistory([{id:Date.now(), name:calcForm.name||'Calcul auto', surface:s, paint:s*0.2, image:img}, ...metreHistory]);
                  }} className="w-full bg-black text-white p-4 rounded-xl font-black text-xs uppercase shadow-xl shadow-black/10 hover:translate-y-[-2px] transition-all active:scale-95">AJOUTER AU CARNET DE MÉTRÉ</button>
                </div>
                <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 flex flex-col">
                  <h3 className="text-[10px] font-black text-blue-400 mb-4 uppercase tracking-widest">Récapitulatif Métré</h3>
                  <div className="space-y-3 flex-1">
                    {metreHistory.map(m => (
                      <div key={m.id} className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-blue-100 shadow-sm animate-in slide-in-from-right">
                        <img src={m.image} className="w-16 h-10 rounded-lg object-cover border border-gray-100" />
                        <div className="flex-1">
                          <p className="text-[11px] font-black text-gray-800">{m.name}</p>
                          <p className="text-[14px] font-black text-blue-600">{m.surface.toFixed(2)} m²</p>
                        </div>
                        <button onClick={()=>setMetreHistory(metreHistory.filter(x=>x.id!==m.id))} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                      </div>
                    ))}
                    {metreHistory.length === 0 && <div className="h-full flex items-center justify-center text-blue-300 text-xs font-bold italic">Carnet vide...</div>}
                  </div>
                  {metreHistory.length > 0 && <div className="mt-4 pt-4 border-t border-blue-100 flex justify-between items-center font-black">
                      <span className="text-blue-400 text-[10px] uppercase">Surface Totale</span>
                      <span className="text-xl text-blue-800">{totalMetre.surface.toFixed(2)} m²</span>
                  </div>}
                </div>
              </div>
            </div>
          )}

          {meetingTab === 'recap_hebdo' && (
            <div className="flex-1 animate-in fade-in space-y-8">
              <div className="flex justify-between items-center border-b-4 border-black pb-4">
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-gray-800">Synthèse Hebdomadaire</h2>
                <button onClick={()=>window.print()} className="bg-black text-white p-3 rounded-2xl shadow-lg hover:scale-110 transition-all print:hidden"><Printer size={24}/></button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600"><CheckCircle size={18}/></div>
                        <h3 className="text-sm font-black uppercase text-gray-400">Actions à suivre</h3>
                    </div>
                    <div className="space-y-3">
                        {actionsList.filter(a=>a.statut!=='Fait').map(a => (
                            <div key={a.id} className="p-4 bg-gray-50 rounded-2xl border-l-4 border-blue-500">
                                <p className="font-bold text-sm">{a.titre}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Responsable : {a.responsable}</p>
                            </div>
                        ))}
                        {actionsList.length === 0 && <p className="text-xs italic text-gray-400">Aucune action en attente...</p>}
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600"><Calculator size={18}/></div>
                        <h3 className="text-sm font-black uppercase text-gray-400">Métriques Chantier</h3>
                    </div>
                    <div className="bg-emerald-50 p-8 rounded-[40px] border border-emerald-100 shadow-inner">
                        <div className="text-6xl font-black text-emerald-800 tracking-tighter">{totalMetre.surface.toFixed(2)}<span className="text-2xl ml-2 opacity-50">m²</span></div>
                        <p className="text-xs font-bold text-emerald-600 uppercase mt-4 tracking-widest">Surface relevée lors de la visite</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <p className="text-[10px] font-black text-gray-400 uppercase">Litres peinture</p>
                            <p className="text-lg font-black text-gray-800">{totalMetre.paint.toFixed(1)} L</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <p className="text-[10px] font-black text-gray-400 uppercase">Nb Éléments</p>
                            <p className="text-lg font-black text-gray-800">{metreHistory.length}</p>
                        </div>
                    </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- LIGHTBOX --- */}
      {expandedPhoto && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 print:hidden animate-in fade-in" onClick={() => setExpandedPhoto(null)}>
            <img src={expandedPhoto} className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl ring-4 ring-white/10" />
            <button className="absolute top-8 right-8 text-white bg-black/50 p-4 rounded-full hover:bg-red-500 transition-all shadow-xl"><X size={32}/></button>
        </div>
      )}
    </div>
  );
}
