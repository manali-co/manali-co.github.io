/* The agent avatar's geometry, from the design system (components/brand/AgentAvatar.jsx): the
   manali mark resampled onto a dot grid. Ridge cells, sun cells, idle cells. Shared by the
   byline avatar and the social card, so both draw the same logo, not a lookalike. */

export type AgentPalette = { ground: string; ridge: string; sun: string; idle: string; light?: boolean; label: string };

/* Keyed by the site's project slugs. */
export const AGENT_PALETTES: Record<string, AgentPalette> = {
  manali: { ground: "#23224A", ridge: "#9AA0EA", sun: "#F2B84B", idle: "rgba(247,245,238,0.16)", label: "manali apps" },
  yapp: { ground: "#F1ECE1", ridge: "#6F87A8", sun: "#E8B79A", idle: "rgba(35,34,74,0.12)", light: true, label: "Yapp" },
  "what-should-we-watch": { ground: "#1B1D22", ridge: "#6ECBBE", sun: "#EE8079", idle: "rgba(247,245,238,0.14)", label: "What Should We Watch" },
  spark: { ground: "#09090B", ridge: "#F7F5EE", sun: "#E03C7A", idle: "rgba(247,245,238,0.14)", label: "Spark" },
  portfolio: { ground: "#F3F0E8", ridge: "#23224A", sun: "#D2491F", idle: "rgba(35,34,74,0.12)", light: true, label: "Personal Portfolio" },
};

const RIDGE = [[6, 66, 18, 66, 24, 24, 36, 24], [36, 24, 48, 24, 50, 58, 60, 58], [60, 58, 72, 58, 76, 42, 94, 42]];
const PTS: [number, number][] = [];
RIDGE.forEach(([x0, y0, x1, y1, x2, y2, x3, y3]) => {
  for (let t = 0; t <= 1; t += 0.02) {
    const u = 1 - t;
    PTS.push([u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3]);
  }
});

export type Cell = { i: number; j: number; cx: number; cy: number; r: number; kind: "sun" | "ridge" | "idle" };
const GRIDS: Record<number, Cell[]> = {};

/* Dots in a 100x100 box, already scaled and offset as the design draws them. */
export function markDots(size: number): Cell[] {
  const n = size <= 24 ? 5 : size < 56 ? 7 : 9;
  if (GRIDS[n]) return GRIDS[n];
  const p = 100 / n, k = 0.78, off = 11, cells: Cell[] = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = (i + 0.5) * p, y = -5 + (j + 0.5) * p;
    const ds = Math.hypot(x - 68, y - 36);
    const dr = Math.min(...PTS.map(([px, py]) => Math.hypot(x - px, y - py)));
    const kind = ds < 13 + p * 0.15 ? "sun" : dr < p * 0.52 ? "ridge" : "idle";
    cells.push({ i, j, cx: off + x * k, cy: off + (y + 5) * k, r: (kind !== "idle" ? p * 0.36 : p * 0.16) * k, kind });
  }
  return (GRIDS[n] = cells);
}
