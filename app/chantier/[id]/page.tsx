"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function ChantierDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // État local pour le formulaire
  const [chantier, setChantier] = useState({
    nom: '',
    adresse: '',
    statut: 'en_cours',
    heures_budget: 0,
    notes: ''
  });

  // 1. Charger les données du chantier
  useEffect(() => {
    async function fetchChantier() {
      if (!id) return;
      const { data, error } = await supabase
        .from('chantiers')
        .select('*')
        .eq('id', id)
        .single();

      if (data) {
        setChantier(data);
      }
      setLoading(false);
    }
    fetchChantier();
  }, [id]);

  // 2. Fonction pour Sauvegarder les modifications
  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('chantiers')
      .update({
        nom: chantier.nom,
        adresse: chantier.adresse,
        statut: chantier.statut,
        heures_budget: chantier.heures_budget,
        notes: chantier.notes
      })
      .eq('id', id);

    setSaving(false);
    if (!error) alert('Modifications enregistrées !');
  };

  // 3. Fonction pour Supprimer le chantier
  const handleDelete = async () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce chantier définitivement ?')) {
      await supabase.from('chantiers').delete().eq('id', id);
      router.push('/'); // Retour au dashboard
    }
  };

  if (loading) return <div className="h-screen w-full flex items-center justify-center text-white font-['Fredoka']">Chargement...</div>;

  return (
    <div className="min-h-screen bg-[#f0f3f4] p-8 font-['Fredoka']">
      <div className="max-w-4xl mx-auto">
        
        {/* En-tête avec bouton retour */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center text-gray-600 hover:text-black transition-colors font-bold">
            <ArrowLeft className="mr-2" /> Retour au Dashboard
          </Link>
          <div className="flex gap-3">
             <button 
              onClick={handleDelete}
              className="bg-red-100 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-200 transition-colors flex items-center gap-2"
            >
              <Trash2 size={18} /> Supprimer
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="bg-[#00b894] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#00a383] transition-colors flex items-center gap-2 shadow-lg"
            >
              <Save size={18} /> {saving ? 'Enregistrement...' : 'Sauvegarder'}
            </button>
          </div>
        </div>

        {/* Carte principale d'édition */}
        <div className="bg-white rounded-[25px] p-8 shadow-sm">
          <h1 className="text-3xl font-black text-gray-800 mb-6 uppercase">Modifier le Chantier</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Nom du chantier */}
            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-500 mb-2 uppercase">Nom du Chantier</label>
              <input 
                type="text" 
                value={chantier.nom}
                onChange={(e) => setChantier({...chantier, nom: e.target.value})}
                className="w-full bg-[#f0f3f4] border-none rounded-xl p-4 text-xl font-bold text-gray-800 focus:ring-2 focus:ring-[#00b894] outline-none"
              />
            </div>

            {/* Adresse */}
            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-500 mb-2 uppercase">Adresse Complète</label>
              <input 
                type="text" 
                value={chantier.adresse || ''}
                onChange={(e) => setChantier({...chantier, adresse: e.target.value})}
                className="w-full bg-[#f0f3f4] border-none rounded-xl p-4 font-semibold text-gray-800 focus:ring-2 focus:ring-[#00b894] outline-none"
              />
            </div>

            {/* Statut */}
            <div>
              <label className="block text-sm font-bold text-gray-500 mb-2 uppercase">Statut</label>
              <select 
                value={chantier.statut}
                onChange={(e) => setChantier({...chantier, statut: e.target.value})}
                className="w-full bg-[#f0f3f4] border-none rounded-xl p-4 font-bold text-gray-800 focus:ring-2 focus:ring-[#00b894] outline-none appearance-none"
              >
                <option value="en_cours">🟢 En Cours</option>
                <option value="planifie">🔵 Planifié</option>
                <option value="termine">🔴 Terminé</option>
              </select>
            </div>

            {/* Budget Heures */}
            <div>
              <label className="block text-sm font-bold text-gray-500 mb-2 uppercase">Budget Heures</label>
              <input 
                type="number" 
                value={chantier.heures_budget || 0}
                onChange={(e) => setChantier({...chantier, heures_budget: parseInt(e.target.value)})}
                className="w-full bg-[#f0f3f4] border-none rounded-xl p-4 font-bold text-gray-800 focus:ring-2 focus:ring-[#00b894] outline-none"
              />
            </div>

            {/* Notes */}
            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-500 mb-2 uppercase">Notes & Commentaires</label>
              <textarea 
                rows={4}
                value={chantier.notes || ''}
                onChange={(e) => setChantier({...chantier, notes: e.target.value})}
                className="w-full bg-[#f0f3f4] border-none rounded-xl p-4 font-medium text-gray-800 focus:ring-2 focus:ring-[#00b894] outline-none resize-none"
              />
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
