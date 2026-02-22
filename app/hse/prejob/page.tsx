"use client";

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ClipboardCheck, Shield, User, Check, X, Save, 
  Eye, Calendar, CheckCircle2, ChevronRight, Plus, Loader2,
  AlertTriangle, HardHat, Info
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import toast, { Toaster } from 'react-hot-toast';

// Import de notre nouveau référentiel métier
import { RISK_DATABASE, EPI_DATABASE } from '../data'; 

// ============================================================================
// COMPOSANT WRAPPER (Pour gérer le useSearchParams)
// ============================================================================
export default function PreJobPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-red-600" size={40}/></div>}>
      <PreJobContent />
    </Suspense>
  );
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================
function PreJobContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chantierId = searchParams.get('cid');

  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create'>('list');
  const [archives, setArchives] = useState<any[]>([]);
  const [equipe, setEquipe] = useState<any[]>([]);
  const [chantierInfo, setChantierInfo] = useState<any>(null);

  // --- ÉTAT DU FORMULAIRE WIZARD ---
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    animateur_selectionne: '',
    taches_principales: [] as string[],
    risques_selectionnes: [] as string[],
    epi_specifiques: [] as string[],
    mesures_specifiques: '',
  });
  
  const sigPad = useRef<any>(null);

  // --- CHARGEMENT DES DONNÉES ---
  useEffect(() => {
    if (!chantierId) return;
    const loadData = async () => {
        setLoading(true);
        try {
            const [cData, eData, aData] = await Promise.all([
                supabase.from('chantiers').select('nom, client').eq('id', chantierId).single(),
                supabase.from('employes').select('id, nom, prenom, role'),
                supabase.from('chantier_prejobs').select('*').eq('chantier_id', chantierId).order('date', { ascending: false })
            ]);

            if (cData.data) setChantierInfo(cData.data);
            if (eData.data) setEquipe(eData.data);
            if (aData.data) setArchives(aData.data);
        } catch (error) {
            toast.error("Erreur de chargement des données");
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, [chantierId]);

  // --- HELPERS ---
  const toggleItem = (list: string[], item: string) => list.includes(item) ? list.filter(i => i !== item) : [...list, item];

  // Regrouper les tâches uniques pour l'affichage
  const uniqueTasks = Array.from(new Set(RISK_DATABASE.map(r => r.task)));

  // Obtenir les risques liés aux tâches sélectionnées (Plus logistique de base)
  const relevantRisks = RISK_DATABASE.filter(r => formData.taches_principales.includes(r.task) || r.category === 'Logistique');

  // --- SAUVEGARDE ---
  const handleSave = async () => {
    if (!formData.animateur_selectionne) return toast.error("Veuillez sélectionner un animateur.");
    if (sigPad.current?.isEmpty()) return toast.error("La signature de l'animateur est obligatoire.");
    
    const toastId = toast.loading("Enregistrement du Pre-Job...");
    const signatureData = sigPad.current.getTrimmedCanvas().toDataURL('image/png');

    const payload = {
        chantier_id: chantierId,
        date: formData.date,
        animateur: formData.animateur_selectionne,
        tache_principale: formData.taches_principales.join(', '),
        risques_id: formData.risques_selectionnes, // On stocke les IDs des risques (ex: TCA-14)
        epi_ids: [...EPI_DATABASE.base, ...formData.epi_specifiques], // Base + Spécifiques
        mesures_specifiques: formData.mesures_specifiques,
        signatures: { animateur: signatureData }
    };

    const { error } = await supabase.from('chantier_prejobs').insert([payload]);
    
    if (error) {
        toast.error("Erreur d'enregistrement : " + error.message, { id: toastId });
    } else { 
        toast.success("✅ Pre-Job enregistré avec succès !", { id: toastId }); 
        
        // Rechargement des archives et retour liste
        const { data } = await supabase.from('chantier_prejobs').select('*').eq('chantier_id', chantierId).order('date', { ascending: false });
        if(data) setArchives(data);
        
        setView('list'); 
        setStep(1); 
        setFormData({ ...formData, taches_principales: [], risques_selectionnes: [], epi_specifiques: [], mesures_specifiques: '' });
    }
  };

  if (!chantierId) return <div className="p-10 text-center font-black uppercase text-red-500">Erreur : Aucun chantier sélectionné. Passez par le Dashboard.</div>;
  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-gray-500"><Loader2 className="animate-spin text-red-600 mr-3"/> Chargement du contexte...</div>;

  // ==========================================================================
  // VUE 1 : LISTE DES ARCHIVES PRE-JOB
  // ==========================================================================
  if (view === 'list') {
    return (
      <div className="min-h-screen bg-[#f8f9fa] p-4 md:p-8 font-['Fredoka'] text-gray-800">
        <Toaster position="bottom-right" />
        <div className="max-w-5xl mx-auto bg-white rounded-[40px] p-8 shadow-sm border border-gray-100">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h2 className="text-3xl font-black uppercase text-[#2d3436] tracking-tighter flex items-center gap-3">
                        <ClipboardCheck className="text-red-600" size={36}/> 
                        Pre-Job Briefings
                    </h2>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">
                        Chantier : <span className="text-red-500">{chantierInfo?.nom}</span>
                    </p>
                    <button onClick={() => router.push('/hse')} className="text-xs font-bold text-gray-400 hover:text-black mt-3 flex items-center gap-1 transition-colors">
                        ← Retour au Dashboard HSE
                    </button>
                </div>
                <button onClick={() => setView('create')} className="bg-[#e21118] hover:bg-black text-white px-8 py-4 rounded-2xl font-black uppercase flex items-center gap-2 transition-all shadow-lg active:scale-95">
                    <Plus size={20}/> Nouveau Briefing
                </button>
            </div>

            <div className="space-y-4">
                {archives.length === 0 && (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <ClipboardCheck size={60} className="mx-auto text-gray-300 mb-4"/>
                        <p className="text-gray-400 font-black uppercase text-xl">Aucun Pre-Job archivé</p>
                        <p className="text-gray-400 font-bold text-sm mt-1">Créez le premier briefing de la journée.</p>
                    </div>
                )}
                {archives.map(a => (
                    <div key={a.id} className="flex flex-col md:flex-row justify-between md:items-center p-6 bg-gray-50 rounded-3xl border border-gray-100 hover:bg-white hover:shadow-lg transition-all group">
                        <div className="mb-4 md:mb-0">
                            <p className="font-black text-gray-800 text-lg uppercase leading-tight mb-1">{a.tache_principale || "Briefing Général"}</p>
                            <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                                <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-200"><Calendar size={12}/> {new Date(a.date).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-200"><User size={12}/> Animateur: {a.animateur}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-red-100">
                                {a.risques_id?.length || 0} Risques identifiés
                            </span>
                            <button className="bg-white p-3 rounded-xl text-gray-400 group-hover:text-[#00b894] border border-gray-200 shadow-sm transition-all">
                                <Eye size={20}/>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // VUE 2 : CRÉATION WIZARD (Avec le nouveau data.ts)
  // ==========================================================================
  return (
    <div className="min-h-screen bg-[#2d3436] p-4 md:p-8 font-['Fredoka'] flex items-center justify-center text-gray-800">
        <Toaster position="top-center" />
        
        <div className="w-full max-w-4xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col min-h-[750px] animate-in zoom-in-95 duration-300">
            
            {/* HEADER WIZARD */}
            <div className="bg-[#e21118] p-8 text-white relative">
                <button onClick={() => setView('list')} className="absolute top-8 left-8 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><X size={20}/></button>
                <div className="text-center">
                    <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center justify-center gap-3">
                        <Shield className="text-white"/> Pre-Job Briefing
                    </h1>
                    <p className="text-[10px] font-bold text-red-200 uppercase tracking-[0.2em] mt-2">Évaluation des Risques de Terrain</p>
                </div>
            </div>

            {/* PROGRESS BAR */}
            <div className="flex h-2 bg-gray-100">
                {[1,2,3].map(s => (
                    <div key={s} className={`flex-1 transition-all duration-700 ${step >= s ? 'bg-red-600' : 'bg-transparent'}`}></div>
                ))}
            </div>

            <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
                
                {/* --- ETAPE 1 : CONTEXTE ET TÂCHES --- */}
                {step === 1 && (
                    <div className="space-y-8 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-red-500 inline-block pb-1">1. Contexte & Tâches</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Animateur (Chef d'équipe)</label>
                                <select className="w-full p-4 bg-white rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-red-200 border border-gray-100 cursor-pointer shadow-sm" 
                                        value={formData.animateur_selectionne} 
                                        onChange={e=>setFormData({...formData, animateur_selectionne: e.target.value})}>
                                    <option value="">-- Sélectionner l'animateur --</option>
                                    {equipe.map((e:any) => <option key={e.id} value={`${e.nom} ${e.prenom}`}>{e.nom} {e.prenom} ({e.role})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Date d'intervention</label>
                                <input type="date" className="w-full p-4 bg-white rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-red-200 border border-gray-100 shadow-sm" 
                                       value={formData.date} 
                                       onChange={e=>setFormData({...formData, date: e.target.value})} />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block">Tâches prévues aujourd'hui (Multi-choix)</label>
                                <div className="bg-blue-50 text-blue-500 text-[9px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1"><Info size={10}/> Définit les risques</div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {uniqueTasks.map(task => (
                                    <div key={task} 
                                         onClick={() => setFormData({...formData, taches_principales: toggleItem(formData.taches_principales, task)})} 
                                         className={`p-4 rounded-2xl border-2 cursor-pointer text-sm font-bold transition-all flex items-center justify-between ${formData.taches_principales.includes(task) ? 'bg-red-50 text-red-700 border-red-500 shadow-md' : 'bg-white text-gray-600 border-gray-100 hover:border-red-200'}`}>
                                        {task}
                                        {formData.taches_principales.includes(task) && <CheckCircle2 size={18} className="text-red-500"/>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- ETAPE 2 : RISQUES (Dynamique selon data.ts) --- */}
                {step === 2 && (
                    <div className="space-y-8 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-red-500 inline-block pb-1">2. Analyse des Risques</h3>
                        <p className="text-xs font-bold text-gray-500 bg-orange-50 p-4 rounded-2xl border border-orange-100 flex items-center gap-3">
                            <AlertTriangle className="text-orange-500" size={24}/>
                            Sélectionnez les risques applicables aux tâches choisies. (Les risques logistiques sont toujours inclus).
                        </p>

                        <div className="space-y-4">
                            {relevantRisks.map(risk => {
                                const isSelected = formData.risques_selectionnes.includes(risk.id);
                                return (
                                    <div key={risk.id} 
                                         onClick={() => setFormData({...formData, risques_selectionnes: toggleItem(formData.risques_selectionnes, risk.id)})} 
                                         className={`p-6 border-2 rounded-3xl cursor-pointer transition-all ${isSelected ? 'border-red-500 bg-white shadow-lg' : 'border-gray-100 bg-gray-50 hover:bg-white'}`}>
                                        
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg ${isSelected ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'}`}>{risk.category}</span>
                                                <h4 className={`font-black text-lg uppercase mt-2 ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>{risk.task}</h4>
                                            </div>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${isSelected ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 text-transparent'}`}>
                                                <Check size={16} strokeWidth={4}/>
                                            </div>
                                        </div>

                                        <div className={`space-y-4 ${isSelected ? 'opacity-100' : 'opacity-40'}`}>
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Risques identifiés</p>
                                                <p className="text-xs font-bold text-red-500 bg-red-50 p-2 rounded-xl">{risk.risks.join(' • ')}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Mesures de prévention (À appliquer)</p>
                                                <ul className="text-xs font-bold text-emerald-700 bg-emerald-50 p-3 rounded-xl space-y-1">
                                                    {risk.measures.map((m, i) => <li key={i} className="flex items-start gap-2"><CheckCircle2 size={12} className="mt-0.5 shrink-0"/> {m}</li>)}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* --- ETAPE 3 : EPI & VALIDATION --- */}
                {step === 3 && (
                    <div className="space-y-8 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-red-500 inline-block pb-1">3. EPI & Signature</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* EPI DE BASE (Verrouillés) */}
                            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><HardHat size={14}/> EPI de Base (Obligatoires)</h4>
                                <div className="space-y-2">
                                    {EPI_DATABASE.base.map(epi => (
                                        <div key={epi} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 opacity-70">
                                            <div className="w-5 h-5 bg-green-500 rounded flex items-center justify-center text-white"><Check size={12} strokeWidth={4}/></div>
                                            <span className="text-xs font-bold text-gray-600">{epi}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* EPI SPÉCIFIQUES (Cochables) */}
                            <div className="bg-blue-50/30 p-6 rounded-3xl border border-blue-100">
                                <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Shield size={14}/> EPI Spécifiques (Sélectionner)</h4>
                                <div className="grid grid-cols-1 gap-2">
                                    {EPI_DATABASE.specifiques.map(epi => (
                                        <div key={epi.nom} 
                                             onClick={() => setFormData({...formData, epi_specifiques: toggleItem(formData.epi_specifiques, epi.nom)})}
                                             className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.epi_specifiques.includes(epi.nom) ? 'bg-blue-100 border-blue-500 text-blue-800' : 'bg-white border-transparent text-gray-500 hover:border-blue-200'}`}>
                                            <div className={`w-5 h-5 rounded flex items-center justify-center border-2 ${formData.epi_specifiques.includes(epi.nom) ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300'}`}>
                                                {formData.epi_specifiques.includes(epi.nom) && <Check size={12} strokeWidth={4}/>}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-bold leading-tight">{epi.nom}</p>
                                                <p className="text-[9px] font-black uppercase opacity-60">{epi.usage}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* SIGNATURE */}
                        <div className="mt-8">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">Validation Animateur ({formData.animateur_selectionne || 'Non défini'})</label>
                            <div className="border-4 border-gray-100 rounded-[30px] h-48 bg-gray-50 relative overflow-hidden">
                                <SignatureCanvas ref={sigPad} penColor="black" canvasProps={{className: 'absolute inset-0 w-full h-full cursor-crosshair'}} />
                                <div className="absolute bottom-4 w-full text-center text-[10px] font-black uppercase text-gray-300 pointer-events-none tracking-widest">Signer dans le cadre</div>
                                <button onClick={()=>sigPad.current.clear()} className="absolute top-4 right-4 text-[10px] bg-white border border-gray-200 px-3 py-1.5 rounded-lg font-black uppercase hover:bg-gray-100 shadow-sm">Effacer</button>
                            </div>
                        </div>

                    </div>
                )}
            </div>

            {/* --- FOOTER NAVIGATION --- */}
            <div className="p-8 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                {step > 1 ? (
                    <button onClick={()=>setStep(step-1)} className="px-6 py-4 font-black uppercase text-xs text-gray-400 hover:text-gray-800 transition-colors">Retour</button>
                ) : <div></div>}
                
                {step < 3 ? (
                    <button onClick={() => {
                        if (step === 1 && formData.taches_principales.length === 0) {
                            return toast.error("Veuillez sélectionner au moins une tâche.");
                        }
                        setStep(step+1);
                    }} className="bg-[#2d3436] text-white px-8 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-xl hover:bg-black transition-all">
                        Suivant <ChevronRight size={18}/>
                    </button>
                ) : (
                    <button onClick={handleSave} className="bg-[#e21118] text-white px-10 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all">
                        <Save size={18}/> Enregistrer le briefing
                    </button>
                )}
            </div>
        </div>
    </div>
  );
}