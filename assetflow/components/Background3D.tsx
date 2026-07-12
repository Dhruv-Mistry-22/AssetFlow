'use client';

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, PerspectiveCamera, Grid, Stars } from '@react-three/drei';
import * as THREE from 'three';

// An animated floating cube representing an "asset" or data packet
function FloatingAsset({ position, color, speed }: { position: [number, number, number], color: string, speed: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * speed) * 0.5;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * speed * 0.5) * 0.2;
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh position={position} ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshPhysicalMaterial 
        color={color} 
        transparent 
        opacity={0.8} 
        roughness={0.1}
        transmission={0.9} 
        thickness={0.5} 
      />
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
        <lineBasicMaterial color={color} linewidth={2} />
      </lineSegments>
    </mesh>
  );
}

// A subtle rotating abstract data structure
function AbstractStructure() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      // Very slow rotation
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={[5, -2, -10]}>
      {/* Central Hub */}
      <mesh position={[0, 2, 0]}>
        <octahedronGeometry args={[2, 0]} />
        <meshPhysicalMaterial color="#f97316" wireframe transparent opacity={0.3} />
      </mesh>
      
      {/* Floating Nodes */}
      <FloatingAsset position={[-4, 1, 3]} color="#f97316" speed={1.2} />
      <FloatingAsset position={[4, 3, -2]} color="#0ea5e9" speed={0.8} />
      <FloatingAsset position={[2, 0, 4]} color="#f97316" speed={1.5} />
      <FloatingAsset position={[-3, 4, -4]} color="#0ea5e9" speed={0.9} />
    </group>
  );
}

export default function Background3D() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.25] mix-blend-multiply">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 5, 10]} fov={50} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Environment preset="city" />
        
        <AbstractStructure />
        
        {/* Infinite Grid floor */}
        <Grid 
          position={[0, -3, 0]} 
          args={[100, 100]} 
          cellSize={1} 
          cellThickness={1} 
          cellColor="#cbd5e1" 
          sectionSize={5} 
          sectionThickness={1.5} 
          sectionColor="#94a3b8" 
          fadeDistance={30} 
          fadeStrength={1} 
        />
        
        {/* Subtle particle dust */}
        <Stars radius={50} depth={50} count={1000} factor={2} saturation={0} fade speed={1} />
      </Canvas>
    </div>
  );
}
