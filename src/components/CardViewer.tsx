import { useCallback, useEffect, useRef, useState } from "react";
import { cardValue, signatureAttack } from "../data/cards";
import { RARITY_META, TYPE_META } from "../data/typeMeta";
import { EFFECTS } from "../effects/effects";
import { playEffect, type PlayHandle } from "../effects/engine";
import type { Attack, CardData, EffectKind } from "../types";
import { EnergyIcon } from "./EnergyIcon";
import { PokemonCard } from "./PokemonCard";

interface Props {
  card: CardData;
  onClose: () => void;
  /** Optional action button, e.g. "Offer a trade". */
  action?: { label: string; onClick: () => void };
}

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Time after the card enters before the signature move auto-plays. */
const AUTOPLAY_DELAY_MS = 700;

export function CardViewer({ card, onClose, action }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardAnimRef = useRef<HTMLDivElement>(null);
  const effectRef = useRef<PlayHandle | null>(null);
  const timers = useRef<number[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [damage, setDamage] = useState<{ value: number; key: number; color: string } | null>(null);
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

  const play = useCallback(
    (name: string, kind: EffectKind, dmg: number) => {
      effectRef.current?.cancel();
      clearTimers();
      setActive(name);
      if (cardAnimRef.current) restartAnimation(cardAnimRef.current, "lunge");

      const reduced = prefersReducedMotion();
      const art = artRef.current?.getBoundingClientRect();
      const cardEl = artRef.current?.closest(".card")?.getBoundingClientRect();
      if (!reduced && canvasRef.current && art && cardEl) {
        const handle = playEffect(
          canvasRef.current,
          EFFECTS[kind],
          {
            origin: { x: art.left + art.width / 2, y: art.top + art.height / 2 },
            rect: { left: cardEl.left, top: cardEl.top, width: cardEl.width, height: cardEl.height },
            color: meta.color,
          },
          { onImpact: shake },
        );
        effectRef.current = handle;
        handle.done.then(() => effectRef.current === handle && setActive(null));
      } else {
        timers.current.push(window.setTimeout(() => setActive(null), 600));
      }

      if (dmg > 0) {
        timers.current.push(
          window.setTimeout(() => setDamage({ value: dmg, key: Date.now(), color: TYPE_META[kind === "aura" ? card.type : kind].color }), reduced ? 0 : 900),
        );
      }
    },
    [card.type, meta.color, shake],
  );

  const playAttack = (atk: Attack) => play(atk.name, atk.effect ?? card.type, atk.damage);

  // Auto-play the signature move once the card has flipped in.
  useEffect(() => {
    const atk = signatureAttack(card);
    const id = window.setTimeout(() => play(atk.name, atk.effect ?? card.type, atk.damage), AUTOPLAY_DELAY_MS);
    return () => {
      clearTimeout(id);
      clearTimers();
      effectRef.current?.cancel();
    };
  }, [card, play]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label={card.name} onClick={onClose}>
      <div className="viewer__bg" style={{ background: `radial-gradient(circle at 35% 45%, ${meta.color}55, transparent 60%)` }} />
      <div className="viewer__stage" ref={stageRef} onAnimationEnd={(e) => e.target === e.currentTarget && e.currentTarget.classList.remove("shake")}>
        <div className="viewer__card" onClick={(e) => e.stopPropagation()}>
          <div ref={cardAnimRef} className="enter">
            <PokemonCard ref={artRef} card={card} />
          </div>
          {damage && (
            <div key={damage.key} className="damage-pop" style={{ color: damage.color }} onAnimationEnd={() => setDamage(null)}>
              {damage.value}
            </div>
          )}
        </div>

        <aside className="viewer__panel" onClick={(e) => e.stopPropagation()}>
          <button className="viewer__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
          <div className="viewer__type" style={{ color: meta.light }}>
            <EnergyIcon type={card.type} size="1.4em" /> {meta.label} · {card.stage} · {RARITY_META[card.rarity].label}
          </div>
          <h2>{card.name}</h2>
          <p className="viewer__flavor">{card.flavor}</p>

          {card.ability && (
            <button
              className={`move move--ability ${active === card.ability.name ? "is-active" : ""}`}
              onClick={() => play(card.ability!.name, "aura", 0)}
            >
              <span className="move__label">Ability</span>
              <span className="move__name">{card.ability.name}</span>
              <span className="move__text">{card.ability.text}</span>
            </button>
          )}

          {card.attacks.map((atk) => (
            <button key={atk.name} className={`move ${active === atk.name ? "is-active" : ""}`} onClick={() => playAttack(atk)}>
              <span className="move__cost">
                {atk.cost.map((t, i) => (
                  <EnergyIcon key={i} type={t} size="1.3em" />
                ))}
              </span>
              <span className="move__name">{atk.name}</span>
              <span className="move__damage">{atk.damage || "—"}</span>
              {atk.text && <span className="move__text">{atk.text}</span>}
            </button>
          ))}

          <p className="viewer__hint">Click a move to replay its animation.</p>

          <div className="viewer__footer">
            <span className="value-badge">{cardValue(card)} pts</span>
            {action && (
              <button className="btn btn--primary" onClick={action.onClick}>
                {action.label}
              </button>
            )}
          </div>
        </aside>
      </div>
      <canvas ref={canvasRef} className="viewer__fx" aria-hidden="true" />
    </div>
  );
}

/** Re-run a one-shot CSS animation class even if it is already applied. */
function restartAnimation(el: HTMLElement, className: string) {
  el.classList.remove("enter", className);
  void el.offsetWidth; // force a reflow so the browser sees the class as new
  el.classList.add(className);
}
