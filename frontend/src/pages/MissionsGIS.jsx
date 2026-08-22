import React from 'react';
import { Compass, MapPin } from 'lucide-react';

export default function MissionsGIS() {
  const missions = [
    { id: 'MSN-2026-08', area: 'Harbor Channel North', date: 'Aug 2026', hazards: 12, nets: 7, status: 'Completed' },
    { id: 'MSN-2026-07', area: 'Outer Anchorage Reef', date: 'Jul 2026', hazards: 19, nets: 14, status: 'Completed' },
    { id: 'MSN-2026-06', area: 'Deepwater Approach', date: 'Jun 2026', hazards: 4, nets: 1, status: 'Archived' },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <header>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Compass className="w-5 h-5 text-cyan-400" /> Historical Survey Logs & Fleet Fleet Map
        </h1>
        <p className="text-xs text-slate-400">Historical hydroacoustic survey tracks and debris density mapping</p>
      </header>

      <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300 font-mono">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-3">Mission ID</th>
              <th className="p-3">Survey Area</th>
              <th className="p-3">Date</th>
              <th className="p-3">Total Hazards</th>
              <th className="p-3">Ghost Nets</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {missions.map((m) => (
              <tr key={m.id} className="hover:bg-slate-800/40 transition">
                <td className="p-3 font-semibold text-cyan-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" /> {m.id}
                </td>
                <td className="p-3 font-sans text-slate-200">{m.area}</td>
                <td className="p-3 text-slate-400">{m.date}</td>
                <td className="p-3">{m.hazards}</td>
                <td className="p-3 text-red-400 font-semibold">{m.nets}</td>
                <td className="p-3">
                  <span className="bg-emerald-950 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded text-[10px]">
                    {m.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}