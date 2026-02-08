import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, HardHat, CheckCircle2, Info, Users, Signature } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function PrejobBriefing({ project, user, attendants }: { project: any, user: any, attendants: any[] }) {
  const [loading, setLoading] = useState(false);
  const [briefing, setBriefing] = useState({
    port_epi: false,
    analyse_risques: false,
    balisage_ok: false,
    points_critiques: ""
  });

  const handleValidateBriefing = async () => {
    if (!briefing.port_epi || !briefing.analyse_risques || !briefing.balisage_ok) {
      return alert("Vous devez valider tous les points de sécurité avant de démarrer.");
    }

    setLoading(true);
    const { error } = await supabase.from('briefings').insert([{
      chantier_id: project.id,
      chef_id: user.id,
      date: new Date().toISOString(),
      donnees: briefing,
      presents: attendants.map(a => a.user_nom)
    }]);

    if (!error) {
      alert("Prejob Briefing validé. Le chantier est officiellement ouvert pour la journée.");
      window.location.reload(); // Pour rafraîchir l'accès aux autres modules
    }
    setLoading(false);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <div className="bg-orange-600 text-white p-8 rounded-[2.5rem] shadow-xl">
        <div className="flex items-center gap-4 mb-4">
          <ShieldAlert size={40} className="text-orange-200" />
          <h2 className="text-3xl font-black uppercase tracking-tighter">Prejob Briefing</h2>
        </div>
        <p className="font-bold opacity-90 text-sm">
          Obligatoire avant tout début de travaux. Assurez-vous que l'équipe est au complet et équipée.
        </p>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
        {/* Liste des présents (ceux qui ont signé l'arrivée) */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Users size={16} /> Équipe présente au briefing ({attendants.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {attendants.map((att, i) => (
              <span key={i} className="px-4 py-2 bg-slate-100 rounded-xl text-sm font-bold text-slate-700 border border-slate-200">
                {att.user_nom}
              </span>
            ))}
          </div>
        </div>

        {/* Check-list Sécurité */}
        <div className="space-y-4">
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Points de contrôle</h3>
           
           <div className="grid gap-3">
              <label className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer ${briefing.port_epi ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-transparent'}`}>
                <input type="checkbox" className="hidden" onChange={(e) => setBriefing({...briefing, port_epi: e.target.checked})} />
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${briefing.port_epi ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                  {briefing.port_epi && <CheckCircle2 size={16} className="text-white" />}
                </div>
                <span className="font-black text-sm uppercase">Port des EPI vérifié (Casque, Lunettes, Gants)</span>
              </label>

              <label className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer ${briefing.analyse_risques ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-transparent'}`}>
                <input type="checkbox" className="hidden" onChange={(e) => setBriefing({...briefing, analyse_risques: e.target.checked})} />
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${briefing.analyse_risques ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                  {briefing.analyse_risques && <CheckCircle2 size={16} className="text-white" />}
                </div>
                <span className="font-black text-sm uppercase">Analyse des risques partagée avec l'équipe</span>
              </label>

              <label className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer ${briefing.balisage_ok ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-transparent'}`}>
                <input type="checkbox" className="hidden" onChange={(e) => setBriefing({...briefing, balisage_ok: e.target.checked})} />
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${briefing.balisage_ok ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                  {briefing.balisage_ok && <CheckCircle2 size={16} className="text-white" />}
                </div>
                <span className="font-black text-sm uppercase">Zone de travail balisée et sécurisée</span>
              </label>
           </div>
        </div>

        <div className="space-y-2">
           <label className="text-xs font-black text-slate-400 uppercase ml-1">Notes particulières / Risques spécifiques</label>
           <textarea 
             className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-orange-500" 
             placeholder="Ex: Attention co-activité avec les électriciens..."
             onChange={(e) => setBriefing({...briefing, points_critiques: e.target.value})}
           />
        </div>

        <button 
          onClick={handleValidateBriefing}
          disabled={loading}
          className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3"
        >
          {loading ? "Validation..." : "VALIDER ET DÉMARRER LE CHANTIER"}
          <ShieldCheck size={24} className="text-orange-400" />
        </button>
      </div>
    </div>
  );
}

// Petit composant icon personnalisé pour le titre
function ShieldAlert({ size, className }: { size: number, className: string }) {
  return <div className={className}><ShieldCheck size={size} /></div>
}