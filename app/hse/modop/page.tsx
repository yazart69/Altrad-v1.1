"use client";

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  FileText, X, Save, Eye, CheckCircle2, ChevronRight, 
  Plus, Loader2, ArrowLeft, Printer, ShieldAlert, 
  Trash2, Info, ListChecks, Wind, Flame, Skull,
  Check
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import toast, { Toaster } from 'react-hot-toast';

// Import de notre référentiel intelligent
import { RISK_DATABASE } from '../data'; 

export default function MODOPPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-700" size={40}/></div>}>
      <MODOPContent />
    </Suspense>
  );
}

function MODOPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chantierId = searchParams.get('cid');

  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'view'>('list');
  const [archives, setArchives] = useState<any[]>([]);
  const [chantierInfo, setChantierInfo] = useState<any>(null);
  const [selectedMODOP, setSelectedMODOP] = useState<any>(null);

  // --- ÉTAT DU FORMULAIRE WIZARD V2 ---
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    redacteur: '',
    version: 'A',
    localisation: '',
    description_travaux: '',
    // On utilise la colonne mesures_prevention pour stocker les spécificités environnementales
    mesures_prevention: { atex: false, plomb: false, amiante: false },
    // On stocke les IDs des risques (ex: PRS-06) pour générer l'ADR intelligemment
    techniques: [] as string[], 
    // Programme de contrôles
    controles: [] as { operation: string, type: string, validateur: string }[],
    procedures_urgence: "En cas d'accident, alerter immédiatement le SST (Sauveteur Secouriste du Travail). Dégager la victime de la zone dangereuse si possible en moins de 3 minutes sans sur-accident. Appeler le 15 (Samu) ou 112.",
    signature_redacteur: ''
  });

  const sigPad = useRef<any>(null);

  // Recharger la signature si on recule d'étape
  useEffect(() => {
    if (step === 4 && formData.signature_redacteur && sigPad.current) {
        setTimeout(() => { sigPad.current?.fromDataURL(formData.signature_redacteur); }, 50);
    }
  }, [step]);

  // --- CHARGEMENT ---
  useEffect(() => {
    if (!chantierId) return;
    const loadData = async () => {
        setLoading(true);
        try {
            const [cData, aData] = await Promise.all([
                supabase.from('chantiers').select('nom, client').eq('id', chantierId).single(),
                supabase.from('chantier_modop').select('*').eq('chantier_id', chantierId).order('created_at', { ascending: false })
            ]);
            if (cData.data) setChantierInfo(cData.data);
            if (aData.data) setArchives(aData.data);
        } catch (error) { toast.error("Erreur de chargement"); } 
        finally { setLoading(false); }
    };
    loadData();
  }, [chantierId]);

  // --- HELPERS (Logique Métier) ---
  const categoriesRisques = Array.from(new Set(RISK_DATABASE.map(r => r.category)));

  const toggleTechnique = (id: string) => {
    setFormData(prev => ({
        ...prev,
        techniques: prev.techniques.includes(id) ? prev.techniques.filter(i => i !== id) : [...prev.techniques, id]
    }));
  };

  const toggleEnvironnement = (env: 'atex' | 'plomb' | 'amiante') => {
      setFormData(prev => ({
          ...prev, 
          mesures_prevention: { ...prev.mesures_prevention, [env]: !prev.mesures_prevention[env] }
      }));
  };

  const addControle = () => {
    setFormData({ ...formData, controles: [...formData.controles, { operation: '', type: 'Autocontrôle (AC)', validateur: 'Chef de Chantier' }] });
  };
  const updateControle = (idx: number, field: string, value: string) => {
      const newCtrl = [...formData.controles];
      newCtrl[idx] = { ...newCtrl[idx], [field]: value };
      setFormData({ ...formData, controles: newCtrl });
  };
  const removeControle = (idx: number) => {
      setFormData({ ...formData, controles: formData.controles.filter((_, i) => i !== idx) });
  };

  // --- SAUVEGARDE ---
  const handleSave = async () => {
    if (!formData.signature_redacteur) return toast.error("Signature requise pour valider le document.");
    const toastId = toast.loading("Génération du Mode Opératoire...");
    
    const { signature_redacteur, ...dataToSend } = formData;
    const payload = { chantier_id: chantierId, ...dataToSend, signatures: { redacteur: signature_redacteur } };

    const { error } = await supabase.from('chantier_modop').insert([payload]);
    
    if (error) { toast.error("Erreur : " + error.message, { id: toastId }); } 
    else {
        toast.success("✅ MODOP validé et archivé !", { id: toastId });
        const { data } = await supabase.from('chantier_modop').select('*').eq('chantier_id', chantierId).order('created_at', { ascending: false });
        if (data) setArchives(data);
        setView('list'); setStep(1);
    }
  };

  if (!chantierId) return <div className="p-10 text-center font-black uppercase text-red-500">Erreur : Aucun chantier sélectionné.</div>;
  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-700 size-10"/></div>;

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
                        <FileText className="text-blue-700" size={36}/> Modes Opératoires (MODOP)
                    </h2>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Chantier : <span className="text-blue-600">{chantierInfo?.nom}</span></p>
                    <button onClick={() => router.push('/hse')} className="text-xs font-bold text-gray-400 hover:text-black mt-3 flex items-center gap-1 transition-colors">← Retour au Dashboard</button>
                </div>
                <button onClick={() => { setView('create'); setStep(1); }} className="bg-blue-700 hover:bg-black text-white px-8 py-4 rounded-2xl font-black uppercase flex items-center gap-2 transition-all shadow-lg active:scale-95">
                    <Plus size={20}/> Nouveau MODOP
                </button>
            </div>

            <div className="space-y-4">
                {archives.length === 0 && (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <FileText size={60} className="mx-auto text-gray-300 mb-4"/>
                        <p className="text-gray-400 font-black uppercase text-xl">Aucun document technique</p>
                    </div>
                )}
                {archives.map(a => (
                    <div key={a.id} className="flex justify-between items-center p-6 bg-gray-50 rounded-3xl border border-gray-100 hover:bg-white hover:shadow-lg transition-all">
                        <div>
                            <p className="font-black text-gray-800 text-lg uppercase leading-tight mb-1">INDICE {a.version} - {a.localisation || 'Zone générale'}</p>
                            <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                                <span className="bg-white px-2 py-1 rounded border border-gray-200">Créé le {new Date(a.created_at).toLocaleDateString()}</span>
                                <span className="bg-white px-2 py-1 rounded border border-gray-200 text-blue-700">Rédacteur: {a.redacteur}</span>
                                {(a.mesures_prevention?.plomb || a.mesures_prevention?.amiante) && <span className="bg-red-50 text-red-600 px-2 py-1 rounded border border-red-100 uppercase">Zone Rouge</span>}
                            </div>
                        </div>
                        <button onClick={() => { setSelectedMODOP(a); setView('view'); }} className="p-3 bg-white rounded-xl text-blue-600 hover:bg-blue-50 border border-gray-200 shadow-sm transition-colors"><Eye size={20}/></button>
                    </div>
                ))}
            </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // VUE 2 : VISIONNEUSE PDF (Format Qualité)
  // ==========================================================================
  if (view === 'view' && selectedMODOP) {
      // Récupération des objets risques complets via les IDs stockés
      const dbRisks = (selectedMODOP.techniques || []).map((id: string) => RISK_DATABASE.find(r => r.id === id)).filter(Boolean);

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
                  th, td { border: 1px solid #000; padding: 8px; font-size: 11px; }
                  th { background-color: #f3f4f6 !important; font-weight: bold; }
                }
              `}}/>
              
              <div className="max-w-4xl mx-auto mb-6 flex justify-between no-print">
                  <button onClick={() => setView('list')} className="flex items-center gap-2 text-gray-500 font-bold bg-white px-4 py-2 rounded-xl border border-gray-200 hover:text-black"><ArrowLeft size={18}/> Retour</button>
                  <button onClick={() => window.print()} className="bg-blue-700 text-white px-6 py-2.5 rounded-xl font-black uppercase text-xs flex items-center gap-2 shadow-lg hover:bg-black"><Printer size={16}/> Imprimer Document Qualité</button>
              </div>

              <div className="print-container max-w-4xl mx-auto bg-white p-10 shadow-2xl border border-gray-100">
                  
                  {/* Cartouche Document */}
                  <div className="border-4 border-blue-900 mb-8 flex flex-col">
                      <div className="bg-blue-900 text-white p-4 text-center">
                          <h1 className="text-2xl font-black uppercase tracking-widest">MODE OPÉRATOIRE & ANALYSE DE RISQUES</h1>
                      </div>
                      <div className="grid grid-cols-4 divide-x-2 divide-blue-900 text-center font-bold text-xs bg-gray-50">
                          <div className="p-2 text-blue-900 uppercase">Chantier<br/><span className="text-black">{chantierInfo?.nom}</span></div>
                          <div className="p-2 text-blue-900 uppercase">Version<br/><span className="text-black text-lg">{selectedMODOP.version}</span></div>
                          <div className="p-2 text-blue-900 uppercase">Date<br/><span className="text-black">{new Date(selectedMODOP.created_at).toLocaleDateString()}</span></div>
                          <div className="p-2 text-blue-900 uppercase">Rédacteur<br/><span className="text-black">{selectedMODOP.redacteur}</span></div>
                      </div>
                  </div>

                  {/* 1. Cadre & Spécificités */}
                  <div className="mb-6">
                      <h3 className="bg-gray-100 border-b-2 border-black p-2 font-black uppercase text-sm mb-3">1. Localisation et Nature des travaux</h3>
                      <p className="text-sm mb-2"><span className="font-bold uppercase text-gray-600 mr-2">Localisation :</span> {selectedMODOP.localisation}</p>
                      <p className="text-sm"><span className="font-bold uppercase text-gray-600 mr-2">Description :</span> {selectedMODOP.description_travaux}</p>
                      
                      {/* Affichage intelligent des spécificités environnementales */}
                      {(selectedMODOP.mesures_prevention?.atex || selectedMODOP.mesures_prevention?.plomb || selectedMODOP.mesures_prevention?.amiante) && (
                          <div className="mt-4 border-2 border-red-500 p-3 bg-red-50">
                              <h4 className="font-black text-red-700 uppercase text-xs mb-2 flex items-center gap-2"><ShieldAlert size={16}/> Exigences Environnementales Spécifiques</h4>
                              <ul className="list-disc pl-5 text-xs font-bold text-red-900 space-y-1">
                                  {selectedMODOP.mesures_prevention?.atex && <li>Zone ATEX : Matériel certifié ATEX obligatoire, explosimètre permanent, interdiction formelle de source d'ignition.</li>}
                                  {selectedMODOP.mesures_prevention?.plomb && <li>Risque Plomb : Délimitation Zone Rouge, sas de décontamination (propre/sale), aspiration avec filtre THE, port de masque P3 obligatoire.</li>}
                                  {selectedMODOP.mesures_prevention?.amiante && <li>Risque Amiante (SS4) : Respect strict du mode opératoire amiante SS4, confinement de la zone, traitement des déchets amiante spécifiques.</li>}
                              </ul>
                          </div>
                      )}
                  </div>

                  {/* 2. Programme de Contrôles */}
                  <div className="mb-6">
                      <h3 className="bg-gray-100 border-b-2 border-black p-2 font-black uppercase text-sm mb-3">2. Programme des Contrôles (Qualité)</h3>
                      {selectedMODOP.controles?.length > 0 ? (
                          <table className="w-full text-xs">
                              <thead><tr><th className="text-left w-[50%]">Opération / Phase à contrôler</th><th className="text-center w-[25%]">Type de Contrôle</th><th className="text-left w-[25%]">Validateur requis</th></tr></thead>
                              <tbody>
                                  {selectedMODOP.controles.map((c: any, i: number) => (
                                      <tr key={i}>
                                          <td className="font-bold">{c.operation}</td>
                                          <td className={`font-black text-center ${c.type.includes('Arrêt') ? 'text-red-600' : c.type.includes('Convocation') ? 'text-orange-500' : 'text-blue-600'}`}>{c.type}</td>
                                          <td className="italic">{c.validateur}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      ) : <p className="text-xs italic text-gray-500">Aucun point de contrôle bloquant défini.</p>}
                  </div>

                  {/* 3. ADR Intelligente */}
                  <div className="mb-6">
                      <h3 className="bg-gray-100 border-b-2 border-black p-2 font-black uppercase text-sm mb-3">3. Détail Opérationnel & Analyse des Risques (ADR)</h3>
                      <table className="w-full text-[10px]">
                          <thead><tr><th className="w-[10%] text-center">Code</th><th className="w-[20%] text-left">Opération</th><th className="w-[25%] text-left text-red-700">Risques Majeurs</th><th className="w-[45%] text-left text-green-800">Mesures de Prévention & EPI</th></tr></thead>
                          <tbody>
                              {dbRisks.map((r: any) => (
                                  <tr key={r.id}>
                                      <td className="text-center font-black">{r.id}</td>
                                      <td className="font-bold uppercase">{r.task}</td>
                                      <td><ul className="list-disc pl-3">{r.risks.map((risk: string, i: number) => <li key={i}>{risk}</li>)}</ul></td>
                                      <td><ul className="list-disc pl-3">{r.measures.map((mes: string, i: number) => <li key={i}>{mes}</li>)}</ul></td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>

                  {/* 4. Urgence & Signature */}
                  <div className="mb-6">
                      <h3 className="bg-gray-100 border-b-2 border-black p-2 font-black uppercase text-sm mb-3">4. Procédures d'urgence</h3>
                      <p className="text-xs font-bold p-3 border border-red-200 bg-red-50 text-red-800 italic">{selectedMODOP.procedures_urgence}</p>
                  </div>

                  <div className="border border-black">
                      <div className="bg-gray-100 border-b border-black p-2 font-black uppercase text-xs">Validation Rédacteur</div>
                      <div className="p-4 flex items-center justify-center h-20">
                          {selectedMODOP.signatures?.redacteur ? <img src={selectedMODOP.signatures.redacteur} className="h-full" /> : <span className="text-gray-300 italic">Non signé</span>}
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // ==========================================================================
  // VUE 3 : WIZARD DE CRÉATION
  // ==========================================================================
  return (
    <div className="min-h-screen bg-[#2d3436] p-4 md:p-8 font-['Fredoka'] flex items-center justify-center text-gray-800">
        <Toaster position="top-center" />
        <div className="w-full max-w-5xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col min-h-[800px] animate-in zoom-in-95 duration-300">
            
            <div className="bg-blue-700 p-8 text-white relative">
                <button onClick={() => setView('list')} className="absolute top-8 left-8 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><X size={20}/></button>
                <div className="text-center">
                    <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center justify-center gap-3"><FileText className="text-white"/> Nouveau MODOP</h1>
                    <p className="text-[10px] font-bold text-blue-200 uppercase tracking-[0.2em] mt-2">Mode Opératoire & Plan de Contrôle</p>
                </div>
            </div>

            <div className="flex h-2 bg-gray-100">
                {[1,2,3,4].map(s => <div key={s} className={`flex-1 transition-all duration-700 ${step >= s ? 'bg-blue-700' : 'bg-transparent'}`}></div>)}
            </div>

            <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
                
                {/* --- ETAPE 1 : CONTEXTE & ENVIRONNEMENT --- */}
                {step === 1 && (
                    <div className="space-y-8 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-blue-700 inline-block pb-1">1. Cadre et Environnement</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                            <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Rédacteur</label><input type="text" className="w-full p-4 bg-white rounded-2xl font-bold text-sm outline-none border border-gray-100" value={formData.redacteur} onChange={e=>setFormData({...formData, redacteur: e.target.value})} /></div>
                            <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Version / Indice</label><input type="text" className="w-full p-4 bg-white rounded-2xl font-bold text-sm outline-none border border-gray-100" value={formData.version} onChange={e=>setFormData({...formData, version: e.target.value})} /></div>
                            <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Localisation précise</label><input type="text" className="w-full p-4 bg-white rounded-2xl font-bold text-sm outline-none border border-gray-100" placeholder="Ex: Batiment Réacteur, RDC..." value={formData.localisation} onChange={e=>setFormData({...formData, localisation: e.target.value})} /></div>
                            <div className="col-span-1 md:col-span-3"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Description des travaux à réaliser</label><textarea className="w-full p-4 bg-white rounded-2xl font-bold text-sm outline-none border border-gray-100 h-24" value={formData.description_travaux} onChange={e=>setFormData({...formData, description_travaux: e.target.value})} /></div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-2 block mb-4 flex items-center gap-2"><ShieldAlert size={14}/> Spécificités Environnementales (Active des règles métier)</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div onClick={() => toggleEnvironnement('atex')} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4 ${formData.mesures_prevention.atex ? 'bg-orange-50 border-orange-500 text-orange-800' : 'bg-white border-gray-100 text-gray-500'}`}>
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.mesures_prevention.atex ? 'bg-orange-500 text-white' : 'bg-gray-100'}`}><Flame size={20}/></div>
                                    <span className="font-black uppercase text-sm">Zone ATEX</span>
                                </div>
                                <div onClick={() => toggleEnvironnement('plomb')} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4 ${formData.mesures_prevention.plomb ? 'bg-red-50 border-red-500 text-red-800' : 'bg-white border-gray-100 text-gray-500'}`}>
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.mesures_prevention.plomb ? 'bg-red-500 text-white' : 'bg-gray-100'}`}><Skull size={20}/></div>
                                    <span className="font-black uppercase text-sm">Risque Plomb</span>
                                </div>
                                <div onClick={() => toggleEnvironnement('amiante')} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4 ${formData.mesures_prevention.amiante ? 'bg-purple-50 border-purple-500 text-purple-800' : 'bg-white border-gray-100 text-gray-500'}`}>
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.mesures_prevention.amiante ? 'bg-purple-500 text-white' : 'bg-gray-100'}`}><Wind size={20}/></div>
                                    <span className="font-black uppercase text-sm">Amiante (SS4)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- ETAPE 2 : PROGRAMME DE CONTROLES --- */}
                {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right-10">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-blue-700 inline-block pb-1">2. Programme de Contrôles Qualité</h3>
                            <button onClick={addControle} className="bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-blue-200 flex items-center gap-2 transition-colors"><Plus size={14}/> Ajouter un point</button>
                        </div>
                        <p className="text-xs font-bold text-gray-500 bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center gap-2"><ListChecks size={20} className="text-blue-500"/> Définissez les points de validation (PA, PC) requis pendant l'exécution.</p>

                        <div className="space-y-3">
                            {formData.controles.length === 0 && <div className="p-10 border-2 border-dashed border-gray-200 rounded-3xl text-center text-gray-400 font-bold">Aucun point de contrôle défini.</div>}
                            {formData.controles.map((ctrl, idx) => (
                                <div key={idx} className="flex gap-4 items-center bg-gray-50 p-3 rounded-2xl border border-gray-200">
                                    <input type="text" placeholder="Opération (Ex: Mesure d'épaisseur, Fin de sablage)..." className="flex-1 p-3 bg-white rounded-xl text-xs font-bold border border-gray-100 outline-none" value={ctrl.operation} onChange={(e) => updateControle(idx, 'operation', e.target.value)} />
                                    <select className="w-48 p-3 bg-white rounded-xl text-xs font-black uppercase border border-gray-100 outline-none text-blue-700" value={ctrl.type} onChange={(e) => updateControle(idx, 'type', e.target.value)}>
                                        <option>Autocontrôle (AC)</option><option>Point Convocation (PC)</option><option>Point d'Arrêt (PA)</option>
                                    </select>
                                    <input type="text" placeholder="Validateur (Ex: Client)..." className="w-48 p-3 bg-white rounded-xl text-xs font-bold border border-gray-100 outline-none" value={ctrl.validateur} onChange={(e) => updateControle(idx, 'validateur', e.target.value)} />
                                    <button onClick={() => removeControle(idx)} className="p-3 text-gray-400 hover:text-red-500 bg-white rounded-xl border border-gray-100"><Trash2 size={16}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- ETAPE 3 : ADR INTELLIGENTE --- */}
                {step === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-blue-700 inline-block pb-1">3. Analyse de Risques (ADR)</h3>
                        <p className="text-xs font-bold text-gray-500 bg-orange-50 p-4 rounded-2xl border border-orange-100 flex items-center gap-2">
                            <Info size={20} className="text-orange-500"/>
                            Sélectionnez les tâches qui composent votre intervention. Le système intégrera automatiquement les risques et les EPI obligatoires au document final.
                        </p>

                        <div className="space-y-6">
                            {categoriesRisques.map(category => {
                                const risquesDansCategorie = RISK_DATABASE.filter(r => r.category === category);
                                return (
                                    <div key={category}>
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-1">{category}</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {risquesDansCategorie.map(risk => {
                                                const isSelected = formData.techniques.includes(risk.id);
                                                return (
                                                    <div key={risk.id} onClick={() => toggleTechnique(risk.id)} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex justify-between items-start ${isSelected ? 'bg-blue-50 border-blue-500 shadow-md' : 'bg-white border-gray-100 hover:border-blue-200'}`}>
                                                        <div>
                                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${isSelected ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>{risk.id}</span>
                                                            <p className={`text-sm font-bold mt-2 ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>{risk.task}</p>
                                                        </div>
                                                        <div className={`w-6 h-6 rounded flex items-center justify-center border-2 shrink-0 ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300'}`}>{isSelected && <Check size={14}/>}</div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* --- ETAPE 4 : VALIDATION --- */}
                {step === 4 && (
                    <div className="space-y-8 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-blue-700 inline-block pb-1">4. Validation Finale</h3>
                        
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">Procédures d'urgence (Modifiables si spécifique)</label>
                            <textarea className="w-full p-4 bg-red-50 text-red-900 rounded-2xl font-bold text-sm border-2 border-red-200 outline-none h-32 focus:ring-2 focus:ring-red-400" value={formData.procedures_urgence} onChange={e=>setFormData({...formData, procedures_urgence: e.target.value})} />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">Signature du Rédacteur ({formData.redacteur || 'Non renseigné'})</label>
                            <div className="border-4 border-gray-100 rounded-[30px] h-64 bg-gray-50 relative overflow-hidden">
                                <SignatureCanvas ref={sigPad} penColor="black" canvasProps={{className: 'absolute inset-0 w-full h-full cursor-crosshair'}} />
                                <div className="absolute bottom-4 w-full text-center text-[10px] font-black uppercase text-gray-300 pointer-events-none">Signer pour verrouiller le document</div>
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
                        if (step === 4 && sigPad.current && !sigPad.current.isEmpty()) setFormData({...formData, signature_redacteur: sigPad.current.getTrimmedCanvas().toDataURL('image/png')});
                        setStep(step-1)
                    }} className="px-6 py-4 font-black uppercase text-xs text-gray-400 hover:text-gray-800 transition-colors">Retour</button>
                ) : <div></div>}
                
                {step < 4 ? (
                    <button onClick={() => {
                        if (step === 1 && !formData.redacteur) return toast.error("Le nom du rédacteur est requis.");
                        if (step === 3 && formData.techniques.length === 0) return toast.error("Sélectionnez au moins une technique pour générer l'ADR.");
                        setStep(step+1);
                    }} className="bg-[#2d3436] text-white px-8 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-xl hover:bg-black transition-all">
                        Suivant <ChevronRight size={18}/>
                    </button>
                ) : (
                    <button onClick={() => {
                        if (sigPad.current && !sigPad.current.isEmpty()) {
                            setFormData({...formData, signature_redacteur: sigPad.current.getTrimmedCanvas().toDataURL('image/png')});
                            setTimeout(handleSave, 100);
                        } else if (formData.signature_redacteur) { handleSave(); } 
                        else { toast.error("Veuillez signer le document."); }
                    }} disabled={loading} className="bg-blue-700 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all">
                        {loading ? <Loader2 className="animate-spin" size={18}/> : <><Save size={18}/> Verrouiller le MODOP</>}
                    </button>
                )}
            </div>
        </div>
    </div>
  );
}