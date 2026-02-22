"use client";

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ShieldCheck, User, Camera, ArrowRight, CheckCircle2, 
  AlertTriangle, Siren, HardHat, FileCheck, X, Save, 
  Printer, QrCode, Loader2 
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { useRouter, useSearchParams } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

// Import de la configuration métier (Checklists, etc.)
import { INDUCTION_CHECKLIST } from '../data';

export default function HSEAccueilSecuritePage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center font-black uppercase text-gray-300 animate-pulse">Initialisation de l'Accueil...</div>}>
      <AccueilSecuriteContent />
    </Suspense>
  );
}

function AccueilSecuriteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chantierId = searchParams.get('cid');

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const sigPad = useRef<any>(null);

  // État étendu pour correspondre au document Word
  const [formData, setFormData] = useState({
    nom: '', 
    prenom: '', 
    entreprise: '', 
    type_personnel: 'organique', // organique, interimaire, sous_traitant
    documents_cadres: {
        ppsps: '',
        pdp: '',
        phse: '',
        pqc: ''
    },
    checklist: [] as string[],
    controles_prealables: {
        aptitude_medicale: false,
        carte_btp: false,
        habilitations_specifiques: false
    },
    signature_url: '' // Sauvegarde mémoire
  });

  // Recharge la signature si on revient à l'étape 4
  useEffect(() => {
    if (step === 4 && formData.signature_url && sigPad.current) {
        setTimeout(() => {
            sigPad.current?.fromDataURL(formData.signature_url);
        }, 50);
    }
  }, [step]);

  useEffect(() => {
    if (!chantierId) {
      toast.error("Contexte chantier manquant");
      setTimeout(() => router.push('/hse'), 2000);
    }
  }, [chantierId, router]);

  const toggleChecklist = (item: string) => {
      setFormData(prev => ({
          ...prev,
          checklist: prev.checklist.includes(item) 
            ? prev.checklist.filter(i => i !== item)
            : [...prev.checklist, item]
      }));
  };

  const handleSave = async () => {
    if (!formData.signature_url) return toast.error("La signature est obligatoire");
    setLoading(true);

    const payload = {
        chantier_id: chantierId,
        nom: formData.nom,
        prenom: formData.prenom,
        entreprise: formData.entreprise,
        type_personnel: formData.type_personnel,
        documents_cadres: formData.documents_cadres,
        checklist_validee: formData.checklist,
        controles_prealables: formData.controles_prealables,
        signature_url: formData.signature_url,
        statut: 'valide'
    };

    const { error } = await supabase.from('hse_accueils_securite').insert([payload]);

    if (!error) {
        setStep(5);
        toast.success("Accueil validé et tracé !");
    } else {
        toast.error("Erreur de sauvegarde");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#2d3436] font-['Fredoka'] p-4 md:p-8 flex items-center justify-center text-gray-800">
      <Toaster position="top-center" />
      
      <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col min-h-[700px] animate-in zoom-in-95 duration-300">
        
        {/* HEADER */}
        <div className="bg-[#e21118] p-8 text-white relative flex justify-between items-center">
          <button onClick={() => router.back()} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><X size={20}/></button>
          <div className="text-center">
              <h1 className="text-2xl font-black uppercase tracking-tighter flex items-center justify-center gap-3">
                  <ShieldCheck className="text-white" size={28} /> Sensibilisation & Accueil
              </h1>
              <p className="text-[10px] font-bold text-red-200 uppercase tracking-[0.2em] mt-1">Démarche Qualité / Sûreté / Sécurité / Env.</p>
          </div>
          <div className="w-10"></div> {/* Spacer pour centrer */}
        </div>

        {/* PROGRESS BAR */}
        <div className="flex h-1.5 bg-gray-100">
            {[1,2,3,4].map(s => (
                <div key={s} className={`flex-1 transition-all duration-700 ${step >= s ? 'bg-red-500' : 'bg-gray-100'}`}></div>
            ))}
        </div>

        <div className="flex-1 p-8 md:p-10 overflow-y-auto custom-scrollbar">
            
            {/* --- ÉTAPE 1 : CONTEXTE & DOCUMENTS CADRES --- */}
            {step === 1 && (
                <div className="space-y-8 animate-in slide-in-from-right-10">
                    <h2 className="text-xl font-black uppercase border-b-4 border-red-500 inline-block pb-1">1. Contexte & Base Légal</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                        <Input label="Nom de l'arrivant" val={formData.nom} set={(v:any)=>setFormData({...formData, nom: v.toUpperCase()})}/>
                        <Input label="Prénom" val={formData.prenom} set={(v:any)=>setFormData({...formData, prenom: v})}/>
                        
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest block mb-1">Type de personnel</label>
                            <select className="w-full bg-white border border-gray-200 rounded-2xl p-4 font-bold text-sm outline-none cursor-pointer shadow-sm"
                                    value={formData.type_personnel} onChange={e=>setFormData({...formData, type_personnel: e.target.value})}>
                                <option value="organique">Personnel Organique (ALTRAD)</option>
                                <option value="interimaire">Personnel Intérimaire</option>
                                <option value="sous_traitant">Sous-traitant / Prestataire</option>
                            </select>
                        </div>
                        
                        {(formData.type_personnel === 'interimaire' || formData.type_personnel === 'sous_traitant') && (
                            <Input label="Nom de l'Entreprise / Agence" val={formData.entreprise} set={(v:any)=>setFormData({...formData, entreprise: v})}/>
                        )}
                    </div>

                    <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
                        <h3 className="text-sm font-black text-blue-800 uppercase mb-4 flex items-center gap-2"><FileCheck size={18}/> Documents supports utilisés</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="N° PPSPS / PDP" val={formData.documents_cadres.ppsps} set={(v:any)=>setFormData({...formData, documents_cadres:{...formData.documents_cadres, ppsps: v}})}/>
                            <Input label="N° PHSE" val={formData.documents_cadres.phse} set={(v:any)=>setFormData({...formData, documents_cadres:{...formData.documents_cadres, phse: v}})}/>
                            <Input label="N° PQC (Qualité)" val={formData.documents_cadres.pqc} set={(v:any)=>setFormData({...formData, documents_cadres:{...formData.documents_cadres, pqc: v}})}/>
                        </div>
                    </div>
                </div>
            )}

            {/* --- ÉTAPE 2 : CHECKLIST DE SENSIBILISATION --- */}
            {step === 2 && (
                <div className="space-y-8 animate-in slide-in-from-right-10">
                    <div className="flex justify-between items-end border-b-4 border-red-500 pb-2">
                        <h2 className="text-xl font-black uppercase text-gray-800">2. Programme de Sensibilisation</h2>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-1 rounded">Cocher les points abordés</span>
                    </div>

                    <ChecklistSection 
                        title="Organisation Générale / Qualité" 
                        items={INDUCTION_CHECKLIST.organisation_qualite} 
                        checkedItems={formData.checklist} 
                        onToggle={toggleChecklist} 
                    />

                    <ChecklistSection 
                        title="Sûreté & Accès" 
                        items={INDUCTION_CHECKLIST.surete} 
                        checkedItems={formData.checklist} 
                        onToggle={toggleChecklist} 
                    />

                    <ChecklistSection 
                        title="Sécurité / Santé / Environnement" 
                        items={INDUCTION_CHECKLIST.securite_environnement} 
                        checkedItems={formData.checklist} 
                        onToggle={toggleChecklist} 
                    />
                </div>
            )}

            {/* --- ÉTAPE 3 : CONTRÔLE DES PRÉREQUIS --- */}
            {step === 3 && (
                <div className="space-y-8 animate-in slide-in-from-right-10">
                    <h2 className="text-xl font-black uppercase border-b-4 border-red-500 inline-block pb-1">3. Contrôle des Prérequis</h2>
                    <p className="text-sm font-bold text-gray-500">Le chef de chantier doit vérifier physiquement les documents suivants avant d'autoriser l'accès.</p>
                    
                    <div className="space-y-4">
                        <VerificationRow 
                            label="Aptitude Médicale à jour ?" 
                            checked={formData.controles_prealables.aptitude_medicale} 
                            onChange={(val: boolean) => setFormData({...formData, controles_prealables:{...formData.controles_prealables, aptitude_medicale: val}})}
                        />
                        <VerificationRow 
                            label="Carte BTP présente et valide ?" 
                            checked={formData.controles_prealables.carte_btp} 
                            onChange={(val: boolean) => setFormData({...formData, controles_prealables:{...formData.controles_prealables, carte_btp: val}})}
                        />
                        <VerificationRow 
                            label="Habilitations spécifiques vérifiées (Hauteur, Élec, etc.) ?" 
                            checked={formData.controles_prealables.habilitations_specifiques} 
                            onChange={(val: boolean) => setFormData({...formData, controles_prealables:{...formData.controles_prealables, habilitations_specifiques: val}})}
                        />
                    </div>
                </div>
            )}

            {/* --- ÉTAPE 4 : ÉMARGEMENT --- */}
            {step === 4 && (
                <div className="space-y-8 animate-in slide-in-from-right-10">
                    <h2 className="text-xl font-black uppercase border-b-4 border-red-500 inline-block pb-1">4. Engagement de l'arrivant</h2>
                    
                    <div className="bg-gray-100 p-6 rounded-3xl border border-gray-200">
                        <p className="text-sm font-bold text-gray-600 italic leading-relaxed text-justify">
                            "Je soussigné(e) <span className="text-black font-black uppercase">{formData.prenom} {formData.nom}</span>, atteste avoir suivi la sensibilisation au démarrage du chantier. 
                            J'ai pris connaissance des documents cadres (PPSPS/PdP) et je m'engage à respecter les consignes Qualité, Sûreté, Sécurité et Environnement 
                            applicables sur ce site. J'atteste également disposer des aptitudes médicales requises pour mon poste."
                        </p>
                    </div>

                    <div className="border-4 border-gray-100 rounded-[30px] h-64 bg-gray-50 relative overflow-hidden flex flex-col">
                        <div className="flex-1 relative">
                            <SignatureCanvas ref={sigPad} penColor="black" canvasProps={{className: 'absolute inset-0 w-full h-full cursor-crosshair'}} />
                            <div className="absolute bottom-4 w-full text-center text-[10px] font-black uppercase text-gray-300 pointer-events-none tracking-widest">Émargement de l'arrivant</div>
                            <button onClick={() => sigPad.current?.clear()} className="absolute top-4 right-4 bg-white p-2 px-4 rounded-xl text-[10px] font-black border border-gray-100 uppercase hover:bg-gray-100 transition-colors shadow-sm z-10">Effacer</button>
                        </div>
                        <button 
                            onClick={() => {
                                if (sigPad.current && !sigPad.current.isEmpty()) {
                                    setFormData({...formData, signature_url: sigPad.current.getTrimmedCanvas().toDataURL('image/png')});
                                    toast.success("Signature validée");
                                } else {
                                    toast.error("Veuillez signer");
                                }
                            }} 
                            className="w-full bg-emerald-500 text-white font-black uppercase text-xs py-3 hover:bg-emerald-600 transition-colors"
                        >
                            Valider la signature
                        </button>
                    </div>
                </div>
            )}

            {/* --- ÉTAPE 5 : SUCCÈS --- */}
            {step === 5 && (
                <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in-95">
                    <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-8 border-4 border-green-100 shadow-inner">
                        <CheckCircle2 size={48}/>
                    </div>
                    <h2 className="text-3xl font-black uppercase text-gray-800">Dossier Validé</h2>
                    <p className="text-sm font-bold text-gray-400 mt-2 uppercase tracking-widest">Traçabilité assurée</p>
                    
                    <div className="mt-12 p-8 bg-white border border-gray-100 rounded-[30px] shadow-xl w-full max-w-sm text-center relative overflow-hidden">
                        <div className="bg-[#2d3436] h-3 absolute top-0 left-0 w-full"></div>
                        <QrCode className="mx-auto mb-6 text-gray-800" size={80}/>
                        <p className="font-black text-xl uppercase tracking-tighter">{formData.prenom} {formData.nom}</p>
                        <p className="text-xs font-bold text-gray-500 uppercase mt-1 mb-6">{formData.type_personnel === 'organique' ? 'ALTRAD' : formData.entreprise}</p>
                        <div className="bg-gray-50 py-3 rounded-xl border border-gray-100">
                            <p className="text-[10px] font-black text-green-500 uppercase flex items-center justify-center gap-2"><ShieldCheck size={14}/> Accès Autorisé</p>
                        </div>
                    </div>

                    <div className="mt-10 flex gap-4 w-full max-w-sm">
                        <button onClick={() => window.print()} className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-black uppercase text-xs hover:bg-gray-200 transition-all flex items-center justify-center gap-2">
                            <Printer size={16}/> Imprimer
                        </button>
                        <button onClick={() => router.push('/hse')} className="flex-1 bg-[#2d3436] text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2">
                            Terminer <ArrowRight size={16}/>
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* NAVIGATION FOOTER */}
        {step < 5 && (
            <div className="p-8 bg-gray-50 flex justify-between items-center border-t border-gray-100 rounded-b-[40px]">
                {step > 1 ? (
                    <button onClick={() => setStep(step - 1)} className="px-6 py-4 font-black uppercase text-[10px] text-gray-400 hover:text-gray-800 transition-colors">Retour</button>
                ) : <div/>}
                
                <button 
                    onClick={() => {
                        if (step === 1 && (!formData.nom || !formData.prenom)) return toast.error("Nom et Prénom requis");
                        if (step === 3 && (!formData.controles_prealables.aptitude_medicale || !formData.controles_prealables.carte_btp)) {
                            return toast.error("Les contrôles préalables de base doivent être validés.");
                        }
                        if (step === 4) {
                            if (!formData.signature_url) return toast.error("Validez la signature d'abord");
                            handleSave();
                        } else {
                            setStep(step + 1);
                        }
                    }}
                    disabled={loading}
                    className="bg-[#e21118] text-white px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" size={16}/> : step === 4 ? "Enregistrer l'Accueil" : "Étape Suivante"}
                    {step < 4 && <ArrowRight size={16}/>}
                </button>
            </div>
        )}
      </div>
    </div>
  );
}

