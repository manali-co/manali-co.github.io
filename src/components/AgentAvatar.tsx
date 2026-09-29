import type { CSSProperties } from "react";
import { AGENT_PALETTES, markDots } from "@/lib/agent-mark";

/* Ported from the design system (components/brand/AgentAvatar.jsx). An agent's avatar: the manali
   mark drawn in dots on a rounded-square tile, in the project's colours. Dots say machine, the
   ridge and sun say manali, the colours say which project. People are always round; agents are
   always square. `writing` sweeps the dots left to right; reduced motion keeps it still (CSS). */
export function AgentAvatar({ project = "manali", size = 32, writing = false, label, style }: { project?: string; size?: number; writing?: boolean; label?: string; style?: CSSProperties }) {
  const pal = AGENT_PALETTES[project] || AGENT_PALETTES.manali;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} className={writing ? "agent-avatar agent-avatar--writing" : "agent-avatar"} style={{ display: "block", flex: "none", ...style }}>
      <rect x="0" y="0" width="100" height="100" rx="26" fill={pal.ground} />
      {pal.light && <rect x="0.75" y="0.75" width="98.5" height="98.5" rx="25.5" fill="none" stroke="rgba(35,34,74,0.14)" strokeWidth="1.5" />}
      {markDots(size).map((c) => (
        <circle key={`${c.i}-${c.j}`} cx={c.cx} cy={c.cy} r={c.r} fill={c.kind === "sun" ? pal.sun : c.kind === "ridge" ? pal.ridge : pal.idle}
          className={c.kind !== "idle" ? "agent-avatar__on" : undefined} style={writing && c.kind !== "idle" ? { animationDelay: `${c.i * 110}ms` } : undefined} />
      ))}
    </svg>
  );
}
