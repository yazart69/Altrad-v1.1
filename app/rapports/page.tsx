"use client";

import React, { useState, useEffect, useRef, useMemo, useImperativeHandle, forwardRef } from 'react';
import { FileText, Plus, Calculator, PencilRuler, Save, Trash2, ChevronRight, CheckCircle2, AlertTriangle, Settings, Layers, Pipette, Share2, Wifi, WifiOff, User, Calendar, Briefcase, Ruler, X, AlertCircle, MapPin, Printer, Square, CheckSquare, Clock, Camera, CloudRain, Wind, ThermometerSnowflake, ThermometerSun, Pencil, Undo, Type, Minus, Target, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Dexie, { Table } from 'dexie';

class OfflineDB extends Dexie {
  reports!: Table<any>;
  constructor() { super('AltradHSE_Offline'); this.version(1).stores({ reports: '++id, chantier_id, date, status, is_synced' }); }
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
  calculateDewPoint: (T: number, RH: number) => {
    return T - ((100 - RH) / 5);
  }
};

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
    let isMounted = true;
    const renderBase = async () => {
      if (!canvasBaseRef.current || typeof window === 'undefined') return;
      try {
        const rough = (await import('roughjs')).default;
        if (!isMounted || !canvasBaseRef.current) return;
        
        const canvas = canvasBaseRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0,0, 1000, 500);
        
        const rc = rough.canvas(canvas);
        const VW = 1000; const VH = 500;
        
        if (type === 'rectangle') {
          const L = Math.max(dims.L || 1, 1);
          const l = Math.max(dims.l || 1, 1);
          const scale = Math.min(600 / L, 300 / l);
          const w = L * scale; const h = l * scale;
          const x = (VW - w) / 2; const y = (VH - h) / 2;

          rc.rectangle(x, y, w, h, { roughness: 1.5, stroke: '#2d3436', strokeWidth: 3, fill: 'rgba(9, 132, 227, 0.05)' });
          
          ctx.font = 'bold 24px sans-serif'; ctx.fillStyle = '#0984e3'; ctx.textAlign = 'center';
          ctx.fillText(`${dims.L}m`, x + w / 2, y - 20);
          
          ctx.fillStyle = '#d63031'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
          ctx.fillText(`${dims.l}m`, x - 20, y + h / 2);

        } else if (type === 'cylindre') {
          const D = Math.max(dims.D || 1, 1);
          const H = Math.max(dims.H || 1, 1);
          const scale = Math.min(300 / D, 300 / H);
          const w = D * scale; const h = H * scale;
          const ellipseH = w * 0.3;
          const x = VW / 2; const y = (VH - h) / 2;

          rc.ellipse(x, y, w, ellipseH, { roughness: 1.5, stroke: '#2d3436', strokeWidth: 3, fill: 'rgba(9, 132, 227, 0.05)' });
          rc.line(x - w/2, y, x - w/2, y + h, { stroke: '#2d3436', strokeWidth: 3 });
          rc.line(x + w/2, y, x + w/2, y + h, { stroke: '#2d3436', strokeWidth: 3 });
          rc.ellipse(x, y + h, w, ellipseH, { roughness: 1.5, stroke: '#2d3436', strokeWidth: 3, fill: 'rgba(9, 132, 227, 0.05)' });
          
          ctx.font = 'bold 24px sans-serif'; 
          ctx.fillStyle = '#0984e3'; 
          ctx.textAlign = 'center'; 
          ctx.textBaseline = 'alphabetic';
          ctx.fillText(`Ø${dims.D}m`, x, y - ellipseH/2 - 20);
          
          ctx.fillStyle = '#d63031'; 
          ctx.textAlign = 'left'; 
          ctx.textBaseline = 'middle';
          ctx.fillText(`${dims.H}m`, x + w/2 + 30, y + h / 2);
        }
      } catch (e) {}
    };
    renderBase();
    return () => { isMounted = false; };
  }, [type, dims]);

  useEffect(() => {
    const canvas = canvasDrawRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0,0, 1000, 500);
    
    const drawStroke = (s: Stroke) => {
        ctx.strokeStyle = s.color; ctx.fillStyle = s.color;
        ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        if (s.type === 'pencil' && s.path.length > 0) {
            ctx.beginPath(); ctx.moveTo(s.path[0].x, s.path[0].y);
            s.path.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
        } else if (s.type === 'line') {
            ctx.beginPath(); ctx.moveTo(s.start.x, s.start.y); ctx.lineTo(s.end.x, s.end.y); ctx.stroke();
        } else if (s.type === 'rect') {
            ctx.strokeRect(s.start.x, s.start.y, s.end.x - s.start.x, s.end.y - s.start.y);
        } else if (s.type === 'text') {
            ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
            ctx.fillText(s.text, s.pos.x, s.pos.y);
        }
    };
    
    strokes.forEach(drawStroke);
    if (currentStroke) drawStroke(currentStroke);
    
  }, [strokes, currentStroke]);

  const getCoords = (e: any) => {
    const canvas = canvasDrawRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * (1000 / rect.width), y: (clientY - rect.top) * (500 / rect.height) };
  };

  const handlePointerDown = (e: any) => {
    const pos = getCoords(e);
    if (!pos) return;
    
    if (tool === 'text') {
        const txt = window.prompt("Texte à ajouter sur le plan :");
        if (txt) setStrokes([...strokes, { type: 'text', pos, text: txt, color }]);
        return;
    }
    
    setIsDrawing(true);
    if (tool === 'pencil') setCurrentStroke({ type: 'pencil', path: [pos], color });
    else if (tool === 'line') setCurrentStroke({ type: 'line', start: pos, end: pos, color });
    else if (tool === 'rect') setCurrentStroke({ type: 'rect', start: pos, end: pos, color });
  };

  const handlePointerMove = (e: any) => {
    if (!isDrawing || !currentStroke) return;
    const pos = getCoords(e);
    if (!pos) return;
    
    if (currentStroke.type === 'pencil') setCurrentStroke({ ...currentStroke, path: [...currentStroke.path, pos] });
    else if (currentStroke.type === 'line') setCurrentStroke({ ...currentStroke, end: pos });
    else if (currentStroke.type === 'rect') setCurrentStroke({ ...currentStroke, end: pos });
  };

  const handlePointerUp = () => {
    if (isDrawing && currentStroke) {
        setStrokes([...strokes, currentStroke]);
        setCurrentStroke(null);
    }
    setIsDrawing(false);
  };

  const undo = () => setStrokes(strokes.slice(0, -1));
  const clear = () => setStrokes([]);

  return (
    <div className="relative w-full aspect-[4/3] md:aspect-[21/9] bg-white rounded-3xl border-2 border-gray-100 shadow-sm overflow-hidden flex flex-col group print:border-black print:aspect-[16/9]">
      <canvas ref={canvasBaseRef} width={1000} height={500} className="absolute inset-0 w-full h-full pointer-events-none z-0" />
      <canvas ref={canvasDrawRef} width={1000} height={500} className={`absolute inset-0 w-full h-full touch-none z-10 ${tool === 'text' ? 'cursor-text' : 'cursor-crosshair'}`} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerOut={handlePointerUp} />
      
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/95 backdrop-blur px-4 py-2 rounded-2xl shadow-xl border border-gray-200 z-20 transition-all opacity-20 hover:opacity-100 print-hidden">
        <div className="flex gap-1 border-r border-gray-200 pr-3 mr-1">
            <button onClick={()=>setTool('pencil')} className={`p-1.5 rounded-lg transition-all ${tool === 'pencil' ? 'bg-black text-white' : 'text-gray-400 hover:text-black hover:bg-gray-100'}`}><Pencil size={16}/></button>
            <button onClick={()=>setTool('line')} className={`p-1.5 rounded-lg transition-all ${tool === 'line' ? 'bg-black text-white' : 'text-gray-400 hover:text-black hover:bg-gray-100'}`}><Minus size={16}/></button>
            <button onClick={()=>setTool('rect')} className={`p-1.5 rounded-lg transition-all ${tool === 'rect' ? 'bg-black text-white' : 'text-gray-400 hover:text-black hover:bg-gray-100'}`}><Square size={16}/></button>
            <button onClick={()=>setTool('text')} className={`p-1.5 rounded-lg transition-all ${tool === 'text' ? 'bg-black text-white' : 'text-gray-400 hover:text-black hover:bg-gray-100'}`}><Type size={16}/></button>
        </div>
        <div className="flex gap-1 border-r border-gray-200 pr-3 mr-1">
            {['#d63031', '#0984e3', '#00b894', '#2d3436'].map(c => (
                <button key={c} onClick={()=>setColor(c)} className={`w-5 h-5 rounded-full border-2 transition-transform ${color === c ? 'scale-125 border-gray-400 shadow-sm' : 'border-transparent'}`} style={{backgroundColor: c}} />
            ))}
        </div>
        <div className="flex gap-1">
            <button onClick={undo} disabled={strokes.length===0} className="p-1.5 rounded-lg text-gray-500 hover:text-black hover:bg-gray-100 disabled:opacity-30"><Undo size={16}/></button>
            <button onClick={clear} disabled={strokes.length===0} className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 disabled:opacity-30"><Trash2 size={16}/></button>
        </div>
      </div>
      <div className="absolute bottom-4 left-4 text-[10px] font-bold text-gray-400 uppercase bg-white/80 px-3 py-1 rounded-lg pointer-events-none print-hidden">Outils d'annotation interactifs</div>
    </div>
  );
});

