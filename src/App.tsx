import { useCallback, useEffect, useState } from "react";
import { CardViewer } from "./components/CardViewer";
import { Collection, Marketplace, TradeHistory, assertCatalogue } from "./components/Screens";
import { BottomNav, Sidebar, Topbar, type Screen } from "./components/Shell";
import { TradeDialog } from "./components/TradeDialog";
import { cardValue, getCard } from "./data/cards";
import { bestOffer, useTradeStore } from "./state/store";
import type { Listing } from "./types";

interface Viewing {
  cardId: string;
  origin: HTMLElement | null;
  listing?: Listing;
}

export default function App() {
  const [state, dispatch] = useTradeStore();
  const [screen, setScreen] = useState<Screen>("market");
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState<Viewing | null>(null);
  const [trading, setTrading] = useState<Listing | null>(null);

  useEffect(() => {
    if (import.meta.env.DEV) assertCatalogue(state);
  }, [state]);

  const binderValue = state.collection.reduce((sum, c) => sum + cardValue(getCard(c.cardId)), 0);

  const open = useCallback((cardId: string, origin: HTMLElement, listing?: Listing) => setViewing({ cardId, origin, listing }), []);
  const closeViewer = useCallback(() => setViewing(null), []);
  const closeTrade = useCallback(() => setTrading(null), []);
  const onTradeResult = useCallback(
    (offeredUid: string, accepted: boolean) => {
      if (!trading) return;
      dispatch({ type: accepted ? "tradeAccepted" : "tradeDeclined", listingId: trading.id, offeredUid });
    },
    [trading, dispatch],
  );

  const navigate = (s: Screen) => {
    setScreen(s);
    window.scrollTo({ top: 0 });
  };

  const reset = () => {
    if (confirm("Reset your binder, the marketplace and your trade history to the demo data?")) dispatch({ type: "reset" });
  };

  return (
    <div className="app">
      <Sidebar screen={screen} onNavigate={navigate} onReset={reset} />
      <Topbar query={query} onQuery={setQuery} cardCount={state.collection.length} binderValue={binderValue} />

      <main className="canvas">
        {screen === "market" && <Marketplace state={state} query={query} onOpen={open} onTrade={setTrading} />}
        {screen === "collection" && <Collection state={state} query={query} onOpen={open} />}
        {screen === "trades" && <TradeHistory state={state} onOpen={open} />}
      </main>

      <BottomNav screen={screen} onNavigate={navigate} />

      {viewing && (
        <CardViewer
          key={viewing.cardId + (viewing.listing?.id ?? "")}
          card={getCard(viewing.cardId)}
          origin={viewing.origin}
          listing={viewing.listing}
          best={viewing.listing ? bestOffer(state.collection, viewing.cardId) : null}
          onClose={closeViewer}
          onTrade={
            viewing.listing
              ? () => {
                  setTrading(viewing.listing!);
                  setViewing(null);
                }
              : undefined
          }
        />
      )}

      {trading && <TradeDialog listing={trading} collection={state.collection} onResult={onTradeResult} onClose={closeTrade} />}
    </div>
  );
}
