import { forwardRef, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { artworkUrl } from "../data/cards";
import { RARITY_META, TYPE_META } from "../data/typeMeta";
import type { CardData } from "../types";
import { EnergyIcon } from "./EnergyIcon";

interface Props {
  card: CardData;
  /** "compact" for grids (name, HP and artwork); "full" adds the ability and moves. */
  variant?: "compact" | "full";
  /** Receives the card element, so a viewer can animate out of it. */
  onClick?: (cardEl: HTMLElement) => void;
  className?: string;
}

/**
 * A trading card. It sits flat at rest; under the pointer it tilts in 3D, the
 * artwork lifts off the card and holo rarities show foil across the artwork.
 * The forwarded ref points at the artwork, which is where attacks originate.
 */
export const PokemonCard = forwardRef<HTMLDivElement, Props>(function PokemonCard(
  { card, variant = "compact", onClick, className = "" },
  artRef,
) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const meta = TYPE_META[card.type];

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - py) * 18}deg`);
    el.style.setProperty("--ry", `${(px - 0.5) * 18}deg`);
    el.style.setProperty("--mx", `${px * 100}%`);
    el.style.setProperty("--my", `${py * 100}%`);
    el.style.setProperty("--px", `${(px - 0.5) * 2}`);
    el.style.setProperty("--py", `${(py - 0.5) * 2}`);
  };

  const onPointerLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    for (const v of ["--rx", "--ry", "--px", "--py"]) el.style.removeProperty(v);
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
        data-ui
        className={`card card--${variant} rarity-${card.rarity}`}
        style={style}
        onClick={onClick && ((e) => onClick(e.currentTarget))}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={(e) => onClick && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClick(e.currentTarget))}
        aria-label={onClick ? `View ${card.name}` : undefined}
      >
        <div className="card__face">
          <header className="card__header">
            <span className="card__name">{card.name}</span>
            <span className="card__hp">
              <small>HP</small>
              {card.hp}
            </span>
            <EnergyIcon type={card.type} size="1.25em" />
          </header>

          <div className="card__art" ref={artRef}>
            {imgFailed ? (
              <EnergyIcon type={card.type} size="40%" className="card__art-fallback" />
            ) : (
              <img src={artworkUrl(card)} alt={card.name} loading="lazy" draggable={false} onError={() => setImgFailed(true)} />
            )}
            <div className="card__shine" aria-hidden="true" />
          </div>

          {variant === "full" && (
            <div className="card__body">
              {card.ability && (
                <p className="card__ability">
                  <span className="card__ability-tag">Ability</span> {card.ability.name}
                </p>
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
          )}

          <footer className="card__footer">
            <span>{card.stage}</span>
            <span>{RARITY_META[card.rarity].label}</span>
          </footer>
        </div>
      </div>
    </div>
  );
});
