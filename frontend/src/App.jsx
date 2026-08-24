import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import MissionsGIS from './pages/MissionsGIS';
import HazardReports from './pages/HazardReports';
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
      <div className="flex flex-col h-screen w-screen items-center justify-center bg-slate-50 font-sans">
        <div className="flex flex-col items-center gap-6 animate-fade-in">
          <div className="p-6 bg-white border border-slate-200 rounded-2xl text-blue-600 shadow-xl shadow-slate-200/50">
            <Anchor className="w-16 h-16" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
              Sagar<span className="text-blue-600">Drishti</span>
            </h1>
            <p className="text-slate-500 font-medium text-sm tracking-wide">
              Initializing Autonomous Systems...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MissionProvider>
      <BrowserRouter>
        <div className="flex h-screen w-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
          <Navigation />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/missions" element={<MissionsGIS />} />
              <Route path="/reports" element={<HazardReports />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </MissionProvider>
  );
}