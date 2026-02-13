"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, MapPin, Users, CheckSquare, Plus, Trash2, 
  Save, Printer, PenTool, Eraser, Undo, Download, 
  AlertTriangle, CheckCircle, Clock, ChevronDown, User,
  FileText, Cloud, Sun, CloudRain
} from 'lucide-react';

// ==================================================================================
// 1. DÉFINITION DU MODÈLE DE DONNÉES (MIMIC REAL DB SCHEMA)
// ==================================================================================

// Type: Chantier (Venant de la table 'Projects')
interface Project {
  id: string;
  name: string;
  address: string;
  client: string;
  progress: number; // 0-100
  budget_status: 'ok' | 'warning' | 'critical';
}

// Type: Participant (Venant de la table 'Directory')
interface Attendee {
  id: string;
  name: string;
  company: string;
  role: string;
  status: 'present' | 'absent' | 'excuse';
}

// Type: Tâche/Action (Lien vers table 'Planning')
interface Task {
  id: string;
  description: string;
  assigneeId: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  isSync: boolean; // Sync avec le planning global
}

// Type: Sujet de réunion
interface Topic {
  id: string;
  title: string;
  content: string;
  category: 'General' | 'HSE' | 'Technique' | 'Planning';
  tasks: Task[];
}

// DONNÉES SIMULÉES (À REMPLACER PAR APPEL API)
const MOCK_PROJECT: Project = {
  id: 'PRJ-2024-042',
  name: 'Résidence Les Cèdres - Bâtiment B',
  address: '42 Av. de la Libération, Lyon',
  client: 'Grand Lyon Habitat',
  progress: 65,
  budget_status: 'ok'
};

const MOCK_DIRECTORY: Attendee[] = [
  { id: 'u1', name: 'Thomas Bernard', company: 'Altrad', role: 'Conducteur Tx', status: 'present' },
  { id: 'u2', name: 'Sarah Croche', company: 'ArchiStudio', role: 'Architecte', status: 'present' },
  { id: 'u3', name: 'Marcassin BTP', company: 'Sous-Traitant', role: 'Maçonnerie', status: 'absent' },
];

// ==================================================================================
// 2. COMPOSANT PRINCIPAL
// ==================================================================================

