import { useState, type CSSProperties } from "react";
import { CardViewer } from "../components/CardViewer";
import { EnergyIcon } from "../components/EnergyIcon";
import { PokemonCard } from "../components/PokemonCard";
import { CardThumb, Points, TraderBadge } from "../components/Tile";
import type { Catalog } from "../data/catalog";
import { cardValue } from "../data/cards";
import { RARITY_META, TYPE_META } from "../data/typeMeta";
import type { Attack, CardData, PokeType, Rarity, Trader } from "../types";
import type { AdminApi } from "./api";
import { Field } from "./Field";

type Run = (label: string, change: () => Promise<void>) => Promise<boolean>;

interface TabProps {
  api: AdminApi;
  catalog: Catalog;
  run: Run;
}

const TYPES = Object.keys(TYPE_META) as PokeType[];
const RARITIES = Object.keys(RARITY_META) as Rarity[];
const STAGES: CardData["stage"][] = ["Basic", "Stage 1", "Stage 2"];

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

/* ---------------- Cards ---------------- */

export function CardsTab({ api, catalog, run }: TabProps) {
  const [editing, setEditing] = useState<{ card: CardData; isNew: boolean } | null>(null);
  const listed = (id: string) => catalog.listings.filter((l) => l.card.cardId === id).length;
  const cards = [...catalog.cards].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <div className="toolbar">
        <span className="toolbar__count num">{cards.length} cards</span>
        <span className="toolbar__spacer" />
        <button className="btn btn--primary" onClick={() => setEditing({ card: blankCard(), isNew: true })}>
          New card
        </button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Card</th>
            <th>Type</th>
            <th className="num">HP</th>
            <th>Rarity</th>
            <th className="num">Value</th>
            <th className="num">Listings</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => (
            <tr key={card.id} className="table__row--link" onClick={() => setEditing({ card, isNew: false })}>
              <td>
                <span className="card-cell">
                  <CardThumb card={card} />
                  <span className="two-line">
                    <span>{card.name}</span>
                    <span className="muted">{card.id}</span>
                  </span>
                </span>
              </td>
              <td>
                <span className="with-icon">
                  <EnergyIcon type={card.type} size="16px" /> {TYPE_META[card.type].label}
                </span>
              </td>
              <td className="num">{card.hp}</td>
              <td className="muted">{RARITY_META[card.rarity].label}</td>
              <td className="num">
                <Points value={cardValue(card)} />
              </td>
              <td className="num">{listed(card.id) || <span className="muted">0</span>}</td>
              <td className="num">
                <button className="text-action" onClick={(e) => (e.stopPropagation(), setEditing({ card, isNew: false }))}>
                  Edit
                </button>
              </td>
            </tr>
          ))}
          {cards.length === 0 && (
            <tr>
              <td colSpan={7} className="table__empty">
                No cards yet. Add the first one with New card.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {editing && (
        <CardEditor
          key={editing.card.id || "new"}
          initial={editing.card}
          isNew={editing.isNew}
          takenIds={new Set(catalog.cards.map((c) => c.id))}
          listingCount={listed(editing.card.id)}
          onClose={() => setEditing(null)}
          onSave={async (card) => {
            const ok = await run(`${card.name} ${editing.isNew ? "added" : "updated"}`, () => api.saveCard(card, editing.isNew));
            if (ok) setEditing(null);
            return ok;
          }}
          onDelete={async () => {
            const ok = await run(`${editing.card.name} deleted`, () => api.deleteCard(editing.card.id));
            if (ok) setEditing(null);
          }}
        />
      )}
    </>
  );
}

function blankCard(): CardData {
  return {
    id: "",
    dex: 1,
    name: "",
    type: "normal",
    hp: 60,
    stage: "Basic",
    rarity: "common",
    attacks: [{ name: "", cost: ["normal"], damage: 10 }],
    flavor: "",
  };
}

/** Problems that would stop the database accepting the card, by field. */
function validate(card: CardData, isNew: boolean, takenIds: Set<string>) {
  const errors: Record<string, string> = {};
  if (!card.name.trim()) errors.name = "Give the card a name.";
  if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(card.id)) errors.id = "Use lower-case letters, numbers and dashes.";
  else if (isNew && takenIds.has(card.id)) errors.id = "Another card already uses this ID.";
  if (!Number.isInteger(card.dex) || card.dex < 1 || card.dex > 1025) errors.dex = "A Pokédex number from 1 to 1025.";
  if (card.hp < 10 || card.hp > 400 || card.hp % 10 !== 0) errors.hp = "HP from 10 to 400, in tens.";
  if (card.ability && (!card.ability.name.trim() || !card.ability.text.trim())) errors.ability = "Name the ability and say what it does.";
  card.attacks.forEach((a, i) => {
    if (!a.name.trim()) errors[`attack${i}`] = "Name the move.";
    else if (a.cost.length === 0) errors[`attack${i}`] = "A move costs at least one Energy.";
    else if (a.damage < 0 || a.damage > 300) errors[`attack${i}`] = "Damage from 0 to 300.";
  });
  if (card.flavor.length > 300) errors.flavor = "Keep the flavour text under 300 characters.";
  return errors;
}

