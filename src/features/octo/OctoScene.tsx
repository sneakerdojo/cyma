import { Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import OctoOrb from './OctoOrb';
import OctoEyes from './OctoEyes';
import OctoParticles from './OctoParticles';
import type { OctoAnimState } from './types';

interface OctoSceneProps {
  state: OctoAnimState;
  fullHeight?: boolean;
}

function MouseTracker({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  const target = useRef(new THREE.Vector2(0, 0));
  const current = useRef(new THREE.Vector2(0, 0));
  const { viewport } = useThree();

  useFrame(({ pointer }) => {
    // Option C: skip animation when tab is hidden to save GPU on mobile.
    if (typeof document !== 'undefined' && document.hidden) return;
    if (!groupRef.current) return;

    // Smooth lerp toward mouse position
    target.current.set(pointer.x * 0.3, pointer.y * 0.2);
    current.current.lerp(target.current, 0.06);

    // Tilt the group toward the mouse
    groupRef.current.rotation.y = current.current.x * 0.5;
    groupRef.current.rotation.x = -current.current.y * 0.3;

    // Subtle position shift for parallax
    groupRef.current.position.x = current.current.x * viewport.width * 0.04;
    groupRef.current.position.y = current.current.y * viewport.height * 0.03;
  });

  return <group ref={groupRef}>{children}</group>;
}

function Scene({ state }: OctoSceneProps) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={0.8} color="#E8862A" />
      <pointLight position={[-5, -3, 3]} intensity={0.4} color="#F5A54B" />
      <pointLight position={[0, 0, 4]} intensity={0.2} color="#ffffff" />

      <MouseTracker>
        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.4}>
          <group>
            <OctoOrb state={state} />
            <OctoEyes state={state} />
          </group>
        </Float>
      </MouseTracker>

      <OctoParticles state={state} />

      {/* Replaced HDR Environment preset (external CDN) with local lights for
          reliable mobile loading — visually equivalent for a decorative orb. */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
    </>
  );
}

export default function OctoScene({ state, fullHeight = false }: OctoSceneProps) {
  return (
    <div className={`w-full ${fullHeight ? 'h-full' : 'h-[35vh] sm:h-[40vh]'}`}>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, fullHeight ? 11 : 4.5], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
        onCreated={({ gl }) => {
          // Handle WebGL context loss gracefully (common on mobile with
          // low GPU memory or when app is backgrounded).
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            console.warn('WebGL context lost');
          });
          gl.domElement.addEventListener('webglcontextrestored', () => {
            console.info('WebGL context restored');
          });
        }}
      >
        <Suspense fallback={null}>
          <Scene state={state} />
        </Suspense>
      </Canvas>
    </div>
  );
}
