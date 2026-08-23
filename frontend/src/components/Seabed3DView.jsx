import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import { ShieldAlert, X, Navigation } from 'lucide-react';

// Simplex-like noise for terrain generation
function seededRandom(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function noise2D(x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const a = seededRandom(ix + iz * 57);
  const b = seededRandom(ix + 1 + iz * 57);
  const c = seededRandom(ix + (iz + 1) * 57);
  const d = seededRandom(ix + 1 + (iz + 1) * 57);
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function fbmNoise(x, z, octaves = 5) {
  let value = 0, amplitude = 1, frequency = 1, maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    value += noise2D(x * frequency, z * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.45;
    frequency *= 2.1;
  }
  return value / maxValue;
}

// ─── Bathymetric Terrain ────────────────────────
function BathymetryTerrain() {
  const meshRef = useRef();
  const segments = 96;
  const size = 50;

  const { geometry } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    const positions = geo.attributes.position.array;
    const colors = new Float32Array(positions.length);
    let minY = Infinity, maxY = -Infinity;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 1];
      const baseHeight = fbmNoise(x * 0.06 + 10, z * 0.06 + 10, 5) * 4.5;
      const ridges = Math.abs(fbmNoise(x * 0.12, z * 0.12, 3)) * 2.0;
      const detail = fbmNoise(x * 0.25 + 5, z * 0.25 + 5, 2) * 0.8;
      const distFromCenter = Math.abs(x) / (size / 2);
      const channelDepth = Math.exp(-distFromCenter * distFromCenter * 8) * -1.5;
      const height = baseHeight + ridges + detail + channelDepth - 3.0;
      positions[i + 2] = height;

      if (height < minY) minY = height;
      if (height > maxY) maxY = height;
    }

    const range = maxY - minY || 1;
    for (let i = 0; i < positions.length; i += 3) {
      const height = positions[i + 2];
      const t = (height - minY) / range;

      let r, g, b;
      if (t < 0.25) {
        const s = t / 0.25;
        r = 0.02 + s * 0.03; g = 0.04 + s * 0.08; b = 0.15 + s * 0.15;
      } else if (t < 0.5) {
        const s = (t - 0.25) / 0.25;
        r = 0.05 + s * 0.02; g = 0.12 + s * 0.18; b = 0.30 + s * 0.15;
      } else if (t < 0.75) {
        const s = (t - 0.5) / 0.25;
        r = 0.07 + s * 0.15; g = 0.30 + s * 0.25; b = 0.45 - s * 0.05;
      } else {
        const s = (t - 0.75) / 0.25;
        r = 0.22 + s * 0.25; g = 0.55 + s * 0.15; b = 0.40 - s * 0.1;
      }
      colors[i] = r; colors[i + 1] = g; colors[i + 2] = b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return { geometry: geo, depthColors: colors };
  }, []);

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.85} metalness={0.1} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ─── Towfish Path ──────────────────────────────────
function TowfishPath() {
  const pathPoints = useMemo(() => {
    const pts = [];
    const count = 200;
    for (let i = 0; i < count; i++) {
      const t = (i / count) * 2 - 1;
      const z = t * 24;
      const x = Math.sin(t * Math.PI * 1.5) * 1.5;
      const y = 1.5 + Math.sin(t * Math.PI * 3) * 0.3;
      pts.push(new THREE.Vector3(x, y, z));
    }
    return pts;
  }, []);

  const lineGeometry = useMemo(() => {
    const positions = new Float32Array(pathPoints.length * 3);
    pathPoints.forEach((p, i) => {
      positions[i * 3] = p.x; positions[i * 3 + 1] = p.y; positions[i * 3 + 2] = p.z;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [pathPoints]);

  return (
    <group>
      <line geometry={lineGeometry}>
        <lineDashedMaterial color="#22d3ee" dashSize={0.5} gapSize={0.3} linewidth={1} />
      </line>

      {pathPoints.filter((_, i) => i % 25 === 0).map((pt, i) => (
        <mesh key={`wp-${i}`} position={[pt.x, pt.y, pt.z]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color="#06b6d4" emissive="#0891b2" emissiveIntensity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Animated AUV/Towfish Model ────────────────────────────────────
function AnimatedTowfish() {
  const groupRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const progress = ((t * 0.08) % 1);
    const mapped = progress * 2 - 1;

    const z = mapped * 24;
    const x = Math.sin(mapped * Math.PI * 1.5) * 1.5;
    const y = 1.5 + Math.sin(mapped * Math.PI * 3) * 0.3;

    if (groupRef.current) {
      groupRef.current.position.set(x, y, z);
      const nextZ = (mapped + 0.01) * 24;
      const nextX = Math.sin((mapped + 0.01) * Math.PI * 1.5) * 1.5;
      groupRef.current.lookAt(nextX, y, nextZ);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh rotation={[0, 0, 0]}>
        <capsuleGeometry args={[0.25, 1.2, 8, 16]} />
        <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.5} metalness={0.6} roughness={0.3} />
      </mesh>
      <pointLight color="#22d3ee" intensity={3} distance={6} />
      <mesh position={[0, -0.6, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[1.5, 2.5, 16, 1, true]} />
        <meshStandardMaterial color="#06b6d4" transparent opacity={0.08} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ─── UPDATED: Interactive Hazard Marker ───────────────────────────────────────
function HazardMarker({ item, isSelected, onSelect }) {
  const groupRef = useRef();
  const innerRef = useRef();
  const ringRef = useRef();
  const position = item.three_pos || [0, 0, 0];

  const baseColor = useMemo(() => {
    const cls = item.classification?.toLowerCase() || '';
    if (cls.includes('net') || cls.includes('fishing')) return '#ef4444';
    if (cls.includes('wreck') || cls.includes('ship')) return '#f97316';
    if (cls.includes('submarine')) return '#a855f7';
    if (cls.includes('pipe') || cls.includes('cable')) return '#3b82f6';
    if (cls.includes('anchor') || cls.includes('metal') || cls.includes('box')) return '#eab308';
    if (cls.includes('diver')) return '#22c55e';
    if (cls.includes('tire') || cls.includes('debris')) return '#f43f5e';
    if (cls.includes('fish')) return '#14b8a6';
    return '#ef4444';
  }, [item.classification]);

  const markerColor = isSelected ? '#22d3ee' : baseColor;
  const emissiveIntensity = isSelected ? 1.5 : 0.9;

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (innerRef.current) {
      innerRef.current.rotation.y = t * 1.5;
      innerRef.current.rotation.x = Math.sin(t * 0.8) * 0.3;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.8;
      ringRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.15);
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.1} floatIntensity={0.6} floatingRange={[-0.15, 0.15]}>
      <group
        ref={groupRef}
        position={position}
        onClick={(e) => { e.stopPropagation(); onSelect(item); }}
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'auto'}
      >
        <line>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={2} array={new Float32Array([0, 0, 0, 0, -position[1] - 1.5, 0])} itemSize={3} />
          </bufferGeometry>
          <lineBasicMaterial color={markerColor} transparent opacity={isSelected ? 0.8 : 0.3} />
        </line>

        <mesh ref={innerRef}>
          <octahedronGeometry args={[isSelected ? 0.6 : 0.45, 0]} />
          <meshStandardMaterial color={markerColor} emissive={markerColor} emissiveIntensity={emissiveIntensity} wireframe />
        </mesh>

        <mesh ref={ringRef}>
          <torusGeometry args={[0.7, 0.04, 8, 32]} />
          <meshStandardMaterial color={markerColor} emissive={markerColor} emissiveIntensity={0.6} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.9, 16, 16]} />
          <meshStandardMaterial color={markerColor} transparent opacity={isSelected ? 0.15 : 0.06} />
        </mesh>
        <pointLight color={markerColor} intensity={isSelected ? 4 : 2} distance={4} />
        <Text position={[0, 1.4, 0]} fontSize={0.35} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.03} outlineColor="#000000">
          {item.classification}
        </Text>
        <Text position={[0, 1.0, 0]} fontSize={0.22} color={markerColor} anchorX="center" anchorY="middle">
          {`${item.confidence}%`}
        </Text>
      </group>
    </Float>
  );
}

// ─── Depth Scale Legend ──────────────────────────────────
function DepthLegend() {
  const colors = ['#0a1628', '#0c2d4a', '#0e7490', '#22d3ee', '#a3e635'];
  const labels = ['-25m', '-18m', '-12m', '-6m', '0m'];

  return (
    <group position={[-23, 0, -20]}>
      {colors.map((col, i) => (
        <group key={i} position={[0, i * 1.2, 0]}>
          <mesh>
            <boxGeometry args={[1.2, 0.8, 0.3]} />
            <meshStandardMaterial color={col} />
          </mesh>
          <Text position={[1.4, 0, 0]} fontSize={0.3} color="#94a3b8" anchorX="left">
            {labels[i]}
          </Text>
        </group>
      ))}
      <Text position={[0.6, -0.8, 0]} fontSize={0.25} color="#64748b" anchorX="center">
        Depth Scale
      </Text>
    </group>
  );
}

// ─── Underwater Particles ──────────────────────────────────────────
function UnderwaterParticles() {
  const particlesRef = useRef();
  const count = 300;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      pos[i] = (Math.random() - 0.5) * 50;
      pos[i + 1] = Math.random() * 10 - 2;
      pos[i + 2] = (Math.random() - 0.5) * 50;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (particlesRef.current) {
      const t = state.clock.getElapsedTime();
      particlesRef.current.rotation.y = t * 0.01;
      const posArray = particlesRef.current.geometry.attributes.position.array;
      for (let i = 0; i < count * 3; i += 3) {
        posArray[i + 1] += Math.sin(t + i) * 0.002;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#38bdf8" size={0.06} transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

// ─── Sonar Scan Lines ────────────────────
function SonarScanLines() {
  const groupRef = useRef();

  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.getElapsedTime();
      groupRef.current.children.forEach((child, i) => {
        const phase = (t * 0.5 + i * 0.4) % 6;
        child.material.opacity = phase < 3 ? Math.max(0, 0.15 - phase * 0.05) : 0;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: 8 }).map((_, i) => {
        const z = -20 + i * 5;
        return (
          <mesh key={i} position={[0, 0.5, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[40, 0.15]} />
            <meshStandardMaterial color="#22d3ee" transparent opacity={0.1} emissive="#22d3ee" emissiveIntensity={0.5} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
}

// ─── UPDATED: Main Component ────────────────────────────────────────────────
export default function Seabed3DView({ detections, selectedHazard, onSelectHazard }) {
  return (
    <div className="w-full h-[500px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 relative">
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-mono text-cyan-400">
          3D Seafloor Bathymetric Reconstruction
        </div>
        <div className="bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700 text-[10px] font-mono text-slate-400">
          Hazards: <span className="text-cyan-400 font-bold">{detections.length}</span> • Click markers to inspect
        </div>
      </div>

      <div className="absolute bottom-3 right-3 z-10 bg-slate-900/70 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700 text-[10px] font-mono text-slate-500">
        Drag to rotate • Scroll to zoom • Right-drag to pan
      </div>

      <Canvas
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        onCreated={({ gl }) => {
          gl.domElement.id = 'seabed-3d-canvas';
        }}
        camera={{ position: [18, 16, 22], fov: 42 }}
        shadows
        onPointerMissed={() => onSelectHazard && onSelectHazard(null)}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[15, 25, 20]} intensity={1.0} castShadow shadow-mapSize={[1024, 1024]} />
        <pointLight position={[0, 8, 0]} color="#0ea5e9" intensity={3} distance={30} />
        <pointLight position={[-15, 5, -10]} color="#0284c7" intensity={1.5} distance={25} />
        <fog attach="fog" args={['#020617', 25, 65]} />

        <BathymetryTerrain />
        <TowfishPath />
        <AnimatedTowfish />
        <SonarScanLines />
        <UnderwaterParticles />
        <DepthLegend />

        {detections.map((item, idx) => (
          <HazardMarker
            key={item.id || idx}
            item={item}
            isSelected={selectedHazard && selectedHazard.id === item.id}
            onSelect={(hazard) => onSelectHazard && onSelectHazard(hazard)}
          />
        ))}

        <OrbitControls
          makeDefault
          maxPolarAngle={Math.PI / 2.05}
          minDistance={8}
          maxDistance={50}
          enableDamping
          dampingFactor={0.05}
          autoRotate={!selectedHazard}
          autoRotateSpeed={0.3}
        />
      </Canvas>

      {/* Floating Anomaly Property Inspection Overlay */}
      {selectedHazard && (
        <div className="absolute bottom-4 right-4 z-20 w-80 bg-slate-900/95 backdrop-blur-md p-4 rounded-xl border border-cyan-500/50 shadow-2xl shadow-cyan-950/50 font-sans animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-white">{selectedHazard.classification}</span>
            </div>
            <button onClick={() => onSelectHazard(null)} className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5 mt-3 text-xs">
            <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Acoustic Confidence</span>
              <span className="text-emerald-400 font-bold font-mono">{selectedHazard.confidence}%</span>
            </div>
            <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Seafloor Elevation</span>
              <span className="text-cyan-400 font-bold font-mono">+{selectedHazard.estimated_height_m || 1.5} m</span>
            </div>
            <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Shadow Span</span>
              <span className="text-amber-400 font-bold font-mono">{selectedHazard.shadow_length_m || 2.4} m</span>
            </div>
            <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Slant Range</span>
              <span className="text-slate-200 font-bold font-mono">{selectedHazard.slant_range_m}m ({selectedHazard.channel})</span>
            </div>
          </div>

          <div className="mt-3 p-2 bg-slate-950/70 rounded-lg border border-slate-800 flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400 flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5 text-cyan-400" /> GPS
            </span>
            <span className="text-white">
              {selectedHazard.gps?.lat ? Number(selectedHazard.gps.lat).toFixed(5) : "N/A"}, {selectedHazard.gps?.lon ? Number(selectedHazard.gps.lon).toFixed(5) : "N/A"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}