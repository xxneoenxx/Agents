"use client";

import { Suspense, useRef, useMemo, useState } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import {
  Environment,
  Lightformer,
  Float,
  ContactShadows,
  Sparkles,
  Html,
  AdaptiveDpr,
} from "@react-three/drei";
import * as THREE from "three";
import { services } from "@/config/services";

/* -------------------------------------------------------------------------- */
/*  Hilfsfunktion: aktueller Scroll-Fortschritt (0..1) ohne React-Rerender    */
/* -------------------------------------------------------------------------- */
function readScrollProgress() {
  if (typeof window === "undefined") return 0;
  const span = window.innerHeight * 2.2;
  return Math.min(1, Math.max(0, window.scrollY / span));
}

/* -------------------------------------------------------------------------- */
/*  Stahltank – metallischer Zylinder mit Domdeckel, Füßen und Rohr           */
/* -------------------------------------------------------------------------- */
function Tank() {
  const ref = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.15;
  });

  return (
    <group ref={ref}>
      {/* Korpus */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[1, 1, 2.6, 64, 1, false]} />
        <meshStandardMaterial color="#9aa7b8" metalness={0.95} roughness={0.28} />
      </mesh>
      {/* Domdeckel oben */}
      <mesh position={[0, 1.3, 0]} castShadow>
        <sphereGeometry args={[1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#aab6c6" metalness={0.95} roughness={0.22} />
      </mesh>
      {/* Boden */}
      <mesh position={[0, -1.3, 0]} rotation={[Math.PI, 0, 0]} castShadow>
        <sphereGeometry args={[1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#8493a6" metalness={0.9} roughness={0.3} />
      </mesh>
      {/* Spannbänder */}
      {[0.7, -0.7].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <torusGeometry args={[1.01, 0.04, 16, 64]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.6} roughness={0.35} emissive="#f59e0b" emissiveIntensity={0.15} />
        </mesh>
      ))}
      {/* Stutzen / Rohr oben */}
      <mesh position={[0.35, 1.75, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.7, 24]} />
        <meshStandardMaterial color="#cdd6e2" metalness={1} roughness={0.18} />
      </mesh>
      <mesh position={[0.35, 2.1, 0.18]} rotation={[Math.PI / 2.4, 0, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.5, 24]} />
        <meshStandardMaterial color="#cdd6e2" metalness={1} roughness={0.18} />
      </mesh>
      {/* Füllstands-Glas (Akzent) */}
      <mesh position={[1.02, 0, 0]}>
        <boxGeometry args={[0.06, 1.6, 0.18]} />
        <meshStandardMaterial color="#2dd4bf" emissive="#2dd4bf" emissiveIntensity={0.5} metalness={0.2} roughness={0.1} transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Station-Knoten – kreisen um den Tank, beschriften die Leistungen          */
/* -------------------------------------------------------------------------- */
function StationNode({
  index,
  total,
  label,
  accent,
  onSelect,
}: {
  index: number;
  total: number;
  label: string;
  accent: "amber" | "teal";
  onSelect: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const radius = 3.1;
  const baseAngle = (index / total) * Math.PI * 2;
  const color = accent === "amber" ? "#f59e0b" : "#2dd4bf";

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * 0.12;
    const angle = baseAngle + t;
    ref.current.position.x = Math.cos(angle) * radius;
    ref.current.position.z = Math.sin(angle) * radius;
    ref.current.position.y = Math.sin(angle * 2 + index) * 0.35;
    const s = hovered ? 1.6 : 1;
    ref.current.scale.lerp(new THREE.Vector3(s, s, s), 0.15);
  });

  return (
    <group ref={ref}>
      <mesh
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <icosahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hovered ? 1.4 : 0.7} metalness={0.4} roughness={0.2} />
      </mesh>
      <Html center distanceFactor={9} position={[0, 0.5, 0]} zIndexRange={[10, 0]}>
        <button
          onClick={onSelect}
          className="pointer-events-auto whitespace-nowrap rounded-full border border-white/15 bg-steel-900/80 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur transition-colors hover:border-amber-400/60 hover:text-amber-300"
          tabIndex={-1}
          aria-hidden
        >
          {label}
        </button>
      </Html>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Szene – Gruppe, die auf Scroll & Pointer reagiert                          */
/* -------------------------------------------------------------------------- */
function Scene({ onSelect }: { onSelect: (id: string) => void }) {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);

  const stations = useMemo(
    () => services.slice(0, 6).map((s) => ({ id: s.id, label: s.station, accent: s.accent })),
    [],
  );

  useFrame((state) => {
    const p = readScrollProgress();
    if (group.current) {
      // Pointer-Parallax + Scroll-Drehung
      const targetRotY = state.pointer.x * 0.3 + p * Math.PI * 1.5;
      const targetRotX = -state.pointer.y * 0.15 + 0.1;
      group.current.rotation.y += (targetRotY - group.current.rotation.y) * 0.06;
      group.current.rotation.x += (targetRotX - group.current.rotation.x) * 0.06;
      // leichtes Wegzoomen beim Scrollen
      const targetY = -0.2 - p * 1.2;
      group.current.position.y += (targetY - group.current.position.y) * 0.06;
    }
    if (ring.current) ring.current.rotation.z += 0.002;
  });

  return (
    <group ref={group}>
      <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.6}>
        <Tank />
      </Float>

      {/* Orbit-Ring */}
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.1, 0.012, 16, 120]} />
        <meshStandardMaterial color="#475569" emissive="#475569" emissiveIntensity={0.3} />
      </mesh>

      {stations.map((s, i) => (
        <StationNode
          key={s.id}
          index={i}
          total={stations.length}
          label={s.label}
          accent={s.accent}
          onSelect={() => onSelect(s.id)}
        />
      ))}

      <Sparkles count={60} scale={9} size={2.2} speed={0.3} color="#fbbf24" opacity={0.5} />
      <ContactShadows position={[0, -1.7, 0]} opacity={0.5} scale={12} blur={2.6} far={4} color="#020617" />
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Canvas-Wrapper (Default-Export, wird dynamisch ssr:false geladen)         */
/* -------------------------------------------------------------------------- */
export default function HeroScene() {
  const handleSelect = (_id: string) => {
    const el = document.getElementById("leistungen");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 0.5, 8], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      className="!absolute inset-0"
    >
      <AdaptiveDpr pixelated />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-6, 2, -4]} intensity={40} color="#2dd4bf" />
      <pointLight position={[6, -2, 4]} intensity={30} color="#f59e0b" />

      {/* Prozedurale Umgebung (keine externen Assets nötig) */}
      <Environment resolution={256}>
        <Lightformer intensity={2} position={[0, 5, -5]} scale={[10, 5, 1]} color="#94a3b8" />
        <Lightformer intensity={1.5} position={[-5, 1, 1]} scale={[4, 4, 1]} color="#2dd4bf" />
        <Lightformer intensity={1.5} position={[5, 0, 1]} scale={[4, 4, 1]} color="#f59e0b" />
      </Environment>

      <Suspense fallback={null}>
        <Scene onSelect={handleSelect} />
      </Suspense>
    </Canvas>
  );
}
