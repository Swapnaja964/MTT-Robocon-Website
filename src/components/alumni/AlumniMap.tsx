"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { geoEquirectangular, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeoJsonProperties } from "geojson";
import type { Topology, Objects, GeometryObject } from "topojson-specification";
import { select } from "d3-selection";
import { zoom as d3zoom, zoomIdentity } from "d3-zoom";
import { motion } from "motion/react";

type AlumniCard = {
  title: string;
  location: string;
  src?: string;
  designation?: string;
  linkedIn?: string;
};

type Props = {
  cards: AlumniCard[];
  accent?: string;
};

const WIDTH = 2200;
const HEIGHT = 1000;

function normalizeKey(s: string) {
  return s.trim().toLowerCase();
}

const GEO: Record<string, { lat: number; lng: number }> = {
  hyderabad: { lat: 17.385, lng: 78.4867 },
  pune: { lat: 18.5204, lng: 73.8567 },
  mumbai: { lat: 19.076, lng: 72.8777 },
  seattle: { lat: 47.6062, lng: -122.3321 },
  germany: { lat: 51.1657, lng: 10.4515 },
  "new haven": { lat: 41.3083, lng: -72.9279 },
  "new york": { lat: 40.7128, lng: -74.006 },
  "st. louis": { lat: 38.627, lng: -90.1994 },
  "st louis": { lat: 38.627, lng: -90.1994 },
  boulder: { lat: 40.01499, lng: -105.27055 },
  "boulder, co": { lat: 40.01499, lng: -105.27055 },
  "fort smith": { lat: 35.3859, lng: -94.3985 },
  india: { lat: 20.5937, lng: 78.9629 },
  usa: { lat: 39.8283, lng: -98.5795 },
  "united states": { lat: 39.8283, lng: -98.5795 },
  "unites states": { lat: 39.8283, lng: -98.5795 },
  "st. louis, usa": { lat: 38.627, lng: -90.1994 },
  "pune, india": { lat: 18.5204, lng: 73.8567 },
  "seattle, usa": { lat: 47.6062, lng: -122.3321 },
};

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

// Projection handled by d3-geo; helper removed.

export default function AlumniMap({ cards, accent = "#c73808" }: Props) {
  const viewWidth = WIDTH;
  const viewHeight = HEIGHT;

  const [land, setLand] = useState<GeoJSON.FeatureCollection | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const worldRaw = (await import("world-atlas/countries-110m.json")).default as unknown;
        const worldTopo = worldRaw as Topology<Objects<GeoJsonProperties>>;
        const countriesObj = (worldRaw as { objects: { countries: GeometryObject } }).objects.countries;
        const landFc = feature(worldTopo, countriesObj) as unknown as GeoJSON.FeatureCollection;
        if (mounted) setLand(landFc);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[AlumniMap] Failed to load world-atlas:", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const projection = useMemo(() => {
    if (!land) return null;
    return geoEquirectangular().fitSize([viewWidth, viewHeight], land);
  }, [land, viewWidth, viewHeight]);

  const pathGen = useMemo(() => (projection ? geoPath(projection) : null), [projection]);

  const groups = useMemo(() => {
    if (!projection) return new Map<string, { center: { x: number; y: number }; members: AlumniCard[] }>();
    const g = new Map<string, { center: { x: number; y: number }; members: AlumniCard[] }>();
    for (const c of cards) {
      const coords = lookupCoords(c.location);
      if (!coords) continue;
      const proj = projection([coords.lng, coords.lat]);
      if (!proj) continue;
      const x = proj[0];
      const y = proj[1];
      const key = `${x.toFixed(2)},${y.toFixed(2)}`;
      const existing = g.get(key);
      if (existing) {
        existing.members.push(c);
      } else {
        g.set(key, { center: { x, y }, members: [c] });
      }
    }
    return g;
  }, [cards, projection]);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    const svgSel = select(svgRef.current);
    const gSel = select(gRef.current);
    const zoom = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 6])
      .on("zoom", (ev) => {
        gSel.attr("transform", ev.transform.toString());
      });
    svgSel.call(zoom).call(zoom.transform, zoomIdentity);
    return () => {
      svgSel.on(".zoom", null);
    };
  }, [svgRef, gRef]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-black/30 backdrop-blur-sm">
      <div className="relative w-full aspect-[16/5]">
        <svg
          viewBox={`0 0 ${viewWidth} ${viewHeight}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          ref={svgRef}
        >
          <defs>
            <pattern id="dotPattern" width="9.2" height="9.2" patternUnits="userSpaceOnUse">
              <circle cx="2.2" cy="2.2" r="1.6" fill="#FFFFFF35" />
            </pattern>
            <filter id="pinGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <clipPath id="landClip">
              {land && pathGen
                ? land.features.map((f, idx) => {
                    const d = pathGen(f) || undefined;
                    return <path key={idx} d={d} />;
                  })
                : null}
            </clipPath>
          </defs>
          <g ref={gRef}>
            {/* Dotted pattern clipped to land */}
            <g clipPath="url(#landClip)">
              <rect width={viewWidth} height={viewHeight} fill="url(#dotPattern)" />
            </g>
            {/* Land stroke (slightly thicker) */}
            <g fill="none" stroke="#334155" strokeWidth={1.2}>
              {land && pathGen
                ? land.features.map((f, idx) => {
                    const d = pathGen(f) || undefined;
                    return <path key={`outline-${idx}`} d={d} />;
                  })
                : null}
            </g>
            {/* Pins with cluster + hover radial spread */}
            {Array.from(groups.entries()).map(([key, { center, members }]) => {
              const isCluster = members.length > 1;
              const expanded = isCluster && hoveredKey === key;
              if (!expanded) {
                const count = members.length;
                return (
                  <g
                    key={`cluster-${key}`}
                    transform={`translate(${center.x}, ${center.y})`}
                    onMouseEnter={() => setHoveredKey(key)}
                    onMouseLeave={() => setHoveredKey((prev) => (prev === key ? null : prev))}
                    style={{ cursor: isCluster ? "pointer" : "default" }}
                  >
                    <circle r={6} fill={accent} filter="url(#pinGlow)" />
                    {isCluster && (
                      <g transform="translate(8,-8)">
                        <rect rx="3" ry="3" width="18" height="14" fill="#111827" opacity="0.9" />
                        <text
                          x={9}
                          y={10}
                          textAnchor="middle"
                          fontSize="10"
                          fill="#F5F5F5"
                          style={{ pointerEvents: "none" }}
                        >
                          +{count - 1}
                        </text>
                      </g>
                    )}
                    <title>
                      {isCluster ? `${members[0].location} — ${count} alumni` : members[0].title}
                    </title>
                  </g>
                );
              }
              const total = members.length;
              const radius = 14;
              return (
                <g
                  key={`expanded-${key}`}
                  onMouseLeave={() => setHoveredKey((prev) => (prev === key ? null : prev))}
                >
                  {members.map((m, idx) => {
                    const angle = (2 * Math.PI * idx) / total;
                    const x = center.x + Math.cos(angle) * radius;
                    const y = center.y + Math.sin(angle) * radius;
                    return (
                      <motion.g
                        key={`${m.title}-${idx}`}
                        initial={{ x: center.x, y: center.y }}
                        animate={{ x, y }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        onMouseLeave={() => setHoveredKey((prev) => (prev === key ? null : prev))}
                      >
                        <circle r={6} fill={accent} filter="url(#pinGlow)" />
                        <title>
                          {m.title}
                          {m.designation ? ` — ${m.designation}` : ""} ({m.location})
                        </title>
                      </motion.g>
                    );
                  })}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
