import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float, Environment } from '@react-three/drei';
import * as THREE from 'three';

// ─── Simplex-like noise for terrain generation ──────────────────────
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
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += noise2D(x * frequency, z * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.45;
    frequency *= 2.1;
  }
  return value / maxValue;
}


// ─── Bathymetric Terrain with Depth Gradient ────────────────────────
function BathymetryTerrain() {
  const meshRef = useRef();
  const segments = 96;
  const size = 50;

  const { geometry, depthColors } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    const positions = geo.attributes.position.array;
    const colors = new Float32Array(positions.length);

    let minY = Infinity, maxY = -Infinity;

    // Generate terrain heights using fractal noise
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 1]; // PlaneGeometry uses x,y before rotation

      // Multi-octave noise for realistic seafloor
      const baseHeight = fbmNoise(x * 0.06 + 10, z * 0.06 + 10, 5) * 4.5;
      const ridges = Math.abs(fbmNoise(x * 0.12, z * 0.12, 3)) * 2.0;
      const detail = fbmNoise(x * 0.25 + 5, z * 0.25 + 5, 2) * 0.8;

      // Center channel (towfish path) should be a valley
      const distFromCenter = Math.abs(x) / (size / 2);
      const channelDepth = Math.exp(-distFromCenter * distFromCenter * 8) * -1.5;

      const height = baseHeight + ridges + detail + channelDepth - 3.0;
      positions[i + 2] = height;

      if (height < minY) minY = height;
      if (height > maxY) maxY = height;
    }

    // Assign depth-gradient colors
    const range = maxY - minY || 1;
    for (let i = 0; i < positions.length; i += 3) {
      const height = positions[i + 2];
      const t = (height - minY) / range; // 0 = deepest, 1 = shallowest

      // Deep navy → teal → cyan → sand gradient
      let r, g, b;
      if (t < 0.25) {
        // Deep: dark navy
        const s = t / 0.25;
        r = 0.02 + s * 0.03;
        g = 0.04 + s * 0.08;
        b = 0.15 + s * 0.15;
      } else if (t < 0.5) {
        // Mid-deep: teal
        const s = (t - 0.25) / 0.25;
        r = 0.05 + s * 0.02;
        g = 0.12 + s * 0.18;
        b = 0.30 + s * 0.15;
      } else if (t < 0.75) {
        // Mid-shallow: cyan-green
        const s = (t - 0.5) / 0.25;
        r = 0.07 + s * 0.15;
        g = 0.30 + s * 0.25;
        b = 0.45 - s * 0.05;
      } else {
        // Shallow: sandy cyan
        const s = (t - 0.75) / 0.25;
        r = 0.22 + s * 0.25;
        g = 0.55 + s * 0.15;
        b = 0.40 - s * 0.1;
      }

      colors[i] = r;
      colors[i + 1] = g;
      colors[i + 2] = b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    return { geometry: geo, depthColors: colors };
  }, []);

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
      <meshStandardMaterial
        vertexColors
        roughness={0.85}
        metalness={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}


// ─── Towfish Path (AUV Trajectory) ──────────────────────────────────
function TowfishPath() {
  const pathRef = useRef();
  const pathPoints = useMemo(() => {
    const pts = [];
    const count = 200;
    for (let i = 0; i < count; i++) {
      const t = (i / count) * 2 - 1; // -1 to 1
      const z = t * 24;
      const x = Math.sin(t * Math.PI * 1.5) * 1.5;
      const y = 1.5 + Math.sin(t * Math.PI * 3) * 0.3; // Slight vertical undulation
      pts.push(new THREE.Vector3(x, y, z));
    }
    return pts;
  }, []);

  const lineGeometry = useMemo(() => {
    const positions = new Float32Array(pathPoints.length * 3);
    pathPoints.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [pathPoints]);

  return (
    <group>
      {/* Dashed trajectory line */}
      <line geometry={lineGeometry}>
        <lineDashedMaterial color="#22d3ee" dashSize={0.5} gapSize={0.3} linewidth={1} />
      </line>

      {/* Waypoint markers along the path */}
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
  const trailRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const progress = ((t * 0.08) % 1); // 0 to 1 looping
    const mapped = progress * 2 - 1; // -1 to 1

    const z = mapped * 24;
    const x = Math.sin(mapped * Math.PI * 1.5) * 1.5;
    const y = 1.5 + Math.sin(mapped * Math.PI * 3) * 0.3;

    if (groupRef.current) {
      groupRef.current.position.set(x, y, z);
      // Point in travel direction
      const nextZ = (mapped + 0.01) * 24;
      const nextX = Math.sin((mapped + 0.01) * Math.PI * 1.5) * 1.5;
      groupRef.current.lookAt(nextX, y, nextZ);
    }
  });

  return (
    <group ref={groupRef}>
      {/* AUV Body */}
      <mesh rotation={[0, 0, 0]}>
        <capsuleGeometry args={[0.25, 1.2, 8, 16]} />
        <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.5} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Sonar emission indicator */}
      <pointLight color="#22d3ee" intensity={3} distance={6} />
      {/* Downward sonar cone */}
      <mesh position={[0, -0.6, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[1.5, 2.5, 16, 1, true]} />
        <meshStandardMaterial color="#06b6d4" transparent opacity={0.08} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}


