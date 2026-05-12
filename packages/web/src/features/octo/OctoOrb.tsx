import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import type { OctoAnimState } from './types';

const vertexShader = `
  uniform float uTime;
  uniform float uDistort;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    float noise = snoise(position * 1.5 + uTime * 0.3) * uDistort;
    vec3 displaced = position + normal * noise;

    vPosition = displaced;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uBrightness;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);

    // Deep, rich iridescent colors
    vec3 deepOrange = vec3(0.78, 0.38, 0.08);
    vec3 ember = vec3(0.72, 0.22, 0.12);
    vec3 darkGold = vec3(0.8, 0.58, 0.0);
    vec3 hotCore = vec3(1.0, 0.7, 0.4);
    vec3 deepRust = vec3(0.6, 0.18, 0.1);
    vec3 midnight = vec3(0.12, 0.06, 0.02);

    float t = uTime * 0.35;
    float angle = atan(vNormal.y, vNormal.x);
    float blend1 = sin(angle * 2.0 + t) * 0.5 + 0.5;
    float blend2 = cos(angle * 3.0 - t * 0.7) * 0.5 + 0.5;
    float blend3 = sin(vNormal.z * 4.0 + t * 1.2) * 0.5 + 0.5;

    vec3 baseColor = mix(deepOrange, ember, blend1);
    baseColor = mix(baseColor, deepRust, blend2 * 0.4);
    baseColor = mix(baseColor, darkGold, blend3 * 0.35);

    vec3 fresnelColor = mix(baseColor, hotCore, fresnel * 0.7);

    float innerDark = pow(max(dot(viewDir, vNormal), 0.0), 3.0);
    fresnelColor = mix(fresnelColor, midnight, innerDark * 0.2);

    float hotSpot = pow(max(dot(vNormal, vec3(0.3, 0.5, 0.7)), 0.0), 8.0);
    fresnelColor += hotCore * hotSpot * 0.4;

    fresnelColor *= uBrightness;

    float alpha = mix(0.92, 1.0, 1.0 - fresnel * 0.3);

    gl_FragColor = vec4(fresnelColor, alpha);
  }
`;

interface OctoOrbProps {
  state: OctoAnimState;
}

export default function OctoOrb({ state }: OctoOrbProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDistort: { value: 0.04 },
      uBrightness: { value: 1.0 },
    }),
    []
  );

  const { scale } = useSpring({
    scale: state === 'thinking' ? 0.95 : 1.0,
    config: { tension: 120, friction: 14 },
  });

  useFrame(({ clock }) => {
    // Option C: skip animation when tab is hidden to save GPU on mobile.
    if (typeof document !== 'undefined' && document.hidden) return;
    if (!materialRef.current) return;

    const t = clock.getElapsedTime();
    materialRef.current.uniforms.uTime.value = t;

    const targetDistort = state === 'thinking' ? 0.08 : state === 'speaking' ? 0.05 : 0.03;
    materialRef.current.uniforms.uDistort.value +=
      (targetDistort - materialRef.current.uniforms.uDistort.value) * 0.05;

    const targetBright = state === 'speaking' ? 1.3 : state === 'thinking' ? 1.1 : 1.0;
    materialRef.current.uniforms.uBrightness.value +=
      (targetBright - materialRef.current.uniforms.uBrightness.value) * 0.05;

    if (state === 'thinking' && meshRef.current) {
      const pulse = Math.sin(t * 4) * 0.03;
      meshRef.current.scale.setScalar(0.95 + pulse);
    }

    if (state === 'speaking' && meshRef.current) {
      meshRef.current.position.y = Math.sin(t * 3) * 0.08;
    }

    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.15;
    }
  });

  return (
    <animated.mesh ref={meshRef} scale={scale}>
      <sphereGeometry args={[1.2, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
      />
    </animated.mesh>
  );
}
