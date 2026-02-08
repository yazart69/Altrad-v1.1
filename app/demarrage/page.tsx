"use client";
import React, { useState } from 'react';
import { HardHat, ShieldCheck, PenTool, CheckCircle, Save, Camera, X } from 'lucide-react';

export default function DemarrageChantier() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    chantier: '',
    date: new Date().toLocaleDateString(),
    chef: '',
    epi_ok: false,
    accueil_fait: false,
    balisage_ok: false,
    signature: null
  });

  return (
    <div className="p-4 md:p-10 font-['Fredoka'] max-w-4xl mx-auto">
      <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-gray-50">
        
        {/* Progrès */}
        <div className="bg-gray-50 p-6 flex justify-between border-b border-gray-100">
           {[1, 2, 3].map(s => (
             <div key={s} className={`flex-1 h-2 rounded-full mx-2 transition-all ${step >= s ? 'bg-orange-500' : 'bg-gray-200'}`} />
           ))}
        </div>

        <div className="p-8 md:p-12">
          {step === 1 && (
            <div className="animate-in slide-in-from-right duration-300">
              <h2 className="text-3xl font-black uppercase text-gray-800 mb-8 flex items-center gap-3"><HardHat size={32} className="text-orange-500"/> Infos Site</h2>
              <div className="space-y-6">
                <input type="text" placeholder="NOM DU CHANTIER" className="w-full p-6 bg-gray-50 rounded-2xl border-none font-bold text-xl uppercase" onChange={(e)=>setForm({...form, chantier: e.target.value})}/>
                <input type="text" placeholder="CHEF DE CHANTIER RÉFÉRENT" className="w-full p-6 bg-gray-50 rounded-2xl border-none font-bold text-lg" onChange={(e)=>setForm({...form, chef: e.target.value})}/>
                <button onClick={()=>setStep(2)} className="w-full bg-black text-white py-6 rounded-3xl font-black uppercase tracking-widest mt-6">Suivant : Sécurité</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in slide-in-from-right duration-300">
              <h2 className="text-3xl font-black uppercase text-gray-800 mb-8 flex items-center gap-3"><ShieldCheck size={32} className="text-green-500"/> Check-list Sécurité</h2>
              <div className="space-y-4">
                {[
                  { id: 'epi_ok', label: 'EPI complets et vérifiés' },
                  { id: 'accueil_fait', label: 'Accueil sécurité effectué avec l\'équipe' },
                  { id: 'balisage_ok', label: 'Périmètre de travail balisé / Signalisation' }
                ].map(item => (
                  <label key={item.id} className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-all">
                    <span className="font-bold text-gray-700 uppercase text-sm">{item.label}</span>
                    <input type="checkbox" className="w-8 h-8 rounded-xl text-green-500 focus:ring-green-500" onChange={(e)=>setForm({...form, [item.id]: e.target.checked})}/>
                  </label>
                ))}
                <div className="flex gap-4 pt-6">
                  <button onClick={()=>setStep(1)} className="flex-1 py-6 font-bold text-gray-400 uppercase">Retour</button>
                  <button onClick={()=>setStep(3)} className="flex-1 bg-black text-white py-6 rounded-3xl font-black uppercase tracking-widest">Suivant : Validation</button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in slide-in-from-right duration-300 text-center">
              <h2 className="text-3xl font-black uppercase text-gray-800 mb-4">Signature Digitale</h2>
              <p className="text-gray-400 font-bold text-sm mb-8 uppercase tracking-widest italic">Le chef de chantier valide l'ouverture du site</p>
              
              <div className="w-full h-64 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center relative group">
                <PenTool size={40} className="text-gray-300 group-hover:scale-110 transition-transform mb-2" />
                <span className="text-[10px] font-black text-gray-300 uppercase">Signez ici sur l'écran</span>
                {/* On pourrait ici intégrer une librairie de signature comme react-signature-canvas */}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-10">
                <button onClick={()=>setStep(2)} className="py-6 font-bold text-gray-400 uppercase">Retour</button>
                <button onClick={()=>{alert("OUVERTURE CHANTIER ENREGISTRÉE !"); setStep(1)}} className="bg-green-500 text-white py-6 rounded-3xl font-black uppercase flex items-center justify-center gap-2 shadow-xl shadow-green-100"><CheckCircle size={20}/> Valider le démarrage</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
