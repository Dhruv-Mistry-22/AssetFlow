'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshTransmissionMaterial, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// Massive floating glass torus - the hero element
function GlassTorus() {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.3 + 0.5;
      ref.current.rotation.y = state.clock.elapsedTime * 0.08;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
      <mesh ref={ref} position={[3, 0.5, -2]} scale={2.5}>
        <torusGeometry args={[1, 0.35, 64, 128]} />
        <MeshTransmissionMaterial
          backside
          samples={16}
          resolution={512}
          transmission={0.95}
          roughness={0.05}
          thickness={0.5}
          ior={1.5}
          chromaticAberration={0.4}
          anisotropy={0.3}
          distortion={0.2}
          distortionScale={0.2}
          temporalDistortion={0.1}
          color="#fef3c7"
        />
      </mesh>
    </Float>
  );
}

// Floating glass sphere cluster
function GlassSphere({ position, scale = 1, speed = 1 }: { position: [number, number, number], scale?: number, speed?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * speed + position[0]) * 0.4;
    }
  });

  return (
    <mesh ref={ref} position={position} scale={scale}>
      <sphereGeometry args={[1, 64, 64]} />
      <MeshTransmissionMaterial
        backside
        samples={8}
        resolution={256}
        transmission={0.9}
        roughness={0.1}
        thickness={0.3}
        ior={1.25}
        chromaticAberration={0.3}
        color="#fed7aa"
      />
    </mesh>
  );
}

// Floating metallic orange accent cube
function AccentCube({ position, size = 0.4, speed = 1 }: { position: [number, number, number], size?: number, speed?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * speed * 0.3;
      ref.current.rotation.y = state.clock.elapsedTime * speed * 0.5;
      ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * speed * 0.7 + position[0]) * 0.3;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.3}>
      <mesh ref={ref} position={position}>
        <boxGeometry args={[size, size, size]} />
        <meshPhysicalMaterial
          color="#f97316"
          metalness={0.9}
          roughness={0.1}
          envMapIntensity={2}
        />
      </mesh>
    </Float>
  );
}

// Glowing particle field
function ParticleField() {
  const count = 200;
  const ref = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    return pos;
  }, []);

  const sizes = useMemo(() => {
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      s[i] = Math.random() * 0.05 + 0.02;
    }
    return s;
  }, []);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.02;
      const positions = ref.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        positions[i * 3 + 1] += Math.sin(state.clock.elapsedTime * 0.5 + i * 0.1) * 0.002;
      }
      ref.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color="#f97316"
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// Glowing orange ring orbiting element
function OrbitRing({ radius = 3, speed = 0.3, yOffset = 0 }: { radius?: number, speed?: number, yOffset?: number }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.z = state.clock.elapsedTime * speed;
    }
  });

  return (
    <mesh ref={ref} position={[3, yOffset, -2]}>
      <torusGeometry args={[radius, 0.015, 16, 200]} />
      <meshBasicMaterial color="#fb923c" transparent opacity={0.4} />
    </mesh>
  );
}

// Floating icosahedron with wireframe
function FloatingIcosahedron() {
  const wireRef = useRef<THREE.LineSegments>(null);
  const solidRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (wireRef.current && solidRef.current) {
      wireRef.current.rotation.x = state.clock.elapsedTime * 0.1;
      wireRef.current.rotation.y = state.clock.elapsedTime * 0.15;
      solidRef.current.rotation.x = state.clock.elapsedTime * 0.1;
      solidRef.current.rotation.y = state.clock.elapsedTime * 0.15;
    }
  });

  return (
    <Float speed={1} rotationIntensity={0.3} floatIntensity={0.5}>
      <group position={[-5, 2, -4]} scale={1.8}>
        <mesh ref={solidRef}>
          <icosahedronGeometry args={[1, 0]} />
          <meshPhysicalMaterial
            color="#fff7ed"
            metalness={0.1}
            roughness={0.2}
            transparent
            opacity={0.3}
            envMapIntensity={1}
          />
        </mesh>
        <lineSegments ref={wireRef}>
          <edgesGeometry args={[new THREE.IcosahedronGeometry(1, 0)]} />
          <lineBasicMaterial color="#f97316" transparent opacity={0.5} />
        </lineSegments>
      </group>
    </Float>
  );
}

export default function Background3D() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <Canvas
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
        camera={{ position: [0, 2, 12], fov: 45 }}
      >
        {/* Premium lighting setup */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} color="#fff7ed" />
        <directionalLight position={[-5, 5, -5]} intensity={0.5} color="#fed7aa" />
        <spotLight position={[0, 15, 0]} angle={0.3} penumbra={1} intensity={2} color="#fff" />
        <pointLight position={[5, 0, 5]} intensity={1} color="#f97316" distance={15} />

        {/* HDR environment for realistic reflections */}
        <Environment preset="city" />

        {/* Hero Elements */}
        <GlassTorus />
        <GlassSphere position={[-3.5, -0.5, -1]} scale={0.8} speed={0.8} />
        <GlassSphere position={[6, 1.5, -5]} scale={0.5} speed={1.2} />
        <GlassSphere position={[-1, 3, -6]} scale={0.4} speed={1.5} />

        {/* Accent Elements */}
        <AccentCube position={[-2, 2.5, 1]} size={0.35} speed={1} />
        <AccentCube position={[5.5, -1, 2]} size={0.25} speed={1.5} />
        <AccentCube position={[1, -1.5, -3]} size={0.2} speed={0.8} />
        <AccentCube position={[-4.5, 0.5, -3]} size={0.15} speed={2} />

        {/* Wireframe Structure */}
        <FloatingIcosahedron />

        {/* Orbital Rings */}
        <OrbitRing radius={3.5} speed={0.15} yOffset={0.5} />
        <OrbitRing radius={4.2} speed={-0.1} yOffset={0.5} />

        {/* Particle Field */}
        <ParticleField />

        {/* Ground shadows for depth */}
        <ContactShadows 
          position={[0, -3, 0]} 
          opacity={0.15} 
          scale={30} 
          blur={2.5} 
          far={10} 
          color="#f97316"
        />
      </Canvas>

      {/* Subtle gradient overlays to blend into the white UI */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-white/80 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-white/60 via-transparent to-white/40 pointer-events-none" />
    </div>
  );
}
