export type PokeType =
  | "fire"
  | "water"
  | "electric"
  | "grass"
  | "psychic"
  | "fighting"
  | "ice"
  | "dragon"
  | "normal"
  | "fairy";

export type Rarity = "common" | "rare" | "holo" | "ultra";

/** An effect is either a type-themed attack animation or a generic ability aura. */
export type EffectKind = PokeType | "aura";

export interface Attack {
  name: string;
  cost: PokeType[];
  damage: number;
  text?: string;
  /** Which animation to play. Defaults to the card's own type. */
  effect?: PokeType;
}

export interface Ability {
  name: string;
  text: string;
}

export interface CardData {
  id: string;
  /** National Pokédex number, used to look up artwork. */
  dex: number;
  name: string;
  type: PokeType;
  hp: number;
  stage: "Basic" | "Stage 1" | "Stage 2";
  rarity: Rarity;
  ability?: Ability;
  attacks: Attack[];
  flavor: string;
}

/** A specific copy of a card that someone owns. */
export interface OwnedCard {
  uid: string;
  cardId: string;
}

export interface Trader {
  name: string;
  /** Hue (0–360) for the trader's initials, kept 60°+ apart from the others. */
  hue: number;
}

export interface Listing {
  id: string;
  trader: Trader;
  card: OwnedCard;
}

export interface TradeRecord {
  id: string;
  trader: string;
  gaveCardId: string;
  gotCardId: string;
  status: "accepted" | "declined";
  at: number;
}
