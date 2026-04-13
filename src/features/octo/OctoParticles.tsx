import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { OctoAnimState } from './types';

const PARTICLE_COUNT = 50;
const COLORS = [0xe8862a, 0xf5a54b, 0xffd700, 0xff8c42];

interface OctoParticlesProps {
  state: OctoAnimState;
}

export default function OctoParticles({ state }: OctoParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, colors, velocities, phases } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const col = new Float32Array(PARTICLE_COUNT * 3);
    const vel = new Float32Array(PARTICLE_COUNT * 3);
    const ph = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.5 + Math.random() * 1.5;

      pos[i3] = Math.cos(angle) * radius;
      pos[i3 + 1] = (Math.random() - 0.5) * 2;
      pos[i3 + 2] = Math.sin(angle) * radius;

      vel[i3] = (Math.random() - 0.5) * 0.02;
      vel[i3 + 1] = (Math.random() - 0.5) * 0.02;
      vel[i3 + 2] = (Math.random() - 0.5) * 0.02;

      ph[i] = Math.random() * Math.PI * 2;

      const color = new THREE.Color(COLORS[Math.floor(Math.random() * COLORS.length)]);
      col[i3] = color.r;
      col[i3 + 1] = color.g;
      col[i3 + 2] = color.b;
    }

    return { positions: pos, colors: col, velocities: vel, phases: ph };
  }, []);

  useFrame(({ clock }) => {
    // Option C: skip animation when tab is hidden to save GPU on mobile.
    if (typeof document !== 'undefined' && document.hidden) return;
    if (!pointsRef.current) return;
    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const t = clock.getElapsedTime();

    const speed = state === 'thinking' ? 2.0 : state === 'speaking' ? 1.5 : 0.8;
    const orbitRadius = state === 'thinking' ? 1.8 : state === 'speaking' ? 2.5 : 2.0;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const phase = phases[i];

      const angle = t * speed * 0.3 + phase;
      const r = orbitRadius + Math.sin(t * 0.5 + phase) * 0.5;
      const y = Math.sin(t * 0.7 + phase * 2) * 1.0;

      posAttr.array[i3] = Math.cos(angle) * r;
      posAttr.array[i3 + 1] = y;
      posAttr.array[i3 + 2] = Math.sin(angle) * r;
    }

    posAttr.needsUpdate = true;
    pointsRef.current.rotation.y = t * 0.1;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={PARTICLE_COUNT}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          array={colors}
          count={PARTICLE_COUNT}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
