"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, AlertCircle, FileWarning, ShieldCheck, HeartPulse, Search, Plus } from 'lucide-react';

export default function EquipePage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getStaff() {
      const { data } = await supabase.from('employes').select('*').order('nom');
      if (data) setStaff(data);
      setLoading(false);
    }
    getStaff();
  }, []);

  // Logique d'alertes
  const dossierIncomplet = staff.filter(e => !e.dossier_complet);
  const cacesExpire = staff.filter(e => e.caces_expire_le && new Date(e.caces_expire_le) < new Date());
  const visiteMedProche = staff.filter(e => {
    if (!e.visite_med_expire_le) return false;
    const diff = (new Date(e.visite_med_expire_le).getTime() - new Date().getTime()) / (1000*3600*24);
    return diff < 30; // Alerte à 30 jours
  });

  return (
    <div className="p-8 font-['Fredoka']">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase text-gray-800">Gestion des Effectifs</h1>
          <p className="text-gray-400 font-bold text-xs uppercase">RH & Conformité Administrative</p>
        </div>
        <button className="bg-black text-white px-6 py-3 rounded-2xl font-black uppercase text-xs flex items-center gap-2">
          <Plus size={18} /> Ajouter un collaborateur
        </button>
      </div>

      {/* --- SECTION ALERTES --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Alerte Documents */}
        <div className="bg-red-50 border-2 border-red-100 p-6 rounded-[25px]">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <FileWarning />
            <h3 className="font-black uppercase text-sm">Documents Manquants</h3>
          </div>
          <p className="text-3xl font-black text-red-600">{dossierIncomplet.length}</p>
          <p className="text-xs font-bold text-red-400 uppercase mt-1">Dossiers administratifs à compléter</p>
        </div>

        {/* Alerte Formations */}
        <div className="bg-orange-50 border-2 border-orange-100 p-6 rounded-[25px]">
          <div className="flex items-center gap-3 text-orange-600 mb-4">
            <ShieldCheck />
            <h3 className="font-black uppercase text-sm">Certifications / CACES</h3>
          </div>
          <p className="text-3xl font-black text-orange-600">{cacesExpire.length}</p>
          <p className="text-xs font-bold text-orange-400 uppercase mt-1">Recyclages de formation à prévoir</p>
        </div>

        {/* Alerte Santé */}
        <div className="bg-blue-50 border-2 border-blue-100 p-6 rounded-[25px]">
          <div className="flex items-center gap-3 text-blue-600 mb-4">
            <HeartPulse />
            <h3 className="font-black uppercase text-sm">Visites Médicales</h3>
          </div>
          <p className="text-3xl font-black text-blue-600">{visiteMedProche.length}</p>
          <p className="text-xs font-bold text-blue-400 uppercase mt-1">Échéances à moins de 30 jours</p>
        </div>
      </div>

      {/* --- LISTE DES EMPLOYÉS --- */}
      <div className="bg-white rounded-[30px] shadow-sm overflow-hidden border border-gray-100">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="p-6 font-black uppercase text-[10px] text-gray-400">Nom & Rôle</th>
              <th className="p-6 font-black uppercase text-[10px] text-gray-400">Contact</th>
              <th className="p-6 font-black uppercase text-[10px] text-gray-400">Dossier</th>
              <th className="p-6 font-black uppercase text-[10px] text-gray-400">CACES</th>
              <th className="p-6 font-black uppercase text-[10px] text-gray-400">Visite Méd.</th>
              <th className="p-6 font-black uppercase text-[10px] text-gray-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((e) => (
              <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-all">
                <td className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-black text-gray-400 uppercase text-xs">
                      {e.nom.substring(0, 2)}
                    </div>
                    <div>
                      <p className="font-black text-gray-800 text-sm uppercase">{e.nom} {e.prenom}</p>
                      <p className="text-[10px] text-blue-500 font-bold uppercase">{e.role}</p>
                    </div>
                  </div>
                </td>
                <td className="p-6 font-bold text-xs text-gray-500">{e.telephone || 'Non renseigné'}</td>
                <td className="p-6">
                  {e.dossier_complet ? 
                    <span className="bg-green-100 text-green-600 text-[10px] px-3 py-1 rounded-full font-black uppercase">Complet</span> :
                    <span className="bg-red-100 text-red-600 text-[10px] px-3 py-1 rounded-full font-black uppercase">Incomplet</span>
                  }
                </td>
                <td className="p-6 text-xs font-bold">
                   <span className={new Date(e.caces_expire_le) < new Date() ? 'text-red-500' : 'text-gray-700'}>
                     {e.caces_expire_le ? new Date(e.caces_expire_le).toLocaleDateString() : 'N/A'}
                   </span>
                </td>
                <td className="p-6 text-xs font-bold text-gray-700">
                  {e.visite_med_expire_le ? new Date(e.visite_med_expire_le).toLocaleDateString() : 'N/A'}
                </td>
                <td className="p-6 text-right">
                  <button className="text-gray-300 hover:text-black transition-colors font-black uppercase text-[10px]">Modifier</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
