import React from 'react';
import { FileText, Eye, Download, ShieldAlert, FileCheck } from 'lucide-react';

export default function DigitalFolder({ project }: any) {
  const docs = project.documents || [
    { name: "PPSPS_Securite.pdf", type: "SECURITE", date: "07/02/2026" },
    { name: "Plan_Zone_A411.pdf", type: "PLAN", date: "07/02/2026" }
  ];

  return (
    <div className="p-6 bg-white rounded-[2rem] shadow-sm border border-slate-100">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-50 rounded-2xl text-blue-600"><FileText /></div>
        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Classeur Digital</h3>
      </div>
      <div className="space-y-4">
        {docs.map((doc: any, i: number) => (
          <div key={i} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-transparent hover:border-blue-200 transition-all cursor-pointer group">
            <div className="flex items-center gap-4">
              {doc.type === "SECURITE" ? <ShieldAlert className="text-orange-500" /> : <FileCheck className="text-blue-500" />}
              <div>
                <p className="font-bold text-slate-800">{doc.name}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{doc.type} • Mis à jour le {doc.date}</p>
              </div>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
               <button className="p-3 bg-white rounded-xl shadow-sm hover:text-blue-600 transition-colors"><Eye size={18}/></button>
               <button className="p-3 bg-white rounded-xl shadow-sm hover:text-green-600 transition-colors"><Download size={18}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}