import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { AlertTriangle, Search, MapPin } from 'lucide-react';

// Fix default leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createHazardIcon = (isSelected) =>
  L.divIcon({
    className: 'custom-hazard-pin',
    html: `<div class="relative flex items-center justify-center">
            <div class="absolute w-6 h-6 ${isSelected ? 'bg-cyan-500/40' : 'bg-red-500/30'} rounded-full animate-ping"></div>
            <div class="w-3.5 h-3.5 ${isSelected ? 'bg-cyan-500' : 'bg-red-600'} border-2 border-white rounded-full shadow-lg"></div>
          </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

// ─── FIX: Removed aggressive camera locking ───
function MapController({ boatPos, onLocationSelect, selectedHazard }) {
  const map = useMap();

  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect([e.latlng.lat, e.latlng.lng]);
      }
    },
  });

  React.useEffect(() => {
    if (selectedHazard && selectedHazard.gps?.lat && selectedHazard.gps?.lon) {
      // Only lock the camera when a hazard is actively selected
      map.flyTo([Number(selectedHazard.gps.lat), Number(selectedHazard.gps.lon)], 18, { animate: true, duration: 1.5 });
    }
  }, [selectedHazard, map]);

  return null;
}

export default function InteractiveGISMap({ detections = [], boatPos = [18.922, 72.8347], onLocationSelect, selectedHazard, onSelectHazard }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const newLat = parseFloat(data[0].lat);
        const newLon = parseFloat(data[0].lon);
        if (onLocationSelect) {
          onLocationSelect([newLat, newLon]);
        }
      } else {
        alert('Location not found. Try entering a port name, coastal city, or sea.');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="relative w-full h-[450px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">

        <form onSubmit={handleSearch} className="pointer-events-auto flex items-center bg-slate-900/90 backdrop-blur-md rounded-lg border border-slate-700 overflow-hidden shadow-lg">
          <input
            type="text"
            placeholder="Search any global port, sea, or ocean..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none w-56 sm:w-72"
          />
          <button
            type="submit"
            disabled={searching}
            className="p-2 text-cyan-400 hover:text-white bg-slate-800 transition text-xs font-mono flex items-center gap-1"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{searching ? 'Locating...' : 'Go'}</span>
          </button>
        </form>

        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-[11px] font-mono text-cyan-400 flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          <span>AUV Lat: {boatPos[0].toFixed(4)}, Lon: {boatPos[1].toFixed(4)}</span>
        </div>
      </div>

      <MapContainer
        center={boatPos}
        zoom={13}
        minZoom={2}
        maxZoom={18}
        scrollWheelZoom={true}
        wheelPxPerZoomLevel={60} // FIX: Makes scroll zooming faster
        wheelDebounceTime={40}   // FIX: Makes scroll zooming more responsive
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <MapController boatPos={boatPos} onLocationSelect={onLocationSelect} selectedHazard={selectedHazard} />

        <Marker position={boatPos}>
          <Popup>
            <div className="text-xs font-sans text-slate-800">
              <strong className="text-cyan-700 font-bold block">Survey Vessel / AUV Position</strong>
              <span>Lat: {boatPos[0].toFixed(6)}<br />Lon: {boatPos[1].toFixed(6)}</span>
              <p className="text-[10px] text-slate-500 mt-1 italic">Click anywhere on the map to reposition.</p>
            </div>
          </Popup>
        </Marker>

        <Circle
          center={boatPos}
          radius={80}
          pathOptions={{ color: '#06b6d4', fillColor: '#0891b2', fillOpacity: 0.12, dashArray: '4' }}
        />

        {detections.map((d, idx) => {
          const isSelected = selectedHazard && selectedHazard.id === d.id;

          return (
            <React.Fragment key={d.id || idx}>
              <Marker
                position={[d.gps.lat, d.gps.lon]}
                icon={createHazardIcon(isSelected)}
                interactive={false}
              />

              <Circle
                center={[d.gps.lat, d.gps.lon]}
                radius={15}
                pathOptions={{
                  color: isSelected ? '#06b6d4' : '#ef4444',
                  fillColor: isSelected ? '#0891b2' : '#dc2626',
                  fillOpacity: 0.25
                }}
              />
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}