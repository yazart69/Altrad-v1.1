"use client";

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ClipboardCheck, Shield, User, Check, X, Save, 
  Eye, Calendar, CheckCircle2, ChevronRight, Plus, Loader2,
  AlertTriangle, HardHat, Info, Printer, FileText, ArrowLeft,
  Trash2, Edit3, Users
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import toast, { Toaster } from 'react-hot-toast';

import { RISK_DATABASE, EPI_DATABASE } from '../data'; 

export default function PreJobPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-red-600" size={40}/></div>}>
      <PreJobContent />
    </Suspense>
  );
}

function PreJobContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chantierId = searchParams.get('cid');

  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'view'>('list');
  const [archives, setArchives] = useState<any[]>([]);
  const [equipe, setEquipe] = useState<any[]>([]);
  const [chantierInfo, setChantierInfo] = useState<any>(null);
  
  const [selectedPreJob, setSelectedPreJob] = useState<any>(null);
  const [printLayout, setPrintLayout] = useState<'prejob' | 'adr'>('prejob');

  // --- ÉTAT DU FORMULAIRE WIZARD ---
  const [step, setStep] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    animateur_mode: 'list', 
    animateur_selectionne: '',
    animateur_manuel: '',
    signature_animateur: '', // SAUVEGARDE EN MÉMOIRE
    taches_principales: [] as string[],
    risques_selectionnes: [] as string[],
    epi_specifiques: [] as string[],
    mesures_specifiques: '',
    participants: [] as { id: string, nom: string, signature: string | null }[]
  });
  
  const sigPad = useRef<any>(null);

  // Recharge la signature de l'animateur si on revient à l'étape 3
  useEffect(() => {
      if (step === 3 && formData.signature_animateur && sigPad.current) {
          setTimeout(() => {
              sigPad.current?.fromDataURL(formData.signature_animateur);
          }, 50);
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

  const handleParticipantToggle = (emp: any) => {
      const exists = formData.participants.find(p => p.id === emp.id);
      if (exists) {
          setFormData({ ...formData, participants: formData.participants.filter(p => p.id !== emp.id) });
      } else {
          setFormData({ ...formData, participants: [...formData.participants, { id: emp.id, nom: `${emp.prenom} ${emp.nom}`, signature: null }] });
      }
  };

  const updateParticipantSignature = (id: string, sigData: string | null) => {
      setFormData({
          ...formData,
          participants: formData.participants.map(p => p.id === id ? { ...p, signature: sigData } : p)
      });
  };

  const uniqueTasks = Array.from(new Set(RISK_DATABASE.map(r => r.task)));
  const relevantRisks = RISK_DATABASE.filter(r => formData.taches_principales.includes(r.task) || r.category === 'Logistique');

  // --- ACTIONS CRUD ---
  const handleEdit = (a: any) => {
    setEditingId(a.id);
    const isAnimateurInList = equipe.some(e => `${e.nom} ${e.prenom}` === a.animateur);
    
    setFormData({
        date: a.date,
        animateur_mode: isAnimateurInList ? 'list' : 'manual',
        animateur_selectionne: isAnimateurInList ? a.animateur : '',
        animateur_manuel: !isAnimateurInList ? a.animateur : '',
        signature_animateur: a.signatures?.animateur || '',
        taches_principales: a.tache_principale ? a.tache_principale.split(', ') : [],
        risques_selectionnes: a.risques_id || [],
        epi_specifiques: (a.epi_ids || []).filter((e: string) => !EPI_DATABASE.base.includes(e)),
        mesures_specifiques: a.mesures_specifiques || '',
        participants: a.signatures?.equipe || []
    });
    
    setView('create');
    setStep(1);
  };

  const handleDelete = async (id: string) => {
      if (!confirm("⚠️ Supprimer définitivement ce Pre-Job ?")) return;
      const toastId = toast.loading("Suppression...");
      const { error } = await supabase.from('chantier_prejobs').delete().eq('id', id);
      if (!error) {
          toast.success("Pre-Job supprimé", { id: toastId });
          setArchives(prev => prev.filter(a => a.id !== id));
      } else {
          toast.error("Erreur de suppression", { id: toastId });
      }
  };

  const handleSave = async () => {
    const finalAnimateur = formData.animateur_mode === 'list' ? formData.animateur_selectionne : formData.animateur_manuel;
    
    // On utilise la signature sauvegardée en mémoire !
    if (!formData.signature_animateur) return toast.error("La signature de l'animateur est manquante.");
    
    const toastId = toast.loading("Enregistrement du Pre-Job...");

    const payload = {
        chantier_id: chantierId,
        date: formData.date,
        animateur: finalAnimateur,
        tache_principale: formData.taches_principales.join(', '),
        risques_id: formData.risques_selectionnes, 
        epi_ids: [...EPI_DATABASE.base, ...formData.epi_specifiques],
        mesures_specifiques: formData.mesures_specifiques,
        signatures: { 
            animateur: formData.signature_animateur, // Utilisation de la mémoire state
            equipe: formData.participants
        }
    };

    let error;
    if (editingId) {
        const res = await supabase.from('chantier_prejobs').update(payload).eq('id', editingId);
        error = res.error;
    } else {
        const res = await supabase.from('chantier_prejobs').insert([payload]);
        error = res.error;
    }
    
    if (error) {
        toast.error("Erreur d'enregistrement : " + error.message, { id: toastId });
    } else { 
        toast.success(editingId ? "✅ Pre-Job modifié !" : "✅ Pre-Job enregistré !", { id: toastId }); 
        const { data } = await supabase.from('chantier_prejobs').select('*').eq('chantier_id', chantierId).order('date', { ascending: false });
        if(data) setArchives(data);
        
        setView('list'); 
        setStep(1); 
        setEditingId(null);
        setFormData({ ...formData, animateur_mode: 'list', animateur_manuel: '', signature_animateur: '', taches_principales: [], risques_selectionnes: [], epi_specifiques: [], mesures_specifiques: '', participants: [] });
    }
  };

  // --- GESTION IMPRESSION ---
  const handlePrint = (layout: 'prejob' | 'adr') => {
    setPrintLayout(layout);
    setTimeout(() => { window.print(); }, 300);
  };

  if (!chantierId) return <div className="p-10 text-center font-black uppercase text-red-500">Erreur : Aucun chantier sélectionné. Passez par le Dashboard.</div>;
  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-gray-500"><Loader2 className="animate-spin text-red-600 mr-3"/> Chargement du contexte...</div>;

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
                <button onClick={() => { setEditingId(null); setView('create'); setStep(1); }} className="bg-[#e21118] hover:bg-black text-white px-8 py-4 rounded-2xl font-black uppercase flex items-center gap-2 transition-all shadow-lg active:scale-95">
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
                        <div className="flex items-center gap-2">
                            <span className="bg-red-50 text-red-600 px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-red-100 mr-2">
                                {a.risques_id?.length || 0} Risques
                            </span>
                            <button onClick={() => { setSelectedPreJob(a); setView('view'); }} className="p-3 bg-white rounded-xl text-gray-400 hover:text-blue-500 border border-gray-200 shadow-sm transition-all" title="Voir / Imprimer">
                                <Eye size={18}/>
                            </button>
                            <button onClick={() => handleEdit(a)} className="p-3 bg-white rounded-xl text-gray-400 hover:text-orange-500 border border-gray-200 shadow-sm transition-all" title="Modifier">
                                <Edit3 size={18}/>
                            </button>
                            <button onClick={() => handleDelete(a.id)} className="p-3 bg-white rounded-xl text-gray-400 hover:text-red-500 border border-gray-200 shadow-sm transition-all" title="Supprimer">
                                <Trash2 size={18}/>
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
  // VUE 2 : VISIONNEUSE / IMPRESSION (Pre-Job & ADR)
  // ==========================================================================
  if (view === 'view' && selectedPreJob) {
      const dbRisks = selectedPreJob.risques_id.map((id: string) => RISK_DATABASE.find(r => r.id === id)).filter(Boolean);

      return (
          <div className="min-h-screen bg-gray-100 font-sans text-gray-900 p-4 md:p-8">
              
              {/* LE HACK D'IMPRESSION ABSOLU */}
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

              <div className="max-w-4xl mx-auto mb-6 flex flex-col md:flex-row justify-between gap-4 no-print">
                  <button onClick={() => setView('list')} className="flex items-center gap-2 text-gray-500 font-bold hover:text-black bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200">
                      <ArrowLeft size={18}/> Retour aux archives
                  </button>
                  <div className="flex gap-2">
                      <button onClick={() => handlePrint('prejob')} className="bg-[#2d3436] hover:bg-black text-white px-6 py-2.5 rounded-xl font-black uppercase text-xs flex items-center gap-2 shadow-lg transition-all">
                          <Printer size={16}/> Imprimer PRE-JOB (Émargement)
                      </button>
                      <button onClick={() => handlePrint('adr')} className="bg-[#e21118] hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-black uppercase text-xs flex items-center gap-2 shadow-lg transition-all">
                          <FileText size={16}/> Imprimer ADR (Analyse Risques)
                      </button>
                  </div>
              </div>

              <div className="print-container max-w-4xl mx-auto bg-white rounded-xl shadow-2xl p-10">
                  
                  {/* --- LAYOUT : PRE-JOB BRIEFING --- */}
                  {printLayout === 'prejob' && (
                      <div className="space-y-8">
                          <div className="border-b-2 border-black pb-4 flex justify-between items-end">
                              <div>
                                  <h1 className="text-2xl font-black uppercase tracking-tight">PRE-JOB BRIEFING</h1>
                                  <h2 className="text-lg font-bold text-gray-600 uppercase mt-1">{chantierInfo?.nom}</h2>
                              </div>
                              <div className="text-right">
                                  <p className="text-sm font-bold uppercase border border-black px-3 py-1 inline-block">Date : {new Date(selectedPreJob.date).toLocaleDateString()}</p>
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm font-bold border border-black p-4 bg-gray-50">
                              <div><span className="text-gray-500 uppercase mr-2">Animateur :</span> {selectedPreJob.animateur}</div>
                              <div><span className="text-gray-500 uppercase mr-2">Client :</span> {chantierInfo?.client || 'N/A'}</div>
                              <div className="col-span-2"><span className="text-gray-500 uppercase mr-2">Tâches du jour :</span> {selectedPreJob.tache_principale}</div>
                          </div>

                          <div>
                              <h3 className="text-sm font-black uppercase mb-2 bg-gray-100 p-2 border border-black">Équipements de Protection Individuelle (EPI)</h3>
                              <div className="flex flex-wrap gap-2">
                                  {selectedPreJob.epi_ids.map((epi: string) => (
                                      <span key={epi} className="border border-gray-400 px-3 py-1 text-xs font-bold">{epi}</span>
                                  ))}
                              </div>
                          </div>

                          <div>
                              <h3 className="text-sm font-black uppercase mb-2 bg-gray-100 p-2 border border-black">Points de vigilance majeurs abordés</h3>
                              <ul className="list-disc pl-6 space-y-1 text-sm font-bold mt-2">
                                  {dbRisks.map((r: any) => (
                                      <li key={r.id}>{r.task} : <span className="text-red-600">{r.risks[0]}</span></li>
                                  ))}
                              </ul>
                          </div>

                          {/* SIGNATURES */}
                          <div className="mt-8 border border-black">
                              <div className="bg-gray-100 border-b border-black p-2 font-black uppercase text-sm">Émargement Animateur</div>
                              <div className="p-4 flex items-center justify-center h-24">
                                  {selectedPreJob.signatures?.animateur ? <img src={selectedPreJob.signatures.animateur} alt="Signature" className="h-full" /> : <span className="text-gray-300 italic">Non signé</span>}
                              </div>
                          </div>

                          <div className="mt-4 border border-black">
                              <div className="bg-gray-100 border-b border-black p-2 font-black uppercase text-sm">Émargement de l'équipe (Participants)</div>
                              <div className="grid grid-cols-2 gap-0">
                                  {(selectedPreJob.signatures?.equipe || []).map((p:any, i:number) => (
                                      <div key={i} className="border-b border-r border-gray-200 p-3 flex justify-between items-center h-20">
                                          <span className="text-xs font-bold uppercase">{p.nom}</span>
                                          {p.signature ? <img src={p.signature} className="h-full max-w-[100px]" /> : <span className="text-[10px] text-gray-300">Non signé</span>}
                                      </div>
                                  ))}
                                  {(!selectedPreJob.signatures?.equipe || selectedPreJob.signatures.equipe.length === 0) && (
                                      <div className="p-4 text-sm text-gray-400 italic col-span-2">Aucun participant enregistré numériquement.</div>
                                  )}
                              </div>
                          </div>
                      </div>
                  )}

                  {/* --- LAYOUT : ADR (ANALYSE DE RISQUE) --- */}
                  {printLayout === 'adr' && (
                      <div className="space-y-6">
                          <div className="text-center border-2 border-black p-4 mb-8">
                              <h1 className="text-2xl font-black uppercase">ANALYSE DE RISQUE (A.D.R)</h1>
                              <p className="text-sm font-bold uppercase mt-2">Chantier : {chantierInfo?.nom} | Date : {new Date(selectedPreJob.date).toLocaleDateString()}</p>
                              <p className="text-xs mt-1">Rédacteur / Animateur : {selectedPreJob.animateur}</p>
                          </div>

                          <table className="w-full text-sm">
                              <thead>
                                  <tr>
                                      <th className="w-[10%] text-center">Code</th>
                                      <th className="w-[25%]">Opération / Tâche</th>
                                      <th className="w-[30%] text-red-600">Risques identifiés</th>
                                      <th className="w-[35%] text-green-700">Mesures de prévention (EPI/EPC)</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {dbRisks.map((r: any) => (
                                      <tr key={r.id}>
                                          <td className="font-mono text-xs text-center font-bold">{r.id}</td>
                                          <td className="font-bold uppercase text-[11px]">{r.task}</td>
                                          <td className="text-[11px]"><ul className="list-disc pl-4 space-y-1">{r.risks.map((risk: string, i: number) => <li key={i}>{risk}</li>)}</ul></td>
                                          <td className="text-[11px]"><ul className="list-disc pl-4 space-y-1">{r.measures.map((mes: string, i: number) => <li key={i}>{mes}</li>)}</ul></td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>

                          <div className="mt-10 text-xs italic text-gray-500 text-center">
                              Document généré automatiquement depuis ALTRAD.OS sur la base de la bibliothèque des risques métier.
                          </div>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  // ==========================================================================
  // VUE 3 : CRÉATION WIZARD (4 ÉTAPES)
  // ==========================================================================
  return (
    <div className="min-h-screen bg-[#2d3436] p-4 md:p-8 font-['Fredoka'] flex items-center justify-center text-gray-800">
        <Toaster position="top-center" />
        
        <div className="w-full max-w-5xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col min-h-[800px] animate-in zoom-in-95 duration-300">
            
            <div className="bg-[#e21118] p-8 text-white relative">
                <button onClick={() => { setView('list'); setEditingId(null); }} className="absolute top-8 left-8 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><X size={20}/></button>
                <div className="text-center">
                    <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center justify-center gap-3">
                        <Shield className="text-white"/> {editingId ? 'Modification' : 'Nouveau'} Pre-Job
                    </h1>
                    <p className="text-[10px] font-bold text-red-200 uppercase tracking-[0.2em] mt-2">Évaluation des Risques de Terrain</p>
                </div>
            </div>

            <div className="flex h-2 bg-gray-100">
                {[1,2,3,4].map(s => (
                    <div key={s} className={`flex-1 transition-all duration-700 ${step >= s ? 'bg-red-600' : 'bg-transparent'}`}></div>
                ))}
            </div>

            <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
                
                {/* --- ETAPE 1 : CONTEXTE ET ÉQUIPE --- */}
                {step === 1 && (
                    <div className="space-y-8 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-red-500 inline-block pb-1">1. Contexte & Équipe</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Animateur (Sélection ou Saisie Libre)</label>
                                {formData.animateur_mode === 'list' ? (
                                    <select className="w-full p-4 bg-white rounded-2xl font-bold text-sm outline-none border border-gray-100 cursor-pointer shadow-sm" 
                                            value={formData.animateur_selectionne} 
                                            onChange={(e) => {
                                                if (e.target.value === 'custom') setFormData({...formData, animateur_mode: 'manual', animateur_selectionne: ''});
                                                else setFormData({...formData, animateur_selectionne: e.target.value});
                                            }}>
                                        <option value="">-- Sélectionner l'animateur --</option>
                                        {equipe.map((e:any) => <option key={e.id} value={`${e.nom} ${e.prenom}`}>{e.nom} {e.prenom} ({e.role})</option>)}
                                        <option value="custom" className="font-black text-blue-600">➕ AUTRE (Saisie Manuelle)...</option>
                                    </select>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <input type="text" placeholder="Nom et Prénom de l'animateur..." className="w-full p-4 bg-white rounded-2xl font-bold text-sm outline-none border border-gray-100 shadow-sm" value={formData.animateur_manuel} onChange={(e) => setFormData({...formData, animateur_manuel: e.target.value})} autoFocus />
                                        <button onClick={() => setFormData({...formData, animateur_mode: 'list'})} className="p-4 bg-gray-200 rounded-2xl hover:bg-gray-300"><X size={20}/></button>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Date</label>
                                <input type="date" className="w-full p-4 bg-white rounded-2xl font-bold text-sm border border-gray-100 shadow-sm" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-4 flex items-center gap-2"><Users size={14}/> Équipe Présente (Pour Émargement)</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {equipe.map(emp => {
                                    const isSelected = formData.participants.some(p => p.id === emp.id);
                                    return (
                                        <div key={emp.id} onClick={() => handleParticipantToggle(emp)} className={`p-3 rounded-xl border-2 cursor-pointer text-xs font-bold transition-all flex items-center justify-between ${isSelected ? 'bg-blue-50 border-blue-500 text-blue-800' : 'bg-white border-gray-100 text-gray-500'}`}>
                                            <span className="truncate">{emp.prenom} {emp.nom}</span>
                                            {isSelected && <CheckCircle2 size={16} className="text-blue-500 shrink-0"/>}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-4 flex items-center gap-2"><Info size={14}/> Tâches du jour (Génère l'ADR)</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {uniqueTasks.map(task => (
                                    <div key={task} onClick={() => setFormData({...formData, taches_principales: toggleItem(formData.taches_principales, task)})} className={`p-4 rounded-2xl border-2 cursor-pointer text-sm font-bold transition-all flex items-center justify-between ${formData.taches_principales.includes(task) ? 'bg-red-50 text-red-700 border-red-500 shadow-md' : 'bg-white text-gray-600 border-gray-100 hover:border-red-200'}`}>
                                        {task} {formData.taches_principales.includes(task) && <CheckCircle2 size={18} className="text-red-500"/>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- ETAPE 2 : RISQUES --- */}
                {step === 2 && (
                    <div className="space-y-8 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-red-500 inline-block pb-1">2. Analyse des Risques</h3>
                        <div className="space-y-4">
                            {relevantRisks.map(risk => {
                                const isSelected = formData.risques_selectionnes.includes(risk.id);
                                return (
                                    <div key={risk.id} onClick={() => setFormData({...formData, risques_selectionnes: toggleItem(formData.risques_selectionnes, risk.id)})} className={`p-6 border-2 rounded-3xl cursor-pointer transition-all ${isSelected ? 'border-red-500 bg-white shadow-lg' : 'border-gray-100 bg-gray-50 hover:bg-white'}`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg ${isSelected ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'}`}>{risk.category}</span>
                                                <h4 className={`font-black text-lg uppercase mt-2 ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>{risk.task}</h4>
                                            </div>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${isSelected ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 text-transparent'}`}><Check size={16} strokeWidth={4}/></div>
                                        </div>
                                        <div className={`space-y-4 ${isSelected ? 'opacity-100' : 'opacity-40'}`}>
                                            <div><p className="text-[10px] font-black text-gray-400 uppercase mb-1">Risques</p><p className="text-xs font-bold text-red-500 bg-red-50 p-2 rounded-xl">{risk.risks.join(' • ')}</p></div>
                                            <div><p className="text-[10px] font-black text-gray-400 uppercase mb-1">Prévention</p><ul className="text-xs font-bold text-emerald-700 bg-emerald-50 p-3 rounded-xl space-y-1">{risk.measures.map((m, i) => <li key={i} className="flex items-start gap-2"><CheckCircle2 size={12} className="mt-0.5 shrink-0"/> {m}</li>)}</ul></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* --- ETAPE 3 : EPI & VALIDATION ANIMATEUR --- */}
                {step === 3 && (
                    <div className="space-y-8 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-red-500 inline-block pb-1">3. EPI & Animateur</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><HardHat size={14}/> EPI de Base</h4>
                                <div className="space-y-2">{EPI_DATABASE.base.map(epi => (<div key={epi} className="flex items-center gap-3 p-3 bg-white rounded-xl border opacity-70"><div className="w-5 h-5 bg-green-500 rounded flex items-center justify-center text-white"><Check size={12}/></div><span className="text-xs font-bold text-gray-600">{epi}</span></div>))}</div>
                            </div>
                            <div className="bg-blue-50/30 p-6 rounded-3xl border border-blue-100">
                                <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Shield size={14}/> EPI Spécifiques</h4>
                                <div className="grid grid-cols-1 gap-2">
                                    {EPI_DATABASE.specifiques.map(epi => (
                                        <div key={epi.nom} onClick={() => setFormData({...formData, epi_specifiques: toggleItem(formData.epi_specifiques, epi.nom)})} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.epi_specifiques.includes(epi.nom) ? 'bg-blue-100 border-blue-500 text-blue-800' : 'bg-white border-transparent text-gray-500'}`}>
                                            <div className={`w-5 h-5 rounded flex items-center justify-center border-2 ${formData.epi_specifiques.includes(epi.nom) ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300'}`}>{formData.epi_specifiques.includes(epi.nom) && <Check size={12}/>}</div>
                                            <div><p className="text-xs font-bold leading-tight">{epi.nom}</p><p className="text-[9px] font-black uppercase opacity-60">{epi.usage}</p></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">Signature Animateur : {formData.animateur_mode === 'list' ? formData.animateur_selectionne : formData.animateur_manuel}</label>
                            <div className="border-4 border-gray-100 rounded-[30px] h-48 bg-gray-50 relative overflow-hidden">
                                <SignatureCanvas ref={sigPad} penColor="black" canvasProps={{className: 'absolute inset-0 w-full h-full cursor-crosshair'}} />
                                <div className="absolute bottom-4 w-full text-center text-[10px] font-black uppercase text-gray-300 pointer-events-none">Signer ici</div>
                                <button onClick={()=>sigPad.current.clear()} className="absolute top-4 right-4 text-[10px] bg-white border px-3 py-1.5 rounded-lg font-black uppercase shadow-sm">Effacer</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- ETAPE 4 : EMARGEMENT EQUIPE --- */}
                {step === 4 && (
                    <div className="space-y-8 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-red-500 inline-block pb-1">4. Émargement Équipe</h3>
                        <p className="text-xs font-bold text-gray-500">Faites signer chaque membre de l'équipe pour attester de leur participation au briefing.</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {formData.participants.length === 0 ? (
                                <div className="col-span-2 text-center py-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-gray-400 font-bold">Aucun participant sélectionné à l'étape 1.</div>
                            ) : formData.participants.map(p => (
                                <ParticipantSignatureBox key={p.id} participant={p} onUpdate={(sig) => updateParticipantSignature(p.id, sig)} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* --- FOOTER NAVIGATION --- */}
            <div className="p-8 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                {step > 1 ? (
                    <button onClick={()=>setStep(step-1)} className="px-6 py-4 font-black uppercase text-xs text-gray-400 hover:text-gray-800 transition-colors">Retour</button>
                ) : <div></div>}
                
                {step < 4 ? (
                    <button onClick={() => {
                        const finalAnimateur = formData.animateur_mode === 'list' ? formData.animateur_selectionne : formData.animateur_manuel;
                        if (step === 1 && (!finalAnimateur || formData.taches_principales.length === 0)) {
                            return toast.error("Animateur et Tâches requis.");
                        }
                        if (step === 3) {
                            if (sigPad.current?.isEmpty() && !formData.signature_animateur) {
                                return toast.error("La signature de l'animateur est requise avant de passer à l'équipe.");
                            } else if (sigPad.current && !sigPad.current.isEmpty()) {
                                // SAUVEGARDE EN MÉMOIRE AVANT DE DEMONTER L'ÉTAPE 3
                                setFormData({...formData, signature_animateur: sigPad.current.getTrimmedCanvas().toDataURL('image/png')});
                            }
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

// ============================================================================
// SOUS-COMPOSANT : SIGNATURE INDIVIDUELLE (Avec bouton valider)
// ============================================================================
function ParticipantSignatureBox({ participant, onUpdate }: { participant: any, onUpdate: (sig: string | null) => void }) {
    const padRef = useRef<any>(null);

    const saveSig = () => {
        if (padRef.current && !padRef.current.isEmpty()) {
            onUpdate(padRef.current.getTrimmedCanvas().toDataURL('image/png'));
        } else {
            toast.error("Veuillez signer avant de valider.");
        }
    };

    return (
        <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-3">
                <span className="font-black uppercase text-sm">{participant.nom}</span>
                {participant.signature && <span className="text-[10px] bg-green-100 text-green-600 px-2 py-1 rounded font-bold uppercase">Signé</span>}
            </div>
            
            {participant.signature ? (
                <div className="relative h-24 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center">
                    <img src={participant.signature} className="max-h-full" alt={`Signature ${participant.nom}`} />
                    <button onClick={() => onUpdate(null)} className="absolute top-2 right-2 text-[10px] bg-white border border-gray-200 px-2 py-1 rounded hover:bg-red-50 hover:text-red-500 font-bold transition-colors">Refaire</button>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    <div className="h-24 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 relative overflow-hidden">
                        <SignatureCanvas ref={padRef} penColor="blue" canvasProps={{className: 'absolute inset-0 w-full h-full cursor-crosshair'}} />
                        <div className="absolute bottom-2 w-full text-center text-[10px] font-bold text-gray-300 pointer-events-none">Signer ici</div>
                        <button onClick={() => padRef.current?.clear()} className="absolute top-2 right-2 text-[10px] bg-white border border-gray-200 px-2 py-1 rounded hover:bg-gray-100 transition-colors z-10">Effacer</button>
                    </div>
                    <button onClick={saveSig} className="w-full bg-emerald-500 text-white font-bold text-xs py-2 rounded-xl hover:bg-emerald-600 transition-colors">
                        Valider la signature
                    </button>
                </div>
            )}
        </div>
    );
}