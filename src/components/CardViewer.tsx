import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cardValue, getCard, signatureAttack } from "../data/cards";
import { RARITY_META, TYPE_META } from "../data/typeMeta";
import { EFFECTS } from "../effects/effects";
import { playEffect, type PlayHandle } from "../effects/engine";
import type { BestOffer } from "../state/store";
import type { Attack, CardData, EffectKind, Listing } from "../types";
import { EnergyIcon } from "./EnergyIcon";
import { PokemonCard } from "./PokemonCard";
import { Points, TraderBadge } from "./Tile";

interface Props {
  card: CardData;
  /** The card element that was clicked; the viewer grows out of it and returns to it. */
  origin: HTMLElement | null;
  listing?: Listing;
  best: BestOffer | null;
  onClose: () => void;
  onTrade?: () => void;
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Time after the card lands before its signature move plays. */
const AUTOPLAY_DELAY_MS = 650;
const FLY_MS = 560;
const RETURN_MS = 380;

export function CardViewer({ card, origin, listing, best, onClose, onTrade }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardAnimRef = useRef<HTMLDivElement>(null);
  const movesRef = useRef<HTMLDivElement>(null);
  const effectRef = useRef<PlayHandle | null>(null);
  const runRef = useRef(0);
  const timers = useRef<number[]>([]);
  const closingRef = useRef(false);
  const [active, setActive] = useState<string | null>(null);
  const [damage, setDamage] = useState<{ value: number; key: number; color: string } | null>(null);
  const [closing, setClosing] = useState(false);
  const meta = TYPE_META[card.type];

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const shake = useCallback((strength: number) => {
    const el = stageRef.current;
    if (!el) return;
    el.style.setProperty("--shake", `${Math.min(14, 6 * strength)}px`);
    restartAnimation(el, "shake");
  }, []);

  /** Fire a move: its energy flies into the card, then the attack plays. */
  const play = useCallback(
    async (name: string, kind: EffectKind, dmg: number) => {
      const run = ++runRef.current;
      effectRef.current?.cancel();
      clearTimers();
      setActive(name);

      const reduced = reducedMotion();
      const art = artRef.current;
      const button = movesRef.current?.querySelector<HTMLElement>(`[data-move="${CSS.escape(name)}"]`);
      if (!reduced && art && button) await chargeEnergy(button, art);
      if (run !== runRef.current || closingRef.current) return;

      if (cardAnimRef.current) restartAnimation(cardAnimRef.current, "lunge");
      const artRect = art?.getBoundingClientRect();
      const cardRect = art?.closest(".card")?.getBoundingClientRect();
      if (!reduced && canvasRef.current && artRect && cardRect) {
        const handle = playEffect(
          canvasRef.current,
          EFFECTS[kind],
          {
            origin: { x: artRect.left + artRect.width / 2, y: artRect.top + artRect.height / 2 },
            rect: { left: cardRect.left, top: cardRect.top, width: cardRect.width, height: cardRect.height },
            color: meta.color,
          },
          { onImpact: shake },
        );
        effectRef.current = handle;
        handle.done.then(() => run === runRef.current && setActive(null));
      } else {
        timers.current.push(window.setTimeout(() => setActive(null), 600));
      }

      if (dmg > 0) {
        const color = TYPE_META[kind === "aura" ? card.type : kind].color;
        timers.current.push(window.setTimeout(() => setDamage({ value: dmg, key: Date.now(), color }), reduced ? 0 : 850));
      }
    },
    [card.type, meta.color, shake],
  );

  const playAttack = (atk: Attack) => play(atk.name, atk.effect ?? card.type, atk.damage);

  // Grow out of the clicked card, then play the signature move.
  useLayoutEffect(() => {
    const el = cardAnimRef.current;
    if (el && origin && !reducedMotion()) {
      el.animate(flyKeyframes(origin, el), { duration: FLY_MS, easing: "cubic-bezier(0.2, 0.9, 0.25, 1.08)" });
    }
    const atk = signatureAttack(card);
    const id = window.setTimeout(() => play(atk.name, atk.effect ?? card.type, atk.damage), origin ? AUTOPLAY_DELAY_MS : 200);
    return () => {
      clearTimeout(id);
      clearTimers();
      runRef.current++;
      effectRef.current?.cancel();
    };
  }, [card, origin, play]);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    effectRef.current?.cancel();
    setClosing(true);
    const el = cardAnimRef.current;
    if (el && origin && origin.isConnected && !reducedMotion()) {
      el.animate([...flyKeyframes(origin, el)].reverse(), { duration: RETURN_MS, easing: "cubic-bezier(0.4, 0, 0.6, 1)", fill: "forwards" })
        .finished.then(onClose, onClose);
    } else {
      onClose();
    }
  }, [origin, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const offerCard = best ? getCard(best.offered.cardId) : null;

  return (
    <div className={`viewer ${closing ? "is-closing" : ""}`} role="dialog" aria-modal="true" aria-label={card.name} onClick={close}>
      <div className="viewer__stage" ref={stageRef} onAnimationEnd={(e) => e.target === e.currentTarget && e.currentTarget.classList.remove("shake")}>
        <div className="viewer__card" onClick={(e) => e.stopPropagation()}>
          <div ref={cardAnimRef}>
            <PokemonCard ref={artRef} card={card} variant="full" />
          </div>
          {damage && (
            <div key={damage.key} className="damage-pop num" style={{ color: damage.color }} onAnimationEnd={() => setDamage(null)}>
              {damage.value}
            </div>
          )}
        </div>

        <section className="viewer__panel" onClick={(e) => e.stopPropagation()} aria-labelledby="viewer-title">
          <button className="icon-button viewer__close" onClick={close} aria-label="Close">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <p className="viewer__meta">
            <EnergyIcon type={card.type} size="16px" />
            {meta.label} · {card.stage} · {RARITY_META[card.rarity].label} · #{String(card.dex).padStart(3, "0")}
          </p>
          <h2 id="viewer-title">{card.name}</h2>
          <p className="viewer__flavor">{card.flavor}</p>

          <dl className="stats">
            <div>
              <dt>HP</dt>
              <dd className="num">{card.hp}</dd>
            </div>
            <div>
              <dt>Trade value</dt>
              <dd>
                <Points value={cardValue(card)} />
              </dd>
            </div>
            <div>
              <dt>{listing ? "Your best offer" : "Owner"}</dt>
              <dd>
                {listing ? (
                  best && offerCard && best.chance > 0 ? (
                    <>
                      <span className={`num reach ${best.chance >= 0.5 ? "is-reachable" : ""}`}>{Math.round(best.chance * 100)}%</span>
                      <small className="stats__note"> with {offerCard.name}</small>
                    </>
                  ) : (
                    <>
                      <span className="reach">—</span>
                      <small className="stats__note"> out of reach</small>
                    </>
                  )
                ) : (
                  "You"
                )}
              </dd>
            </div>
          </dl>

          <div className="moves" ref={movesRef}>
            {card.ability && (
              <button
                data-move={card.ability.name}
                className={`move ${active === card.ability.name ? "is-active" : ""}`}
                onClick={() => play(card.ability!.name, "aura", 0)}
              >
                <span className="move__cost">
                  <span className="pill pill--neutral">Ability</span>
                </span>
                <span className="move__name">{card.ability.name}</span>
                <span className="move__damage">—</span>
                <span className="move__text">{card.ability.text}</span>
              </button>
            )}
            {card.attacks.map((atk) => (
              <button
                key={atk.name}
                data-move={atk.name}
                className={`move ${active === atk.name ? "is-active" : ""}`}
                onClick={() => playAttack(atk)}
              >
                <span className="move__cost">
                  {atk.cost.map((t, i) => (
                    <EnergyIcon key={i} type={t} size="20px" />
                  ))}
                </span>
                <span className="move__name">{atk.name}</span>
                <span className="move__damage num">{atk.damage || "—"}</span>
                {atk.text && <span className="move__text">{atk.text}</span>}
              </button>
            ))}
          </div>

          {listing && onTrade && (
            <div className="viewer__actions">
              <span className="viewer__trader">
                <TraderBadge trader={listing.trader} />
                Listed by {listing.trader.name}
              </span>
              <button className="btn btn--primary" onClick={onTrade}>
                Offer a trade
              </button>
            </div>
          )}
        </section>
      </div>
      <canvas ref={canvasRef} className="viewer__fx" aria-hidden="true" />
    </div>
  );
}

/** Keyframes that move `el` from where `origin` sits on screen to where `el` sits now. */
function flyKeyframes(origin: HTMLElement, el: HTMLElement): Keyframe[] {
  const from = origin.getBoundingClientRect();
  const to = el.getBoundingClientRect();
  const scale = from.width / to.width;
  return [
    { transformOrigin: "0 0", transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${scale}) rotateY(-20deg)` },
    { transformOrigin: "0 0", transform: "translate(0, 0) scale(1) rotateY(0deg)" },
  ];
}

/** Fly a copy of each energy symbol on the move's button along an arc into the artwork. */
async function chargeEnergy(button: HTMLElement, art: HTMLElement) {
  const icons = [...button.querySelectorAll<SVGElement>(".move__cost .energy")];
  const target = art.getBoundingClientRect();
  const tx = target.left + target.width / 2;
  const ty = target.top + target.height / 2;
  await Promise.all(
    icons.map((icon, i) => {
      const r = icon.getBoundingClientRect();
      const flyer = icon.cloneNode(true) as SVGElement;
      flyer.classList.add("energy-flight");
      Object.assign(flyer.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
      document.body.appendChild(flyer);
      const dx = tx - (r.left + r.width / 2);
      const dy = ty - (r.top + r.height / 2);
      return flyer
        .animate(
          [
            { transform: "translate(0, 0) scale(1)", opacity: 1 },
            { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 90}px) scale(1.8)`, opacity: 1, offset: 0.55 },
            { transform: `translate(${dx}px, ${dy}px) scale(0.3)`, opacity: 0.2 },
          ],
          { duration: 520, delay: i * 90, easing: "cubic-bezier(0.5, 0, 0.3, 1)", fill: "forwards" },
        )
        .finished.catch(() => {})
        .finally(() => flyer.remove());
    }),
  );
}

/** Re-run a one-shot CSS animation class even if it is already applied. */
function restartAnimation(el: HTMLElement, className: string) {
  el.classList.remove(className);
  void el.offsetWidth; // force a reflow so the browser sees the class as new
  el.classList.add(className);
}
