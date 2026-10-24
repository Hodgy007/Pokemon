import { rowFromCard, type Catalog } from "../data/catalog";
import { neon } from "../lib/neon";
import type { CardData, Trader } from "../types";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
}

/** Who is signed in, and what they may do. */
export type AdminSession =
  | { kind: "signed-out" }
  | { kind: "not-admin"; user: AdminUser; canClaim: boolean }
  | { kind: "admin"; user: AdminUser };

/** Everything the admin screen does, so it can run against Neon or in memory. */
export interface AdminApi {
  session(): Promise<AdminSession>;
  signIn(email: string, password: string): Promise<void>;
  signUp(name: string, email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  claimAdmin(): Promise<boolean>;
  saveCard(card: CardData, isNew: boolean): Promise<void>;
  deleteCard(id: string): Promise<void>;
  addListing(cardId: string, traderId: string): Promise<void>;
  removeListing(id: string): Promise<void>;
  saveTrader(trader: Trader, isNew: boolean): Promise<void>;
  deleteTrader(id: string): Promise<void>;
}

/** Turn an SDK `{ error }` result into a thrown error with a readable message. */
function check(result: { error: { message?: string } | null }) {
  if (result.error) throw new Error(friendly(result.error.message ?? "Something went wrong."));
}

function friendly(message: string) {
  if (/row-level security|permission denied/i.test(message)) return "Your account is not allowed to change this. Only admins can edit the catalogue.";
  if (/duplicate key.*cards_pkey/i.test(message)) return "A card with this ID already exists. Choose another ID.";
  if (/duplicate key.*traders_name_key/i.test(message)) return "A trader with this name already exists.";
  if (/violates check constraint/i.test(message)) return `The database rejected a value (${message.match(/"([^"]+)"/)?.[1] ?? "check"}). Review the fields and try again.`;
  return message;
}

type NeonClient = NonNullable<typeof neon>;

export const neonApi: AdminApi | null = neon ? neonAdmin(neon) : null;

function neonAdmin(client: NeonClient): AdminApi {
  const neon = client;
  return {
    async session() {
      const { data } = await neon.auth.getSession();
      const user = data?.user;
      if (!user) return { kind: "signed-out" };
      const who: AdminUser = { id: user.id, email: user.email, name: user.name };
      const isAdmin = await neon.rpc("is_admin");
      if (isAdmin.data === true) return { kind: "admin", user: who };
      const exist = await neon.rpc("admins_exist");
      return { kind: "not-admin", user: who, canClaim: exist.data === false };
    },
    async signIn(email, password) {
      const { error } = await neon.auth.signIn.email({ email, password });
      if (error) throw new Error(error.message ?? "Couldn't sign in.");
    },
    async signUp(name, email, password) {
      const { error } = await neon.auth.signUp.email({ name, email, password });
      if (error) throw new Error(error.message ?? "Couldn't create the account.");
    },
    async signOut() {
      await neon.auth.signOut();
    },
    async claimAdmin() {
      const result = await neon.rpc("claim_first_admin");
      check(result);
      return result.data === true;
    },
    async saveCard(card, isNew) {
      const row = rowFromCard(card);
      if (isNew) check(await neon.from("cards").insert(row));
      else {
        const { id, ...changes } = row;
        check(await neon.from("cards").update(changes).eq("id", id));
      }
    },
    async deleteCard(id) {
      check(await neon.from("cards").delete().eq("id", id));
    },
    async addListing(cardId, traderId) {
      check(await neon.from("listings").insert({ card_id: cardId, trader_id: traderId }));
    },
    async removeListing(id) {
      check(await neon.from("listings").delete().eq("id", id));
    },
    async saveTrader(trader, isNew) {
      if (isNew) check(await neon.from("traders").insert(trader));
      else check(await neon.from("traders").update({ name: trader.name, hue: trader.hue }).eq("id", trader.id));
    },
    async deleteTrader(id) {
      check(await neon.from("traders").delete().eq("id", id));
    },
  };
}

/**
 * An in-memory admin for local development without a database
 * (open the app with #/admin?demo). Changes last until the page reloads.
 */
export function memoryApi(catalog: Catalog, onChange: (next: Catalog) => void): AdminApi {
  let current = catalog;
  let signedIn = false;
  const commit = (next: Partial<Catalog>) => {
    current = { ...current, ...next };
    onChange(current);
  };
  const traderById = (id: string) => current.traders.find((t) => t.id === id)!;
  return {
    async session() {
      return signedIn ? { kind: "admin", user: { id: "demo", email: "demo@example.test", name: "Demo admin" } } : { kind: "signed-out" };
    },
    async signIn() {
      signedIn = true;
    },
    async signUp() {
      signedIn = true;
    },
    async signOut() {
      signedIn = false;
    },
    async claimAdmin() {
      return true;
    },
    async saveCard(card, isNew) {
      if (isNew && current.cards.some((c) => c.id === card.id)) throw new Error("A card with this ID already exists. Choose another ID.");
      commit({ cards: isNew ? [...current.cards, card] : current.cards.map((c) => (c.id === card.id ? card : c)) });
    },
    async deleteCard(id) {
      commit({ cards: current.cards.filter((c) => c.id !== id), listings: current.listings.filter((l) => l.card.cardId !== id) });
    },
    async addListing(cardId, traderId) {
      const id = `demo-${Math.random().toString(36).slice(2, 8)}`;
      commit({ listings: [...current.listings, { id, trader: traderById(traderId), card: { uid: id, cardId } }] });
    },
    async removeListing(id) {
      commit({ listings: current.listings.filter((l) => l.id !== id) });
    },
    async saveTrader(trader, isNew) {
      if (isNew && current.traders.some((t) => t.id === trader.id || t.name === trader.name)) throw new Error("A trader with this name already exists.");
      const traders = isNew ? [...current.traders, trader] : current.traders.map((t) => (t.id === trader.id ? trader : t));
      commit({ traders, listings: current.listings.map((l) => (l.trader.id === trader.id ? { ...l, trader } : l)) });
    },
    async deleteTrader(id) {
      commit({ traders: current.traders.filter((t) => t.id !== id), listings: current.listings.filter((l) => l.trader.id !== id) });
    },
  };
}
