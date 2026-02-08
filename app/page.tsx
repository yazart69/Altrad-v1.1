"use client";

import Sidebar from '@/components/Sidebar';
import TasksTile from '@/components/TasksTile';
import WorkloadTile from '@/components/WorkloadTile';
import TeamTile from '@/components/TeamTile';
import CalendarTile from '@/components/CalendarTile';
import MiddleTiles from '@/components/MiddleTiles';
import LeavesTile from '@/components/LeavesTile';
import BudgetHeuresTile from '@/components/BudgetHeuresTile';
import { theme } from '@/lib/theme.config';

export default function Home() {
  return (
    <div className="flex h-screen w-full bg-[#f0f3f4] overflow-hidden font-['Fredoka']">
      
      {/* SIDEBAR */}
      <Sidebar />
      
      {/* DASHBOARD CONTENT */}
      {/* Padding global uniformisé à 20px (large) */}
      <div className="flex-1 h-full flex flex-col p-[20px] pr-8 overflow-hidden">
        
        <main className="flex flex-col h-full w-full">
          
          {/* --- LIGNE 1 : HAUT (Tasks, Workload, Team) --- */}
          <div className="flex-[42] w-full flex min-h-0">
            <div className="flex-1 h-full overflow-hidden"><TasksTile /></div>
            
            {/* Séparateur Vertical Standardisé */}
            <div className="w-[8px] h-full bg-white mx-2 shrink-0 rounded-full"></div>
            
            <div className="flex-1 h-full overflow-hidden"><WorkloadTile /></div>
            
            <div className="w-[8px] h-full bg-white mx-2 shrink-0 rounded-full"></div>
            
            <div className="flex-1 h-full overflow-hidden"><TeamTile /></div>
          </div>

          {/* Séparateur Horizontal Standardisé (12px height) */}
          <div className="h-[12px] w-full bg-white my-2 shrink-0 rounded-full shadow-sm"></div>

          {/* --- LIGNE 2 : MILIEU (MiddleTiles) --- */}
          <div className="flex-[20] w-full grid grid-cols-12 gap-[20px] min-h-0">
             <MiddleTiles />
          </div>

          {/* Séparateur Horizontal */}
          <div className="h-[12px] w-full bg-white my-2 shrink-0 rounded-full shadow-sm"></div>

          {/* --- LIGNE 3 : BAS (Budget, Calendar, Leaves) --- */}
          <div className="flex-[38] w-full flex min-h-0">
            <div className="w-[25%] h-full overflow-hidden"><BudgetHeuresTile /></div>
            
            <div className="w-[8px] h-full bg-white mx-2 shrink-0 rounded-full"></div>
            
            <div className="flex-1 h-full overflow-hidden"><CalendarTile /></div>
            
            <div className="w-[8px] h-full bg-white mx-2 shrink-0 rounded-full"></div>
            
            <div className="w-[25%] h-full overflow-hidden"><LeavesTile /></div>
          </div>

        </main>
      </div>
    </div>
  );
}