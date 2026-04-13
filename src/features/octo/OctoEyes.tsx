import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import { RoundedBox } from '@react-three/drei';
import type { OctoAnimState } from './types';

interface OctoEyesProps {
  state: OctoAnimState;
}

function Eye({ position, state }: { position: [number, number, number]; state: OctoAnimState }) {
  const groupRef = useRef<THREE.Group>(null);
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    const blink = () => {
      setBlinking(true);
      setTimeout(() => setBlinking(false), 150);
    };
    const interval = setInterval(blink, 3000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  const { scaleY } = useSpring({
    scaleY: blinking
      ? 0.05
      : state === 'thinking'
        ? 0.5
        : state === 'speaking'
          ? 0.85
          : 1.0,
    config: { tension: 300, friction: 20 },
  });

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.lookAt(0, 0, 10);
    }
  });

  return (
    <animated.group ref={groupRef} position={position} scale-y={scaleY}>
      <RoundedBox args={[0.14, 0.28, 0.06]} radius={0.06} smoothness={4}>
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
      </RoundedBox>
    </animated.group>
  );
}

export default function OctoEyes({ state }: OctoEyesProps) {
  return (
    <group position={[0, -0.05, 1.28]}>
      <Eye position={[-0.2, 0, 0]} state={state} />
      <Eye position={[0.2, 0, 0]} state={state} />
    </group>
  );
}
