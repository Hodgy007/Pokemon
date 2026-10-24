import { useState } from "react";
import { CARDS, cardValue, getCard } from "../data/cards";
import { REACH_THRESHOLD, acceptChance, bestOffer, type State } from "../state/store";
import type { CardData, Listing, PokeType } from "../types";
import { CardThumb, EmptyState, Points, Tile, Toolbar, TraderBadge, type SortKey } from "./Tile";

export type OpenCard = (cardId: string, origin: HTMLElement, listing?: Listing) => void;

const pct = (chance: number) => `${Math.round(chance * 100)}%`;

function matches(card: CardData, type: PokeType | "all", query: string) {
  return (type === "all" || card.type === type) && card.name.toLowerCase().includes(query.trim().toLowerCase());
}

function bySort<T>(items: T[], sort: SortKey, card: (t: T) => CardData, reach: (t: T) => number) {
  const sorted = [...items];
  if (sort === "value") sorted.sort((a, b) => cardValue(card(b)) - cardValue(card(a)));
  if (sort === "reach") sorted.sort((a, b) => reach(b) - reach(a) || cardValue(card(b)) - cardValue(card(a)));
  if (sort === "name") sorted.sort((a, b) => card(a).name.localeCompare(card(b).name));
  return sorted;
}

/* ---------------- Marketplace ---------------- */

interface MarketProps {
  state: State;
  query: string;
  onOpen: OpenCard;
  onTrade: (listing: Listing) => void;
}

export function Marketplace({ state, query, onOpen, onTrade }: MarketProps) {
  const [tab, setTab] = useState<"all" | "reach">("all");
  const [type, setType] = useState<PokeType | "all">("all");
  const [sort, setSort] = useState<SortKey>("reach");

  const rows = state.listings.map((listing) => ({
    listing,
    card: getCard(listing.card.cardId),
    best: bestOffer(state.collection, listing.card.cardId),
  }));
  const reachable = (r: (typeof rows)[number]) => (r.best?.chance ?? 0) >= REACH_THRESHOLD;
  const inScope = rows.filter((r) => matches(r.card, type, query));
  const shown = bySort(tab === "reach" ? inScope.filter(reachable) : inScope, sort, (r) => r.card, (r) => r.best?.chance ?? 0);
  const reachableCount = rows.filter(reachable).length;

  return (
    <>
      <div className="title-row">
        <div>
          <h1>Marketplace</h1>
          <p className="sub">
            {reachableCount} of {rows.length} listings are within reach: a card in your binder has at least a{" "}
            {pct(REACH_THRESHOLD)} chance of winning them.
          </p>
        </div>
      </div>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "all"} onClick={() => setTab("all")}>
          All listings <span className="num">{inScope.length}</span>
        </button>
        <button role="tab" aria-selected={tab === "reach"} onClick={() => setTab("reach")}>
          Within reach <span className="num">{inScope.filter(reachable).length}</span>
        </button>
      </div>

      <Toolbar
        type={type}
        onType={setType}
        sort={sort}
        onSort={setSort}
        count={`${shown.length} ${shown.length === 1 ? "card" : "cards"}`}
        sorts={[
          { key: "reach", label: "Best odds first" },
          { key: "value", label: "Most valuable first" },
          { key: "name", label: "Name, A to Z" },
        ]}
      />

      {shown.length === 0 ? (
        <EmptyState>
          {tab === "reach"
            ? "Nothing here is within reach yet. Trade up a common card first, or browse all listings."
            : "No listings match this search."}
        </EmptyState>
      ) : (
        <div className="grid">
          {shown.map(({ listing, card, best }) => (
            <Tile key={listing.id} card={card} onOpen={(el) => onOpen(card.id, el, listing)}>
              <div className="tile__line">
                <h2 className="tile__name">{card.name}</h2>
                <Points value={cardValue(card)} />
              </div>
              <div className="tile__line tile__sub">
                <span className="tile__trader">
                  <TraderBadge trader={listing.trader} />
                  {listing.trader.name}
                </span>
                <button className="text-action" onClick={() => onTrade(listing)}>
                  Trade
                </button>
              </div>
              <div className="tile__line tile__sub">
                <span className="truncate">
                  {best && best.chance > 0 ? `Best offer: ${getCard(best.offered.cardId).name}` : "Out of reach for now"}
                </span>
                <span className={`num reach ${best && best.chance >= REACH_THRESHOLD ? "is-reachable" : ""}`}>
                  {best && best.chance > 0 ? pct(best.chance) : "—"}
                </span>
              </div>
            </Tile>
          ))}
        </div>
      )}
    </>
  );
}

/* ---------------- Collection ---------------- */

interface CollectionProps {
  state: State;
  query: string;
  onOpen: OpenCard;
}

