import { forwardRef, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { artworkUrl } from "../data/cards";
import { RARITY_META, TYPE_META } from "../data/typeMeta";
import type { CardData } from "../types";
import { EnergyIcon } from "./EnergyIcon";

interface Props {
  card: CardData;
  onClick?: () => void;
  /** Extra class on the outer wrapper, e.g. to trigger the attack lunge. */
  className?: string;
}

/**
 * A card with a 3D tilt and holographic shine that follow the pointer.
 * The forwarded ref points at the artwork, which is where attacks originate.
 */
export const PokemonCard = forwardRef<HTMLDivElement, Props>(function PokemonCard(
  { card, onClick, className = "" },
  artRef,
) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const meta = TYPE_META[card.type];

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - py) * 22}deg`);
    el.style.setProperty("--ry", `${(px - 0.5) * 22}deg`);
    el.style.setProperty("--mx", `${px * 100}%`);
    el.style.setProperty("--my", `${py * 100}%`);
    el.style.setProperty("--hover", "1");
  };

  const onPointerLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--hover", "0");
  };

  const style = {
    "--type": meta.color,
    "--type-dark": meta.dark,
    "--type-light": meta.light,
  } as CSSProperties;

  return (
    <div className={`card-wrap ${className}`} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <div
        ref={cardRef}
        className={`card rarity-${card.rarity}`}
        style={style}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={(e) => onClick && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClick())}
        aria-label={onClick ? `View ${card.name}` : undefined}
      >
        <div className="card__inner">
          <header className="card__header">
            <span className="card__stage">{card.stage}</span>
            <span className="card__name">{card.name}</span>
            <span className="card__hp">
              <small>HP</small>
              {card.hp}
              <EnergyIcon type={card.type} size="1.3em" />
            </span>
          </header>

          <div className="card__art" ref={artRef}>
            {imgFailed ? (
              <span className="card__art-fallback">{meta.symbol}</span>
            ) : (
              <img src={artworkUrl(card)} alt={card.name} loading="lazy" draggable={false} onError={() => setImgFailed(true)} />
            )}
          </div>

          <div className="card__body">
            {card.ability && (
              <div className="card__ability">
                <span className="card__ability-tag">Ability</span> {card.ability.name}
              </div>
            )}
            {card.attacks.map((atk) => (
              <div className="card__attack" key={atk.name}>
                <span className="card__cost">
                  {atk.cost.map((t, i) => (
                    <EnergyIcon key={i} type={t} />
                  ))}
                </span>
                <span className="card__attack-name">{atk.name}</span>
                <span className="card__damage">{atk.damage || ""}</span>
              </div>
            ))}
          </div>

          <footer className="card__footer">
            <span>#{String(card.dex).padStart(3, "0")}</span>
            <span title={RARITY_META[card.rarity].label}>{RARITY_META[card.rarity].symbol}</span>
          </footer>
        </div>
        <div className="card__shine" />
        <div className="card__glare" />
      </div>
    </div>
  );
});
