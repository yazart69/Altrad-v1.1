"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // Assure-toi que le chemin est bon
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function NouveauChantier() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // État initial vide
  const [formData, setFormData] = useState({
    nom: '',
    adresse: '',
    statut: 'en_cours',
    heures_budget: 0,
    notes: ''
  });

  const handleSave = async () => {
    // Petite validation
    if (!formData.nom) return alert("Le nom du chantier est obligatoire !");

    setSaving(true);
    
    // Insertion dans Supabase
    const { error } = await supabase
      .from('chantiers')
      .insert([
        {
          nom: formData.nom,
          adresse: formData.adresse,
          statut: formData.statut,
          heures_budget: formData.heures_budget,
          notes: formData.notes,
          // On initialise les tâches et les heures consommées à vide/zéro
          tasks: [], 
          heures_consommees: 0
        }
      ]);

    setSaving(false);

    if (error) {
      alert("Erreur lors de la création : " + error.message);
    } else {
      // Retour au dashboard après succès
      router.push('/'); 
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f3f4] p-8 font-['Fredoka']">
      <div className="max-w-4xl mx-auto">
        
        {/* En-tête */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center text-gray-600 hover:text-black transition-colors font-bold">
            <ArrowLeft className="mr-2" /> Annuler
          </Link>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-[#00b894] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#00a383] transition-colors flex items-center gap-2 shadow-lg"
          >
            <Save size={18} /> {saving ? 'Création...' : 'Créer le Chantier'}
          </button>
        </div>

        {/* Formulaire de création */}
        <div className="bg-white rounded-[25px] p-8 shadow-sm">
          <h1 className="text-3xl font-black text-gray-800 mb-6 uppercase">Nouveau Chantier</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Nom */}
            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-500 mb-2 uppercase">Nom du Chantier *</label>
              <input 
                type="text" 
                placeholder="Ex: Parking Gare Lyon Part-Dieu"
                value={formData.nom}
                onChange={(e) => setFormData({...formData, nom: e.target.value})}
                className="w-full bg-[#f0f3f4] border-none rounded-xl p-4 text-xl font-bold text-gray-800 focus:ring-2 focus:ring-[#00b894] outline-none"
              />
            </div>

            {/* Adresse */}
            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-500 mb-2 uppercase">Adresse</label>
              <input 
                type="text" 
                placeholder="Ex: 12 Rue de la République..."
                value={formData.adresse}
                onChange={(e) => setFormData({...formData, adresse: e.target.value})}
                className="w-full bg-[#f0f3f4] border-none rounded-xl p-4 font-semibold text-gray-800 focus:ring-2 focus:ring-[#00b894] outline-none"
              />
            </div>

            {/* Statut */}
            <div>
              <label className="block text-sm font-bold text-gray-500 mb-2 uppercase">Statut Initial</label>
              <select 
                value={formData.statut}
                onChange={(e) => setFormData({...formData, statut: e.target.value})}
                className="w-full bg-[#f0f3f4] border-none rounded-xl p-4 font-bold text-gray-800 focus:ring-2 focus:ring-[#00b894] outline-none appearance-none"
              >
                <option value="planifie">🔵 Planifié</option>
                <option value="en_cours">🟢 En Cours</option>
              </select>
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm font-bold text-gray-500 mb-2 uppercase">Budget Heures (Estime)</label>
              <input 
                type="number" 
                placeholder="0"
                value={formData.heures_budget}
                onChange={(e) => setFormData({...formData, heures_budget: parseInt(e.target.value) || 0})}
                className="w-full bg-[#f0f3f4] border-none rounded-xl p-4 font-bold text-gray-800 focus:ring-2 focus:ring-[#00b894] outline-none"
              />
            </div>

            {/* Notes */}
            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-500 mb-2 uppercase">Notes</label>
              <textarea 
                rows={3}
                placeholder="Infos d'accès, codes, contacts..."
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full bg-[#f0f3f4] border-none rounded-xl p-4 font-medium text-gray-800 focus:ring-2 focus:ring-[#00b894] outline-none resize-none"
              />
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