interface EditorProps {
  initial: CardData;
  isNew: boolean;
  takenIds: Set<string>;
  listingCount: number;
  onClose: () => void;
  onSave: (card: CardData) => Promise<boolean>;
  onDelete: () => Promise<void>;
}

function CardEditor({ initial, isNew, takenIds, listingCount, onClose, onSave, onDelete }: EditorProps) {
  const [card, setCard] = useState<CardData>(initial);
  const [idTouched, setIdTouched] = useState(!isNew);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const errors = validate(card, isNew, takenIds);
  const valid = Object.keys(errors).length === 0;
  const err = (key: string) => (showErrors ? errors[key] : undefined);

  const set = <K extends keyof CardData>(key: K, value: CardData[K]) =>
    setCard((c) => ({ ...c, [key]: value, ...(key === "name" && !idTouched ? { id: slug(String(value)) } : {}) }));
  const setAttack = (i: number, changes: Partial<Attack>) => setCard((c) => ({ ...c, attacks: c.attacks.map((a, j) => (j === i ? { ...a, ...changes } : a)) }));

  const save = async () => {
    setShowErrors(true);
    if (!valid) return;
    setSaving(true);
    const cleaned: CardData = {
      ...card,
      name: card.name.trim(),
      flavor: card.flavor.trim(),
      ability: card.ability ? { name: card.ability.name.trim(), text: card.ability.text.trim() } : undefined,
      attacks: card.attacks.map((a) => ({ ...a, name: a.name.trim(), text: a.text?.trim() || undefined, effect: a.effect || undefined })),
    };
    await onSave(cleaned);
    setSaving(false);
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog dialog--wide editor" role="dialog" aria-modal="true" aria-labelledby="editor-title" onClick={(e) => e.stopPropagation()}>
        <header className="dialog__header editor__header">
          <h2 id="editor-title">{isNew ? "New card" : `Edit ${initial.name}`}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div className="editor__body">
          <div className="editor__form">
            <div className="form-grid">
              <Field label="Name" error={err("name")}>
                <input className="input" value={card.name} maxLength={40} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label="ID" error={isNew ? err("id") : undefined} hint={isNew ? "Used in links. It can't change later." : "IDs can't change."}>
                <input className="input" value={card.id} readOnly={!isNew} onChange={(e) => (setIdTouched(true), set("id", e.target.value))} />
              </Field>
              <Field label="Pokédex number" error={err("dex")} hint="Picks the official artwork.">
                <input className="input num" type="number" min={1} max={1025} value={card.dex} onChange={(e) => set("dex", Number(e.target.value))} />
              </Field>
              <Field label="HP" error={err("hp")}>
                <input className="input num" type="number" min={10} max={400} step={10} value={card.hp} onChange={(e) => set("hp", Number(e.target.value))} />
              </Field>
              <Field label="Type">
                <select className="input" value={card.type} onChange={(e) => set("type", e.target.value as PokeType)}>
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_META[t].label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Stage">
                <select className="input" value={card.stage} onChange={(e) => set("stage", e.target.value as CardData["stage"])}>
                  {STAGES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Rarity">
                <select className="input" value={card.rarity} onChange={(e) => set("rarity", e.target.value as Rarity)}>
                  {RARITIES.map((r) => (
                    <option key={r} value={r}>
                      {RARITY_META[r].label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Trade value" hint="Set by rarity and HP.">
                <output className="field__value">
                  <Points value={cardValue(card)} />
                </output>
              </Field>
            </div>

            <Field label="Flavour text" error={err("flavor")}>
              <textarea className="input input--area" rows={2} maxLength={300} value={card.flavor} onChange={(e) => set("flavor", e.target.value)} />
            </Field>

            <section className="editor__section">
              <div className="editor__section-head">
                <h3>Ability</h3>
                <label className="check">
                  <input type="checkbox" checked={!!card.ability} onChange={(e) => set("ability", e.target.checked ? { name: "", text: "" } : undefined)} />
                  Has an ability
                </label>
              </div>
              {card.ability && (
                <div className="form-grid">
                  <Field label="Ability name" error={err("ability")}>
                    <input className="input" value={card.ability.name} onChange={(e) => set("ability", { ...card.ability!, name: e.target.value })} />
                  </Field>
                  <Field label="What it does" wide>
                    <input className="input" value={card.ability.text} onChange={(e) => set("ability", { ...card.ability!, text: e.target.value })} />
                  </Field>
                </div>
              )}
            </section>

            <section className="editor__section">
              <div className="editor__section-head">
                <h3>Moves</h3>
                <button
                  className="text-action"
                  disabled={card.attacks.length >= 3}
                  onClick={() => set("attacks", [...card.attacks, { name: "", cost: [card.type], damage: 10 }])}
                >
                  Add a move
                </button>
              </div>
              {card.attacks.map((atk, i) => (
                <div className="move-editor" key={i}>
                  <div className="form-grid">
                    <Field label="Move name" error={err(`attack${i}`)}>
                      <input className="input" value={atk.name} onChange={(e) => setAttack(i, { name: e.target.value })} />
                    </Field>
                    <Field label="Damage">
                      <input
                        className="input num"
                        type="number"
                        min={0}
                        max={300}
                        step={10}
                        value={atk.damage}
                        onChange={(e) => setAttack(i, { damage: Number(e.target.value) })}
                      />
                    </Field>
                    <div className="field">
                      <span className="field__label">Energy cost</span>
                      <div className="cost-picker">
                        {atk.cost.map((t, j) => (
                          <button
                            key={j}
                            className="cost-picker__chip"
                            aria-label={`Remove ${TYPE_META[t].label} Energy`}
                            onClick={() => setAttack(i, { cost: atk.cost.filter((_, k) => k !== j) })}
                          >
                            <EnergyIcon type={t} size="22px" />
                          </button>
                        ))}
                        {atk.cost.length < 4 && (
                          <select
                            className="input input--small"
                            value=""
                            aria-label="Add Energy"
                            onChange={(e) => e.target.value && setAttack(i, { cost: [...atk.cost, e.target.value as PokeType] })}
                          >
                            <option value="">Add…</option>
                            {TYPES.map((t) => (
                              <option key={t} value={t}>
                                {TYPE_META[t].label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                    <Field label="Animation">
                      <select
                        className="input"
                        value={atk.effect ?? ""}
                        onChange={(e) => setAttack(i, { effect: (e.target.value || undefined) as PokeType | undefined })}
                      >
                        <option value="">Same as card ({TYPE_META[card.type].label})</option>
                        {TYPES.map((t) => (
                          <option key={t} value={t}>
                            {TYPE_META[t].label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Effect text (optional)" wide>
                      <input className="input" value={atk.text ?? ""} onChange={(e) => setAttack(i, { text: e.target.value })} />
                    </Field>
                  </div>
                  {card.attacks.length > 1 && (
                    <div className="move-editor__foot">
                      <button
                        className="text-action text-action--quiet"
                        onClick={() =>
                          set(
                            "attacks",
                            card.attacks.filter((_, j) => j !== i),
                          )
                        }
                      >
                        Remove this move
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </section>

            {!isNew && (
              <section className="editor__section editor__danger">
                <h3>Delete this card</h3>
                <p className="sub">
                  Removes {initial.name} from the shop{listingCount ? ` and its ${listingCount} ${listingCount === 1 ? "listing" : "listings"}` : ""}. Binders
                  that hold it will drop it.
                </p>
                <button className="btn btn--danger" onClick={() => confirm(`Delete ${initial.name}? This can't be undone.`) && onDelete()}>
                  Delete {initial.name}
                </button>
              </section>
            )}
          </div>

          <aside className="editor__preview">
            <div className="editor__card">
              <PokemonCard card={card.name ? card : { ...card, name: "New card" }} variant="full" />
            </div>
            <button className="btn btn--block" disabled={!valid} onClick={() => setPreviewing(true)}>
              Play its moves
            </button>
          </aside>
        </div>

        <footer className="dialog__actions">
          {showErrors && !valid && <span className="negative dialog__problem">Fix the highlighted fields to save.</span>}
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--primary" disabled={saving} onClick={save}>
            {saving ? "Saving…" : isNew ? "Add card" : "Save changes"}
          </button>
        </footer>
      </div>
      {previewing && (
        // React bubbles clicks through portals and overlays alike; keep the viewer's from closing the editor.
        <div onClick={(e) => e.stopPropagation()}>
          <CardViewer card={card} origin={null} best={null} onClose={() => setPreviewing(false)} />
        </div>
      )}
    </div>
  );
}

/* ---------------- Listings ---------------- */

export function ListingsTab({ api, catalog, run }: TabProps) {
  const cards = [...catalog.cards].sort((a, b) => a.name.localeCompare(b.name));
  const [cardId, setCardId] = useState(cards[0]?.id ?? "");
  const [traderId, setTraderId] = useState(catalog.traders[0]?.id ?? "");
  const card = (id: string) => catalog.cards.find((c) => c.id === id)!;

  return (
    <>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          if (cardId && traderId) run(`${card(cardId).name} listed`, () => api.addListing(cardId, traderId));
        }}
      >
        <span className="select">
          <select aria-label="Card" value={cardId} onChange={(e) => setCardId(e.target.value)}>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </span>
        <span className="muted">listed by</span>
        <span className="select">
          <select aria-label="Trader" value={traderId} onChange={(e) => setTraderId(e.target.value)}>
            {catalog.traders.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </span>
        <button className="btn btn--primary" disabled={!cardId || !traderId}>
          Add listing
        </button>
        <span className="toolbar__spacer" />
        <span className="toolbar__count num">{catalog.listings.length} listings</span>
      </form>

      <table className="table">
        <thead>
          <tr>
            <th>Card</th>
            <th>Trader</th>
            <th className="num">Value</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {catalog.listings.map((l) => {
            const c = card(l.card.cardId);
            return (
              <tr key={l.id}>
                <td>
                  <span className="card-cell">
                    <CardThumb card={c} />
                    {c.name}
                  </span>
                </td>
                <td>
                  <span className="with-icon">
                    <TraderBadge trader={l.trader} /> {l.trader.name}
                  </span>
                </td>
                <td className="num">
                  <Points value={cardValue(c)} />
                </td>
                <td className="num">
                  <button
                    className="text-action"
                    onClick={() => confirm(`Remove ${l.trader.name}'s ${c.name} listing?`) && run(`${c.name} listing removed`, () => api.removeListing(l.id))}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            );
          })}
          {catalog.listings.length === 0 && (
            <tr>
              <td colSpan={4} className="table__empty">
                Nothing is listed, so the marketplace is empty. Add a listing above.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}

/* ---------------- Traders ---------------- */

export function TradersTab({ api, catalog, run }: TabProps) {
  const [name, setName] = useState("");
  const [hue, setHue] = useState(180);
  const listings = (id: string) => catalog.listings.filter((l) => l.trader.id === id).length;
  const saveHue = (t: Trader, value: number) => value !== t.hue && run(`${t.name}'s colour`, () => api.saveTrader({ ...t, hue: value }, false));

  return (
    <>
      <form
        className="toolbar"
        onSubmit={async (e) => {
          e.preventDefault();
          const trimmed = name.trim();
          if (!trimmed) return;
          const ok = await run(`${trimmed} added`, () => api.saveTrader({ id: slug(trimmed) || `trader-${Date.now()}`, name: trimmed, hue }, true));
          if (ok) setName("");
        }}
      >
        <span className="avatar" style={{ "--hue": hue } as CSSProperties} aria-hidden="true">
          {(name.trim()[0] ?? "?").toUpperCase()}
        </span>
        <label className="field field--inline">
          <span className="sr-only">Trader name</span>
          <input className="input" placeholder="Trader name" maxLength={24} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="hue">
          <span className="sr-only">Colour</span>
          <input type="range" min={0} max={359} value={hue} onChange={(e) => setHue(Number(e.target.value))} />
        </label>
        <button className="btn btn--primary" disabled={!name.trim()}>
          Add trader
        </button>
        <span className="toolbar__spacer" />
        <span className="toolbar__count num">{catalog.traders.length} traders</span>
      </form>

      <table className="table">
        <thead>
          <tr>
            <th>Trader</th>
            <th>Colour</th>
            <th className="num">Listings</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {catalog.traders.map((t) => (
            <tr key={t.id}>
              <td>
                <span className="with-icon">
                  <TraderBadge trader={t} /> {t.name}
                </span>
              </td>
              <td>
                <label className="hue">
                  <span className="sr-only">{t.name}'s colour</span>
                  <input
                    type="range"
                    min={0}
                    max={359}
                    defaultValue={t.hue}
                    // Save when the slider is let go, not on every step.
                    onPointerUp={(e) => saveHue(t, Number(e.currentTarget.value))}
                    onKeyUp={(e) => saveHue(t, Number(e.currentTarget.value))}
                  />
                </label>
              </td>
              <td className="num">{listings(t.id) || <span className="muted">0</span>}</td>
              <td className="num">
                <button
                  className="text-action"
                  onClick={() =>
                    confirm(`Remove ${t.name}${listings(t.id) ? ` and their ${listings(t.id)} listings` : ""}?`) &&
                    run(`${t.name} removed`, () => api.deleteTrader(t.id))
                  }
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
          {catalog.traders.length === 0 && (
            <tr>
              <td colSpan={4} className="table__empty">
                No traders yet. Add one above; listings need a trader.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