// --- SOUS-COMPOSANTS ---

const Input = ({label, val, set, placeholder}:any) => (
    <div className="space-y-1.5">
        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">{label}</label>
        <input className="w-full bg-white border border-gray-200 rounded-2xl p-4 font-bold text-sm focus:ring-2 focus:ring-red-200 outline-none shadow-sm transition-all" placeholder={placeholder} value={val} onChange={e=>set(e.target.value)}/>
    </div>
);

const ChecklistSection = ({title, items, checkedItems, onToggle}: {title: string, items: string[], checkedItems: string[], onToggle: (i:string)=>void}) => (
    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200">
        <h3 className="text-sm font-black text-gray-700 uppercase mb-4">{title}</h3>
        <div className="space-y-2">
            {items.map(item => {
                const isChecked = checkedItems.includes(item);
                return (
                    <div key={item} onClick={() => onToggle(item)} className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer border-2 transition-all ${isChecked ? 'bg-white border-green-500 shadow-sm' : 'bg-transparent border-transparent hover:bg-white hover:border-gray-200'}`}>
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 ${isChecked ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-transparent'}`}>
                            <Check size={14} strokeWidth={4}/>
                        </div>
                        <span className={`font-bold text-sm select-none ${isChecked ? 'text-gray-900' : 'text-gray-500'}`}>{item}</span>
                    </div>
                )
            })}
        </div>
    </div>
);

const VerificationRow = ({label, checked, onChange}: {label: string, checked: boolean, onChange: (v:boolean)=>void}) => (
    <div className={`flex justify-between items-center p-5 rounded-2xl border-2 transition-all ${checked ? 'bg-green-50 border-green-500' : 'bg-white border-gray-200'}`}>
        <span className={`font-black text-sm uppercase ${checked ? 'text-green-800' : 'text-gray-600'}`}>{label}</span>
        <div className="flex gap-2">
            <button onClick={() => onChange(false)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${!checked ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400'}`}>Non</button>
            <button onClick={() => onChange(true)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${checked ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>Oui</button>
        </div>
    </div>
);