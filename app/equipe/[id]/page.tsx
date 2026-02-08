"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, Save, Share2, Bell, HardHat, GraduationCap, 
  Plus, Trash2, Car, CheckCircle2, FileUp, X 
} from 'lucide-react';

export default function FicheEmploye() {
  const { id } = useParams();
  const router = useRouter();
  const [emp, setEmp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // États pour les entrées rapides
  const [newHabil, setNewHabil] = useState("");
  const [newForma, setNewForma] = useState("");

  useEffect(() => {
    async function fetchEmp() {
      const { data } = await supabase.from('employes').select('*').eq('id', id).single();
      // On s'assure que les listes sont des tableaux
      if (data) {
        data.habilitations_json = data.habilitations_json || [];
        data.formations_json = data.formations_json || [];
      }
      setEmp(data);
      setLoading(false);
    }
    fetchEmp();
  }, [id]);

  const handleSave = async () => {
    const { error } = await supabase.from('employes').update(emp).eq('id', id);
    if (!error) alert("Dossier mis à jour !");
  };

  // AJOUT DYNAMIQUE (Touche Entrée)
  const addItem = (type: 'habil' | 'forma') => {
    if (type === 'habil' && newHabil) {
      const updated = [...emp.habilitations_json, { label: newHabil, ok: false, exp: "" }];
      setEmp({...emp, habilitations_json: updated});
      setNewHabil("");
    } else if (type === 'forma' && newForma) {
      const updated = [...emp.formations_json, { label: newForma, prevu: "", exp: "" }];
      setEmp({...emp, formations_json: updated});
      setNewForma("");
    }
  };

  if (loading) return <div className="p-10 font-black uppercase">Chargement du passeport sécurité...</div>;

  return (
    <div className="p-4 md:p-8 font-['Fredoka'] max-w-6xl mx-auto pb-20">
      
      {/* HEADER ACTIONS */}
      <div className="flex justify-between items-center mb-8 print:hidden">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 font-bold hover:text-black">
          <ArrowLeft size={20} /> Retour
        </button>
        <div className="flex gap-3">
          <button onClick={handleSave} className="bg-[#d63031] text-white px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-xl flex items-center gap-2">
            <Save size={18} /> Enregistrer les modifs
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        
        {/* --- BLOC GAUCHE : IDENTITÉ & CONVOCATIONS --- */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-[35px] border border-gray-100 shadow-sm">
            <h1 className="text-3xl font-black uppercase text-gray-800">{emp.nom} {emp.prenom}</h1>
            <p className="text-blue-500 font-bold uppercase text-sm">{emp.role}</p>
            
            <div className="mt-8 pt-8 border-t border-gray-50 space-y-4">
              <div className="flex items-center gap-3">
                <Car className="text-gray-400" size={20} />
                <select 
                  value={emp.vehicule_type || 'perso'} 
                  onChange={(e) => setEmp({...emp, vehicule_type: e.target.value})}
                  className="bg-gray-50 border-none rounded-xl font-bold text-sm flex-1"
                >
                  <option value="perso">Véhicule Perso</option>
                  <option value="PZO">Véhicule PZO (Société)</option>
                </select>
              </div>
              {emp.vehicule_type === 'PZO' && (
                <input 
                  type="text" 
                  placeholder="Immatriculation..." 
                  value={emp.vehicule_immat || ''} 
                  onChange={(e) => setEmp({...emp, vehicule_immat: e.target.value})}
                  className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold"
                />
              )}
            </div>
          </div>

          <div className="bg-black p-6 rounded-[30px] text-white">
            <div className="flex items-center gap-2 mb-4 text-[#ff9f43]">
              <Bell size={18} />
              <h3 className="font-black uppercase text-xs italic">Convocation / Bureau / Santé</h3>
            </div>
            <textarea 
              value={emp.convocations_notes || ''} 
              onChange={(e) => setEmp({...emp, convocations_notes: e.target.value})}
              placeholder="Entrez ici les dates de RDV, visites médicales ou convocations bureau..."
              className="w-full bg-white/10 border-none rounded-2xl p-4 text-xs h-32 focus:ring-1 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* --- BLOC DROIT : HABILITATIONS & FORMATIONS --- */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          {/* SECTION HABILITATIONS */}
          <div className="bg-white p-8 rounded-[35px] border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black uppercase flex items-center gap-2"><HardHat /> Habilitations</h2>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Ajouter (ex: H0B0)..." 
                  value={newHabil}
                  onKeyDown={(e) => e.key === 'Enter' && addItem('habil')}
                  onChange={(e) => setNewHabil(e.target.value)}
                  className="bg-gray-50 border-none rounded-xl px-4 py-2 text-xs font-bold w-48"
                />
                <button onClick={() => addItem('habil')} className="bg-gray-100 p-2 rounded-xl"><Plus size={18}/></button>
              </div>
            </div>

            <div className="space-y-3">
              {emp.habilitations_json.map((h: any, idx: number) => (
                <div key={idx} className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl group">
                  <input 
                    type="checkbox" 
                    checked={h.ok} 
                    onChange={(e) => {
                      const copy = [...emp.habilitations_json];
                      copy[idx].ok = e.target.checked;
                      setEmp({...emp, habilitations_json: copy});
                    }}
                    className="w-5 h-5 rounded-md border-gray-300 text-green-600 focus:ring-green-500" 
                  />
                  <span className="flex-1 font-bold text-sm uppercase">{h.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase">Validité:</span>
                    <input 
                      type="date" 
                      value={h.exp} 
                      onChange={(e) => {
                        const copy = [...emp.habilitations_json];
                        copy[idx].exp = e.target.value;
                        setEmp({...emp, habilitations_json: copy});
                      }}
                      className="bg-transparent border-none text-xs font-bold p-0 w-28" 
                    />
                  </div>
                  <button onClick={() => {
                    const copy = emp.habilitations_json.filter((_:any, i:number) => i !== idx);
                    setEmp({...emp, habilitations_json: copy});
                  }} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION FORMATIONS */}
          <div className="bg-white p-8 rounded-[35px] border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black uppercase flex items-center gap-2"><GraduationCap /> Formations & Recyclages</h2>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Formation à prévoir..." 
                  value={newForma}
                  onKeyDown={(e) => e.key === 'Enter' && addItem('forma')}
                  onChange={(e) => setNewForma(e.target.value)}
                  className="bg-gray-50 border-none rounded-xl px-4 py-2 text-xs font-bold w-48"
                />
                <button onClick={() => addItem('forma')} className="bg-gray-100 p-2 rounded-xl"><Plus size={18}/></button>
              </div>
            </div>

            <div className="space-y-3">
              {emp.formations_json.map((f: any, idx: number) => (
                <div key={idx} className="grid grid-cols-12 gap-4 items-center bg-gray-50 p-4 rounded-2xl">
                  <div className="col-span-4 font-bold text-sm uppercase">{f.label}</div>
                  <div className="col-span-3 flex flex-col">
                    <span className="text-[9px] font-black text-gray-400 uppercase">Prévue le</span>
                    <input type="date" value={f.prevu} onChange={(e) => {
                      const copy = [...emp.formations_json];
                      copy[idx].prevu = e.target.value;
                      setEmp({...emp, formations_json: copy});
                    }} className="bg-transparent border-none text-xs font-bold p-0" />
                  </div>
                  <div className="col-span-3 flex flex-col">
                    <span className="text-[9px] font-black text-gray-400 uppercase">Fin Validité</span>
                    <input type="date" value={f.exp} onChange={(e) => {
                      const copy = [...emp.formations_json];
                      copy[idx].exp = e.target.value;
                      setEmp({...emp, formations_json: copy});
                    }} className="bg-transparent border-none text-xs font-bold p-0" />
                  </div>
                  <div className="col-span-2 flex justify-end gap-2">
                    <button className="text-blue-500 hover:bg-blue-100 p-2 rounded-lg"><FileUp size={16}/></button>
                    <button onClick={() => {
                      const copy = emp.formations_json.filter((_:any, i:number) => i !== idx);
                      setEmp({...emp, formations_json: copy});
                    }} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
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
