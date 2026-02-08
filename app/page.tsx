"use client";

import Sidebar from '@/components/Sidebar';
import TasksTile from '@/components/TasksTile';
import WorkloadTile from '@/components/WorkloadTile';
import TeamTile from '@/components/TeamTile';
import CalendarTile from '@/components/CalendarTile';
import MiddleTiles from '@/components/MiddleTiles';
import LeavesTile from '@/components/LeavesTile';
import BudgetHeuresTile from '@/components/BudgetHeuresTile';

export default function Home() {
  return (
    <div className="flex h-screen w-full bg-[#f0f3f4] overflow-hidden font-['Fredoka']">
      <Sidebar />
      <div className="flex-1 h-full flex flex-col p-[20px] pb-6 pr-8 overflow-hidden">
        <main className="flex flex-col h-full w-full">
          <div className="flex-[35] w-full flex min-h-0 gap-2">
            <div className="flex-1 h-full overflow-hidden"><TasksTile /></div>
            <div className="flex-1 h-full overflow-hidden"><WorkloadTile /></div>
            <div className="flex-1 h-full overflow-hidden"><TeamTile /></div>
          </div>
          <div className="h-[12px] w-full bg-transparent my-1 shrink-0"></div>
          <div className="flex-[15] w-full grid grid-cols-12 gap-4 min-h-0">
             <MiddleTiles />
          </div>
          <div className="h-[12px] w-full bg-transparent my-1 shrink-0"></div>
          <div className="flex-[50] w-full flex min-h-0 gap-2">
            <div className="w-[25%] h-full overflow-hidden"><BudgetHeuresTile /></div>
            <div className="flex-1 h-full overflow-hidden"><CalendarTile /></div>
            <div className="w-[25%] h-full overflow-hidden"><LeavesTile /></div>
          </div>
        </main>
      </div>
    </div>
  );
}