import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import MissionControl from './pages/MissionControl';
import MissionsGIS from './pages/MissionsGIS';
import SonarSimulator from './pages/SonarSimulator';
import HazardReports from './pages/HazardReports';
import EdgeTelemetry from './pages/EdgeTelemetry';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
        <Navigation />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<MissionControl />} />
            <Route path="/missions" element={<MissionsGIS />} />
            <Route path="/simulator" element={<SonarSimulator />} />
            <Route path="/reports" element={<HazardReports />} />
            <Route path="/edge-monitor" element={<EdgeTelemetry />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}