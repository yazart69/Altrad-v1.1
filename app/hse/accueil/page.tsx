"use client";

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, User, Camera, ArrowRight, CheckCircle2, AlertTriangle, Siren, HardHat, FileCheck, X, Save, Printer, QrCode, Loader2 } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { useRouter, useSearchParams } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

export default function HSEAccueilSecuritePage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center font-black uppercase text-gray-300 animate-pulse">Initialisation du Kiosque...</div>}>
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

  const [formData, setFormData] = useState({
    nom: '', prenom: '', entreprise: '', poste: '', photo_url: '',
    quiz: { q1: '', q2: '', q3: '' }
  });

  useEffect(() => {
    if (!chantierId) {
      toast.error("Contexte chantier manquant");
      setTimeout(() => router.push('/hse'), 2000);
    }
  }, [chantierId]);

  const handleSave = async () => {
    if (sigPad.current.isEmpty()) return toast.error("La signature est obligatoire");
    setLoading(true);
    const signature = sigPad.current.getTrimmedCanvas().toDataURL('image/png');

    const { error } = await supabase.from('hse_accueils_securite').insert([{
        ...formData,
        chantier_id: chantierId,
        signature_url: signature,
        statut: 'valide'
    }]);

    if (!error) {
        setStep(5);
        toast.success("Accueil validé ! Bienvenue sur le site.");
    } else {
        toast.error("Erreur de sauvegarde");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#2d3436] font-['Fredoka'] p-4 md:p-8 flex items-center justify-center text-gray-800">
      <Toaster position="top-center" />
      
      <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col min-h-[650px] animate-in zoom-in-95 duration-300">
        
        {/* HEADER KIOSQUE */}
        <div className="bg-[#e21118] p-8 text-white text-center relative">
          <button onClick={() => router.back()} className="absolute top-8 left-8 p-2 bg-white/10 rounded-full hover:bg-white/20"><X size={20}/></button>
          <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-xl">
             <ShieldCheck className="text-red-600" size={32} />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tighter">Accueil Sécurité Site</h1>
          <p className="text-[10px] font-bold text-red-200 uppercase tracking-[0.2em] mt-2">Induction Obligatoire avant accès</p>
        </div>

        {/* PROGRESS BAR */}
        <div className="flex h-1.5 bg-gray-100">
            {[1,2,3,4].map(s => (
                <div key={s} className={`flex-1 transition-all duration-700 ${step >= s ? 'bg-red-500' : 'bg-gray-100'}`}></div>
            ))}
        </div>

        <div className="flex-1 p-10 overflow-y-auto">
            {step === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right-10">
                    <h2 className="text-xl font-black uppercase border-b-4 border-red-500 inline-block pb-1 mb-4">1. Identité</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input label="Nom" val={formData.nom} set={(v:any)=>setFormData({...formData, nom: v.toUpperCase()})}/>
                        <Input label="Prénom" val={formData.prenom} set={(v:any)=>setFormData({...formData, prenom: v})}/>
                        <div className="col-span-2">
                             <Input label="Entreprise / Employeur" val={formData.entreprise} set={(v:any)=>setFormData({...formData, entreprise: v})}/>
                        </div>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-10">
                    <h2 className="text-xl font-black uppercase border-b-4 border-red-500 inline-block pb-1 mb-4">2. Consignes Vitales</h2>
                    <div className="space-y-4">
                        <Consigne icon={Siren} color="text-red-500" title="Urgence" text="Point de rassemblement : Entrée principale. Alarme : Corne de brume." />
                        <Consigne icon={HardHat} color="text-blue-500" title="EPI Obligatoires" text="Casque, Lunettes, Gants, Chaussures S3 et Gilet HV en permanence." />
                        <Consigne icon={AlertTriangle} color="text-orange-500" title="Coactivité" text="Vigilance accrue vis-à-vis des engins de levage et nacelles." />
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-6 animate-in slide-in-from-right-10">
                    <h2 className="text-xl font-black uppercase border-b-4 border-red-500 inline-block pb-1 mb-4">3. Test Acquis</h2>
                    <div className="space-y-6">
                        <QuizQ q="Où est le point de rassemblement ?" options={["Bungalow", "Entrée Principale", "Parking Client"]} val={formData.quiz.q1} set={(v:any)=>setFormData({...formData, quiz:{...formData.quiz, q1:v}})} />
                        <QuizQ q="Les lunettes sont-elles obligatoires ?" options={["Oui", "Non", "Seulement si je meule"]} val={formData.quiz.q2} set={(v:any)=>setFormData({...formData, quiz:{...formData.quiz, q2:v}})} />
                    </div>
                </div>
            )}

            {step === 4 && (
                <div className="space-y-6 animate-in slide-in-from-right-10">
                    <h2 className="text-xl font-black uppercase border-b-4 border-red-500 inline-block pb-1 mb-4">4. Engagement</h2>
                    <p className="text-xs font-bold text-gray-500 italic leading-relaxed">
                        "Je certifie avoir reçu et compris les consignes de sécurité propres au site. Je m'engage à appliquer les règles Altrad et à exercer mon droit de retrait en cas de danger immédiat."
                    </p>
                    <div className="border-4 border-gray-100 rounded-[30px] h-64 bg-gray-50 relative overflow-hidden">
                        <SignatureCanvas ref={sigPad} penColor="black" canvasProps={{className: 'absolute inset-0 w-full h-full cursor-crosshair'}} />
                        <div className="absolute bottom-4 w-full text-center text-[10px] font-black uppercase text-gray-300 pointer-events-none tracking-widest">Signer ici</div>
                        <button onClick={() => sigPad.current.clear()} className="absolute top-4 right-4 bg-white p-2 rounded-xl text-[10px] font-black border border-gray-100 uppercase hover:bg-gray-100 transition-colors shadow-sm">Effacer</button>
                    </div>
                </div>
            )}

            {step === 5 && (
                <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in-95">
                    <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-8 border-4 border-green-100">
                        <CheckCircle2 size={48}/>
                    </div>
                    <h2 className="text-3xl font-black uppercase text-gray-800">Accès Autorisé</h2>
                    <p className="text-sm font-bold text-gray-400 mt-2 uppercase tracking-widest">Bienvenue au travail {formData.prenom}</p>
                    
                    <div className="mt-12 p-6 bg-white border border-gray-100 rounded-3xl shadow-xl w-full text-center relative overflow-hidden">
                        <div className="bg-[#2d3436] h-2 absolute top-0 left-0 w-full"></div>
                        <QrCode className="mx-auto mb-4 text-gray-800" size={60}/>
                        <p className="font-black text-lg uppercase">{formData.prenom} {formData.nom}</p>
                        <p className="text-[10px] font-black text-green-500 uppercase mt-1">Validité : {new Date().toLocaleDateString()}</p>
                    </div>

                    <button onClick={() => router.push('/hse')} className="mt-10 bg-[#2d3436] text-white px-10 py-4 rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-black transition-all">Terminer</button>
                </div>
            )}
        </div>

        {/* NAVIGATION FOOTER */}
        {step < 5 && (
            <div className="p-8 bg-gray-50 flex justify-between items-center border-t border-gray-100">
                {step > 1 ? (
                    <button onClick={() => setStep(step - 1)} className="font-black uppercase text-[10px] text-gray-400 hover:text-gray-800 transition-colors">Retour</button>
                ) : <div/>}
                
                <button 
                    onClick={step === 4 ? handleSave : () => setStep(step + 1)}
                    disabled={loading}
                    className="bg-[#e21118] text-white px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" size={16}/> : step === 4 ? "Valider & Signer" : "Continuer"}
                    <ArrowRight size={16}/>
                </button>
            </div>
        )}
      </div>
    </div>
  );
}

