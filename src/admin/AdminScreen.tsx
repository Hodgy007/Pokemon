import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { Catalog } from "../data/catalog";
import type { AdminApi, AdminSession } from "./api";
import { CardsTab, ListingsTab, TradersTab } from "./AdminTabs";
import { Field } from "./Field";

type Tab = "cards" | "listings" | "traders";

interface Props {
  api: AdminApi | null;
  catalog: Catalog;
  /** Fetch the catalogue again after a change, so every screen shows it. */
  onChanged: () => Promise<void> | void;
  demo: boolean;
}

/** Signs an admin in, then lets them edit the cards, listings and traders in the database. */
export function AdminScreen({ api, catalog, onChanged, demo }: Props) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [tab, setTab] = useState<Tab>("cards");
  const [status, setStatus] = useState<{ kind: "saved" | "error"; text: string } | null>(null);

  const refreshSession = useCallback(async () => {
    if (!api) return;
    try {
      setSession(await api.session());
    } catch (e) {
      setSession({ kind: "signed-out" });
      setStatus({ kind: "error", text: `Couldn't check your sign-in: ${message(e)}` });
    }
  }, [api]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  /** Run a change, refresh the catalogue, and report the outcome beside the title. */
  const run = useCallback(
    async (label: string, change: () => Promise<void>) => {
      setStatus(null);
      try {
        await change();
        await onChanged();
        setStatus({ kind: "saved", text: label });
        return true;
      } catch (e) {
        setStatus({ kind: "error", text: message(e) });
        return false;
      }
    },
    [onChanged],
  );

  if (!api) {
    return (
      <>
        <Title sub="The admin screen edits the card database." />
        <p className="empty">
          This build isn't connected to a database. Set VITE_NEON_DATABASE_URL to the Neon database URL and build again.
        </p>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <Title sub="Checking your sign-in…" />
      </>
    );
  }

  if (session.kind === "signed-out") {
    return (
      <>
        <Title sub={`Sign in to change the cards, listings and traders${demo ? " (demo: any details will do; nothing is saved)" : ""}.`} />
        {status?.kind === "error" && <p className="notice notice--error">{status.text}</p>}
        <SignIn api={api} onSignedIn={refreshSession} />
      </>
    );
  }

  if (session.kind === "not-admin") {
    return (
      <>
        <Title sub={`Signed in as ${session.user.email}.`} />
        <section className="panel auth-panel">
          {session.canClaim ? (
            <>
              <h2>Claim admin</h2>
              <p className="sub">
                Nobody runs this shop yet. Claim it and {session.user.email} becomes the admin. After that, nobody else can claim it.
              </p>
              {status?.kind === "error" && <p className="notice notice--error">{status.text}</p>}
              <div className="panel__actions">
                <button className="btn" onClick={() => api.signOut().then(refreshSession)}>
                  Sign out
                </button>
                <button
                  className="btn btn--primary"
                  onClick={async () => {
                    try {
                      await api.claimAdmin();
                      await refreshSession();
                    } catch (e) {
                      setStatus({ kind: "error", text: message(e) });
                    }
                  }}
                >
                  Make me the admin
                </button>
              </div>
            </>
          ) : (
            <>
              <h2>This account isn't an admin</h2>
              <p className="sub">Only admins can change the catalogue. Ask the shop's admin to add {session.user.email}.</p>
              <div className="panel__actions">
                <button className="btn" onClick={() => api.signOut().then(refreshSession)}>
                  Sign out
                </button>
              </div>
            </>
          )}
        </section>
      </>
    );
  }

  const counts: Record<Tab, number> = { cards: catalog.cards.length, listings: catalog.listings.length, traders: catalog.traders.length };

  return (
    <>
      <div className="title-row title-row--split">
        <div>
          <h1>Admin</h1>
          <p className="sub">
            Signed in as {session.user.email}. Changes go live for every visitor as soon as you save{demo ? " (demo: nothing is saved)" : ""}.
          </p>
        </div>
        <button className="btn" onClick={() => api.signOut().then(refreshSession)}>
          Sign out
        </button>
      </div>

      <div className="tabs" role="tablist">
        {(["cards", "listings", "traders"] as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => (setTab(t), setStatus(null))}>
            {t[0].toUpperCase() + t.slice(1)} <span className="num">{counts[t]}</span>
          </button>
        ))}
        {status && (
          <span className={`tabs__status ${status.kind === "error" ? "negative" : ""}`} role="status">
            {status.kind === "saved" ? `${status.text} · saved` : status.text}
          </span>
        )}
      </div>

      {tab === "cards" && <CardsTab api={api} catalog={catalog} run={run} />}
      {tab === "listings" && <ListingsTab api={api} catalog={catalog} run={run} />}
      {tab === "traders" && <TradersTab api={api} catalog={catalog} run={run} />}
    </>
  );
}

function Title({ sub }: { sub: string }) {
  return (
    <div className="title-row">
      <h1>Admin</h1>
      <p className="sub">{sub}</p>
    </div>
  );
}

function SignIn({ api, onSignedIn }: { api: AdminApi; onSignedIn: () => Promise<void> }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "in") await api.signIn(email, password);
      else await api.signUp(name, email, password);
      await onSignedIn();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="panel auth-panel" onSubmit={submit}>
      <div className="segmented" role="tablist">
        <button type="button" role="tab" aria-selected={mode === "in"} onClick={() => setMode("in")}>
          Sign in
        </button>
        <button type="button" role="tab" aria-selected={mode === "up"} onClick={() => setMode("up")}>
          Create account
        </button>
      </div>
      {mode === "up" && (
        <Field label="Name">
          <input className="input" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </Field>
      )}
      <Field label="Email">
        <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </Field>
      <Field label="Password" hint={mode === "up" ? "At least 8 characters." : undefined}>
        <input
          className="input"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "in" ? "current-password" : "new-password"}
        />
      </Field>
      {error && <p className="notice notice--error">{error}</p>}
      <button className="btn btn--primary btn--block" disabled={busy}>
        {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}

export function message(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}
