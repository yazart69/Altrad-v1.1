"use client";

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Camera, ShieldCheck, X, Save, Eye, Calendar, CheckCircle2, 
  ChevronRight, Plus, Loader2, AlertTriangle, ArrowLeft,
  Printer, FileText, Check, XCircle, Search, MapPin, UploadCloud, Trash2
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import toast, { Toaster } from 'react-hot-toast';

// Import du référentiel métier
import { Q3SRE_REFERENTIAL } from '../data'; 

export default function VMTPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-red-600" size={40}/></div>}>
      <VMTContent />
    </Suspense>
  );
}

function VMTContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chantierId = searchParams.get('cid');

  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'view'>('list');
  const [archives, setArchives] = useState<any[]>([]);
  const [equipe, setEquipe] = useState<any[]>([]);
  const [chantierInfo, setChantierInfo] = useState<any>(null);
  
  const [selectedVMT, setSelectedVMT] = useState<any>(null);

  // --- ÉTAT DU FORMULAIRE WIZARD ---
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    types: { vmt: true, q3sre: false, ost: false },
    sous_traitant: 'non',
    domaine: 'Sécurité',
    zone_visitee: '',
    lignes_defense: Q3SRE_REFERENTIAL.lignes_defense.map(l => ({ ligne: l, statut: 'NA', commentaire: '' })),
    observations: [] as any[],
    photos: [] as string[], // Images en Base64
    signature_url: ''
  });
  
  const sigPad = useRef<any>(null);

  // Recharge la signature en mémoire
  useEffect(() => {
    if (step === 5 && formData.signature_url && sigPad.current) {
        setTimeout(() => { sigPad.current?.fromDataURL(formData.signature_url); }, 50);
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
                supabase.from('chantier_vmt').select('*').eq('chantier_id', chantierId).order('created_at', { ascending: false })
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
  const handleLigneDefenseChange = (index: number, field: string, value: string) => {
      const newLignes = [...formData.lignes_defense];
      newLignes[index] = { ...newLignes[index], [field]: value };
      setFormData({ ...formData, lignes_defense: newLignes });
  };

  const addObservation = () => {
      setFormData({
          ...formData,
          observations: [...formData.observations, { employe: '', theme: Q3SRE_REFERENTIAL.themes_observation[0], statut: 'Conforme', commentaire: '' }]
      });
  };

  const updateObservation = (index: number, field: string, value: string) => {
      const newObs = [...formData.observations];
      newObs[index] = { ...newObs[index], [field]: value };
      setFormData({ ...formData, observations: newObs });
  };

  const removeObservation = (index: number) => {
      setFormData({ ...formData, observations: formData.observations.filter((_, i) => i !== index) });
  };

  const handlePhotoUpload = (e: any) => {
      const file = e.target.files[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setFormData({ ...formData, photos: [...formData.photos, reader.result as string] });
          };
          reader.readAsDataURL(file);
      }
  };

  const removePhoto = (index: number) => {
      setFormData({ ...formData, photos: formData.photos.filter((_, i) => i !== index) });
  };

  // --- SAUVEGARDE ---
  const handleSave = async () => {
    if (!formData.signature_url) return toast.error("La signature de l'auditeur est obligatoire.");
    
    const toastId = toast.loading("Enregistrement de la visite...");

    const payload = {
        chantier_id: chantierId,
        ...formData
    };

    const { error } = await supabase.from('chantier_vmt').insert([payload]);
    
    if (error) {
        toast.error("Erreur d'enregistrement : " + error.message, { id: toastId });
    } else { 
        toast.success("✅ Audit terrain enregistré avec succès !", { id: toastId }); 
        const { data } = await supabase.from('chantier_vmt').select('*').eq('chantier_id', chantierId).order('created_at', { ascending: false });
        if(data) setArchives(data);
        
        setView('list'); 
        setStep(1); 
        setFormData({
            date: new Date().toISOString().split('T')[0], types: { vmt: true, q3sre: false, ost: false },
            sous_traitant: 'non', domaine: 'Sécurité', zone_visitee: '',
            lignes_defense: Q3SRE_REFERENTIAL.lignes_defense.map(l => ({ ligne: l, statut: 'NA', commentaire: '' })),
            observations: [], photos: [], signature_url: ''
        });
    }
  };

  if (!chantierId) return <div className="p-10 text-center font-black uppercase text-red-500">Erreur : Aucun chantier sélectionné. Passez par le Dashboard.</div>;
  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-gray-500"><Loader2 className="animate-spin text-red-600 mr-3"/> Chargement...</div>;

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
                        <Camera className="text-blue-600" size={36}/> 
                        Visites Terrain (VMT / Q3SRE)
                    </h2>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">
                        Chantier : <span className="text-blue-500">{chantierInfo?.nom}</span>
                    </p>
                    <button onClick={() => router.push('/hse')} className="text-xs font-bold text-gray-400 hover:text-black mt-3 flex items-center gap-1 transition-colors">
                        ← Retour au Dashboard HSE
                    </button>
                </div>
                <button onClick={() => { setView('create'); setStep(1); }} className="bg-[#2d3436] hover:bg-black text-white px-8 py-4 rounded-2xl font-black uppercase flex items-center gap-2 transition-all shadow-lg active:scale-95">
                    <Plus size={20}/> Nouvelle Visite
                </button>
            </div>

            <div className="space-y-4">
                {archives.length === 0 && (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <Camera size={60} className="mx-auto text-gray-300 mb-4"/>
                        <p className="text-gray-400 font-black uppercase text-xl">Aucune visite archivée</p>
                        <p className="text-gray-400 font-bold text-sm mt-1">Réalisez le premier audit terrain du chantier.</p>
                    </div>
                )}
                {archives.map(a => {
                    const ecartsCount = (a.lignes_defense || []).filter((l:any) => l.statut === 'NOK').length + (a.observations || []).filter((o:any) => o.statut === 'Ecart').length;
                    
                    return (
                    <div key={a.id} className="flex flex-col md:flex-row justify-between md:items-center p-6 bg-gray-50 rounded-3xl border border-gray-100 hover:bg-white hover:shadow-lg transition-all group">
                        <div className="mb-4 md:mb-0">
                            <p className="font-black text-gray-800 text-lg uppercase leading-tight mb-1">{a.zone_visitee || "Zone Générale"}</p>
                            <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                                <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-200"><Calendar size={12}/> {new Date(a.date).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-200 uppercase text-blue-600">{[a.types.vmt && 'VMT', a.types.q3sre && 'Q3SRE', a.types.ost && 'OST'].filter(Boolean).join(' + ')}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border ${ecartsCount > 0 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                                {ecartsCount > 0 ? `${ecartsCount} Écart(s) détecté(s)` : '100% Conforme'}
                            </span>
                            <button onClick={() => { setSelectedVMT(a); setView('view'); }} className="bg-white p-3 rounded-xl text-gray-400 hover:text-blue-500 border border-gray-200 shadow-sm transition-all" title="Voir / Imprimer">
                                <Eye size={20}/>
                            </button>
                        </div>
                    </div>
                )})}
            </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // VUE 2 : VISIONNEUSE / IMPRESSION (Rapport VMT)
  // ==========================================================================
  if (view === 'view' && selectedVMT) {
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
                  <button onClick={() => setView('list')} className="flex items-center gap-2 text-gray-500 font-bold hover:text-black bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200">
                      <ArrowLeft size={18}/> Retour
                  </button>
                  <button onClick={() => { setTimeout(() => window.print(), 300); }} className="bg-[#2d3436] hover:bg-black text-white px-6 py-2.5 rounded-xl font-black uppercase text-xs flex items-center gap-2 shadow-lg transition-all">
                      <Printer size={16}/> Imprimer Rapport VMT
                  </button>
              </div>

              <div className="print-container max-w-4xl mx-auto bg-white rounded-xl shadow-2xl p-10">
                  <div className="border-b-2 border-black pb-4 mb-8 flex justify-between items-end">
                      <div>
                          <h1 className="text-2xl font-black uppercase tracking-tight">RAPPORT VISITE TERRAIN</h1>
                          <h2 className="text-sm font-bold text-gray-600 uppercase mt-1">
                              Types : {[selectedVMT.types.vmt && 'VMT', selectedVMT.types.q3sre && 'Q3SRE', selectedVMT.types.ost && 'OST'].filter(Boolean).join(' + ')}
                          </h2>
                      </div>
                      <div className="text-right">
                          <p className="text-sm font-bold uppercase border border-black px-3 py-1 inline-block">Date : {new Date(selectedVMT.date).toLocaleDateString()}</p>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm font-bold border border-black p-4 bg-gray-50 mb-8">
                      <div><span className="text-gray-500 uppercase mr-2">Chantier :</span> {chantierInfo?.nom}</div>
                      <div><span className="text-gray-500 uppercase mr-2">Zone / Local :</span> {selectedVMT.zone_visitee || 'Général'}</div>
                      <div><span className="text-gray-500 uppercase mr-2">Domaine :</span> {selectedVMT.domaine}</div>
                      <div><span className="text-gray-500 uppercase mr-2">Sous-traitant :</span> <span className="uppercase">{selectedVMT.sous_traitant}</span></div>
                  </div>

                  {selectedVMT.types.q3sre && (
                      <div className="mb-8">
                          <h3 className="text-sm font-black uppercase mb-2 bg-gray-100 p-2 border border-black">1. Lignes de Défense (Q3SRE)</h3>
                          <table className="w-full text-sm">
                              <thead>
                                  <tr>
                                      <th className="w-[40%] text-left">Ligne de défense</th>
                                      <th className="w-[10%] text-center">Statut</th>
                                      <th className="w-[50%] text-left">Commentaire / Action</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {selectedVMT.lignes_defense.map((l: any, i: number) => (
                                      <tr key={i}>
                                          <td className="font-bold text-xs">{l.ligne}</td>
                                          <td className={`font-black text-center text-xs ${l.statut === 'OK' ? 'text-green-600' : l.statut === 'NOK' ? 'text-red-600' : 'text-gray-400'}`}>{l.statut}</td>
                                          <td className="text-xs italic">{l.commentaire || '-'}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  )}

                  {selectedVMT.types.ost && (
                      <div className="mb-8">
                          <h3 className="text-sm font-black uppercase mb-2 bg-gray-100 p-2 border border-black">2. Observations Situations de Travail (OST)</h3>
                          {selectedVMT.observations.length === 0 ? (
                              <p className="text-sm text-gray-500 italic p-2 border border-gray-200">Aucune observation individuelle enregistrée.</p>
                          ) : (
                              <table className="w-full text-sm">
                                  <thead>
                                      <tr>
                                          <th className="text-left">Employé visé</th>
                                          <th className="text-left">Thème</th>
                                          <th className="text-center">Statut</th>
                                          <th className="text-left">Détail</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {selectedVMT.observations.map((o: any, i: number) => (
                                          <tr key={i}>
                                              <td className="font-bold text-xs uppercase">{o.employe}</td>
                                              <td className="text-xs">{o.theme}</td>
                                              <td className={`font-black text-center text-xs ${o.statut === 'Conforme' ? 'text-green-600' : 'text-red-600'}`}>{o.statut}</td>
                                              <td className="text-xs italic">{o.commentaire}</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          )}
                      </div>
                  )}

                  {selectedVMT.photos && selectedVMT.photos.length > 0 && (
                      <div className="mb-8">
                          <h3 className="text-sm font-black uppercase mb-2 bg-gray-100 p-2 border border-black">3. Preuves Photographiques</h3>
                          <div className="grid grid-cols-3 gap-4">
                              {selectedVMT.photos.map((p: string, i: number) => (
                                  <img key={i} src={p} alt={`Preuve ${i+1}`} className="w-full h-32 object-cover border border-gray-300" />
                              ))}
                          </div>
                      </div>
                  )}

                  <div className="mt-8 border border-black page-break-inside-avoid">
                      <div className="bg-gray-100 border-b border-black p-2 font-black uppercase text-sm">Émargement Auditeur / Préventeur</div>
                      <div className="p-4 flex items-center justify-center h-24">
                          {selectedVMT.signature_url ? <img src={selectedVMT.signature_url} alt="Signature" className="h-full" /> : <span className="text-gray-300 italic">Non signé</span>}
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
            
            <div className="bg-blue-600 p-8 text-white relative">
                <button onClick={() => setView('list')} className="absolute top-8 left-8 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><X size={20}/></button>
                <div className="text-center">
                    <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center justify-center gap-3">
                        <Camera className="text-white"/> Audit Terrain
                    </h1>
                    <p className="text-[10px] font-bold text-blue-200 uppercase tracking-[0.2em] mt-2">Module VMT / Q3SRE / OST</p>
                </div>
            </div>

            <div className="flex h-2 bg-gray-100">
                {[1,2,3,4,5].map(s => (
                    <div key={s} className={`flex-1 transition-all duration-700 ${step >= s ? 'bg-blue-600' : 'bg-transparent'}`}></div>
                ))}
            </div>

            <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
                
                {/* --- ETAPE 1 : CONTEXTE --- */}
                {step === 1 && (
                    <div className="space-y-8 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-blue-500 inline-block pb-1">1. Contexte de la visite</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                            <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Date</label><input type="date" className="w-full p-4 bg-white rounded-2xl font-bold text-sm border border-gray-100 shadow-sm outline-none" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} /></div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Zone visitée / Localisation précise</label>
                                <input type="text" placeholder="Ex: RDC Bâtiment A, Zone de stockage..." className="w-full p-4 bg-white rounded-2xl font-bold text-sm border border-gray-100 shadow-sm outline-none" value={formData.zone_visitee} onChange={e=>setFormData({...formData, zone_visitee: e.target.value})} />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-4">Objectifs de la visite (Cochez ce qui s'applique)</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${formData.types.vmt ? 'bg-blue-50 border-blue-500 shadow-md' : 'bg-white border-gray-100'}`}>
                                    <input type="checkbox" className="hidden" checked={formData.types.vmt} onChange={() => setFormData({...formData, types: {...formData.types, vmt: !formData.types.vmt}})} />
                                    <div className={`w-6 h-6 rounded flex items-center justify-center border-2 ${formData.types.vmt ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300'}`}>{formData.types.vmt && <Check size={14}/>}</div>
                                    <span className="font-black text-sm uppercase">VMT Classique</span>
                                </label>
                                <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${formData.types.q3sre ? 'bg-blue-50 border-blue-500 shadow-md' : 'bg-white border-gray-100'}`}>
                                    <input type="checkbox" className="hidden" checked={formData.types.q3sre} onChange={() => setFormData({...formData, types: {...formData.types, q3sre: !formData.types.q3sre}})} />
                                    <div className={`w-6 h-6 rounded flex items-center justify-center border-2 ${formData.types.q3sre ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300'}`}>{formData.types.q3sre && <Check size={14}/>}</div>
                                    <span className="font-black text-sm uppercase">Contrôle Q3SRE</span>
                                </label>
                                <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${formData.types.ost ? 'bg-blue-50 border-blue-500 shadow-md' : 'bg-white border-gray-100'}`}>
                                    <input type="checkbox" className="hidden" checked={formData.types.ost} onChange={() => setFormData({...formData, types: {...formData.types, ost: !formData.types.ost}})} />
                                    <div className={`w-6 h-6 rounded flex items-center justify-center border-2 ${formData.types.ost ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300'}`}>{formData.types.ost && <Check size={14}/>}</div>
                                    <span className="font-black text-sm uppercase">Observation OST</span>
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-2">Domaine</label><select className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm border-none outline-none" value={formData.domaine} onChange={e=>setFormData({...formData, domaine: e.target.value})}><option>Sécurité</option><option>Qualité</option><option>Environnement</option></select></div>
                            <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-2">Concerne un Sous-Traitant ?</label><select className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm border-none outline-none" value={formData.sous_traitant} onChange={e=>setFormData({...formData, sous_traitant: e.target.value})}><option value="non">NON (Interne ALTRAD)</option><option value="oui">OUI</option></select></div>
                        </div>
                    </div>
                )}

                {/* --- ETAPE 2 : LIGNES DE DEFENSE (Si Q3SRE ou VMT) --- */}
                {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-blue-500 inline-block pb-1">2. Évaluation des Lignes de Défense</h3>
                        <p className="text-xs font-bold text-gray-500">Évaluez l'état général de la zone selon les critères Q3SRE Altrad.</p>
                        
                        <div className="space-y-4">
                            {formData.lignes_defense.map((l: any, idx: number) => (
                                <div key={idx} className={`p-5 rounded-3xl border-2 transition-all ${l.statut === 'NOK' ? 'bg-red-50 border-red-200' : l.statut === 'OK' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'}`}>
                                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                                        <h4 className="font-black text-sm uppercase text-gray-700 flex-1">{l.ligne}</h4>
                                        <div className="flex bg-gray-100 p-1 rounded-xl">
                                            <button onClick={() => handleLigneDefenseChange(idx, 'statut', 'NA')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${l.statut === 'NA' ? 'bg-gray-400 text-white shadow' : 'text-gray-500 hover:bg-gray-200'}`}>N/A</button>
                                            <button onClick={() => handleLigneDefenseChange(idx, 'statut', 'NOK')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${l.statut === 'NOK' ? 'bg-red-500 text-white shadow' : 'text-gray-500 hover:bg-red-200 hover:text-red-700'}`}>Écart</button>
                                            <button onClick={() => handleLigneDefenseChange(idx, 'statut', 'OK')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${l.statut === 'OK' ? 'bg-green-500 text-white shadow' : 'text-gray-500 hover:bg-green-200 hover:text-green-700'}`}>Conforme</button>
                                        </div>
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder={l.statut === 'NOK' ? "⚠️ Explication de l'écart OBLIGATOIRE..." : "Commentaire optionnel..."} 
                                        className={`w-full p-3 rounded-xl text-xs font-bold outline-none border border-transparent focus:border-gray-300 ${l.statut === 'NOK' ? 'bg-white text-red-700 placeholder-red-300' : 'bg-gray-50 text-gray-600'}`}
                                        value={l.commentaire} 
                                        onChange={(e) => handleLigneDefenseChange(idx, 'commentaire', e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- ETAPE 3 : OST (Observations) --- */}
                {step === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right-10">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-blue-500 inline-block pb-1">3. Observations Terrain (OST)</h3>
                            <button onClick={addObservation} className="bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-blue-200 flex items-center gap-2 transition-colors">
                                <Plus size={14}/> Ajouter Observation
                            </button>
                        </div>
                        <p className="text-xs font-bold text-gray-500">Ciblez une situation de travail précise pour un employé (Ergonomie, Port des EPI...).</p>

                        <div className="space-y-4">
                            {formData.observations.length === 0 && <div className="p-10 border-2 border-dashed border-gray-200 rounded-3xl text-center text-gray-400 font-bold">Aucune observation individuelle. Cliquez sur "Ajouter".</div>}
                            {formData.observations.map((obs: any, idx: number) => (
                                <div key={idx} className="bg-gray-50 p-6 rounded-3xl border border-gray-200 relative group">
                                    <button onClick={() => removeObservation(idx)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500"><Trash2 size={18}/></button>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 pr-8">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Employé concerné</label>
                                            <select className="w-full p-3 bg-white rounded-xl text-xs font-bold border border-gray-100 outline-none" value={obs.employe} onChange={(e) => updateObservation(idx, 'employe', e.target.value)}>
                                                <option value="">-- Sélectionner --</option>
                                                {equipe.map(e => <option key={e.id} value={`${e.prenom} ${e.nom}`}>{e.prenom} {e.nom}</option>)}
                                                <option value="Inconnu / Autre">Autre (Sous-traitant)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Thème</label>
                                            <select className="w-full p-3 bg-white rounded-xl text-xs font-bold border border-gray-100 outline-none" value={obs.theme} onChange={(e) => updateObservation(idx, 'theme', e.target.value)}>
                                                {Q3SRE_REFERENTIAL.themes_observation.map(t => <option key={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Statut</label>
                                            <select className={`w-full p-3 rounded-xl text-xs font-black uppercase border border-gray-100 outline-none ${obs.statut === 'Conforme' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`} value={obs.statut} onChange={(e) => updateObservation(idx, 'statut', e.target.value)}>
                                                <option value="Conforme">✅ Conforme (Bonne pratique)</option>
                                                <option value="Ecart">❌ Écart constaté</option>
                                            </select>
                                        </div>
                                    </div>
                                    <textarea 
                                        placeholder="Détaillez la situation observée et l'action corrective immédiate..."
                                        className="w-full p-4 bg-white rounded-xl text-xs font-bold outline-none border border-gray-100 h-20"
                                        value={obs.commentaire}
                                        onChange={(e) => updateObservation(idx, 'commentaire', e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- ETAPE 4 : PHOTOS (Preuves) --- */}
                {step === 4 && (
                    <div className="space-y-6 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-blue-500 inline-block pb-1">4. Preuves Photographiques</h3>
                        <p className="text-xs font-bold text-gray-500">Ajoutez des photos pour illustrer une bonne pratique ou documenter un écart critique.</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <label className="border-4 border-dashed border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors rounded-3xl h-40 flex flex-col items-center justify-center cursor-pointer text-blue-500 group">
                                <Camera size={32} className="mb-2 group-hover:scale-110 transition-transform"/>
                                <span className="text-[10px] font-black uppercase tracking-widest">Prendre Photo</span>
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
                            </label>

                            {formData.photos.map((photo, idx) => (
                                <div key={idx} className="relative h-40 rounded-3xl overflow-hidden border border-gray-200 shadow-sm group">
                                    <img src={photo} alt={`Preuve ${idx}`} className="w-full h-full object-cover" />
                                    <button onClick={() => removePhoto(idx)} className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- ETAPE 5 : SIGNATURE --- */}
                {step === 5 && (
                    <div className="space-y-8 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-blue-500 inline-block pb-1">5. Validation de l'Audit</h3>
                        
                        <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 text-sm font-bold text-blue-900 italic">
                            En signant ce document, je valide les observations remontées et m'assure que les actions correctives immédiates ont été appliquées pour les écarts critiques.
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">Signature Auditeur / Préventeur</label>
                            <div className="border-4 border-gray-100 rounded-[30px] h-64 bg-gray-50 relative overflow-hidden">
                                <SignatureCanvas ref={sigPad} penColor="black" canvasProps={{className: 'absolute inset-0 w-full h-full cursor-crosshair'}} />
                                <div className="absolute bottom-4 w-full text-center text-[10px] font-black uppercase text-gray-300 pointer-events-none">Signer ici</div>
                                <button onClick={()=>sigPad.current.clear()} className="absolute top-4 right-4 text-[10px] bg-white border border-gray-200 px-4 py-2 rounded-xl font-black uppercase shadow-sm hover:bg-gray-100 transition-colors">Effacer</button>
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
                            setFormData({...formData, signature_url: sigPad.current.getTrimmedCanvas().toDataURL('image/png')});
                        }
                        setStep(step-1)
                    }} className="px-6 py-4 font-black uppercase text-xs text-gray-400 hover:text-gray-800 transition-colors">Retour</button>
                ) : <div></div>}
                
                {step < 5 ? (
                    <button onClick={() => {
                        if (step === 1 && !formData.types.vmt && !formData.types.q3sre && !formData.types.ost) {
                            return toast.error("Veuillez cocher au moins un type d'objectif.");
                        }
                        setStep(step+1);
                    }} className="bg-[#2d3436] text-white px-8 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-xl hover:bg-black transition-all">
                        Suivant <ChevronRight size={18}/>
                    </button>
                ) : (
                    <button onClick={() => {
                        if (sigPad.current && !sigPad.current.isEmpty()) {
                            setFormData({...formData, signature_url: sigPad.current.getTrimmedCanvas().toDataURL('image/png')});
                            setTimeout(handleSave, 100);
                        } else if (formData.signature_url) {
                            handleSave();
                        } else {
                            toast.error("Veuillez signer pour valider l'audit.");
                        }
                    }} disabled={loading} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all">
                        {loading ? <Loader2 className="animate-spin" size={18}/> : <><Save size={18}/> Enregistrer l'Audit</>}
                    </button>
                )}
            </div>
        </div>
    </div>
  );
}