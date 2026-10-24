import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminScreen } from "./admin/AdminScreen";
import { memoryApi, neonApi } from "./admin/api";
import { CardViewer } from "./components/CardViewer";
import { Collection, Marketplace, TradeHistory } from "./components/Screens";
import { BottomNav, Sidebar, Topbar, type Screen } from "./components/Shell";
import { TradeDialog } from "./components/TradeDialog";
import { useCatalog, type Catalog } from "./data/catalog";
import { cardValue, getCard, setKnownCards } from "./data/cards";
import { bestOffer, useTradeStore } from "./state/store";
import type { Listing } from "./types";

const SCREENS: Screen[] = ["market", "collection", "trades", "admin"];

/**
 * The admin screen is in no menu; admins type /admin (or #/admin).
 * Turn /admin into the hash route the rest of the app uses.
 */
if (window.location.pathname.replace(/\/+$/, "") === "/admin") {
  window.history.replaceState(null, "", "/#/admin");
}

/** The screen lives in the URL hash (#/collection), so links and the back button work. */
function useHashScreen() {
  const read = (): Screen => {
    const name = window.location.hash.replace(/^#\/?/, "").split("?")[0];
    return SCREENS.includes(name as Screen) ? (name as Screen) : "market";
  };
  const [screen, setScreen] = useState<Screen>(read);
  useEffect(() => {
    const onHash = () => {
      setScreen(read());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const navigate = (s: Screen) => {
    window.location.hash = `/${s}`;
  };
  return [screen, navigate] as const;
}

/** #/admin?demo runs the admin screen against an in-memory copy, in development only. */
const DEMO = import.meta.env.DEV && /[?&]demo\b/.test(window.location.hash);

export default function App() {
  const { catalog, reload } = useCatalog();
  const [demoCatalog, setDemoCatalog] = useState<Catalog | null>(null);
  const shown = demoCatalog ?? catalog;

  if (!shown) return <Loading />;
  return (
    <Shop
      catalog={shown}
      reload={reload}
      onDemoChange={(next) => {
        setKnownCards(next.cards);
        setDemoCatalog(next);
      }}
    />
  );
}

interface ShopProps {
  catalog: Catalog;
  reload: () => Promise<void>;
  onDemoChange: (next: Catalog) => void;
}

interface Viewing {
  cardId: string;
  origin: HTMLElement | null;
  listing?: Listing;
}

function Shop({ catalog, reload, onDemoChange }: ShopProps) {
  const [state, dispatch] = useTradeStore(catalog);
  const [screen, navigate] = useHashScreen();
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState<Viewing | null>(null);
  const [trading, setTrading] = useState<Listing | null>(null);
  // The demo admin edits a copy of whatever catalogue loaded first.
  const api = useMemo(() => (DEMO ? memoryApi(catalog, onDemoChange) : neonApi), []);

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

  const reset = () => {
    if (confirm("Reset your binder and trade history? The marketplace returns to the current listings.")) dispatch({ type: "reset" });
  };

  return (
    <div className="app">
      <Sidebar screen={screen} onNavigate={navigate} onReset={reset} />
      <Topbar query={query} onQuery={setQuery} cardCount={state.collection.length} binderValue={binderValue} />

      <main className="canvas">
        {catalog.problem && screen !== "admin" && (
          <p className="notice">Couldn't reach the card database, so the built-in cards are showing. Your trades still work.</p>
        )}
        {screen === "market" && <Marketplace state={state} query={query} onOpen={open} onTrade={setTrading} />}
        {screen === "collection" && <Collection state={state} query={query} onOpen={open} />}
        {screen === "trades" && <TradeHistory state={state} onOpen={open} />}
        {screen === "admin" && <AdminScreen api={api} catalog={catalog} onChanged={DEMO ? () => {} : reload} demo={DEMO} />}
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

/** The final layout with flat placeholders where cards will appear. */
function Loading() {
  return (
    <div className="app" aria-busy="true">
      <Sidebar screen="market" onNavigate={() => {}} onReset={() => {}} />
      <Topbar query="" onQuery={() => {}} cardCount={0} binderValue={0} />
      <main className="canvas">
        <div className="title-row">
          <h1>Marketplace</h1>
          <p className="sub">Loading cards…</p>
        </div>
        <div className="grid">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="placeholder" />
          ))}
        </div>
      </main>
    </div>
  );
}
