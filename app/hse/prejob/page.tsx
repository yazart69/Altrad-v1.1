"use client";

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation'; // Navigation autonome
import { supabase } from '@/lib/supabase';
import { 
  ClipboardCheck, Shield, User, Check, X, Save, 
  Eye, Calendar, CheckCircle2, ChevronRight, Plus, Loader2
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { RISK_DATABASE } from '../data'; // Assurez-vous que data.ts est bien dans app/hse/

// Wrapper pour gérer les paramètres d'URL
export default function PreJobPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin"/></div>}>
      <PreJobContent />
    </Suspense>
  );
}

function PreJobContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chantierId = searchParams.get('cid'); // On récupère l'ID du lien

  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create'>('list');
  const [archives, setArchives] = useState<any[]>([]);
  const [equipe, setEquipe] = useState<any[]>([]);
  const [chantierInfo, setChantierInfo] = useState<any>(null);

  // --- FORMULAIRE ---
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    animateur_selectionne: '',
    taches_principales: [] as string[],
    risques_selectionnes: [] as string[],
    epi_selectionnes: [] as string[],
    mesures_specifiques: '',
  });
  const sigPad = useRef<any>(null);

  // 1. CHARGEMENT DES DONNÉES (Autonome)
  useEffect(() => {
    if (!chantierId) return;
    const loadData = async () => {
        setLoading(true);
        // Récup infos chantier + Equipe + Archives
        const [cData, eData, aData] = await Promise.all([
            supabase.from('chantiers').select('nom, client').eq('id', chantierId).single(),
            supabase.from('employes').select('id, nom, prenom'), // Idéalement filtré par chantier
            supabase.from('chantier_prejobs').select('*').eq('chantier_id', chantierId).order('date', { ascending: false })
        ]);

        if (cData.data) setChantierInfo(cData.data);
        if (eData.data) setEquipe(eData.data);
        if (aData.data) setArchives(aData.data);
        setLoading(false);
    };
    loadData();
  }, [chantierId]);

  // --- LOGIQUE MÉTIER ---
  const toggleItem = (list: string[], item: string) => list.includes(item) ? list.filter(i => i !== item) : [...list, item];

  const handleSave = async () => {
    if (!formData.animateur_selectionne) return alert("Sélectionnez un animateur.");
    
    const signatureData = sigPad.current ? sigPad.current.getTrimmedCanvas().toDataURL('image/png') : null;

    const payload = {
        chantier_id: chantierId,
        date: formData.date,
        animateur: formData.animateur_selectionne,
        tache_principale: formData.taches_principales.join(', '),
        risques_id: formData.risques_selectionnes,
        epi_ids: formData.epi_selectionnes,
        mesures_specifiques: formData.mesures_specifiques,
        signatures: { animateur: signatureData }
    };

    const { error } = await supabase.from('chantier_prejobs').insert([payload]);
    if (error) alert("Erreur: " + error.message);
    else { 
        alert("✅ Pre-Job enregistré !"); 
        // Recharger les archives
        const { data } = await supabase.from('chantier_prejobs').select('*').eq('chantier_id', chantierId).order('date', { ascending: false });
        if(data) setArchives(data);
        setView('list'); 
        setStep(1); 
    }
  };

  if (!chantierId) return <div className="p-10 text-center font-bold text-red-500">Erreur : Aucun chantier sélectionné. Passez par le Dashboard.</div>;
  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-gray-500">Chargement du contexte chantier...</div>;

  // --- VUE 1 : LISTE DES ARCHIVES ---
  if (view === 'list') {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-5xl mx-auto bg-white rounded-[30px] p-8 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-black uppercase text-gray-800 flex items-center gap-3"><ClipboardCheck className="text-red-600"/> Pre-Jobs : {chantierInfo?.nom}</h2>
                    <button onClick={() => router.back()} className="text-sm font-bold text-gray-400 hover:text-black mt-1">← Retour Dashboard</button>
                </div>
                <button onClick={() => setView('create')} className="bg-[#e21118] text-white px-6 py-3 rounded-xl font-black uppercase flex items-center gap-2 hover:bg-red-700 transition-all"><Plus size={18}/> Nouveau Briefing</button>
            </div>
            <div className="space-y-3">
                {archives.map(a => (
                    <div key={a.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-md transition-all">
                        <div>
                            <p className="font-black text-gray-800 text-sm uppercase">{a.tache_principale || "Général"}</p>
                            <p className="text-xs text-gray-400 font-bold">{new Date(a.date).toLocaleDateString()} • {a.animateur}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-[10px] font-black">{a.risques_id?.length || 0} Risques</span>
                            <Eye className="text-gray-300 hover:text-blue-500 cursor-pointer" size={20}/>
                        </div>
                    </div>
                ))}
                {archives.length === 0 && <div className="text-center py-10 text-gray-300 italic font-bold">Aucun Pre-Job archivé pour ce chantier.</div>}
            </div>
        </div>
      </div>
    );
  }

  // --- VUE 2 : CRÉATION (WIZARD) ---
  return (
    <div className="min-h-screen bg-gray-50 p-8 font-['Fredoka']">
        <div className="max-w-4xl mx-auto bg-white rounded-[30px] shadow-xl border border-gray-100 overflow-hidden flex flex-col min-h-[700px]">
            {/* Header */}
            <div className="bg-[#e21118] p-6 text-white flex justify-between items-center">
                <h1 className="text-xl font-black uppercase flex items-center gap-2"><Shield className="text-white"/> Nouveau Pre-Job</h1>
                <button onClick={() => setView('list')} className="bg-white/20 p-2 rounded-lg hover:bg-white/30"><X size={20}/></button>
            </div>

            <div className="flex-1 p-8 overflow-y-auto">
                {/* STEP 1 */}
                {step === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right-8">
                        <h3 className="text-lg font-black uppercase text-gray-700 border-b pb-2">1. Contexte</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Animateur</label>
                                <select className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm mt-1" value={formData.animateur_selectionne} onChange={e=>setFormData({...formData, animateur_selectionne: e.target.value})}>
                                    <option value="">-- Choisir --</option>
                                    {equipe.map((e:any) => <option key={e.id} value={`${e.nom} ${e.prenom}`}>{e.nom} {e.prenom}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Date</label>
                                <input type="date" className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm mt-1" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} />
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Tâches Principales (Multi-choix)</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {Array.from(new Set(RISK_DATABASE.map(r => r.task))).map(task => (
                                        <div key={task} onClick={() => setFormData({...formData, taches_principales: toggleItem(formData.taches_principales, task)})} 
                                             className={`p-3 rounded-xl border cursor-pointer text-xs font-bold transition-all ${formData.taches_principales.includes(task) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                                            {task}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right-8">
                        <h3 className="text-lg font-black uppercase text-gray-700 border-b pb-2">2. Risques & Prévention</h3>
                        <div className="space-y-3">
                            {RISK_DATABASE.filter(r => formData.taches_principales.includes(r.task) || r.category === 'Logistique').map(risk => (
                                <div key={risk.id} onClick={() => setFormData({...formData, risques_selectionnes: toggleItem(formData.risques_selectionnes, risk.id)})} 
                                     className={`p-4 border-2 rounded-2xl cursor-pointer transition-all ${formData.risques_selectionnes.includes(risk.id) ? 'border-red-500 bg-red-50' : 'border-gray-100 bg-white'}`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-black text-gray-800 text-sm uppercase">{risk.category} - {risk.task}</span>
                                        {formData.risques_selectionnes.includes(risk.id) && <CheckCircle2 className="text-red-500" size={18}/>}
                                    </div>
                                    {formData.risques_selectionnes.includes(risk.id) && (
                                        <div className="text-xs mt-2 pl-2 border-l-2 border-red-200">
                                            <p><span className="font-bold text-red-500">Danger:</span> {risk.risks.join(', ')}</p>
                                            <p className="mt-1"><span className="font-bold text-emerald-600">Mesure:</span> {risk.measures.join(', ')}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP 3 */}
                {step === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right-8">
                        <h3 className="text-lg font-black uppercase text-gray-700 border-b pb-2">3. Validation</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase">EPI Obligatoires</p>
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {["Casque", "Lunettes", "Gants", "Chaussures", "Harnais", "Masque", "Gilet", "Auditifs"].map(epi => (
                                <button key={epi} onClick={() => setFormData({...formData, epi_selectionnes: toggleItem(formData.epi_selectionnes, epi)})} 
                                        className={`p-3 rounded-xl border font-bold text-xs uppercase ${formData.epi_selectionnes.includes(epi) ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400'}`}>{epi}</button>
                            ))}
                        </div>
                        <div className="border-2 border-dashed border-gray-300 rounded-2xl h-40 bg-gray-50 relative">
                            <SignatureCanvas ref={sigPad} penColor="black" canvasProps={{className: 'absolute inset-0 w-full h-full'}} />
                            <div className="absolute bottom-2 left-2 text-[10px] text-gray-400 uppercase font-bold pointer-events-none">Signature Animateur</div>
                            <button onClick={()=>sigPad.current.clear()} className="absolute top-2 right-2 text-xs bg-white border px-2 py-1 rounded font-bold">Effacer</button>
                        </div>
                    </div>
                )}
            </div>

            {/* FOOTER */}
            <div className="p-6 border-t bg-gray-50 flex justify-between">
                {step > 1 ? <button onClick={()=>setStep(step-1)} className="px-6 py-3 font-bold text-gray-500">Retour</button> : <div></div>}
                {step < 3 ? (
                    <button onClick={()=>setStep(step+1)} className="bg-black text-white px-8 py-3 rounded-xl font-black uppercase flex items-center gap-2">Suivant <ChevronRight size={16}/></button>
                ) : (
                    <button onClick={handleSave} className="bg-[#e21118] text-white px-8 py-3 rounded-xl font-black uppercase flex items-center gap-2"><Save size={18}/> Valider</button>
                )}
            </div>
        </div>
    </div>
  );
}
