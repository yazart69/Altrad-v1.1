"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ChevronLeft, ChevronRight, Save, Printer, 
  Lock, Unlock, Copy, RotateCcw, AlertTriangle, 
  CheckCircle2, FileSpreadsheet, HardHat, Clock
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

export default function PointagePage() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [employes, setEmployes] = useState<any[]>([]);
  
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
  
  // Verrouillage (si au moins une tâche de la semaine est validée)
  const isWeekLocked = useMemo(() => {
      return assignments.some(a => a.valide === true);
  }, [assignments]);

  // --- 1. CHARGEMENT DONNÉES ---
  const fetchData = async () => {
    setLoading(true);
    
    // Récupérer les employés
    const { data: emp } = await supabase.from('employes').select('id, nom, prenom').order('nom');
    if (emp) setEmployes(emp);

    // Récupérer le planning de la semaine (et un peu plus large pour la sécurité)
    // On charge tout ce qui touche la semaine sélectionnée
    const startOfWeek = toLocalISOString(currentDate);
    const endOfWeekDate = new Date(currentDate);
    endOfWeekDate.setDate(endOfWeekDate.getDate() + 6);
    const endOfWeek = toLocalISOString(endOfWeekDate);

    const { data: plan } = await supabase
      .from('planning')
      .select(`
        *,
        employes (id, nom, prenom),
        chantiers (id, nom, adresse)
      `)
      .gte('date_debut', startOfWeek)
      .lte('date_debut', endOfWeek)
      .order('employe_id');

    if (plan) setAssignments(plan);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentDate]);

  // --- 2. CALCULS TEMPS ---
  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Totaux par employé
  const employeeTotals = useMemo(() => {
      const stats: any = {};
      assignments.forEach(a => {
          if (!a.heures) return;
          stats[a.employe_id] = (stats[a.employe_id] || 0) + parseFloat(a.heures);
      });
      return stats;
  }, [assignments]);

  // Données Graphique (Par Chantier)
  const chartData = useMemo(() => {
      const data: any = {};
      assignments.forEach(a => {
          if (!a.chantiers?.nom || !a.heures) return;
          data[a.chantiers.nom] = (data[a.chantiers.nom] || 0) + parseFloat(a.heures);
      });
      return Object.keys(data).map(key => ({ name: key, heures: data[key] }));
  }, [assignments]);

  // --- 3. ACTIONS ---

  // Mise à jour Heures (Blur ou Enter)
  const updateHours = async (id: string, value: string) => {
      if (isWeekLocked) return;
      const numValue = parseFloat(value) || 0;
      
      // Optimistic UI
      setAssignments(prev => prev.map(a => a.id === id ? { ...a, heures: numValue } : a));
      
      await supabase.from('planning').update({ heures: numValue }).eq('id', id);
  };

  // Verrouiller / Déverrouiller la semaine
  const toggleLockWeek = async () => {
      const newState = !isWeekLocked;
      const ids = assignments.map(a => a.id);
      
      if (ids.length > 0) {
          await supabase.from('planning').update({ valide: newState }).in('id', ids);
          fetchData();
      }
  };

  // Copier Semaine Précédente
  const copyPreviousWeek = async () => {
      if (isWeekLocked) return;
      if (!confirm("Copier les affectations de la semaine dernière ?")) return;

      // 1. Calculer dates semaine précédente
      const prevWeekStart = new Date(currentDate);
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);
      const startStr = toLocalISOString(prevWeekStart);
      
      const prevWeekEnd = new Date(prevWeekStart);
      prevWeekEnd.setDate(prevWeekEnd.getDate() + 6);
      const endStr = toLocalISOString(prevWeekEnd);

      // 2. Fetch data S-1
      const { data: prevData } = await supabase.from('planning')
          .select('*')
          .gte('date_debut', startStr)
          .lte('date_debut', endStr);

      if (!prevData || prevData.length === 0) {
          alert("Aucune donnée trouvée la semaine précédente.");
          return;
      }

      // 3. Préparer insertion S (Décalage +7 jours)
      const newEntries = prevData.map(item => {
          const oldDate = new Date(item.date_debut);
          const newDate = new Date(oldDate);
          newDate.setDate(newDate.getDate() + 7);
          const newDateStr = toLocalISOString(newDate);

          return {
              employe_id: item.employe_id,
              chantier_id: item.chantier_id,
              type: item.type,
              date_debut: newDateStr,
              date_fin: newDateStr,
              heures: item.heures, // On copie aussi les heures prévues/réalisées ? Souvent on remet 0 ou standard. Ici on copie.
              valide: false
          };
      });

      const { error } = await supabase.from('planning').insert(newEntries);
      if (error) alert("Erreur copie: " + error.message);
      else fetchData();
  };

  // Reset Semaine
  const resetWeek = async () => {
      if (isWeekLocked) return;
      if (!confirm("Remettre à zéro toutes les heures de la semaine ? (Les affectations resteront)")) return;

      const ids = assignments.map(a => a.id);
      await supabase.from('planning').update({ heures: 0 }).in('id', ids);
      fetchData();
  };

  return (
    <div className="min-h-screen bg-[#f0f3f4] font-['Fredoka'] p-4 md:p-6 text-gray-800 print:bg-white print:p-0">
      
      {/* BANDEAU HAUT */}
      <div className="bg-white rounded-[25px] p-4 mb-6 shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
          
          {/* Titre & Nav */}
          <div className="flex items-center gap-4">
              <div className="bg-orange-100 p-3 rounded-2xl text-orange-600">
                  <Clock size={24} />
              </div>
              <div>
                  <h1 className="text-2xl font-black uppercase text-[#2d3436]">Pointage Heures</h1>
                  <div className="flex items-center gap-2">
                      <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }} className="hover:bg-gray-100 p-1 rounded"><ChevronLeft size={16}/></button>
                      <span className="text-sm font-bold text-gray-500 uppercase">Semaine {weekNumber} • {year}</span>
                      <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }} className="hover:bg-gray-100 p-1 rounded"><ChevronRight size={16}/></button>
                  </div>
              </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 justify-end">
              <button onClick={copyPreviousWeek} disabled={isWeekLocked} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-black uppercase flex items-center gap-2 disabled:opacity-50">
                  <Copy size={14}/> Copier S-1
              </button>
              <button onClick={resetWeek} disabled={isWeekLocked} className="px-3 py-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl text-xs font-black uppercase flex items-center gap-2 disabled:opacity-50">
                  <RotateCcw size={14}/> R.A.Z
              </button>
              <button onClick={toggleLockWeek} className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 text-white shadow-lg transition-all ${isWeekLocked ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                  {isWeekLocked ? <><Lock size={14}/> Semaine Verrouillée</> : <><Unlock size={14}/> Valider Semaine</>}
              </button>
              <button onClick={() => window.print()} className="bg-[#2d3436] text-white p-2 rounded-xl hover:bg-black transition-colors">
                  <Printer size={18}/>
              </button>
          </div>
      </div>

      {/* HEADER IMPRESSION */}
      <div className="hidden print:block mb-6 border-b-2 border-black pb-4">
          <h1 className="text-3xl font-black uppercase">Feuille de Pointage</h1>
          <p className="text-lg font-bold">Semaine {weekNumber} / {year}</p>
      </div>

      {/* TABLEAU PRINCIPAL (LE CŒUR) */}
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
                          
                          // On vérifie si l'employé a des tâches cette semaine
                          const empTasks = assignments.filter(a => a.employe_id === emp.id);
                          if(empTasks.length === 0) return null; // Masquer si pas planifié (Optionnel)

                          return (
                              <tr key={emp.id} className="group hover:bg-gray-50 transition-colors">
                                  {/* NOM EMPLOYÉ */}
                                  <td className="p-4 sticky left-0 bg-white group-hover:bg-gray-50 z-10 border-r border-gray-100">
                                      <div className="font-black text-sm uppercase text-gray-700">{emp.nom} {emp.prenom}</div>
                                      {isOverload && <div className="text-[9px] font-bold text-red-500 flex items-center gap-1 mt-1"><AlertTriangle size={10}/> Surcharge ({total}h)</div>}
                                  </td>

                                  {/* JOURS */}
                                  {weekDays.map((day, i) => {
                                      const dateStr = toLocalISOString(day);
                                      const dayTasks = empTasks.filter(a => a.date_debut === dateStr);
                                      
                                      // Règles heures par défaut
                                      const isFriday = day.getDay() === 5;
                                      const stdHours = isFriday ? 4 : 8.5;

                                      return (
                                          <td key={i} className="p-2 border-l border-gray-100 align-top h-20">
                                              <div className="flex flex-col gap-1">
                                                  {dayTasks.map(task => (
                                                      <div key={task.id} className="flex flex-col">
                                                          <div className="flex items-center justify-between bg-blue-50 px-2 py-1 rounded-t border border-blue-100">
                                                              <span className="text-[9px] font-bold uppercase truncate max-w-[80px] text-blue-800">
                                                                  {task.chantiers?.nom || task.type}
                                                              </span>
                                                          </div>
                                                          <input 
                                                              type="number" 
                                                              disabled={isWeekLocked}
                                                              className={`w-full p-1 text-center font-bold text-sm outline-none border-b-2 transition-colors ${
                                                                  task.heures > stdHours ? 'border-red-400 bg-red-50 text-red-600' : 
                                                                  task.heures > 0 ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 
                                                                  'border-gray-200 bg-white'
                                                              }`}
                                                              placeholder="0"
                                                              defaultValue={task.heures}
                                                              onBlur={(e) => updateHours(task.id, e.target.value)}
                                                              onKeyDown={(e) => {
                                                                  if (e.key === 'Enter') {
                                                                      e.currentTarget.blur();
                                                                  }
                                                              }}
                                                          />
                                                      </div>
                                                  ))}
                                                  {dayTasks.length === 0 && (
                                                      <div className="h-full flex items-center justify-center text-gray-200 text-xs">-</div>
                                                  )}
                                              </div>
                                          </td>
                                      )
                                  })}

                                  {/* TOTAL SEMAINE */}
                                  <td className={`p-4 text-center font-black sticky right-0 bg-white group-hover:bg-gray-50 z-10 border-l border-gray-200 ${isOverload ? 'text-red-500' : 'text-gray-800'}`}>
                                      {total}h
                                  </td>
                              </tr>
                          )
                      })}
                  </tbody>
              </table>
          </div>
      </div>

      {/* GRAPHIQUES & STATS (BAS DE PAGE) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
          
          {/* GRAPHIQUE 1 : HEURES PAR CHANTIER */}
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
                          <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}/>
                          <Bar dataKey="heures" fill="#0984e3" radius={[0, 4, 4, 0]} barSize={20}>
                              {chartData.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={["#0984e3", "#00b894", "#6c5ce7", "#e17055"][index % 4]} />
                              ))}
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* STATS RAPIDES */}
          <div className="bg-white rounded-[25px] p-6 shadow-sm border border-gray-200 flex flex-col justify-center gap-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div>
                      <p className="text-xs font-bold text-gray-400 uppercase">Total Heures Semaine</p>
                      <p className="text-3xl font-black text-[#2d3436]">
                          {Object.values(employeeTotals).reduce((a: any, b: any) => a + b, 0)}h
                      </p>
                  </div>
                  <div className="bg-white p-3 rounded-xl shadow-sm text-gray-400">
                      <Clock size={24}/>
                  </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div>
                      <p className="text-xs font-bold text-gray-400 uppercase">Employés Actifs</p>
                      <p className="text-3xl font-black text-[#00b894]">
                          {Object.keys(employeeTotals).length}
                      </p>
                  </div>
                  <div className="bg-white p-3 rounded-xl shadow-sm text-[#00b894]">
                      <HardHat size={24}/>
                  </div>
              </div>
          </div>

      </div>
    </div>
  );
}
