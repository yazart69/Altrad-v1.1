import TeamTile from "@/components/TeamTile";
import BudgetHeuresTile from "@/components/BudgetHeuresTile";
import LeavesTile from "@/components/LeavesTile";
import TasksTile from "@/components/TasksTile";
import WorkloadTile from "@/components/WorkloadTile";
import MiddleTiles from "@/components/MiddleTiles";

export default function Home() {
  return (
    <div className="h-full w-full p-2">
      
      {/* GRILLE PRINCIPALE (12 Colonnes) */}
      <div className="grid grid-cols-12 gap-6 h-full">

        {/* --- COLONNE 1 : ÉQUIPES (Gauche - 3 cols) --- */}
        <div className="col-span-12 xl:col-span-3 flex flex-col gap-6 h-full">
          {/* Le Donut en haut */}
          <div className="h-[35%] min-h-[200px]">
            <TeamTile />
          </div>
          {/* La liste des absents en dessous */}
          <div className="h-[65%] min-h-[300px]">
            <LeavesTile />
          </div>
        </div>


        {/* --- COLONNE 2 : CENTRAL (Milieu - 6 cols) --- */}
        <div className="col-span-12 xl:col-span-6 flex flex-col gap-6 h-full">
            
            {/* Zone Alertes (Météo/Stock/Notifs) */}
            {/* On crée une sous-grille de 12 pour que MiddleTiles (qui utilise col-span-4) s'alignent parfaitement sur une ligne */}
            <div className="grid grid-cols-12 gap-4 min-h-[180px]">
                <MiddleTiles />
            </div>

            {/* La Grosse Liste des Chantiers */}
            <div className="flex-1 min-h-[400px]">
                <BudgetHeuresTile />
            </div>
        </div>


        {/* --- COLONNE 3 : ACTIONS & STATS (Droite - 3 cols) --- */}
        <div className="col-span-12 xl:col-span-3 flex flex-col gap-6 h-full">
          {/* Tâches prioritaires (Important donc en haut) */}
          <div className="h-[60%] min-h-[300px]">
             <TasksTile />
          </div>
          {/* Charge de travail en bas */}
          <div className="h-[40%] min-h-[200px]">
             <WorkloadTile />
          </div>
        </div>

      </div>
    </div>
  );
}
