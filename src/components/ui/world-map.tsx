"use client";

import { useMemo, useRef } from "react";
import { motion } from "motion/react";
import DottedMap from "dotted-map";
import Image from "next/image";
import { useTheme } from "next-themes";
import { forceSimulation, forceX, forceY, forceCollide } from "d3-force";

interface MapProps {
  dots?: Array<{
    start: { lat: number; lng: number; label?: string };
    end: { lat: number; lng: number; label?: string };
  }>;
  lineColor?: string;
}

export default function WorldMap({
  dots = [],
  lineColor = "#0ea5e9",
}: MapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const map = new DottedMap({ height: 100, grid: "diagonal" });

  const { theme } = useTheme();

  const svgMap = map.getSVG({
    radius: 0.22,
    color: theme === "dark" ? "#FFFFFF40" : "#FFFFFF40",
    shape: "circle",
    backgroundColor: theme === "dark" ? "black" : "black",
  });

  const projectPoint = (lat: number, lng: number) => {
    const width = 1056; // Match the SVG width
    const height = 495; // Match the SVG height
    const x = ((lng + 180) / 360) * width; // Longitude projection
    const y = ((90 - lat) / 180) * height; // Latitude projection
    return { x, y };
  };

  type SimNode = { id: string; ox: number; oy: number; x: number; y: number; vx?: number; vy?: number };
  const adjustedPositions = useMemo(() => {
    const pins = dots.flatMap((dot, i) => {
      const s = projectPoint(dot.start.lat, dot.start.lng);
      const e = projectPoint(dot.end.lat, dot.end.lng);
      return [
        { id: `s-${i}`, ox: s.x, oy: s.y, x: s.x, y: s.y } as SimNode,
        { id: `e-${i}`, ox: e.x, oy: e.y, x: e.x, y: e.y } as SimNode,
      ];
    });
    if (pins.length === 0) return new Map<string, { x: number; y: number }>();
    const sim = forceSimulation<SimNode>(pins)
      .force("x", forceX<SimNode>((d) => d.ox).strength(0.1))
      .force("y", forceY<SimNode>((d) => d.oy).strength(0.1))
      .force("collide", forceCollide<SimNode>(8))
      .stop();
    for (let i = 0; i < 100; i++) sim.tick();
    const map = new Map<string, { x: number; y: number }>();
    pins.forEach((p) => map.set(p.id, { x: p.x, y: p.y }));
    return map;
  }, [dots]);

  const createCurvedPath = (
    start: { x: number; y: number },
    end: { x: number; y: number }
  ) => {
    const midX = (start.x + end.x) / 2;
    const midY = Math.min(start.y, end.y) - 50;
    return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;
  };

  return (
    <div className="w-full aspect-[2/1] rounded-lg relative font-sans">
      <Image
        src={`data:image/svg+xml;utf8,${encodeURIComponent(svgMap)}`}
        className="h-full w-full [mask-image:linear-gradient(to_bottom,transparent,white_10%,white_90%,transparent)] pointer-events-none select-none"
        alt="world map"
        height="495"
        width="1056"
        draggable={false}
      />
      <svg
        ref={svgRef}
        viewBox="0 800 400"
        className="w-full h-full absolute inset-0 pointer-events-none select-none"
      >
        {dots.map((dot, i) => {
          const startPoint = projectPoint(dot.start.lat, dot.start.lng);
          const endPoint = projectPoint(dot.end.lat, dot.end.lng);
          return (
            <g key={`path-group-${i}`}>
              {/* Curved Path */}
              <motion.path
                d={createCurvedPath(startPoint, endPoint)}
                fill="none"
                stroke="url(#path-gradient)"
                strokeWidth="1"
                initial={{
                  pathLength: 0,
                }}
                animate={{
                  pathLength: 1,
                }}
                transition={{
                  duration: 1,
                  delay: 0.5 * i,
                  ease: "easeOut",
                }}
                key={`start-upper-${i}`}
              ></motion.path>
              {/* Start Point Label */}
              {dot.start.label && (
                <text
                  x={startPoint.x + 5}
                  y={startPoint.y - 5}
                  fontSize="10"
                  fill="red"
                >
                  {dot.start.label}
                </text>
              )}
              {/* End Point Label */}
              {dot.end.label && (
                <text
                  x={endPoint.x + 5}
                  y={endPoint.y - 5}
                  fontSize="10"
                  fill="red"
                >
                  {dot.end.label}
                </text>
              )}
            </g>
          );
        })}

        <defs>
          <linearGradient id="path-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="5%" stopColor={lineColor} stopOpacity="1" />
            <stop offset="95%" stopColor={lineColor} stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>

        {dots.map((dot, i) => (
          <g key={`points-group-${i}`}>
            {/* Start Point */}
            <g key={`start-${i}`}>
              <circle
                cx={(adjustedPositions.get(`s-${i}`)?.x ?? projectPoint(dot.start.lat, dot.start.lng).x)}
                cy={(adjustedPositions.get(`s-${i}`)?.y ?? projectPoint(dot.start.lat, dot.start.lng).y)}
                r="2"
                fill={lineColor}
              />
              <circle
                cx={(adjustedPositions.get(`s-${i}`)?.x ?? projectPoint(dot.start.lat, dot.start.lng).x)}
                cy={(adjustedPositions.get(`s-${i}`)?.y ?? projectPoint(dot.start.lat, dot.start.lng).y)}
                r="2"
                fill={lineColor}
                opacity="0.5"
              >
                <animate
                  attributeName="r"
                  from="2"
                  to="8"
                  dur="1.5s"
                  begin="0s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  from="0.5"
                  to="0"
                  dur="1.5s"
                  begin="0s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
            {/* End Point */}
            <g key={`end-${i}`}>
              <circle
                cx={(adjustedPositions.get(`e-${i}`)?.x ?? projectPoint(dot.end.lat, dot.end.lng).x)}
                cy={(adjustedPositions.get(`e-${i}`)?.y ?? projectPoint(dot.end.lat, dot.end.lng).y)}
                r="2"
                fill={lineColor}
              />
              <circle
                cx={(adjustedPositions.get(`e-${i}`)?.x ?? projectPoint(dot.end.lat, dot.end.lng).x)}
                cy={(adjustedPositions.get(`e-${i}`)?.y ?? projectPoint(dot.end.lat, dot.end.lng).y)}
                r="2"
                fill={lineColor}
                opacity="0.5"
              >
                <animate
                  attributeName="r"
                  from="2"
                  to="8"
                  dur="1.5s"
                  begin="0s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  from="0.5"
                  to="0"
                  dur="1.5s"
                  begin="0s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}
