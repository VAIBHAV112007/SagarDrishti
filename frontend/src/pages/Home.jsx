import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Cpu, 
  ArrowRight, 
  Activity, 
  Database, 
  Play, 
  Pause, 
  RotateCcw, 
  Upload, 
  Sparkles, 
  FileText,
  ChevronRight,
  Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps = [
    {
      stepNumber: '01',
      title: 'Ingest Sonar Swath',
      summary: 'Upload side-scan acoustic waterfall image files.',
      tag: 'Acoustic Feed'
    },
    {
      stepNumber: '02',
      title: 'Prompt Target Classes',
      summary: 'Define dynamic debris categories with zero retraining.',
      tag: 'Zero-Shot AI'
    },
    {
      stepNumber: '03',
      title: 'Neural Detection & Slant Range',
      summary: 'Isolate hazard bounding boxes & compute port/starboard offsets.',
      tag: 'YOLO-World Edge'
    },
    {
      stepNumber: '04',
      title: 'Automated PDF Hazard Report',
      summary: 'Generate an executive maritime hydrographic PDF dossier.',
      tag: 'Naval Dossier'
    }
  ];

  // Faster progress timer (~1.2s per step)
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentStep((s) => (s + 1) % steps.length);
          return 0;
        }
        return prev + 1.5;
      });
    }, 40);

    return () => clearInterval(timer);
  }, [isPlaying, steps.length]);

  const telemetryStats = [
    { label: 'Detection Model', val: 'YOLO-World + ViT CLIP', icon: Cpu, color: 'text-cyan-400' },
    { label: 'Hydroacoustic Band', val: '455 kHz Dual-Swath', icon: Radio, color: 'text-emerald-400' },
    { label: 'Inference Latency', val: '38ms Edge Speed', icon: Activity, color: 'text-amber-400' },
    { label: 'Target Vocabulary', val: 'Open-Domain Zero-Shot', icon: Database, color: 'text-purple-400' },
  ];

  return (
    <div className="flex flex-col gap-10 max-w-6xl mx-auto font-sans pb-16 px-4 sm:px-6">
      {/* Hero Header */}
      <div className="relative rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 p-8 sm:p-12 overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col items-start gap-5 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/60 text-cyan-300 text-xs font-mono">
            <Radio className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            <span>AUTONOMOUS HYDRO-ACOUSTIC INFERENCE PIPELINE</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Autonomous Sonar <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Debris & Hazard</span> Detection
          </h1>

          <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
            Turbid, zero-visibility waters blind underwater cameras. SagarDhristi translates raw acoustic side-scan sonar echograms into actionable 3D bathymetry, nautical charts, and executive PDF inspection reports using open-vocabulary zero-shot edge AI.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => navigate('/mission-control')}
              className="px-7 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm rounded-xl transition shadow-xl shadow-cyan-500/20 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <span>Launch Mission Control Swath</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <div className="text-xs font-mono text-slate-400 flex items-center gap-2 bg-slate-900/90 px-3.5 py-2.5 rounded-xl border border-slate-800">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              FastAPI Inference Server Ready
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Walkthrough Stage */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">Interactive Pipeline Walkthrough</h2>
            <p className="text-sm text-slate-400">Step-by-step simulation of the ingestion, detection, and reporting cycle</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white rounded-xl transition cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => { setCurrentStep(0); setProgress(0); }}
              className="p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Interactive Step Cards */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-3">
            {steps.map((s, idx) => {
              const isActive = currentStep === idx;
              return (
                <div
                  key={idx}
                  onClick={() => { setCurrentStep(idx); setProgress(0); }}
                  className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col gap-2 relative overflow-hidden ${
                    isActive
                      ? 'border-cyan-500 bg-slate-900 shadow-xl shadow-cyan-950/40'
                      : 'border-slate-800/80 bg-slate-950/60 opacity-60 hover:opacity-90'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-cyan-400">
                      STEP {s.stepNumber}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                      {s.tag}
                    </span>
                  </div>

                  <h3 className={`text-base font-bold ${isActive ? 'text-white' : 'text-slate-300'}`}>
                    {s.title}
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    {s.summary}
                  </p>

                  {isActive && (
                    <div className="w-full h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="h-full bg-cyan-400 transition-all duration-75"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Column: Visual Stage with Rendered Sonar Waterfall and PDF Preview */}
          <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col justify-between min-h-[440px] relative shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <span className="font-mono text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Live Viewport Simulation
                </span>
              </div>
              <span className="font-mono text-xs text-cyan-400">
                Stage {steps[currentStep].stepNumber} of 04
              </span>
            </div>

            {/* Dynamic Stage Graphics */}
            <div className="flex-1 flex items-center justify-center my-6 relative">
              {/* Step 1: Ingest Sonar Waterfall */}
              {currentStep === 0 && (
                <div className="w-full max-w-md h-64 border-2 border-dashed border-cyan-500/50 rounded-2xl bg-cyan-950/20 relative overflow-hidden flex flex-col items-center justify-center gap-3 p-4 animate-fadeIn">
                  <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-cyan-950/40 to-slate-950 opacity-90 flex">
                    <div className="w-1/2 border-r border-cyan-500/20 bg-[radial-gradient(#082f49_1px,transparent_1px)] [background-size:12px_12px]"></div>
                    <div className="w-1/2 bg-[radial-gradient(#082f49_1px,transparent_1px)] [background-size:12px_12px]"></div>
                  </div>
                  <div className="absolute inset-x-0 top-0 h-1 bg-cyan-400 animate-pulse"></div>

                  <div className="relative z-10 p-3 bg-cyan-950/90 border border-cyan-500/50 rounded-full text-cyan-400 shadow-xl">
                    <Upload className="w-7 h-7 animate-bounce" />
                  </div>
                  <div className="relative z-10 text-center bg-slate-950/90 px-3.5 py-2 rounded-xl border border-slate-800 shadow-xl">
                    <p className="text-xs font-bold text-white font-mono">Ingesting SS_Milwaukee_sonar.jpg</p>
                    <p className="text-[10px] text-cyan-400 font-mono mt-0.5">Dual-Channel Side-Scan Swath (455 kHz)</p>
                  </div>
                </div>
              )}

              {/* Step 2: Prompt Target Classes */}
              {currentStep === 1 && (
                <div className="w-full max-w-md bg-slate-900 border border-purple-500/50 rounded-2xl p-6 flex flex-col gap-4 shadow-xl animate-fadeIn">
                  <div className="flex items-center gap-2 text-purple-300 text-xs font-mono font-bold">
                    <Sparkles className="w-4 h-4" />
                    <span>Target Detection Prompt</span>
                  </div>
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-cyan-300 flex items-center justify-between">
                    <span>ghost net, submerged pipe, shipwreck, tire</span>
                    <span className="w-2 h-4 bg-cyan-400 animate-pulse"></span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 text-center">
                    Zero-shot open-domain vocabulary loaded into ViT text encoder
                  </span>
                </div>
              )}

              {/* Step 3: Neural Detection on Sonar Waterfall */}
              {currentStep === 2 && (
                <div className="w-full max-w-md h-64 bg-slate-900 rounded-2xl border border-slate-800 relative overflow-hidden flex items-center justify-center p-2 shadow-2xl animate-fadeIn">
                  <div className="w-full h-full rounded-xl overflow-hidden relative border border-slate-700 bg-slate-950 flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 opacity-80">
                      <div className="absolute inset-y-0 left-1/2 w-px bg-cyan-400/40"></div>
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#082f4915_1px,transparent_1px),linear-gradient(to_bottom,#082f4915_1px,transparent_1px)] bg-[size:1.5rem_1.5rem]"></div>
                    </div>

                    <div className="absolute right-12 top-10 w-28 h-20 bg-amber-950/40 border border-amber-500/40 rounded flex items-center justify-center blur-[0.5px]">
                      <div className="w-16 h-10 bg-amber-500/30 rounded transform rotate-12"></div>
                    </div>

                    <div className="absolute right-8 top-6 border-2 border-red-500 bg-red-500/20 rounded p-1.5 flex flex-col gap-0.5 shadow-2xl animate-pulse">
                      <span className="bg-red-600 text-white font-mono text-[9px] px-1.5 py-0.5 rounded font-bold w-fit">
                        Shipwreck Hull (96.4%)
                      </span>
                      <span className="text-[10px] font-mono text-red-200 bg-black/70 px-1 rounded">
                        Slant Range: 18.2m Starboard
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Executive PDF Hazard Report Document Card */}
              {currentStep === 3 && (
                <div className="w-full max-w-md bg-slate-900 border border-emerald-500/50 rounded-2xl p-5 flex flex-col gap-3 shadow-xl animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <span>HYDRO-SURVEY REPORT (PDF)</span>
                    </div>
                    <span className="text-[10px] font-mono bg-emerald-950/90 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/40 flex items-center gap-1">
                      <Download className="w-3 h-3" /> Ready
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-300 flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-slate-400 text-[10px]">
                      <span>Document: SAGARDHRISTI-REP-0941.pdf</span>
                      <span className="text-emerald-400 font-bold">Verified</span>
                    </div>
                    <p className="text-cyan-400 font-bold">Location: 43.1360° N, 87.7280° W</p>
                    <p className="text-amber-400">Hazards Logged: 1 Heavy Obstruction (18.2m Offset)</p>
                    <p className="text-slate-400">Propeller Standoff: 20.0m Navigational Buffer</p>
                  </div>
                </div>
              )}
            </div>

            {/* Stage Footer Toolbar */}
            <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">
                {steps[currentStep].summary}
              </span>
              <button
                onClick={() => navigate('/mission-control')}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition font-mono flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                <span>Try Dashboard</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Telemetry Overview Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {telemetryStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5 shadow-sm">
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-[11px] font-mono text-slate-500 uppercase">{stat.label}</p>
                <p className="text-xs sm:text-sm font-bold text-slate-200 font-mono mt-0.5">{stat.val}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}