import { useEffect, useState } from "react";
import { cardValue, getCard } from "../data/cards";
import { acceptChance } from "../state/store";
import type { Listing, OwnedCard } from "../types";
import { PokemonCard } from "./PokemonCard";

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
  const [offered, setOffered] = useState<OwnedCard | null>(null);
  const [phase, setPhase] = useState<Phase>("choose");
  const chance = offered ? acceptChance(offered.cardId, wanted.id) : 0;

  useEffect(() => {
    if (phase !== "waiting" || !offered) return;
    const id = window.setTimeout(() => {
      const accepted = Math.random() < chance;
      setPhase(accepted ? "accepted" : "declined");
      onResult(offered.uid, accepted);
    }, RESPONSE_MS);
    return () => clearTimeout(id);
  }, [phase, offered, chance, onResult]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && phase !== "waiting" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, phase]);

  const offeredCard = offered ? getCard(offered.cardId) : null;

  return (
    <div className="dialog-backdrop" onClick={() => phase !== "waiting" && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label="Offer a trade" onClick={(e) => e.stopPropagation()}>
        <h2>
          Trade with {listing.trader.avatar} {listing.trader.name}
        </h2>

        <div className={`trade-table phase-${phase}`}>
          <div className="trade-slot">
            <span className="trade-slot__label">You give</span>
            {offeredCard ? <PokemonCard card={offeredCard} /> : <div className="trade-slot__empty">Pick a card below</div>}
          </div>
          <div className="trade-arrows" aria-hidden="true">
            ⇄
          </div>
          <div className="trade-slot">
            <span className="trade-slot__label">You get</span>
            <PokemonCard card={wanted} />
          </div>
        </div>

        {phase === "choose" && (
          <>
            <div className="fairness">
              <span>Chance they accept</span>
              <div className="fairness__bar">
                <div className="fairness__fill" style={{ width: `${chance * 100}%` }} />
              </div>
              <strong>{offered ? `${Math.round(chance * 100)}%` : "—"}</strong>
            </div>
            <div className="picker">
              {collection.map((c) => {
                const card = getCard(c.cardId);
                return (
                  <button
                    key={c.uid}
                    className={`picker__item ${offered?.uid === c.uid ? "is-selected" : ""}`}
                    onClick={() => setOffered(c)}
                  >
                    <PokemonCard card={card} />
                    <span>{cardValue(card)} pts</span>
                  </button>
                );
              })}
            </div>
            <div className="dialog__actions">
              <button className="btn" onClick={onClose}>
                Cancel
              </button>
              <button className="btn btn--primary" disabled={!offered} onClick={() => setPhase("waiting")}>
                Send offer
              </button>
            </div>
          </>
        )}

        {phase === "waiting" && <p className="trade-status">{listing.trader.name} is considering your offer…</p>}
        {phase === "accepted" && (
          <>
            <p className="trade-status trade-status--good">🎉 Trade accepted! {wanted.name} is now in your collection.</p>
            <div className="dialog__actions">
              <button className="btn btn--primary" onClick={onClose}>
                Nice!
              </button>
            </div>
          </>
        )}
        {phase === "declined" && (
          <>
            <p className="trade-status trade-status--bad">{listing.trader.name} declined. Try offering a more valuable card.</p>
            <div className="dialog__actions">
              <button className="btn" onClick={onClose}>
                Close
              </button>
              <button className="btn btn--primary" onClick={() => setPhase("choose")}>
                Try again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
