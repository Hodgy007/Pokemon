import { useEffect, useRef, useState } from "react";
import { cardValue, getCard } from "../data/cards";
import { TYPE_META } from "../data/typeMeta";
import { CELEBRATE } from "../effects/effects";
import { playEffect } from "../effects/engine";
import { REACH_THRESHOLD, acceptChance } from "../state/store";
import type { Listing, OwnedCard } from "../types";
import { PokemonCard } from "./PokemonCard";
import { CardThumb, Points, TraderBadge } from "./Tile";

interface Props {
  listing: Listing;
  collection: OwnedCard[];
  onResult: (offeredUid: string, accepted: boolean) => void;
  onClose: () => void;
}

type Phase = "choose" | "waiting" | "accepted" | "declined";

/** How long the (simulated) trader takes to answer. */
const RESPONSE_MS = 1400;

export function TradeDialog({ listing, collection, onResult, onClose }: Props) {
  const wanted = getCard(listing.card.cardId);
  const options = collection
    .map((owned) => ({ owned, card: getCard(owned.cardId), chance: acceptChance(owned.cardId, wanted.id) }))
    .sort((a, b) => b.chance - a.chance || cardValue(a.card) - cardValue(b.card));
  const [offered, setOffered] = useState<OwnedCard | null>(options[0]?.owned ?? null);
  const [phase, setPhase] = useState<Phase>("choose");
  const tableRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chance = offered ? acceptChance(offered.cardId, wanted.id) : 0;
  const offeredCard = offered ? getCard(offered.cardId) : null;

  useEffect(() => {
    if (phase !== "waiting" || !offered) return;
    const id = window.setTimeout(() => {
      const accepted = Math.random() < chance;
      setPhase(accepted ? "accepted" : "declined");
      onResult(offered.uid, accepted);
    }, RESPONSE_MS);
    return () => clearTimeout(id);
  }, [phase, offered, chance, onResult]);

  // Celebrate an accepted trade over the two cards.
  useEffect(() => {
    if (phase !== "accepted" || !canvasRef.current || !tableRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = tableRef.current.getBoundingClientRect();
    const handle = playEffect(canvasRef.current, CELEBRATE, {
      origin: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
      rect: { left: r.left, top: r.top, width: r.width, height: r.height },
      color: TYPE_META[wanted.type].color,
    });
    return handle.cancel;
  }, [phase, wanted.type]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && phase !== "waiting" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, phase]);

  return (
    <div className="dialog-backdrop" onClick={() => phase !== "waiting" && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="trade-title" onClick={(e) => e.stopPropagation()}>
        <header className="dialog__header">
          <div>
            <h2 id="trade-title">Offer a trade</h2>
            <p className="sub">
              <TraderBadge trader={listing.trader} /> {listing.trader.name} is trading {wanted.name} ({cardValue(wanted)} pts).
            </p>
          </div>
        </header>

        <div ref={tableRef} className={`trade-table phase-${phase}`}>
          <div className="trade-slot">
            <span className="trade-slot__label">You give</span>
            {offeredCard ? <PokemonCard card={offeredCard} /> : <div className="trade-slot__empty">Choose a card below</div>}
          </div>
          <svg className="trade-arrows" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8h14l-4-4M20 16H6l4 4" />
          </svg>
          <div className="trade-slot">
            <span className="trade-slot__label">You get</span>
            <PokemonCard card={wanted} />
          </div>
        </div>

        {phase === "choose" && (
          <>
            <div className="picker" role="radiogroup" aria-label="Card to offer">
              <div className="picker__head">
                <span>Your cards</span>
                <span className="num">Value</span>
                <span className="num">Chance</span>
              </div>
              {options.length === 0 && <p className="empty">Your binder is empty, so there is nothing to offer.</p>}
              {options.map(({ owned, card, chance: c }) => (
                <button
                  key={owned.uid}
                  role="radio"
                  aria-checked={offered?.uid === owned.uid}
                  className="picker__row"
                  onClick={() => setOffered(owned)}
                >
                  <span className="picker__card">
                    <CardThumb card={card} />
                    {card.name}
                  </span>
                  <Points value={cardValue(card)} />
                  <span className={`num reach ${c >= REACH_THRESHOLD ? "is-reachable" : ""}`}>{Math.round(c * 100)}%</span>
                </button>
              ))}
            </div>
            <div className="dialog__actions">
              <button className="btn" onClick={onClose}>
                Cancel
              </button>
              <button className="btn btn--primary" disabled={!offered} onClick={() => setPhase("waiting")}>
                Send offer{offered ? ` · ${Math.round(chance * 100)}% chance` : ""}
              </button>
            </div>
          </>
        )}

        {phase === "waiting" && <p className="trade-status">{listing.trader.name} is looking at your offer…</p>}

        {phase === "accepted" && (
          <>
            <p className="trade-status trade-status--good">Trade accepted. {wanted.name} is in your binder.</p>
            <div className="dialog__actions">
              <button className="btn btn--primary" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        )}

        {phase === "declined" && (
          <>
            <p className="trade-status">{listing.trader.name} declined. A more valuable card would improve your chances.</p>
            <div className="dialog__actions">
              <button className="btn" onClick={onClose}>
                Close
              </button>
              <button className="btn btn--primary" onClick={() => setPhase("choose")}>
                Try another card
              </button>
            </div>
          </>
        )}
      </div>
      <canvas ref={canvasRef} className="viewer__fx" aria-hidden="true" />
    </div>
  );
}
