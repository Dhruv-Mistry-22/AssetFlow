'use client';

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';

// A clean, isometric wireframe block
function WireframeBlock({ position, size = [1, 1, 1], color = "#cbd5e1", speed = 0 }: { position: [number, number, number], size?: [number, number, number], color?: string, speed?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current && speed > 0) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * speed) * 0.2;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <boxGeometry args={size as [number, number, number]} />
        <meshBasicMaterial color="#f8fafc" transparent opacity={0.6} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(...(size as [number, number, number]))]} />
        <lineBasicMaterial color={color} linewidth={1} transparent opacity={0.4} />
      </lineSegments>
    </group>
  );
}

// A layout mimicking a clean, abstract server room / office space
function IsometricCityscape() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      // Very slow, soothing rotation for "smooth SaaS" feel
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={[0, -2, 0]}>
      {/* Base Grid Plate */}
      <lineSegments position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <gridHelper args={[40, 40, "#e2e8f0", "#f1f5f9"]} />
      </lineSegments>

      {/* Abstract Office / Warehouse Blocks */}
      <WireframeBlock position={[-4, 1, -4]} size={[4, 2, 4]} />
      <WireframeBlock position={[4, 1.5, -4]} size={[3, 3, 3]} />
      <WireframeBlock position={[-5, 0.5, 4]} size={[2, 1, 6]} />
      <WireframeBlock position={[3, 0.5, 5]} size={[4, 1, 2]} />
      
      {/* Floating Active "Data" Nodes (orange) */}
      <WireframeBlock position={[0, 4, 0]} size={[1, 1, 1]} color="#fb923c" speed={1.5} />
      <WireframeBlock position={[-2, 3, 2]} size={[0.5, 0.5, 0.5]} color="#fb923c" speed={2} />
      <WireframeBlock position={[4, 5, 2]} size={[0.8, 0.8, 0.8]} color="#94a3b8" speed={1.2} />
      
      {/* Connecting abstract paths */}
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(10, 10)]} />
        <lineBasicMaterial color="#cbd5e1" transparent opacity={0.2} />
      </lineSegments>
    </group>
  );
}

export default function Background3D() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none opacity-50 overflow-hidden">
      <Canvas>
        {/* Isometric camera setup */}
        <OrthographicCamera 
          makeDefault 
          position={[20, 20, 20]} 
          zoom={40} 
          near={-100} 
          far={100}
        />
        {/* Camera lookAt center is handled by default when position is offset but we can ensure it looks at 0,0,0 */}
        
        <ambientLight intensity={1} />
        <IsometricCityscape />
      </Canvas>
      
      {/* Gradient mask to fade out the edges */}
      <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-l from-white via-transparent to-transparent z-10" />
    </div>
  );
}
