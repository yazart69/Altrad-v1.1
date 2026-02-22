"use client";

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  FileText, X, Save, Eye, CheckCircle2, ChevronRight, 
  Plus, Loader2, ArrowLeft, Printer, Hammer, ShieldAlert, 
  Trash2, Info, ListChecks, History
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import toast, { Toaster } from 'react-hot-toast';

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

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    redacteur: '',
    version: 'A',
    localisation: '',
    description_travaux: '',
    techniques: [] as string[],
    controles: [] as { point: string, methode: string, type: string }[],
    mesures_prevention: { zone_travail: true, balisage: true, epi: true, plomb: false },
    procedures_urgence: "En cas d'accident, alerter immédiatement le SST. Sortir la victime de la zone si possible (<3min). Appeler le 15/112.",
    signature_redacteur: ''
  });

  const sigPad = useRef<any>(null);

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

  const toggleTechnique = (t: string) => {
    setFormData(prev => ({
        ...prev,
        techniques: prev.techniques.includes(t) ? prev.techniques.filter(i => i !== t) : [...prev.techniques, t]
    }));
  };

  const addControle = () => {
    setFormData({ ...formData, controles: [...formData.controles, { point: '', methode: '', type: 'Autocontrôle' }] });
  };

  const handleSave = async () => {
    if (!formData.signature_redacteur) return toast.error("Signature requise.");
    const toastId = toast.loading("Génération du Mode Opératoire...");
    const { error } = await supabase.from('chantier_modop').insert([{ chantier_id: chantierId, ...formData, signatures: { redacteur: formData.signature_redacteur } }]);
    if (error) toast.error("Erreur de sauvegarde");
    else {
        toast.success("✅ MODOP validé !");
        setView('list'); setStep(1);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-700"/></div>;

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
                </div>
                <button onClick={() => setView('create')} className="bg-blue-700 hover:bg-black text-white px-8 py-4 rounded-2xl font-black uppercase flex items-center gap-2 transition-all shadow-lg active:scale-95">
                    <Plus size={20}/> Créer un MODOP
                </button>
            </div>
            <div className="space-y-4">
                {archives.map(a => (
                    <div key={a.id} className="flex justify-between items-center p-6 bg-gray-50 rounded-3xl border border-gray-100 hover:bg-white hover:shadow-lg transition-all">
                        <div>
                            <p className="font-black text-gray-800 text-lg uppercase leading-tight">MODOP - {a.version}</p>
                            <p className="text-xs font-bold text-gray-400">Rédigé le {new Date(a.created_at).toLocaleDateString()} par {a.redacteur}</p>
                        </div>
                        <button onClick={() => { setSelectedMODOP(a); setView('view'); }} className="p-3 bg-white rounded-xl text-blue-600 border border-gray-200 shadow-sm"><Eye size={20}/></button>
                    </div>
                ))}
            </div>
        </div>
      </div>
    );
  }

  // VISIONNEUSE PDF
  if (view === 'view' && selectedMODOP) {
      return (
          <div className="min-h-screen bg-gray-100 p-4 md:p-8">
               <style dangerouslySetInnerHTML={{__html: `
                @media print {
                  @page { size: A4 portrait; margin: 10mm; }
                  body * { visibility: hidden; }
                  .print-container, .print-container * { visibility: visible; }
                  .print-container { position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; margin: 0; padding: 0; box-shadow: none; border: none; }
                }
              `}}/>
              <div className="max-w-4xl mx-auto mb-6 flex justify-between no-print">
                  <button onClick={() => setView('list')} className="flex items-center gap-2 text-gray-500 font-bold bg-white px-4 py-2 rounded-xl border border-gray-200"><ArrowLeft size={18}/> Retour</button>
                  <button onClick={() => window.print()} className="bg-blue-700 text-white px-6 py-2.5 rounded-xl font-black uppercase text-xs flex items-center gap-2 shadow-lg"><Printer size={16}/> Imprimer MODOP</button>
              </div>
              <div className="print-container max-w-4xl mx-auto bg-white p-10 shadow-2xl border border-gray-100">
                  <div className="border-4 border-blue-900 p-6 text-center mb-8">
                      <h1 className="text-3xl font-black uppercase text-blue-900">MODE OPÉRATOIRE</h1>
                      <p className="text-sm font-bold uppercase mt-2">Chantier : {chantierInfo?.nom} | Version : {selectedMODOP.version}</p>
                  </div>
                  <div className="space-y-6 text-sm">
                      <section>
                          <h3 className="bg-blue-900 text-white p-2 font-black uppercase mb-2">1. Localisation & Travaux</h3>
                          <p><strong>Lieu :</strong> {selectedMODOP.localisation}</p>
                          <p className="mt-2"><strong>Description :</strong> {selectedMODOP.description_travaux}</p>
                      </section>
                      <section>
                          <h3 className="bg-blue-900 text-white p-2 font-black uppercase mb-2">2. Techniques mises en œuvre</h3>
                          <ul className="list-disc pl-5">
                              {selectedMODOP.techniques?.map((t: string) => <li key={t} className="font-bold">{t}</li>)}
                          </ul>
                      </section>
                      <section>
                          <h3 className="bg-blue-900 text-white p-2 font-black uppercase mb-2">3. Procédures d'urgence</h3>
                          <p className="italic text-red-700 font-bold border-2 border-red-200 p-3 bg-red-50">{selectedMODOP.procedures_urgence}</p>
                      </section>
                  </div>
              </div>
          </div>
      );
  }

  // WIZARD CREATION
  return (
    <div className="min-h-screen bg-[#2d3436] p-4 md:p-8 font-['Fredoka'] flex items-center justify-center text-gray-800">
        <Toaster position="top-center" />
        <div className="w-full max-w-5xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col min-h-[800px] animate-in zoom-in-95 duration-300">
            <div className="bg-blue-700 p-8 text-white text-center relative">
                <button onClick={() => setView('list')} className="absolute top-8 left-8 p-2 bg-white/10 rounded-full hover:bg-white/20"><X size={20}/></button>
                <h1 className="text-3xl font-black uppercase tracking-tighter">Rédaction MODOP</h1>
                <p className="text-[10px] font-bold text-blue-200 uppercase tracking-[0.2em] mt-2">Maîtrise Opérationnelle des Travaux</p>
            </div>

            <div className="flex-1 p-10 overflow-y-auto">
                {step === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase border-b-4 border-blue-700 inline-block">1. Informations Générales</h3>
                        <div className="grid grid-cols-2 gap-6 bg-gray-50 p-6 rounded-3xl">
                            <div><label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Rédacteur</label><input type="text" className="w-full p-4 rounded-2xl font-bold" value={formData.redacteur} onChange={e=>setFormData({...formData, redacteur:e.target.value})}/></div>
                            <div><label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Localisation des travaux</label><input type="text" className="w-full p-4 rounded-2xl font-bold" value={formData.localisation} onChange={e=>setFormData({...formData, localisation:e.target.value})}/></div>
                        </div>
                        <div><label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Description détaillée des travaux</label><textarea className="w-full p-4 rounded-2xl font-bold h-32 bg-gray-50" value={formData.description_travaux} onChange={e=>setFormData({...formData, description_travaux:e.target.value})}/></div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase border-b-4 border-blue-700 inline-block">2. Techniques & Méthodes</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {["Lavage HP", "Décapage Sablage", "Décapage Mécanique", "Application Airless", "Peinture Manuelle", "Isolation", "Échafaudage"].map(t => (
                                <button key={t} onClick={() => toggleTechnique(t)} className={`p-4 rounded-2xl font-black uppercase text-xs border-2 transition-all ${formData.techniques.includes(t) ? 'bg-blue-700 border-blue-700 text-white shadow-lg' : 'bg-gray-50 border-transparent text-gray-400'}`}>{t}</button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase border-b-4 border-blue-700 inline-block">3. Validation & Signature</h3>
                        <div className="border-4 border-gray-100 rounded-[30px] h-64 bg-gray-50 relative overflow-hidden">
                            <SignatureCanvas ref={sigPad} penColor="black" canvasProps={{className: 'absolute inset-0 w-full h-full'}} />
                        </div>
                    </div>
                )}
            </div>

            <div className="p-8 border-t bg-gray-50 flex justify-between">
                {step > 1 && <button onClick={()=>setStep(step-1)} className="px-8 py-4 font-black uppercase text-xs text-gray-400">Retour</button>}
                <button onClick={() => {
                    if (step === 3) {
                        setFormData({...formData, signature_redacteur: sigPad.current.toDataURL()});
                        setTimeout(handleSave, 100);
                    } else setStep(step+1);
                }} className="bg-blue-700 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 ml-auto shadow-xl">
                    {step === 3 ? "Valider le MODOP" : "Étape Suivante"} <ChevronRight size={18}/>
                </button>
            </div>
        </div>
    </div>
  );
}