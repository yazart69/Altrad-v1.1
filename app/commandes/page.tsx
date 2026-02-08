"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FileText, Truck, AlertCircle, ScanLine, Download, CheckCircle2 } from 'lucide-react';

export default function CommandesPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchRequests();
    // Rafraichissement auto pour voir les nouvelles commandes arriver
    const interval = setInterval(fetchRequests, 10000);
    return () => clearInterval(interval);
  }, []);

  async function fetchRequests() {
    // On récupère les demandes de matériel (join avec le nom du chantier)
    const { data } = await supabase
      .from('material_requests')
      .select('*, chantiers(nom)')
      .order('created_at', { ascending: false });
    
    if (data) setRequests(data);
  }

  // Simulation Drag & Drop PDF
  const handleDrop = (e: any) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setAnalyzing(true);
      // Simulation d'analyse IA (2 secondes)
      setTimeout(() => {
        alert("🤖 Analyse terminée ! \nFournisseur détecté : POINT.P \nMontant : 450€ HT \nLiaison SAP prête.");
        setAnalyzing(false);
      }, 2000);
    }
  };

  const handleDrag = (e: any) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  // Action : Valider la réception dans SAP
  const sendToSAP = async (id: string) => {
    if(confirm("Confirmer la réception et l'envoi vers SAP ?")) {
        // On change le statut en base de données
        await supabase.from('material_requests').update({ status: 'recu_sap' }).eq('id', id);
        fetchRequests();
    }
  }

  return (
    <div className="min-h-screen bg-[#f0f3f4] p-8 font-['Fredoka'] text-gray-800">
      <h1 className="text-3xl font-black uppercase mb-8 ml-2">Centrale d'Achats & SAP</h1>

      <div className="grid grid-cols-12 gap-6">
        
        {/* COLONNE GAUCHE : FLUX DES DEMANDES (8 cols) */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-[30px] p-8 shadow-sm min-h-[600px]">
          <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-2 text-gray-700">
            <Truck className="text-[#0984e3]" /> Flux Commandes Chantiers
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 text-xs uppercase border-b border-gray-100">
                  <th className="pb-4 pl-2">Date</th>
                  <th className="pb-4">Chantier</th>
                  <th className="pb-4">Article Demandé</th>
                  <th className="pb-4">Statut Actuel</th>
                  <th className="pb-4 text-right">Action SAP</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {requests.map((req) => (
                  <tr key={req.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                    <td className="py-4 pl-2 font-bold text-gray-500">{new Date(req.created_at).toLocaleDateString()}</td>
                    <td className="py-4 font-black text-gray-800">{req.chantiers?.nom}</td>
                    <td className="py-4 font-medium text-gray-600">{req.item}</td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase flex w-fit items-center gap-1 ${
                        req.status === 'recu_sap' ? 'bg-green-100 text-green-600' : 
                        req.status === 'commande' ? 'bg-blue-100 text-blue-500' : 
                        'bg-orange-100 text-orange-500'
                      }`}>
                        {req.status === 'recu_sap' && <CheckCircle2 size={12} />}
                        {req.status === 'recu_sap' ? 'Reçu SAP' : req.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                       {req.status !== 'recu_sap' ? (
                           <button 
                            onClick={() => sendToSAP(req.id)}
                            className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#00b894] transition-colors shadow-lg shadow-gray-200"
                           >
                            Valider Réception
                           </button>
                       ) : (
                           <span className="text-xs text-gray-300 font-bold italic mr-2">Synchronisé</span>
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {requests.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 opacity-40">
                    <Truck size={48} className="mb-2"/>
                    <p className="font-bold">Aucune commande en attente</p>
                </div>
            )}
          </div>
        </div>

        {/* COLONNE DROITE : SCANNER INTELLIGENT (4 cols) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            
            {/* Zone Drop PDF */}
            <div 
                className={`bg-white rounded-[30px] p-6 shadow-sm flex-1 flex flex-col items-center justify-center text-center border-4 border-dashed transition-all cursor-pointer relative overflow-hidden group ${
                    dragActive ? 'border-[#0984e3] bg-blue-50' : 'border-gray-100 hover:border-blue-200'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                {analyzing ? (
                    <div className="flex flex-col items-center animate-pulse">
                        <ScanLine size={48} className="text-[#0984e3] animate-spin-slow mb-4" />
                        <p className="font-black text-lg text-gray-800">IA en cours...</p>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Lecture Facture</p>
                    </div>
                ) : (
                    <>
                        <div className="bg-[#0984e3] p-5 rounded-full text-white mb-6 shadow-xl shadow-blue-200 group-hover:scale-110 transition-transform">
                            <FileText size={32} />
                        </div>
                        <h3 className="font-black text-lg text-gray-800 uppercase">Scanner Facture</h3>
                        <p className="text-sm text-gray-400 mt-2 mb-8 px-4 leading-relaxed">
                            Glissez votre PDF ou BL ici.<br/>
                            <span className="text-[#0984e3] font-bold">L'IA détectera les articles</span> pour SAP.
                        </p>
                        <button className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-3 rounded-xl font-bold text-sm transition-colors w-full">
                            Parcourir les fichiers
                        </button>
                    </>
                )}
            </div>

            {/* Widget Stats */}
            <div className="bg-[#2d3436] rounded-[30px] p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Download size={80} /></div>
                <h3 className="font-bold uppercase text-gray-400 text-[10px] tracking-widest mb-4">Export Global</h3>
                <div className="flex items-end gap-2 mb-6">
                    <span className="text-4xl font-black">{requests.filter(r => r.status === 'recu_sap').length}</span>
                    <span className="text-sm font-bold text-gray-400 mb-1">commandes traitées</span>
                </div>
                <button className="w-full bg-[#00b894] hover:bg-[#00a383] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                    <Download size={18} /> Télécharger CSV SAP
                </button>
            </div>

        </div>
      </div>
    </div>
  );
}
