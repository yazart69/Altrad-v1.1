import TeamTile from "@/components/TeamTile";
import BudgetHeuresTile from "@/components/BudgetHeuresTile";
import LeavesTile from "@/components/LeavesTile";
import TasksTile from "@/components/TasksTile";
import WorkloadTile from "@/components/WorkloadTile";
import MiddleTiles from "@/components/MiddleTiles";

export default function Home() {
  return (
    <div className="h-full w-full">
      
      {/* Grille principale du Dashboard */}
      <div className="grid grid-cols-12 grid-rows-12 gap-6 h-full p-2">
        
        {/* LIGNE 1 : KPI & ALERTES */}
        <div className="col-span-12 lg:col-span-3 row-span-4">
          <TeamTile />
        </div>
        <div className="col-span-12 lg:col-span-6 row-span-2 grid grid-cols-12 gap-6">
           <MiddleTiles />
        </div>
        <div className="col-span-12 lg:col-span-3 row-span-4">
          <LeavesTile />
        </div>

        {/* LIGNE 2 : SUIVI CHANTIERS */}
        <div className="col-span-12 lg:col-span-6 row-span-5">
          <BudgetHeuresTile />
        </div>

        {/* LIGNE 3 : TÂCHES & CHARGE */}
        <div className="col-span-12 lg:col-span-3 row-span-5">
           <TasksTile />
        </div>
        <div className="col-span-12 lg:col-span-3 row-span-5">
           <WorkloadTile />
        </div>

      </div>
    </div>
  );
}
