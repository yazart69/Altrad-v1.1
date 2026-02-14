"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, Save, Bell, HardHat, GraduationCap, 
  Plus, Trash2, Car, FileUp, Loader2, FileText, X, Eye, 
  Activity, FolderOpen, AlertCircle, ClipboardList, Users
} from 'lucide-react';

export default function FicheEmploye() {
  const { id } = useParams();
  const router = useRouter();
  const [emp, setEmp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // États d'ajout rapide
  const [newForma, setNewForma] = useState("");
  const [newDoc, setNewDoc] = useState("");

  useEffect(() => {
    async function fetchEmp() {
      // Note : Vérifie que ta table s'appelle bien 'employes' et non 'profiles'
      const { data, error } = await supabase.from('employes').select('*').eq('id', id).single();
      
      if (error) {
        console.error("Erreur de chargement:", error);
        setLoading(false);
        return;
      }

      if (data) {
        setEmp({
          ...data,
          habilitations_json: data.habilitations_json || [],
          formations_json: data.formations_json || [],
          documents_divers_json: data.documents_divers_json || [],
          statut_actuel: data.statut_actuel || 'disponible',
          infos_terrain: data.infos_terrain || ''
        });
      }
      setLoading(false);
    }
    fetchEmp();
  }, [id]);

  // CORRECTION : On retire l'ID de l'objet avant l'UPDATE pour éviter l'erreur 400
  const handleSave = async () => {
    if (!emp) return;
    setIsSaving(true);
    
    const { id: _, ...payload } = emp; // On extrait l'id pour ne pas l'envoyer

    const { error } = await supabase
      .from('employes')
      .update(payload)
      .eq('id', id);

    setIsSaving(false);
    if (!error) alert("✅ Dossier mis à jour avec succès !");
    else {
      console.error(error);
      alert("❌ Erreur 400 : Vérifie que les colonnes correspondent dans Supabase.");
    }
  };

  const handleDeleteEmployee = async () => {
    if(confirm("⚠️ Suppression définitive du dossier. Continuer ?")) {
        const { error } = await supabase.from('employes').delete().eq('id', id);
        if(!error) router.push('/equipe');
    }
  };

  const addItem = (type: string) => {
    if (!emp) return;
    if (type === 'forma' && newForma) {
      setEmp({
        ...emp, 
        formations_json: [...emp.formations_json, { label: newForma, prevu: true, exp: "", doc_url: "" }]
      });
      setNewForma("");
    } else if (type === 'doc' && newDoc) {
      setEmp({
        ...emp, 
        documents_divers_json: [...emp.documents_divers_json, { label: newDoc, date_depot: new Date().toLocaleDateString(), doc_url: "" }]
      });
      setNewDoc("");
    }
  };

  const handleUpload = async (e: any, type: string, idx: number) => {
    const file = e.target.files[0];
    if (!file || !emp) return;
    
    const path = `${id}/${type}_${idx}_${Date.now()}`;
    const { error: uploadError } = await supabase.storage.from('documents_employes').upload(path, file);
    
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('documents_employes').getPublicUrl(path);
      const field = type === 'forma' ? 'formations_json' : 'documents_divers_json';
      const copy = [...emp[field]];
      copy[idx].doc_url = urlData.publicUrl;
      setEmp({ ...emp, [field]: copy });
    }
  };

  if (loading) return (
    <div className="h-screen bg-btp-dark flex items-center justify-center font-black uppercase text-btp-cyan animate-pulse">
      <Loader2 className="animate-spin mr-3"/> Accès au dossier RH...
    </div>
  );

  if (!emp) return <div className="p-10 text-white font-black uppercase">Dossier introuvable.</div>;

  return (
    <div className="min-h-screen bg-btp-dark text-white p-4 md:p-10 font-sans pb-32">
      
      {/* HEADER ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 max-w-6xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 font-black uppercase text-xs hover:text-btp-cyan transition-all">
          <ArrowLeft size={18} /> Retour Équipes
        </button>
        
        <div className="flex gap-4">
            <button onClick={handleDeleteEmployee} className="bg-btp-pink/10 text-btp-pink px-6 py-4 rounded-2xl font-black uppercase text-[10px] border border-btp-pink/20 hover:bg-btp-pink/20 transition-all flex items-center gap-2">
              <Trash2 size={16}/> Supprimer
            </button>
            <button onClick={handleSave} disabled={isSaving} className="bg-btp-cyan text-btp-dark px-10 py-4 rounded-2xl font-black uppercase text-[10px] shadow-[0_0_20px_rgba(0,242,255,0.3)] flex items-center gap-2 hover:scale-105 transition-all">
              {isSaving ? <Loader2 className="animate-spin" /> : <Save size={18} />} 
              Enregistrer les modifications
            </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8 max-w-6xl mx-auto">
        
        {/* COLONNE GAUCHE : IDENTITÉ */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-btp-card/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity"><Users size={150}/></div>
            
            <h2 className="text-3xl font-black uppercase leading-tight mb-2 italic">
              {emp.nom} <span className="text-btp-cyan">{emp.prenom}</span>
            </h2>
            <p className="text-btp-pink font-black uppercase text-[10px] tracking-widest bg-btp-pink/10 inline-block px-3 py-1 rounded-full border border-btp-pink/20">{emp.role}</p>
            
            {/* STATUT RH */}
            <div className="mt-10 pt-8 border-t border-white/5">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-500 mb-4 tracking-widest">
                <Activity size={14} className="text-btp-cyan" /> Statut Opérationnel
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'disponible', label: 'Disponible', color: 'bg-green-500' },
                  { id: 'conge', label: 'Congés', color: 'bg-orange-500' },
                  { id: 'maladie', label: 'Maladie', color: 'bg-btp-pink' },
                  { id: 'formation', label: 'Formation', color: 'bg-blue-500' }
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setEmp({...emp, statut_actuel: s.id})}
                    className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all border-2 ${
                      emp.statut_actuel === s.id 
                      ? `${s.color} text-white border-transparent shadow-[0_0_15px_rgba(0,0,0,0.3)] scale-105` 
                      : 'bg-white/5 text-gray-500 border-transparent hover:bg-white/10'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* VÉHICULE */}
            <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
              <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-2"><Car size={14} className="text-btp-cyan"/> Véhicule</label>
              <div className="flex gap-2 bg-btp-dark/50 p-1.5 rounded-2xl">
                <button onClick={()=>setEmp({...emp, vehicule_type:'perso'})} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${emp.vehicule_type === 'perso' ? 'bg-white/10 text-white border border-white/10 shadow-lg' : 'text-gray-600'}`}>Perso</button>
                <button onClick={()=>setEmp({...emp, vehicule_type:'PZO'})} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${emp.vehicule_type === 'PZO' ? 'bg-white/10 text-white border border-white/10 shadow-lg' : 'text-gray-600'}`}>Société</button>
              </div>
              {emp.vehicule_type === 'PZO' && (
                <input type="text" placeholder="IMMATRICULATION..." className="w-full bg-btp-cyan/5 border border-btp-cyan/20 rounded-xl p-4 text-xs font-black uppercase text-btp-cyan placeholder:text-btp-cyan/20 focus:outline-none focus:border-btp-cyan" value={emp.vehicule_immat || ''} onChange={(e)=>setEmp({...emp, vehicule_immat: e.target.value.toUpperCase()})}/>
              )}
            </div>
          </div>

          <div className="bg-btp-amber/5 p-8 rounded-[2.5rem] border border-btp-amber/10 relative group">
            <div className="flex items-center gap-2 mb-6 font-black uppercase text-[10px] tracking-[0.2em] text-btp-amber">
                <Bell size={18} /> Suivi Interne & RH
            </div>
            <textarea 
                value={emp.convocations_notes || ''} 
                onChange={(e)=>setEmp({...emp, convocations_notes: e.target.value})} 
                placeholder="Notes importantes, visites médicales..." 
                className="w-full bg-btp-dark/30 border border-white/5 rounded-2xl p-5 text-xs h-40 focus:outline-none focus:border-btp-amber/30 text-gray-300 placeholder:text-gray-700 font-medium italic"
            />
          </div>
        </div>

        {/* COLONNE DROITE : COMPETENCES & DOCS */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
            
            <div className="bg-btp-card/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
                <div className="flex justify-between items-start mb-10">
                    <div>
                        <h3 className="font-black uppercase text-white flex items-center gap-3 text-xl italic"><GraduationCap size={28} className="text-btp-cyan"/> Compétences & Recyclages</h3>
                    </div>
                    <div className="flex gap-3">
                        <input type="text" placeholder="NOUVELLE FORMATION..." className="bg-btp-dark/50 border border-white/10 rounded-xl px-5 py-3 text-[10px] font-black w-48 md:w-64 focus:outline-none focus:border-btp-cyan" value={newForma} onChange={(e)=>setNewForma(e.target.value)} onKeyDown={(e)=>e.key === 'Enter' && addItem('forma')}/>
                        <button onClick={()=>addItem('forma')} className="bg-btp-cyan text-btp-dark p-3 rounded-xl shadow-lg hover:scale-110 transition-transform"><Plus size={20}/></button>
                    </div>
                </div>

                <div className="space-y-4">
                    {emp.formations_json.map((f:any, idx:number)=>(
                        <div key={idx} className={`p-5 rounded-3xl border transition-all ${f.prevu ? 'bg-btp-amber/5 border-btp-amber/20' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                            <div className="flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
                                <div className="flex items-center gap-4">
                                    <input type="checkbox" checked={!f.prevu} onChange={(e)=>{const c=[...emp.formations_json]; c[idx].prevu=!e.target.checked; setEmp({...emp, formations_json:c})}} className="w-5 h-5 rounded border-white/10 bg-btp-dark text-btp-cyan focus:ring-btp-cyan"/>
                                    <div>
                                      <span className={`font-black text-xs uppercase tracking-tight ${f.prevu ? 'text-btp-amber' : 'text-white'}`}>{f.label}</span>
                                      {f.prevu && <p className="text-[8px] font-black uppercase text-btp-amber/50 tracking-tighter mt-0.5 italic">Formation à planifier</p>}
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-gray-600 uppercase mb-1">Expiration</span>
                                        <input type="date" value={f.exp} onChange={(e)=>{const c=[...emp.formations_json]; c[idx].exp=e.target.value; setEmp({...emp, formations_json:c})}} className="bg-transparent text-[11px] font-black text-btp-cyan border-none p-0 focus:ring-0 cursor-pointer"/>
                                    </div>

                                    <div className="flex items-center gap-2 border-l border-white/5 pl-6">
                                        <label className="cursor-pointer p-2.5 rounded-xl bg-btp-dark/50 hover:bg-white/5 transition-all relative">
                                            <input type="file" className="hidden" onChange={(e)=>handleUpload(e, 'forma', idx)} />
                                            <FileUp size={16} className={f.doc_url ? "text-green-500" : "text-gray-600"} />
                                        </label>
                                        {f.doc_url && <button onClick={()=>setPreviewUrl(f.doc_url)} className="p-2.5 bg-btp-cyan/10 text-btp-cyan rounded-xl hover:bg-btp-cyan/20"><Eye size={16}/></button>}
                                        <button onClick={()=>{const c=emp.formations_json.filter((_:any,i:number)=>i!==idx); setEmp({...emp, formations_json:c})}} className="p-2.5 text-gray-700 hover:text-btp-pink rounded-xl hover:bg-btp-pink/5"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-btp-card/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden relative">
                <div className="flex justify-between items-center mb-10">
                    <h3 className="font-black uppercase text-white flex items-center gap-3 text-xl italic"><FolderOpen size={28} className="text-btp-amber"/> Classeur Administratif</h3>
                    <div className="flex gap-3">
                        <input type="text" placeholder="NOM DU FICHIER..." className="bg-btp-dark/50 border border-white/10 rounded-xl px-5 py-3 text-[10px] font-black w-48 focus:outline-none focus:border-btp-amber" value={newDoc} onChange={(e)=>setNewDoc(e.target.value)} onKeyDown={(e)=>e.key === 'Enter' && addItem('doc')}/>
                        <button onClick={()=>addItem('doc')} className="bg-btp-amber text-btp-dark p-3 rounded-xl shadow-lg hover:scale-110 transition-transform"><Plus size={20}/></button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {emp.documents_divers_json.map((d:any, idx:number)=>(
                        <div key={idx} className="flex items-center justify-between bg-white/5 p-4 rounded-3xl border border-white/5 hover:border-white/10 transition-all">
                            <div className="flex items-center gap-4 overflow-hidden">
                                <div className="p-2.5 bg-btp-amber/10 rounded-xl text-btp-amber"><FileText size={20}/></div>
                                <span className="font-black text-[10px] uppercase text-gray-200 truncate tracking-tight">{d.label}</span>
                            </div>
                            <div className="flex gap-1 pl-4 border-l border-white/5">
                                <label className="cursor-pointer p-2 hover:text-btp-cyan transition-colors"><input type="file" className="hidden" onChange={(e)=>handleUpload(e, 'doc', idx)} /><FileUp size={16} className={d.doc_url ? "text-green-500" : "text-gray-700"} /></label>
                                {d.doc_url && <button onClick={()=>setPreviewUrl(d.doc_url)} className="p-2 text-btp-cyan"><Eye size={16}/></button>}
                                <button onClick={()=>{const c=emp.documents_divers_json.filter((_:any,i:number)=>i!==idx); setEmp({...emp, documents_divers_json:c})}} className="p-2 text-gray-800 hover:text-btp-pink"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* MODAL PREVIEW PDF/IMG */}
      {previewUrl && (
        <div className="fixed inset-0 bg-btp-dark/95 z-[500] flex flex-col items-center justify-center p-6 backdrop-blur-xl">
          <button onClick={()=>setPreviewUrl(null)} className="absolute top-8 right-8 text-white p-4 bg-white/5 rounded-full hover:bg-btp-pink transition-all shadow-2xl"><X size={32}/></button>
          <div className="max-w-6xl w-full h-[85vh] bg-btp-dark rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10 relative">
             <iframe src={previewUrl} className="w-full h-full border-none" title="Preview" />
          </div>
        </div>
      )}
    </div>
  );
}