SketchTool.displayName = 'SketchTool';

export default function Rapports() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const [meetingTab, setMeetingTab] = useState<'notes' | 'calculs' | 'actions' | 'recap_hebdo'>('actions');
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [selectedChantier, setSelectedChantier] = useState<string>("");
  const [chantierDetails, setChantierDetails] = useState<any>(null);
  
  const [notes, setNotes] = useState<any[]>([]);
  const [savedNotes, setSavedNotes] = useState<any[]>([]); 
  
  const [activeNote, setActiveNote] = useState("");
  const [noteCategory, setNoteCategory] = useState("Technique");
  const [noteSeverity, setNoteSeverity] = useState("Info");
  const [noteWeather, setNoteWeather] = useState<string[]>([]);
  const [notePhoto, setNotePhoto] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editNoteText, setEditNoteText] = useState("");
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const [selectedPrintNotes, setSelectedPrintNotes] = useState<number[]>([]);

  const [showAbrasive, setShowAbrasive] = useState(true);
  const [showDewPoint, setShowDewPoint] = useState(true);

  const sketchRef = useRef<any>(null);
  const [calcForm, setCalcForm] = useState({ type: 'rectangle', L: 10, l: 5, D: 2, H: 5, microns: 200, rendement: 5, degree: 'Sa2.5', pertes: 20, name: '' });
  const [dewPointForm, setDewPointForm] = useState({ T_amb: 20, RH: 65, T_acier: 18 });
  const [metreHistory, setMetreHistory] = useState<any[]>([]);

  const [actionsList, setActionsList] = useState<any[]>([]);
  const [actionForm, setActionForm] = useState({ titre: '', responsable: '', delai: '' });

  const [materiels, setMateriels] = useState<any[]>([]);
  const [fournitures, setFournitures] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [taches, setTaches] = useState<any[]>([]);
  const [printFormat, setPrintFormat] = useState('A4 portrait');
  const [controleLe, setControleLe] = useState(new Date().toISOString().split('T')[0]);
  const [commandeApasser, setCommandeApasser] = useState("");
  const [risqueIdentifie, setRisqueIdentifie] = useState("");

  const updatePendingCount = async () => {
    if (db) {
      const count = await db.reports.count();
      setPendingSyncCount(count);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
        setIsOnline(navigator.onLine);
        const handleOnline = () => { setIsOnline(true); updatePendingCount(); };
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline); window.addEventListener('offline', handleOffline);
        supabase.from('chantiers').select('id, nom').order('nom', { ascending: true }).then(({data}) => data && setChantiers(data));
        updatePendingCount();
        return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
    }
  }, []);

  const getDetails = async () => {
    if (!selectedChantier) { setChantierDetails(null); setMateriels([]); setFournitures([]); setLocations([]); setTaches([]); setSavedNotes([]); setSelectedPrintNotes([]); setActionsList([]); return; }
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

      const { data: rData } = await supabase.from('reunions').select('id, notes, actions').eq('chantier_id', selectedChantier).order('date', { ascending: false });
      if (rData) {
        const allSaved = rData.flatMap((r: any) => (r.notes || []).map((n: any) => ({ ...n, reunion_id: r.id })));
        setSavedNotes(allSaved);
        
        const allActions = rData.flatMap((r: any) => (r.actions || []).map((a: any) => ({ ...a, reunion_id: r.id })));
        setActionsList(allActions);
      } else {
        setSavedNotes([]);
        setActionsList([]);
      }
    } catch (e) {}
  };

  useEffect(() => {
    getDetails();
  }, [selectedChantier]);

  const toggleWeather = (w: string) => {
    if (noteWeather.includes(w)) setNoteWeather(noteWeather.filter(item => item !== w));
    else setNoteWeather([...noteWeather, w]);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) setNotePhoto(event.target.result.toString());
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const addNote = () => {
    if (!activeNote && !notePhoto) return;
    setNotes([{ id: Date.now(), category: noteCategory, severity: noteSeverity, weather: noteWeather, text: activeNote, photo: notePhoto, type: 'observation', timestamp: new Date().toISOString() }, ...notes]);
    setActiveNote(""); setNoteSeverity("Info"); setNoteWeather([]); setNotePhoto(null);
  };

  const addAction = () => {
      if(!actionForm.titre) return;
      setActionsList([{ id: Date.now(), titre: actionForm.titre, responsable: actionForm.responsable || 'Non défini', delai: actionForm.delai || '-', statut: 'À faire', isNew: true }, ...actionsList]);
      setActionForm({ titre: '', responsable: '', delai: '' });
  };

  const removeAction = (id: number) => {
      setActionsList(actionsList.filter(a => a.id !== id));
  };

  const toggleActionStatus = (id: number) => {
      setActionsList(actionsList.map(a => {
          if(a.id === id) {
              const nextStatus = a.statut === 'À faire' ? 'En cours' : a.statut === 'En cours' ? 'Fait' : 'À faire';
              return { ...a, statut: nextStatus, isModified: !a.isNew };
          }
          return a;
      }));
  };

  // ARCHITECTURE LOCAL FIRST + SUPABASE STORAGE SYNC
  const syncPendingReports = async () => {
    if (!isOnline) return alert("Vous êtes hors-ligne. Impossible de synchroniser.");
    setIsSyncing(true);
    try {
      const pending = await db?.reports.toArray() || [];
      if (pending.length === 0) { setIsSyncing(false); return; }

      for (const report of pending) {
        // 1. Upload Base64 Photos -> Supabase Storage
        const updatedNotes = await Promise.all((report.notes || []).map(async (n: any) => {
          if (n.photo && n.photo.startsWith('data:image')) {
            const res = await fetch(n.photo);
            const blob = await res.blob();
            const fileName = `notes/${report.chantier_id}_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
            const { error } = await supabase.storage.from('chantier_media').upload(fileName, blob);
            if (!error) {
              const { data: { publicUrl } } = supabase.storage.from('chantier_media').getPublicUrl(fileName);
              n.photo = publicUrl;
            }
          }
          return n;
        }));

        // 2. Upload Base64 Sketches -> Supabase Storage
        const updatedCalculs = await Promise.all((report.calculs || []).map(async (m: any) => {
          if (m.image && m.image.startsWith('data:image')) {
            const res = await fetch(m.image);
            const blob = await res.blob();
            const fileName = `metres/${report.chantier_id}_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
            const { error } = await supabase.storage.from('chantier_media').upload(fileName, blob);
            if (!error) {
              const { data: { publicUrl } } = supabase.storage.from('chantier_media').getPublicUrl(fileName);
              m.image = publicUrl;
            }
          }
          return m;
        }));

        // 3. Insert Final Report to Supabase
        const payload = {
          chantier_id: report.chantier_id,
          date: report.date,
          notes: updatedNotes,
          calculs: updatedCalculs,
          actions: report.actions,
          metriques_techniques: report.metriques_techniques
        };
        
        const { error: insertError } = await supabase.from('reunions').insert([payload]);
        if (!insertError) await db?.reports.delete(report.id);
      }
      
      alert("Synchronisation Cloud terminée avec succès !");
      await updatePendingCount();
      getDetails(); // Refresh view
    } catch (e: any) {
      alert("Erreur lors de la synchronisation : " + e.message);
    }
    setIsSyncing(false);
  };

  const saveReport = async () => {
    if (!selectedChantier) return alert("Veuillez sélectionner un chantier réel avant d'enregistrer.");
    
    const newActions = actionsList.filter(a => a.isNew).map(({ isNew, isModified, ...rest }) => rest);
    
    const report = { 
        chantier_id: selectedChantier, 
        date: new Date().toISOString(), 
        notes, 
        calculs: metreHistory, 
        actions: newActions,
        metriques_techniques: { surface: totalMetre.surface, peinture: totalMetre.paint, abrasif: totalMetre.abrasive }
    };
    
    // On sauvegarde toujours en LOCAL en priorité
    if (db) {
        await db.reports.add({ ...report, is_synced: false });
        await updatePendingCount();
    }
    
    // On met à jour l'UI locale pour que l'utilisateur voit son ajout instantanément (même hors-ligne)
    const localNotes = notes.map(n => ({...n, reunion_id: 'local'}));
    setSavedNotes([...localNotes, ...savedNotes]);
    setNotes([]);
    setMetreHistory([]);
    setCalcForm({...calcForm, name: ''});
    setActionsList(actionsList.map(a => ({...a, isNew: false, isModified: false})));

    if (isOnline) {
      // Maj des actions pré-existantes modifiées
      const modifiedActions = actionsList.filter(a => a.isModified && a.reunion_id);
      for(const modAction of modifiedActions) {
          const { data: rData } = await supabase.from('reunions').select('actions').eq('id', modAction.reunion_id).single();
          if(rData && rData.actions) {
              const updatedArray = rData.actions.map((a:any) => a.id === modAction.id ? { ...a, statut: modAction.statut } : a);
              await supabase.from('reunions').update({ actions: updatedArray }).eq('id', modAction.reunion_id);
          }
      }
      syncPendingReports(); // Lancement de la synchro des nouveaux éléments
    } else {
      alert("Rapport enregistré localement. Il sera envoyé automatiquement au retour de la connexion.");
    }
  };

  const handleUpdateNote = async (reunionId: string, noteId: number) => {
    if (!reunionId || reunionId === 'local') return alert("Impossible de modifier une note en attente de synchronisation.");
    try {
        const { data } = await supabase.from('reunions').select('notes').eq('id', reunionId).single();
        if (data && data.notes) {
            const updatedNotes = data.notes.map((n: any) => n.id === noteId ? { ...n, text: editNoteText } : n);
            const { error } = await supabase.from('reunions').update({ notes: updatedNotes }).eq('id', reunionId);
            if (error) throw error;
            setSavedNotes(savedNotes.map(n => n.id === noteId ? { ...n, text: editNoteText } : n));
        }
    } catch (e) { alert("Erreur lors de la mise à jour de la note."); }
    setEditingNoteId(null);
  };

  const handleDeleteNote = async (reunionId: string, noteId: number) => {
    if (!reunionId || reunionId === 'local') return alert("Impossible de supprimer une note en attente de synchronisation.");
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette note ?")) return;
    try {
        const { data } = await supabase.from('reunions').select('notes').eq('id', reunionId).single();
        if (data && data.notes) {
            const updatedNotes = data.notes.filter((n: any) => n.id !== noteId);
            const { error } = await supabase.from('reunions').update({ notes: updatedNotes }).eq('id', reunionId);
            if (error) throw error;
            setSavedNotes(savedNotes.filter(n => n.id !== noteId));
            setSelectedPrintNotes(selectedPrintNotes.filter(id => id !== noteId));
        }
    } catch (e) { alert("Erreur lors de la suppression de la note."); }
  };

  const togglePrintNote = (id: number) => {
    if (selectedPrintNotes.includes(id)) setSelectedPrintNotes(selectedPrintNotes.filter(nId => nId !== id));
    else setSelectedPrintNotes([...selectedPrintNotes, id]);
  };

  const toggleSelectAllPrint = () => {
    if (selectedPrintNotes.length === savedNotes.length) setSelectedPrintNotes([]);
    else setSelectedPrintNotes(savedNotes.map(n => n.id));
  };

  const surfaceCalculated = ScientificEngine.calculateSurface(calcForm.type, { L: calcForm.L, l: calcForm.l, D: calcForm.D, H: calcForm.H });
  const paintNeeded = ScientificEngine.calculatePaint(surfaceCalculated, calcForm.microns, calcForm.rendement, calcForm.pertes);
  const sandNeeded = ScientificEngine.calculateAbrasive(surfaceCalculated, calcForm.degree, calcForm.pertes);

  const dewPoint = ScientificEngine.calculateDewPoint(dewPointForm.T_amb, dewPointForm.RH);
  const isPaintSafe = dewPointForm.T_acier >= (dewPoint + 3);

  const totalMetre = metreHistory.reduce((acc, curr) => ({
      surface: acc.surface + curr.surface, paint: acc.paint + curr.paint, abrasive: acc.abrasive + curr.abrasive
  }), { surface: 0, paint: 0, abrasive: 0 });

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
    <div className="min-h-screen bg-[#f8f9fa] p-4 md:p-8">
      
      <style>{`
        @media print { 
          @page { size: ${printFormat}; margin: 15mm; } 
          * { overflow: visible !important; }
          html, body { height: auto !important; background: #fff !important; margin: 0 !important; padding: 0 !important; } 
          .layout, .dashboard, .content-wrapper, .scroll-container, main, #__next, #root { 
            height: auto !important; max-height: none !important; display: block !important; position: static !important; 
          } 
          body * { visibility: hidden; } 
          .print-document, .print-document * { visibility: visible; } 
          .print-document { 
            position: absolute !important; left: 0 !important; top: 0 !important; 
            width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; 
          } 
          table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse; } 
          th, td { word-wrap: break-word; } 
          .break-inside-avoid { page-break-inside: avoid !important; break-inside: avoid !important; display: block; margin-bottom: 24px; width: 100%; } 
          tr { page-break-inside: avoid !important; break-inside: avoid !important; page-break-after: auto; } 
          thead { display: table-header-group; } 
          tfoot { display: table-footer-group; } 
          aside, nav, header, footer:not(.print-footer) { display: none !important; } 
          .print-hidden { display: none !important; } 
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } 
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 gap-4 print-hidden">
          <div className="flex items-center gap-4">
            <div className="bg-black p-3 rounded-2xl text-white shadow-lg shadow-gray-200"><FileText size={28} /></div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-gray-800">Réunion Chantier</h1>
              <div className="flex items-center gap-2">
                {isOnline ? <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 uppercase bg-emerald-50 px-2 py-0.5 rounded-full"><Wifi size={12}/> Connecté</span> : <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase bg-red-50 px-2 py-0.5 rounded-full"><WifiOff size={12}/> Hors-Ligne</span>}
                {pendingSyncCount > 0 && (
                    <button onClick={syncPendingReports} disabled={!isOnline || isSyncing} className="flex items-center gap-1 text-[10px] font-bold text-orange-500 uppercase bg-orange-50 px-2 py-0.5 rounded-full hover:bg-orange-100 transition-colors disabled:opacity-50">
                        <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''}/> Sync ({pendingSyncCount})
                    </button>
                )}
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

        <div className="w-full">
          <div className="w-full space-y-6">
            <div className={`bg-white rounded-[35px] p-8 shadow-sm border border-gray-100 min-h-[600px] flex flex-col w-full ${meetingTab !== 'notes' && meetingTab !== 'actions' ? 'print:border-none print:shadow-none print:p-0 print:m-0 print:bg-transparent' : ''}`}>
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

              {meetingTab === 'actions' && (
                <div className="flex-1 flex flex-col animate-in fade-in relative w-full">
                  <div className="print-hidden w-full mb-8">
                    <div className="flex flex-col md:flex-row gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 items-end">
                      <div className="flex-1 w-full">
                        <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Action à réaliser</label>
                        <input type="text" value={actionForm.titre} onChange={(e) => setActionForm({...actionForm, titre: e.target.value})} placeholder="Ex: Commander 50L de diluant" className="w-full bg-white border border-gray-200 focus:border-black rounded-xl p-3 font-bold text-sm text-gray-700 outline-none transition-all" />
                      </div>
                      <div className="w-full md:w-48">
                        <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Responsable</label>
                        <input type="text" value={actionForm.responsable} onChange={(e) => setActionForm({...actionForm, responsable: e.target.value})} placeholder="Ex: Jean (Magasinier)" className="w-full bg-white border border-gray-200 focus:border-black rounded-xl p-3 font-bold text-sm text-gray-700 outline-none transition-all" />
                      </div>
                      <div className="w-full md:w-40">
                        <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Délai</label>
                        <input type="text" value={actionForm.delai} onChange={(e) => setActionForm({...actionForm, delai: e.target.value})} placeholder="Ex: Mercredi" className="w-full bg-white border border-gray-200 focus:border-black rounded-xl p-3 font-bold text-sm text-gray-700 outline-none transition-all" />
                      </div>
                      <button onClick={addAction} disabled={!actionForm.titre || !selectedChantier} className="w-full md:w-auto bg-black text-white px-6 py-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-50 h-[46px]"><Plus size={16} /> Ajouter</button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4 border-b pb-2 print-hidden">
                    <h3 className="text-xs font-black uppercase text-gray-400 flex items-center gap-2"><Target size={16} className="text-blue-500" /> Plan d'Actions / To-Do List</h3>
                    <div className="flex items-center gap-2">
                      <select value={printFormat} onChange={e => setPrintFormat(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-md px-2 py-1 text-[10px] font-bold outline-none">
                        <option value="A4 portrait">A4 Portrait</option><option value="A4 landscape">A4 Paysage</option>
                      </select>
                      <button onClick={() => window.print()} className="bg-white border border-gray-200 text-black px-3 py-1.5 rounded-md text-[10px] font-black uppercase flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm"><Printer size={12} /> Imprimer Plan d'Actions</button>
                    </div>
                  </div>

                  {actionsList.length > 0 ? (
                    <div className="space-y-3 print-hidden">
                      {actionsList.map((a) => (
                        <div key={a.id} className={`flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-xl border transition-all ${a.statut === 'Fait' ? 'bg-emerald-50/50 border-emerald-200 opacity-60' : a.statut === 'En cours' ? 'bg-orange-50/30 border-orange-200' : 'bg-white border-gray-200 shadow-sm'}`}>
                          <div className="flex-1 pr-4">
                            <p className={`font-bold text-sm ${a.statut === 'Fait' ? 'line-through text-gray-500' : 'text-gray-800'}`}>{a.titre}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><User size={12}/> {a.responsable}</span>
                              <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 border-l pl-4"><Clock size={12}/> {a.delai}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-4 md:mt-0 w-full md:w-auto justify-between md:justify-end">
                            <button onClick={() => toggleActionStatus(a.id)} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${a.statut === 'Fait' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200' : a.statut === 'En cours' ? 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'}`}>
                              {a.statut}
                            </button>
                            <button onClick={() => removeAction(a.id)} className="text-gray-300 hover:text-red-500 transition-colors p-2"><Trash2 size={16}/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200 print-hidden">
                        <p className="text-xs font-bold text-gray-400 uppercase">Aucune action planifiée</p>
                    </div>
                  )}

                  {/* VUE IMPRESSION DES ACTIONS */}
                  <table className="hidden print:table print-document">
                    <thead className="print:table-header-group">
                      <tr>
                        <td className="pb-4 border-b-[3px] border-black mb-6 align-bottom">
                          <div className="flex justify-between items-end">
                            <div>
                              <h2 className="text-xl font-black uppercase tracking-tight">Plan d'Actions de Visite</h2>
                              <div className="text-sm font-bold text-gray-600 uppercase mt-2 flex flex-col gap-1">
                                <div>Chantier : <span className="text-black">{chantierDetails?.nom || 'NON SÉLECTIONNÉ'}</span></div>
                                <div>N° OTP : <span className="text-black">{chantierDetails?.numero_otp || 'Non défini'}</span></div>
                              </div>
                            </div>
                            <div className="text-right text-xs font-medium">
                              <p className="mb-1 uppercase font-bold text-black">Édité le :</p>
                              <p className="font-bold text-black text-sm">{new Date().toLocaleDateString('fr-FR')}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="pt-6">
                          {actionsList.length > 0 ? (
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b-2 border-black">
                                  <th className="py-2 px-2 w-[40%] uppercase font-black">Action à réaliser</th>
                                  <th className="py-2 px-2 w-[25%] uppercase font-black text-center border-l border-gray-300">Responsable</th>
                                  <th className="py-2 px-2 w-[20%] uppercase font-black text-center border-l border-gray-300">Délai</th>
                                  <th className="py-2 px-2 w-[15%] uppercase font-black text-center border-l border-gray-300">Statut</th>
                                </tr>
                              </thead>
                              <tbody>
                                {actionsList.map((a) => (
                                  <tr key={a.id} className="border-b border-gray-300 break-inside-avoid">
                                    <td className="py-3 px-2 font-bold text-sm text-black">{a.titre}</td>
                                    <td className="py-3 px-2 text-center text-gray-700 border-l border-gray-300">{a.responsable}</td>
                                    <td className="py-3 px-2 text-center text-gray-700 border-l border-gray-300">{a.delai}</td>
                                    <td className="py-3 px-2 text-center border-l border-gray-300">
                                      {a.statut === 'Fait' ? (
                                        <span className="text-[10px] font-black uppercase text-emerald-600 flex items-center justify-center gap-1"><CheckCircle size={12}/> Fait</span>
                                      ) : a.statut === 'En cours' ? (
                                        <span className="text-[10px] font-black uppercase text-orange-600 flex items-center justify-center gap-1"><Clock size={12}/> En cours</span>
                                      ) : (
                                        <span className="text-[10px] font-black uppercase text-gray-500 flex items-center justify-center gap-1"><Square size={12}/> À faire</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-center text-gray-400 italic py-10">Aucune action planifiée pour cette visite.</p>
                          )}

                          <div className="mt-12 pt-6 border-t-[3px] border-black grid grid-cols-2 gap-4 text-sm font-bold break-inside-avoid">
                            <div><p className="uppercase mb-12">Signature Chef d'équipe :</p><div className="w-48 border-b border-dotted border-black"></div></div>
                            <div className="text-right"><p className="uppercase mb-12">Signature Chargé d'Affaires :</p><div className="w-48 border-b border-dotted border-black ml-auto"></div></div>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                    <tfoot className="print:table-footer-group print-footer">
                      <tr>
                        <td className="pt-4 pb-2 text-center text-[9px] font-bold text-gray-400 uppercase tracking-widest border-t border-gray-200 mt-4">
                          Document généré le {new Date().toLocaleDateString('fr-FR')} - Altrad Services BTP
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {meetingTab === 'notes' && (
                <div className="flex-1 flex flex-col animate-in fade-in relative w-full">
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
                                    <option value="A4 portrait">A4 Portrait</option><option value="A4 landscape">A4 Paysage</option><option value="A3 portrait">A3 portrait</option><option value="A3 landscape">A3 Paysage</option>
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

                  <table className="hidden print:table print-document">
                    <thead className="print:table-header-group">
                      <tr>
                        <td className="pb-4 border-b-[3px] border-black mb-6 align-bottom">
                          <div className="flex justify-between items-end">
                            <div>
                              <h2 className="text-xl font-black uppercase tracking-tight">Rapport de Visite & Constats</h2>
                              <div className="text-sm font-bold text-gray-600 uppercase mt-2 flex flex-col gap-1">
                                <div>Chantier : <span className="text-black">{chantierDetails?.nom || 'NON SÉLECTIONNÉ'}</span></div>
                                <div>N° OTP : <span className="text-black">{chantierDetails?.numero_otp || 'Non défini'}</span></div>
                              </div>
                            </div>
                            <div className="text-right text-xs font-medium">
                              <p className="mb-1 uppercase font-bold text-black">Édité le :</p>
                              <p className="font-bold text-black text-sm">{new Date().toLocaleDateString('fr-FR')}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="pt-6">
                          <div className="grid grid-cols-1 gap-6">
                            {savedNotes.filter(n => selectedPrintNotes.includes(n.id)).map((n) => (
                              <div key={n.id} className="break-inside-avoid border border-gray-300 rounded-xl p-4">
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
                                  <div className="mt-4 text-center break-inside-avoid">
                                    <img src={n.photo} alt="Photo Note" className="max-h-64 mx-auto rounded-lg border border-gray-300 object-contain" />
                                  </div>
                                )}
                              </div>
                            ))}
                            {selectedPrintNotes.length === 0 && <p className="text-center text-gray-400 italic py-10">Aucune note sélectionnée pour l'impression.</p>}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                    <tfoot className="print:table-footer-group print-footer">
                      <tr>
                        <td className="pt-4 pb-2 text-center text-[9px] font-bold text-gray-400 uppercase tracking-widest border-t border-gray-200 mt-4">
                          Document généré le {new Date().toLocaleDateString('fr-FR')} - Altrad Services BTP
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {meetingTab === 'calculs' && (
                <div className="flex-1 animate-in fade-in relative w-full">
                  
                  {/* Action Bar Impression Calculs */}
                  <div className="flex flex-wrap justify-between items-center mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200 print-hidden">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer"><input type="checkbox" checked={showAbrasive} onChange={(e)=>setShowAbrasive(e.target.checked)} className="accent-black w-4 h-4" /> Besoin de sablage/abrasif</label>
                      <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer"><input type="checkbox" checked={showDewPoint} onChange={(e)=>setShowDewPoint(e.target.checked)} className="accent-black w-4 h-4" /> Contrôle Météo / Pt. de Rosée</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <select value={printFormat} onChange={e => setPrintFormat(e.target.value)} className="bg-white border border-gray-200 rounded-md px-2 py-1 text-[10px] font-bold outline-none">
                        <option value="A4 portrait">A4 Portrait</option><option value="A4 landscape">A4 Paysage</option><option value="A3 portrait">A3 Portrait</option><option value="A3 landscape">A3 Paysage</option>
                      </select>
                      <button onClick={() => window.print()} className="bg-black text-white px-3 py-1.5 rounded-md text-[10px] font-black uppercase flex items-center gap-2 hover:bg-gray-800 transition-all shadow-sm"><Printer size={12} /> Imprimer Métré</button>
                    </div>
                  </div>

                  <table className="print:table w-full bg-white print:p-0 print:border-none text-black text-xs md:text-sm print-document print-reset">
                    <thead className="hidden print:table-header-group">
                      <tr>
                        <td className="pb-4 border-b-[3px] border-black mb-6 align-bottom">
                          <div className="flex justify-between items-end">
                            <div>
                              <h2 className="text-xl font-black uppercase tracking-tight">Carnet de Métré & Devis</h2>
                              <div className="text-sm font-bold text-gray-600 uppercase mt-2 flex flex-col gap-1">
                                <div>Chantier : <span className="text-black">{chantierDetails?.nom || 'NON SÉLECTIONNÉ'}</span></div>
                                <div>N° OTP : <span className="text-black">{chantierDetails?.numero_otp || 'Non défini'}</span></div>
                              </div>
                            </div>
                            <div className="text-right text-xs font-medium">
                              <p className="mb-1 uppercase font-bold text-black">Édité le :</p>
                              <p className="font-bold text-black text-sm">{new Date().toLocaleDateString('fr-FR')}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="pt-6 w-full">
                          
                          <div className="flex flex-col w-full print:block">
                            
                            {/* ZONE DESSIN PLEINE LARGEUR */}
                            <div className="w-full mb-8 break-inside-avoid">
                                <h3 className="font-black uppercase text-gray-700 flex items-center gap-2 border-b border-gray-100 print:border-black pb-2 mb-4"><PencilRuler size={18} className="text-blue-500 print:text-black"/> Outil de Métré & Dessin</h3>
                                <SketchTool ref={sketchRef} type={calcForm.type} dims={{ L: calcForm.L, l: calcForm.l, D: calcForm.D, H: calcForm.H }} />
                            </div>

                            {/* ZONE SAISIE & RESULTATS */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 break-inside-avoid print:grid-cols-2">
                                
                                <div className="space-y-4 print-hidden">
                                  <div className="grid grid-cols-2 gap-2">
                                      <button onClick={()=>setCalcForm({...calcForm, type: 'rectangle'})} className={`p-2 rounded-xl text-[10px] font-black uppercase border transition-all ${calcForm.type==='rectangle' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'}`}>Rectangle</button>
                                      <button onClick={()=>setCalcForm({...calcForm, type: 'cylindre'})} className={`p-2 rounded-xl text-[10px] font-black uppercase border transition-all ${calcForm.type==='cylindre' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'}`}>Cylindre</button>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                      {calcForm.type === 'rectangle' ? (
                                          <>
                                          <div><label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Longueur (m)</label><input type="number" value={calcForm.L} onChange={(e)=>setCalcForm({...calcForm, L: parseFloat(e.target.value)})} className="w-full bg-gray-50 rounded-xl p-3 font-bold outline-none border-2 border-transparent focus:border-blue-400 transition-all" /></div>
                                          <div><label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Largeur (m)</label><input type="number" value={calcForm.l} onChange={(e)=>setCalcForm({...calcForm, l: parseFloat(e.target.value)})} className="w-full bg-gray-50 rounded-xl p-3 font-bold outline-none border-2 border-transparent focus:border-red-400 transition-all" /></div>
                                          </>
                                      ) : (
                                          <>
                                          <div><label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Diamètre (m)</label><input type="number" value={calcForm.D} onChange={(e)=>setCalcForm({...calcForm, D: parseFloat(e.target.value)})} className="w-full bg-gray-50 rounded-xl p-3 font-bold outline-none border-2 border-transparent focus:border-blue-400 transition-all" /></div>
                                          <div><label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Hauteur (m)</label><input type="number" value={calcForm.H} onChange={(e)=>setCalcForm({...calcForm, H: parseFloat(e.target.value)})} className="w-full bg-gray-50 rounded-xl p-3 font-bold outline-none border-2 border-transparent focus:border-red-400 transition-all" /></div>
                                          </>
                                      )}
                                      <div><label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Épaisseur (µm)</label><input type="number" value={calcForm.microns} onChange={(e)=>setCalcForm({...calcForm, microns: parseFloat(e.target.value)})} className="w-full bg-gray-50 rounded-xl p-3 font-bold outline-none border-2 border-transparent focus:border-gray-300 transition-all" /></div>
                                      <div><label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Rendement (m²/L)</label><input type="number" value={calcForm.rendement} onChange={(e)=>setCalcForm({...calcForm, rendement: parseFloat(e.target.value)})} className="w-full bg-gray-50 rounded-xl p-3 font-bold outline-none border-2 border-transparent focus:border-gray-300 transition-all" /></div>
                                  </div>
                                  <div>
                                      <label className="text-[10px] font-black text-gray-400 uppercase flex justify-between mb-1"><span>Pertes Estimées (%)</span><span className="text-blue-500 font-bold">{calcForm.pertes}%</span></label>
                                      <input type="range" min="0" max="100" value={calcForm.pertes} onChange={(e)=>setCalcForm({...calcForm, pertes: parseFloat(e.target.value)})} className="w-full accent-blue-500" />
                                  </div>
                                  <div className="flex gap-2 pt-2">
                                      <input type="text" placeholder="Nom de l'élément (ex: Cuve A)" value={calcForm.name} onChange={(e)=>setCalcForm({...calcForm, name: e.target.value})} className="flex-1 bg-gray-50 rounded-xl p-3 font-bold outline-none text-sm border-2 border-transparent focus:border-black transition-all" />
                                      <button onClick={addToMetre} disabled={!calcForm.name} className="bg-black text-white px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-gray-800 transition-colors shadow-md flex items-center gap-2 disabled:opacity-50"><Plus size={16}/> Ajouter</button>
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <h3 className="font-black uppercase text-gray-700 flex items-center gap-2 border-b border-gray-100 print:border-black pb-2"><Calculator size={18} className="text-blue-500 print:text-black"/> Historique des Métrés</h3>
                                  {metreHistory.length > 0 ? (
                                      <div className="space-y-4">
                                          {metreHistory.map(m => (
                                              <div key={m.id} className="flex flex-col bg-white p-3 rounded-xl border border-gray-200 shadow-sm print:shadow-none print:border-gray-400 break-inside-avoid">
                                                  <div className="flex justify-between items-center mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-blue-50 p-2 rounded-lg text-blue-600 print:text-black print:border"><Layers size={14}/></div>
                                                        <div>
                                                            <p className="font-bold text-sm text-gray-800 print:text-black">{m.name}</p>
                                                            <p className="text-[9px] text-gray-400 print:text-gray-600 uppercase font-bold">{m.type}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right"><p className="text-[9px] text-gray-400 font-bold uppercase print:text-black">Surface</p><p className="font-black text-xs text-gray-700 print:text-black">{m.surface.toFixed(2)} m²</p></div>
                                                        <div className="text-right"><p className="text-[9px] text-gray-400 font-bold uppercase print:text-black">Peinture</p><p className="font-black text-xs text-blue-600 print:text-black">{m.paint.toFixed(1)} L</p></div>
                                                        {showAbrasive && <div className="text-right"><p className="text-[9px] text-gray-400 font-bold uppercase print:text-black">Abrasif</p><p className="font-black text-xs text-orange-600 print:text-black">{m.abrasive.toFixed(2)} T</p></div>}
                                                        <button onClick={()=>removeMetre(m.id)} className="text-gray-300 hover:text-red-500 transition-colors ml-2 print-hidden"><Trash2 size={14}/></button>
                                                    </div>
                                                  </div>
                                                  {m.image && (
                                                    <div className="mt-2 border-t border-gray-100 pt-2 print:border-black">
                                                      <img src={m.image} alt="Croquis" className="w-full max-h-48 object-contain rounded-lg border border-gray-100 print:border-gray-300" />
                                                    </div>
                                                  )}
                                              </div>
                                          ))}
                                          <div className="flex justify-between items-center bg-black text-white print:bg-gray-100 print:border print:border-black print:text-black px-5 py-4 rounded-xl shadow-lg mt-4 break-inside-avoid">
                                              <p className="font-black uppercase text-sm">Total Estimé</p>
                                              <div className="flex gap-6">
                                                  <div className="text-right"><p className="text-[9px] text-gray-400 print:text-black font-bold uppercase">Surface</p><p className="font-black text-sm">{totalMetre.surface.toFixed(2)} m²</p></div>
                                                  <div className="text-right"><p className="text-[9px] text-blue-300 print:text-black font-bold uppercase">Peinture</p><p className="font-black text-sm">{totalMetre.paint.toFixed(1)} L</p></div>
                                                  {showAbrasive && <div className="text-right"><p className="text-[9px] text-gray-400 print:text-black font-bold uppercase">Abrasif</p><p className="font-black text-sm">{totalMetre.abrasive.toFixed(2)} T</p></div>}
                                              </div>
                                          </div>
                                      </div>
                                  ) : (
                                      <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                          <p className="text-xs font-bold text-gray-400 uppercase">Aucun métré ajouté</p>
                                      </div>
                                  )}
                                </div>
                            </div>

                            {/* CONDITIONS CLIMATIQUES (Optionnel) */}
                            {showDewPoint && (
                              <div className="space-y-4 break-inside-avoid">
                                  <h3 className="font-black uppercase text-gray-700 flex items-center gap-2 border-b border-gray-100 print:border-black pb-2"><CloudRain size={18} className="text-cyan-500 print:text-black"/> Contrôle des Conditions Climatiques</h3>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2">
                                    <div className="bg-gray-50 print:bg-white print:border print:border-gray-400 p-5 rounded-2xl border border-gray-200 shadow-inner space-y-4 print-hidden">
                                        <div><label className="text-[10px] font-black text-gray-500 uppercase flex justify-between mb-1"><span>Temp. Ambiante (°C)</span><span className="text-blue-500">{dewPointForm.T_amb}°C</span></label><input type="range" min="-10" max="50" step="0.5" value={dewPointForm.T_amb} onChange={(e)=>setDewPointForm({...dewPointForm, T_amb: parseFloat(e.target.value)})} className="w-full accent-blue-500" /></div>
                                        <div><label className="text-[10px] font-black text-gray-500 uppercase flex justify-between mb-1"><span>Humidité Relative (%)</span><span className="text-blue-500">{dewPointForm.RH}%</span></label><input type="range" min="0" max="100" step="1" value={dewPointForm.RH} onChange={(e)=>setDewPointForm({...dewPointForm, RH: parseFloat(e.target.value)})} className="w-full accent-blue-500" /></div>
                                        <div><label className="text-[10px] font-black text-gray-500 uppercase flex justify-between mb-1"><span>Temp. Acier (°C)</span><span className="text-blue-500">{dewPointForm.T_acier}°C</span></label><input type="range" min="-10" max="60" step="0.5" value={dewPointForm.T_acier} onChange={(e)=>setDewPointForm({...dewPointForm, T_acier: parseFloat(e.target.value)})} className="w-full accent-blue-500" /></div>
                                    </div>
                                    <div className={`p-6 rounded-2xl border flex flex-col justify-center ${isPaintSafe ? 'bg-emerald-50 border-emerald-200 print:border-black print:bg-white' : 'bg-red-50 border-red-200 print:border-black print:bg-white'}`}>
                                        <div className="flex justify-between items-center mb-4 border-b border-black/10 pb-4">
                                            <div>
                                              <span className="text-[10px] font-black uppercase text-gray-600 block print:text-black">Relevé Terrain</span>
                                              <span className="text-xs font-bold text-gray-500 print:text-black">Tamb: {dewPointForm.T_amb}°C | HR: {dewPointForm.RH}% | Acier: {dewPointForm.T_acier}°C</span>
                                            </div>
                                            <div className="text-right">
                                              <span className="text-[10px] font-black uppercase text-gray-600 block print:text-black">Point de rosée calculé</span>
                                              <span className="font-black text-2xl print:text-black">{dewPoint.toFixed(1)}°C</span>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            {isPaintSafe ? <CheckCircle2 size={32} className="text-emerald-500 print:text-black shrink-0"/> : <AlertTriangle size={32} className="text-red-500 print:text-black shrink-0"/>}
                                            <p className={`text-sm font-bold leading-tight print:text-black ${isPaintSafe ? 'text-emerald-700' : 'text-red-700'}`}>
                                                {isPaintSafe ? '✅ CONFORME : Risque de condensation faible. Application autorisée (T° Acier > Point de rosée + 3°C).' : '❌ NON CONFORME : Risque élevé de condensation sur le support. Application de peinture interdite (Règle des +3°C non respectée) !'}
                                            </p>
                                        </div>
                                    </div>
                                  </div>
                              </div>
                            )}

                          </div>

                        </td>
                      </tr>
                    </tbody>
                    <tfoot className="hidden print:table-footer-group w-full print-footer">
                      <tr>
                        <td className="pt-4 pb-2 text-center text-[9px] font-bold text-gray-400 uppercase tracking-widest border-t border-gray-200 mt-4">
                          Document généré le {new Date().toLocaleDateString('fr-FR')} - Altrad Services BTP
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                </div>
              )}

              {meetingTab === 'recap_hebdo' && (
                <div className="flex-1 animate-in fade-in relative w-full print:w-full print:max-w-full">
                  
                  <div className="flex flex-wrap justify-between items-center mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200 print-hidden">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-black uppercase text-gray-500">Format d'impression :</label>
                      <select value={printFormat} onChange={e => setPrintFormat(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-black">
                        <option value="A4 portrait">A4 Portrait</option><option value="A4 landscape">A4 Paysage</option><option value="A3 portrait">A3 Portrait</option><option value="A3 landscape">A3 Paysage</option>
                      </select>
                    </div>
                    <button onClick={() => window.print()} className="bg-black text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase flex items-center gap-2 hover:bg-gray-800 transition-all shadow-md"><Printer size={16} /> Imprimer Document</button>
                  </div>
                  
                  <table className="w-full bg-white print:p-0 print:border-none text-black text-xs md:text-sm print-document">
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
                              <p className="mt-2 font-black text-black text-[11px] bg-gray-200 px-2 py-1 rounded">{periodStr}</p>
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
                              <h3 className="text-xs font-black uppercase bg-gray-200 p-2 mb-3 border-l-4 border-black">1. Tâches prévues cette semaine</h3>
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="border-b-2 border-gray-300">
                                    <th className="py-2 px-1 w-[35%]">Tâche / Sous-tâche</th><th className="py-2 px-1 text-center w-[15%]">Responsable</th><th className="py-2 px-1 text-center w-[10%]">Effectif</th><th className="py-2 px-1 text-center w-[10%]">Hrs Prév.</th><th className="py-2 px-1 text-center w-[10%]">Hrs Réel.</th><th className="py-2 px-1 text-center w-[10%]">% Avanc.</th><th className="py-2 px-1 text-center w-[10%]">Fait</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredTaches.length > 0 ? filteredTaches.map((t: any) => (
                                    <React.Fragment key={t.id || Math.random()}>
                                      <tr className="border-b border-gray-300 bg-gray-100">
                                        <td className="py-2 px-1 font-black">{t.nom || '-'}</td>
                                        <td className="py-2 px-1 text-center font-bold">{t.responsable ? t.responsable : <div className="w-20 mx-auto border-b border-dotted border-gray-400 h-4"></div>}</td>
                                        <td className="py-2 px-1 text-center font-bold">{t.effectif ? t.effectif : <div className="w-8 mx-auto border-b border-dotted border-gray-400 h-4"></div>}</td>
                                        <td className="py-2 px-1 text-center font-bold">{t.heures_prevues || '-'}</td>
                                        <td className="py-2 px-1"><div className="w-12 mx-auto border-b border-dotted border-gray-400 h-4"></div></td>
                                        <td className="py-2 px-1"><div className="w-12 mx-auto border-b border-dotted border-gray-400 h-4 relative"><span className="absolute right-0 bottom-0 text-[9px] text-gray-500">%</span></div></td>
                                        <td className="py-2 px-1 text-center"><Square size={16} className="mx-auto text-black"/></td>
                                      </tr>
                                      {t.subtasks && t.subtasks.map((st: any) => (
                                        <tr key={st.id || Math.random()} className="border-b border-gray-200 text-[10px]">
                                          <td className="py-1.5 px-1 pl-6 flex items-center gap-2 text-gray-700"><ChevronRight size={10}/> {st.label || st.nom}</td>
                                          <td className="py-1.5 px-1 text-center"><div className="w-20 mx-auto border-b border-dotted border-gray-300 h-3"></div></td>
                                          <td className="py-1.5 px-1 text-center text-gray-500">{st.effectif ? st.effectif : <div className="w-8 mx-auto border-b border-dotted border-gray-300 h-3"></div>}</td>
                                          <td className="py-1.5 px-1 text-center text-gray-500">{st.heures || '-'}</td>
                                          <td className="py-1.5 px-1"><div className="w-10 mx-auto border-b border-dotted border-gray-300 h-3"></div></td>
                                          <td className="py-1.5 px-1"><div className="w-10 mx-auto border-b border-dotted border-gray-300 h-3 relative"><span className="absolute right-0 bottom-0 text-[8px] text-gray-400">%</span></div></td>
                                          <td className="py-1.5 px-1 text-center"><Square size={12} className="mx-auto text-black"/></td>
                                        </tr>
                                      ))}
                                    </React.Fragment>
                                  )) : <tr><td colSpan={7} className="py-4 text-center text-gray-400 italic">Aucune tâche prévue pour cette semaine...</td></tr>}
                                </tbody>
                              </table>
                            </div>

                            <div className="break-inside-avoid w-full">
                              <h3 className="text-xs font-black uppercase bg-gray-200 p-2 mb-3 border-l-4 border-black">2. Fournitures & Consommables (À vérifier)</h3>
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
                                      <tr key={f.id} className={`border-b border-gray-200 ${alertQty ? 'bg-white' : ''}`}>
                                        <td className="py-2 px-1 font-bold flex items-center gap-2">{alertQty && <AlertTriangle size={14} className="text-black" />} {f.nom}</td>
                                        <td className="py-2 px-1 text-center">{f.quantite_prevue || '-'}</td>
                                        <td className="py-2 px-1"><div className="w-16 mx-auto border-b border-dotted border-gray-400 h-4"></div></td>
                                        <td className="py-2 px-1 text-center"><Square size={16} className="mx-auto text-black"/></td><td className="py-2 px-1 text-center"><Square size={16} className="mx-auto text-black"/></td>
                                      </tr>
                                    );
                                  }) : <tr><td colSpan={6} className="py-4 text-center text-gray-400 italic">Aucune fourniture listée...</td></tr>}
                                </tbody>
                              </table>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 break-inside-avoid">
                              <div>
                                <h3 className="text-xs font-black uppercase bg-gray-200 p-2 mb-3 border-l-4 border-black">3. Matériels sur Chantier</h3>
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
                                        <td className="py-2 px-1 text-center"><Square size={16} className="mx-auto text-black"/></td><td className="py-2 px-1 text-center"><Square size={16} className="mx-auto text-black"/></td>
                                        <td className="py-2 px-1 text-center"><Square size={16} className="mx-auto text-black"/></td>
                                      </tr>
                                    )) : <tr><td colSpan={4} className="py-4 text-center text-gray-400 italic">Aucun matériel listé...</td></tr>}
                                  </tbody>
                                </table>
                              </div>
                              <div>
                                <h3 className="text-xs font-black uppercase bg-gray-200 p-2 mb-3 border-l-4 border-black flex items-center gap-2"><Clock size={14} /> 4. Locations en cours</h3>
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="border-b-2 border-gray-300"><th className="py-2 px-1 w-[50%]">Machine</th><th className="py-2 px-1 text-center w-[25%]">Fin prévue</th><th className="py-2 px-1 text-center w-[25%]">Retour OK</th></tr>
                                  </thead>
                                  <tbody>
                                    {locations.length > 0 ? locations.map(l => {
                                      const crit = isExpiringSoon(l.date_fin);
                                      return (
                                        <tr key={l.id} className="border-b border-gray-200">
                                          <td className="py-2 px-1 font-bold">{l.nom}</td><td className={`py-2 px-1 text-center ${crit ? 'font-bold text-black' : ''}`}>{l.date_fin || 'N/A'}</td>
                                          <td className="py-2 px-1 text-center"><Square size={16} className="mx-auto text-black"/></td>
                                        </tr>
                                      );
                                    }) : <tr><td colSpan={3} className="py-2 text-gray-400 italic">Aucune location...</td></tr>}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 break-inside-avoid print:mt-4">
                              <div className="border print:border-black rounded-lg p-3">
                                <label className="text-[10px] font-black uppercase print:text-black mb-2 block">📦 Commandes à passer en urgence</label>
                                <textarea value={commandeApasser} onChange={e => setCommandeApasser(e.target.value)} className="w-full h-20 resize-none outline-none text-xs print:bg-transparent" placeholder="Saisir ou laisser vide pour écrire au stylo..." />
                              </div>
                              <div className="border print:border-black rounded-lg p-3">
                                <label className="text-[10px] font-black uppercase print:text-black mb-2 block flex items-center gap-1"><AlertTriangle size={12}/> Risques Identifiés (Météo, Blocage...)</label>
                                <textarea value={risqueIdentifie} onChange={e => setRisqueIdentifie(e.target.value)} className="w-full h-20 resize-none outline-none text-xs print:bg-transparent" placeholder="Saisir ou laisser vide pour écrire au stylo..." />
                              </div>
                            </div>

                            <div className="mt-8 pt-6 border-t-[3px] border-black grid grid-cols-3 gap-4 text-sm font-bold break-inside-avoid">
                              <div><p className="uppercase mb-12">Chef d'équipe :</p><div className="w-48 border-b border-dotted border-black"></div></div>
                              <div><p className="uppercase mb-2">Signature & Tampon :</p><div className="h-24 w-48 border-2 border-dashed print:border-gray-500 rounded-lg"></div></div>
                              <div className="text-right">
                                <p className="uppercase mb-6">Validation :</p>
                                <div className="flex justify-end gap-6"><label className="flex items-center gap-2"><Square size={16}/> OK</label><label className="flex items-center gap-2"><Square size={16}/> Réserve</label></div>
                              </div>
                            </div>

                          </div>
                        </td>
                      </tr>
                    </tbody>
                    <tfoot className="print:table-footer-group print-footer">
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
      
      {expandedPhoto && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 print-hidden" onClick={() => setExpandedPhoto(null)}>
            <img src={expandedPhoto} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
            <button className="absolute top-6 right-6 text-white hover:text-red-500 transition-colors bg-black/50 p-2 rounded-full"><X size={32}/></button>
        </div>
      )}
    </div>
  );
}
