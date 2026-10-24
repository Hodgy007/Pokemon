import { useEffect, useReducer } from "react";
import { CARDS, cardValue, getCard } from "../data/cards";
import type { Listing, OwnedCard, TradeRecord, Trader } from "../types";

export interface State {
  collection: OwnedCard[];
  listings: Listing[];
  history: TradeRecord[];
}

export type Action =
  | { type: "tradeAccepted"; listingId: string; offeredUid: string }
  | { type: "tradeDeclined"; listingId: string; offeredUid: string }
  | { type: "reset" };

const STORAGE_KEY = "poketrade:v1";

export const TRADERS: Trader[] = [
  { name: "EmberQueen", avatar: "🔥" },
  { name: "TidalTrainer", avatar: "🌊" },
  { name: "VoltVandal", avatar: "⚡" },
  { name: "LeafLad", avatar: "🍃" },
  { name: "PixiePal", avatar: "✨" },
];

const STARTER_IDS = ["charmander", "squirtle", "bulbasaur", "pikachu", "eevee", "snorlax"];

const uid = () => Math.random().toString(36).slice(2, 10);

function initialState(): State {
  const collection = STARTER_IDS.map((cardId) => ({ uid: uid(), cardId }));
  const listings = CARDS.filter((c) => !STARTER_IDS.includes(c.id)).map((c, i) => ({
    id: uid(),
    trader: TRADERS[i % TRADERS.length],
    card: { uid: uid(), cardId: c.id },
  }));
  return { collection, listings, history: [] };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "tradeAccepted": {
      const listing = state.listings.find((l) => l.id === action.listingId);
      const offered = state.collection.find((c) => c.uid === action.offeredUid);
      if (!listing || !offered) return state;
      return {
        collection: [...state.collection.filter((c) => c.uid !== offered.uid), listing.card],
        // The trader re-lists the card they just received.
        listings: state.listings.map((l) => (l.id === listing.id ? { ...l, id: uid(), card: offered } : l)),
        history: [record(listing, offered, "accepted"), ...state.history],
      };
    }
    case "tradeDeclined": {
      const listing = state.listings.find((l) => l.id === action.listingId);
      const offered = state.collection.find((c) => c.uid === action.offeredUid);
      if (!listing || !offered) return state;
      return { ...state, history: [record(listing, offered, "declined"), ...state.history] };
    }
    case "reset":
      return initialState();
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

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      // Drop saved state that refers to cards that no longer exist.
      [...parsed.collection, ...parsed.listings.map((l) => l.card)].forEach((c) => getCard(c.cardId));
      return parsed;
    }
  } catch {
    // Missing, corrupt or blocked storage: start fresh.
  }
  return initialState();
}

export function useTradeStore() {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage unavailable; the session still works in memory.
    }
  }, [state]);
  return [state, dispatch] as const;
}

/**
 * Chance (0–1) that a trader accepts: even trades are always accepted,
 * offers worth less than 60% of the card are always declined.
 */
export function acceptChance(offeredCardId: string, wantedCardId: string): number {
  const ratio = cardValue(getCard(offeredCardId)) / cardValue(getCard(wantedCardId));
  return Math.max(0, Math.min(1, (ratio - 0.6) / 0.4));
}
