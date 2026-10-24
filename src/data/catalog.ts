import { useCallback, useEffect, useState } from "react";
import { neon } from "../lib/neon";
import type { Ability, Attack, CardData, Listing, Trader } from "../types";
import { CARDS, setKnownCards } from "./cards";

/** Everything the shop shows that an admin can change. */
export interface Catalog {
  cards: CardData[];
  traders: Trader[];
  listings: Listing[];
  /** Where the data came from, and why the built-in set is shown if it is. */
  source: "database" | "built-in";
  problem?: string;
}

export const BUILT_IN_TRADERS: Trader[] = [
  { id: "emberqueen", name: "EmberQueen", hue: 10 },
  { id: "tidaltrainer", name: "TidalTrainer", hue: 205 },
  { id: "voltvandal", name: "VoltVandal", hue: 75 },
  { id: "leaflad", name: "LeafLad", hue: 140 },
  { id: "pixiepal", name: "PixiePal", hue: 300 },
];

/** Cards every new binder starts with; the rest are listed by traders. */
export const STARTER_IDS = ["charmander", "squirtle", "bulbasaur", "pikachu", "eevee", "snorlax"];

function builtInCatalog(problem?: string): Catalog {
  const listings = CARDS.filter((c) => !STARTER_IDS.includes(c.id)).map((c, i) => ({
    id: `built-in-${c.id}`,
    trader: BUILT_IN_TRADERS[i % BUILT_IN_TRADERS.length],
    card: { uid: `built-in-${c.id}`, cardId: c.id },
  }));
  return { cards: CARDS, traders: BUILT_IN_TRADERS, listings, source: "built-in", problem };
}

/* ---------- rows as stored in Postgres (see db/schema.sql) ---------- */

export interface CardRow {
  id: string;
  dex: number;
  name: string;
  type: CardData["type"];
  hp: number;
  stage: CardData["stage"];
  rarity: CardData["rarity"];
  ability: Ability | null;
  attacks: Attack[];
  flavor: string;
}

interface ListingRow {
  id: string;
  card_id: string;
  trader_id: string;
}

export function cardFromRow(row: CardRow): CardData {
  return { ...row, ability: row.ability ?? undefined };
}

export function rowFromCard(card: CardData): CardRow {
  const { id, dex, name, type, hp, stage, rarity, attacks, flavor } = card;
  return { id, dex, name, type, hp, stage, rarity, attacks, flavor, ability: card.ability ?? null };
}

async function fetchCatalog(): Promise<Catalog> {
  if (!neon) return builtInCatalog();
  const [cards, traders, listings] = await Promise.all([
    neon.from("cards").select("id, dex, name, type, hp, stage, rarity, ability, attacks, flavor").order("name"),
    neon.from("traders").select("id, name, hue").order("name"),
    neon.from("listings").select("id, card_id, trader_id").order("created_at"),
  ]);
  const error = cards.error ?? traders.error ?? listings.error;
  if (error) throw new Error(error.message);

  const cardList = (cards.data as CardRow[]).map(cardFromRow);
  const traderList = traders.data as Trader[];
  const traderById = new Map(traderList.map((t) => [t.id, t]));
  const cardIds = new Set(cardList.map((c) => c.id));
  const listingList = (listings.data as ListingRow[])
    .filter((l) => cardIds.has(l.card_id) && traderById.has(l.trader_id))
    .map((l) => ({ id: l.id, trader: traderById.get(l.trader_id)!, card: { uid: l.id, cardId: l.card_id } }));
  return { cards: cardList, traders: traderList, listings: listingList, source: "database" };
}

/** Load the catalogue once, and again whenever an admin saves a change. */
export function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);

  const reload = useCallback(async () => {
    let next: Catalog;
    try {
      next = await fetchCatalog();
    } catch (e) {
      next = builtInCatalog(e instanceof Error ? e.message : String(e));
    }
    setKnownCards(next.cards);
    setCatalog(next);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { catalog, reload };
}
