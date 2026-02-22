"use client";

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Megaphone, X, Save, Eye, Calendar, CheckCircle2, ChevronRight, 
  Plus, Loader2, Users, ArrowLeft, Printer, FileText, Check, MessageSquare, Trash2 
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import toast, { Toaster } from 'react-hot-toast';

// Import des thèmes de causeries
import { CAUSERIE_THEMES } from '../data';

const DOMAINES = ["SÉCURITÉ", "SÛRETÉ", "SANTÉ", "ENVIRONNEMENT", "QUALITÉ", "TECHNIQUE", "RADIOPRO"];

export default function CauseriePage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-orange-600" size={40}/></div>}>
      <CauserieContent />
    </Suspense>
  );
}

function CauserieContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chantierId = searchParams.get('cid');

  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'view'>('list');
  const [archives, setArchives] = useState<any[]>([]);
  const [equipe, setEquipe] = useState<any[]>([]);
  const [chantierInfo, setChantierInfo] = useState<any>(null);
  const [selectedCauserie, setSelectedCauserie] = useState<any>(null);

  // --- ÉTAT DU FORMULAIRE WIZARD ---
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    animateur_mode: 'list',
    animateur_selectionne: '',
    animateur_manuel: '',
    signature_animateur: '',
    domaines: [] as string[],
    themes: [] as string[],
    detail_theme: '',
    remontees: [] as { employe: string, description: string, action: string }[],
    participants: [] as { id: string, nom: string, signature: string | null }[]
  });

  const sigPad = useRef<any>(null);

  // Recharge la signature animateur si retour à l'étape 4
  useEffect(() => {
    if (step === 4 && formData.signature_animateur && sigPad.current) {
        setTimeout(() => { sigPad.current?.fromDataURL(formData.signature_animateur); }, 50);
    }
  }, [step]);

  // --- CHARGEMENT DES DONNÉES ---
  useEffect(() => {
    if (!chantierId) return;
    const loadData = async () => {
        setLoading(true);
        try {
            const [cData, eData, aData] = await Promise.all([
                supabase.from('chantiers').select('nom, client').eq('id', chantierId).single(),
                supabase.from('employes').select('id, nom, prenom, role'),
                supabase.from('chantier_causeries').select('*').eq('chantier_id', chantierId).order('date', { ascending: false })
            ]);

            if (cData.data) setChantierInfo(cData.data);
            if (eData.data) setEquipe(eData.data);
            if (aData.data) setArchives(aData.data);
        } catch (error) {
            toast.error("Erreur de chargement");
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, [chantierId]);

  // --- HELPERS ---
  const toggleItem = (list: string[], item: string, setter: any) => {
      setter(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  const handleParticipantToggle = (emp: any) => {
      const exists = formData.participants.find(p => p.id === emp.id);
      if (exists) {
          setFormData({ ...formData, participants: formData.participants.filter(p => p.id !== emp.id) });
      } else {
          setFormData({ ...formData, participants: [...formData.participants, { id: emp.id, nom: `${emp.prenom} ${emp.nom}`, signature: null }] });
      }
  };

  const updateParticipantSignature = (id: string, sigData: string | null) => {
      setFormData({ ...formData, participants: formData.participants.map(p => p.id === id ? { ...p, signature: sigData } : p) });
  };

  const addRemontee = () => {
      setFormData({ ...formData, remontees: [...formData.remontees, { employe: '', description: '', action: '' }] });
  };

  const updateRemontee = (idx: number, field: string, value: string) => {
      const newRem = [...formData.remontees];
      newRem[idx] = { ...newRem[idx], [field]: value };
      setFormData({ ...formData, remontees: newRem });
  };

  const removeRemontee = (idx: number) => {
      setFormData({ ...formData, remontees: formData.remontees.filter((_, i) => i !== idx) });
  };

  // --- SAUVEGARDE ---
  const handleSave = async () => {
    const finalAnimateur = formData.animateur_mode === 'list' ? formData.animateur_selectionne : formData.animateur_manuel;
    if (!formData.signature_animateur) return toast.error("La signature de l'animateur est requise.");
    
    const toastId = toast.loading("Enregistrement de la causerie...");

    const payload = {
        chantier_id: chantierId,
        date: formData.date,
        animateur: finalAnimateur,
        domaines: formData.domaines,
        themes: formData.themes,
        detail_theme: formData.detail_theme,
        remontees: formData.remontees,
        signatures: { animateur: formData.signature_animateur, equipe: formData.participants }
    };

    const { error } = await supabase.from('chantier_causeries').insert([payload]);
    
    if (error) {
        toast.error("Erreur d'enregistrement : " + error.message, { id: toastId });
    } else { 
        toast.success("✅ Minute Sécurité enregistrée !", { id: toastId }); 
        const { data } = await supabase.from('chantier_causeries').select('*').eq('chantier_id', chantierId).order('date', { ascending: false });
        if(data) setArchives(data);
        
        setView('list'); 
        setStep(1); 
        setFormData({
            date: new Date().toISOString().split('T')[0], animateur_mode: 'list', animateur_selectionne: '', animateur_manuel: '', signature_animateur: '',
            domaines: [], themes: [], detail_theme: '', remontees: [], participants: []
        });
    }
  };

  if (!chantierId) return <div className="p-10 text-center font-black uppercase text-red-500">Erreur : Aucun chantier sélectionné.</div>;
  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-gray-500"><Loader2 className="animate-spin text-orange-600 mr-3"/> Chargement...</div>;

  // ==========================================================================
  // VUE 1 : LISTE DES ARCHIVES
  // ==========================================================================
  if (view === 'list') {
    return (
      <div className="min-h-screen bg-[#f8f9fa] p-4 md:p-8 font-['Fredoka'] text-gray-800">
        <Toaster position="bottom-right" />
        <div className="max-w-5xl mx-auto bg-white rounded-[40px] p-8 shadow-sm border border-gray-100">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h2 className="text-3xl font-black uppercase text-[#2d3436] tracking-tighter flex items-center gap-3">
                        <Megaphone className="text-orange-500" size={36}/> Minute Sécurité (Causerie)
                    </h2>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Chantier : <span className="text-orange-500">{chantierInfo?.nom}</span></p>
                    <button onClick={() => router.push('/hse')} className="text-xs font-bold text-gray-400 hover:text-black mt-3 flex items-center gap-1 transition-colors">← Retour au Dashboard</button>
                </div>
                <button onClick={() => { setView('create'); setStep(1); }} className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-2xl font-black uppercase flex items-center gap-2 transition-all shadow-lg active:scale-95">
                    <Plus size={20}/> Nouvelle Causerie
                </button>
            </div>

            <div className="space-y-4">
                {archives.length === 0 && (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <Megaphone size={60} className="mx-auto text-gray-300 mb-4"/>
                        <p className="text-gray-400 font-black uppercase text-xl">Aucune causerie animée</p>
                        <p className="text-gray-400 font-bold text-sm mt-1">Lancez une causerie pour informer votre équipe.</p>
                    </div>
                )}
                {archives.map(a => (
                    <div key={a.id} className="flex flex-col md:flex-row justify-between md:items-center p-6 bg-gray-50 rounded-3xl border border-gray-100 hover:bg-white hover:shadow-lg transition-all group">
                        <div className="mb-4 md:mb-0">
                            <p className="font-black text-gray-800 text-lg uppercase leading-tight mb-1">{a.themes?.join(', ') || "Thème non défini"}</p>
                            <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                                <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-200"><Calendar size={12}/> {new Date(a.date).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-200 uppercase text-orange-600"><MessageSquare size={12}/> {a.remontees?.length || 0} Retours</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="bg-orange-50 text-orange-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-orange-100">
                                {a.signatures?.equipe?.length || 0} Participant(s)
                            </span>
                            <button onClick={() => { setSelectedCauserie(a); setView('view'); }} className="bg-white p-3 rounded-xl text-gray-400 hover:text-orange-500 border border-gray-200 shadow-sm transition-all" title="Voir / Imprimer">
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
  // VUE 2 : VISIONNEUSE / IMPRESSION
  // ==========================================================================
  if (view === 'view' && selectedCauserie) {
      return (
          <div className="min-h-screen bg-gray-100 font-sans text-gray-900 p-4 md:p-8">
              <style dangerouslySetInnerHTML={{__html: `
                @media print {
                  @page { size: A4 portrait; margin: 10mm; }
                  body * { visibility: hidden; }
                  .print-container, .print-container * { visibility: visible; }
                  .print-container { position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; margin: 0; padding: 0; box-shadow: none; border: none; }
                  .no-print { display: none !important; }
                  table { width: 100%; border-collapse: collapse; }
                  th, td { border: 1px solid #000; padding: 8px; font-size: 12px; }
                  th { background-color: #f3f4f6 !important; font-weight: bold; }
                }
              `}}/>

              <div className="max-w-4xl mx-auto mb-6 flex justify-between gap-4 no-print">
                  <button onClick={() => setView('list')} className="flex items-center gap-2 text-gray-500 font-bold hover:text-black bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200"><ArrowLeft size={18}/> Retour</button>
                  <button onClick={() => setTimeout(() => window.print(), 300)} className="bg-[#2d3436] hover:bg-black text-white px-6 py-2.5 rounded-xl font-black uppercase text-xs flex items-center gap-2 shadow-lg transition-all"><Printer size={16}/> Imprimer Causerie</button>
              </div>

              <div className="print-container max-w-4xl mx-auto bg-white rounded-xl shadow-2xl p-10">
                  <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
                      <div>
                          <h1 className="text-2xl font-black uppercase tracking-tight">RAPPORT DE CAUSERIE QSSE</h1>
                          <h2 className="text-sm font-bold text-gray-600 uppercase mt-1">Chantier : {chantierInfo?.nom}</h2>
                      </div>
                      <div className="text-right">
                          <p className="text-sm font-bold uppercase border border-black px-3 py-1 inline-block">Date : {new Date(selectedCauserie.date).toLocaleDateString()}</p>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm font-bold border border-black p-4 bg-gray-50 mb-6">
                      <div><span className="text-gray-500 uppercase mr-2">Animateur :</span> {selectedCauserie.animateur}</div>
                      <div className="col-span-2"><span className="text-gray-500 uppercase mr-2">Domaines :</span> {selectedCauserie.domaines?.join(' / ')}</div>
                  </div>

                  <div className="mb-6">
                      <h3 className="text-sm font-black uppercase mb-2 bg-gray-100 p-2 border border-black">1. Thèmes abordés</h3>
                      <div className="flex flex-wrap gap-2 mb-3">
                          {selectedCauserie.themes?.map((t: string) => <span key={t} className="border border-gray-400 px-3 py-1 text-xs font-bold">{t}</span>)}
                      </div>
                      <p className="text-xs font-bold text-gray-700 p-3 border border-gray-300 bg-gray-50 whitespace-pre-line">{selectedCauserie.detail_theme || "Aucun détail supplémentaire."}</p>
                  </div>

                  <div className="mb-8">
                      <h3 className="text-sm font-black uppercase mb-2 bg-gray-100 p-2 border border-black">2. Échanges & Remontées d'informations</h3>
                      {selectedCauserie.remontees?.length > 0 ? (
                          <table className="w-full text-sm">
                              <thead><tr><th className="w-[20%] text-left">Par Qui ?</th><th className="w-[50%] text-left">Détail</th><th className="w-[30%] text-left">Suite à donner / Action</th></tr></thead>
                              <tbody>
                                  {selectedCauserie.remontees.map((r: any, i: number) => (
                                      <tr key={i}><td className="font-bold text-xs uppercase">{r.employe}</td><td className="text-xs italic">{r.description}</td><td className="text-xs text-red-600 font-bold">{r.action}</td></tr>
                                  ))}
                              </tbody>
                          </table>
                      ) : <p className="text-xs italic text-gray-500">Aucune remontée lors de cette causerie.</p>}
                  </div>

                  <div className="border border-black">
                      <div className="bg-gray-100 border-b border-black p-2 font-black uppercase text-sm flex justify-between">
                          <span>Émargement de l'équipe ({selectedCauserie.signatures?.equipe?.length || 0})</span>
                      </div>
                      <div className="grid grid-cols-2 gap-0">
                          {(selectedCauserie.signatures?.equipe || []).map((p:any, i:number) => (
                              <div key={i} className="border-b border-r border-gray-200 p-3 flex justify-between items-center h-20">
                                  <span className="text-xs font-bold uppercase">{p.nom}</span>
                                  {p.signature ? <img src={p.signature} className="h-full max-w-[100px]" /> : <span className="text-[10px] text-gray-300">Non signé</span>}
                              </div>
                          ))}
                      </div>
                      <div className="border-t border-black bg-gray-50 p-2 flex justify-between items-center h-24">
                          <span className="font-black uppercase text-xs ml-4">Validation Animateur :</span>
                          {selectedCauserie.signatures?.animateur && <img src={selectedCauserie.signatures.animateur} className="h-full mr-4" />}
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // ==========================================================================
  // VUE 3 : CRÉATION WIZARD (5 ÉTAPES)
  // ==========================================================================
  return (
    <div className="min-h-screen bg-[#2d3436] p-4 md:p-8 font-['Fredoka'] flex items-center justify-center text-gray-800">
        <Toaster position="top-center" />
        <div className="w-full max-w-5xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col min-h-[800px] animate-in zoom-in-95 duration-300">
            
            <div className="bg-orange-500 p-8 text-white relative">
                <button onClick={() => setView('list')} className="absolute top-8 left-8 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><X size={20}/></button>
                <div className="text-center">
                    <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center justify-center gap-3"><Megaphone className="text-white"/> Causerie QSSE</h1>
                    <p className="text-[10px] font-bold text-orange-200 uppercase tracking-[0.2em] mt-2">Animation & Sensibilisation</p>
                </div>
            </div>

            <div className="flex h-2 bg-gray-100">
                {[1,2,3,4,5].map(s => <div key={s} className={`flex-1 transition-all duration-700 ${step >= s ? 'bg-orange-500' : 'bg-transparent'}`}></div>)}
            </div>

            <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
                
                {/* --- ETAPE 1 : CONTEXTE --- */}
                {step === 1 && (
                    <div className="space-y-8 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-orange-500 inline-block pb-1">1. Contexte & Équipe</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Animateur</label>
                                {formData.animateur_mode === 'list' ? (
                                    <select className="w-full p-4 bg-white rounded-2xl font-bold text-sm outline-none border border-gray-100 shadow-sm" value={formData.animateur_selectionne} onChange={(e) => { if (e.target.value === 'custom') setFormData({...formData, animateur_mode: 'manual', animateur_selectionne: ''}); else setFormData({...formData, animateur_selectionne: e.target.value}); }}>
                                        <option value="">-- Sélectionner l'animateur --</option>
                                        {equipe.map((e:any) => <option key={e.id} value={`${e.nom} ${e.prenom}`}>{e.nom} {e.prenom} ({e.role})</option>)}
                                        <option value="custom" className="font-black text-blue-600">➕ AUTRE (Saisie Manuelle)...</option>
                                    </select>
                                ) : (
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="Nom Prénom..." className="w-full p-4 bg-white rounded-2xl font-bold text-sm outline-none border border-gray-100" value={formData.animateur_manuel} onChange={(e) => setFormData({...formData, animateur_manuel: e.target.value})} autoFocus />
                                        <button onClick={() => setFormData({...formData, animateur_mode: 'list'})} className="p-4 bg-gray-200 rounded-2xl"><X size={20}/></button>
                                    </div>
                                )}
                            </div>
                            <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Date</label><input type="date" className="w-full p-4 bg-white rounded-2xl font-bold text-sm border border-gray-100 outline-none" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} /></div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-4 flex items-center gap-2"><Users size={14}/> Sélectionner l'équipe présente</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {equipe.map(emp => {
                                    const isSelected = formData.participants.some(p => p.id === emp.id);
                                    return (
                                        <div key={emp.id} onClick={() => handleParticipantToggle(emp)} className={`p-3 rounded-xl border-2 cursor-pointer text-xs font-bold transition-all flex justify-between items-center ${isSelected ? 'bg-orange-50 border-orange-500 text-orange-800' : 'bg-white border-gray-100 text-gray-500'}`}>
                                            <span className="truncate">{emp.prenom} {emp.nom}</span>{isSelected && <CheckCircle2 size={16} className="text-orange-500 shrink-0"/>}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-4">Domaines abordés</label>
                            <div className="flex flex-wrap gap-2">
                                {DOMAINES.map(d => (
                                    <button key={d} onClick={() => toggleItem(formData.domaines, d, (v:any)=>setFormData({...formData, domaines:v}))} className={`px-4 py-2 rounded-xl text-xs font-black uppercase border-2 transition-all ${formData.domaines.includes(d) ? 'bg-orange-500 border-orange-500 text-white shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:border-orange-300'}`}>{d}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- ETAPE 2 : THEMES --- */}
                {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-orange-500 inline-block pb-1">2. Thèmes de la Causerie</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {CAUSERIE_THEMES.map(t => (
                                <div key={t} onClick={() => toggleItem(formData.themes, t, (v:any)=>setFormData({...formData, themes:v}))} className={`p-4 rounded-2xl border-2 cursor-pointer text-sm font-bold flex justify-between items-center transition-all ${formData.themes.includes(t) ? 'bg-orange-50 text-orange-800 border-orange-500 shadow-md' : 'bg-white text-gray-600 border-gray-100 hover:border-orange-200'}`}>
                                    {t} {formData.themes.includes(t) && <CheckCircle2 size={18} className="text-orange-500"/>}
                                </div>
                            ))}
                        </div>
                        <div className="mt-6">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Descriptif détaillé (Optionnel)</label>
                            <textarea placeholder="Précisez le contexte, les points abordés..." className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-bold border-none outline-none h-32 focus:ring-2 focus:ring-orange-200" value={formData.detail_theme} onChange={e=>setFormData({...formData, detail_theme: e.target.value})}/>
                        </div>
                    </div>
                )}

                {/* --- ETAPE 3 : REMONTEES --- */}
                {step === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right-10">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-orange-500 inline-block pb-1">3. Échanges & Remontées</h3>
                            <button onClick={addRemontee} className="bg-orange-100 text-orange-700 px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-orange-200 flex items-center gap-2 transition-colors"><Plus size={14}/> Ajouter retour</button>
                        </div>
                        <p className="text-xs font-bold text-gray-500">Tracez les propositions d'amélioration ou les problèmes remontés par l'équipe.</p>

                        <div className="space-y-4">
                            {formData.remontees.length === 0 && <div className="p-10 border-2 border-dashed border-gray-200 rounded-3xl text-center text-gray-400 font-bold">Aucune remontée saisie.</div>}
                            {formData.remontees.map((rem: any, idx: number) => (
                                <div key={idx} className="bg-gray-50 p-6 rounded-3xl border border-gray-200 relative group">
                                    <button onClick={() => removeRemontee(idx)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500"><Trash2 size={18}/></button>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Par Qui ?</label>
                                            <input type="text" placeholder="Nom de la personne" className="w-full p-3 bg-white rounded-xl text-xs font-bold border border-gray-100 outline-none" value={rem.employe} onChange={(e) => updateRemontee(idx, 'employe', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Détail du retour</label>
                                            <input type="text" placeholder="Problème de matériel, idée d'amélioration..." className="w-full p-3 bg-white rounded-xl text-xs font-bold border border-gray-100 outline-none" value={rem.description} onChange={(e) => updateRemontee(idx, 'description', e.target.value)} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-orange-500 mb-1 block">Suite à donner / Plan d'action</label>
                                        <input type="text" placeholder="Action corrective prévue..." className="w-full p-3 bg-white rounded-xl text-xs font-bold border border-orange-200 outline-none focus:ring-2 focus:ring-orange-200" value={rem.action} onChange={(e) => updateRemontee(idx, 'action', e.target.value)} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- ETAPE 4 : EMARGEMENT EQUIPE --- */}
                {step === 4 && (
                    <div className="space-y-6 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-orange-500 inline-block pb-1">4. Émargement Équipe</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {formData.participants.length === 0 ? (
                                <div className="col-span-2 text-center py-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-gray-400 font-bold">Aucun participant sélectionné.</div>
                            ) : formData.participants.map(p => (
                                <ParticipantSignatureBox key={p.id} participant={p} onUpdate={(sig) => updateParticipantSignature(p.id, sig)} />
                            ))}
                        </div>
                    </div>
                )}

                {/* --- ETAPE 5 : SIGNATURE ANIMATEUR --- */}
                {step === 5 && (
                    <div className="space-y-8 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-orange-500 inline-block pb-1">5. Validation Animateur</h3>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">Signature : {formData.animateur_mode === 'list' ? formData.animateur_selectionne : formData.animateur_manuel}</label>
                            <div className="border-4 border-gray-100 rounded-[30px] h-64 bg-gray-50 relative overflow-hidden">
                                <SignatureCanvas ref={sigPad} penColor="black" canvasProps={{className: 'absolute inset-0 w-full h-full cursor-crosshair'}} />
                                <div className="absolute bottom-4 w-full text-center text-[10px] font-black uppercase text-gray-300 pointer-events-none">Signer ici</div>
                                <button onClick={()=>sigPad.current.clear()} className="absolute top-4 right-4 text-[10px] bg-white border px-3 py-1.5 rounded-lg font-black uppercase shadow-sm">Effacer</button>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* --- FOOTER NAVIGATION --- */}
            <div className="p-8 border-t border-gray-100 bg-gray-50 flex justify-between items-center rounded-b-[40px]">
                {step > 1 ? (
                    <button onClick={() => {
                        if (step === 5 && sigPad.current && !sigPad.current.isEmpty()) {
                            setFormData({...formData, signature_animateur: sigPad.current.getTrimmedCanvas().toDataURL('image/png')});
                        }
                        setStep(step-1)
                    }} className="px-6 py-4 font-black uppercase text-xs text-gray-400 hover:text-gray-800 transition-colors">Retour</button>
                ) : <div></div>}
                
                {step < 5 ? (
                    <button onClick={() => {
                        const finalAnimateur = formData.animateur_mode === 'list' ? formData.animateur_selectionne : formData.animateur_manuel;
                        if (step === 1 && !finalAnimateur) return toast.error("Animateur requis.");
                        if (step === 2 && formData.themes.length === 0) return toast.error("Sélectionnez au moins un thème.");
                        setStep(step+1);
                    }} className="bg-[#2d3436] text-white px-8 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-xl hover:bg-black transition-all">
                        Suivant <ChevronRight size={18}/>
                    </button>
                ) : (
                    <button onClick={() => {
                        if (sigPad.current && !sigPad.current.isEmpty()) {
                            setFormData({...formData, signature_animateur: sigPad.current.getTrimmedCanvas().toDataURL('image/png')});
                            setTimeout(handleSave, 100);
                        } else if (formData.signature_animateur) {
                            handleSave();
                        } else {
                            toast.error("Veuillez signer pour valider.");
                        }
                    }} className="bg-orange-500 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all">
                        <Save size={18}/> Enregistrer la Causerie
                    </button>
                )}
            </div>
        </div>
    </div>
  );
}

// --- SOUS-COMPOSANT SIGNATURE ---
function ParticipantSignatureBox({ participant, onUpdate }: { participant: any, onUpdate: (sig: string | null) => void }) {
    const padRef = useRef<any>(null);
    const saveSig = () => {
        if (padRef.current && !padRef.current.isEmpty()) onUpdate(padRef.current.getTrimmedCanvas().toDataURL('image/png'));
        else toast.error("Veuillez signer avant de valider.");
    };

    return (
        <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-3">
                <span className="font-black uppercase text-sm">{participant.nom}</span>
                {participant.signature && <span className="text-[10px] bg-green-100 text-green-600 px-2 py-1 rounded font-bold uppercase">Signé</span>}
            </div>
            {participant.signature ? (
                <div className="relative h-24 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center">
                    <img src={participant.signature} className="max-h-full" alt="Signature" />
                    <button onClick={() => onUpdate(null)} className="absolute top-2 right-2 text-[10px] bg-white border border-gray-200 px-2 py-1 rounded hover:bg-red-50 hover:text-red-500 font-bold transition-colors">Refaire</button>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    <div className="h-24 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 relative overflow-hidden">
                        <SignatureCanvas ref={padRef} penColor="blue" canvasProps={{className: 'absolute inset-0 w-full h-full cursor-crosshair'}} />
                        <div className="absolute bottom-2 w-full text-center text-[10px] font-bold text-gray-300 pointer-events-none">Signer ici</div>
                        <button onClick={() => padRef.current?.clear()} className="absolute top-2 right-2 text-[10px] bg-white border border-gray-200 px-2 py-1 rounded hover:bg-gray-100 z-10">Effacer</button>
                    </div>
                    <button onClick={saveSig} className="w-full bg-emerald-500 text-white font-bold text-xs py-2 rounded-xl hover:bg-emerald-600 transition-colors">Valider la signature</button>
                </div>
            )}
        </div>
    );
}