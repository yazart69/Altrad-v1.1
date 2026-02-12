"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ChevronLeft, ChevronRight, Save, Printer, 
  Lock, Unlock, Copy, RotateCcw, AlertTriangle, 
  CheckCircle2, FileSpreadsheet, HardHat, Clock, AlertCircle,
  MapPin, Signature as SignatureIcon, ShieldCheck, Play, CheckSquare, X
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

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

// --- LOGIQUE GÉOFENCING ---
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // Rayon de la terre en mètres
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export default function PointagePage() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [employes, setEmployes] = useState<any[]>([]);
  
  // États Pointage Avancé
  const [showBriefing, setShowBriefing] = useState(false);
  const [currentGPS, setCurrentGPS] = useState<{lat: number, lng: number} | null>(null);
  const [activeTask, setActiveTask] = useState<any>(null);
  const [briefingData, setBriefingData] = useState({
    epi_ok: false,
    outils_ok: false,
    zone_ok: false,
    risques_ok: false
  });

  // Signature Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Date et Navigation
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date(); // Lundi courant
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  });

  // États calculés
  const weekNumber = getWeekNumber(currentDate);
  const year = currentDate.getFullYear();
  
  // Verrouillage
  const isWeekLocked = useMemo(() => assignments.some(a => a.valide === true), [assignments]);

  // --- 1. CHARGEMENT DONNÉES ---
  const fetchData = async () => {
    setLoading(true);
    
    // Récupérer les employés
    const { data: emp } = await supabase.from('employes').select('id, nom, prenom').order('nom');
    if (emp) setEmployes(emp);

    // Récupérer le planning
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
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentDate]);

  // --- 2. LOGIQUE SIGNATURE (CANVAS) ---
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
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2d3436';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    ctx?.clearRect(0, 0, canvas?.width || 0, canvas?.height || 0);
  };

  // --- 3. GÉOLOCALISATION ET VALIDATION ---
  const handleStartPointage = (task: any) => {
    if (isWeekLocked) return;
    setActiveTask(task);

    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setCurrentGPS(coords);

        // Vérification rayon (ex: 300m)
        if (task.chantiers?.latitude && task.chantiers?.longitude) {
          const dist = calculateDistance(coords.lat, coords.lng, task.chantiers.latitude, task.chantiers.longitude);
          if (dist > 300) {
            alert(`Attention : Vous êtes à ${Math.round(dist)}m du chantier. Le pointage doit être fait sur site.`);
          }
        }
        setShowBriefing(true);
      },
      () => alert("Impossible de récupérer votre position GPS. Veuillez l'activer."),
      { enableHighAccuracy: true }
    );
  };

  const submitBriefing = async () => {
    if (!briefingData.epi_ok || !briefingData.risques_ok || !briefingData.outils_ok || !briefingData.zone_ok) {
      alert("Veuillez valider tous les points de sécurité avant de pointer.");
      return;
    }

    const signatureBase64 = canvasRef.current?.toDataURL();
    
    // Envoi automatique vers module HSE
    const { error } = await supabase.from('hse_briefings').insert([{
      planning_id: activeTask.id,
      employe_id: activeTask.employe_id,
      chantier_id: activeTask.chantier_id,
      gps_data: currentGPS,
      signature: signatureBase64,
      data: briefingData,
      date: new Date().toISOString()
    }]);

    if (!error) {
      updateHours(activeTask.id, activeTask.heures.toString());
      setShowBriefing(false);
      clearSignature();
      alert("Check-in validé et signé. Bon poste !");
    }
  };

  // --- 4. CALCULS TEMPS ---
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

  // --- 5. ACTIONS STANDARDS ---
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

  return (
    <div className="min-h-screen bg-[#f0f3f4] font-['Fredoka'] p-4 md:p-6 text-gray-800 print:bg-white print:p-0">
      
      {/* BANDEAU HAUT */}
      <div className="bg-white rounded-[25px] p-4 mb-6 shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
          <div className="flex items-center gap-4">
              <div className="bg-orange-100 p-3 rounded-2xl text-orange-600"><Clock size={24} /></div>
              <div>
                  <h1 className="text-2xl font-black uppercase text-[#2d3436]">Pointage Heures</h1>
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

      {/* MODAL PRE-JOB BRIEFING */}
      {showBriefing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[30px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-orange-500 p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <ShieldCheck size={28} />
                <h2 className="text-xl font-black uppercase tracking-tight">Pre-job Briefing</h2>
              </div>
              <button onClick={() => setShowBriefing(false)}><X size={24} /></button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Position Actuelle</p>
                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <MapPin size={14} className="text-orange-500" />
                  {currentGPS ? `${currentGPS.lat.toFixed(4)}, ${currentGPS.lng.toFixed(4)}` : "Localisation..."}
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { id: 'epi_ok', label: 'EPI portés et conformes' },
                  { id: 'outils_ok', label: 'Matériel et outils vérifiés' },
                  { id: 'zone_ok', label: 'Zone de travail balisée' },
                  { id: 'risques_ok', label: 'Risques identifiés et compris' }
                ].map(item => (
                  <label key={item.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                    <span className="font-bold text-gray-700">{item.label}</span>
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded text-orange-500 focus:ring-orange-400"
                      checked={(briefingData as any)[item.id]}
                      onChange={e => setBriefingData({...briefingData, [item.id]: e.target.checked})}
                    />
                  </label>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <SignatureIcon size={12} /> Signature Employé
                  </label>
                  <button onClick={clearSignature} className="text-[10px] font-bold text-red-500 uppercase">Effacer</button>
                </div>
                <canvas 
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={() => setIsDrawing(false)}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={() => setIsDrawing(false)}
                  className="w-full h-32 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-crosshair touch-none"
                />
              </div>

              <button 
                onClick={submitBriefing}
                className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase shadow-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
              >
                <Play size={18} fill="currentColor" /> Valider et Pointer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TABLEAU PRINCIPAL */}
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
                                                  {dayTasks.map(task => {
                                                      const isAbsence = ['maladie', 'conge', 'formation', 'absence'].includes(task.type);
                                                      
                                                      if (isAbsence) {
                                                          let badgeColor = "bg-gray-100 text-gray-500";
                                                          if(task.type === 'maladie') badgeColor = "bg-red-100 text-red-500";
                                                          if(task.type === 'conge') badgeColor = "bg-orange-100 text-orange-500";
                                                          
                                                          return (
                                                              <div key={task.id} className={`text-[10px] font-black uppercase text-center p-1 rounded ${badgeColor}`}>
                                                                  {task.type}
                                                              </div>
                                                          );
                                                      }

                                                      const isAuto = task.isAuto;
                                                      return (
                                                          <div key={task.id} className="flex flex-col group/item relative">
                                                              <div className="flex items-center justify-between bg-blue-50 px-2 py-1 rounded-t border border-blue-100">
                                                                  <span className="text-[9px] font-bold uppercase truncate max-w-[60px] text-blue-800">
                                                                      {task.chantiers?.nom || 'Chantier'}
                                                                  </span>
                                                                  <button 
                                                                    onClick={() => handleStartPointage(task)}
                                                                    className="text-blue-500 hover:text-blue-700 transition-colors"
                                                                    title="Démarrer Pointage Avancé"
                                                                  >
                                                                    <Play size={10} fill="currentColor" />
                                                                  </button>
                                                              </div>
                                                              <input 
                                                                  type="number" 
                                                                  disabled={isWeekLocked}
                                                                  className={`w-full p-1 text-center font-bold text-sm outline-none border-b-2 transition-colors ${
                                                                      task.heures > (day.getDay() === 5 ? 4 : 8.5) ? 'border-red-400 bg-red-50 text-red-600' : 
                                                                      task.heures > 0 ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white'
                                                                  }`}
                                                                  value={task.heures}
                                                                  onChange={(e) => {
                                                                      const val = e.target.value;
                                                                      setAssignments(prev => prev.map(a => a.id === task.id ? { ...a, heures: val } : a));
                                                                  }}
                                                                  onBlur={(e) => updateHours(task.id, e.target.value)}
                                                              />
                                                          </div>
                                                      );
                                                  })}
                                              </div>
                                          </td>
                                      );
                                  })}
                                  <td className={`p-4 text-center font-black sticky right-0 bg-white group-hover:bg-gray-50 z-10 border-l border-gray-200 ${isOverload ? 'text-red-500' : 'text-gray-800'}`}>
                                      {total}h
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      </div>

      {/* GRAPHIQUES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
          <div className="bg-white rounded-[25px] p-6 shadow-sm border border-gray-200 print:border-none print:shadow-none">
              <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black uppercase text-gray-700 text-sm">Répartition Heures / Chantier</h3>
                  <FileSpreadsheet size={18} className="text-gray-400"/>
              </div>
              <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f2f6"/>
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{fill: 'transparent'}}/>
                          <Bar dataKey="heures" fill="#0984e3" radius={[0, 4, 4, 0]} barSize={20}>
                              {chartData.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={["#0984e3", "#00b894", "#6c5ce7", "#e17055"][index % 4]} />
                              ))}
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>

          <div className="bg-white rounded-[25px] p-6 shadow-sm border border-gray-200 flex flex-col justify-center gap-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div>
                      <p className="text-xs font-bold text-gray-400 uppercase">Total Heures Semaine</p>
                      <p className="text-3xl font-black text-[#2d3436]">
                          {Object.values(employeeTotals).reduce((a, b) => a + b, 0)}h
                      </p>
                  </div>
                  <div className="bg-white p-3 rounded-xl shadow-sm text-gray-400"><Clock size={24}/></div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div>
                      <p className="text-xs font-bold text-gray-400 uppercase">Employés Actifs</p>
                      <p className="text-3xl font-black text-[#00b894]">{Object.keys(employeeTotals).length}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl shadow-sm text-[#00b894]"><HardHat size={24}/></div>
              </div>
          </div>
      </div>
    </div>
  );
}
