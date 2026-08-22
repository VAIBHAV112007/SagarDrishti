import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Grid } from '@react-three/drei';

function AnomalyMarker({ position, label, confidence }) {
  const meshRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + Math.sin(t * 3) * 0.15);
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={0.8} wireframe />
      </mesh>
      <Text
        position={[0, 1.2, 0]}
        fontSize={0.4}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {`${label} (${confidence}%)`}
      </Text>
    </group>
  );
}

function BathymetryTerrain() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
      <planeGeometry args={[40, 40, 32, 32]} />
      <meshStandardMaterial color="#0f172a" wireframe />
    </mesh>
  );
}

export default function Seabed3DView({ detections }) {
  return (
    <div className="w-full h-[420px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 relative">
      <div className="absolute top-3 left-3 z-10 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-mono text-cyan-400">
        Three.js 3D Acoustic Seafloor Bathymetry
      </div>
      <Canvas camera={{ position: [0, 14, 18], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 20, 15]} intensity={1.2} />
        <pointLight position={[0, 5, 0]} color="#38bdf8" intensity={2} />

        <BathymetryTerrain />
        <Grid infiniteGrid cellSize={1} sectionSize={5} cellColor="#1e293b" sectionColor="#0284c7" />

        {/* Survey Drone Trajectory Line */}
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([0, 0, -20, 0, 0, 20])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#38bdf8" linewidth={2} />
        </line>

        {/* Render 3D Pins from backend detection */}
        {detections.map((item, idx) => (
          <AnomalyMarker
            key={idx}
            position={item.three_pos}
            label={item.classification}
            confidence={item.confidence}
          />
        ))}

        <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.1} />
      </Canvas>
    </div>
  );
}