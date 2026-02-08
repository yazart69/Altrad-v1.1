"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, Save, Bell, HardHat, GraduationCap, 
  Plus, Trash2, Car, FileUp, CheckCircle2, Loader2, FileText, X 
} from 'lucide-react';

export default function FicheEmploye() {
  const { id } = useParams();
  const router = useRouter();
  const [emp, setEmp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // États pour les entrées rapides
  const [newHabil, setNewHabil] = useState("");
  const [newForma, setNewForma] = useState("");
  const [newDoc, setNewDoc] = useState("");

  useEffect(() => {
    async function fetchEmp() {
      const { data } = await supabase.from('employes').select('*').eq('id', id).single();
      if (data) {
        // Initialisation des champs JSON s'ils sont vides
        data.habilitations_json = data.habilitations_json || [];
        data.formations_json = data.formations_json || [];
        data.documents_divers_json = data.documents_divers_json || [];
      }
      setEmp(data);
      setLoading(false);
    }
    fetchEmp();
  }, [id]);

  // LOGIQUE UPLOAD VERS STORAGE
  const handleUpload = async (e: any, type: 'habil' | 'forma' | 'doc', idx: number) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${type}_${idx}_${Date.now()}.${fileExt}`;
    const filePath = `${id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('documents_employes')
      .upload(filePath, file);

    if (uploadError) {
      alert("Erreur upload: " + uploadError.message);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('documents_employes')
      .getPublicUrl(filePath);

    // Mise à jour de l'état local selon le type
    const field = type === 'habil' ? 'habilitations_json' : type === 'forma' ? 'formations_json' : 'documents_divers_json';
    const copy = [...emp[field]];
    copy[idx].doc_url = urlData.publicUrl;
    
    setEmp({ ...emp, [field]: copy });
    alert("Document lié avec succès !");
  };

  // AJOUT DYNAMIQUE (Touche Entrée)
  const addItem = (type: 'habil' | 'forma' | 'doc') => {
    if (type === 'habil' && newHabil) {
      setEmp({...emp, habilitations_json: [...emp.habilitations_json, { label: newHabil, ok: false, exp: "" }]});
      setNewHabil("");
    } else if (type === 'forma' && newForma) {
      setEmp({...emp, formations_json: [...emp.formations_json, { label: newForma, prevu: "", exp: "" }]});
      setNewForma("");
    } else if (type === 'doc' && newDoc) {
      setEmp({...emp, documents_divers_json: [...emp.documents_divers_json, { label: newDoc, date_depot: new Date().toLocaleDateString(), doc_url: "" }]});
      setNewDoc("");
    }
  };

  const handleSave = async () => {
    const { error } = await supabase.from('employes').update(emp).eq('id', id);
    if (!error) alert("Dossier sauvegardé avec succès !");
    else alert("Erreur lors de la sauvegarde.");
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center font-black uppercase text-gray-400">
      <Loader2 className="animate-spin mr-2"/> Accès au coffre-fort RH...
    </div>
  );

  return (
    <div className="p-4 md:p-10 font-['Fredoka'] max-w-6xl mx-auto pb-20">
      
      {/* BARRE D'ACTIONS */}
      <div className="flex justify-between items-center mb-10">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 font-bold hover:text-black transition-all">
          <ArrowLeft size={20} /> Retour aux effectifs
        </button>
        <button onClick={handleSave} className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-xl flex items-center gap-2 hover:scale-105 transition-all">
          <Save size={18} /> Enregistrer le dossier
        </button>
      </div>

      <div className="grid grid-cols-12 gap-8">
        
        {/* COLONNE GAUCHE : IDENTITÉ, VÉHICULE & CONVOCATIONS */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
            <h2 className="text-3xl font-black uppercase text-gray-900 leading-tight mb-1">{emp.nom} {emp.prenom}</h2>
            <p className="text-blue-500 font-bold uppercase text-xs tracking-widest">{emp.role}</p>
            
            {/* GESTION VÉHICULE */}
            <div className="mt-8 pt-8 border-t border-gray-50 space-y-4">
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 tracking-tighter">Véhicule utilisé</label>
              <div className="flex gap-2 bg-gray-50 p-1 rounded-xl">
                <button onClick={()=>setEmp({...emp, vehicule_type:'perso'})} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${emp.vehicule_type === 'perso' ? 'bg-white shadow-sm' : 'text-gray-400'}`}>Perso</button>
                <button onClick={()=>setEmp({...emp, vehicule_type:'PZO'})} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${emp.vehicule_type === 'PZO' ? 'bg-white shadow-sm' : 'text-gray-400'}`}>PZO</button>
              </div>
              {emp.vehicule_type === 'PZO' && (
                <input 
                  type="text" placeholder="Immatriculation..." 
                  className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold uppercase"
                  value={emp.vehicule_immat || ''} onChange={(e)=>setEmp({...emp, vehicule_immat: e.target.value.toUpperCase()})}
                />
              )}
            </div>
          </div>

          {/* BLOC CONVOCATIONS / SANTÉ */}
          <div className="bg-[#2d3436] p-8 rounded-[40px] text-white shadow-xl">
            <div className="flex items-center gap-2 mb-4 text-[#ff9f43]">
              <Bell size={18} />
              <h3 className="font-black uppercase text-xs">Convocations / Bureau / Santé</h3>
            </div>
            <textarea 
              value={emp.convocations_notes || ''} 
              onChange={(e)=>setEmp({...emp, convocations_notes: e.target.value})}
              placeholder="Ex: RDV Médecine du travail le 12/03..."
              className="w-full bg-white/10 border-none rounded-2xl p-4 text-xs h-40 focus:ring-1 focus:ring-orange-500 placeholder:text-white/20 leading-relaxed"
            />
          </div>
        </div>

        {/* COLONNE DROITE : HABILITATIONS, FORMATIONS & DOCS */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          {/* SECTION HABILITATIONS */}
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black uppercase text-gray-800 flex items-center gap-2"><HardHat size={20}/> Habilitations</h3>
              <div className="flex gap-2">
                <input 
                  type="text" placeholder="Ajouter (ex: H0B0)..." 
                  className="bg-gray-50 border-none rounded-xl px-4 py-2 text-xs font-bold w-48 focus:ring-2 focus:ring-black"
                  value={newHabil} onChange={(e)=>setNewHabil(e.target.value)}
                  onKeyDown={(e)=>e.key === 'Enter' && addItem('habil')}
                />
                <button onClick={()=>addItem('habil')} className="bg-black text-white p-2 rounded-xl"><Plus size={18}/></button>
              </div>
            </div>

            <div className="space-y-3">
              {emp.habilitations_json.map((h:any, idx:number)=>(
                <div key={idx} className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl group transition-all hover:bg-gray-100">
                  <input 
                    type="checkbox" checked={h.ok} 
                    onChange={(e)=>{
                      const c = [...emp.habilitations_json]; c[idx].ok = e.target.checked; setEmp({...emp, habilitations_json:c});
                    }}
                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="flex-1 font-bold text-sm uppercase">{h.label}</span>
                  <input 
                    type="date" value={h.exp} 
                    onChange={(e)=>{
                      const c = [...emp.habilitations_json]; c[idx].exp = e.target.value; setEmp({...emp, habilitations_json:c});
                    }}
                    className="bg-transparent border-none text-[10px] font-black p-0 w-24 uppercase"
                  />
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" onChange={(e)=>handleUpload(e, 'habil', idx)} />
                    <FileUp size={18} className={h.doc_url ? "text-green-500" : "text-gray-300"} />
                  </label>
                  {h.doc_url && <button onClick={()=>window.open(h.doc_url, '_blank')} className="text-[8px] font-black uppercase text-blue-500">Voir</button>}
                  <button onClick={()=>{
                    const c = emp.habilitations_json.filter((_:any,i:number)=>i!==idx); setEmp({...emp, habilitations_json:c});
                  }} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION FORMATIONS */}
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black uppercase text-gray-800 flex items-center gap-2"><GraduationCap size={20}/> Formations</h3>
              <div className="flex gap-2">
                <input 
                  type="text" placeholder="Formation à prévoir..." 
                  className="bg-gray-50 border-none rounded-xl px-4 py-2 text-xs font-bold w-48 focus:ring-2 focus:ring-black"
                  value={newForma} onChange={(e)=>setNewForma(e.target.value)}
                  onKeyDown={(e)=>e.key === 'Enter' && addItem('forma')}
                />
                <button onClick={()=>addItem('forma')} className="bg-black text-white p-2 rounded-xl"><Plus size={18}/></button>
              </div>
            </div>

            <div className="space-y-3">
              {emp.formations_json.map((f:any, idx:number)=>(
                <div key={idx} className="grid grid-cols-12 gap-4 items-center bg-gray-50 p-4 rounded-2xl group transition-all hover:bg-gray-100">
                  <div className="col-span-4 font-bold text-sm uppercase">{f.label}</div>
                  <div className="col-span-3 flex flex-col">
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Prévue</span>
                    <input type="date" value={f.prevu} onChange={(e)=>{
                      const c = [...emp.formations_json]; c[idx].prevu = e.target.value; setEmp({...emp, formations_json:c});
                    }} className="bg-transparent border-none text-[10px] font-black p-0 uppercase" />
                  </div>
                  <div className="col-span-3 flex flex-col">
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Fin Validité</span>
                    <input type="date" value={f.exp} onChange={(e)=>{
                      const c = [...emp.formations_json]; c[idx].exp = e.target.value; setEmp({...emp, formations_json:c});
                    }} className="bg-transparent border-none text-[10px] font-black p-0 uppercase" />
                  </div>
                  <div className="col-span-2 flex justify-end gap-3 items-center">
                    <label className="cursor-pointer">
                      <input type="file" className="hidden" onChange={(e)=>handleUpload(e, 'forma', idx)} />
                      <FileUp size={18} className={f.doc_url ? "text-green-500" : "text-gray-300"} />
                    </label>
                    <button onClick={()=>{
                      const c = emp.formations_json.filter((_:any,i:number)=>i!==idx); setEmp({...emp, formations_json:c});
                    }} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* NOUVELLE SECTION : DOCUMENTS ADMINISTRATIFS */}
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black uppercase text-gray-800 flex items-center gap-2">
                <FileText size={20} className="text-purple-500" /> Documents Administratifs
              </h3>
              <div className="flex gap-2">
                <input 
                  type="text" placeholder="Ajouter (ex: CNI, Carte BTP)..." 
                  className="bg-gray-50 border-none rounded-xl px-4 py-2 text-xs font-bold w-48 focus:ring-2 focus:ring-purple-500"
                  value={newDoc} onChange={(e)=>setNewDoc(e.target.value)}
                  onKeyDown={(e)=>e.key === 'Enter' && addItem('doc')}
                />
                <button onClick={()=>addItem('doc')} className="bg-purple-500 text-white p-2 rounded-xl"><Plus size={18}/></button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {emp.documents_divers_json.map((d:any, idx:number)=>(
                <div key={idx} className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl group border border-transparent hover:border-purple-100 transition-all">
                  <div className="flex flex-col">
                    <span className="font-bold text-sm uppercase text-gray-700">{d.label}</span>
                    <span className="text-[8px] font-black text-gray-400 uppercase italic">Le {d.date_depot}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer bg-white p-2 rounded-xl shadow-sm hover:bg-gray-100 transition-colors">
                      <input type="file" className="hidden" onChange={(e)=>handleUpload(e, 'doc', idx)} />
                      <FileUp size={18} className={d.doc_url ? "text-green-500" : "text-gray-300"} />
                    </label>
                    {d.doc_url && (
                      <button onClick={() => window.open(d.doc_url, '_blank')} className="text-[9px] font-black text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">VOIR</button>
                    )}
                    <button onClick={()=>{
                      const c = emp.documents_divers_json.filter((_:any,i:number)=>i!==idx); setEmp({...emp, documents_divers_json:c});
                    }} className="text-gray-200 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