export function Collection({ state, query, onOpen }: CollectionProps) {
  const [type, setType] = useState<PokeType | "all">("all");
  const [sort, setSort] = useState<SortKey>("value");

  // For each card you own: the most valuable listing it could probably win.
  const rows = state.collection.map((owned) => {
    const card = getCard(owned.cardId);
    const upgrade = state.listings
      .map((l) => ({ listing: l, card: getCard(l.card.cardId), chance: acceptChance(owned.cardId, l.card.cardId) }))
      .filter((u) => u.chance >= REACH_THRESHOLD && cardValue(u.card) > cardValue(card))
      .sort((a, b) => cardValue(b.card) - cardValue(a.card))[0];
    return { owned, card, upgrade };
  });
  const total = rows.reduce((sum, r) => sum + cardValue(r.card), 0);
  const canTradeUp = rows.filter((r) => r.upgrade).length;
  const shown = bySort(
    rows.filter((r) => matches(r.card, type, query)),
    sort,
    (r) => r.card,
    (r) => r.upgrade?.chance ?? 0,
  );

  return (
    <>
      <div className="title-row">
        <div>
          <h1>Collection</h1>
          <p className="sub">
            {rows.length} cards worth {total} pts. {canTradeUp} of them could probably trade up to a more valuable card.
          </p>
        </div>
      </div>

      <Toolbar
        type={type}
        onType={setType}
        sort={sort}
        onSort={setSort}
        count={`${shown.length} ${shown.length === 1 ? "card" : "cards"}`}
        sorts={[
          { key: "value", label: "Most valuable first" },
          { key: "reach", label: "Best trade-up first" },
          { key: "name", label: "Name, A to Z" },
        ]}
      />

      {shown.length === 0 ? (
        <EmptyState>{rows.length === 0 ? "Your binder is empty. Trade for a card in the marketplace." : "No cards in your binder match this search."}</EmptyState>
      ) : (
        <div className="grid grid--binder">
          {shown.map(({ owned, card, upgrade }) => (
            <Tile key={owned.uid} card={card} onOpen={(el) => onOpen(card.id, el)}>
              <div className="tile__line">
                <h2 className="tile__name">{card.name}</h2>
                <Points value={cardValue(card)} />
              </div>
              <div className="tile__line tile__sub">
                {upgrade ? (
                  <>
                    <span className="truncate">Trades up to {upgrade.card.name}</span>
                    <span className="num reach is-reachable">{pct(upgrade.chance)}</span>
                  </>
                ) : (
                  <span>No trade-ups in reach</span>
                )}
              </div>
            </Tile>
          ))}
        </div>
      )}
    </>
  );
}

/* ---------------- Trades ---------------- */

export function TradeHistory({ state, onOpen }: { state: State; onOpen: OpenCard }) {
  const accepted = state.history.filter((h) => h.status === "accepted");
  const gained = accepted.reduce((sum, h) => sum + cardValue(getCard(h.gotCardId)) - cardValue(getCard(h.gaveCardId)), 0);
  const declined = state.history.length - accepted.length;

  return (
    <>
      <div className="title-row">
        <div>
          <h1>Trades</h1>
          <p className="sub">
            {state.history.length === 0
              ? "Offers you send from the marketplace are listed here."
              : `${accepted.length} accepted and ${declined} declined. Trades have ${gained >= 0 ? "added" : "cost"} ${Math.abs(gained)} pts to your binder.`}
          </p>
        </div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>You gave</th>
            <th>You got</th>
            <th>With</th>
            <th className="num">Value change</th>
            <th>Status</th>
            <th className="num">When</th>
          </tr>
        </thead>
        <tbody>
          {state.history.length === 0 ? (
            <tr>
              <td colSpan={6} className="table__empty">
                No trades yet.
              </td>
            </tr>
          ) : (
            state.history.map((h) => {
              const gave = getCard(h.gaveCardId);
              const got = getCard(h.gotCardId);
              const change = cardValue(got) - cardValue(gave);
              const ok = h.status === "accepted";
              return (
                <tr key={h.id}>
                  <td>
                    <CardCell card={gave} onOpen={onOpen} />
                  </td>
                  <td>
                    <CardCell card={got} onOpen={onOpen} />
                  </td>
                  <td className="muted">{h.trader}</td>
                  <td className={`num ${ok ? (change > 0 ? "positive" : change < 0 ? "negative" : "") : "muted"}`}>
                    {ok ? <Points value={change} signed /> : "—"}
                  </td>
                  <td>
                    <span className={`pill ${ok ? "pill--positive" : "pill--neutral"}`}>{ok ? "Accepted" : "Declined"}</span>
                  </td>
                  <td className="num muted">{formatWhen(h.at)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </>
  );
}

function CardCell({ card, onOpen }: { card: CardData; onOpen: OpenCard }) {
  return (
    <span className="card-cell">
      <CardThumb card={card} onOpen={(el) => onOpen(card.id, el)} />
      {card.name}
    </span>
  );
}

function formatWhen(at: number) {
  const d = new Date(at);
  const today = new Date();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toDateString() === today.toDateString() ? `Today ${time}` : d.toISOString().slice(0, 10);
}

/** Every catalogue card is either owned or listed; checked once in development. */
export function assertCatalogue(state: State) {
  const ids = [...state.collection.map((c) => c.cardId), ...state.listings.map((l) => l.card.cardId)];
  console.assert(ids.length === CARDS.length, `Expected ${CARDS.length} cards in circulation, found ${ids.length}`);
}
