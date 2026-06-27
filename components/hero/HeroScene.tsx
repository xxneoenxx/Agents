"use client";

import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";
import { TankerModel } from "./TankerModel";

/** Aufsteigende Funken — Werkstatt-Atmosphäre. */
function Sparks({ count = 60 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
      speeds[i] = 0.4 + Math.random() * 0.8;
    }
    return { positions, speeds };
  }, [count]);

  useFrame((_, delta) => {
    const pts = ref.current;
    if (!pts) return;
    const arr = pts.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += speeds[i] * delta;
      if (arr[i * 3 + 1] > 3.2) arr[i * 3 + 1] = -3.2;
    }
    pts.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#f2a516" size={0.06} sizeAttenuation transparent opacity={0.8} />
    </points>
  );
}

export default function HeroScene() {
  const reduce = useReducedMotion() ?? false;
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Auf Desktop steht das Modell in der rechten Bildhälfte, frei von der Headline.
  const modelX = isDesktop ? 2.1 : 0;

  return (
    <Canvas
      camera={{ position: [6, 2.4, 7], fov: 42 }}
      dpr={[1, 1.8]}
      gl={{ antialias: true, alpha: true }}
      className="!absolute inset-0"
    >
      <color attach="background" args={["#14181c"]} />
      <fog attach="fog" args={["#14181c", 12, 24]} />

      {/* Beleuchtung — gebürstetes Metall ohne HDR-Map */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[6, 8, 4]} intensity={1.4} color="#ffffff" />
      <directionalLight position={[-6, 3, -4]} intensity={0.8} color="#7fb0ff" />
      <pointLight position={[-2, 1, 5]} intensity={40} color="#f2a516" distance={14} />
      <pointLight position={[4, -1, -3]} intensity={18} color="#ff5a1f" distance={12} />

      <Suspense fallback={null}>
        <group position={[modelX, 0.3, 0]}>
          <TankerModel reduce={reduce} showCallouts={isDesktop} />
        </group>
        <ContactShadows
          position={[modelX, -1.75, 0]}
          opacity={0.5}
          scale={16}
          blur={2.6}
          far={5}
          color="#000000"
        />
        {!reduce && <Sparks />}
      </Suspense>

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate={false}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.9}
        rotateSpeed={0.6}
      />
    </Canvas>
  );
}
