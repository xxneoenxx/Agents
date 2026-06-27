"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, Html } from "@react-three/drei";
import * as THREE from "three";

const ALU = "#c3cbd3";
const ALU_DARK = "#8b97a3";
const STEEL = "#2c343d";
const ADR = "#f2a516";

function Callout({
  position,
  code,
  label,
}: {
  position: [number, number, number];
  code: string;
  label: string;
}) {
  return (
    <Html position={position} center distanceFactor={9} zIndexRange={[20, 0]}>
      <div className="pointer-events-none flex select-none items-center gap-2 whitespace-nowrap rounded-full border border-adr/60 bg-graphit/85 px-3 py-1.5 backdrop-blur-sm">
        <span className="font-mono text-[10px] text-adr">{code}</span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-papier">{label}</span>
      </div>
    </Html>
  );
}

function Wheel({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, -1.15, z]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.55, 0.55, 0.42, 32]} />
        <meshStandardMaterial color="#15191d" metalness={0.4} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.06, 20]} />
        <meshStandardMaterial color={ALU_DARK} metalness={0.95} roughness={0.25} />
      </mesh>
    </group>
  );
}

export function TankerModel({
  reduce = false,
  showCallouts = true,
}: {
  reduce?: boolean;
  showCallouts?: boolean;
}) {
  const group = useRef<THREE.Group>(null);

  const aluMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: ALU,
        metalness: 0.95,
        roughness: 0.28,
      }),
    [],
  );
  const steelMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: STEEL, metalness: 0.7, roughness: 0.5 }),
    [],
  );

  useFrame((state) => {
    if (!group.current || reduce) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.y = t * 0.18;
  });

  // Trennringe der Tankkammern
  const rings = [-1.7, -0.55, 0.6, 1.75];

  return (
    <group position={[0, 0, 0]} scale={1}>
      <group ref={group}>
      <Float speed={reduce ? 0 : 1.2} rotationIntensity={0} floatIntensity={reduce ? 0 : 0.5}>
        {/* Tankkörper */}
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow material={aluMat}>
          <cylinderGeometry args={[1.15, 1.15, 5, 48]} />
        </mesh>
        {/* gewölbte Tankenden */}
        <mesh position={[2.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={aluMat}>
          <sphereGeometry args={[1.15, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <mesh position={[-2.5, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={aluMat}>
          <sphereGeometry args={[1.15, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>

        {/* Kammer-Trennringe (Schweißnähte) */}
        {rings.map((x) => (
          <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[1.16, 0.05, 12, 48]} />
            <meshStandardMaterial color={ALU_DARK} metalness={0.9} roughness={0.4} />
          </mesh>
        ))}

        {/* Domdeckel oben */}
        {[-1.1, 0.05, 1.2].map((x) => (
          <mesh key={`dom-${x}`} position={[x, 1.05, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.22, 20]} />
            <meshStandardMaterial color={ALU_DARK} metalness={0.95} roughness={0.3} />
          </mesh>
        ))}

        {/* Chassis-Träger */}
        <mesh position={[0, -1.0, 0]} material={steelMat}>
          <boxGeometry args={[5.6, 0.22, 1.4]} />
        </mesh>

        {/* Fahrerkabine */}
        <group position={[3.15, -0.35, 0]}>
          <mesh material={steelMat}>
            <boxGeometry args={[0.9, 1.25, 1.45]} />
          </mesh>
          <mesh position={[0.18, 0.25, 0]}>
            <boxGeometry args={[0.7, 0.55, 1.3]} />
            <meshStandardMaterial color="#0e1316" metalness={0.3} roughness={0.2} />
          </mesh>
        </group>

        {/* ADR-Warntafel */}
        <mesh position={[-2.95, -0.55, 0]}>
          <boxGeometry args={[0.05, 0.4, 0.6]} />
          <meshStandardMaterial color={ADR} emissive={ADR} emissiveIntensity={0.25} />
        </mesh>

        {/* Räder */}
        <Wheel x={2.4} z={0.75} />
        <Wheel x={2.4} z={-0.75} />
        <Wheel x={-1.4} z={0.75} />
        <Wheel x={-1.4} z={-0.75} />
        <Wheel x={-2.3} z={0.75} />
        <Wheel x={-2.3} z={-0.75} />

      </Float>
      </group>

      {/* Technik-Callouts — statisch, damit sie frei von der Headline bleiben */}
      {showCallouts && (
        <group>
          <Callout position={[-0.5, 2.1, 0]} code="01" label="Schneiden" />
          <Callout position={[1.7, 1.6, 0]} code="04" label="Lackieren" />
          <Callout position={[1.0, 0.0, 1.3]} code="03" label="Schweißen" />
          <Callout position={[0.4, -1.6, 1.0]} code="02" label="Kanten" />
        </group>
      )}
    </group>
  );
}
