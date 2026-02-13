"use client";

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ClipboardCheck, Users, Shield, MapPin, 
  User, Check, X, Save, PenTool, AlertCircle, 
  Trash2, MessageSquare, Camera
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas'; // Installer via: npm install react-signature-canvas

export default function HSEPrejobModule({ chantier, equipe, animateurId }) {
  const [step, setStep] = useState(1); // 1: Info/Equipe, 2: Briefing, 3: EPI, 4: Emargement, 5: Debriefing
  const [isSaving, setIsSaving] = useState(false);

  // --- ÉTATS DU FORMULAIRE (Fidèle à la fiche) ---
  const [generalInfo, setGeneralInfo] = useState({
    date: new Date().toISOString().split('T')[0],
    projet: chantier?.nom || '',
    unite_zone: '',
    poste_travail: ''
  });

  const [equipeStatus, setEquipeStatus] = useState({
    nb_personnes: equipe?.length || 0,
    aptitude_equipe: true,
    absents_equipe: false,
    equipe_heure: true
  });

  const [briefingChecks, setBriefingChecks] = useState({
    "Zone dégagée / risques pris en compte": false,
    "Absence risque plomb/amiante": false,
    "Description travaux / phases critiques": false,
    "Rôle de chacun défini": false,
    "Modes de communication définis": false,
    "Consignes et moyens de secours présentés": false,
    "Risques produits (FDS) présentés": false,
    "Stockage matériel / tri déchets": false,
    "Objectif avancement fin de poste": false,
    "Autorisation de travail conforme": false,
    "Moyen d'accès conforme": false,
    "Balisage zone": false,
    "Extincteur présent": false,
    "Eclairage adéquat": false,
    "Protection environnement (kit anti-pollution)": false,
    "Outillage conforme et contrôlé": false
  });

  const [epiSelection, setEpiSelection] = useState({
    "Tenue de base": true,
    "Sur tenue type 4/6": false,
    "Combinaison sablage": false,
    "Lunettes de base": true,
    "Lunettes étanches": false,
    "Visière complète": false,
    "Cagoule sablage": false,
    "Masque jetable": false,
    "Demi masque": false,
    "Masque complet": false,
    "Filtration P3": false,
    "Filtration A2P3": false,
    "Gants manutention": true,
    "Gants chimiques": false,
    "Gants de sablage": false,
    "EPI base: Chaussures montantes": true,
    "EPI base: Casque 4 points": true,
    "EPI base: Protections auditives": true
  });

  const [signatures, setSignatures] = useState([]); // {id_user, nom, signature_prejob, signature_debrief}
  const sigPad = useRef<any>(null);

  // --- LOGIQUE DE SAUVEGARDE ---
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('hse_prejob_briefings').insert([{
        chantier_id: chantier.id,
        projet: generalInfo.projet,
        unite_zone: generalInfo.unite_zone,
        poste_travail: generalInfo.poste_travail,
        animateur_id: animateurId,
        nb_personnes: equipeStatus.nb_personnes,
        aptitude_equipe: equipeStatus.aptitude_equipe,
        briefing_check: briefingChecks,
        epi_selection: epiSelection,
        signatures_prejob: signatures
      }]);
      if (error) throw error;
      alert("✅ Fiche Préjob enregistrée et archivée !");
    } catch (e: any) {
      alert("Erreur: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden font-['Fredoka']">
      
      {/* HEADER ALTRAD PREZIOSO  */}
      <div className="bg-[#e21118] p-8 text-white flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">PREJOB BRIEFING</h1>
          <p className="text-sm font-bold opacity-80 uppercase tracking-widest">Activité REVETEMENT</p>
        </div>
        <img src="/logo-altrad-white.png" alt="Altrad Prezioso" className="h-12" />
      </div>

      {/* NAVIGATION ÉTAPES */}
      <div className="flex bg-gray-50 border-b overflow-x-auto">
        {['Infos', 'Briefing', 'EPI', 'Émargement', 'Debriefing'].map((label, i) => (
          <button 
            key={i} 
            onClick={() => setStep(i + 1)}
            className={`px-8 py-4 text-xs font-black uppercase whitespace-nowrap transition-all ${step === i + 1 ? 'bg-white text-red-600 border-b-4 border-red-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      <div className="p-10">
        
        {/* STEP 1: INFORMATION GÉNÉRALE & ÉQUIPE [cite: 2, 4] */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2 md:col-span-1">
                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Date d'intervention</label>
                <input type="date" className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold" value={generalInfo.date} onChange={e => setGeneralInfo({...generalInfo, date: e.target.value})} />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Projet / Contrat</label>
                <input type="text" className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold" value={generalInfo.projet} readOnly />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Unité / Zone</label>
                <input type="text" className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold" placeholder="ex: Zone Sud / Cuve 4" value={generalInfo.unite_zone} onChange={e => setGeneralInfo({...generalInfo, unite_zone: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Poste de travail</label>
                <input type="text" className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold" value={generalInfo.poste_travail} onChange={e => setGeneralInfo({...generalInfo, poste_travail: e.target.value})} />
              </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-[30px] border border-blue-100 space-y-4">
              <h3 className="font-black uppercase text-blue-800 flex items-center gap-2"><Users size={20}/> État de l'Équipe</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm">
                  <span className="text-sm font-bold text-gray-700">Toute l'équipe est apte (physique/mental) ?</span>
                  <div className="flex gap-2">
                    <button onClick={() => setEquipeStatus({...equipeStatus, aptitude_equipe: true})} className={`p-2 rounded-lg ${equipeStatus.aptitude_equipe ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}><Check size={18}/></button>
                    <button onClick={() => setEquipeStatus({...equipeStatus, aptitude_equipe: false})} className={`p-2 rounded-lg ${!equipeStatus.aptitude_equipe ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400'}`}><X size={18}/></button>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm">
                  <span className="text-sm font-bold text-gray-700">Équipe arrivée à l'heure ?</span>
                  <div className="flex gap-2">
                    <button onClick={() => setEquipeStatus({...equipeStatus, equipe_heure: true})} className={`p-2 rounded-lg ${equipeStatus.equipe_heure ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}><Check size={18}/></button>
                    <button onClick={() => setEquipeStatus({...equipeStatus, equipe_heure: false})} className={`p-2 rounded-lg ${!equipeStatus.equipe_heure ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400'}`}><X size={18}/></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: POINTS DU BRIEFING  */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between mb-6">
               <h2 className="text-xl font-black uppercase text-gray-800">Checklist du Briefing Matin</h2>
               <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-3 py-1 rounded-full uppercase italic">Le visa atteste du partage [cite: 3]</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.keys(briefingChecks).map((check) => (
                <label key={check} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${briefingChecks[check] ? 'bg-green-50 border-green-500 shadow-md' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                  <span className="text-sm font-bold text-gray-700 leading-tight">{check}</span>
                  <input 
                    type="checkbox" 
                    className="w-6 h-6 rounded-lg text-green-600" 
                    checked={briefingChecks[check]} 
                    onChange={(e) => setBriefingChecks({...briefingChecks, [check]: e.target.checked})}
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: ÉQUIPEMENTS DE PROTECTION (EPI)  */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-xl font-black uppercase text-gray-800 flex items-center gap-2"><Shield className="text-red-600"/> Sélection des EPI requis</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
               {Object.keys(epiSelection).map((epi) => (
                 <button 
                  key={epi}
                  onClick={() => setEpiSelection({...epiSelection, [epi]: !epiSelection[epi]})}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${epiSelection[epi] ? 'bg-red-50 border-red-600 shadow-inner scale-95' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                 >
                   <div className="flex items-center gap-3">
                     <div className={`w-4 h-4 rounded border-2 ${epiSelection[epi] ? 'bg-red-600 border-red-600' : 'border-gray-300'}`}>
                        {epiSelection[epi] && <Check size={12} className="text-white"/>}
                     </div>
                     <span className={`text-[11px] font-black uppercase ${epiSelection[epi] ? 'text-red-700' : 'text-gray-400'}`}>{epi}</span>
                   </div>
                 </button>
               ))}
            </div>
          </div>
        )}

        {/* STEP 4: ÉMARGEMENT TACTILE [cite: 5, 6] */}
        {step === 4 && (
          <div className="space-y-8 animate-in fade-in">
            <div className="bg-yellow-50 p-6 rounded-3xl border border-yellow-200">
               <p className="text-xs font-bold text-yellow-800 italic leading-relaxed">
                  "Chaque membre s'engage à respecter les consignes et à réaliser la Minute d’Arrêt Sécurité avant de commencer."
               </p>
            </div>

            <div className="space-y-4">
              {equipe.map((membre) => (
                <div key={membre.id} className="bg-white border-2 border-gray-100 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 group hover:border-red-600 transition-colors shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center font-black text-gray-400 group-hover:bg-red-600 group-hover:text-white transition-colors uppercase">
                      {membre.nom.substring(0,1)}{membre.prenom.substring(0,1)}
                    </div>
                    <div>
                      <p className="font-black text-gray-900 uppercase leading-none">{membre.nom} {membre.prenom}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Émargement Pré-Job</p>
                    </div>
                  </div>
                  
                  {/* ZONE SIGNATURE TACTILE */}
                  <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl w-full md:w-64 h-32 relative overflow-hidden">
                    <SignatureCanvas 
                      ref={sigPad}
                      penColor='black'
                      canvasProps={{width: 300, height: 128, className: 'sigCanvas'}}
                    />
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      <button onClick={() => sigPad.current.clear()} className="p-2 bg-white rounded-lg shadow-sm hover:text-red-500"><Trash2 size={12}/></button>
                      <button className="p-2 bg-black text-white rounded-lg shadow-sm"><PenTool size={12}/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-8 border-t flex justify-end">
               <button 
                disabled={isSaving}
                onClick={handleSaveAll} 
                className="bg-red-600 text-white px-10 py-5 rounded-2xl font-black uppercase shadow-xl shadow-red-200 flex items-center gap-3 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
               >
                 {isSaving ? 'Envoi...' : <><Save size={24}/> Clôturer le Pré-Job</>}
               </button>
            </div>
          </div>
        )}

        {/* STEP 5: DEBRIEFING FIN DE POSTE  */}
        {step === 5 && (
          <div className="space-y-8 animate-in fade-in">
             <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Commentaires avancement scope / Fin de poste</label>
                <textarea className="w-full p-6 bg-gray-50 border-2 border-gray-100 rounded-3xl h-32 font-bold outline-none focus:border-red-600 transition-all"></textarea>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  "Évènement sécurité même minime ?",
                  "Problématique matériel / outillage ?",
                  "Zone rangée et déchets évacués ?",
                  "Remontées d'info du personnel ?"
                ].map((q) => (
                  <div key={q} className="bg-white border-2 border-gray-100 p-5 rounded-2xl flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-700">{q}</span>
                    <div className="flex gap-2">
                       <button className="px-4 py-2 rounded-lg bg-gray-100 text-[10px] font-black uppercase text-gray-400">Non</button>
                       <button className="px-4 py-2 rounded-lg bg-red-50 text-[10px] font-black uppercase text-red-600">Oui</button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

      </div>
    </div>
  );
}
