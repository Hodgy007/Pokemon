# PokéTrade

A Pokémon card trading site prototype with holographic cards and animated attacks.

- **Holographic cards:** cards tilt in 3D under the pointer, with a rainbow foil and glare that follow it. The strength of the foil depends on rarity, and Ultra Rares also get an idle light sweep.
- **Animated moves:** clicking a card flips it into a full-screen viewer and plays its signature attack. Each move in the side panel replays its own animation. Every type has its own effect: Fire Spin flames, Thunderbolt lightning, Razor Leaf vortex, Psystrike rings, Dynamic Punch shockwaves, Blizzard shards, the Outrage dragon vortex, Moonblast hearts and Swift starbursts. Abilities play a glowing aura.
- **Trading:** you can browse the marketplace, offer one of your cards for a listed card, and watch the trader accept or decline. The collection and trade history are kept in `localStorage`.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check and production build into dist/
```

## How it's built

| Area | Approach | Where |
| --- | --- | --- |
| UI | React 19 + TypeScript, bundled with Vite | `src/App.tsx`, `src/components/` |
| Card look | Plain CSS: 3D transforms driven by CSS variables set on `pointermove`; `mix-blend-mode` foil and glare layers; container-query units so text scales with the card | `src/components/PokemonCard.tsx`, `src/styles.css` |
| Attack animations | A small canvas particle engine (~350 lines, no dependencies) with one effect per type. Glow particles are cached soft sprites drawn additively, so overlapping particles bloom like fire or energy. | `src/effects/engine.ts`, `src/effects/effects.ts` |
| Screen shake, lunge, damage numbers | CSS keyframes triggered by the effect's `impact` callbacks | `src/components/CardViewer.tsx` |
| Data | 20 sample cards with types, HP, abilities and attacks | `src/data/cards.ts` |
| Trading state | `useReducer` with `localStorage` persistence. Traders are simulated. | `src/state/store.ts` |

Animations respect `prefers-reduced-motion`: particles are skipped and CSS motion is minimised.

### Adding a new effect

Add an entry to `EFFECTS` in `src/effects/effects.ts`. An effect's `frame(api)` runs every frame. It spawns particles with `api.spawn`, triggers timed events with `api.at(seconds)`, and can call `api.flash()` or `api.impact()` for screen flashes and shakes. To use the effect on an attack, set `effect: "<kind>"` on that attack in `cards.ts`.

## Roadmap to a real trading site

1. **Accounts and a database.** Add auth and Postgres (for example Supabase or Neon). Suggested tables: `users`, `cards` (catalogue), `owned_cards` (one row per physical/digital copy), `listings` and `trade_offers` (offered and requested card IDs, plus a status: `pending` / `accepted` / `declined` / `cancelled`).
2. **Atomic trades.** Accept a trade in a single database transaction that checks both copies are still owned by the right users before swapping them. This prevents double-trading the same card.
3. **Real-time updates.** Use a realtime channel such as Supabase Realtime, Pusher or WebSockets so offers and counter-offers appear instantly.
4. **Real card data.** The [Pokémon TCG API](https://pokemontcg.io/) provides every printed card with official scans, attacks and market prices. Swap `src/data/cards.ts` for calls to it, and store the API card ID in `cards`.
5. **Richer graphics.** If you want 3D, render cards as planes in Three.js / React Three Fiber, and use Lottie or Rive for designer-made ability animations. The canvas engine here can stay for particles.
6. **Trust and safety.** Add trader ratings, trade escrow for physical cards and moderation tools.

## A note on Pokémon artwork

Pokémon names, artwork and card designs are trademarks and copyrights of Nintendo, Creatures Inc. and GAME FREAK. This prototype loads official artwork from the community [PokeAPI sprites](https://github.com/PokeAPI/sprites) repository for personal, non-commercial use. A public or commercial site should use licensed assets, user-uploaded photos of their own cards, or original artwork.
