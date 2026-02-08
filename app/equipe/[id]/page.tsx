"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, Save, Bell, HardHat, GraduationCap, 
  Plus, Trash2, Car, FileUp, CheckCircle2, Loader2, FileText, X, Eye, Share2, ExternalLink, Activity
} from 'lucide-react';

export default function FicheEmploye() {
  const { id } = useParams();
  const router = useRouter();
  const [emp, setEmp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
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
    if (!error) alert("Dossier et Statut RH synchronisés !");
    else alert("Erreur lors de la sauvegarde.");
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
      setEmp({...emp, formations_json: [...emp.formations_json, { label: newForma, prevu: "", exp: "" }]});
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
      <div className="flex justify-between items-center mb-10">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 font-bold hover:text-black transition-all">
          <ArrowLeft size={20} /> Retour
        </button>
        <button onClick={handleSave} disabled={isSaving} className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-xl flex items-center gap-2 hover:scale-105 transition-all">
          {isSaving ? <Loader2 className="animate-spin" /> : <Save size={18} />} 
          Enregistrer les modifications
        </button>
      </div>

      <div className="grid grid-cols-12 gap-8">
        
        {/* COLONNE GAUCHE : IDENTITÉ & STATUT RH */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden">
            <h2 className="text-3xl font-black uppercase text-gray-900 leading-tight mb-1">{emp.nom} {emp.prenom}</h2>
            <p className="text-blue-500 font-bold uppercase text-[10px] tracking-widest">{emp.role}</p>
            
            {/* SÉLECTEUR DE STATUT RH (SYNCHRONISÉ) */}
            <div className="mt-8 pt-8 border-t border-gray-50">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 mb-3 tracking-tighter">
                <Activity size={14} /> Statut Actuel (Dashboard & Planning)
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
                placeholder="Détails (ex: retour le 15/02)..."
                className="w-full mt-3 bg-gray-50 border-none rounded-xl p-3 text-[11px] font-bold italic"
                value={emp.commentaire_statut || ''}
                onChange={(e) => setEmp({...emp, commentaire_statut: e.target.value})}
              />
            </div>

            {/* VÉHICULE */}
            <div className="mt-6 pt-6 border-t border-gray-50 space-y-3">
              <label className="block text-[10px] font-black uppercase text-gray-400 tracking-tighter">Affectation Véhicule</label>
              <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                <button onClick={()=>setEmp({...emp, vehicule_type:'perso'})} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${emp.vehicule_type === 'perso' ? 'bg-white shadow-sm font-black text-black' : 'text-gray-400'}`}>Perso</button>
                <button onClick={()=>setEmp({...emp, vehicule_type:'PZO'})} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${emp.vehicule_type === 'PZO' ? 'bg-white shadow-sm font-black text-black' : 'text-gray-400'}`}>PZO</button>
              </div>
              {emp.vehicule_type === 'PZO' && (
                <input type="text" placeholder="Immatriculation..." className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold uppercase" value={emp.vehicule_immat || ''} onChange={(e)=>setEmp({...emp, vehicule_immat: e.target.value.toUpperCase()})}/>
              )}
            </div>
          </div>

          <div className="bg-[#2d3436] p-8 rounded-[40px] text-white shadow-xl">
            <div className="flex items-center gap-2 mb-4 text-[#ff9f43] font-black uppercase text-xs tracking-widest"><Bell size={18} /> Convocations Bureau</div>
            <textarea value={emp.convocations_notes || ''} onChange={(e)=>setEmp({...emp, convocations_notes: e.target.value})} placeholder="Notes internes, visites médicales..." className="w-full bg-white/10 border-none rounded-2xl p-4 text-xs h-40 focus:ring-1 focus:ring-orange-500 placeholder:text-white/20"/>
          </div>
        </div>

        {/* COLONNE DROITE : HABILITATIONS, FORMATIONS & DOCS */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          {/* HABILITATIONS */}
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black uppercase text-gray-800 flex items-center gap-2"><HardHat size={20}/> Habilitations Sécurité</h3>
              <div className="flex gap-2">
                <input type="text" placeholder="Ajouter (Entrée)..." className="bg-gray-50 border-none rounded-xl px-4 py-2 text-xs font-bold w-48" value={newHabil} onChange={(e)=>setNewHabil(e.target.value)} onKeyDown={(e)=>e.key === 'Enter' && addItem('habil')}/>
                <button onClick={()=>addItem('habil')} className="bg-black text-white p-2 rounded-xl"><Plus size={18}/></button>
              </div>
            </div>
            <div className="space-y-3">
              {emp.habilitations_json.map((h:any, idx:number)=>(
                <div key={idx} className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl group transition-all hover:bg-gray-100">
                  <input type="checkbox" checked={h.ok} onChange={(e)=>{const c = [...emp.habilitations_json]; c[idx].ok = e.target.checked; setEmp({...emp, habilitations_json:c});}} className="w-5 h-5 rounded border-gray-300 text-green-600"/>
                  <span className="flex-1 font-bold text-sm uppercase text-gray-700">{h.label}</span>
                  <input type="date" value={h.exp} onChange={(e)=>{const c = [...emp.habilitations_json]; c[idx].exp = e.target.value; setEmp({...emp, habilitations_json:c});}} className="bg-transparent border-none text-[10px] font-black p-0 w-24 uppercase text-gray-500"/>
                  <div className="flex gap-2 items-center">
                    <label className="cursor-pointer transition-transform hover:scale-110"><input type="file" className="hidden" onChange={(e)=>handleUpload(e, 'habil', idx)} /><FileUp size={18} className={h.doc_url ? "text-green-500" : "text-gray-300"} /></label>
                    {h.doc_url && <button onClick={()=>setPreviewUrl(h.doc_url)} className="text-blue-500 hover:scale-110 transition-transform"><Eye size={18}/></button>}
                    <button onClick={()=>{const c = emp.habilitations_json.filter((_:any,i:number)=>i!==idx); setEmp({...emp, habilitations_json:c});}} className="text-gray-200 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FORMATIONS */}
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black uppercase text-gray-800 flex items-center gap-2"><GraduationCap size={20}/> Formations & Recyclages</h3>
              <div className="flex gap-2">
                <input type="text" placeholder="Formation..." className="bg-gray-50 border-none rounded-xl px-4 py-2 text-xs font-bold w-48" value={newForma} onChange={(e)=>setNewForma(e.target.value)} onKeyDown={(e)=>e.key === 'Enter' && addItem('forma')}/>
                <button onClick={()=>addItem('forma')} className="bg-black text-white p-2 rounded-xl"><Plus size={18}/></button>
              </div>
            </div>
            <div className="space-y-3">
              {emp.formations_json.map((f:any, idx:number)=>(
                <div key={idx} className="grid grid-cols-12 gap-4 items-center bg-gray-50 p-4 rounded-2xl group transition-all hover:bg-gray-100">
                  <div className="col-span-5 font-bold text-sm uppercase text-gray-700">{f.label}</div>
                  <div className="col-span-4 flex flex-col"><span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Fin Validité</span><input type="date" value={f.exp} onChange={(e)=>{const c = [...emp.formations_json]; c[idx].exp = e.target.value; setEmp({...emp, formations_json:c});}} className="bg-transparent border-none text-[10px] font-black p-0 uppercase text-gray-500" /></div>
                  <div className="col-span-3 flex justify-end gap-3 items-center">
                    <label className="cursor-pointer hover:scale-110 transition-transform"><input type="file" className="hidden" onChange={(e)=>handleUpload(e, 'forma', idx)} /><FileUp size={18} className={f.doc_url ? "text-green-500" : "text-gray-300"} /></label>
                    {f.doc_url && <button onClick={()=>setPreviewUrl(f.doc_url)} className="text-blue-500 hover:scale-110 transition-transform"><Eye size={18}/></button>}
                    <button onClick={()=>{const c = emp.formations_json.filter((_:any,i:number)=>i!==idx); setEmp({...emp, formations_json:c});}} className="text-gray-200 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DOCUMENTS ADMINISTRATIFS */}
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-6"><h3 className="font-black uppercase text-gray-800 flex items-center gap-2"><FileText size={20} className="text-purple-500" /> Documents Administratifs</h3><div className="flex gap-2"><input type="text" placeholder="CNI, Carte BTP..." className="bg-gray-50 border-none rounded-xl px-4 py-2 text-xs font-bold w-48" value={newDoc} onChange={(e)=>setNewDoc(e.target.value)} onKeyDown={(e)=>e.key === 'Enter' && addItem('doc')}/><button onClick={()=>addItem('doc')} className="bg-purple-500 text-white p-2 rounded-xl shadow-lg shadow-purple-100"><Plus size={18}/></button></div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {emp.documents_divers_json.map((d:any, idx:number)=>(
                <div key={idx} className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl group border border-transparent hover:border-purple-100 transition-all">
                  <div className="flex flex-col"><span className="font-bold text-sm uppercase text-gray-700">{d.label}</span><span className="text-[8px] font-black text-gray-400 italic">Ajouté le {d.date_depot}</span></div>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer hover:scale-110 transition-transform"><input type="file" className="hidden" onChange={(e)=>handleUpload(e, 'doc', idx)} /><FileUp size={18} className={d.doc_url ? "text-green-500" : "text-gray-300"} /></label>
                    {d.doc_url && <button onClick={()=>setPreviewUrl(d.doc_url)} className="text-purple-600 bg-purple-50 p-2 rounded-xl"><Eye size={16}/></button>}
                    <button onClick={()=>{const c = emp.documents_divers_json.filter((_:any,i:number)=>i!==idx); setEmp({...emp, documents_divers_json:c})}} className="text-gray-200 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE PRÉVISUALISATION (CLASSEUR DIGITAL) */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex flex-col items-center justify-center p-4 backdrop-blur-sm">
          <button onClick={()=>setPreviewUrl(null)} className="absolute top-6 right-6 text-white p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all"><X size={32}/></button>
          <div className="max-w-4xl w-full h-[80vh] bg-white rounded-3xl overflow-hidden shadow-2xl relative border-4 border-white/10">
             <iframe src={previewUrl} className="w-full h-full border-none" title="Preview" />
          </div>
          <div className="mt-8 flex gap-4">
            <button onClick={()=>window.open(previewUrl, '_blank')} className="bg-white text-black px-10 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-xl hover:scale-105 transition-all"><ExternalLink size={18}/> Ouvrir en plein écran</button>
            <button onClick={()=>setPreviewUrl(null)} className="bg-red-500 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 hover:bg-red-600 transition-all shadow-xl">Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}
