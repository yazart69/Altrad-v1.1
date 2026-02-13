"use client";

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ClipboardCheck, Users, Shield, MapPin, 
  User, Check, X, Save, PenTool, AlertCircle, 
  Trash2, MessageSquare, Camera, Printer, Clock
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';

// DÉFINITION DES TYPES POUR LE BUILD
interface PrejobProps {
  chantier: { id: string; nom: string };
  equipe: Array<{ id: string; nom: string; prenom: string }>;
  animateurId: string;
}

export default function HSEPrejobModule({ chantier, equipe, animateurId }: PrejobProps) {
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // --- ÉTATS DU FORMULAIRE (Fidèle à la fiche Prejob) ---
  const [generalInfo, setGeneralInfo] = useState({
    date: new Date().toISOString().split('T')[0],
    projet: chantier?.nom || '', // [cite: 2]
    unite_zone: '', // [cite: 2]
    poste_travail: '' // [cite: 2]
  });

  const [equipeStatus, setEquipeStatus] = useState({
    nb_personnes: equipe?.length || 0, // 
    aptitude_equipe: true, // 
    absents_equipe: false, // 
    equipe_heure: true // 
  });

  const [briefingChecks, setBriefingChecks] = useState({
    "Zone dégagée / risques pris en compte": false, // 
    "Absence risque plomb/amiante": false, // 
    "Description travaux / phases critiques": false, // 
    "Rôle de chacun défini": false, // 
    "Modes de communication définis": false, // 
    "Consignes et moyens de secours présentés": false, // 
    "Risques produits (FDS) présentés": false, // 
    "Stockage matériel / tri déchets": false, // 
    "Objectif avancement fin de poste": false, // 
    "Autorisation de travail conforme": false, // 
    "Moyen d'accès conforme": false, // 
    "Balisage zone": false, // 
    "Extincteur présent": false, // 
    "Eclairage adéquat": false, // 
    "Protection environnement (kit anti-pollution)": false, // 
    "Outillage conforme et contrôlé": false // 
  });

  const [epiSelection, setEpiSelection] = useState({
    "Tenue de base": true, // 
    "Sur tenue type 4/6": false, // 
    "Combinaison sablage": false, // 
    "Lunettes de base": true, // 
    "Lunettes étanches": false, // 
    "Visière complète": false, // 
    "Cagoule sablage": false, // 
    "Demi masque": false, // 
    "Masque complet": false, // 
    "Filtration P3": false, // 
    "Filtration A2P3": false, // 
    "Gants manutention": true, // 
    "Gants chimiques": false, // 
    "Gants de sablage": false, // 
    "Chaussures montantes": true, // 
    "Casque jugulaire 4 points": true, // 
    "Protections auditives": true // 
  });

  const sigPad = useRef<any>(null);

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
        briefing_check: briefingChecks,
        epi_selection: epiSelection,
        date: generalInfo.date
      }]);
      if (error) throw error;
      alert("✅ Archivé !");
    } catch (e: any) {
      alert("Erreur: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden">
      <div className="bg-[#e21118] p-8 text-white flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black uppercase">PREJOB BRIEFING</h1>
          <p className="text-xs font-bold opacity-80 uppercase">Activité REVETEMENT </p>
        </div>
      </div>

      <div className="p-10 space-y-10">
        {/* ÉTAPE 1 : INFOS GÉNÉRALES [cite: 2] */}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-6 animate-in fade-in">
             <div className="col-span-2 md:col-span-1">
                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Zone [cite: 2]</label>
                <input className="w-full p-4 bg-gray-50 rounded-2xl font-bold" value={generalInfo.unite_zone} onChange={e => setGeneralInfo({...generalInfo, unite_zone: e.target.value})} />
             </div>
             <div className="col-span-2 md:col-span-1">
                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Poste [cite: 2]</label>
                <input className="w-full p-4 bg-gray-50 rounded-2xl font-bold" value={generalInfo.poste_travail} onChange={e => setGeneralInfo({...generalInfo, poste_travail: e.target.value})} />
             </div>
             <button onClick={() => setStep(2)} className="col-span-2 bg-black text-white p-4 rounded-2xl font-black uppercase">Continuer vers le Briefing</button>
          </div>
        )}

        {/* ÉTAPE 4 : ÉMARGEMENT & ENGAGEMENT [cite: 5, 6] */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 italic text-xs text-blue-800">
               "Chaque membre s'engage à respecter les consignes et à réaliser la Minute d’Arrêt Sécurité..."
            </div>
            {equipe.map((m) => (
              <div key={m.id} className="flex justify-between items-center p-6 border rounded-3xl">
                <span className="font-black uppercase">{m.nom} {m.prenom} [cite: 5]</span>
                <div className="w-64 h-24 bg-gray-50 rounded-xl border border-dashed relative">
                   <SignatureCanvas ref={sigPad} canvasProps={{width: 250, height: 96, className: 'sigCanvas'}} />
                </div>
              </div>
            ))}
            <button onClick={handleSaveAll} className="w-full bg-red-600 text-white p-5 rounded-3xl font-black uppercase shadow-xl">Finaliser & Archiver</button>
          </div>
        )}
      </div>
    </div>
  );
}
