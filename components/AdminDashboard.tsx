import React from 'react';
import { LayoutDashboard, Users, HardHat, TrendingUp, AlertCircle, ShoppingCart } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="space-y-8 animate-card">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden">
          <p className="text-xs font-black text-slate-400 uppercase mb-1">Chantiers</p>
          <h3 className="text-4xl font-black text-slate-900">12</h3>
          <HardHat className="absolute -right-2 -top-2 w-20 h-20 text-slate-50" />
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden">
          <p className="text-xs font-black text-slate-400 uppercase mb-1">Progression</p>
          <h3 className="text-4xl font-black text-slate-900">68%</h3>
          <TrendingUp className="absolute -right-2 -top-2 w-20 h-20 text-slate-50" />
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden">
          <p className="text-xs font-black text-slate-400 uppercase mb-1">Urgences</p>
          <h3 className="text-4xl font-black text-red-600">4</h3>
          <AlertCircle className="absolute -right-2 -top-2 w-20 h-20 text-red-50" />
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden">
          <p className="text-xs font-black text-slate-400 uppercase mb-1">Effectif</p>
          <h3 className="text-4xl font-black text-slate-900">34</h3>
          <Users className="absolute -right-2 -top-2 w-20 h-20 text-slate-50" />
        </div>
      </div>
      <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl">
        <h3 className="text-2xl font-black mb-4 uppercase tracking-tighter">Bienvenue, Ertugrul</h3>
        <p className="text-slate-400 font-medium">Tous les systèmes sont opérationnels. 4 commandes de matériel en attente de validation.</p>
      </div>
    </div>
  );
}