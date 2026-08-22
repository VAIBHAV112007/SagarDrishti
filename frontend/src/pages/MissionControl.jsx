import React, { useState } from 'react';
import axios from 'axios';
import { 
  Upload, 
  Download, 
  Layers, 
  Crosshair, 
  AlertOctagon, 
  Sparkles, 
  Globe 
} from 'lucide-react';
import Seabed3DView from '../components/Seabed3DView';
import InteractiveGISMap from '../components/InteractiveGISMap';

export default function MissionControl() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [imageMeta, setImageMeta] = useState({ width: 1, height: 1 });
  const [activeView, setActiveView] = useState('3d'); // '3d' | 'gis'
  const [customClasses, setCustomClasses] = useState(
    'ghost fishing net, underwater pipe, shipwreck, submarine, anchor, metal box, diver, fish, tire, debris'
  );
  const [boatCoordinates, setBoatCoordinates] = useState([18.9220, 72.8347]);
  const API_URL = 'http://127.0.0.1:5000/api/detect';

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRunPipeline = async () => {
    if (!selectedFile) return;
    setLoading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('classes', customClasses);
    formData.append('boat_lat', boatCoordinates[0]);
    formData.append('boat_lon', boatCoordinates[1]);
    formData.append('boat_heading', 45.0);

    try {
      const res = await axios.post(API_URL, formData);
      setDetections(res.data.detections || []);
      if (res.data.image_meta) {
        setImageMeta(res.data.image_meta);
      }
    } catch (err) {
      console.error('Inference Error:', err);
      alert('Could not connect to FastAPI backend. Check that your Python server is running on ' + API_URL);
    } finally {
      setLoading(false);
    }
  };

  const handleExportGeoJSON = () => {
    const geojson = {
      type: 'FeatureCollection',
      features: detections.map((d) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [d.gps.lon, d.gps.lat],
        },
        properties: {
          classification: d.classification,
          confidence: d.confidence,
          channel: d.channel,
          slant_range_m: d.slant_range_m,
        },
      })),
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(geojson, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'sonar_debris_anomalies.geojson');
    downloadAnchor.click();
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl font-sans">
      {/* Top Header */}
      <header className="flex flex-wrap justify-between items-center bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-950 border border-cyan-700 rounded-lg text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide">
              Live Mission Control <span className="text-cyan-400 font-mono text-xs">[ACOUSTIC SWATH]</span>
            </h1>
            <p className="text-xs text-slate-400">Real-time side-scan sonar waterfall and 3D bathymetry mapping</p>
          </div>
        </div>

        <button
          onClick={handleExportGeoJSON}
          disabled={detections.length === 0}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-800/40 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition shadow"
        >
          <Download className="w-4 h-4" /> Export GeoJSON
        </button>
      </header>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Upload, Dynamic Prompt Input & 2D Waterfall Preview */}
        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 flex flex-col gap-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-cyan-400" /> Sonar Ingestion Swath
          </h2>

          <label className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition bg-slate-950/40">
            <Upload className="w-8 h-8 text-slate-400 mb-2" />
            <span className="text-sm font-medium text-slate-300">Upload Sonar Ping / Image</span>
            <span className="text-xs text-slate-500 mt-1">PNG, JPG, GeoTIFF</span>
            <input type="file" onChange={handleFileChange} className="hidden" accept="image/*" />
          </label>

          {previewUrl && (
            <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-black inline-block w-full">
              <img src={previewUrl} alt="Sonar Swath Preview" className="w-full h-auto object-contain block opacity-90" />
              {detections.map((d, i) => {
                const left = (d.bbox[0] / imageMeta.width) * 100;
                const top = (d.bbox[1] / imageMeta.height) * 100;
                const width = ((d.bbox[2] - d.bbox[0]) / imageMeta.width) * 100;
                const height = ((d.bbox[3] - d.bbox[1]) / imageMeta.height) * 100;

                return (
                  <div
                    key={i}
                    className="absolute border-2 border-red-500 bg-red-500/20 rounded pointer-events-none transition-all duration-300"
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                    }}
                  >
                    <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-sm absolute -top-5 left-0 font-mono whitespace-nowrap shadow font-bold">
                      {d.classification} ({d.confidence}%)
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Dynamic Open-Vocabulary Target Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Target Detection Classes:
            </label>
            <textarea
              rows={2}
              value={customClasses}
              onChange={(e) => setCustomClasses(e.target.value)}
              placeholder="e.g. diver, fish, shipwreck, pipe, container, tire"
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-cyan-300 focus:outline-none focus:border-cyan-500 font-mono resize-none"
            />
          </div>

          <button
            onClick={handleRunPipeline}
            disabled={!selectedFile || loading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed py-2.5 rounded-lg font-semibold text-sm transition shadow-lg shadow-cyan-900/20 text-white"
          >
            {loading ? 'Running Open-Vocabulary Detection...' : 'Run Open-Vocabulary Detection'}
          </button>
        </div>

        {/* Right Side: Visual Canvas & Hazard Data Table */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* View Toggle Tabs */}
          <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveView('3d')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeView === '3d'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> 3D Bathymetry
              </button>
              <button
                onClick={() => setActiveView('gis')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeView === 'gis'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" /> Interactive GIS Map
              </button>
            </div>
            <span className="text-[11px] font-mono text-slate-500 px-2">
              {activeView === '3d' ? 'Three.js Digital Elevation' : 'Leaflet Global Nautical Layers'}
            </span>
          </div>

          {/* Conditional View Display with Two-way Location Binding */}
          {activeView === '3d' ? (
            <Seabed3DView detections={detections} />
          ) : (
            <InteractiveGISMap 
              detections={detections} 
              boatPos={boatCoordinates} 
              onLocationSelect={(newCoords) => setBoatCoordinates(newCoords)} 
            />
          )}

          {/* Hazard Summary Table */}
          <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-red-400" /> Geotagged Hazards ({detections.length})
            </h2>

            <div className="overflow-x-auto max-h-48 rounded-lg border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 sticky top-0 font-mono">
                  <tr>
                    <th className="p-2.5">Class</th>
                    <th className="p-2.5">Confidence</th>
                    <th className="p-2.5">Channel</th>
                    <th className="p-2.5">Range (m)</th>
                    <th className="p-2.5">Lat</th>
                    <th className="p-2.5">Lon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/30">
                  {detections.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-500 font-mono">
                        No hazards identified yet. Upload a sonar image and run detection.
                      </td>
                    </tr>
                  ) : (
                    detections.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition">
                        <td className="p-2.5 font-semibold text-cyan-300">{item.classification}</td>
                        <td className="p-2.5 font-mono">{item.confidence}%</td>
                        <td className="p-2.5 uppercase font-mono">{item.channel}</td>
                        <td className="p-2.5 font-mono">{item.slant_range_m} m</td>
                        <td className="p-2.5 font-mono">{item.gps.lat.toFixed(6)}</td>
                        <td className="p-2.5 font-mono">{item.gps.lon.toFixed(6)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}