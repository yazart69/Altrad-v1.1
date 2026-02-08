import React, { useState, useEffect } from 'react';
import { Package, Minus, Plus, ShoppingCart, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Inventory({ project, user }: { project: any, user: any }) {
  const [items, setItems] = useState<any[]>([]);
  const [newBesoin, setNewBesoin] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
  let isMounted = true;
  const fetchInventory = async () => {
    // Si l'ID est 'test', on s'assure que Supabase a bien des données pour 'test'
    const { data, error } = await supabase
      .from('stock_chantier')
      .select('*')
      .eq('chantier_id', project.id);
    
    if (isMounted && data) {
      setItems(data);
    }
    if (error) console.error("Erreur de stock:", error.message);
  };

  fetchInventory();
  return () => { isMounted = false; }; // Nettoyage pour éviter les saccades
}, [project.id]);

  const updateQty = async (id: string, delta: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const newQty = Math.max(0, item.quantite_actuelle + delta);
    setItems(items.map(i => i.id === id ? { ...i, quantite_actuelle: newQty } : i));
    await supabase.from('stock_chantier').update({ quantite_actuelle: newQty }).eq('id', id);
  };

  const handleCommander = async () => {
    if (!newBesoin) return;
    setLoading(true);
    await supabase.from('besoins_urgents').insert([{
      chantier_id: project.id,
      article: newBesoin,
      auteur: user.nom,
      statut: 'A commander'
    }]);
    setNewBesoin("");
    setLoading(false);
    alert("Demande envoyée au dépôt !");
  };

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
          <Package className="text-blue-600" /> STOCK SUR SITE
        </h3>
        <div className="grid gap-4">
          {items.map(item => (
            <div key={item.id} className={`p-5 rounded-2xl flex items-center justify-between border-2 ${item.quantite_actuelle <= item.seuil_alerte ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-transparent'}`}>
              <div>
                <p className="font-black text-slate-800 uppercase">{item.label}</p>
                <p className="text-xs font-bold text-slate-400">{item.quantite_actuelle} {item.unite} restants</p>
              </div>
              <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm">
                <button onClick={() => updateQty(item.id, -1)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Minus size={20}/></button>
                <span className="font-black text-xl w-8 text-center">{item.quantite_actuelle}</span>
                <button onClick={() => updateQty(item.id, 1)} className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors"><Plus size={20}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-orange-500 p-8 rounded-[2.5rem] text-white shadow-xl shadow-orange-200">
        <h3 className="text-xl font-black mb-4 flex items-center gap-2">
          <ShoppingCart /> BESOIN URGENT / COMMANDE
        </h3>
        <div className="flex gap-3">
          <input 
            type="text" 
            value={newBesoin}
            onChange={(e) => setNewBesoin(e.target.value)}
            placeholder="Ex: 10 sacs de colle, 2 rouleaux..." 
            className="flex-1 px-6 py-4 rounded-2xl bg-white/20 border-none placeholder:text-white/60 font-bold outline-none focus:ring-2 focus:ring-white"
          />
          <button 
            onClick={handleCommander}
            disabled={loading}
            className="bg-white text-orange-600 px-8 rounded-2xl font-black hover:bg-slate-100 transition-all"
          >
            {loading ? <Loader2 className="animate-spin"/> : "COMMANDER"}
          </button>
        </div>
      </div>
    </div>
  );
}