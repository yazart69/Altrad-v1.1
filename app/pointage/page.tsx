"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ChevronLeft, ChevronRight, Save, Printer, 
  Lock, Unlock, Copy, RotateCcw, AlertTriangle, 
  CheckCircle2, FileSpreadsheet, HardHat, Clock, AlertCircle,
  MapPin, Play, Square, ShieldCheck, Signature as SignatureIcon,
  Info, UserCheck, X, Camera, LayoutDashboard, Smartphone, Navigation
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

// --- CONFIGURATION GÉOFENCING (Rayon de 500 mètres) ---
const GEOFENCE_RADIUS_METERS = 500;

// --- HELPERS ---
const toLocalISOString = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
  return adjustedDate.toISOString().split('T')[0];
};

const getWeekNumber = (d: Date) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

// Formule de Haversine pour calculer la distance entre deux points GPS
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // Rayon de la terre en mètres
  const f1 = lat1 * Math.PI / 180;
  const f2 = lat2 * Math.PI / 180;
  const df = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(df/2) * Math.sin(df/2) +
            Math.cos(f1) * Math.cos(f2) *
            Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export default function PointagePage() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [employes, setEmployes] = useState<any[]>([]);
  
  // --- ÉTATS POUR LE NOUVEAU MODULE DE TERRAIN ---
  const [viewMode, setViewMode] = useState<'admin' | 'terrain'>('terrain'); 
  const [activeChantier, setActiveChantier] = useState<any>(null);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [distanceToSite, setDistanceToSite] = useState<number | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<'idle' | 'briefing' | 'active'>('idle');
  
  // État du Briefing
  const [briefing, setBriefing] = useState({
    epi_ok: false,
    outils_ok: false,
    zone_balisee: false,
    risques_lus: false
  });

  // Signature
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Date et Navigation (Admin)
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  });

  const weekNumber = getWeekNumber(currentDate);
  const year = currentDate.getFullYear();
  const isWeekLocked = useMemo(() => assignments.some(a => a.valide === true), [assignments]);

  // --- INITIALISATION & GÉOLOCALISATION ---
  useEffect(() => { 
    fetchData(); 
    startGeolocWatch();
  }, [currentDate]);

  const startGeolocWatch = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setGpsLocation(coords);
      if (activeChantier?.latitude) {
        const d = calculateDistance(coords.lat, coords.lng, activeChantier.latitude, activeChantier.longitude);
        setDistanceToSite(d);
      }
    });
  };

  const fetchData = async () => {
    setLoading(true);
    const { data: emp } = await supabase.from('employes').select('id, nom, prenom').order('nom');
    if (emp) setEmployes(emp);

    const startOfWeek = toLocalISOString(currentDate);
    const endOfWeekDate = new Date(currentDate);
    endOfWeekDate.setDate(endOfWeekDate.getDate() + 6);
    const endOfWeek = toLocalISOString(endOfWeekDate);

    const { data: plan } = await supabase
      .from('planning')
      .select(`*, employes (id, nom, prenom), chantiers (id, nom, adresse, latitude, longitude)`)
      .gte('date_debut', startOfWeek)
      .lte('date_debut', endOfWeek)
      .order('employe_id');

    if (plan) {
        const enrichedPlan = plan.map(task => {
            if (task.heures > 0) return task;
            if (['maladie', 'conge', 'formation', 'absence'].includes(task.type)) return task;
            const date = new Date(task.date_debut);
            const dayNum = date.getDay();
            const defaultHours = dayNum === 5 ? 4 : 8.5;
            return { ...task, heures: defaultHours, isAuto: true }; 
        });
        setAssignments(enrichedPlan);

        const todayStr = toLocalISOString(new Date());
        const todayTask = enrichedPlan.find(a => a.date_debut === todayStr);
        if (todayTask?.chantiers) setActiveChantier(todayTask.chantiers);
    }
    setLoading(false);
  };

  // --- LOGIQUE SIGNATURE ---
  const startDrawing = (e: any) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx?.beginPath();
    ctx?.moveTo(x, y);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx?.lineTo(x, y);
    ctx?.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    ctx?.clearRect(0, 0, canvas?.width || 0, canvas?.height || 0);
  };

  // --- ACTIONS TERRAIN ---
  const handleStartBriefing = () => {
    if (distanceToSite && distanceToSite > GEOFENCE_RADIUS_METERS) {
      alert(`⚠️ HORS ZONE : Vous êtes à ${Math.round(distanceToSite)}m du site. Rapprochez-vous pour pointer.`);
      return;
    }
    setWorkflowStatus('briefing');
  };

  const submitCheckIn = async () => {
    if (!briefing.epi_ok || !briefing.risques_lus) return alert("Veuillez valider tous les points de sécurité.");
    const canvas = canvasRef.current;
    const signature = canvas?.toDataURL();
    
    const { error } = await supabase.from('pointages_hse').insert([{
      chantier_id: activeChantier.id,
      gps_lat: gpsLocation?.lat,
      gps_lng: gpsLocation?.lng,
      signature: signature,
      briefing_data: briefing,
      type: 'START'
    }]);

    if (!error) setWorkflowStatus('active');
  };

  // --- ACTIONS ADMIN (CORRECTED) ---
  const updateHours = async (id: string, value: string) => {
      if (isWeekLocked) return;
      const numValue = parseFloat(value) || 0;
      setAssignments(prev => prev.map(a => a.id === id ? { ...a, heures: numValue, isAuto: false } : a));
      await supabase.from('planning').update({ heures: numValue }).eq('id', id);
  };

  const toggleLockWeek = async () => {
      const newState = !isWeekLocked;
      const ids = assignments.map(a => a.id);
      if (ids.length > 0) {
          await supabase.from('planning').update({ valide: newState }).in('id', ids);
          fetchData();
      }
  };

  const copyPreviousWeek = async () => {
      if (isWeekLocked) return;
      if (!confirm("Copier S-1 ?")) return;
      const prevStart = new Date(currentDate); prevStart.setDate(prevStart.getDate() - 7);
      const prevEnd = new Date(prevStart); prevEnd.setDate(prevEnd.getDate() + 6);
      const { data: prevData } = await supabase.from('planning')
          .select('*')
          .gte('date_debut', toLocalISOString(prevStart))
          .lte('date_debut', toLocalISOString(prevEnd));
      if (!prevData?.length) { alert("Aucune donnée S-1"); return; }
      const newEntries = prevData.map(item => {
          const d = new Date(item.date_debut); d.setDate(d.getDate() + 7);
          return {
              employe_id: item.employe_id, chantier_id: item.chantier_id, type: item.type,
              date_debut: toLocalISOString(d), date_fin: toLocalISOString(d),
              heures: item.heures, valide: false
          };
      });
      const { error } = await supabase.from('planning').insert(newEntries);
      if (error) alert("Erreur: " + error.message);
      else fetchData();
  };

  const resetWeek = async () => {
      if (isWeekLocked) return;
      if (!confirm("Remettre à zéro ?")) return;
      const ids = assignments.map(a => a.id);
      await supabase.from('planning').update({ heures: 0 }).in('id', ids);
      fetchData();
  };

  // --- CALCULS STATS ---
  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  const employeeTotals = useMemo(() => {
      const stats: Record<string, number> = {}; 
      assignments.forEach(a => {
          if (['maladie', 'conge', 'formation'].includes(a.type)) return;
          stats[a.employe_id] = (stats[a.employe_id] || 0) + (parseFloat(a.heures) || 0);
      });
      return stats;
  }, [assignments]);

  const chartData = useMemo(() => {
      const data: any = {};
      assignments.forEach(a => {
          if (!a.chantiers?.nom || !a.heures) return;
          if (['maladie', 'conge', 'formation'].includes(a.type)) return;
          data[a.chantiers.nom] = (data[a.chantiers.nom] || 0) + parseFloat(a.heures);
      });
      return Object.keys(data).map(key => ({ name: key, heures: data[key] }));
  }, [assignments]);

  if (loading) return <div className="h-screen flex items-center justify-center font-black animate-pulse text-gray-400">CHARGEMENT DU POINTAGE...</div>;

  return (
    <div className="min-h-screen bg-[#f0f3f4] font-['Fredoka'] p-4 md:p-6 text-gray-800 print:bg-white print:p-0">
      
      {/* SWITCHER DE VUE */}
      <div className="max-w-7xl mx-auto mb-6 flex bg-white p-1 rounded-2xl shadow-sm border border-gray-200 print:hidden">
        <button 
          onClick={() => setViewMode('terrain')} 
          className={`flex-1 py-3 rounded-xl font-black uppercase text-xs transition-all flex items-center justify-center gap-2 ${viewMode === 'terrain' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
        >
          <Smartphone size={16}/> Pointage Terrain
        </button>
        <button 
          onClick={() => setViewMode('admin')} 
          className={`flex-1 py-3 rounded-xl font-black uppercase text-xs transition-all flex items-center justify-center gap-2 ${viewMode === 'admin' ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
        >
          <LayoutDashboard size={16}/> Gestion Hebdomadaire
        </button>
      </div>

      {/* VUE TERRAIN */}
      {viewMode === 'terrain' && (
        <div className="max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white p-6 rounded-[35px] shadow-sm border border-gray-200 relative overflow-hidden">
            <div className="relative z-10">
              <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Aujourd'hui</span>
              <h2 className="text-2xl font-black mt-2 uppercase italic">{activeChantier?.nom || "Aucun chantier affecté"}</h2>
              <p className="text-gray-400 text-sm font-bold flex items-center gap-1 mt-1"><MapPin size={14}/> {activeChantier?.adresse || "Position non définie"}</p>
            </div>
            <HardHat size={120} className="absolute -right-8 -bottom-8 text-gray-50 opacity-50" />
          </div>

          <div className={`p-5 rounded-3xl flex items-center gap-4 border-2 transition-all ${distanceToSite && distanceToSite <= GEOFENCE_RADIUS_METERS ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-600'}`}>
            <div className={`p-3 rounded-2xl ${distanceToSite && distanceToSite <= GEOFENCE_RADIUS_METERS ? 'bg-emerald-500' : 'bg-red-500'} text-white shadow-md`}>
              <Navigation size={24}/>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-wider opacity-60">Status Géolocalisation</p>
              <p className="text-sm font-black italic">
                {distanceToSite ? `${Math.round(distanceToSite)}m du chantier` : "Calcul de votre position..."}
                {distanceToSite && distanceToSite <= GEOFENCE_RADIUS_METERS ? " • ACCÈS AUTORISÉ" : " • ACCÈS HORS ZONE"}
              </p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] shadow-xl border border-gray-100">
            {workflowStatus === 'idle' && (
              <div className="text-center space-y-6">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto border-4 border-white shadow-inner"><Clock size={40} className="text-gray-300" /></div>
                <div><h3 className="text-xl font-black uppercase">Prêt pour le service ?</h3><p className="text-gray-400 text-sm font-bold">Votre pointage nécessite un briefing de sécurité.</p></div>
                <button onClick={handleStartBriefing} className="w-full bg-red-600 text-white py-6 rounded-[25px] font-black uppercase text-lg shadow-lg shadow-red-100 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"><Play fill="white" size={24}/> Démarrer ma journée</button>
              </div>
            )}

            {workflowStatus === 'briefing' && (
              <div className="space-y-6 animate-in zoom-in-95">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4"><ShieldCheck className="text-red-600" size={28}/><h3 className="text-xl font-black uppercase italic">Pre-job Briefing</h3></div>
                <div className="space-y-3">
                  {[{ id: 'epi_ok', label: 'EPI complets et conformes ?' },{ id: 'outils_ok', label: 'Outils vérifiés et en bon état ?' },{ id: 'zone_balisee', label: 'Zone de travail sécurisée/balisée ?' },{ id: 'risques_lus', label: 'Risques du jour compris ?' }].map(item => (
                    <label key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-all border border-transparent active:border-red-200">
                      <span className="font-bold text-gray-700 text-sm">{item.label}</span>
                      <input type="checkbox" checked={(briefing as any)[item.id]} onChange={e => setBriefing({...briefing, [item.id]: e.target.checked})} className="w-6 h-6 rounded-lg text-red-600 focus:ring-red-500 border-gray-300" />
                    </label>
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><SignatureIcon size={12}/> Signature Digitale</label><button onClick={clearCanvas} className="text-[10px] font-black text-red-500 uppercase">Effacer</button></div>
                  <div className="border-2 border-gray-100 rounded-2xl bg-gray-50 overflow-hidden touch-none">
                    <canvas ref={canvasRef} width={400} height={150} className="w-full cursor-crosshair" onMouseDown={startDrawing} onMouseUp={() => setIsDrawing(false)} onMouseMove={draw} onTouchStart={startDrawing} onTouchEnd={() => setIsDrawing(false)} onTouchMove={draw}/>
                  </div>
                </div>
                <button onClick={submitCheckIn} className="w-full bg-black text-white py-6 rounded-2xl font-black uppercase text-sm shadow-xl flex items-center justify-center gap-2"><UserCheck size={20}/> Valider Briefing & Pointer</button>
              </div>
            )}

            {workflowStatus === 'active' && (
              <div className="text-center space-y-6 py-4 animate-in">
                <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-100"><CheckCircle2 size={48} className="text-white" /></div>
                <div className="space-y-1"><h3 className="text-2xl font-black uppercase text-emerald-600 italic">Pointage Validé</h3><p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">En poste depuis {new Date().toLocaleTimeString()}</p></div>
                <button className="w-full bg-gray-100 text-gray-400 py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2"><Square size={16}/> Déclarer Fin de Poste</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VUE ADMIN */}
      {viewMode === 'admin' && (
        <div className="animate-in fade-in">
          <div className="bg-white rounded-[25px] p-4 mb-6 shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
              <div className="flex items-center gap-4">
                  <div className="bg-orange-100 p-3 rounded-2xl text-orange-600"><Clock size={24} /></div>
                  <div>
                      <h1 className="text-2xl font-black uppercase text-[#2d3436]">Suivi Hebdomadaire</h1>
                      <div className="flex items-center gap-2">
                          <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }} className="hover:bg-gray-100 p-1 rounded"><ChevronLeft size={16}/></button>
                          <span className="text-sm font-bold text-gray-500 uppercase">Semaine {weekNumber} • {year}</span>
                          <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }} className="hover:bg-gray-100 p-1 rounded"><ChevronRight size={16}/></button>
                      </div>
                  </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                  <button onClick={copyPreviousWeek} disabled={isWeekLocked} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-black uppercase flex items-center gap-2 disabled:opacity-50"><Copy size={14}/> S-1</button>
                  <button onClick={resetWeek} disabled={isWeekLocked} className="px-3 py-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl text-xs font-black uppercase flex items-center gap-2 disabled:opacity-50"><RotateCcw size={14}/> R.A.Z</button>
                  <button onClick={toggleLockWeek} className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 text-white shadow-lg transition-all ${isWeekLocked ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>{isWeekLocked ? <><Lock size={14}/> Verrouillé</> : <><Unlock size={14}/> Valider</>}</button>
                  <button onClick={() => window.print()} className="bg-[#2d3436] text-white p-2 rounded-xl hover:bg-black transition-colors"><Printer size={18}/></button>
              </div>
          </div>

          <div className="bg-white rounded-[25px] shadow-sm border border-gray-200 overflow-hidden mb-6 print:border-none print:shadow-none">
              <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full min-w-[1000px] border-collapse">
                      <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="p-4 text-left w-[250px] sticky left-0 bg-gray-50 z-20 font-black text-xs uppercase text-gray-500">Employé</th>
                              {weekDays.map((d, i) => (
                                  <th key={i} className="p-3 text-center min-w-[120px] border-l border-gray-200">
                                      <div className="text-[10px] font-black uppercase text-gray-400">{d.toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
                                      <div className="text-sm font-black text-gray-800">{d.getDate()}</div>
                                  </th>
                              ))}
                              <th className="p-4 text-center w-[100px] font-black text-xs uppercase text-gray-500 border-l border-gray-200 bg-gray-50 sticky right-0 z-20">Total</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {employes.map(emp => {
                              const total = employeeTotals[emp.id] || 0;
                              const isOverload = total > 39;
                              const empTasks = assignments.filter(a => a.employe_id === emp.id);
                              if(empTasks.length === 0) return null;
                              return (
                                  <tr key={emp.id} className="group hover:bg-gray-50 transition-colors">
                                      <td className="p-4 sticky left-0 bg-white group-hover:bg-gray-50 z-10 border-r border-gray-100">
                                          <div className="font-black text-sm uppercase text-gray-700">{emp.nom} {emp.prenom}</div>
                                          {isOverload && <div className="text-[9px] font-bold text-red-500 flex items-center gap-1 mt-1"><AlertTriangle size={10}/> Surcharge ({total}h)</div>}
                                      </td>
                                      {weekDays.map((day, i) => {
                                          const dateStr = toLocalISOString(day);
                                          const dayTasks = empTasks.filter(a => a.date_debut === dateStr);
                                          return (
                                              <td key={i} className="p-2 border-l border-gray-100 align-top h-20">
                                                  <div className="flex flex-col gap-1">
                                                      {dayTasks.map(task => (
                                                          <div key={task.id} className="flex flex-col">
                                                              <div className="flex items-center justify-between bg-blue-50 px-2 py-1 rounded-t border border-blue-100">
                                                                  <span className="text-[9px] font-bold uppercase truncate max-w-[80px] text-blue-800">{task.chantiers?.nom || 'Chantier'}</span>
                                                                  {task.isAuto && <span className="text-[8px] text-blue-300 italic">auto</span>}
                                                              </div>
                                                              <input type="number" disabled={isWeekLocked} className={`w-full p-1 text-center font-bold text-sm outline-none border-b-2 transition-colors ${task.heures > (day.getDay() === 5 ? 4 : 8.5) ? 'border-red-400 bg-red-50 text-red-600' : task.heures > 0 ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white'}`} value={task.heures} onChange={(e) => { const val = e.target.value; setAssignments(prev => prev.map(a => a.id === task.id ? { ...a, heures: val } : a)); }} onBlur={(e) => updateHours(task.id, e.target.value)} />
                                                          </div>
                                                      ))}
                                                  </div>
                                              </td>
                                          );
                                      })}
                                      <td className={`p-4 text-center font-black sticky right-0 bg-white group-hover:bg-gray-50 z-10 border-l border-gray-200 ${isOverload ? 'text-red-500' : 'text-gray-800'}`}>{total}h</td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        canvas { touch-action: none; background-color: #f9fafb; }
        @keyframes heart-beat { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } }
      `}</style>
    </div>
  );
}
