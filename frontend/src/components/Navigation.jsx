import React from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, Compass, PlayCircle, FileText, Cpu, Anchor } from 'lucide-react';

export default function Navigation() {
  const navItems = [
    { to: '/', label: 'Live Mission Control', icon: Activity },
    { to: '/missions', label: 'GIS & Fleet Logs', icon: Compass },
    { to: '/simulator', label: 'Sonar Sweep Simulator', icon: PlayCircle },
    { to: '/reports', label: 'Hazard & Audit Reports', icon: FileText },
    { to: '/edge-monitor', label: 'Edge Drone Telemetry', icon: Cpu },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 shrink-0">
      <div className="flex flex-col gap-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2">
          <div className="p-2 bg-cyan-950 border border-cyan-700 rounded-lg text-cyan-400">
            <Anchor className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide">SagarDrishti</h1>
            <p className="text-[10px] text-cyan-400 font-mono">NAVAL TECH</p>
          </div>
        </div>

        {/* Links */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition ${isActive
                  ? 'bg-cyan-600/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* System Status Pill */}
      <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-xs flex flex-col gap-1.5 font-mono">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Model Runtime:</span>
          <span className="text-emerald-400">ONNX-INT8</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Acoustic Feed:</span>
          <span className="text-cyan-400">Active (50 kHz)</span>
        </div>
      </div>
    </aside>
  );
}