import type { CSSProperties, ReactNode } from "react";
import type { CardData, PokeType } from "../types";
import { TYPE_META } from "../data/typeMeta";
import { PokemonCard } from "./PokemonCard";

export interface GridItem {
  key: string;
  card: CardData;
  footer?: ReactNode;
}

export function CardGrid({ items, onOpen, empty }: { items: GridItem[]; onOpen: (item: GridItem) => void; empty: string }) {
  if (items.length === 0) return <p className="empty">{empty}</p>;
  return (
    <div className="grid">
      {items.map((item) => (
        <div className="grid__item" key={item.key}>
          <PokemonCard card={item.card} onClick={() => onOpen(item)} />
          {item.footer && <div className="grid__footer">{item.footer}</div>}
        </div>
      ))}
    </div>
  );
}

export function TypeFilter({ value, onChange }: { value: PokeType | "all"; onChange: (v: PokeType | "all") => void }) {
  return (
    <div className="filters" role="group" aria-label="Filter by type">
      <button className={`chip ${value === "all" ? "is-active" : ""}`} onClick={() => onChange("all")}>
        All
      </button>
      {(Object.keys(TYPE_META) as PokeType[]).map((t) => (
        <button
          key={t}
          className={`chip ${value === t ? "is-active" : ""}`}
          style={{ "--chip": TYPE_META[t].color } as CSSProperties}
          onClick={() => onChange(t)}
        >
          {TYPE_META[t].symbol} {TYPE_META[t].label}
        </button>
      ))}
    </div>
  );
}