const Input = ({label, val, set, placeholder}:any) => (
    <div className="space-y-1.5">
        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">{label}</label>
        <input className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-red-500 shadow-inner" placeholder={placeholder} value={val} onChange={e=>set(e.target.value)}/>
    </div>
);

const Consigne = ({icon:Icon, color, title, text}:any) => (
    <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 flex gap-4 items-start group hover:bg-white hover:shadow-lg transition-all">
        <div className={`p-3 rounded-2xl bg-white shadow-sm ${color}`}><Icon size={20}/></div>
        <div><p className={`text-xs font-black uppercase ${color} mb-1`}>{title}</p><p className="text-xs font-bold text-gray-500 leading-relaxed">{text}</p></div>
    </div>
);

const QuizQ = ({q, options, val, set}:any) => (
    <div className="space-y-3">
        <p className="text-xs font-black uppercase text-gray-700 ml-2">{q}</p>
        <div className="grid grid-cols-1 gap-2">
            {options.map((o:any) => (
                <button key={o} onClick={()=>set(o)} className={`p-4 rounded-2xl text-left text-xs font-bold border-2 transition-all ${val === o ? 'bg-red-50 border-red-500 text-red-600 shadow-md' : 'bg-gray-50 border-transparent text-gray-400 hover:bg-white hover:border-gray-200'}`}>{o}</button>
            ))}
        </div>
    </div>
);