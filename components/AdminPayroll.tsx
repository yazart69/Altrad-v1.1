import React from 'react';
import { Clock, CheckCircle, AlertTriangle } from 'lucide-react';

export default function AdminPayroll() {
  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 animate-card">
      <h2 className="text-2xl font-black text-slate-800 mb-6 uppercase tracking-tighter flex items-center gap-2">
        <Clock className="text-blue-600" /> État des Heures (Hebdo)
      </h2>
      <div className="space-y-4">
        <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
          <span className="font-bold text-slate-700">Farid Messal</span>
          <span className="font-black text-blue-600">42.5 h</span>
          <span className="text-[10px] font-black bg-green-100 text-green-700 px-3 py-1 rounded-full uppercase">Validé</span>
        </div>
        <div className="p-4 bg-red-50 rounded-2xl flex justify-between items-center border border-red-100">
          <span className="font-bold text-slate-700">Loic Antunez</span>
          <span className="font-black text-red-600">-- h</span>
          <span className="text-[10px] font-black bg-red-100 text-red-700 px-3 py-1 rounded-full uppercase">Oubli Pointage</span>
        </div>
      </div>
    </div>
  );
}