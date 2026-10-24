import { TYPE_META } from "../data/typeMeta";
import type { PokeType } from "../types";

/** A TCG-style energy symbol: the type's glyph in white on a disc of its colour. */
export function EnergyIcon({ type, size = "1em", className = "" }: { type: PokeType; size?: string; className?: string }) {
  const meta = TYPE_META[type];
  return (
    <svg
      className={`energy ${className}`}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role="img"
      aria-label={`${meta.label} Energy`}
    >
      <circle cx="12" cy="12" r="12" fill={meta.color} />
      <g transform="translate(4.2 4.2) scale(0.65)">
        {meta.stroke ? (
          <path d={meta.glyph} fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        ) : (
          <path d={meta.glyph} fill="#fff" fillRule="evenodd" />
        )}
      </g>
    </svg>
  );
}
