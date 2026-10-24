# PokeTradeX

A Pokémon card trading site prototype with holographic cards and animated attacks.

- **Holographic cards:** cards tilt in 3D under the pointer, with a rainbow foil and glare that follow it. The strength of the foil depends on rarity, and Ultra Rares also get an idle light sweep.
- **Animated moves:** clicking a card flips it into a full-screen viewer and plays its signature attack. Each move in the side panel replays its own animation. Every type has its own effect: Fire Spin flames, Thunderbolt lightning, Razor Leaf vortex, Psystrike rings, Dynamic Punch shockwaves, Blizzard shards, the Outrage dragon vortex, Moonblast hearts and Swift starbursts. Abilities play a glowing aura.
- **Trading:** you can browse the marketplace, offer one of your cards for a listed card, and watch the trader accept or decline. The collection and trade history are kept in `localStorage`.

## Admin screen and database

The cards, traders and listings live in a Neon Postgres database (project **PokeTradeX**). Admins edit them at **`#/admin`** (the Admin item in the sidebar):

- **Cards:** add, edit or delete cards. The editor shows a live preview of the card, and "Play its moves" runs the real attack animations before you save.
- **Listings:** choose which trader lists which card.
- **Traders:** add or remove traders and set their colour.

Changes appear for every visitor straight away. Each visitor's binder and trade history stay in their own browser.

**Becoming the admin.** Open `#/admin`, choose **Create account**, then **Make me the admin**. The first account to do this becomes the admin, and the button disappears for everyone after that. To add another admin later, run this in the Neon SQL editor with the person's user id from `neon_auth.user`:

```sql
insert into public.admins (user_id) values ('<their user id>');
```

**How it is secured.** The browser talks to Neon directly through Neon Auth (email and password) and the Neon Data API. There is no server of our own. Postgres Row-Level Security does the guarding: anyone can read the catalogue, and only accounts in `public.admins` can change it. The schema and policies are in [`db/schema.sql`](db/schema.sql).

**Configuration.** `VITE_NEON_DATABASE_URL` (in `.env.production`, see `.env.example`) is the database URL without credentials. It is not a secret. Without it, the app runs on the built-in cards and the admin screen says it isn't connected. To try the admin screen without a database, run `npm run dev` and open `http://localhost:5173/#/admin?demo`. This in-memory demo is development only, and nothing is saved.

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
| Data | Cards, traders and listings from Neon via the Data API; the 20 built-in cards are the fallback | `src/data/catalog.ts`, `src/data/cards.ts` |
| Trading state | `useReducer` with `localStorage` persistence, layered over the catalogue. Traders are simulated. | `src/state/store.ts` |
| Admin | Sign-in, card editor, listings and traders, against Neon or an in-memory demo | `src/admin/` |

Animations respect `prefers-reduced-motion`: particles are skipped and CSS motion is minimised.

### Adding a new effect

Add an entry to `EFFECTS` in `src/effects/effects.ts`. An effect's `frame(api)` runs every frame. It spawns particles with `api.spawn`, triggers timed events with `api.at(seconds)`, and can call `api.flash()` or `api.impact()` for screen flashes and shakes. To use the effect on an attack, set `effect: "<kind>"` on that attack in `cards.ts`.

## Roadmap to a real trading site

1. **Trading between real accounts.** The catalogue, sign-in and admin are on Neon now. Next, move binders and trades into the database: `owned_cards` (one row per copy, with an owner) and `trade_offers` (offered and requested cards, plus a status: `pending` / `accepted` / `declined` / `cancelled`), with RLS so people see their own offers.
2. **Atomic trades.** Accept a trade in a single database transaction that checks both copies are still owned by the right users before swapping them. This prevents double-trading the same card.
3. **Real-time updates.** Use a realtime channel such as Supabase Realtime, Pusher or WebSockets so offers and counter-offers appear instantly.
4. **Real card data.** The [Pokémon TCG API](https://pokemontcg.io/) provides every printed card with official scans, attacks and market prices. Swap `src/data/cards.ts` for calls to it, and store the API card ID in `cards`.
5. **Richer graphics.** If you want 3D, render cards as planes in Three.js / React Three Fiber, and use Lottie or Rive for designer-made ability animations. The canvas engine here can stay for particles.
6. **Trust and safety.** Add trader ratings, trade escrow for physical cards and moderation tools.

## A note on Pokémon artwork

Pokémon names, artwork and card designs are trademarks and copyrights of Nintendo, Creatures Inc. and GAME FREAK. This prototype loads official artwork from the community [PokeAPI sprites](https://github.com/PokeAPI/sprites) repository for personal, non-commercial use. A public or commercial site should use licensed assets, user-uploaded photos of their own cards, or original artwork.