export default function ConstructionMeetingModule() {
  // --- STATE MANAGEMENT ---
  const [project] = useState<Project>(MOCK_PROJECT);
  const [attendees, setAttendees] = useState<Attendee[]>(MOCK_DIRECTORY);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [weather, setWeather] = useState('Ensoleillé');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  
  // États UI
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'sketch'>('details');

  // États Canvas (Croquis)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#ef4444'); // Rouge chantier par défaut
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');

  // --- LIFECYCLE & PERSISTENCE (OFFLINE MODE) ---
  useEffect(() => {
    // Chargement LocalStorage au montage
    const savedData = localStorage.getItem(`MEETING_DRAFT_${project.id}`);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setTopics(parsed.topics || []);
        setAttendees(parsed.attendees || MOCK_DIRECTORY);
        // Note: Le canvas est plus complexe à restaurer, on simplifie ici pour l'exemple
      } catch (e) {
        console.error("Erreur lecture cache local", e);
      }
    }
  }, [project.id]);

  useEffect(() => {
    // Sauvegarde auto
    const payload = { topics, attendees, lastModified: new Date() };
    localStorage.setItem(`MEETING_DRAFT_${project.id}`, JSON.stringify(payload));
  }, [topics, attendees, project.id]);

  // --- LOGIQUE MÉTIER ---

  const toggleAttendance = (id: string) => {
    setAttendees(prev => prev.map(a => {
      if (a.id !== id) return a;
      const nextStatus = a.status === 'present' ? 'absent' : a.status === 'absent' ? 'excuse' : 'present';
      return { ...a, status: nextStatus };
    }));
  };

  const addTopic = () => {
    if (!newTopicTitle.trim()) return;
    const newTopic: Topic = {
      id: Date.now().toString(),
      title: newTopicTitle,
      content: '',
      category: 'Technique',
      tasks: []
    };
    setTopics([...topics, newTopic]);
    setNewTopicTitle('');
  };

 const addTaskToTopic = (topicId: string, taskDesc: string, assigneeId: string) => {
    if (!taskDesc) return;
    
    // Correction : On définit explicitement le type Task ici pour éviter l'erreur de "string"
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      description: taskDesc,
      assigneeId,
      dueDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0], // J+7
      priority: 'medium', // TypeScript accepte maintenant ceci car newTask est typé Task
      isSync: false
    };

    const updatedTopics = topics.map(t => {
      if (t.id !== topicId) return t;
      return {
        ...t,
        tasks: [...t.tasks, newTask]
      };
    });
    
    setTopics(updatedTopics);
  };

  // --- LOGIQUE CANVAS (Dessin Tactile & Souris) ---
  
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Gestion coordonnées Mobile vs Desktop
    const rect = canvas.getBoundingClientRect();
    let x, y;
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
      // Empêcher le scroll sur mobile
      // e.preventDefault(); // Attention: peut bloquer le scroll page si mal géré
    } else {
      x = (e as React.MouseEvent).clientX - rect.left;
      y = (e as React.MouseEvent).clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : brushColor;
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = (e as React.MouseEvent).clientX - rect.left;
      y = (e as React.MouseEvent).clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.closePath();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // --- RENDER HELPERS ---
  
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2);

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 font-sans print:bg-white">
      {/* ================= HEADER (Adaptatif) ================= */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 print:static print:border-none">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            
            {/* Info Chantier */}
            <div className="flex items-start gap-3">
              <div className="bg-blue-600 rounded-lg p-3 text-white print:hidden">
                <FileText size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold leading-tight text-slate-900">{project.name}</h1>
                <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                  <MapPin size={14} /> {project.address}
                  <span className="hidden sm:inline text-gray-300">|</span>
                  <span className="hidden sm:inline">Client: {project.client}</span>
                </div>
              </div>
            </div>

            {/* Actions Globales */}
            <div className="flex items-center gap-3 print:hidden">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button 
                  onClick={() => setWeather('Ensoleillé')} 
                  className={`p-2 rounded-md transition-all ${weather === 'Ensoleillé' ? 'bg-white shadow text-yellow-500' : 'text-gray-400'}`}
                ><Sun size={18}/></button>
                <button 
                  onClick={() => setWeather('Pluvieux')} 
                  className={`p-2 rounded-md transition-all ${weather === 'Pluvieux' ? 'bg-white shadow text-blue-500' : 'text-gray-400'}`}
                ><CloudRain size={18}/></button>
              </div>
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Printer size={18} />
                <span className="hidden sm:inline">Exporter PDF</span>
              </button>
            </div>
          </div>

          {/* Progress Bar (Visual Indicator) */}
          <div className="mt-4 flex items-center gap-3 print:hidden">
            <span className="text-xs font-bold text-slate-500 uppercase">Avancement</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all duration-1000" style={{ width: `${project.progress}%` }}></div>
            </div>
            <span className="text-xs font-bold text-green-600">{project.progress}%</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 print:p-0 print:max-w-none">
        
        {/* ================= LAYOUT GRID (Desktop) / STACK (Mobile) ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
          
          {/* --- COLONNE GAUCHE : CONTEXTE (3 cols) --- */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-6 print:mb-6 print:flex print:gap-6 print:items-start">
            
            {/* Carte Météo & Date (Visible Print) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 print:border-black print:flex-1">
              <h3 className="text-xs font-bold uppercase text-slate-400 mb-4 tracking-wider">Contexte</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Calendar size={20}/></div>
                  <div>
                    <label className="text-xs text-slate-500 block">Date du rapport</label>
                    <input 
                      type="date" 
                      value={meetingDate}
                      onChange={(e) => setMeetingDate(e.target.value)}
                      className="font-semibold bg-transparent outline-none text-slate-900 w-full"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-orange-50 p-2 rounded-lg text-orange-500"><Cloud size={20}/></div>
                  <div>
                    <label className="text-xs text-slate-500 block">Météo relevée</label>
                    <span className="font-semibold text-slate-900">{weather}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Carte Présences (Interactive) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 print:border-black print:flex-1">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Présences</h3>
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">{attendees.filter(a => a.status === 'present').length}/{attendees.length}</span>
              </div>
              <div className="space-y-3">
                {attendees.map(person => (
                  <div key={person.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white
                        ${person.status === 'present' ? 'bg-green-600' : person.status === 'absent' ? 'bg-red-400' : 'bg-orange-400'}`}>
                        {getInitials(person.name)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 leading-none">{person.name}</p>
                        <p className="text-xs text-slate-500">{person.role}</p>
                      </div>
                    </div>
                    {/* Toggle Button (Hidden on Print) */}
                    <button 
                      onClick={() => toggleAttendance(person.id)}
                      className="text-xs font-medium text-slate-400 hover:text-blue-600 print:hidden"
                    >
                      {person.status === 'present' ? 'Présent' : person.status === 'absent' ? 'Absent' : 'Excusé'}
                    </button>
                    {/* Static Status (Print Only) */}
                    <span className="hidden print:block text-xs font-bold uppercase">{person.status.substring(0,3)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* --- COLONNE DROITE : ORDRE DU JOUR & ACTIONS (9 cols) --- */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-6">
            
            {/* Saisie Nouveau Point (Masqué à l'impression) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 print:hidden">
              <div className="flex items-center gap-2 p-2">
                <div className="bg-slate-100 p-2 rounded-lg"><Plus size={20} className="text-slate-500"/></div>
                <input 
                  type="text" 
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTopic()}
                  placeholder="Ajouter un point à l'ordre du jour..."
                  className="flex-1 bg-transparent outline-none text-sm py-2"
                />
                <button 
                  onClick={addTopic}
                  disabled={!newTopicTitle}
                  className="bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Ajouter
                </button>
              </div>
            </div>

            {/* Liste des Points */}
            <div className="space-y-4">
              {topics.length === 0 && (
                <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-gray-300">
                  <CheckSquare size={48} className="mx-auto mb-3 opacity-20"/>
                  <p>Aucun point abordé. Commencez par en ajouter un.</p>
                </div>
              )}

              {topics.map((topic, index) => (
                <div key={topic.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:border-black print:shadow-none print:break-inside-avoid">
                  {/* Header Topic */}
                  <div className="bg-slate-50 px-5 py-3 border-b border-gray-100 flex justify-between items-center print:bg-gray-100 print:border-black">
                    <div className="flex items-center gap-3">
                      <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-1 rounded print:border print:border-black">#{index + 1}</span>
                      <h3 className="font-bold text-slate-800">{topic.title}</h3>
                    </div>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded
                      ${topic.category === 'HSE' ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                      {topic.category}
                    </span>
                  </div>

                  {/* Content & Actions */}
                  <div className="p-5">
                    <textarea 
                      placeholder="Notes, observations et décisions..."
                      className="w-full text-sm text-slate-600 bg-transparent resize-y outline-none min-h-[60px] print:text-black"
                      value={topic.content}
                      onChange={(e) => {
                        const newTopics = [...topics];
                        newTopics[index].content = e.target.value;
                        setTopics(newTopics);
                      }}
                    />

                    {/* Task List inside Topic */}
                    <div className="mt-4 space-y-2">
                      {topic.tasks.map(task => (
                        <div key={task.id} className="flex items-center gap-3 bg-yellow-50/50 p-2 rounded-lg border border-yellow-100 print:border-gray-300 print:bg-white">
                          <div className={`w-2 h-2 rounded-full ${task.isSync ? 'bg-green-500' : 'bg-yellow-500'}`} title="Sync Status"/>
                          <span className="flex-1 text-xs font-medium text-slate-700">{task.description}</span>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <User size={12}/>
                            <span className="font-bold">{attendees.find(a => a.id === task.assigneeId)?.name || 'Non assigné'}</span>
                            <span className="bg-white border border-gray-200 px-1 rounded">{new Date(task.dueDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Task Bar (Hidden Print) */}
                    <div className="mt-3 pt-3 border-t border-gray-50 flex gap-2 print:hidden">
                      <input 
                        type="text" 
                        placeholder="Nouvelle action..."
                        className="flex-1 text-xs bg-gray-50 rounded px-2 py-1 outline-none"
                        id={`task-input-${topic.id}`}
                        onKeyDown={(e) => {
                          if(e.key === 'Enter') {
                            const input = e.target as HTMLInputElement;
                            addTaskToTopic(topic.id, input.value, attendees[0].id);
                            input.value = '';
                          }
                        }}
                      />
                      <select 
                        className="text-xs bg-gray-50 rounded px-2 outline-none"
                        id={`task-assignee-${topic.id}`}
                      >
                        {attendees.map(a => <option key={a.id} value={a.id}>{getInitials(a.name)}</option>)}
                      </select>
                      <button 
                        onClick={() => {
                          const input = document.getElementById(`task-input-${topic.id}`) as HTMLInputElement;
                          const select = document.getElementById(`task-assignee-${topic.id}`) as HTMLSelectElement;
                          addTaskToTopic(topic.id, input.value, select.value);
                          input.value = '';
                        }}
                        className="text-xs bg-slate-800 text-white px-2 rounded hover:bg-slate-700"
                      >
                        + Action
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ================= ZONE BASSE : CROQUIS & SIGNATURE ================= */}
        
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-black print:mt-4 print:break-inside-avoid">
          <div className="bg-slate-50 px-5 py-3 border-b border-gray-200 flex justify-between items-center print:bg-gray-100 print:border-black">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <PenTool size={18} className="text-slate-500"/>
              Croquis & Annotations
            </h3>
            {/* Toolbar (Hidden Print) */}
            <div className="flex items-center gap-2 print:hidden">
              <button onClick={() => setTool('pen')} className={`p-2 rounded ${tool === 'pen' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}><PenTool size={16}/></button>
              <button onClick={() => setTool('eraser')} className={`p-2 rounded ${tool === 'eraser' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}><Eraser size={16}/></button>
              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              <button onClick={() => setBrushColor('#ef4444')} className={`w-6 h-6 rounded-full bg-red-500 border-2 ${brushColor === '#ef4444' ? 'border-slate-800' : 'border-transparent'}`}></button>
              <button onClick={() => setBrushColor('#2563eb')} className={`w-6 h-6 rounded-full bg-blue-600 border-2 ${brushColor === '#2563eb' ? 'border-slate-800' : 'border-transparent'}`}></button>
              <button onClick={() => setBrushColor('#000000')} className={`w-6 h-6 rounded-full bg-black border-2 ${brushColor === '#000000' ? 'border-slate-800' : 'border-transparent'}`}></button>
              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              <button onClick={clearCanvas} className="text-xs text-red-500 font-medium hover:underline">Effacer tout</button>
            </div>
          </div>

          <div className="relative w-full h-80 bg-white cursor-crosshair">
             {/* Fond de plan quadrillé css */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            
            <canvas
              ref={canvasRef}
              width={1200} // Largeur fixe haute def, redimensionnée par CSS
              height={400}
              className="w-full h-full touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
        </div>

        {/* Footer Signature (Visible Print Only typically, but shown here for layout) */}
        <div className="mt-8 grid grid-cols-2 gap-8 print:mt-8">
          <div className="border-t border-black pt-2">
            <p className="text-xs font-bold uppercase mb-8">Visa Entreprise</p>
          </div>
          <div className="border-t border-black pt-2">
            <p className="text-xs font-bold uppercase mb-8">Visa Maîtrise d'Œuvre</p>
          </div>
        </div>

      </main>

      {/* Style Print Specific pour forcer le layout A4 */}
      <style jsx global>{`
        @media print {
          body { font-size: 11pt; -webkit-print-color-adjust: exact; }
          header { position: static; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          /* Forcer les sauts de page intelligents */
          .break-inside-avoid { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
