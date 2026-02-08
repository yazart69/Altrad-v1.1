"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function TeamTile() {
  const [stats, setStats] = useState([
    { name: 'Ouvriers', value: 0, color: '#ffffff' },
    { name: 'Chefs', value: 0, color: '#00cec9' },
    { name: 'Interim', value: 0, color: '#ffeaa7' },
  ]);

  useEffect(() => {
    async function fetchStats() {
      const { data } = await supabase.from('users').select('role');
      if (data) {
        const ouvriers = data.filter(u => u.role === 'ouvrier').length;
        const chefs = data.filter(u => u.role.includes('chef')).length;
        const interim = data.filter(u => u.role === 'interim').length;
        
        setStats([
          { name: 'Ouvriers', value: ouvriers, color: '#ffffff' },
          { name: 'Chefs', value: chefs, color: '#2ecc71' },
          { name: 'Interim', value: interim, color: '#f1c40f' },
        ]);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="h-full w-full bg-[#00b894] rounded-[25px] flex flex-col shadow-sm overflow-hidden p-6 font-['Fredoka'] text-white">
      <h2 className="text-[28px] font-black uppercase mb-2 tracking-tight">Équipes</h2>
      <div className="flex-1 flex items-center justify-between">
        <div className="w-[140px] h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={stats} innerRadius={40} outerRadius={65} paddingAngle={5} dataKey="value">
                {stats.map((entry, index) => <Cell key={index} fill={entry.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 ml-4 space-y-2 text-[16px] font-bold">
          {stats.map((s, i) => (
            <div key={i} className="flex justify-between items-center bg-black/10 p-2 rounded-lg">
              <span>{s.name}</span>
              <span className="bg-white text-[#00b894] px-2 rounded-md">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
