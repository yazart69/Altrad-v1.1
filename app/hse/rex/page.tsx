"use client";

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Trophy, X, Save, Eye, Calendar, CheckCircle2, ChevronRight, 
  Plus, Loader2, ArrowLeft, Printer, Target, TrendingUp, 
  ShieldCheck, Lightbulb, Camera, Trash2, FileCheck, DollarSign, Users
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import toast, { Toaster } from 'react-hot-toast';

export default function REXPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={40}/></div>}>
      <REXContent />
    </Suspense>
  );
}

function REXContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chantierId = searchParams.get('cid');

  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'view'>('list');
  const [archives, setArchives] = useState<any[]>([]);
  const [equipe, setEquipe] = useState<any[]>([]);
  const [chantierInfo, setChantierInfo] = useState<any>(null);
  const [selectedREX, setSelectedREX] = useState<any>(null);

  // --- ÉTAT DU FORMULAIRE WIZARD ---
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    redacteur: '',
    type_rex: 'Fin de projet (>400k€)',
    
    // Étape 1 : Finance
    bilan_financier: { budget_etude: '', budget_reel: '', ecart: '', ts_impact: '', variantes: '' },
    
    // Étape 2 : RH & Moyens
    ressources_humaines: { adequation: 'Conforme', competences: 'Conforme', interim: 'Non', st1: '', st2: '', commentaire: '' },
    
    // Étape 3 : Évaluation QHSE (Basé sur le doc Word)
    evaluation_qhse: {
        relations_client: { bilan: 'Positif', commentaire: '' },
        surete: { bilan: 'Positif', ess: 0, eis: 0, cfsi: 0, nqm: 0, commentaire: '' },
        securite: { bilan: 'Positif', at_aa: 0, at_sa: 0, commentaire: '' },
        environnement: { bilan: 'Positif', ese: 0, eie: 0, commentaire: '' },
        delais: { bilan: 'Positif', commentaire: '' }
    },

    // Étape 4 : Risques & Opportunités
    risques_opportunites: [] as { type: string, categorie: string, description: string }[],
    
    // Étape 5 : Preuves
    photos: [] as string[],
    signature_url: ''
  });

  const sigPad = useRef<any>(null);

  useEffect(() => {
    if (step === 6 && formData.signature_url && sigPad.current) {
        setTimeout(() => { sigPad.current?.fromDataURL(formData.signature_url); }, 50);
    }
  }, [step]);

  // --- CHARGEMENT ---
  useEffect(() => {
    if (!chantierId) return;
    const loadData = async () => {
        setLoading(true);
        try {
            const [cData, eData, aData] = await Promise.all([
                supabase.from('chantiers').select('nom, client').eq('id', chantierId).single(),
                supabase.from('employes').select('id, nom, prenom, role'),
                supabase.from('chantier_rex').select('*').eq('chantier_id', chantierId).order('date', { ascending: false })
            ]);

            if (cData.data) setChantierInfo(cData.data);
            if (eData.data) setEquipe(eData.data);
            if (aData.data) setArchives(aData.data);
        } catch (error) { toast.error("Erreur de chargement"); } 
        finally { setLoading(false); }
    };
    loadData();
  }, [chantierId]);

  // --- HELPERS ---
  const handleNestedChange = (section: string, field: string, value: any) => {
      setFormData({ ...formData, [section]: { ...(formData as any)[section], [field]: value } });
  };

  const handleQHSEChange = (domaine: string, field: string, value: any) => {
      const updatedQHSE = { ...formData.evaluation_qhse, [domaine]: { ...(formData.evaluation_qhse as any)[domaine], [field]: value } };
      setFormData({ ...formData, evaluation_qhse: updatedQHSE });
  };

  const addRO = () => {
      setFormData({ ...formData, risques_opportunites: [...formData.risques_opportunites, { type: 'Risque', categorie: 'Amélioration', description: '' }] });
  };

  const updateRO = (idx: number, field: string, value: string) => {
      const newRO = [...formData.risques_opportunites];
      newRO[idx] = { ...newRO[idx], [field]: value };
      setFormData({ ...formData, risques_opportunites: newRO });
  };

  const removeRO = (idx: number) => {
      setFormData({ ...formData, risques_opportunites: formData.risques_opportunites.filter((_, i) => i !== idx) });
  };

  const handlePhotoUpload = (e: any) => {
      const file = e.target.files[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => { setFormData({ ...formData, photos: [...formData.photos, reader.result as string] }); };
          reader.readAsDataURL(file);
      }
  };

  const removePhoto = (index: number) => {
      setFormData({ ...formData, photos: formData.photos.filter((_, i) => i !== index) });
  };

  // --- SAUVEGARDE ---
  const handleSave = async () => {
    if (!formData.signature_url) return toast.error("La signature est requise.");
    const toastId = toast.loading("Clôture et enregistrement du REX...");

    const payload = { chantier_id: chantierId, ...formData };
    const { error } = await supabase.from('chantier_rex').insert([payload]);
    
    if (error) { toast.error("Erreur : " + error.message, { id: toastId }); } 
    else { 
        toast.success("✅ REX enregistré avec succès !", { id: toastId }); 
        const { data } = await supabase.from('chantier_rex').select('*').eq('chantier_id', chantierId).order('date', { ascending: false });
        if(data) setArchives(data);
        setView('list'); setStep(1); 
    }
  };

  if (!chantierId) return <div className="p-10 text-center font-black uppercase text-red-500">Erreur : Aucun chantier sélectionné.</div>;
  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-gray-500"><Loader2 className="animate-spin text-indigo-600 mr-3"/> Chargement...</div>;

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
                        <Trophy className="text-indigo-600" size={36}/> REX & Évaluation Prestation
                    </h2>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Chantier : <span className="text-indigo-500">{chantierInfo?.nom}</span></p>
                    <button onClick={() => router.push('/hse')} className="text-xs font-bold text-gray-400 hover:text-black mt-3 flex items-center gap-1 transition-colors">← Retour au Dashboard</button>
                </div>
                <button onClick={() => { setView('create'); setStep(1); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black uppercase flex items-center gap-2 transition-all shadow-lg active:scale-95">
                    <Plus size={20}/> Nouveau REX
                </button>
            </div>

            <div className="space-y-4">
                {archives.length === 0 && (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <Trophy size={60} className="mx-auto text-gray-300 mb-4"/>
                        <p className="text-gray-400 font-black uppercase text-xl">Aucun REX enregistré</p>
                        <p className="text-gray-400 font-bold text-sm mt-1">Idéal pour clôturer un projet de plus de 400k€.</p>
                    </div>
                )}
                {archives.map(a => (
                    <div key={a.id} className="flex flex-col md:flex-row justify-between md:items-center p-6 bg-gray-50 rounded-3xl border border-gray-100 hover:bg-white hover:shadow-lg transition-all group">
                        <div className="mb-4 md:mb-0">
                            <p className="font-black text-gray-800 text-lg uppercase leading-tight mb-1">{a.type_rex}</p>
                            <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                                <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-200"><Calendar size={12}/> {new Date(a.date).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-200 uppercase text-indigo-600">Rédacteur: {a.redacteur}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={() => { setSelectedREX(a); setView('view'); }} className="bg-white p-3 rounded-xl text-gray-400 hover:text-indigo-600 border border-gray-200 shadow-sm transition-all" title="Voir / Imprimer le REX">
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
  // VUE 2 : VISIONNEUSE / IMPRESSION (Format PPTX/DOCX combiné)
  // ==========================================================================
  if (view === 'view' && selectedREX) {
      return (
          <div className="min-h-screen bg-gray-100 font-sans text-gray-900 p-4 md:p-8">
              <style dangerouslySetInnerHTML={{__html: `
                @media print {
                  @page { size: A4 portrait; margin: 10mm; }
                  body * { visibility: hidden; }
                  .print-container, .print-container * { visibility: visible; }
                  .print-container { position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; margin: 0; padding: 0; box-shadow: none; border: none; }
                  .no-print { display: none !important; }
                  .page-break { page-break-before: always; }
                  table { width: 100%; border-collapse: collapse; }
                  th, td { border: 1px solid #000; padding: 8px; font-size: 11px; }
                  th { background-color: #f3f4f6 !important; font-weight: bold; }
                }
              `}}/>

              <div className="max-w-4xl mx-auto mb-6 flex justify-between gap-4 no-print">
                  <button onClick={() => setView('list')} className="flex items-center gap-2 text-gray-500 font-bold hover:text-black bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200"><ArrowLeft size={18}/> Retour</button>
                  <button onClick={() => setTimeout(() => window.print(), 300)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-black uppercase text-xs flex items-center gap-2 shadow-lg transition-all"><Printer size={16}/> Imprimer Dossier REX</button>
              </div>

              <div className="print-container max-w-4xl mx-auto bg-white rounded-xl shadow-2xl p-10">
                  {/* PAGE 1 : EN-TÊTE & FINANCE & RH */}
                  <div className="border-b-2 border-indigo-900 pb-4 mb-8 flex justify-between items-end">
                      <div>
                          <h1 className="text-3xl font-black uppercase tracking-tight text-indigo-900">RETOUR D'EXPÉRIENCE (REX)</h1>
                          <h2 className="text-sm font-bold text-gray-600 uppercase mt-1">Évaluation Prestation : {chantierInfo?.nom}</h2>
                      </div>
                      <div className="text-right">
                          <p className="border border-black px-3 py-1 font-bold uppercase text-xs">Date : {new Date(selectedREX.date).toLocaleDateString()}</p>
                          <p className="text-xs font-bold mt-1">Rédacteur : {selectedREX.redacteur}</p>
                      </div>
                  </div>

                  <div className="mb-8">
                      <h3 className="text-sm font-black uppercase mb-3 bg-indigo-50 text-indigo-900 p-2 border border-indigo-200">1. Bilan Financier & Contractuel</h3>
                      <div className="grid grid-cols-3 gap-4 text-xs font-bold mb-4">
                          <div className="p-3 border border-gray-300 bg-gray-50">Budget Étude : <br/><span className="text-sm">{selectedREX.bilan_financier?.budget_etude || '-'} €</span></div>
                          <div className="p-3 border border-gray-300 bg-gray-50">Budget Réel : <br/><span className="text-sm">{selectedREX.bilan_financier?.budget_reel || '-'} €</span></div>
                          <div className="p-3 border border-gray-300 bg-gray-50">Écart : <br/><span className={`text-sm ${selectedREX.bilan_financier?.ecart?.includes('-') ? 'text-red-600' : 'text-green-600'}`}>{selectedREX.bilan_financier?.ecart || '-'} €</span></div>
                      </div>
                      <table className="w-full text-xs">
                          <tbody>
                              <tr><td className="w-[30%] font-bold bg-gray-50">Impact TS (Travaux Suppl.)</td><td>{selectedREX.bilan_financier?.ts_impact || 'Aucun'}</td></tr>
                              <tr><td className="font-bold bg-gray-50">Variantes mises en œuvre</td><td>{selectedREX.bilan_financier?.variantes || 'Aucune'}</td></tr>
                          </tbody>
                      </table>
                  </div>

                  <div className="mb-8">
                      <h3 className="text-sm font-black uppercase mb-3 bg-indigo-50 text-indigo-900 p-2 border border-indigo-200">2. Ressources Humaines & Sous-Traitance</h3>
                      <table className="w-full text-xs">
                          <tbody>
                              <tr><td className="w-[30%] font-bold bg-gray-50">Adéquation charges/ressources</td><td>{selectedREX.ressources_humaines?.adequation}</td></tr>
                              <tr><td className="font-bold bg-gray-50">Niveau de Compétence</td><td>{selectedREX.ressources_humaines?.competences}</td></tr>
                              <tr><td className="font-bold bg-gray-50">Recours à l'intérim</td><td>{selectedREX.ressources_humaines?.interim}</td></tr>
                              <tr><td className="font-bold bg-gray-50">Sous-traitants majeurs</td><td>1. {selectedREX.ressources_humaines?.st1 || 'N/A'} <br/> 2. {selectedREX.ressources_humaines?.st2 || 'N/A'}</td></tr>
                          </tbody>
                      </table>
                  </div>

                  {/* PAGE 2 : EVALUATION QHSE */}
                  <div className="page-break mb-8">
                      <h3 className="text-sm font-black uppercase mb-3 bg-indigo-50 text-indigo-900 p-2 border border-indigo-200">3. Synthèse QHSE & Prestation</h3>
                      <table className="w-full text-xs mb-4">
                          <thead>
                              <tr>
                                  <th className="w-[25%] text-left">Thème</th>
                                  <th className="w-[15%] text-center">Bilan</th>
                                  <th className="w-[20%] text-center">Indicateurs</th>
                                  <th className="w-[40%] text-left">Commentaires</th>
                              </tr>
                          </thead>
                          <tbody>
                              <tr>
                                  <td className="font-bold">Relations / Qualité Technique</td>
                                  <td className="text-center font-black uppercase">{selectedREX.evaluation_qhse?.relations_client?.bilan}</td>
                                  <td className="text-center">-</td>
                                  <td className="italic">{selectedREX.evaluation_qhse?.relations_client?.commentaire}</td>
                              </tr>
                              <tr>
                                  <td className="font-bold">Culture Sûreté</td>
                                  <td className="text-center font-black uppercase">{selectedREX.evaluation_qhse?.surete?.bilan}</td>
                                  <td className="text-center text-[10px]">ESS: {selectedREX.evaluation_qhse?.surete?.ess} | EIS: {selectedREX.evaluation_qhse?.surete?.eis}<br/>CFSI: {selectedREX.evaluation_qhse?.surete?.cfsi} | NQM: {selectedREX.evaluation_qhse?.surete?.nqm}</td>
                                  <td className="italic">{selectedREX.evaluation_qhse?.surete?.commentaire}</td>
                              </tr>
                              <tr>
                                  <td className="font-bold">Santé & Sécurité</td>
                                  <td className="text-center font-black uppercase">{selectedREX.evaluation_qhse?.securite?.bilan}</td>
                                  <td className="text-center text-[10px]">AT AA: {selectedREX.evaluation_qhse?.securite?.at_aa}<br/>AT SA: {selectedREX.evaluation_qhse?.securite?.at_sa}</td>
                                  <td className="italic">{selectedREX.evaluation_qhse?.securite?.commentaire}</td>
                              </tr>
                              <tr>
                                  <td className="font-bold">Environnement</td>
                                  <td className="text-center font-black uppercase">{selectedREX.evaluation_qhse?.environnement?.bilan}</td>
                                  <td className="text-center text-[10px]">ESE: {selectedREX.evaluation_qhse?.environnement?.ese}<br/>EIE: {selectedREX.evaluation_qhse?.environnement?.eie}</td>
                                  <td className="italic">{selectedREX.evaluation_qhse?.environnement?.commentaire}</td>
                              </tr>
                              <tr>
                                  <td className="font-bold">Gestion des Délais</td>
                                  <td className="text-center font-black uppercase">{selectedREX.evaluation_qhse?.delais?.bilan}</td>
                                  <td className="text-center">-</td>
                                  <td className="italic">{selectedREX.evaluation_qhse?.delais?.commentaire}</td>
                              </tr>
                          </tbody>
                      </table>
                  </div>

                  {/* PAGE 3 : RISQUES & OPPORTUNITES + PHOTOS */}
                  <div className="mb-8">
                      <h3 className="text-sm font-black uppercase mb-3 bg-indigo-50 text-indigo-900 p-2 border border-indigo-200">4. Synthèse : Risques & Opportunités futures</h3>
                      {selectedREX.risques_opportunites?.length > 0 ? (
                          <table className="w-full text-xs">
                              <thead><tr><th className="text-left w-[15%]">Type</th><th className="text-left w-[20%]">Catégorie</th><th className="text-left w-[65%]">Description pour projets futurs</th></tr></thead>
                              <tbody>
                                  {selectedREX.risques_opportunites.map((ro: any, i: number) => (
                                      <tr key={i}>
                                          <td className={`font-black uppercase ${ro.type === 'Risque' ? 'text-red-600' : 'text-green-600'}`}>{ro.type}</td>
                                          <td className="font-bold">{ro.categorie}</td>
                                          <td className="italic">{ro.description}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      ) : <p className="text-xs italic text-gray-500">Aucun risque ou opportunité identifié.</p>}
                  </div>

                  {selectedREX.photos && selectedREX.photos.length > 0 && (
                      <div className="mb-8 page-break-inside-avoid">
                          <h3 className="text-sm font-black uppercase mb-3 bg-indigo-50 text-indigo-900 p-2 border border-indigo-200">5. Preuves visuelles (Dossier Qualification)</h3>
                          <div className="grid grid-cols-3 gap-4">
                              {selectedREX.photos.map((p: string, i: number) => (
                                  <img key={i} src={p} alt={`REX ${i}`} className="w-full h-32 object-cover border border-gray-300" />
                              ))}
                          </div>
                      </div>
                  )}

                  <div className="border border-black page-break-inside-avoid">
                      <div className="bg-gray-100 border-b border-black p-2 font-black uppercase text-xs">Validation Direction / Qualité</div>
                      <div className="p-4 flex items-center justify-center h-20">
                          {selectedREX.signature_url ? <img src={selectedREX.signature_url} className="h-full" /> : <span className="text-gray-300 italic">Non signé</span>}
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // ==========================================================================
  // VUE 3 : CRÉATION WIZARD (6 ÉTAPES)
  // ==========================================================================
  return (
    <div className="min-h-screen bg-[#2d3436] p-4 md:p-8 font-['Fredoka'] flex items-center justify-center text-gray-800">
        <Toaster position="top-center" />
        <div className="w-full max-w-5xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col min-h-[800px] animate-in zoom-in-95 duration-300">
            
            <div className="bg-indigo-600 p-8 text-white relative">
                <button onClick={() => setView('list')} className="absolute top-8 left-8 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><X size={20}/></button>
                <div className="text-center">
                    <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center justify-center gap-3"><Trophy className="text-white"/> REX & Bilan de Fin</h1>
                    <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-[0.2em] mt-2">Évaluation Prestation & Amélioration Continue</p>
                </div>
            </div>

            <div className="flex h-2 bg-gray-100">
                {[1,2,3,4,5,6].map(s => <div key={s} className={`flex-1 transition-all duration-700 ${step >= s ? 'bg-indigo-600' : 'bg-transparent'}`}></div>)}
            </div>

            <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
                
                {/* --- ETAPE 1 : CONTEXTE & FINANCE --- */}
                {step === 1 && (
                    <div className="space-y-8 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-indigo-500 inline-block pb-1">1. Contexte & Bilan Financier</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                            <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Rédacteur</label><input type="text" className="w-full p-4 bg-white rounded-2xl font-bold text-sm outline-none border border-gray-100 shadow-sm" value={formData.redacteur} onChange={e=>setFormData({...formData, redacteur: e.target.value})} /></div>
                            <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Date</label><input type="date" className="w-full p-4 bg-white rounded-2xl font-bold text-sm border border-gray-100 outline-none" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} /></div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Type de REX</label>
                                <select className="w-full p-4 bg-white rounded-2xl font-bold text-sm border border-gray-100 outline-none cursor-pointer" value={formData.type_rex} onChange={e=>setFormData({...formData, type_rex: e.target.value})}>
                                    <option>Fin de projet (400k€)</option><option>Contrat Maintenance Annuel</option><option>Technique / Procédé Nouveau</option>
                                </select>
                            </div>
                        </div>

                        <div className="bg-green-50/50 p-6 rounded-3xl border border-green-100">
                            <h4 className="text-sm font-black text-green-800 uppercase mb-4 flex items-center gap-2"><DollarSign size={18}/> Analyse Financière</h4>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div><label className="text-[10px] font-black text-green-600 uppercase mb-1 block">Budget Étude (€)</label><input type="number" className="w-full p-3 bg-white rounded-xl text-sm font-bold border border-green-100 outline-none" value={formData.bilan_financier.budget_etude} onChange={e=>handleNestedChange('bilan_financier', 'budget_etude', e.target.value)} /></div>
                                <div><label className="text-[10px] font-black text-green-600 uppercase mb-1 block">Budget Réel (€)</label><input type="number" className="w-full p-3 bg-white rounded-xl text-sm font-bold border border-green-100 outline-none" value={formData.bilan_financier.budget_reel} onChange={e=>handleNestedChange('bilan_financier', 'budget_reel', e.target.value)} /></div>
                                <div><label className="text-[10px] font-black text-green-600 uppercase mb-1 block">Écart (€)</label><input type="text" className="w-full p-3 bg-white rounded-xl text-sm font-bold border border-green-100 outline-none text-red-600" placeholder="Ex: -15000" value={formData.bilan_financier.ecart} onChange={e=>handleNestedChange('bilan_financier', 'ecart', e.target.value)} /></div>
                            </div>
                            <div className="space-y-3">
                                <input type="text" placeholder="Impact des Travaux Supplémentaires (TS)..." className="w-full p-3 bg-white rounded-xl text-xs font-bold border border-green-100 outline-none" value={formData.bilan_financier.ts_impact} onChange={e=>handleNestedChange('bilan_financier', 'ts_impact', e.target.value)} />
                                <input type="text" placeholder="Variantes mises en œuvre (impact positif/négatif)..." className="w-full p-3 bg-white rounded-xl text-xs font-bold border border-green-100 outline-none" value={formData.bilan_financier.variantes} onChange={e=>handleNestedChange('bilan_financier', 'variantes', e.target.value)} />
                            </div>
                        </div>
                    </div>
                )}

                {/* --- ETAPE 2 : RH & MOYENS --- */}
                {step === 2 && (
                    <div className="space-y-8 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-indigo-500 inline-block pb-1">2. Ressources Humaines & Moyens</h3>
                        
                        <div className="grid grid-cols-2 gap-6 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Adéquation charges / ressources</label>
                                <select className="w-full p-4 bg-white rounded-2xl font-bold text-sm outline-none border border-gray-100" value={formData.ressources_humaines.adequation} onChange={e=>handleNestedChange('ressources_humaines', 'adequation', e.target.value)}><option>Conforme</option><option>Sous-effectif</option><option>Sur-effectif</option></select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Niveau de Compétence globale</label>
                                <select className="w-full p-4 bg-white rounded-2xl font-bold text-sm outline-none border border-gray-100" value={formData.ressources_humaines.competences} onChange={e=>handleNestedChange('ressources_humaines', 'competences', e.target.value)}><option>Conforme aux attentes</option><option>Besoin de formation identifié</option></select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Recours à l'intérim</label>
                                <select className="w-full p-4 bg-white rounded-2xl font-bold text-sm outline-none border border-gray-100" value={formData.ressources_humaines.interim} onChange={e=>handleNestedChange('ressources_humaines', 'interim', e.target.value)}><option>Non</option><option>Oui (Faible proportion)</option><option>Oui (Forte proportion)</option></select>
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Sous-traitants majeurs intervenus (Évaluation globale)</label>
                                <div className="space-y-2">
                                    <input type="text" placeholder="Sous-traitant 1 et note globale..." className="w-full p-3 bg-white rounded-xl text-xs font-bold border border-gray-100 outline-none" value={formData.ressources_humaines.st1} onChange={e=>handleNestedChange('ressources_humaines', 'st1', e.target.value)} />
                                    <input type="text" placeholder="Sous-traitant 2 et note globale..." className="w-full p-3 bg-white rounded-xl text-xs font-bold border border-gray-100 outline-none" value={formData.ressources_humaines.st2} onChange={e=>handleNestedChange('ressources_humaines', 'st2', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- ETAPE 3 : EVALUATION QHSE --- */}
                {step === 3 && (
                    <div className="space-y-8 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-indigo-500 inline-block pb-1">3. Évaluation Prestation (QHSE)</h3>
                        <p className="text-xs font-bold text-gray-500 mb-6">Saisissez les indicateurs réels (ESS, AT, etc.) pour la clôture du dossier.</p>

                        <div className="space-y-6">
                            {/* Sûreté */}
                            <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-black text-sm uppercase text-purple-900">Culture Sûreté</h4>
                                    <select className="p-2 rounded-lg text-xs font-black uppercase outline-none" value={formData.evaluation_qhse.surete.bilan} onChange={e=>handleQHSEChange('surete', 'bilan', e.target.value)}><option>Positif</option><option>Négatif</option><option>Neutre</option></select>
                                </div>
                                <div className="flex gap-4 mb-3">
                                    <div className="flex items-center gap-2"><label className="text-[10px] font-black">ESS :</label><input type="number" className="w-16 p-1 rounded text-center text-xs" value={formData.evaluation_qhse.surete.ess} onChange={e=>handleQHSEChange('surete','ess',e.target.value)}/></div>
                                    <div className="flex items-center gap-2"><label className="text-[10px] font-black">CFSI :</label><input type="number" className="w-16 p-1 rounded text-center text-xs" value={formData.evaluation_qhse.surete.cfsi} onChange={e=>handleQHSEChange('surete','cfsi',e.target.value)}/></div>
                                </div>
                                <input type="text" placeholder="Commentaire Sûreté..." className="w-full p-2 rounded text-xs" value={formData.evaluation_qhse.surete.commentaire} onChange={e=>handleQHSEChange('surete','commentaire',e.target.value)}/>
                            </div>

                            {/* Sécurité */}
                            <div className="bg-red-50 p-5 rounded-2xl border border-red-100">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-black text-sm uppercase text-red-900">Santé & Sécurité</h4>
                                    <select className="p-2 rounded-lg text-xs font-black uppercase outline-none" value={formData.evaluation_qhse.securite.bilan} onChange={e=>handleQHSEChange('securite', 'bilan', e.target.value)}><option>Positif</option><option>Négatif</option><option>Neutre</option></select>
                                </div>
                                <div className="flex gap-4 mb-3">
                                    <div className="flex items-center gap-2"><label className="text-[10px] font-black">AT avec Arrêt :</label><input type="number" className="w-16 p-1 rounded text-center text-xs" value={formData.evaluation_qhse.securite.at_aa} onChange={e=>handleQHSEChange('securite','at_aa',e.target.value)}/></div>
                                    <div className="flex items-center gap-2"><label className="text-[10px] font-black">AT sans Arrêt :</label><input type="number" className="w-16 p-1 rounded text-center text-xs" value={formData.evaluation_qhse.securite.at_sa} onChange={e=>handleQHSEChange('securite','at_sa',e.target.value)}/></div>
                                </div>
                                <input type="text" placeholder="Commentaire Sécurité..." className="w-full p-2 rounded text-xs" value={formData.evaluation_qhse.securite.commentaire} onChange={e=>handleQHSEChange('securite','commentaire',e.target.value)}/>
                            </div>

                            {/* Environnement */}
                            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-black text-sm uppercase text-emerald-900">Environnement</h4>
                                    <select className="p-2 rounded-lg text-xs font-black uppercase outline-none" value={formData.evaluation_qhse.environnement.bilan} onChange={e=>handleQHSEChange('environnement', 'bilan', e.target.value)}><option>Positif</option><option>Négatif</option><option>Neutre</option></select>
                                </div>
                                <div className="flex gap-4 mb-3">
                                    <div className="flex items-center gap-2"><label className="text-[10px] font-black">ESE :</label><input type="number" className="w-16 p-1 rounded text-center text-xs" value={formData.evaluation_qhse.environnement.ese} onChange={e=>handleQHSEChange('environnement','ese',e.target.value)}/></div>
                                </div>
                                <input type="text" placeholder="Commentaire Environnement..." className="w-full p-2 rounded text-xs" value={formData.evaluation_qhse.environnement.commentaire} onChange={e=>handleQHSEChange('environnement','commentaire',e.target.value)}/>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- ETAPE 4 : RISQUES & OPPORTUNITES --- */}
                {step === 4 && (
                    <div className="space-y-6 animate-in slide-in-from-right-10">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-indigo-500 inline-block pb-1">4. Risques & Opportunités</h3>
                            <button onClick={addRO} className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-indigo-200 flex items-center gap-2 transition-colors"><Plus size={14}/> Ajouter</button>
                        </div>
                        <p className="text-xs font-bold text-gray-500">Capitalisez l'expérience : que faut-il retenir pour les futurs chantiers du même type ?</p>

                        <div className="space-y-4">
                            {formData.risques_opportunites.length === 0 && <div className="p-10 border-2 border-dashed border-gray-200 rounded-3xl text-center text-gray-400 font-bold">Rien à signaler pour les futurs projets.</div>}
                            {formData.risques_opportunites.map((ro: any, idx: number) => (
                                <div key={idx} className="bg-gray-50 p-6 rounded-3xl border border-gray-200 relative group">
                                    <button onClick={() => removeRO(idx)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500"><Trash2 size={18}/></button>
                                    <div className="grid grid-cols-2 gap-4 mb-4 pr-8">
                                        <select className={`w-full p-3 rounded-xl text-xs font-black uppercase outline-none border ${ro.type === 'Risque' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200'}`} value={ro.type} onChange={(e) => updateRO(idx, 'type', e.target.value)}>
                                            <option value="Risque">⚠️ Risque identifié</option><option value="Opportunité">💡 Opportunité</option>
                                        </select>
                                        <select className="w-full p-3 bg-white rounded-xl text-xs font-bold border border-gray-100 outline-none" value={ro.categorie} onChange={(e) => updateRO(idx, 'categorie', e.target.value)}>
                                            <option>Amélioration</option><option>Innovation</option><option>Organisation</option><option>Technique</option>
                                        </select>
                                    </div>
                                    <textarea placeholder="Description pour prise en compte sur le prochain chantier..." className="w-full p-3 bg-white rounded-xl text-xs font-bold outline-none border border-gray-100 h-20" value={ro.description} onChange={(e) => updateRO(idx, 'description', e.target.value)} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- ETAPE 5 : PHOTOS --- */}
                {step === 5 && (
                    <div className="space-y-6 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-indigo-500 inline-block pb-1">5. Preuves visuelles (Dossier Qualification)</h3>
                        <p className="text-xs font-bold text-gray-500">Ajoutez des photos significatives (utiles pour les plaquettes commerciales ou dossiers de qualification).</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <label className="border-4 border-dashed border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors rounded-3xl h-40 flex flex-col items-center justify-center cursor-pointer text-indigo-500 group">
                                <Camera size={32} className="mb-2 group-hover:scale-110 transition-transform"/><span className="text-[10px] font-black uppercase tracking-widest">Ajouter Photo</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                            </label>
                            {formData.photos.map((photo, idx) => (
                                <div key={idx} className="relative h-40 rounded-3xl overflow-hidden border border-gray-200 shadow-sm group">
                                    <img src={photo} className="w-full h-full object-cover" />
                                    <button onClick={() => removePhoto(idx)} className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- ETAPE 6 : SIGNATURE --- */}
                {step === 6 && (
                    <div className="space-y-8 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-indigo-500 inline-block pb-1">6. Clôture & Validation</h3>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">Signature Validation (Directeur / Rédacteur)</label>
                            <div className="border-4 border-gray-100 rounded-[30px] h-64 bg-gray-50 relative overflow-hidden">
                                <SignatureCanvas ref={sigPad} penColor="black" canvasProps={{className: 'absolute inset-0 w-full h-full cursor-crosshair'}} />
                                <div className="absolute bottom-4 w-full text-center text-[10px] font-black uppercase text-gray-300 pointer-events-none">Signer ici pour clôturer le REX</div>
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
                        if (step === 6 && sigPad.current && !sigPad.current.isEmpty()) setFormData({...formData, signature_url: sigPad.current.getTrimmedCanvas().toDataURL('image/png')});
                        setStep(step-1)
                    }} className="px-6 py-4 font-black uppercase text-xs text-gray-400 hover:text-gray-800 transition-colors">Retour</button>
                ) : <div></div>}
                
                {step < 6 ? (
                    <button onClick={() => {
                        if (step === 1 && !formData.redacteur) return toast.error("Le rédacteur est obligatoire.");
                        setStep(step+1);
                    }} className="bg-[#2d3436] text-white px-8 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-xl hover:bg-black transition-all">
                        Suivant <ChevronRight size={18}/>
                    </button>
                ) : (
                    <button onClick={() => {
                        if (sigPad.current && !sigPad.current.isEmpty()) {
                            setFormData({...formData, signature_url: sigPad.current.getTrimmedCanvas().toDataURL('image/png')});
                            setTimeout(handleSave, 100);
                        } else if (formData.signature_url) { handleSave(); } 
                        else { toast.error("Veuillez signer pour clôturer le REX."); }
                    }} disabled={loading} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all">
                        {loading ? <Loader2 className="animate-spin" size={18}/> : <><Save size={18}/> Clôturer le REX</>}
                    </button>
                )}
            </div>
        </div>
    </div>
  );
}