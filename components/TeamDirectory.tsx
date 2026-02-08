import React from 'react';
import { UserPlus, Search, Phone } from 'lucide-react';

export default function TeamDirectory() {
  const staff = [{ nom: 'Messal', prenom: 'Farid', role: 'Chef de chantier', statut: 'Disponible' }];

  return (
    <div className="space-y-6 animate-card">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Annuaire Équipe</h2>
        <button className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-blue-200">
          <UserPlus size={20} /> AJOUTER UN GARS
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {staff.map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl mx-auto mb-4 flex items-center justify-center font-black text-slate-400 text-xl">
              {s.nom[0]}{s.prenom[0]}
            </div>
            <h3 className="font-black text-slate-900 uppercase tracking-tighter">{s.nom} {s.prenom}</h3>
            <p className="text-[10px] font-black text-blue-600 uppercase mb-4">{s.role}</p>
            <div className="bg-green-100 text-green-700 py-2 rounded-xl text-xs font-black uppercase tracking-widest">{s.statut}</div>
          </div>
        ))}
      </div>
    </div>
  );
}