"use client";

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ClipboardCheck, Users, Shield, MapPin, User, Check, X, Save, PenTool, AlertCircle, 
  Trash2, MessageSquare, Camera, Printer, Clock, FileText, ChevronRight, AlertTriangle, Eye
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { RISK_DATABASE, EQUIPMENT_TYPES } from '../data'; // Import des données métiers

// --- TYPES ---
interface PrejobProps {
  chantierId: string;
  chantierNom: string;
  equipe: Array<{ id: string; nom: string; prenom: string }>;
  animateurNom: string;
}

export default function HSEPrejobModule({ chantierId, chantierNom, equipe, animateurNom }: PrejobProps) {
  const [view, setView] = useState<'list' | 'create'>('list'); // 'list' = Archives, 'create' = Nouveau
  const [archives, setArchives] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // --- ÉTATS DU FORMULAIRE DE CRÉATION ---
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    animateur: animateurNom || '',
    tache_principale: '',
    zone_travail: '',
    risques_selectionnes: [] as string[], // IDs des risques
    epi_selectionnes: [] as string[],
    mesures_specifiques: '',
    participants_presents: equipe.map(e => e.id) // Par défaut toute l'équipe
  });
  
  const sigPad = useRef<any>(null); // Ref pour la signature

  // --- CHARGEMENT DES ARCHIVES ---
  const fetchArchives = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('chantier_prejobs')
      .select('*')
      .eq('chantier_id', chantierId)
      .order('date', { ascending: false });
    
    if (data) setArchives(data);
    setLoading(false);
  };

  useEffect(() => { fetchArchives(); }, [chantierId]);

  // --- FONCTIONS UTILITAIRES ---
  const toggleRisk = (riskId: string) => {
    const current = formData.risques_selectionnes;
    if (current.includes(riskId)) setFormData({...formData, risques_selectionnes: current.filter(id => id !== riskId)});
    else setFormData({...formData, risques_selectionnes: [...current, riskId]});
  };

  const toggleEPI = (epiLabel: string) => {
    const current = formData.epi_selectionnes;
    if (current.includes(epiLabel)) setFormData({...formData, epi_selectionnes: current.filter(l => l !== epiLabel)});
    else setFormData({...formData, epi_selectionnes: [...current, epiLabel]});
  };

  const handleSave = async () => {
    if (sigPad.current.isEmpty()) return alert("La signature de l'animateur est obligatoire.");
    
    const signatureData = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
    
    const payload = {
        chantier_id: chantierId,
        date: formData.date,
        animateur: formData.animateur,
        tache_principale: formData.tache_principale,
        risques_id: formData.risques_selectionnes,
        epi_ids: formData.epi_selectionnes,
        mesures_specifiques: `${formData.zone_travail} - ${formData.mesures_specifiques}`,
        participants: formData.participants_presents, // On stocke les IDs des présents
        signatures: { animateur: signatureData } // Stockage JSON simple
    };

    const { error } = await supabase.from('chantier_prejobs').insert([payload]);
    if (error) alert("Erreur: " + error.message);
    else {
        alert("✅ Pre-Job enregistré avec succès !");
        setView('list');
        fetchArchives();
        setStep(1); // Reset
    }
  };

  // --- VUE : LISTE DES ARCHIVES ---
  if (view === 'list') {
    return (
      <div className="bg-white rounded-[30px] shadow-sm border border-gray-100 p-6 min-h-[500px]">
        <div className="flex justify-between items-center mb-8">
            <div>
                <h2 className="text-2xl font-black text-[#2d3436] uppercase flex items-center gap-2"><ClipboardCheck className="text-red-600"/> Archives Pre-Job</h2>
                <p className="text-sm font-bold text-gray-400">Historique des analyses de risques journalières</p>
            </div>
            <button onClick={() => setView('create')} className="bg-[#e21118] hover:bg-red-700 text-white px-6 py-3 rounded-xl font-black uppercase shadow-lg flex items-center gap-2 transition-transform active:scale-95">
                <Plus size={18}/> Nouveau Pre-Job
            </button>
        </div>

        <div className="space-y-3">
            {loading ? <p className="text-center py-10 font-bold text-gray-300">Chargement...</p> : archives.map((pj) => (
                <div key={pj.id} className="group flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                        <div className="bg-white p-3 rounded-xl border border-gray-100 group-hover:border-red-100 group-hover:bg-red-50 transition-colors">
                            <FileText size={24} className="text-gray-400 group-hover:text-red-500"/>
                        </div>
                        <div>
                            <p className="font-black text-gray-800 uppercase">{pj.tache_principale || "Activité Générale"}</p>
                            <p className="text-xs font-bold text-gray-400 flex items-center gap-2">
                                <Calendar size={12}/> {new Date(pj.date).toLocaleDateString()}
                                <User size={12}/> {pj.animateur}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <p className="text-xs font-bold text-gray-500 uppercase">{pj.risques_id?.length || 0} Risques identifiés</p>
                            <div className="flex gap-1 justify-end mt-1">
                                {pj.epi_ids?.slice(0, 3).map((epi: string) => (
                                    <span key={epi} className="w-2 h-2 rounded-full bg-blue-400" title={epi}></span>
                                ))}
                                {(pj.epi_ids?.length || 0) > 3 && <span className="text-[9px] text-gray-400">...</span>}
                            </div>
                        </div>
                        <button className="p-2 bg-white rounded-lg text-gray-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Eye size={20}/></button>
                    </div>
                </div>
            ))}
            {!loading && archives.length === 0 && (
                <div className="text-center py-20 bg-gray-50 rounded-[30px] border-2 border-dashed border-gray-200">
                    <ClipboardCheck size={48} className="mx-auto text-gray-300 mb-4"/>
                    <p className="font-black text-gray-400 uppercase">Aucun Pre-Job enregistré</p>
                    <button onClick={() => setView('create')} className="text-red-600 font-bold text-sm mt-2 hover:underline">Commencer maintenant</button>
                </div>
            )}
        </div>
      </div>
    );
  }
  // --- VUE : CRÉATION (STEPS) ---
  return (
    <div className="max-w-5xl mx-auto bg-white rounded-[30px] shadow-xl border border-gray-100 overflow-hidden min-h-[600px] flex flex-col">
      
      {/* HEADER FORMULAIRE */}
      <div className="bg-[#e21118] p-6 text-white flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-black uppercase flex items-center gap-2"><Shield className="text-white/80"/> Nouveau Pre-Job Briefing</h1>
          <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Analyse de risques avant poste</p>
        </div>
        <button onClick={() => setView('list')} className="bg-white/20 p-2 rounded-lg hover:bg-white/30 transition-colors"><X size={20}/></button>
      </div>

      {/* PROGRESS BAR */}
      <div className="bg-gray-100 h-1.5 w-full">
          <div className="h-full bg-red-600 transition-all duration-500 ease-out" style={{width: `${(step/4)*100}%`}}></div>
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        
        {/* ÉTAPE 1 : CONTEXTE & TÂCHE */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
             <div className="flex items-center gap-4 mb-6">
                 <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-black">1</div>
                 <h2 className="text-lg font-black uppercase text-gray-700">Contexte de l'intervention</h2>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                     <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Date & Heure</label>
                     <input type="date" className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-gray-800 outline-none focus:ring-2 ring-red-100" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                 </div>
                 <div>
                     <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Animateur (Chef d'équipe)</label>
                     <div className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-gray-800 flex items-center gap-2">
                         <User size={18} className="text-gray-400"/> {formData.animateur}
                     </div>
                 </div>
                 <div className="col-span-2">
                     <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Zone de travail précise</label>
                     <input placeholder="Ex: Zone Nord - Échafaudage Bâtiment C..." className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-gray-800 outline-none focus:ring-2 ring-red-100" value={formData.zone_travail} onChange={e => setFormData({...formData, zone_travail: e.target.value})} />
                 </div>
                 <div className="col-span-2">
                     <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Tâche Principale (Activité)</label>
                     <select className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-gray-800 outline-none cursor-pointer focus:ring-2 ring-red-100" value={formData.tache_principale} onChange={e => setFormData({...formData, tache_principale: e.target.value})}>
                         <option value="">Sélectionner l'activité du jour...</option>
                         {/* On déduit les tâches uniques depuis la base de risques */}
                         {Array.from(new Set(RISK_DATABASE.map(r => r.task))).map(task => (
                             <option key={task} value={task}>{task}</option>
                         ))}
                     </select>
                 </div>
             </div>
          </div>
        )}

        {/* ÉTAPE 2 : ANALYSE DES RISQUES (Dynamique selon Tâche) */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
             <div className="flex items-center gap-4 mb-6">
                 <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-black">2</div>
                 <div>
                    <h2 className="text-lg font-black uppercase text-gray-700">Analyse des Risques</h2>
                    <p className="text-xs text-gray-400 font-bold">Cochez les risques applicables aujourd'hui</p>
                 </div>
             </div>

             <div className="space-y-4">
                 {/* On filtre les risques liés à la tâche sélectionnée + Les risques génériques "Logistique" */}
                 {RISK_DATABASE.filter(r => r.task === formData.tache_principale || r.category === 'Logistique').map(risk => (
                     <div key={risk.id} onClick={() => toggleRisk(risk.id)} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${formData.risques_selectionnes.includes(risk.id) ? 'border-red-500 bg-red-50' : 'border-gray-100 bg-white hover:border-gray-300'}`}>
                         <div className="flex items-start gap-3">
                             <div className={`mt-1 w-5 h-5 rounded flex items-center justify-center border-2 ${formData.risques_selectionnes.includes(risk.id) ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300'}`}>
                                 {formData.risques_selectionnes.includes(risk.id) && <Check size={12} strokeWidth={4}/>}
                             </div>
                             <div className="flex-1">
                                 <div className="flex justify-between">
                                     <h4 className="font-black text-gray-800 uppercase text-sm mb-1">{risk.category} - {risk.task}</h4>
                                     <span className="text-[9px] font-black text-gray-300">{risk.id}</span>
                                 </div>
                                 
                                 {/* Affichage conditionnel des détails si sélectionné */}
                                 {formData.risques_selectionnes.includes(risk.id) && (
                                     <div className="mt-3 grid grid-cols-2 gap-4 animate-in fade-in">
                                         <div className="bg-white p-3 rounded-xl">
                                             <p className="text-[9px] font-bold text-red-400 uppercase mb-1">Dangers</p>
                                             <ul className="list-disc pl-3 text-[10px] font-bold text-gray-600 space-y-1">
                                                 {risk.risks.map((r: string) => <li key={r}>{r}</li>)}
                                             </ul>
                                         </div>
                                         <div className="bg-emerald-50 p-3 rounded-xl">
                                             <p className="text-[9px] font-bold text-emerald-600 uppercase mb-1">Mesures Prévention</p>
                                             <ul className="list-disc pl-3 text-[10px] font-bold text-emerald-800 space-y-1">
                                                 {risk.measures.map((m: string) => <li key={m}>{m}</li>)}
                                             </ul>
                                         </div>
                                     </div>
                                 )}
                             </div>
                         </div>
                     </div>
                 ))}
             </div>
          </div>
        )}
        {/* ÉTAPE 3 : EPI & MATÉRIEL */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
             <div className="flex items-center gap-4 mb-6">
                 <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-black">3</div>
                 <h2 className="text-lg font-black uppercase text-gray-700">Équipements de Protection (EPI)</h2>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                 {/* On récupère la liste des EPI depuis EQUIPMENT_TYPES ou une liste statique */}
                 {["Casque", "Lunettes", "Gants", "Chaussures Sécu", "Harnais", "Masque P3", "Gilet Haute Visibilité", "Protections Auditives"].map(epi => (
                     <div key={epi} onClick={() => toggleEPI(epi)} className={`p-4 rounded-2xl border-2 cursor-pointer flex flex-col items-center justify-center gap-2 text-center transition-all ${formData.epi_selectionnes.includes(epi) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 hover:bg-gray-50 text-gray-500'}`}>
                         <Shield size={24} className={formData.epi_selectionnes.includes(epi) ? 'text-blue-500' : 'text-gray-300'}/>
                         <span className="font-black text-xs uppercase">{epi}</span>
                     </div>
                 ))}
             </div>

             <div className="mt-8">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Consignes spécifiques / Outillage particulier</label>
                 <textarea className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-sm text-gray-800 outline-none focus:ring-2 ring-blue-100 min-h-[100px]" placeholder="Ex: Utilisation de la meuleuse interdite après 16h..." value={formData.mesures_specifiques} onChange={e => setFormData({...formData, mesures_specifiques: e.target.value})}></textarea>
             </div>
          </div>
        )}

        {/* ÉTAPE 4 : VALIDATION & SIGNATURE */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
             <div className="flex items-center gap-4 mb-6">
                 <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-black">4</div>
                 <h2 className="text-lg font-black uppercase text-gray-700">Engagement & Signature</h2>
             </div>

             <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 flex items-start gap-4">
                 <AlertCircle className="text-orange-500 shrink-0 mt-1"/>
                 <div>
                     <h4 className="font-black text-orange-800 uppercase text-sm mb-1">Engagement de l'animateur</h4>
                     <p className="text-xs text-orange-700 font-medium leading-relaxed">
                         "Je soussigné, <strong>{formData.animateur}</strong>, certifie avoir présenté les risques et les mesures de prévention à l'ensemble de l'équipe présente ce jour. J'ai vérifié l'adéquation des EPI et la compréhension des consignes."
                     </p>
                 </div>
             </div>

             <div className="space-y-2">
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Signature de l'animateur</p>
                 <div className="border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 h-40 relative overflow-hidden group hover:border-gray-400 transition-colors">
                     <SignatureCanvas 
                        ref={sigPad} 
                        penColor="black"
                        canvasProps={{className: 'absolute inset-0 w-full h-full cursor-crosshair'}} 
                     />
                     <div className="absolute top-2 right-2 flex gap-2">
                         <button onClick={() => sigPad.current.clear()} className="bg-white/80 p-1 rounded hover:bg-red-100 text-red-500 text-xs font-bold uppercase backdrop-blur-sm">Effacer</button>
                     </div>
                     <div className="absolute bottom-2 left-0 w-full text-center pointer-events-none opacity-20 text-xs font-black uppercase">Zone de signature</div>
                 </div>
             </div>

             {/* Liste des participants (Lecture seule ici, pour rappel) */}
             <div>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Participants présents ({equipe.length})</p>
                 <div className="flex flex-wrap gap-2">
                     {equipe.map(m => (
                         <span key={m.id} className="px-3 py-1 bg-gray-100 rounded-lg text-xs font-bold text-gray-600">{m.nom} {m.prenom}</span>
                     ))}
                 </div>
             </div>
          </div>
        )}

      </div>

      {/* FOOTER NAVIGATION */}
      <div className="p-6 border-t border-gray-100 bg-white flex justify-between items-center shrink-0">
          {step > 1 ? (
              <button onClick={() => setStep(step - 1)} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-colors">Retour</button>
          ) : (
              <div></div> // Spacer
          )}
          
          {step < 4 ? (
              <button onClick={() => setStep(step + 1)} disabled={step === 1 && !formData.tache_principale} className="bg-[#2d3436] text-white px-8 py-3 rounded-xl font-black uppercase shadow-lg hover:bg-black transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                  Suivant <ChevronRight size={16}/>
              </button>
          ) : (
              <button onClick={handleSave} className="bg-[#e21118] text-white px-10 py-3 rounded-xl font-black uppercase shadow-xl shadow-red-200 hover:bg-red-700 transition-transform active:scale-95 flex items-center gap-2">
                  <Save size={18}/> Valider & Archiver
              </button>
          )}
      </div>

    </div>
  );
}
