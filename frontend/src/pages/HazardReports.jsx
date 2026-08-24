import React from 'react';
import { Download, FileCheck, Anchor, Map, Activity, Calendar } from 'lucide-react';
import { generateSonarPdfReport } from '../utils/generatePdfReport';

export default function HazardReports() {
  
  const handleGeneratePdf = () => {
    // Generate a standardized audit report
    generateSonarPdfReport({
      fileName: 'Historical_Environment_Audit.pdf',
      locationName: 'Archive Zone - Continental Shelf',
      coordinates: { lat: 18.9220, lon: 72.8347 },
      detections: [
        { class: 'Submerged Vehicle', confidence: 0.98, channel: 'Port', slantRange: 42.1 },
        { class: 'Fishing Nets', confidence: 0.85, channel: 'Center', slantRange: 12.0 },
        { class: 'Metal Debris', confidence: 0.77, channel: 'Starboard', slantRange: 28.5 },
      ],
      telemetry: {
        frequency: '120 kHz',
        range: 'Wide Area Search',
        inferenceLatency: 'Archival Data',
        model: 'YOLO-World v2',
      },
      canvasImage: null,
      inputImage: null
    });
  };

  const handleGenerateGeoJSON = () => {
    const geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [72.8347, 18.9220] },
          properties: { classification: 'Submerged Vehicle', confidence: 98 },
        }
      ],
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(geojson, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'historic_audit.geojson');
    downloadAnchor.click();
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto font-sans">
      <header className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-blue-600" /> Maritime Debris & Compliance Reporting
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Generate structured environmental remediation logs and hazard maps</p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs font-bold bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600">
          <Calendar className="w-4 h-4 text-slate-400" /> Archival Audits Ready
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col justify-between gap-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-600 shrink-0">
              <Map className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 mb-1">Geospatial Target Exports</h2>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">Standard geospatial layers compatible with QGIS, ArcGIS, and ECDIS marine navigation systems for plotting identified hazards.</p>
            </div>
          </div>
          <button 
            onClick={handleGenerateGeoJSON}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 w-full py-3 rounded-lg text-sm font-bold text-white transition shadow-sm shadow-blue-600/20"
          >
            <Download className="w-4 h-4" /> Download GIS Layer (.geojson)
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col justify-between gap-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 mb-1">Environmental Hazard Audit</h2>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">Formal PDF dossier detailing debris density, slant range measurements, channel distribution, and recovery priority scoring.</p>
            </div>
          </div>
          <button 
            onClick={handleGeneratePdf}
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 w-full py-3 rounded-lg text-sm font-bold text-white transition shadow-sm shadow-slate-900/10"
          >
            <FileCheck className="w-4 h-4" /> Generate Audit Report (.pdf)
          </button>
        </div>

      </div>
    </div>
  );
}