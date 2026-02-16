"use client";

import React, { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ShieldCheck, User, Camera, UploadCloud, ArrowRight, CheckCircle2, 
  AlertTriangle, Siren, HardHat, FileCheck, X, Save, Printer, QrCode 
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { useRouter } from 'next/navigation';

export default function HSEAccueilSecurite() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const sigPad = useRef<any>(null);

  // --- DONNÉES DU FORMULAIRE ---
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    entreprise: '',
    poste: '',
    chantier_id: 'c1', // À dynamiser avec un Select ou via Props si intégré
    photo_habilitations: null as File | null,
    quiz_answers: { q1: '', q2: '', q3: '' }
  });

  // --- QUIZ DATA ---
  const QUIZ = [
    { 
      id: 'q1', 
      question: "En cas d'alarme évacuation, où devez-vous aller ?", 
      options: ["Je reste à mon poste", "Je cours vers la sortie", "Je rejoins le Point de Rassemblement"], 
      correct: "Je rejoins le Point de Rassemblement" 
    },
    { 
      id: 'q2', 
      question: "Les lunettes de sécurité sont-elles obligatoires ?", 
      options: ["Oui, en permanence", "Non, sauf s'il y a du soleil", "Uniquement pour meuler"], 
      correct: "Oui, en permanence" 
    },
    { 
      id: 'q3', 
      question: "Que faire en cas de presque-accident ?", 
      options: ["Rien, ce n'est pas grave", "Je préviens immédiatement mon chef", "Je rentre chez moi"], 
      correct: "Je préviens immédiatement mon chef" 
    }
  ];

  // --- LOGIQUE ---
  const handleUpload = (e: any) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, photo_habilitations: e.target.files[0] });
    }
  };

  const handleQuizChange = (qId: string, value: string) => {
    setFormData({ ...formData, quiz_answers: { ...formData.quiz_answers, [qId]: value } });
  };

  const validateQuiz = () => {
    const isCorrect = 
      formData.quiz_answers.q1 === QUIZ[0].correct &&
      formData.quiz_answers.q2 === QUIZ[1].correct &&
      formData.quiz_answers.q3 === QUIZ[2].correct;
    
    if (!isCorrect) alert("❌ Certaines réponses sont incorrectes. Merci de relire les consignes.");
    return isCorrect;
  };

  const handleSave = async () => {
    if (sigPad.current.isEmpty()) return alert("Signature obligatoire");
    setLoading(true);

    try {
      // 1. Upload Photo (Simulation)
      let photoUrl = ""; 
      if (formData.photo_habilitations) {
        // Logique d'upload Supabase Storage ici
        // const { data } = await supabase.storage.from('hse-docs').upload(...)
        photoUrl = "https://via.placeholder.com/150"; // Mock
      }

      // 2. Signature
      const signatureData = sigPad.current.getTrimmedCanvas().toDataURL('image/png');

      // 3. Insert DB
      const { error } = await supabase.from('hse_accueils_securite').insert([{
        nom: formData.nom,
        prenom: formData.prenom,
        entreprise: formData.entreprise,
        poste: formData.poste,
        chantier_id: formData.chantier_id, // Idéalement récupéré du contexte
        photo_habilitations_url: photoUrl,
        signature_url: signatureData,
        quiz_resultat: formData.quiz_answers,
        statut: 'valide'
      }]);

      if (error) throw error;
      
      setStep(5); // Vers le Pass Virtuel
    } catch (e: any) {
      console.error(e);
      alert("Erreur lors de l'enregistrement : " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-['Fredoka'] p-4 md:p-8 flex items-center justify-center">
      
      <div className="bg-white w-full max-w-4xl rounded-[30px] shadow-2xl overflow-hidden border border-gray-100 flex flex-col min-h-[600px]">
        
        {/* HEADER */}
        <div className="bg-[#2d3436] p-6 text-white flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black uppercase flex items-center gap-2"><ShieldCheck className="text-green-400"/> Accueil Sécurité</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Induction nouvel arrivant / Visiteur</p>
          </div>
          <button onClick={() => router.back()} className="bg-white/10 p-2 rounded-xl hover:bg-white/20 transition-colors"><X/></button>
        </div>

        {/* PROGRESS BAR */}
        <div className="w-full h-1.5 bg-gray-100">
          <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${(step / 5) * 100}%` }}></div>
        </div>

        <div className="flex-1 p-8 overflow-y-auto">
          
          {/* ÉTAPE 1 : IDENTITÉ */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
              <h2 className="text-xl font-black text-gray-800 uppercase mb-4 flex items-center gap-2"><User className="text-blue-500"/> 1. Identification</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-gray-400 uppercase">Nom</label><input type="text" className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none border border-transparent focus:border-blue-500" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-gray-400 uppercase">Prénom</label><input type="text" className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none border border-transparent focus:border-blue-500" value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-gray-400 uppercase">Entreprise</label><input type="text" className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none border border-transparent focus:border-blue-500" placeholder="Ex: ALTRAD ou Sous-traitant..." value={formData.entreprise} onChange={e => setFormData({...formData, entreprise: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-gray-400 uppercase">Poste / Métier</label><input type="text" className="w-full bg-gray-50 p-3 rounded-xl font-bold outline-none border border-transparent focus:border-blue-500" value={formData.poste} onChange={e => setFormData({...formData, poste: e.target.value})} /></div>
              </div>
              
              <div className="mt-6">
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Preuve Habilitations / Carte BTP (Photo)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center text-gray-400 hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer relative">
                  <input type="file" accept="image/*" onChange={handleUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  {formData.photo_habilitations ? (
                    <div className="text-green-600 font-bold flex flex-col items-center"><CheckCircle2 size={32} className="mb-2"/>Fichier chargé : {formData.photo_habilitations.name}</div>
                  ) : (
                    <div className="flex flex-col items-center"><Camera size={32} className="mb-2"/><p className="text-sm font-bold">Prendre une photo ou importer</p></div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 2 : CONSIGNES (Lecture) */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
              <h2 className="text-xl font-black text-gray-800 uppercase mb-4 flex items-center gap-2"><Siren className="text-red-500"/> 2. Consignes Vitales du Site</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                  <h3 className="font-black text-orange-600 uppercase flex items-center gap-2 mb-2"><AlertTriangle size={18}/> Risques Majeurs</h3>
                  <ul className="text-xs font-bold text-orange-800 space-y-2 list-disc pl-4">
                    <li>Coactivité engins/piétons : Gilet HV obligatoire.</li>
                    <li>Travaux en hauteur : Harnais accroché en nacelle.</li>
                    <li>Risque électrique : Pas d'intervention sans habilitation.</li>
                  </ul>
                </div>
                <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                  <h3 className="font-black text-green-600 uppercase flex items-center gap-2 mb-2"><Siren size={18}/> Urgence & Secours</h3>
                  <ul className="text-xs font-bold text-green-800 space-y-2 list-disc pl-4">
                    <li>Point de rassemblement : Parking Nord.</li>
                    <li>SST présents : Liste affichée au bungalow.</li>
                    <li>En cas d'accident : Prévenir le chef de chantier (ne pas appeler le 15 seul).</li>
                  </ul>
                </div>
                <div className="col-span-1 md:col-span-2 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <h3 className="font-black text-blue-600 uppercase flex items-center gap-2 mb-2"><HardHat size={18}/> EPI Obligatoires</h3>
                  <div className="flex gap-4 justify-center py-2">
                    {['Casque', 'Lunettes', 'Gants', 'Chaussures', 'Gilet'].map(epi => (
                      <div key={epi} className="flex flex-col items-center gap-1">
                        <div className="w-10 h-10 rounded-full bg-white border-2 border-blue-200 flex items-center justify-center text-blue-500"><CheckCircle2 size={20}/></div>
                        <span className="text-[10px] font-black text-blue-800 uppercase">{epi}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 3 : QUIZ */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
              <h2 className="text-xl font-black text-gray-800 uppercase mb-4 flex items-center gap-2"><FileCheck className="text-purple-500"/> 3. Validation des acquis</h2>
              <div className="space-y-6">
                {QUIZ.map((q, idx) => (
                  <div key={q.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="font-bold text-gray-800 mb-3">{idx + 1}. {q.question}</p>
                    <div className="space-y-2">
                      {q.options.map(opt => (
                        <label key={opt} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${formData.quiz_answers[q.id as keyof typeof formData.quiz_answers] === opt ? 'border-purple-500 bg-purple-50' : 'border-transparent bg-white hover:bg-gray-100'}`}>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.quiz_answers[q.id as keyof typeof formData.quiz_answers] === opt ? 'border-purple-500' : 'border-gray-300'}`}>
                            {formData.quiz_answers[q.id as keyof typeof formData.quiz_answers] === opt && <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>}
                          </div>
                          <input type="radio" name={q.id} value={opt} onChange={() => handleQuizChange(q.id, opt)} className="hidden"/>
                          <span className="text-sm font-bold text-gray-600">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ÉTAPE 4 : SIGNATURE */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
              <h2 className="text-xl font-black text-gray-800 uppercase mb-4 flex items-center gap-2"><FileCheck className="text-[#2d3436]"/> 4. Engagement</h2>
              <div className="bg-gray-100 p-4 rounded-2xl text-xs font-medium text-gray-600 italic">
                "Je soussigné(e), déclare avoir pris connaissance des risques et consignes de sécurité du site. Je m'engage à les respecter scrupuleusement."
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-2xl bg-white h-64 relative overflow-hidden">
                 <SignatureCanvas 
                    ref={sigPad} 
                    penColor="black"
                    canvasProps={{className: 'absolute inset-0 w-full h-full cursor-crosshair'}} 
                 />
                 <div className="absolute bottom-2 w-full text-center text-xs font-bold text-gray-300 uppercase pointer-events-none">Signez ici</div>
                 <button onClick={() => sigPad.current.clear()} className="absolute top-2 right-2 bg-gray-200 px-3 py-1 rounded text-xs font-bold hover:bg-gray-300">Effacer</button>
              </div>
            </div>
          )}

          {/* ÉTAPE 5 : SUCCÈS & PASS VIRTUEL */}
          {step === 5 && (
            <div className="flex flex-col items-center justify-center animate-in zoom-in-95 duration-300 py-10">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-500 mb-6">
                <CheckCircle2 size={48}/>
              </div>
              <h2 className="text-3xl font-black uppercase text-gray-800 mb-2">Accueil Validé !</h2>
              <p className="text-gray-400 font-bold mb-8">Vous êtes autorisé à accéder au site.</p>

              {/* LE PASS VIRTUEL */}
              <div className="bg-white w-full max-w-sm rounded-[20px] shadow-2xl border border-gray-200 overflow-hidden relative print:border-2 print:border-black">
                <div className="bg-[#2d3436] h-24 absolute top-0 w-full z-0"></div>
                <div className="relative z-10 p-6 flex flex-col items-center pt-10">
                  <div className="w-24 h-24 bg-gray-200 rounded-full border-4 border-white shadow-lg mb-4 overflow-hidden">
                     {/* Placeholder photo ou avatar */}
                     <User size={60} className="mt-4 text-gray-400 mx-auto"/>
                  </div>
                  <h3 className="text-xl font-black text-gray-800 uppercase">{formData.prenom} {formData.nom}</h3>
                  <p className="text-sm font-bold text-gray-500 uppercase mb-4">{formData.entreprise}</p>
                  
                  <div className="w-full bg-green-50 rounded-xl p-3 mb-4 text-center border border-green-100">
                    <p className="text-[10px] text-green-600 font-black uppercase tracking-widest">Statut Sécurité</p>
                    <p className="text-lg font-black text-green-700 uppercase flex items-center justify-center gap-2"><ShieldCheck size={18}/> Habilité</p>
                  </div>

                  <div className="w-full border-t border-gray-100 pt-4 flex justify-between items-end">
                    <div className="text-left">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Date d'accueil</p>
                      <p className="text-sm font-black text-gray-800">{new Date().toLocaleDateString()}</p>
                    </div>
                    <QrCode size={40} className="text-[#2d3436]"/>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-4 print:hidden">
                <button onClick={() => window.print()} className="flex items-center gap-2 bg-gray-100 px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200"><Printer size={18}/> Imprimer</button>
                <button onClick={() => router.push('/hse')} className="flex items-center gap-2 bg-[#2d3436] px-6 py-3 rounded-xl font-bold text-white hover:bg-black">Terminer</button>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER NAVIGATION */}
        {step < 5 && (
          <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between">
            {step > 1 ? (
              <button onClick={() => setStep(step - 1)} className="px-6 py-3 font-bold text-gray-500 hover:text-gray-800">Retour</button>
            ) : (<div></div>)}
            
            {step < 4 ? (
              <button 
                onClick={() => {
                  if (step === 1 && (!formData.nom || !formData.entreprise)) return alert("Remplissez les champs obligatoires");
                  if (step === 3 && !validateQuiz()) return;
                  setStep(step + 1);
                }} 
                className="bg-[#2d3436] text-white px-8 py-3 rounded-xl font-black uppercase shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
              >
                Suivant <ArrowRight size={18}/>
              </button>
            ) : (
              <button 
                onClick={handleSave} 
                disabled={loading}
                className="bg-green-500 text-white px-8 py-3 rounded-xl font-black uppercase shadow-lg hover:bg-green-600 transition-transform flex items-center gap-2"
              >
                {loading ? 'Enregistrement...' : 'Valider & Signer'} <Save size={18}/>
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
