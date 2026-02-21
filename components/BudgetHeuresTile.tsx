"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Plus, 
  MapPin, 
  ArrowUpRight, 
  Activity, 
  Loader2, 
  Clock, 
  CheckSquare, 
  AlertTriangle 
} from 'lucide-react';

export default function BudgetHeuresTile() {
  const router = useRouter();
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // RÉCUPÉRATION DES DONNÉES AVEC SYNCHRO TÂCHES
  const fetchChantiers = async () => {
    // On récupère les chantiers et on compte les tâches liées pour la synchro
    const { data, error } = await supabase
      .from('chantiers')
      .select(`
        *,
        chantier_tasks (
          id,
          done,
          objectif_heures
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Erreur fetch chantiers:", error);
    }

    if (data) {
      setChantierData(data);
    }
    setLoading(false);
  };

  const setChantierData = (data: any[]) => {
    const enriched = data.map(c => {
      const tasks = c.chantier_tasks || [];
      const totalTasks = tasks.length;
      const doneTasks = tasks.filter((t: any) => t.done).length;
      // On détecte s'il y a de l'activité (pour le tri)
      const hasActivity = totalTasks > 0 || c.heures_consommees > 0;
      return { ...c, totalTasks, doneTasks, hasActivity };
    });

    // Tri : Chantiers avec activité/personnel en premier
    enriched.sort((a, b) => (b.hasActivity ? 1 : 0) - (a.hasActivity ? 1 : 0));
    setChantiers(enriched);
  };

  useEffect(() => {
    fetchChantiers();

    // RAFFRAICHISSEMENT AUTOMATIQUE (Synchro immédiate avec Pointage et Tâches)
    const interval = setInterval(fetchChantiers, 5000);
    return () => clearInterval(interval);
  }, []);

  // LOGIQUE DE CRÉATION RAPIDE
  const handleCreate = async () => {
    setCreating(true);
    const { data, error } = await supabase
      .from('chantiers')
      .insert([{ 
        nom: 'Nouveau Chantier', 
        statut: 'en_cours',
        type: 'Industriel',
        client: 'Client à définir',
        heures_budget: 100,
        heures_consommees: 0
      }])
      .select()
      .single();

    if (data) {
      router.push(`/chantier/${data.id}`);
    } else {
      alert("Erreur création : " + error?.message);
      setCreating(false);
    }
  };

  return (
    <div className="h-full w-full bg-[#00b894] rounded-[25px] flex flex-col shadow-lg overflow-hidden p-6 font-['Fredoka'] text-white relative group border border-white/5 hover:scale-[1.01] transition-all duration-300">
      
      {/* HEADER DE LA TUILE */}
      <div className="flex justify-between items-center mb-6 z-10">
        <Link href="/chantier" className="group/title flex items-center gap-2">
          <div>
            <h2 className="text-[24px] font-black uppercase tracking-tight leading-none text-white">
              Chantiers <span className="text-emerald-900 opacity-60">en cours</span>
            </h2>
            <p className="text-[10px] text-emerald-50 font-bold mt-1 uppercase tracking-widest opacity-80 flex items-center gap-1">
              <Activity size={10} /> Synchro Pointage & Tâches
            </p>
          </div>
          <div className="opacity-0 group-hover/title:opacity-100 transition-opacity bg-white/20 p-1.5 rounded-full text-white">
             <ArrowUpRight size={16} />
          </div>
        </Link>

        <button 
          onClick={handleCreate}
          disabled={creating}
          className="bg-white text-[#00b894] hover:bg-emerald-50 p-2.5 rounded-xl transition-all shadow-lg cursor-pointer hover:scale-110 active:scale-95 disabled:opacity-50"
        >
          {creating ? <Loader2 size={24} className="animate-spin" /> : <Plus size={24} />}
        </button>
      </div>

      {/* LISTE DES CHANTIERS ACTIFS */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 z-10">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-24 bg-white/10 animate-pulse rounded-2xl"></div>
            ))}
          </div>
        ) : chantiers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-60 italic text-sm">
             Aucun chantier en cours.
          </div>
        ) : (
          chantiers.map((chantier) => {
            // CALCUL DE L'AVANCEMENT (Pointage Réel)
            const pointage = chantier.heures_consommees || 0;
            const budget = chantier.heures_budget || 1;
            const percentage = Math.round((pointage / budget) * 100);

            // GESTION DES ALERTES VISUELLES
            let barColor = "bg-white"; 
            let alertIcon = null;
            if (percentage >= 100) {
              barColor = "bg-red-400";
              alertIcon = <AlertTriangle size={12} className="text-red-200 animate-pulse" />;
            } else if (percentage > 85) {
              barColor = "bg-orange-300";
            }

            return (
              <Link 
                href={`/chantier/${chantier.id}`} 
                key={chantier.id} 
                className="block p-4 rounded-[22px] bg-white/10 hover:bg-white/20 transition-all border border-white/5 group/item relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-black text-white text-[15px] uppercase leading-tight truncate">
                      {chantier.nom}
                    </h3>
                    <div className="flex items-center gap-3 mt-1.5">
                      {/* Couleur changée ici en text-emerald-900 */}
                      <div className="flex items-center gap-1 text-emerald-900 opacity-80">
                        <MapPin size={10} />
                        <span className="text-[11px] font-bold truncate max-w-[120px]">{chantier.adresse || "Site web"}</span>
                      </div>
                      {/* Taille augmentée et couleur changée ici en text-emerald-900 */}
                      <div className="flex items-center gap-1 text-emerald-900">
                        <CheckSquare size={12} />
                        <span className="text-[14px] font-black">{chantier.doneTasks}/{chantier.totalTasks} <span className="opacity-80">tâches</span></span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {alertIcon}
                      {/* Taille augmentée et couleur changée ici */}
                      <span className="text-[20px] font-black text-emerald-900">{percentage}%</span>
                    </div>
                    {/* Taille augmentée et couleur changée ici */}
                    <p className="text-[12px] font-black text-emerald-900 uppercase mt-0.5 opacity-90">
                      {pointage}H sur {budget}H
                    </p>
                  </div>
                </div>

                {/* BARRE DE PROGRESSION POINTAGE */}
                <div className="w-full bg-black/10 rounded-full h-3 overflow-hidden border border-white/5">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`} 
                    style={{ width: `${Math.min(100, percentage)}%` }}
                  ></div>
                </div>
                
                {/* INDICATEUR D'AVANCEMENT TÂCHES (Agrandis & en Vert foncé) */}
                <div className="mt-2 flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-emerald-900 opacity-90">
                  <span>Avancement Tâches</span>
                  <span>{chantier.totalTasks > 0 ? Math.round((chantier.doneTasks/chantier.totalTasks)*100) : 0}%</span>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* DÉCORATION D'ARRIÈRE-PLAN */}
      <Activity size={180} className="absolute -right-8 -bottom-10 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none text-emerald-900" />
    </div>
  );
}
