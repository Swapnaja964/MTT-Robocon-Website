"use client";
import React, { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars, Html } from "@react-three/drei";
import * as THREE from "three";
import { useEffect } from "react";

type AlumniCard = {
  title: string;
  location: string;
  src?: string;
  designation?: string;
  linkedIn?: string;
};

type Props = {
  cards: AlumniCard[];
};

const GEO: Record<string, { lat: number; lng: number }> = {
  hyderabad: { lat: 17.385, lng: 78.4867 },
  pune: { lat: 18.5204, lng: 73.8567 },
  mumbai: { lat: 19.076, lng: 72.8777 },
  seattle: { lat: 47.6062, lng: -122.3321 },
  berlin: { lat: 52.52, lng: 13.405 }, 
  germany: { lat: 51.1657, lng: 10.4515 },
  "new haven": { lat: 41.3083, lng: -72.9279 },
  "new york": { lat: 40.7128, lng: -74.006 },
  "st. louis": { lat: 38.627, lng: -90.1994 },
  "st louis": { lat: 38.627, lng: -90.1994 },
  boulder: { lat: 40.01499, lng: -105.27055 },
  "fort smith": { lat: 35.3859, lng: -94.3985 },
  india: { lat: 20.5937, lng: 78.9629 },
  usa: { lat: 39.8283, lng: -98.5795 },
  "united states": { lat: 39.8283, lng: -98.5795 },
  "unites states": { lat: 39.8283, lng: -98.5795 },
  "washington": { lat: 47.7511, lng: -120.7401 },
};

function normalizeKey(s: string) {
  return s.trim().toLowerCase();
}

function lookupCoords(location: string): { lat: number; lng: number } | null {
  const raw = normalizeKey(location);
  if (GEO[raw]) return GEO[raw];
  const parts = raw.split(",").map((p) => p.trim());
  for (const p of parts) {
    if (GEO[p]) return GEO[p];
  }
  if (parts.length > 1) {
    const city = parts[0];
    const country = parts[parts.length - 1];
    if (GEO[city]) return GEO[city];
    if (GEO[country]) return GEO[country];
  }
  return null;
}

function latLngToXYZ(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

export default function AlumniGlobe({ cards }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const points = useMemo(() => {
    const list: {
      position: THREE.Vector3;
      title: string;
      location: string;
      designation?: string;
      linkedIn?: string;
      image?: string;
    }[] = [];
    for (const c of cards) {
      const coords = lookupCoords(c.location);
      if (!coords) continue;
      const pos = latLngToXYZ(coords.lat, coords.lng, 1.2);
      list.push({
        position: pos,
        title: c.title,
        location: c.location,
        designation: c.designation,
        linkedIn: c.linkedIn,
        image: c.src,
      });
    }
    return list;
  }, [cards]);

  const [outlineTexture, setOutlineTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let mounted = true;
    const loader = new THREE.TextureLoader();
    loader.load(
      "/textures/world-outline.png",
      (tex) => {
        if (!mounted) return;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        setOutlineTexture(tex);
      },
      undefined,
      () => {
        if (!mounted) return;
        setOutlineTexture(null);
      }
    );
    return () => {
      mounted = false;
    };
  }, []);

  const sphereMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#1f2937"),
        roughness: 0.85,
        metalness: 0.1,
      }),
    []
  );

  return (
    <div className="w-full h-[800px] md:h-[880px] rounded-xl overflow-hidden bg-black/30 backdrop-blur-sm">
      <Canvas camera={{ position: [0, 0, 2.6], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 2, 2]} intensity={0.8} />
        <hemisphereLight args={[0xffffff, 0x444444, 0.5]} />
        <Stars radius={50} depth={15} count={2000} factor={4} saturation={0} fade />
        <OrbitControls enableZoom enablePan minDistance={2.1} maxDistance={4.2} />
        <group>
          <mesh material={sphereMat}>
            <sphereGeometry args={[1.2, 64, 64]} />
          </mesh>
          <mesh visible={!outlineTexture}>
            <sphereGeometry args={[1.205, 32, 32]} />
            <meshBasicMaterial color="#334155" wireframe transparent opacity={0.35} />
          </mesh>
          {outlineTexture ? (
            <mesh>
              <sphereGeometry args={[1.205, 64, 64]} />
              <meshBasicMaterial map={outlineTexture} transparent opacity={0.6} color={"#94a3b8"} />
            </mesh>
          ) : null}
          {points.map((p, i) => (
            <group key={`${p.title}-${i}`} position={p.position.clone().multiplyScalar(1.01)}>
              <mesh
                onPointerOver={() => setHovered(i)}
                onPointerOut={() => setHovered((prev) => (prev === i ? null : prev))}
              >
                <sphereGeometry args={[0.02, 16, 16]} />
                <meshStandardMaterial color="#c73808" emissive="#c73808" emissiveIntensity={0.6} />
              </mesh>
              {hovered === i && (
                <Html distanceFactor={8} center>
                  <div className="px-3 py-2 rounded-md bg-black/85 text-white text-xs shadow-lg border border-white/10 whitespace-nowrap max-w-[260px]">
                    <div className="flex items-center gap-2">
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image} alt={p.title} className="w-9 h-9 rounded-full object-cover" />
                      ) : null}
                      <div className="font-semibold">{p.title}</div>
                    </div>
                    {p.designation ? <div className="opacity-90 mt-1">{p.designation}</div> : null}
                    <div className="opacity-70 mt-0.5">{p.location}</div>
                    {p.linkedIn ? (
                      <a
                        href={p.linkedIn}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block mt-1 text-[11px] text-blue-300 hover:underline"
                      >
                        View LinkedIn
                      </a>
                    ) : null}
                  </div>
                </Html>
              )}
            </group>
          ))}
        </group>
      </Canvas>
    </div>
  );
}