// ─── Volumetric Hazard Marker ───────────────────────────────────────
function HazardMarker({ position, label, confidence, classification }) {
  const groupRef = useRef();
  const innerRef = useRef();
  const ringRef = useRef();

  // Color coding by threat type
  const markerColor = useMemo(() => {
    const cls = classification?.toLowerCase() || '';
    if (cls.includes('net') || cls.includes('fishing')) return '#ef4444';
    if (cls.includes('wreck') || cls.includes('ship')) return '#f97316';
    if (cls.includes('submarine')) return '#a855f7';
    if (cls.includes('pipe') || cls.includes('cable')) return '#3b82f6';
    if (cls.includes('anchor') || cls.includes('metal') || cls.includes('box')) return '#eab308';
    if (cls.includes('diver')) return '#22c55e';
    if (cls.includes('tire') || cls.includes('debris')) return '#f43f5e';
    if (cls.includes('fish')) return '#14b8a6';
    return '#ef4444';
  }, [classification]);

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
      <group ref={groupRef} position={position}>
        {/* Vertical line to ground */}
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([0, 0, 0, 0, -position[1] - 1.5, 0])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={markerColor} transparent opacity={0.3} />
        </line>

        {/* Inner rotating octahedron */}
        <mesh ref={innerRef}>
          <octahedronGeometry args={[0.45, 0]} />
          <meshStandardMaterial color={markerColor} emissive={markerColor} emissiveIntensity={0.9} wireframe />
        </mesh>

        {/* Outer ring */}
        <mesh ref={ringRef}>
          <torusGeometry args={[0.7, 0.04, 8, 32]} />
          <meshStandardMaterial color={markerColor} emissive={markerColor} emissiveIntensity={0.6} />
        </mesh>

        {/* Glow sphere */}
        <mesh>
          <sphereGeometry args={[0.9, 16, 16]} />
          <meshStandardMaterial color={markerColor} transparent opacity={0.06} />
        </mesh>

        {/* Point light for glow */}
        <pointLight color={markerColor} intensity={2} distance={4} />

        {/* Label */}
        <Text
          position={[0, 1.4, 0]}
          fontSize={0.35}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          font={undefined}
          outlineWidth={0.03}
          outlineColor="#000000"
        >
          {label}
        </Text>
        <Text
          position={[0, 1.0, 0]}
          fontSize={0.22}
          color={markerColor}
          anchorX="center"
          anchorY="middle"
          font={undefined}
        >
          {`${confidence}%`}
        </Text>
      </group>
    </Float>
  );
}


// ─── Depth Scale Legend (3D bars) ──────────────────────────────────
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


// ─── Sonar Scan Lines (waterfall visualization) ────────────────────
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


// ─── Main Component ────────────────────────────────────────────────
export default function Seabed3DView({ detections }) {
  return (
    <div className="w-full h-[500px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 relative">
      {/* HUD Overlay */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
        <div className="bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-mono text-cyan-400">
          3D Seafloor Bathymetric Reconstruction
        </div>
        <div className="bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700 text-[10px] font-mono text-slate-400">
          Hazards: <span className="text-cyan-400 font-bold">{detections.length}</span> • 
          Depth Range: <span className="text-emerald-400">-25m → 0m</span> •
          Resolution: <span className="text-amber-400">96×96</span>
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-3 right-3 z-10 bg-slate-900/70 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700 text-[10px] font-mono text-slate-500">
        Drag to rotate • Scroll to zoom • Right-drag to pan
      </div>

      <Canvas camera={{ position: [18, 16, 22], fov: 42 }} shadows>
        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <directionalLight position={[15, 25, 20]} intensity={1.0} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        <pointLight position={[0, 8, 0]} color="#0ea5e9" intensity={3} distance={30} />
        <pointLight position={[-15, 5, -10]} color="#0284c7" intensity={1.5} distance={25} />

        {/* Fog for underwater atmosphere */}
        <fog attach="fog" args={['#020617', 25, 65]} />

        {/* Terrain */}
        <BathymetryTerrain />

        {/* AUV/Towfish path */}
        <TowfishPath />
        <AnimatedTowfish />

        {/* Sonar scan visualization */}
        <SonarScanLines />

        {/* Underwater particles */}
        <UnderwaterParticles />

        {/* Depth legend */}
        <DepthLegend />

        {/* Hazard markers from detections */}
        {detections.map((item, idx) => (
          <HazardMarker
            key={idx}
            position={item.three_pos || [
              ((item.bbox[0] + item.bbox[2]) / 2 - 320) / 15,
              2.5,
              ((item.bbox[1] + item.bbox[3]) / 2 - 240) / 15
            ]}
            label={item.classification}
            confidence={item.confidence}
            classification={item.classification}
          />
        ))}

        {/* Controls */}
        <OrbitControls
          makeDefault
          maxPolarAngle={Math.PI / 2.05}
          minDistance={8}
          maxDistance={50}
          enableDamping
          dampingFactor={0.05}
          autoRotate
          autoRotateSpeed={0.3}
        />
      </Canvas>
    </div>
  );
}