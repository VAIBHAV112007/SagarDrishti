import React from 'react';
import { Download, FileCheck, ShieldAlert, CheckCircle } from 'lucide-react';

export default function HazardReports() {
  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <header>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-cyan-400" /> Maritime Debris & Compliance Reporting
        </h1>
        <p className="text-xs text-slate-400">Generate structured environmental remediation logs and Coast Guard hazard maps</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-800 flex flex-col justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-white mb-1">Standard GeoJSON / Shapefile Export</h2>
            <p className="text-xs text-slate-400">Standard geospatial layers compatible with QGIS, ArcGIS, and ECDIS marine navigation systems.</p>
          </div>
          <button className="flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 py-2.5 rounded-lg text-xs font-semibold text-white transition">
            <Download className="w-4 h-4" /> Download GIS Layer (.geojson)
          </button>
        </div>

        <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-800 flex flex-col justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-white mb-1">Environmental Hazard Audit (PDF)</h2>
            <p className="text-xs text-slate-400">Formal report detailing ghost net density, estimated area coverage, and recovery priority scoring.</p>
          </div>
          <button className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 py-2.5 rounded-lg text-xs font-semibold text-cyan-400 transition">
            <Download className="w-4 h-4" /> Generate Audit Report (PDF)
          </button>
        </div>
      </div>
    </div>
  );
}