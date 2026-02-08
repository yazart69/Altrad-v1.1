"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  User, ShieldCheck, FileText, Calendar, AlertCircle, 
  ArrowLeft, Save, Share2, Bell, HardHat, GraduationCap 
} from 'lucide-react';

export default function FicheEmploye() {
  const { id } = useParams();
  const router = useRouter();
  const [emp, setEmp] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEmp() {
      const { data } = await supabase.from('employes').select('*').eq('id', id).single();
      setEmp(data);
      setLoading(false);
    }
    fetchEmp();
  }, [id]);

  const handleSave = async () => {
    const { error } = await supabase.from('employes').update(emp).eq('id', id);
    if (!error) alert("Fiche mise à jour et notification envoyée !");
  };

  if (loading) return <div className="p-10 font-black uppercase animate-pulse">Chargement du dossier...</div>;

  return (
    <div className="p-8 font-['Fredoka'] max-w-5xl mx-auto">
      {/* HEADER ACTIONS */}
      <div className="flex justify-between items-center mb-8">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 font-bold hover:text-black transition-all">
          <ArrowLeft size={20} /> Retour à la liste
        </button>
        <div className="flex gap-3">
          <button onClick={() => window.print()} className="bg-gray-100 p-3 rounded-2xl hover:bg-gray-200 transition-all text-gray-600">
            <Share2 size={20} />
          </button>
          <button onClick={handleSave} className="bg-[#d63031] text-white px-6 py-3 rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-lg shadow-red-100">
            <Save size={18} /> Enregistrer & Alerter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* COLONNE GAUCHE : IDENTITÉ */}
        <div className="col-span-12 md:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-[35px] shadow-sm border border-gray-100 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-black text-gray-300">
              {emp.nom[0]}{emp.prenom[0]}
            </div>
            <h1 className="text-2xl font-black uppercase text-gray-800 leading-tight">{emp.nom} {emp.prenom}</h1>
            <p className="text-blue-500 font-bold uppercase text-xs mt-1">{emp.role}</p>
          </div>

          <div className="bg-[#2d3436] p-6 rounded-[30px] text-white">
            <div className="flex items-center gap-2 mb-4 text-[#ff9f43]">
              <Bell size={18} />
              <h3 className="font-black uppercase text-xs tracking-widest">Convocations / Bureau</h3>
            </div>
            <textarea 
              className="bg-white/10 w-full rounded-xl p-3 text-xs border-none focus:ring-0 h-24 placeholder:text-white/20"
              placeholder="Ex: Rdv bureau lundi 08h pour signature..."
              value={emp.convocations_notes || ''}
              onChange={(e) => setEmp({...emp, convocations_notes: e.target.value})}
            />
          </div>
        </div>

        {/* COLONNE DROITE : CONFORMITÉ */}
        <div className="col-span-12 md:col-span-8 space-y-6">
          <div className="bg-white p-8 rounded-[35px] shadow-sm border border-gray-100">
            <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-2">
              <ShieldCheck className="text-green-500" /> Dossier Sécurité & Formation
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pièce d'identité / Permis */}
              <div className="space-y-4">
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-gray-400 ml-1">N° Permis de conduire</span>
                  <input type="text" value={emp.num_permis || ''} onChange={(e) => setEmp({...emp, num_permis: e.target.value})} className="w-full mt-1 bg-gray-50 border-none rounded-xl p-3 text-sm font-bold" />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-gray-400 ml-1">Date Visite Médicale</span>
                  <input type="date" value={emp.visite_med_expire_le || ''} onChange={(e) => setEmp({...emp, visite_med_expire_le: e.target.value})} className="w-full mt-1 bg-gray-50 border-none rounded-xl p-3 text-sm font-bold" />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-gray-400 ml-1">Accueil Sécurité fait le</span>
                  <input type="date" value={emp.date_accueil_securite || ''} onChange={(e) => setEmp({...emp, date_accueil_securite: e.target.value})} className="w-full mt-1 bg-gray-50 border-none rounded-xl p-3 text-sm font-bold" />
                </label>
              </div>

              {/* Habilitations / Formations */}
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="flex items-center gap-2 mb-2 text-blue-600">
                    <HardHat size={16} />
                    <span className="font-black uppercase text-[10px]">Habilitations Actuelles</span>
                  </div>
                  <input type="text" placeholder="H0B0, CACES R482..." value={emp.habilitations_liste || ''} onChange={(e) => setEmp({...emp, habilitations_liste: e.target.value})} className="w-full bg-white border-none rounded-lg p-2 text-xs font-bold" />
                </div>

                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                  <div className="flex items-center gap-2 mb-2 text-orange-600">
                    <GraduationCap size={16} />
                    <span className="font-black uppercase text-[10px]">Formations à prévoir</span>
                  </div>
                  <input type="text" value={emp.formations_prevues || ''} onChange={(e) => setEmp({...emp, formations_prevues: e.target.value})} className="w-full bg-white border-none rounded-lg p-2 text-xs font-bold" />
                </div>
              </div>
            </div>
          </div>
          
          {/* STATUT VISUEL RAPIDE */}
          <div className="flex gap-4">
            <div className={`flex-1 p-4 rounded-2xl text-center font-black uppercase text-[10px] border-2 ${emp.date_accueil_securite ? 'bg-green-50 border-green-200 text-green-600' : 'bg-red-50 border-red-200 text-red-600 animate-pulse'}`}>
              Accueil Sécurité {emp.date_accueil_securite ? '✅' : '❌'}
            </div>
            <div className={`flex-1 p-4 rounded-2xl text-center font-black uppercase text-[10px] border-2 ${emp.num_permis ? 'bg-green-50 border-green-200 text-green-600' : 'bg-red-50 border-red-200 text-red-600'}`}>
              Permis / ID {emp.num_permis ? '✅' : '❌'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
