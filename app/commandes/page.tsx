"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FileText, CheckCircle2, Truck, AlertCircle, ScanLine, ArrowRight, Download } from 'lucide-react';

export default function CommandesPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    // On récupère tout ce qui est "A commander" ou "Commandé" de TOUS les chantiers
    const { data } = await supabase
      .from('material_requests')
      .select('*, chantiers(nom)')
      .order('created_at', { ascending: false });
    if (data) setRequests(data);
  }

  // Simulation de la lecture du PDF (OCR)
  const handleDrop = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      // Simulation d'analyse
      setAnalyzing(true);
      setTimeout(() => {
        alert("🤖 PDF Analysé ! \ncommande détectée : 450€ chez POINT.P \nMatériel : 20x Sacs Ciment \n\nLiaison SAP prête.");
        setAnalyzing(false);
      }, 2000);
    }
  };

  const handleDrag = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  // Action : Envoyer vers SAP
  const sendToSAP = async (id: string) => {
    if(confirm("Confirmer la réception et l'envoi vers SAP ?")) {
        await supabase.from('material_requests').update({ status: 'recu_sap' }).eq('id', id);
        fetchRequests();
    }
  }

  return (
    <div className="min-h-screen bg-[#f0f3f4] p-8 font-['Fredoka']">
      <h1 className="text-3xl font-black uppercase text-gray-800 mb-8">Centrale d'Achats</h1>

      <div className="grid grid-cols-12 gap-6">
        
        {/* COLONNE GAUCHE : LES DEMANDES TERRAIN (70%) */}
        <div className="col-span-8 bg-white rounded-[30px] p-6 shadow-sm min-h-[500px]">
          <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-2">
            <Truck className="text-[#0984e3]" /> Flux Commandes
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 text-xs uppercase border-b border-gray-100">
                  <th className="pb-3 pl-2">Date</th>
                  <th className="pb-3">Chantier</th>
                  <th className="pb-3">Article</th>
                  <th className="pb-3">Statut</th>
                  <th className="pb-3 text-right">Action SAP</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {requests.map((req) => (
                  <tr key={req.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                    <td className="py-4 pl-2 font-bold text-gray-500">{new Date(req.created_at).toLocaleDateString()}</td>
                    <td className="py-4 font-bold text-gray-800">{req.chantiers?.nom}</td>
                    <td className="py-4 font-medium">{req.item}</td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                        req.status === 'a_commander' ? 'bg-orange-100 text-orange-500' :
                        req.status === 'recu_sap' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-500'
                      }`}>
                        {req.status === 'recu_sap' ? 'Reçu SAP' : req.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                       {req.status !== 'recu_sap' && (
                           <button 
                            onClick={() => sendToSAP(req.id)}
                            className="bg-black text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-[#00b894] transition-colors"
                           >
                            Valider Réception
                           </button>
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {requests.length === 0 && <div className="text-center p-10 text-gray-400">Tout est calme. Aucune demande.</div>}
          </div>
        </div>

        {/* COLONNE DROITE : SCANNER PDF INTELLIGENT (30%) */}
        <div className="col-span-4 flex flex-col gap-6">
            
            {/* Zone Drop PDF */}
            <div 
                className={`bg-white rounded-[30px] p-6 shadow-sm flex-1 flex flex-col items-center justify-center text-center border-4 border-dashed transition-all ${
                    dragActive ? 'border-[#0984e3] bg-blue-50' : 'border-gray-100'
                } ${analyzing ? 'animate-pulse' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                {analyzing ? (
                    <>
                        <ScanLine size={48} className="text-[#0984e3] animate-spin-slow mb-4" />
                        <p className="font-black text-lg text-gray-800">Lecture IA en cours...</p>
                        <p className="text-sm text-gray-400">Analyse des prix et quantités</p>
                    </>
                ) : (
                    <>
                        <div className="bg-[#0984e3] p-4 rounded-full text-white mb-4 shadow-lg shadow-blue-200">
                            <FileText size={32} />
                        </div>
                        <h3 className="font-black text-lg text-gray-800 uppercase">Scanner Facture / BL</h3>
                        <p className="text-sm text-gray-400 mt-2 mb-6 px-4">Glissez votre PDF de commande ici. L'IA va extraire les lignes pour SAP.</p>
                        <button className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-2 rounded-xl font-bold text-sm transition-colors">
                            Parcourir les fichiers
                        </button>
                    </>
                )}
            </div>

            {/* Statistiques Rapides */}
            <div className="bg-[#2d3436] rounded-[30px] p-6 text-white shadow-sm">
                <h3 className="font-bold uppercase text-gray-400 text-xs mb-4">Commandes du mois</h3>
                <div className="flex justify-between items-end">
                    <span className="text-4xl font-black">12</span>
                    <span className="text-green-400 font-bold flex items-center gap-1 text-sm">+2 en attente <AlertCircle size={14}/></span>
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center cursor-pointer hover:opacity-80">
                    <span className="text-xs font-bold uppercase tracking-wider">Export SAP Global</span>
                    <Download size={16} />
                </div>
            </div>

        </div>

      </div>
    </div>
  );
}
