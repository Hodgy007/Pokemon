import { TYPE_META } from "../data/typeMeta";
import type { PokeType } from "../types";

export function EnergyIcon({ type, size = "1em" }: { type: PokeType; size?: string }) {
  const meta = TYPE_META[type];
  return (
    <span
      className="energy"
      title={`${meta.label} Energy`}
      style={{ width: size, height: size, background: `radial-gradient(circle at 35% 30%, ${meta.light}, ${meta.color} 60%, ${meta.dark})` }}
    >
      <span style={{ fontSize: `calc(${size} * 0.6)` }}>{meta.symbol}</span>
    </span>
  );
}
