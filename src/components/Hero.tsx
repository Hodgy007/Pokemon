import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cardValue, findCard, getCard, signatureAttack } from "../data/cards";
import { TYPE_META } from "../data/typeMeta";
import { EFFECTS } from "../effects/effects";
import { playEffect, type PlayHandle } from "../effects/engine";
import type { CardData, Listing } from "../types";
import { PokemonCard } from "./PokemonCard";
import type { OpenCard } from "./Screens";
import { TraderBadge } from "./Tile";

interface Props {
  listings: Listing[];
  onOpen: OpenCard;
  /** Scroll down to the listings. */
  onBrowse: () => void;
}

/**
 * The looping battle clip behind the hero, and the card it brings to life.
 * Made with Kling 3.0 from the card's artwork; the first and last frames are
 * the same, so it loops without a jump.
 */
const FILM = {
  cardId: "charizard",
  src: "https://d2ol7oe51mr4n9.cloudfront.net/user_3DqgxjOWdfqGrLle4YXwDfkd7gi/c9ce9e36-0926-4e5d-bd4b-b665d275715f.mp4",
  poster: "https://d2ol7oe51mr4n9.cloudfront.net/user_3DqgxjOWdfqGrLle4YXwDfkd7gi/1031b176-8431-449a-9ac2-2edf027c0d8b.jpg",
};

/** How long each featured card holds the front. */
const CYCLE_MS = 6500;
/** Delay after a card reaches the front before it attacks. */
const ATTACK_DELAY_MS = 900;
const FEATURED = 3;
/** Every type has its own attack animation, plus the ability aura. */
const ANIMATIONS = Object.keys(TYPE_META).length + 1;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The front page's opening: what PokeTradeX is, beside a card brought to
 * life. If the clip can't play, the most valuable cards on offer take its
 * place: every few seconds they shuffle and the front card fires its move.
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

  const [filmFailed, setFilmFailed] = useState(false);
  const filmCard = filmFailed ? undefined : findCard(FILM.cardId);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const showcaseRef = useRef<HTMLDivElement>(null);

  const front = filmCard
    ? listings.find((l) => l.card.cardId === filmCard.id)
    : featured.length
      ? featured[index % featured.length]
      : undefined;
  const card = filmCard ?? (front ? getCard(front.card.cardId) : null);
  const frontCardEl = () => showcaseRef.current?.querySelector<HTMLElement>("[data-front] .card") ?? null;

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
          {card && (
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

      {filmCard ? (
        <div className="hero__showcase hero__showcase--film" ref={showcaseRef}>
          <Film onFail={() => setFilmFailed(true)} />
          <div className="hero__feature" data-front>
            <PokemonCard card={filmCard} onClick={(el) => onOpen(filmCard.id, el, front)} />
          </div>
          <Caption card={filmCard} listing={front} />
        </div>
      ) : (
        card &&
        front && (
          <div className="hero__showcase" ref={showcaseRef}>
            <CardStage featured={featured} index={index} setIndex={setIndex} paused={paused} onOpen={onOpen} />
            <Caption card={card} listing={front}>
              {featured.length > 1 && (
                <span className="hero__dots" role="group" aria-label="Featured cards">
                  {featured.map((l, i) => (
                    <button key={l.id} aria-label={`Show ${getCard(l.card.cardId).name}`} aria-pressed={l.id === front.id} onClick={() => setIndex(i)} />
                  ))}
                </span>
              )}
            </Caption>
          </div>
        )
      )}
    </section>
  );
}

/** The battle clip. It plays muted on a loop while it's on screen, and stays on its poster frame for reduced motion. */
function Film({ onFail }: { onFail: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || reducedMotion()) return;
    video.muted = true;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) video.play().catch(() => {});
      else video.pause();
    });
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      className="hero__film"
      src={FILM.src}
      poster={FILM.poster}
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
      onError={onFail}
    />
  );
}

function Caption({ card, listing, children }: { card: CardData; listing?: Listing; children?: ReactNode }) {
  const atk = signatureAttack(card);
  return (
    <div className="hero__caption" key={card.id}>
      <span className="hero__caption-text">
        {listing && <TraderBadge trader={listing.trader} />}
        <span>
          <b>{card.name}</b> · {atk.name}
          {atk.damage ? ` ${atk.damage}` : ""} · <span className="num">{cardValue(card)} pts</span>
        </span>
      </span>
      {children}
    </div>
  );
}

interface StageProps {
  featured: Listing[];
  index: number;
  setIndex: (i: number | ((i: number) => number)) => void;
  paused: boolean;
  onOpen: OpenCard;
}

/** The fallback: the featured cards fan out, shuffle, and the front one attacks. */
function CardStage({ featured, index, setIndex, paused, onOpen }: StageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const front = featured[index % featured.length];

  useEffect(() => {
    if (featured.length < 2 || paused || reducedMotion()) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % featured.length), CYCLE_MS);
    return () => clearInterval(id);
  }, [featured.length, paused, setIndex]);

  // Each time a card takes the front, it attacks.
  const frontId = front.id;
  useEffect(() => {
    if (reducedMotion()) return;
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
      const attacker = getCard(listing.card.cardId);
      const move = signatureAttack(attacker);
      handle = playEffect(canvas, EFFECTS[move.effect ?? attacker.type], {
        origin: { x: a.left - box.left + a.width / 2, y: a.top - box.top + a.height / 2 },
        rect: { left: c.left - box.left, top: c.top - box.top, width: c.width, height: c.height },
        color: TYPE_META[attacker.type].color,
      });
    }, ATTACK_DELAY_MS);
    return () => {
      clearTimeout(id);
      handle?.cancel();
    };
  }, [frontId, featured]);

  return (
    <>
      <div className="hero__stage">
        <div className="hero__halo" aria-hidden="true" />
        {featured.map((l, i) => {
          // Slot 0 is the front; the others fan out behind it.
          const slot = (i - (index % featured.length) + featured.length) % featured.length;
          return (
            <div key={l.id} className={`hero__card slot-${slot}`} data-front={slot === 0 ? "" : undefined}>
              <PokemonCard
                ref={slot === 0 ? artRef : undefined}
                card={getCard(l.card.cardId)}
                onClick={(el) => (slot === 0 ? onOpen(l.card.cardId, el, l) : setIndex(i))}
              />
            </div>
          );
        })}
      </div>
      {/* Effects stay over the cards, never over the words. */}
      <canvas ref={canvasRef} className="hero__canvas" aria-hidden="true" />
    </>
  );
}
