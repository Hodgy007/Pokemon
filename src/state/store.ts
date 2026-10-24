import { useEffect, useMemo, useReducer } from "react";
import { STARTER_IDS, type Catalog } from "../data/catalog";
import { cardValue, findCard } from "../data/cards";
import type { Listing, OwnedCard, TradeRecord } from "../types";

/**
 * This browser's own trading: the binder, trade history, and how its trades
 * changed the marketplace. The marketplace itself comes from the catalogue,
 * which admins edit in the database.
 */
interface LocalState {
  collection: OwnedCard[];
  history: TradeRecord[];
  /** Catalogue listings this browser has traded for. */
  taken: string[];
  /** Cards you gave away, which their new owners list again. */
  relisted: Listing[];
}

/** What the screens see: local state merged over the catalogue. */
export interface State {
  collection: OwnedCard[];
  listings: Listing[];
  history: TradeRecord[];
}

export type Action =
  | { type: "tradeAccepted"; listingId: string; offeredUid: string }
  | { type: "tradeDeclined"; listingId: string; offeredUid: string }
  | { type: "reset" };

// v3: listings come from the catalogue; only this browser's changes are stored.
const STORAGE_KEY = "poketradex:v3";

const uid = () => Math.random().toString(36).slice(2, 10);

function starterState(catalog: Catalog): LocalState {
  const known = new Set(catalog.cards.map((c) => c.id));
  return {
    collection: STARTER_IDS.filter((id) => known.has(id)).map((cardId) => ({ uid: uid(), cardId })),
    history: [],
    taken: [],
    relisted: [],
  };
}

function load(catalog: Catalog): LocalState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as LocalState;
  } catch {
    // Missing, corrupt or blocked storage: start fresh.
  }
  return starterState(catalog);
}

function merge(local: LocalState, catalog: Catalog): State {
  const known = new Set(catalog.cards.map((c) => c.id));
  const traders = new Map(catalog.traders.map((t) => [t.id, t]));
  const taken = new Set(local.taken);
  // Drop anything whose card or trader an admin has since removed.
  const relisted = local.relisted
    .filter((l) => known.has(l.card.cardId) && traders.has(l.trader.id))
    .map((l) => ({ ...l, trader: traders.get(l.trader.id)! }));
  return {
    collection: local.collection.filter((c) => known.has(c.cardId)),
    listings: [...catalog.listings.filter((l) => !taken.has(l.id)), ...relisted],
    history: local.history,
  };
}

export function useTradeStore(catalog: Catalog) {
  const [local, dispatch] = useReducer(
    (state: LocalState, action: Action): LocalState => reducer(state, action, catalog),
    catalog,
    load,
  );
  const state = useMemo(() => merge(local, catalog), [local, catalog]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
    } catch {
      // Storage unavailable; the session still works in memory.
    }
  }, [local]);

  return [state, dispatch] as const;
}

function reducer(state: LocalState, action: Action, catalog: Catalog): LocalState {
  switch (action.type) {
    case "tradeAccepted": {
      const listing = merge(state, catalog).listings.find((l) => l.id === action.listingId);
      const offered = state.collection.find((c) => c.uid === action.offeredUid);
      if (!listing || !offered) return state;
      const fromCatalog = catalog.listings.some((l) => l.id === listing.id);
      return {
        collection: [...state.collection.filter((c) => c.uid !== offered.uid), { uid: uid(), cardId: listing.card.cardId }],
        history: [record(listing, offered, "accepted"), ...state.history],
        taken: fromCatalog ? [...state.taken, listing.id] : state.taken,
        // The trader lists the card they just received.
        relisted: [...state.relisted.filter((l) => l.id !== listing.id), { id: uid(), trader: listing.trader, card: offered }],
      };
    }
    case "tradeDeclined": {
      const listing = merge(state, catalog).listings.find((l) => l.id === action.listingId);
      const offered = state.collection.find((c) => c.uid === action.offeredUid);
      if (!listing || !offered) return state;
      return { ...state, history: [record(listing, offered, "declined"), ...state.history] };
    }
    case "reset":
      return starterState(catalog);
  }
}

function record(listing: Listing, offered: OwnedCard, status: TradeRecord["status"]): TradeRecord {
  return {
    id: uid(),
    trader: listing.trader.name,
    gaveCardId: offered.cardId,
    gotCardId: listing.card.cardId,
    status,
    at: Date.now(),
  };
}

/**
 * Chance (0–1) that a trader accepts: even trades are always accepted,
 * offers worth less than 60% of the card are always declined.
 */
export function acceptChance(offeredCardId: string, wantedCardId: string): number {
  const offered = findCard(offeredCardId);
  const wanted = findCard(wantedCardId);
  if (!offered || !wanted) return 0;
  const ratio = cardValue(offered) / cardValue(wanted);
  return Math.max(0, Math.min(1, (ratio - 0.6) / 0.4));
}

/** Offers at or above this chance count as "within reach". */
export const REACH_THRESHOLD = 0.5;

export interface BestOffer {
  offered: OwnedCard;
  chance: number;
}

/** The card in your collection most likely to win a listing, or null with an empty collection. */
export function bestOffer(collection: OwnedCard[], wantedCardId: string): BestOffer | null {
  let best: BestOffer | null = null;
  const value = (o: OwnedCard) => cardValue(findCard(o.cardId)!);
  for (const offered of collection) {
    const chance = acceptChance(offered.cardId, wantedCardId);
    // On a tie, give up the least valuable card.
    if (!best || chance > best.chance || (chance === best.chance && value(offered) < value(best.offered))) {
      best = { offered, chance };
    }
  }
  return best;
}
