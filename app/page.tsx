import TeamTile from "@/components/TeamTile"; // On va l'utiliser pour une des tuiles vides
import BudgetHeuresTile from "@/components/BudgetHeuresTile";
import LeavesTile from "@/components/LeavesTile";
import TasksTile from "@/components/TasksTile";
import WorkloadTile from "@/components/WorkloadTile";
import MiddleTiles from "@/components/MiddleTiles";

export default function Home() {
  return (
    <div className="h-full w-full p-2 font-['Fredoka']">
      
      {/* GRILLE PRINCIPALE (12 Colonnes) */}
      <div className="grid grid-cols-12 gap-6 h-full">

        {/* --- LIGNE 1 : ALERTES ET ACTIONS (HAUT) --- */}
        {/* Congés / Absences (Gauche) */}
        <div className="col-span-3 h-[300px]">
          <LeavesTile />
        </div>

        {/* Matériels / Locations / Alertes (Milieu) */}
        <div className="col-span-6 flex flex-col gap-4 h-[300px]">
          <MiddleTiles /> {/* Ce composant contient déjà les 3 sous-tuiles horizontalement */}
        </div>

        {/* Actions Prioritaires (Droite) */}
        <div className="col-span-3 h-[300px]">
          <TasksTile />
        </div>


        {/* --- LIGNE 2 : CŒUR DU CHANTIER (MILIEU) --- */}
        {/* Chantiers avec barre d'avancement (Large) */}
        <div className="col-span-9 h-[350px]">
          <BudgetHeuresTile />
        </div>

        {/* Planning (Petit aperçu à droite) */}
        <div className="col-span-3 bg-white rounded-[25px] p-6 shadow-sm flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100">
           <p className="font-bold">Planning Semaine</p>
           <p className="text-xs uppercase font-black">En attente de données</p>
        </div>


        {/* --- LIGNE 3 : PERFORMANCE (BAS) --- */}
        {/* Suivi Objectifs / Heures */}
        <div className="col-span-4 h-[350px]">
          <WorkloadTile /> {/* On va le renommer en "Suivi Objectifs" */}
        </div>

        {/* Tuile Libre 1 (Idée : Staffing / Équipe) */}
        <div className="col-span-4 h-[350px]">
          <TeamTile />
        </div>

        {/* Tuile Libre 2 (Idée : News / Sécurité) */}
        <div className="col-span-4 bg-[#2d3436] rounded-[25px] p-6 shadow-sm text-white">
           <h2 className="text-xl font-black uppercase mb-4">Sécurité / Flash</h2>
           <div className="bg-orange-500/20 p-4 rounded-xl border border-orange-500/30">
              <p className="text-orange-400 font-bold">⚠️ Rappel : Port du casque obligatoire sur le chantier de Cannes.</p>
           </div>
        </div>

      </div>
    </div>
  );
}
