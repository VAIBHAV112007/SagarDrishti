import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import MissionControl from './pages/MissionControl';
import MissionsGIS from './pages/MissionsGIS';
import SonarSimulator from './pages/SonarSimulator';
import HazardReports from './pages/HazardReports';
import EdgeTelemetry from './pages/EdgeTelemetry';
import { Anchor } from 'lucide-react';
import { MissionProvider } from './context/MissionContext'; // <-- NEW IMPORT

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <div className="flex flex-col h-screen w-screen items-center justify-center bg-slate-950 font-sans">
        <div className="flex flex-col items-center gap-6 animate-zoom-in">
          <div className="p-6 bg-cyan-950 border-2 border-cyan-500/30 rounded-2xl text-cyan-400 shadow-[0_0_60px_rgba(34,211,238,0.2)]">
            <Anchor className="w-20 h-20" />
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-black text-white tracking-widest mb-3">
              Sagar<span className="text-cyan-400">Drishti</span>
            </h1>
            <p className="text-cyan-500 font-mono text-xs tracking-[0.2em] uppercase">
              Initializing Acoustic Systems...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MissionProvider> {/* <-- WRAPPED IN GLOBAL CONTEXT */}
      <BrowserRouter>
        <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
          <Navigation />
          <main className="flex-1 overflow-y-auto p-6">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/mission-control" element={<MissionControl />} />
              <Route path="/missions" element={<MissionsGIS />} />
              <Route path="/simulator" element={<SonarSimulator />} />
              <Route path="/reports" element={<HazardReports />} />
              <Route path="/edge-monitor" element={<EdgeTelemetry />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </MissionProvider>
  );
}