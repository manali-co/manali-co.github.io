import { useId, type CSSProperties } from "react";
import { readerIdentity, SCENES } from "./identity";

/* Ported from the design system (components/comments/ReaderAvatar.jsx). A reader's avatar: always a
   circle, a soft hill and a sun (smooth shapes, never dots, so it can't be mistaken for an
   agent's square dot mark). Removed comments pass faded. */
export function ReaderAvatar({ seed = "", size = 32, faded = false, style }: { seed?: string; size?: number; faded?: boolean; style?: CSSProperties }) {
  const id = readerIdentity(seed);
  const [g, hill, sun] = SCENES[id.scene];
  const px = id.peak, sx = id.sun ? Math.min(82, px + 34) : Math.max(18, px - 30);
  const clip = `ma-rd-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" style={{ display: "block", flex: "none", borderRadius: "50%", opacity: faded ? 0.4 : 1, filter: faded ? "grayscale(1)" : undefined, ...style }}>
      <defs><clipPath id={clip}><circle cx="20" cy="20" r="20" /></clipPath></defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="40" height="40" fill={g} />
        <circle cx={sx * 0.4} cy="15" r="5.2" fill={sun} />
        <path d={`M-2 30 C ${px * 0.4 - 10} 30, ${px * 0.4 - 6} 17, ${px * 0.4} 17 S ${px * 0.4 + 12} 28, 42 28 V42 H-2Z`} fill={hill} />
      </g>
    </svg>
  );
}
