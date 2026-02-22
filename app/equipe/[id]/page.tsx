"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, Save, Bell, HardHat, GraduationCap, 
  Plus, Trash2, Car, FileUp, CheckCircle2, Loader2, FileText, X, Eye, 
  Activity, FolderOpen, AlertCircle, ClipboardList, Users, Building2
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function FicheEmploye() {
  const { id } = useParams();
  const router = useRouter();
  const [emp, setEmp] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [newHabil, setNewHabil] = useState("");
  const [newForma, setNewForma] = useState("");
  const [newDoc, setNewDoc] = useState("");

  useEffect(() => {
    async function fetchData() {
      // 1. Infos Employé
      const { data: eData } = await supabase.from('employes').select('*').eq('id', id).single();
      
      // 2. Chantiers actuels/futurs (Planning)
      const { data: pData } = await supabase.from('planning').select('*, chantiers(nom)').eq('employe_id', id).gte('date_debut', new Date().toISOString().split('T')[0]).order('date_debut');

      if (eData) {
        eData.habilitations_json = eData.habilitations_json || [];
        eData.formations_json = eData.formations_json || [];
        eData.documents_divers_json = eData.documents_divers_json || [];
        eData.statut_actuel = eData.statut_actuel || 'disponible';
        eData.infos_terrain = eData.infos_terrain || ''; 
        setEmp(eData);
      }
      if (pData) setAssignments(pData);
      setLoading(false);
    }
    fetchData();
  }, [id]);

  const handleSave = async () => {
    setIsSaving(true);
    const toastId = toast.loading("Sauvegarde du dossier...");
    
    const empDataToUpdate = { ...emp };
    delete empDataToUpdate.id;
    delete empDataToUpdate.created_at;

    const { error } = await supabase.from('employes').update(empDataToUpdate).eq('id', id);
    
    setIsSaving(false);
    if (!error) toast.success("Dossier RH mis à jour", { id: toastId });
    else toast.error("Erreur de sauvegarde", { id: toastId });
  };

  const handleUpload = async (e: any, type: string, idx: number) => {
    const file = e.target.files[0];
    if (!file) return;
    const toastId = toast.loading("Upload du document...");
    const path = `${id}/${type}_${idx}_${Date.now()}`;
    
    const { error } = await supabase.storage.from('documents_employes').upload(path, file);
    if (!error) {
      const { data: urlData } = supabase.storage.from('documents_employes').getPublicUrl(path);
      const field = type === 'habil' ? 'habilitations_json' : type === 'forma' ? 'formations_json' : 'documents_divers_json';
      const copy = [...emp[field]];
      copy[idx].doc_url = urlData.publicUrl;
      setEmp({ ...emp, [field]: copy });
      toast.success("Document lié", { id: toastId });
    } else {
        toast.error("Erreur d'upload", { id: toastId });
    }
  };

  const addItem = (type: string) => {
    if (type === 'habil' && newHabil) {
      setEmp({...emp, habilitations_json: [...emp.habilitations_json, { label: newHabil, ok: false, exp: "" }]});
      setNewHabil("");
    } else if (type === 'forma' && newForma) {
      setEmp({...emp, formations_json: [...emp.formations_json, { label: newForma, prevu: false, exp: "", date_obtention: "" }]});
      setNewForma("");
    } else if (type === 'doc' && newDoc) {
      setEmp({...emp, documents_divers_json: [...emp.documents_divers_json, { label: newDoc, date_depot: new Date().toLocaleDateString() }]});
      setNewDoc("");
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black uppercase text-gray-300 animate-pulse"><Loader2 className="animate-spin mr-2"/> Accès au dossier...</div>;

  return (
    <div className="p-4 md:p-10 font-['Fredoka'] max-w-7xl mx-auto pb-32 text-gray-800">
      <Toaster position="bottom-right" />
      
      {/* ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 font-bold hover:text-black transition-all">
          <ArrowLeft size={20} /> Retour liste
        </button>
        <div className="flex gap-3">
            <button onClick={handleSave} disabled={isSaving} className="bg-[#2d3436] text-white px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-xl flex items-center gap-2 hover:scale-105 transition-all active:scale-95">
                {isSaving ? <Loader2 className="animate-spin" /> : <Save size={18} />} Enregistrer
            </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        
        {/* GAUCHE : STATUT & NOTES */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03]"><Users size={120}/></div>
            <h2 className="text-3xl font-black uppercase text-gray-900 leading-tight mb-1">{emp.nom} {emp.prenom}</h2>
            <p className="text-blue-500 font-black uppercase text-[10px] tracking-widest bg-blue-50 inline-block px-3 py-1 rounded-full">{emp.role}</p>
            
            <div className="mt-8 pt-8 border-t border-gray-50">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 mb-3 tracking-tighter"><Activity size={14} /> Disponibilité</label>
              <div className="grid grid-cols-2 gap-2">
                {['disponible', 'conge', 'maladie', 'formation'].map((s) => (
                  <button key={s} onClick={() => setEmp({...emp, statut_actuel: s})} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${emp.statut_actuel === s ? `bg-[#2d3436] text-white border-transparent shadow-lg` : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100'}`}>{s}</button>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-50">
              <label className="block text-[10px] font-black uppercase text-gray-400 tracking-tighter flex items-center gap-2 mb-3"><Car size={14}/> Véhicule</label>
              <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                {['perso', 'PZO'].map(v => (
                    <button key={v} onClick={()=>setEmp({...emp, vehicule_type:v})} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${emp.vehicule_type === v ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}>{v === 'PZO' ? 'Société' : v}</button>
                ))}
              </div>
              {emp.vehicule_type === 'PZO' && <input type="text" placeholder="IMMATRICULATION" className="w-full mt-2 bg-yellow-50 border-none rounded-xl p-3 text-sm font-black uppercase text-yellow-700 placeholder:text-yellow-300" value={emp.vehicule_immat || ''} onChange={(e)=>setEmp({...emp, vehicule_immat: e.target.value.toUpperCase()})}/>}
            </div>
          </div>

          <div className="bg-[#fff8e1] p-8 rounded-[40px] text-yellow-900 border border-yellow-100">
            <div className="flex items-center gap-2 mb-4 font-black uppercase text-xs tracking-widest text-yellow-600"><Bell size={18} /> Notes Internes</div>
            <textarea value={emp.convocations_notes || ''} onChange={(e)=>setEmp({...emp, convocations_notes: e.target.value})} placeholder="Notes RH, Visites médicales..." className="w-full bg-white/50 border-none rounded-2xl p-4 text-xs h-32 focus:ring-2 focus:ring-yellow-400 font-medium" />
          </div>
        </div>

        {/* DROITE : FORMATIONS & PLANNING */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
            
            {/* 1. FORMATIONS */}
            <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h3 className="font-black uppercase text-gray-800 flex items-center gap-2 text-xl"><GraduationCap size={24} className="text-blue-600"/> Habilitations & Compétences</h3>
                    </div>
                    <div className="flex gap-2">
                        <input type="text" placeholder="Ajouter..." className="bg-gray-50 border-none rounded-xl px-4 py-2 text-xs font-bold w-40" value={newForma} onChange={(e)=>setNewForma(e.target.value)} onKeyDown={(e)=>e.key === 'Enter' && addItem('forma')}/>
                        <button onClick={()=>addItem('forma')} className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 transition-all"><Plus size={18}/></button>
                    </div>
                </div>

                <div className="space-y-3">
                    {emp.formations_json.map((f:any, idx:number)=>(
                        <div key={idx} className={`p-4 rounded-2xl border transition-all ${f.prevu ? 'bg-orange-50 border-orange-100' : 'bg-gray-50 border-gray-100 hover:bg-white'}`}>
                            <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
                                <div className="flex items-center gap-3 flex-1">
                                    <input type="checkbox" checked={!f.prevu} onChange={(e)=>{const c=[...emp.formations_json]; c[idx].prevu=!e.target.checked; setEmp({...emp, formations_json:c})}} className="rounded text-blue-600"/>
                                    <span className={`font-black text-sm uppercase ${f.prevu ? 'text-orange-600' : 'text-gray-800'}`}>{f.label}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-gray-400 uppercase">Échéance</span>
                                        <input type="date" value={f.exp} onChange={(e)=>{const c=[...emp.formations_json]; c[idx].exp=e.target.value; setEmp({...emp, formations_json:c})}} className="bg-transparent text-xs font-bold border-none p-0"/>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="cursor-pointer p-2 rounded-lg hover:bg-gray-200 relative"><input type="file" className="hidden" onChange={(e)=>handleUpload(e, 'forma', idx)} /><FileUp size={16} className={f.doc_url ? "text-green-500" : "text-gray-400"} />{f.doc_url && <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full border border-white"></span>}</label>
                                        {f.doc_url && <button onClick={()=>setPreviewUrl(f.doc_url)} className="text-blue-500"><Eye size={16}/></button>}
                                        <button onClick={()=>{const c=emp.formations_json.filter((_:any,i:number)=>i!==idx); setEmp({...emp, formations_json:c})}} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 2. DOSSIER ADMINISTRATIF */}
            <div className="bg-[#FFF9C4] p-1 rounded-[40px] shadow-sm border border-yellow-200">
                <div className="bg-[#FFF176] p-4 rounded-t-[35px] flex justify-between items-center px-8">
                    <h3 className="font-black uppercase text-yellow-900 flex items-center gap-2"><FolderOpen size={20}/> Dossier Doc.</h3>
                    <div className="flex gap-2">
                        <input type="text" placeholder="Nom du doc..." className="bg-white/50 border-none rounded-lg px-3 py-1.5 text-xs font-bold w-40" value={newDoc} onChange={(e)=>setNewDoc(e.target.value)} onKeyDown={(e)=>e.key === 'Enter' && addItem('doc')}/>
                        <button onClick={()=>addItem('doc')} className="bg-yellow-600 text-white p-1.5 rounded-lg hover:bg-yellow-700"><Plus size={16}/></button>
                    </div>
                </div>
                <div className="p-6 bg-[#fffde7] rounded-b-[35px] grid grid-cols-1 md:grid-cols-2 gap-3">
                    {emp.documents_divers_json.map((d:any, idx:number)=>(
                        <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-xl border border-yellow-100 shadow-sm">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <FileText size={18} className="text-yellow-500 shrink-0"/>
                                <span className="font-bold text-xs uppercase text-gray-700 truncate">{d.label}</span>
                            </div>
                            <div className="flex gap-1">
                                <label className="cursor-pointer hover:bg-yellow-50 p-1.5 rounded"><input type="file" className="hidden" onChange={(e)=>handleUpload(e, 'doc', idx)} /><FileUp size={14} className={d.doc_url ? "text-green-500" : "text-gray-300"} /></label>
                                {d.doc_url && <button onClick={()=>setPreviewUrl(d.doc_url)} className="p-1.5 text-blue-500"><Eye size={14}/></button>}
                                <button onClick={()=>{const c=emp.documents_divers_json.filter((_:any,i:number)=>i!==idx); setEmp({...emp, documents_divers_json:c})}} className="p-1.5 text-red-300 hover:text-red-500"><Trash2 size={14}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. MISSIONS ACTUELLES (PLANNING) */}
            <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                <h3 className="font-black uppercase text-gray-800 flex items-center gap-2 text-xl mb-6"><Building2 size={24} className="text-[#00b894]"/> Missions & Chantiers</h3>
                <div className="space-y-3">
                    {assignments.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Aucune mission planifiée à venir.</p>
                    ) : assignments.map((a:any, idx:number) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div>
                                <p className="font-black text-sm uppercase text-gray-800">{a.chantiers?.nom}</p>
                                <p className="text-[10px] font-bold text-gray-400">Du {new Date(a.date_debut).toLocaleDateString()} au {new Date(a.date_fin).toLocaleDateString()}</p>
                            </div>
                            <span className="text-[10px] font-black uppercase text-[#00b894] bg-emerald-50 px-3 py-1 rounded-full">Actif</span>
                        </div>
                    ))}
                </div>
            </div>

        </div>
      </div>

      {/* PREVIEW */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex flex-col items-center justify-center p-4 backdrop-blur-sm">
          <button onClick={()=>setPreviewUrl(null)} className="absolute top-6 right-6 text-white p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all"><X size={32}/></button>
          <div className="max-w-4xl w-full h-[80vh] bg-white rounded-3xl overflow-hidden shadow-2xl">
             <iframe src={previewUrl} className="w-full h-full border-none" />
          </div>
        </div>
      )}
    </div>
  );
}