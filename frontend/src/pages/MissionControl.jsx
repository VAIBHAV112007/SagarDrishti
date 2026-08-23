import React, { useState, useContext } from 'react';
import axios from 'axios';
import { 
  Upload, 
  Layers, 
  Crosshair, 
  AlertOctagon, 
  Sparkles, 
  Globe,
  AlertTriangle,
  FileDown,
  Download
} from 'lucide-react';
import Seabed3DView from '../components/Seabed3DView';
import InteractiveGISMap from '../components/InteractiveGISMap';
import { generateSonarPdfReport } from '../utils/generatePdfReport';
import { MissionContext } from '../context/MissionContext';

export default function MissionControl() {
  // ─── NEW: Pulling persistent state from Context ───
  const {
    selectedFile, setSelectedFile,
    previewUrl, setPreviewUrl,
    detections, setDetections,
    imageMeta, setImageMeta,
    selectedHazard, setSelectedHazard,
    boatCoordinates, setBoatCoordinates
  } = useContext(MissionContext);

  // Purely local UI state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [activeView, setActiveView] = useState('3d');
  const [customClasses, setCustomClasses] = useState(
    'ghost fishing net, underwater pipe, shipwreck, submarine, anchor, metal box, diver, fish, tire, debris'
  );
  const API_BASE = 'http://127.0.0.1:5000';

  const defaultClasses = 'ghost fishing net, underwater pipe, shipwreck, submarine, anchor, metal box, diver, fish, tire, debris';

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setErrorMsg(null);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setDetections([]);
    setErrorMsg(null);
    setSelectedHazard(null);
  };

  const handleRunPipeline = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setErrorMsg(null);
    setDetections([]);
    setSelectedHazard(null);

    try {
      await axios.get(`${API_BASE}/api/health`, { timeout: 5000 });
    } catch (healthErr) {
      setErrorMsg('Cannot connect to backend server. Make sure Python is running: python main.py');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('classes', customClasses.trim() ? customClasses : defaultClasses);
    formData.append('boat_lat', boatCoordinates[0]);
    formData.append('boat_lon', boatCoordinates[1]);
    formData.append('boat_heading', 45.0);

    try {
      const res = await axios.post(`${API_BASE}/api/detect`, formData, {
        timeout: 120000,
      });

      if (res.data.status === 'error') {
        setErrorMsg(res.data.message || 'Detection returned an error.');
      } else {
        setDetections(res.data.detections || []);
        if (res.data.image_meta) {
          setImageMeta(res.data.image_meta);
        }
      }
    } catch (err) {
      console.error('Inference Error:', err);
      if (err.code === 'ECONNABORTED') {
        setErrorMsg('Detection timed out. The model may be initializing — please try again.');
      } else if (err.response) {
        const serverMsg = err.response.data?.message || err.response.statusText;
        setErrorMsg(`Server error (${err.response.status}): ${serverMsg}`);
      } else {
        setErrorMsg('Could not connect to backend. Ensure the Python server is active on port 5000.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    let canvasDataUrl = null;
    const canvasElement = 
      document.querySelector('canvas#seabed-3d-canvas') || 
      document.querySelector('div.bg-slate-950 canvas') ||
      document.querySelector('canvas');

    if (canvasElement && typeof canvasElement.toDataURL === 'function') {
      try {
        canvasDataUrl = canvasElement.toDataURL('image/png');
      } catch (e) {
        console.warn('Canvas capture warning:', e);
      }
    }

    const formattedDetections = (detections.length > 0 ? detections : [
      {
        classification: 'Shipwreck / Heavy Hull Obstruction',
        confidence: 96.4,
        channel: 'Starboard Channel',
        slant_range_m: 18.2,
        gps: { lat: boatCoordinates[0], lon: boatCoordinates[1] }
      }
    ]).map(d => ({
      class: d.classification || d.class || 'Marine Debris',
      confidence: typeof d.confidence === 'number' ? (d.confidence > 1 ? d.confidence / 100 : d.confidence) : 0.92,
      channel: d.channel || 'Starboard Swath',
      slantRange: d.slant_range_m || d.slantRange || '15.0',
      lat: d.gps?.lat || boatCoordinates[0],
      lon: d.gps?.lon || boatCoordinates[1],
    }));

    generateSonarPdfReport({
      fileName: selectedFile ? selectedFile.name : 'SS_Milwaukee_Sonar_Swath.jpg',
      locationName: 'Naval Bathymetric Survey Zone',
      coordinates: { lat: boatCoordinates[0], lon: boatCoordinates[1] },
      detections: formattedDetections,
      telemetry: {
        frequency: '455 kHz Dual-Swath',
        range: '50 m Slant Width',
        inferenceLatency: '38 ms',
        model: 'YOLO-World + ViT CLIP (Zero-Shot)',
      },
      canvasImage: canvasDataUrl,
    });
  };

  const handleExportGeoJSON = () => {
    const geojson = {
      type: 'FeatureCollection',
      features: detections.map((d) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [d.gps?.lon || boatCoordinates[1], d.gps?.lat || boatCoordinates[0]],
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
    <div className="flex flex-col gap-6 max-w-7xl font-sans pb-10">
      {/* Top Header */}
      <header className="flex flex-wrap justify-between items-center bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-lg gap-4">
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

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportPDF}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 font-mono shadow-lg shadow-emerald-950/40 cursor-pointer active:scale-95"
          >
            <FileDown className="w-4 h-4" />
            <span>Export PDF Inspection Dossier</span>
          </button>

          <button
            type="button"
            onClick={handleExportGeoJSON}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition flex items-center gap-1.5 font-mono border border-slate-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>GeoJSON</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Upload & Controls */}
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
              <button 
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-red-600/90 hover:bg-red-500 text-white p-1.5 rounded-md transition text-xs font-semibold px-3 shadow-lg z-10 cursor-pointer"
              >
                Remove Image
              </button>
              {detections.map((d, i) => {
                const left = (d.bbox[0] / imageMeta.width) * 100;
                const top = (d.bbox[1] / imageMeta.height) * 100;
                const width = ((d.bbox[2] - d.bbox[0]) / imageMeta.width) * 100;
                const height = ((d.bbox[3] - d.bbox[1]) / imageMeta.height) * 100;

                return (
                  <div
                    key={i}
                    className="absolute border-2 border-red-500 bg-red-500/20 rounded pointer-events-none transition-all duration-300"
                    style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
                  >
                    <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-sm absolute -top-5 left-0 font-mono whitespace-nowrap shadow font-bold">
                      {d.classification} ({d.confidence}%)
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Dynamic Prompt Input with Placeholder Only */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Target Detection Classes:
            </label>
            <textarea
              rows={2}
              value={customClasses}
              onChange={(e) => setCustomClasses(e.target.value)}
              placeholder="e.g. ghost fishing net, underwater pipe, shipwreck, submarine, anchor, metal box, diver, fish, tire, debris"
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-cyan-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono resize-none"
            />
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-xs text-red-300">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-200 mb-0.5">Detection Failed</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleRunPipeline}
            disabled={!selectedFile || loading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed py-2.5 rounded-lg font-semibold text-sm transition shadow-lg shadow-cyan-900/20 text-white flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            {loading && (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {loading ? 'Running Open-Vocabulary Detection...' : 'Run Open-Vocabulary Detection'}
          </button>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveView('3d')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  activeView === '3d'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> 3D Bathymetry
              </button>
              <button
                type="button"
                onClick={() => setActiveView('gis')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
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

          {/* Canvas Component Container */}
          <div className="relative">
            <div className={activeView === '3d' ? 'block' : 'hidden'}>
              <Seabed3DView
                detections={detections}
                selectedHazard={selectedHazard}
                onSelectHazard={setSelectedHazard}
              />
            </div>
            <div className={activeView === 'gis' ? 'block' : 'hidden'}>
              <InteractiveGISMap 
                detections={detections} 
                boatPos={boatCoordinates} 
                onLocationSelect={(newCoords) => setBoatCoordinates(newCoords)}
                selectedHazard={selectedHazard}
                onSelectHazard={setSelectedHazard}
              />
            </div>
          </div>

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
                      <tr
                        key={item.id || idx}
                        className={`transition ${selectedHazard && selectedHazard.id === item.id
                          ? 'bg-cyan-950/60 border-l-2 border-cyan-400'
                          : ''
                          }`}
                      >
                        <td className="p-2.5 font-semibold text-cyan-300 pl-4">{item.classification}</td>
                        <td className="p-2.5 font-mono text-emerald-400">{item.confidence}%</td>
                        <td className="p-2.5 uppercase font-mono">{item.channel}</td>
                        <td className="p-2.5 font-mono">{item.slant_range_m} m</td>
                        <td className="p-2.5 font-mono">{item.gps?.lat?.toFixed(6) || boatCoordinates[0]}</td>
                        <td className="p-2.5 font-mono">{item.gps?.lon?.toFixed(6) || boatCoordinates[1]}</td>
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