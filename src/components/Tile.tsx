import type { CSSProperties, ReactNode } from "react";
import { artworkUrl } from "../data/cards";
import { TYPE_META } from "../data/typeMeta";
import type { CardData, PokeType, Trader } from "../types";
import { PokemonCard } from "./PokemonCard";

export function initials(name: string) {
  const caps = name.match(/[A-Z]/g) ?? [name[0]];
  return caps.slice(0, 2).join("");
}

export function TraderBadge({ trader }: { trader: Trader }) {
  return (
    <span className="avatar avatar--small" style={{ "--hue": trader.hue } as CSSProperties} aria-hidden="true">
      {initials(trader.name)}
    </span>
  );
}

export function Points({ value, signed = false }: { value: number; signed?: boolean }) {
  return (
    <span className="num">
      {signed && value > 0 ? "+" : ""}
      {value}
      <small> pts</small>
    </span>
  );
}

interface TileProps {
  card: CardData;
  onOpen: (origin: HTMLElement) => void;
  children: ReactNode;
}

/** A card in a grid with its facts underneath. */
export function Tile({ card, onOpen, children }: TileProps) {
  return (
    <article className="tile">
      <PokemonCard card={card} onClick={onOpen} className="tile__card" />
      <div className="tile__meta">{children}</div>
    </article>
  );
}

export type SortKey = "value" | "reach" | "name";

interface ToolbarProps {
  type: PokeType | "all";
  onType: (t: PokeType | "all") => void;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  sorts: { key: SortKey; label: string }[];
  count: string;
}

export function Toolbar({ type, onType, sort, onSort, sorts, count }: ToolbarProps) {
  return (
    <div className="toolbar">
      <label className="select">
        <span className="sr-only">Type</span>
        <select value={type} onChange={(e) => onType(e.target.value as PokeType | "all")}>
          <option value="all">All types</option>
          {(Object.keys(TYPE_META) as PokeType[]).map((t) => (
            <option key={t} value={t}>
              {TYPE_META[t].label}
            </option>
          ))}
        </select>
      </label>
      <span className="toolbar__spacer" />
      <span className="toolbar__count num">{count}</span>
      <label className="select">
        <span className="sr-only">Sort</span>
        <select value={sort} onChange={(e) => onSort(e.target.value as SortKey)}>
          {sorts.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

/** A small portrait of a card's artwork on its type colour, for rows and lists. */
export function CardThumb({ card, onOpen }: { card: CardData; onOpen?: (el: HTMLElement) => void }) {
  const style = { "--type": TYPE_META[card.type].color, "--type-light": TYPE_META[card.type].light } as CSSProperties;
  return onOpen ? (
    <button className="thumb" style={style} onClick={(e) => onOpen(e.currentTarget)} aria-label={`View ${card.name}`}>
      <img src={artworkUrl(card)} alt="" loading="lazy" />
    </button>
  ) : (
    <span className="thumb" style={style}>
      <img src={artworkUrl(card)} alt="" loading="lazy" />
    </span>
  );
}
