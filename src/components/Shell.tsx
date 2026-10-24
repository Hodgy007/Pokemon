import type { CSSProperties, ReactNode } from "react";

export type Screen = "market" | "collection" | "trades" | "admin";

const NAV: { id: Screen; label: string; icon: ReactNode }[] = [
  {
    id: "market",
    label: "Marketplace",
    icon: <path d="M3 9l1.5-5h15L21 9M3 9h18M3 9v11h18V9M9 20v-6h6v6" />,
  },
  {
    id: "collection",
    label: "Collection",
    icon: <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11M9 8h6" />,
  },
  {
    id: "trades",
    label: "Trades",
    icon: <path d="M4 8h14l-4-4M20 16H6l4 4" />,
  },
];

function NavIcon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

/** The product's mark: a Poké Ball drawn in the card frame's yellow. */
export function Mark({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" fill="#000" stroke="#ffcb05" strokeWidth="2" />
      <path d="M1.5 12a10.5 10.5 0 0 1 21 0z" fill="#ffcb05" />
      <path d="M1.5 12h21" stroke="#000" strokeWidth="2" />
      <circle cx="12" cy="12" r="3.4" fill="#000" stroke="#ffcb05" strokeWidth="2" />
    </svg>
  );
}

export function Sidebar({ screen, onNavigate, onReset }: { screen: Screen; onNavigate: (s: Screen) => void; onReset: () => void }) {
  return (
    <aside className="sidebar">
      <div className="wordmark">
        <Mark />
        <span>PokeTradeX</span>
      </div>
      <nav aria-label="Main">
        {NAV.map((item) => (
          <button
            key={item.id}
            className="nav-item"
            aria-current={screen === item.id ? "page" : undefined}
            onClick={() => onNavigate(item.id)}
          >
            <NavIcon>{item.icon}</NavIcon>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="sidebar__bottom">
        <button className="nav-item nav-item--quiet" onClick={onReset}>
          <NavIcon>
            <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" />
          </NavIcon>
          Reset demo data
        </button>
      </div>
    </aside>
  );
}

export function BottomNav({ screen, onNavigate }: { screen: Screen; onNavigate: (s: Screen) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Main">
      {NAV.map((item) => (
        <button key={item.id} aria-current={screen === item.id ? "page" : undefined} onClick={() => onNavigate(item.id)}>
          <NavIcon>{item.icon}</NavIcon>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

interface TopbarProps {
  query: string;
  onQuery: (q: string) => void;
  cardCount: number;
  binderValue: number;
}

export function Topbar({ query, onQuery, cardCount, binderValue }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar__brand">
        <Mark size={22} />
      </div>
      <label className="search">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
        <span className="sr-only">Search cards</span>
        <input type="search" placeholder="Search cards" value={query} onChange={(e) => onQuery(e.target.value)} />
      </label>
      <div className="binder" title="Your collection">
        <span className="avatar" style={{ "--hue": 48 } as CSSProperties}>
          You
        </span>
        <span className="binder__text">
          <span>Your binder</span>
          <span className="binder__meta num">
            {cardCount} cards · {binderValue} pts
          </span>
        </span>
      </div>
    </header>
  );
}
