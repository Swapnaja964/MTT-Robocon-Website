"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { geoEquirectangular, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { select } from "d3-selection";
import { zoom as d3zoom, zoomIdentity } from "d3-zoom";

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

// Controlled equirectangular projection used for BOTH background and pins.
function projectPointToViewBox(lat: number, lng: number, viewWidth: number, viewHeight: number) {
  const x = ((lng + 180) / 360) * viewWidth;
  const y = ((90 - lat) / 180) * viewHeight;
  return { x, y };
}

export default function AlumniMap({ cards, accent = "#c73808" }: Props) {
  const viewWidth = WIDTH;
  const viewHeight = HEIGHT;

  const [land, setLand] = useState<GeoJSON.FeatureCollection | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const world = (await import("world-atlas/countries-110m.json")).default as any;
        const landFc = feature(world, world.objects.countries) as GeoJSON.FeatureCollection;
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

  const points = useMemo(() => {
    if (!projection) return [];
    return cards
      .map((c) => {
        const coords = lookupCoords(c.location);
        if (!coords) {
          if (typeof window !== "undefined") {
            // eslint-disable-next-line no-console
            console.warn(`[AlumniMap] Unknown location: "${c.location}" for "${c.title}". Please provide lat/lng.`);
          }
          return null;
        }
        const proj = projection([coords.lng, coords.lat]);
        if (!proj) return null;
        return { ...c, pos: { x: proj[0], y: proj[1] } };
      })
      .filter(Boolean) as Array<AlumniCard & { pos: { x: number; y: number } }>;
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
    svgSel.call(zoom as any).call(zoom.transform as any, zoomIdentity);
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
            {/* Pins */}
            {points.map((p, i) => (
              <g key={`${p.title}-${i}`} transform={`translate(${p.pos.x}, ${p.pos.y})`}>
                <circle r={6} fill={accent} filter="url(#pinGlow)" />
                <title>
                  {p.title}
                  {p.designation ? ` — ${p.designation}` : ""} ({p.location})
                </title>
              </g>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
