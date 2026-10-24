import { useCallback, useState } from "react";
import { CardGrid, TypeFilter, type GridItem } from "./components/CardGrid";
import { CardViewer } from "./components/CardViewer";
import { TradeDialog } from "./components/TradeDialog";
import { cardValue, getCard } from "./data/cards";
import { useTradeStore } from "./state/store";
import type { Listing, PokeType } from "./types";

type Tab = "market" | "collection" | "history";

export default function App() {
  const [state, dispatch] = useTradeStore();
  const [tab, setTab] = useState<Tab>("market");
  const [typeFilter, setTypeFilter] = useState<PokeType | "all">("all");
  const [viewing, setViewing] = useState<{ cardId: string; listing?: Listing } | null>(null);
  const [trading, setTrading] = useState<Listing | null>(null);

  const matches = (cardId: string) => typeFilter === "all" || getCard(cardId).type === typeFilter;

  const marketItems: GridItem[] = state.listings
    .filter((l) => matches(l.card.cardId))
    .map((l) => ({
      key: l.id,
      card: getCard(l.card.cardId),
      footer: (
        <>
          <span className="trader">
            {l.trader.avatar} {l.trader.name}
          </span>
          <button className="btn btn--small btn--primary" onClick={() => setTrading(l)}>
            Trade
          </button>
        </>
      ),
    }));

  const collectionItems: GridItem[] = state.collection
    .filter((c) => matches(c.cardId))
    .map((c) => ({ key: c.uid, card: getCard(c.cardId) }))
    .sort((a, b) => cardValue(b.card) - cardValue(a.card))
    .map((item) => ({ ...item, footer: <span className="value-badge">{cardValue(item.card)} pts</span> }));

  const collectionValue = state.collection.reduce((sum, c) => sum + cardValue(getCard(c.cardId)), 0);

  const closeViewer = useCallback(() => setViewing(null), []);
  const closeTrade = useCallback(() => setTrading(null), []);
  const onTradeResult = useCallback(
    (offeredUid: string, accepted: boolean) => {
      if (!trading) return;
      dispatch({ type: accepted ? "tradeAccepted" : "tradeDeclined", listingId: trading.id, offeredUid });
    },
    [trading, dispatch],
  );

  const viewingListing = viewing?.listing;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img src="/favicon.svg" alt="" width={32} height={32} />
          <span>
            Poké<b>Trade</b>
          </span>
        </div>
        <nav className="tabs">
          <button className={tab === "market" ? "is-active" : ""} onClick={() => setTab("market")}>
            Marketplace <em>{state.listings.length}</em>
          </button>
          <button className={tab === "collection" ? "is-active" : ""} onClick={() => setTab("collection")}>
            My Collection <em>{state.collection.length}</em>
          </button>
          <button className={tab === "history" ? "is-active" : ""} onClick={() => setTab("history")}>
            Trades <em>{state.history.length}</em>
          </button>
        </nav>
        <div className="wallet" title="Total trade value of your collection">
          💎 {collectionValue} pts
        </div>
      </header>

      <main>
        {tab !== "history" && <TypeFilter value={typeFilter} onChange={setTypeFilter} />}

        {tab === "market" && (
          <CardGrid
            items={marketItems}
            empty="No cards of this type are listed right now."
            onOpen={(item) => setViewing({ cardId: item.card.id, listing: state.listings.find((l) => l.id === item.key) })}
          />
        )}

        {tab === "collection" && (
          <CardGrid items={collectionItems} empty="No cards of this type yet. Visit the marketplace to trade for some!" onOpen={(item) => setViewing({ cardId: item.card.id })} />
        )}

        {tab === "history" && (
          <section className="history">
            {state.history.length === 0 ? (
              <p className="empty">No trades yet. Find a card you like in the marketplace and make an offer.</p>
            ) : (
              <ul>
                {state.history.map((h) => (
                  <li key={h.id} className={`history__row is-${h.status}`}>
                    <span className="history__status">{h.status === "accepted" ? "✅" : "❌"}</span>
                    <span>
                      Gave <b>{getCard(h.gaveCardId).name}</b> for <b>{getCard(h.gotCardId).name}</b> with {h.trader}
                    </span>
                    <time>{new Date(h.at).toLocaleString()}</time>
                  </li>
                ))}
              </ul>
            )}
            <button className="btn" onClick={() => confirm("Reset your collection and trade history?") && dispatch({ type: "reset" })}>
              Reset demo data
            </button>
          </section>
        )}
      </main>

      {viewing && (
        <CardViewer
          card={getCard(viewing.cardId)}
          onClose={closeViewer}
          action={
            viewingListing
              ? {
                  label: `Trade with ${viewingListing.trader.name}`,
                  onClick: () => {
                    setViewing(null);
                    setTrading(viewingListing);
                  },
                }
              : undefined
          }
        />
      )}

      {trading && <TradeDialog listing={trading} collection={state.collection} onResult={onTradeResult} onClose={closeTrade} />}
    </div>
  );
}
