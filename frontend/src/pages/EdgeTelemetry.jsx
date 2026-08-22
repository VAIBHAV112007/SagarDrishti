import React from 'react';
import { Cpu, HardDrive, Zap, CheckCircle2 } from 'lucide-react';

export default function EdgeTelemetry() {
  const metrics = [
    { label: 'Inference Latency', value: '18.4 ms', detail: 'TensorRT FP16 Engine', icon: Zap, color: 'text-cyan-400' },
    { label: 'Framerate (Throughput)', value: '54.3 FPS', detail: 'Real-time Sonar Waterfall', icon: Cpu, color: 'text-emerald-400' },
    { label: 'AUV Power Consumption', value: '12.8 W', detail: 'Onboard Battery Safe', icon: HardDrive, color: 'text-amber-400' },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <header>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-cyan-400" /> AUV Edge Hardware & Telemetry Monitor
        </h1>
        <p className="text-xs text-slate-400">Validation for NVIDIA Jetson Orin / Embedded Acoustic Sensor Payload</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {metrics.map(({ label, value, detail, icon: Icon, color }, idx) => (
          <div key={idx} className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">{label}</span>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <span className={`text-2xl font-bold font-mono ${color}`}>{value}</span>
            <span className="text-[11px] text-slate-500 font-mono">{detail}</span>
          </div>
        ))}
      </div>

      <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-800 flex flex-col gap-4">
        <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Embedded Pipeline Specifications</h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300 font-mono">
          <li className="flex items-center gap-2 bg-slate-950/40 p-3 rounded border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Zero-Cloud Dependent (Air-gapped deployment)
          </li>
          <li className="flex items-center gap-2 bg-slate-950/40 p-3 rounded border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Slant-to-Ground geometric correction on-chip
          </li>
          <li className="flex items-center gap-2 bg-slate-950/40 p-3 rounded border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Native support for .XTF / .JSF hydroacoustic logs
          </li>
          <li className="flex items-center gap-2 bg-slate-950/40 p-3 rounded border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Auto-failover to acoustic shadow dead-reckoning
          </li>
        </ul>
      </div>
    </div>
  );
}