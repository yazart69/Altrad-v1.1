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
// =================================================================================================
// FORMULAIRE COMPLEXE : VISITE TERRAIN (VMT) - Identique Capture
// =================================================================================================
function VMTForm({ chantier, equipe }: any) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: { vmt: true, q3sre: false, ost: false },
    is_sous_traitant: 'non',
    domaine: '', agence: '', otp: '', site: '', local: '',
    lignes_defense: [] as any[], // Tableau dynamique
    individuel: [] as any[] // Tableau dynamique
  });

  // Gestion Lignes de défense (Tableau dynamique)
  const addLigneDefense = () => setForm({...form, lignes_defense: [...form.lignes_defense, { ligne: '', point: '', resultat: '', explication: '' }]});
  
  // Gestion Individuelle (Tableau dynamique)
  const addIndividuel = () => setForm({...form, individuel: [...form.individuel, { nom: '', epi: '', culture: '', minute: '' }]});

  return (
    <div className="bg-white rounded-[40px] shadow-lg border border-gray-200 overflow-hidden max-w-4xl mx-auto">
       <div className="bg-[#e21118] p-6 text-white"><h2 className="text-2xl font-black uppercase text-center">VISITE TERRAIN</h2></div>
       <div className="p-8 space-y-8">
          
          {/* SECTION 1: TYPE DE VISITE */}
          <div className="bg-red-50/50 p-6 rounded-2xl border border-red-100">
             <h3 className="text-xs font-black uppercase text-red-600 mb-4 border-b border-red-200 pb-2">TYPE DE VISITE</h3>
             <div className="grid grid-cols-2 gap-6">
                <div><label className="text-[10px] font-bold text-gray-500 uppercase">Date Visite *</label><input type="date" className="w-full p-2 border rounded font-bold" value={form.date} onChange={e=>setForm({...form, date:e.target.value})}/></div>
                <div>
                   <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">Type de visite terrain *</label>
                   <div className="flex gap-4">
                      <label className="flex items-center gap-2 font-bold text-xs"><input type="checkbox" checked={form.type.vmt} onChange={()=>setForm({...form, type:{...form.type, vmt:!form.type.vmt}})}/> VMT</label>
                      <label className="flex items-center gap-2 font-bold text-xs"><input type="checkbox" checked={form.type.q3sre} onChange={()=>setForm({...form, type:{...form.type, q3sre:!form.type.q3sre}})}/> Contrôle Q3SRE</label>
                   </div>
                   <label className="flex items-center gap-2 font-bold text-xs mt-2"><input type="checkbox" checked={form.type.ost} onChange={()=>setForm({...form, type:{...form.type, ost:!form.type.ost}})}/> Observation situation travail</label>
                </div>
                <div className="col-span-2">
                   <label className="text-[10px] font-bold text-gray-500 uppercase">La visite concerne-t-elle un sous-traitant ?</label>
                   <select className="w-full p-2 border rounded font-bold mt-1" value={form.is_sous_traitant} onChange={e=>setForm({...form, is_sous_traitant:e.target.value})}><option value="non">Non</option><option value="oui">Oui</option></select>
                </div>
             </div>
          </div>

          {/* SECTION 2: DESCRIPTION */}
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
             <h3 className="text-xs font-black uppercase text-gray-600 mb-4 border-b border-gray-300 pb-2">DESCRIPTION DE LA VISITE</h3>
             <div className="grid grid-cols-3 gap-4 mb-4">
                <div><label className="text-[10px] font-bold uppercase">Domaine *</label><select className="w-full p-2 border rounded" value={form.domaine} onChange={e=>setForm({...form, domaine:e.target.value})}><option>Sécurité</option><option>Qualité</option></select></div>
                <div><label className="text-[10px] font-bold uppercase">Agence *</label><select className="w-full p-2 border rounded" value={form.agence} onChange={e=>setForm({...form, agence:e.target.value})}><option>Agence Lyon</option></select></div>
                <div><label className="text-[10px] font-bold uppercase">OTP *</label><input className="w-full p-2 border rounded" value={form.otp} onChange={e=>setForm({...form, otp:e.target.value})}/></div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-bold uppercase">Identification local / équipement</label><input className="w-full p-2 border rounded" value={form.local} onChange={e=>setForm({...form, local:e.target.value})}/></div>
                <div><label className="text-[10px] font-bold uppercase">Site</label><input className="w-full p-2 border rounded" value={form.site} onChange={e=>setForm({...form, site:e.target.value})}/></div>
             </div>
          </div>

          {/* SECTION 3: COLLECTIF (Dynamique) */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
             <h3 className="text-xs font-black uppercase text-gray-600 mb-4 flex justify-between items-center">
                 <span>COLLECTIF: DÉTAIL DE LA VISITE</span>
                 <button onClick={addLigneDefense} className="bg-red-100 text-red-600 px-3 py-1 rounded text-[10px] font-black uppercase hover:bg-red-200">+ Ajouter Ligne</button>
             </h3>
             {form.lignes_defense.map((l, i) => (
                 <div key={i} className="p-4 mb-4 bg-gray-50 rounded-xl border border-gray-200">
                     <div className="grid grid-cols-2 gap-4 mb-2">
                        <select className="p-2 border rounded text-xs"><option>Technique (Matériel)</option><option>Humaine</option></select>
                        <select className="p-2 border rounded text-xs"><option>Balisage</option><option>EPI</option></select>
                     </div>
                     <textarea className="w-full p-2 border rounded text-xs h-16" placeholder="Explication du résultat..."></textarea>
                 </div>
             ))}
             {form.lignes_defense.length === 0 && <p className="text-center text-xs text-gray-400 italic">Aucune ligne de défense ajoutée.</p>}
          </div>

          {/* SECTION 4: INDIVIDUEL (Dynamique) */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
             <h3 className="text-xs font-black uppercase text-gray-600 mb-4 flex justify-between items-center">
                 <span>INDIVIDUEL: OBSERVATION</span>
                 <button onClick={addIndividuel} className="bg-red-100 text-red-600 px-3 py-1 rounded text-[10px] font-black uppercase hover:bg-red-200">+ Ajouter Observation</button>
             </h3>
             {form.individuel.map((ind, i) => (
                 <div key={i} className="p-4 mb-4 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-2 gap-4">
                     <select className="p-2 border rounded text-xs"><option>-- Nom Prénom --</option>{equipe.map((u:any)=><option key={u.id}>{u.nom} {u.prenom}</option>)}</select>
                     <input className="p-2 border rounded text-xs" placeholder="Si hors liste..."/>
                     <select className="p-2 border rounded text-xs"><option>Port EPI: OK</option><option>NOK</option></select>
                     <select className="p-2 border rounded text-xs"><option>Culture SSE: Exemplaire</option><option>À améliorer</option></select>
                 </div>
             ))}
          </div>

          <button className="w-full bg-[#e21118] text-white font-black py-4 rounded-xl uppercase shadow-lg hover:bg-black transition-all">Enregistrer la Visite</button>
       </div>
    </div>
  );
}

// =================================================================================================
// FORMULAIRE COMPLEXE : CAUSERIE QSSE - Identique Capture
// =================================================================================================
function CauserieForm({ chantier, equipe }: any) {
  const [activeTab, setActiveTab] = useState('nouveau');
  const sigPad = useRef<any>(null);

  return (
    <div className="max-w-4xl mx-auto">
       <div className="flex gap-4 mb-6">
          <button onClick={()=>setActiveTab('nouveau')} className={`px-6 py-3 rounded-xl font-black uppercase text-xs flex-1 ${activeTab==='nouveau' ? 'bg-black text-white' : 'bg-white border'}`}>Nouvelle Causerie</button>
          <button onClick={()=>setActiveTab('archives')} className={`px-6 py-3 rounded-xl font-black uppercase text-xs flex-1 ${activeTab==='archives' ? 'bg-black text-white' : 'bg-white border'}`}>Archives</button>
       </div>

       {activeTab === 'archives' ? (
          <div className="bg-white p-8 rounded-[40px] shadow-sm"><p className="text-center text-gray-400 font-bold">Liste des archives causeries...</p></div>
       ) : (
          <div className="bg-white rounded-[40px] shadow-lg border border-gray-200 overflow-hidden">
             <div className="p-8 space-y-8">
                 <div className="text-right"><h2 className="text-3xl font-black uppercase text-gray-800">CAUSERIE QSSE</h2></div>
                 
                 <div className="grid grid-cols-2 gap-6">
                    <div><label className="text-[10px] font-bold text-gray-500 uppercase">Date</label><input type="date" className="w-full p-3 border rounded-xl font-bold bg-gray-50"/></div>
                    <div><label className="text-[10px] font-bold text-red-500 uppercase">N° de dossier / OTP *</label><input type="text" className="w-full p-3 border rounded-xl font-bold bg-gray-50" placeholder="Saisir OTP..."/></div>
                 </div>

                 <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">Activité concernée</label>
                    <div className="flex flex-wrap gap-4">
                        {['Revêtement', 'Echafaudage', 'Isolation', 'PPI', 'Agencement'].map(a => (
                            <label key={a} className="flex items-center gap-2 text-xs font-bold"><input type="checkbox"/> {a}</label>
                        ))}
                        <input placeholder="Autres :" className="p-1 border-b text-xs outline-none"/>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <input placeholder="Animateur (Nom Prénom)" className="w-full p-3 border rounded-xl bg-gray-50 font-bold text-sm"/>
                    <input placeholder="Co-animateur" className="w-full p-3 border rounded-xl bg-gray-50 font-bold text-sm"/>
                 </div>

                 <div className="border-2 border-dashed border-gray-300 rounded-xl h-40 relative bg-gray-50">
                     <SignatureCanvas ref={sigPad} penColor="black" canvasProps={{className: 'absolute inset-0 w-full h-full'}} />
                     <div className="absolute top-2 left-2 text-[10px] text-gray-400 font-bold">Signature Animateur</div>
                 </div>

                 <div>
                     <label className="text-[10px] font-bold text-gray-500 uppercase">Domaines</label>
                     <select className="w-full p-3 border rounded-xl font-bold text-sm mt-1"><option>Travaux en hauteur</option><option>Risque chimique</option></select>
                 </div>

                 <div>
                     <label className="text-[10px] font-bold text-gray-500 uppercase">Type de sensibilisation</label>
                     <select className="w-full p-3 border rounded-xl font-bold text-sm mt-1"><option>Rappel des règles</option><option>Retour d'expérience (REX)</option></select>
                 </div>

                 <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl">
                     <span className="font-bold text-sm">Échange avec l'équipe ?</span>
                     <div className="flex items-center gap-2"><span className="text-xs">Non</span><div className="w-10 h-5 bg-gray-300 rounded-full relative cursor-pointer"><div className="w-5 h-5 bg-white rounded-full shadow-md absolute left-0"></div></div></div>
                 </div>

                 <div className="space-y-2">
                     <div className="flex justify-between items-center">
                         <span className="font-bold text-sm">Remontées d'information ?</span>
                         <div className="flex items-center gap-2"><span className="text-xs">Non</span><div className="w-10 h-5 bg-gray-300 rounded-full relative cursor-pointer"><div className="w-5 h-5 bg-white rounded-full shadow-md absolute left-0"></div></div></div>
                     </div>
                     <textarea className="w-full p-3 border rounded-xl text-xs h-20 bg-gray-50" placeholder="En cas de remontée d'informations du personnel..."></textarea>
                 </div>

                 <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 cursor-pointer hover:bg-white hover:border-red-400 transition-colors">
                     <p className="text-red-500 font-bold text-sm uppercase flex items-center justify-center gap-2"><Paperclip size={16}/> Select Files</p>
                     <p className="text-xs text-gray-400 mt-1">Photos de la causerie (Preuve)</p>
                 </div>

                 <div className="flex justify-between items-center pt-6 border-t">
                     <button className="text-red-500 font-bold uppercase text-xs border border-red-500 px-6 py-3 rounded-xl hover:bg-red-50">Cancel</button>
                     <button className="bg-[#e21118] text-white font-bold uppercase text-xs px-8 py-3 rounded-xl hover:bg-black transition-colors shadow-lg">Submit</button>
                 </div>
             </div>
          </div>
       )}
    </div>
  );
}
