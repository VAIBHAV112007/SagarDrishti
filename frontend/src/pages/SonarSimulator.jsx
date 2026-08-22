import React, { useState, useEffect } from 'react';
import { Play, Square, RefreshCw, Zap, ShieldAlert } from 'lucide-react';

export default function SonarSimulator() {
  const [isRunning, setIsRunning] = useState(false);
  const [swathSpeed, setSwathSpeed] = useState(3.5); // Knots
  const [streamLog, setStreamLog] = useState([]);

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        const mockTargets = ['Ghost Fishing Net', 'Suspended Steel Pipe', 'Sunken Vessel Fragment', 'Rock Cluster (Filtered)'];
        const target = mockTargets[Math.floor(Math.random() * mockTargets.length)];
        const isAnomaly = !target.includes('Rock');
        
        const newLog = {
          id: Date.now(),
          time: new Date().toLocaleTimeString(),
          target,
          depth: (15 + Math.random() * 8).toFixed(1) + ' m',
          conf: (75 + Math.random() * 24).toFixed(1) + '%',
          isAnomaly
        };

        setStreamLog((prev) => [newLog, ...prev.slice(0, 7)]);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <header>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-cyan-400" /> AUV Real-time Sonar Sweep Simulator
        </h1>
        <p className="text-xs text-slate-400">Simulate autonomous live swath streaming and continuous acoustic inference</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 flex flex-col gap-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">AUV Swath Settings</h2>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Towfish Speed: <span className="text-cyan-400 font-mono">{swathSpeed} Knots</span></label>
            <input
              type="range"
              min="1.0"
              max="6.0"
              step="0.5"
              value={swathSpeed}
              onChange={(e) => setSwathSpeed(e.target.value)}
              className="accent-cyan-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-xs transition ${
                isRunning ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white'
              }`}
            >
              {isRunning ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isRunning ? 'Pause Stream' : 'Start Simulation'}
            </button>
            <button
              onClick={() => setStreamLog([])}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Stream Log */}
        <div className="lg:col-span-2 bg-slate-900/60 p-5 rounded-xl border border-slate-800 flex flex-col gap-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center justify-between">
            <span>Continuous Acoustic Stream Log</span>
            <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
          </h2>

          <div className="flex flex-col gap-2">
            {streamLog.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                Click "Start Simulation" to stream continuous sonar ping data.
              </div>
            ) : (
              streamLog.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-lg border flex items-center justify-between text-xs font-mono transition ${
                    log.isAnomaly
                      ? 'bg-red-950/20 border-red-900/40 text-red-300'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {log.isAnomaly ? <ShieldAlert className="w-4 h-4 text-red-400" /> : <span className="w-2 h-2 rounded-full bg-slate-600" />}
                    <span className="font-semibold text-white">{log.target}</span>
                  </div>
                  <div className="flex gap-4 text-slate-400">
                    <span>Depth: {log.depth}</span>
                    <span className="text-cyan-400 font-semibold">{log.conf}</span>
                    <span className="text-slate-500">{log.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}