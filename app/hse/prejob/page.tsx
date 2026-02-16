"use client";

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ClipboardCheck, Users, Shield, User, Check, X, Save, 
  Trash2, FileText, ChevronRight, Plus, Eye, Calendar, HardHat
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { RISK_DATABASE } from '../data';

// --- TYPES ---
interface PrejobProps {
  chantierId: string;
  chantierNom: string;
  equipe: Array<{ id: string; nom: string; prenom: string }>;
  animateurNom: string;
}

export default function HSEPrejobModule({ chantierId, chantierNom, equipe, animateurNom }: PrejobProps) {
  const [view, setView] = useState<'list' | 'create'>('list'); 
  const [archives, setArchives] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // --- ÉTATS DU FORMULAIRE ---
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    animateur_type: 'liste', // 'liste' ou 'manuel'
    animateur_selectionne: '',
    animateur_manuel: '',
    taches_principales: [] as string[], // MULTI-CHOIX
    zone_travail: '',
    risques_selectionnes: [] as string[],
    epi_selectionnes: [] as string[],
    mesures_specifiques: '',
    participants_presents: [] as string[]
  });
  
  const sigPad = useRef<any>(null);

  // Initialisation
  useEffect(() => { 
      fetchArchives(); 
      // Pré-selection animateur si trouvé dans la liste
      if(animateurNom) setFormData(prev => ({...prev, animateur_selectionne: animateurNom}));
      // Pré-selection equipe complète
      if(equipe) setFormData(prev => ({...prev, participants_presents: equipe.map(e => e.id)}));
  }, [chantierId]);

  const fetchArchives = async () => {
    setLoading(true);
    const { data } = await supabase.from('chantier_prejobs').select('*').eq('chantier_id', chantierId).order('date', { ascending: false });
    if (data) setArchives(data);
    setLoading(false);
  };

  // --- LOGIQUE METIER ---
  const toggleTask = (task: string) => {
      const current = formData.taches_principales;
      if (current.includes(task)) setFormData({...formData, taches_principales: current.filter(t => t !== task)});
      else setFormData({...formData, taches_principales: [...current, task]});
  };

  const toggleRisk = (riskId: string) => {
    const current = formData.risques_selectionnes;
    if (current.includes(riskId)) setFormData({...formData, risques_selectionnes: current.filter(id => id !== riskId)});
    else setFormData({...formData, risques_selectionnes: [...current, riskId]});
  };

  const toggleEPI = (epi: string) => {
    const current = formData.epi_selectionnes;
    if (current.includes(epi)) setFormData({...formData, epi_selectionnes: current.filter(e => e !== epi)});
    else setFormData({...formData, epi_selectionnes: [...current, epi]});
  };

  const handleSave = async () => {
    const animateurFinal = formData.animateur_type === 'liste' ? formData.animateur_selectionne : formData.animateur_manuel;
    if (!animateurFinal) return alert("Veuillez renseigner l'animateur");
    
    const signatureData = sigPad.current ? sigPad.current.getTrimmedCanvas().toDataURL('image/png') : null;

    const payload = {
        chantier_id: chantierId,
        date: formData.date,
        animateur: animateurFinal,
        tache_principale: formData.taches_principales.join(', '), // Stocké en string pour compatibilité
        risques_id: formData.risques_selectionnes,
        epi_ids: formData.epi_selectionnes,
        mesures_specifiques: `${formData.zone_travail} - ${formData.mesures_specifiques}`,
        participants: formData.participants_presents, 
        signatures: { animateur: signatureData }
    };

    const { error } = await supabase.from('chantier_prejobs').insert([payload]);
    if (error) alert("Erreur: " + error.message);
    else { alert("✅ Enregistré !"); setView('list'); fetchArchives(); setStep(1); }
  };

  // --- VUE ARCHIVES ---
  if (view === 'list') {
      return (
          <div className="bg-white rounded-[30px] p-8 shadow-sm border border-gray-100 min-h-[600px]">
              <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black uppercase text-gray-800 flex items-center gap-3"><ClipboardCheck className="text-red-600"/> Historique Pre-Jobs</h2>
                  <button onClick={() => setView('create')} className="bg-[#e21118] text-white px-6 py-3 rounded-xl font-black uppercase flex items-center gap-2 hover:bg-red-700 transition-all"><Plus size={18}/> Nouveau</button>
              </div>
              <div className="space-y-3">
                  {archives.map(a => (
                      <div key={a.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-md transition-all">
                          <div>
                              <p className="font-black text-gray-800 text-sm">{a.tache_principale || "Activités Multiples"}</p>
                              <p className="text-xs text-gray-400 font-bold">{new Date(a.date).toLocaleDateString()} • Animé par {a.animateur}</p>
                          </div>
                          <div className="flex items-center gap-4">
                              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-[10px] font-black">{a.risques_id?.length || 0} Risques</span>
                              <button className="p-2 text-gray-400 hover:text-blue-600"><Eye size={20}/></button>
                          </div>
                      </div>
                  ))}
                  {archives.length === 0 && <div className="text-center py-10 text-gray-300 italic">Aucun historique disponible.</div>}
              </div>
          </div>
      )
  }

  // --- VUE CRÉATION ---
  return (
    <div className="max-w-5xl mx-auto bg-white rounded-[30px] shadow-xl border border-gray-100 overflow-hidden flex flex-col min-h-[700px]">
       <div className="bg-[#e21118] p-6 text-white flex justify-between items-center">
          <h1 className="text-xl font-black uppercase flex items-center gap-2"><Shield className="text-white"/> Analyse de Risques (Pre-Job)</h1>
          <button onClick={() => setView('list')} className="bg-white/20 p-2 rounded-lg"><X size={20}/></button>
       </div>

       <div className="flex-1 p-8 overflow-y-auto">
          {/* STEP 1 : CONFIGURATION */}
          {step === 1 && (
              <div className="space-y-6 animate-in slide-in-from-right-8">
                  <h3 className="text-lg font-black uppercase text-gray-700 border-b pb-2">1. Contexte & Activités</h3>
                  <div className="grid grid-cols-2 gap-6">
                      <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Animateur</label>
                          <div className="flex gap-2 mb-2">
                              <button onClick={()=>setFormData({...formData, animateur_type: 'liste'})} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${formData.animateur_type==='liste' ? 'bg-black text-white' : 'bg-white'}`}>Liste</button>
                              <button onClick={()=>setFormData({...formData, animateur_type: 'manuel'})} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${formData.animateur_type==='manuel' ? 'bg-black text-white' : 'bg-white'}`}>Manuel</button>
                          </div>
                          {formData.animateur_type === 'liste' ? (
                              <select className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm" value={formData.animateur_selectionne} onChange={e=>setFormData({...formData, animateur_selectionne: e.target.value})}>
                                  <option value="">Choisir...</option>
                                  {equipe.map(e => <option key={e.id} value={`${e.nom} ${e.prenom}`}>{e.nom} {e.prenom}</option>)}
                              </select>
                          ) : (
                              <input className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm" placeholder="Nom Prénom" value={formData.animateur_manuel} onChange={e=>setFormData({...formData, animateur_manuel: e.target.value})} />
                          )}
                      </div>
                      <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Date</label>
                          <input type="date" className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} />
                      </div>
                      <div className="col-span-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Tâches Principales (Multi-choix)</label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {Array.from(new Set(RISK_DATABASE.map(r => r.task))).map(task => (
                                  <div key={task} onClick={() => toggleTask(task)} className={`p-3 rounded-xl border cursor-pointer text-xs font-bold transition-all ${formData.taches_principales.includes(task) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                                      {task}
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* STEP 2 : RISQUES (Filtrés par tâches sélectionnées) */}
          {step === 2 && (
              <div className="space-y-6 animate-in slide-in-from-right-8">
                  <h3 className="text-lg font-black uppercase text-gray-700 border-b pb-2">2. Analyse des Risques</h3>
                  <div className="space-y-3">
                      {RISK_DATABASE.filter(r => formData.taches_principales.includes(r.task) || r.category === 'Logistique').map(risk => (
                          <div key={risk.id} onClick={() => toggleRisk(risk.id)} className={`p-4 border-2 rounded-2xl cursor-pointer transition-all ${formData.risques_selectionnes.includes(risk.id) ? 'border-red-500 bg-red-50' : 'border-gray-100 bg-white'}`}>
                              <div className="flex justify-between items-center mb-2">
                                  <span className="font-black text-gray-800 text-sm uppercase">{risk.category} - {risk.task}</span>
                                  {formData.risques_selectionnes.includes(risk.id) && <CheckCircle2 className="text-red-500" size={18}/>}
                              </div>
                              {formData.risques_selectionnes.includes(risk.id) && (
                                  <div className="grid grid-cols-2 gap-4 text-xs mt-2 pl-2 border-l-2 border-red-200">
                                      <div><span className="font-bold text-red-500">Dangers:</span> {risk.risks.join(', ')}</div>
                                      <div><span className="font-bold text-emerald-600">Mesures:</span> {risk.measures.join(', ')}</div>
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* STEP 3 : EPI & VALIDATION */}
          {step === 3 && (
              <div className="space-y-6 animate-in slide-in-from-right-8">
                   <h3 className="text-lg font-black uppercase text-gray-700 border-b pb-2">3. Protection & Signature</h3>
                   <div className="grid grid-cols-3 gap-3">
                       {["Casque", "Lunettes", "Gants", "Chaussures", "Harnais", "Masque", "Gilet", "Auditifs"].map(epi => (
                           <button key={epi} onClick={() => toggleEPI(epi)} className={`p-3 rounded-xl border font-bold text-xs uppercase ${formData.epi_selectionnes.includes(epi) ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400'}`}>{epi}</button>
                       ))}
                   </div>
                   <div className="border-2 border-dashed border-gray-300 rounded-2xl h-40 bg-gray-50 relative">
                       <SignatureCanvas ref={sigPad} penColor="black" canvasProps={{className: 'absolute inset-0 w-full h-full'}} />
                       <div className="absolute bottom-2 left-2 text-[10px] text-gray-400 uppercase font-bold pointer-events-none">Signature Animateur</div>
                       <button onClick={()=>sigPad.current.clear()} className="absolute top-2 right-2 text-xs bg-white border px-2 py-1 rounded">Effacer</button>
                   </div>
              </div>
          )}
       </div>

       <div className="p-6 border-t bg-gray-50 flex justify-between">
           {step > 1 ? <button onClick={()=>setStep(step-1)} className="px-6 py-3 font-bold text-gray-500">Retour</button> : <div></div>}
           {step < 3 ? (
               <button onClick={()=>setStep(step+1)} className="bg-black text-white px-8 py-3 rounded-xl font-black uppercase flex items-center gap-2">Suivant <ChevronRight size={16}/></button>
           ) : (
               <button onClick={handleSave} className="bg-[#e21118] text-white px-8 py-3 rounded-xl font-black uppercase flex items-center gap-2"><Save size={18}/> Terminer</button>
           )}
       </div>
    </div>
  );
}
