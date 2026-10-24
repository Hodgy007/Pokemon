import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { cardValue, getCard, signatureAttack } from "../data/cards";
import { TYPE_META } from "../data/typeMeta";
import { EFFECTS } from "../effects/effects";
import { playEffect, type PlayHandle } from "../effects/engine";
import type { Listing } from "../types";
import { PokemonCard } from "./PokemonCard";
import type { OpenCard } from "./Screens";
import { TraderBadge } from "./Tile";

interface Props {
  listings: Listing[];
  onOpen: OpenCard;
  /** Scroll down to the listings. */
  onBrowse: () => void;
}

/** How long each featured card holds the front. */
const CYCLE_MS = 6500;
/** Delay after a card reaches the front before it attacks. */
const ATTACK_DELAY_MS = 900;
const FEATURED = 3;
/** Every type has its own attack animation, plus the ability aura. */
const ANIMATIONS = Object.keys(TYPE_META).length + 1;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The front page's opening: what PokeTradeX is, beside the most valuable
 * cards on offer. Every few seconds they shuffle and the card at the front
 * fires its signature move.
 */
export function Hero({ listings, onOpen, onBrowse }: Props) {
  // One listing per card, most valuable first.
  const featured = useMemo(() => {
    const seen = new Set<string>();
    return [...listings]
      .sort((a, b) => cardValue(getCard(b.card.cardId)) - cardValue(getCard(a.card.cardId)))
      .filter((l) => !seen.has(l.card.cardId) && seen.add(l.card.cardId))
      .slice(0, FEATURED);
  }, [listings]);
  const traders = new Set(listings.map((l) => l.trader.id)).size;

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const front = featured.length ? featured[index % featured.length] : null;

  useEffect(() => {
    if (featured.length < 2 || paused || reducedMotion()) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % featured.length), CYCLE_MS);
    return () => clearInterval(id);
  }, [featured.length, paused]);

  // Each time a card takes the front, it attacks.
  const frontId = front?.id;
  useEffect(() => {
    if (!frontId || reducedMotion()) return;
    let handle: PlayHandle | null = null;
    const id = window.setTimeout(() => {
      const canvas = canvasRef.current;
      const art = artRef.current;
      const cardEl = art?.closest(".card");
      const listing = featured.find((l) => l.id === frontId);
      if (!canvas || !art || !cardEl || !listing) return;
      // The canvas covers the showcase, so positions are relative to it.
      const box = canvas.getBoundingClientRect();
      const a = art.getBoundingClientRect();
      const c = cardEl.getBoundingClientRect();
      const card = getCard(listing.card.cardId);
      const atk = signatureAttack(card);
      handle = playEffect(canvas, EFFECTS[atk.effect ?? card.type], {
        origin: { x: a.left - box.left + a.width / 2, y: a.top - box.top + a.height / 2 },
        rect: { left: c.left - box.left, top: c.top - box.top, width: c.width, height: c.height },
        color: TYPE_META[card.type].color,
      });
    }, ATTACK_DELAY_MS);
    return () => {
      clearTimeout(id);
      handle?.cancel();
    };
  }, [frontId, featured]);

  const card = front ? getCard(front.card.cardId) : null;
  const atk = card ? signatureAttack(card) : null;
  const frontCardEl = () => stageRef.current?.querySelector<HTMLElement>(".hero__card.slot-0 .card") ?? null;

  return (
    <section
      className="hero"
      aria-labelledby="hero-title"
      style={{ "--halo": card ? TYPE_META[card.type].color : "#ffcb05" } as CSSProperties}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="hero__text">
        <h1 id="hero-title" className="hero__title">
          <span>Swap cards.</span> <span>Watch them fight.</span>
        </h1>
        <p className="hero__lede">
          PokeTradeX is a marketplace for holographic Pokémon cards. Offer a card from your binder, see your odds before you send it, and watch
          every card's moves come to life.
        </p>
        <div className="hero__actions">
          <button className="btn btn--primary btn--large" onClick={onBrowse}>
            Browse the marketplace
          </button>
          {front && card && atk && (
            <button className="btn btn--large" onClick={() => onOpen(card.id, frontCardEl() ?? document.body, front)}>
              Watch {card.name} attack
            </button>
          )}
        </div>
        <dl className="hero__facts">
          <div>
            <dt>Cards for trade</dt>
            <dd className="num">{listings.length}</dd>
          </div>
          <div>
            <dt>Trainers trading</dt>
            <dd className="num">{traders}</dd>
          </div>
          <div>
            <dt>Attack animations</dt>
            <dd className="num">{ANIMATIONS}</dd>
          </div>
        </dl>
      </div>

      {front && card && atk && (
        <div className="hero__showcase">
          <div className="hero__stage" ref={stageRef}>
            <div className="hero__halo" aria-hidden="true" />
            {featured.map((l, i) => {
              // Slot 0 is the front; the others fan out behind it.
              const slot = (i - (index % featured.length) + featured.length) % featured.length;
              return (
                <div key={l.id} className={`hero__card slot-${slot}`}>
                  <PokemonCard
                    ref={slot === 0 ? artRef : undefined}
                    card={getCard(l.card.cardId)}
                    onClick={(el) => (slot === 0 ? onOpen(l.card.cardId, el, l) : setIndex(i))}
                  />
                </div>
              );
            })}
          </div>
          <div className="hero__caption" key={front.id}>
            <span className="hero__caption-text">
              <TraderBadge trader={front.trader} />
              <span>
                <b>{card.name}</b> · {atk.name}
                {atk.damage ? ` ${atk.damage}` : ""} · <span className="num">{cardValue(card)} pts</span>
              </span>
            </span>
            {featured.length > 1 && (
              <span className="hero__dots" role="group" aria-label="Featured cards">
                {featured.map((l, i) => (
                  <button key={l.id} aria-label={`Show ${getCard(l.card.cardId).name}`} aria-pressed={l.id === front.id} onClick={() => setIndex(i)} />
                ))}
              </span>
            )}
          </div>
          {/* Effects stay over the cards, never over the words. */}
          <canvas ref={canvasRef} className="hero__canvas" aria-hidden="true" />
        </div>
      )}
    </section>
  );
}
