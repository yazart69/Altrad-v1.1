"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, Save, Bell, HardHat, GraduationCap, 
  Plus, Trash2, Car, FileUp, CheckCircle2, Loader2, FileText, X, Eye, 
  Activity, FolderOpen, Calendar, AlertCircle, ClipboardList, Users
} from 'lucide-react';

export default function FicheEmploye() {
  const { id } = useParams();
  const router = useRouter();
  const [emp, setEmp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // États d'ajout rapide
  const [newHabil, setNewHabil] = useState("");
  const [newForma, setNewForma] = useState("");
  const [newDoc, setNewDoc] = useState("");

  useEffect(() => {
    async function fetchEmp() {
      const { data } = await supabase.from('employes').select('*').eq('id', id).single();
      if (data) {
        data.habilitations_json = data.habilitations_json || [];
        data.formations_json = data.formations_json || [];
        data.documents_divers_json = data.documents_divers_json || [];
        data.statut_actuel = data.statut_actuel || 'disponible';
        // Ajout champ infos terrain si manquant
        data.infos_terrain = data.infos_terrain || ''; 
      }
      setEmp(data);
      setLoading(false);
    }
    fetchEmp();
  }, [id]);

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase.from('employes').update(emp).eq('id', id);
    setIsSaving(false);
    if (!error) alert("✅ Dossier mis à jour avec succès !");
    else alert("❌ Erreur lors de la sauvegarde.");
  };

  const handleDeleteEmployee = async () => {
    if(confirm("⚠️ ATTENTION : Suppression définitive du dossier employé. Continuer ?")) {
        const { error } = await supabase.from('employes').delete().eq('id', id);
        if(!error) router.push('/equipe');
        else alert("Erreur suppression.");
    }
  };

  const handleUpload = async (e: any, type: string, idx: number) => {
    const file = e.target.files[0];
    if (!file) return;
    const path = `${id}/${type}_${idx}_${Date.now()}`;
    const { data, error } = await supabase.storage.from('documents_employes').upload(path, file);
    if (!error) {
      const { data: urlData } = supabase.storage.from('documents_employes').getPublicUrl(path);
      const field = type === 'habil' ? 'habilitations_json' : type === 'forma' ? 'formations_json' : 'documents_divers_json';
      const copy = [...emp[field]];
      copy[idx].doc_url = urlData.publicUrl;
      setEmp({ ...emp, [field]: copy });
    }
  };

  const addItem = (type: string) => {
    if (type === 'habil' && newHabil) {
      setEmp({...emp, habilitations_json: [...emp.habilitations_json, { label: newHabil, ok: false, exp: "" }]});
      setNewHabil("");
    } else if (type === 'forma' && newForma) {
      // Structure enrichie pour formations (validée/prévue)
      setEmp({...emp, formations_json: [...emp.formations_json, { label: newForma, prevu: false, exp: "", date_obtention: "" }]});
      setNewForma("");
    } else if (type === 'doc' && newDoc) {
      setEmp({...emp, documents_divers_json: [...emp.documents_divers_json, { label: newDoc, date_depot: new Date().toLocaleDateString() }]});
      setNewDoc("");
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black uppercase text-gray-400 animate-pulse"><Loader2 className="animate-spin mr-2"/> Accès au dossier...</div>;

  return (
    <div className="p-4 md:p-10 font-['Fredoka'] max-w-6xl mx-auto pb-32">
      
      {/* HEADER ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 font-bold hover:text-black transition-all">
          <ArrowLeft size={20} /> Retour liste
        </button>
        
        <div className="flex gap-3">
            <button onClick={handleDeleteEmployee} className="bg-red-50 text-red-500 px-6 py-4 rounded-2xl font-black uppercase text-xs hover:bg-red-100 transition-all flex items-center gap-2">
                <Trash2 size={16}/> Supprimer
            </button>
            <button onClick={handleSave} disabled={isSaving} className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-xl flex items-center gap-2 hover:scale-105 transition-all">
            {isSaving ? <Loader2 className="animate-spin" /> : <Save size={18} />} 
            Enregistrer
            </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        
        {/* COLONNE GAUCHE : IDENTITÉ & NOTES */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden">
            {/* LIGNE CORRIGÉE : Users est maintenant importé */}
            <div className="absolute top-0 right-0 p-6 opacity-5"><Users size={100}/></div>
            <h2 className="text-3xl font-black uppercase text-gray-900 leading-tight mb-1">{emp.nom} {emp.prenom}</h2>
            <p className="text-blue-500 font-bold uppercase text-[10px] tracking-widest bg-blue-50 inline-block px-2 py-1 rounded">{emp.role}</p>
            
            {/* SÉLECTEUR DE STATUT RH */}
            <div className="mt-8 pt-8 border-t border-gray-50">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 mb-3 tracking-tighter">
                <Activity size={14} /> Statut Actuel
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'disponible', label: 'Disponible', color: 'bg-green-500' },
                  { id: 'conge', label: 'Congés', color: 'bg-orange-500' },
                  { id: 'maladie', label: 'Maladie', color: 'bg-red-500' },
                  { id: 'formation', label: 'Formation', color: 'bg-blue-500' }
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setEmp({...emp, statut_actuel: s.id})}
                    className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${
                      emp.statut_actuel === s.id 
                      ? `${s.color} text-white border-transparent shadow-lg scale-105` 
                      : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <input 
                type="text" 
                placeholder="Précisions statut (dates...)"
                className="w-full mt-3 bg-gray-50 border-none rounded-xl p-3 text-[11px] font-bold italic text-gray-600"
                value={emp.commentaire_statut || ''}
                onChange={(e) => setEmp({...emp, commentaire_statut: e.target.value})}
              />
            </div>

            {/* VÉHICULE */}
            <div className="mt-6 pt-6 border-t border-gray-50 space-y-3">
              <label className="block text-[10px] font-black uppercase text-gray-400 tracking-tighter flex items-center gap-2"><Car size={14}/> Affectation Véhicule</label>
              <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                <button onClick={()=>setEmp({...emp, vehicule_type:'perso'})} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${emp.vehicule_type === 'perso' ? 'bg-white shadow-sm font-black text-black' : 'text-gray-400'}`}>Perso</button>
                <button onClick={()=>setEmp({...emp, vehicule_type:'PZO'})} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${emp.vehicule_type === 'PZO' ? 'bg-white shadow-sm font-black text-black' : 'text-gray-400'}`}>Société</button>
              </div>
              {emp.vehicule_type === 'PZO' && (
                <input type="text" placeholder="Immatriculation..." className="w-full bg-yellow-50 border-none rounded-xl p-3 text-sm font-bold uppercase text-yellow-700 placeholder:text-yellow-300" value={emp.vehicule_immat || ''} onChange={(e)=>setEmp({...emp, vehicule_immat: e.target.value.toUpperCase()})}/>
              )}
            </div>
          </div>

          {/* TUILE NOTES (EX-CONVOCATION) */}
          <div className="bg-[#fff8e1] p-8 rounded-[40px] text-yellow-900 shadow-sm border border-yellow-100 relative">
            <div className="flex items-center gap-2 mb-4 font-black uppercase text-xs tracking-widest text-yellow-600">
                <Bell size={18} /> Notes & Suivi Interne
            </div>
            <textarea 
                value={emp.convocations_notes || ''} 
                onChange={(e)=>setEmp({...emp, convocations_notes: e.target.value})} 
                placeholder="Notez ici les infos importantes, dates de visites médicales, remarques RH..." 
                className="w-full bg-white/50 border-none rounded-2xl p-4 text-xs h-40 focus:ring-2 focus:ring-yellow-400 placeholder:text-yellow-700/30 font-medium"
            />
          </div>
        </div>

        {/* COLONNE DROITE : FORMATIONS, HABILITATIONS & DOCS */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
            
            {/* 1. TUILE FORMATIONS & HABILITATIONS (FUSIONNÉE) */}
            <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h3 className="font-black uppercase text-gray-800 flex items-center gap-2 text-xl"><GraduationCap size={24} className="text-blue-600"/> Formations & Habilitations</h3>
                        <p className="text-xs text-gray-400 font-bold mt-1">Suivi des compétences et recyclages</p>
                    </div>
                    {/* Ajout rapide */}
                    <div className="flex gap-2">
                        <input type="text" placeholder="Ajouter une formation..." className="bg-gray-50 border-none rounded-xl px-4 py-2 text-xs font-bold w-40 md:w-60" value={newForma} onChange={(e)=>setNewForma(e.target.value)} onKeyDown={(e)=>e.key === 'Enter' && addItem('forma')}/>
                        <button onClick={()=>addItem('forma')} className="bg-blue-600 text-white p-2 rounded-xl shadow-lg hover:bg-blue-700"><Plus size={18}/></button>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* LISTE DES FORMATIONS / HABILITATIONS */}
                    {emp.formations_json.length === 0 && <p className="text-center text-gray-300 text-xs font-bold italic py-4">Aucune formation enregistrée.</p>}
                    
                    {emp.formations_json.map((f:any, idx:number)=>(
                        <div key={idx} className={`p-4 rounded-2xl border transition-all ${f.prevu ? 'bg-orange-50 border-orange-100' : 'bg-gray-50 border-gray-100 hover:bg-white hover:shadow-md'}`}>
                            <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                                {/* TITRE & STATUT */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <input type="checkbox" checked={!f.prevu} onChange={(e)=>{const c=[...emp.formations_json]; c[idx].prevu=!e.target.checked; setEmp({...emp, formations_json:c})}} className="rounded text-blue-600 focus:ring-blue-500"/>
                                        <span className={`font-black text-sm uppercase ${f.prevu ? 'text-orange-600' : 'text-gray-800'}`}>{f.label}</span>
                                        {f.prevu && <span className="text-[9px] bg-orange-200 text-orange-700 px-2 py-0.5 rounded font-bold uppercase">Prévue</span>}
                                    </div>
                                </div>

                                {/* DATES */}
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-gray-400 uppercase">Validité</span>
                                        <input type="date" value={f.exp} onChange={(e)=>{const c=[...emp.formations_json]; c[idx].exp=e.target.value; setEmp({...emp, formations_json:c})}} className="bg-transparent text-xs font-bold text-gray-600 border-none p-0 focus:ring-0"/>
                                    </div>
                                </div>

                                {/* DOCS & ACTIONS */}
                                <div className="flex items-center gap-2">
                                    <label className="cursor-pointer p-2 rounded-lg hover:bg-gray-200 transition-colors relative">
                                        <input type="file" className="hidden" onChange={(e)=>handleUpload(e, 'forma', idx)} />
                                        <FileUp size={16} className={f.doc_url ? "text-green-500" : "text-gray-400"} />
                                        {f.doc_url && <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full border border-white"></span>}
                                    </label>
                                    {f.doc_url && <button onClick={()=>setPreviewUrl(f.doc_url)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Eye size={16}/></button>}
                                    <button onClick={()=>{const c=emp.formations_json.filter((_:any,i:number)=>i!==idx); setEmp({...emp, formations_json:c})}} className="p-2 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* CHAMP INFOS TERRAIN */}
                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block flex items-center gap-2"><AlertCircle size={12}/> Infos Terrain & Remarques RH</label>
                        <textarea 
                            value={emp.infos_terrain || ''} 
                            onChange={(e)=>setEmp({...emp, infos_terrain: e.target.value})} 
                            placeholder="Aptitudes spécifiques, restrictions, besoins en formation..." 
                            className="w-full bg-gray-50 border-none rounded-xl p-3 text-xs min-h-[80px]"
                        />
                    </div>
                </div>
            </div>

            {/* 2. DOCUMENTS ADMINISTRATIFS (STYLE DOSSIER) */}
            <div className="bg-[#FFF9C4] p-1 rounded-[40px] shadow-sm border border-yellow-200 relative overflow-hidden">
                <div className="bg-[#FFF176] p-4 rounded-t-[35px] flex justify-between items-center px-8 border-b border-yellow-300/50">
                    <h3 className="font-black uppercase text-yellow-900 flex items-center gap-2"><FolderOpen size={20}/> Dossier Administratif</h3>
                    <div className="flex gap-2">
                        <input type="text" placeholder="Ajouter un document..." className="bg-white/50 border-none rounded-lg px-3 py-1.5 text-xs font-bold w-40 placeholder:text-yellow-700/50" value={newDoc} onChange={(e)=>setNewDoc(e.target.value)} onKeyDown={(e)=>e.key === 'Enter' && addItem('doc')}/>
                        <button onClick={()=>addItem('doc')} className="bg-yellow-600 text-white p-1.5 rounded-lg shadow-sm hover:bg-yellow-700"><Plus size={16}/></button>
                    </div>
                </div>
                <div className="p-8 bg-[#fffde7] rounded-b-[35px] min-h-[150px]">
                    {emp.documents_divers_json.length === 0 && <p className="text-center text-yellow-700/40 text-xs font-bold italic mt-4">Dossier vide.</p>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {emp.documents_divers_json.map((d:any, idx:number)=>(
                            <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-xl border border-yellow-100 shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <FileText size={18} className="text-yellow-500 shrink-0"/>
                                    <span className="font-bold text-xs uppercase text-gray-700 truncate">{d.label}</span>
                                </div>
                                <div className="flex gap-1">
                                    <label className="cursor-pointer hover:bg-yellow-50 p-1.5 rounded"><input type="file" className="hidden" onChange={(e)=>handleUpload(e, 'doc', idx)} /><FileUp size={14} className={d.doc_url ? "text-green-500" : "text-gray-300"} /></label>
                                    {d.doc_url && <button onClick={()=>setPreviewUrl(d.doc_url)} className="p-1.5 hover:bg-yellow-50 rounded text-blue-500"><Eye size={14}/></button>}
                                    <button onClick={()=>{const c=emp.documents_divers_json.filter((_:any,i:number)=>i!==idx); setEmp({...emp, documents_divers_json:c})}} className="p-1.5 hover:bg-red-50 rounded text-gray-300 hover:text-red-500"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 3. TÂCHES ATTRIBUÉES (PLACEHOLDER) */}
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 p-8 rounded-[40px] text-center opacity-70 hover:opacity-100 transition-opacity">
                <div className="flex flex-col items-center justify-center gap-3">
                    <div className="bg-white p-4 rounded-full shadow-sm">
                        <ClipboardList size={24} className="text-gray-400"/>
                    </div>
                    <div>
                        <h3 className="font-black uppercase text-gray-600">Tâches & Chantiers</h3>
                        <p className="text-xs text-gray-400 font-medium mt-1">Les tâches attribuées via le planning apparaîtront ici prochainement.</p>
                    </div>
                </div>
            </div>

        </div>
      </div>

      {/* MODAL PREVIEW */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex flex-col items-center justify-center p-4 backdrop-blur-sm">
          <button onClick={()=>setPreviewUrl(null)} className="absolute top-6 right-6 text-white p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all"><X size={32}/></button>
          <div className="max-w-4xl w-full h-[80vh] bg-white rounded-3xl overflow-hidden shadow-2xl relative border-4 border-white/10">
             <iframe src={previewUrl} className="w-full h-full border-none" title="Preview" />
          </div>
        </div>
      )}
    </div>
  );
}
