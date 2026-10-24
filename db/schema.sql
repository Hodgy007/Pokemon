-- PokeTradeX catalogue: the cards, traders and listings admins edit.
-- Applied to the Neon project "PokeTradeX" (frosty-base-43256448), branch main.
-- Requires Neon Auth and the Data API on the branch: they create the
-- `anonymous` and `authenticated` roles and the auth.user_id() function.

create table public.cards (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  dex integer not null check (dex between 1 and 1025),
  name text not null check (length(name) between 1 and 40),
  type text not null check (type in ('fire','water','electric','grass','psychic','fighting','ice','dragon','normal','fairy')),
  hp integer not null check (hp between 10 and 400 and hp % 10 = 0),
  stage text not null check (stage in ('Basic','Stage 1','Stage 2')),
  rarity text not null check (rarity in ('common','rare','holo','ultra')),
  ability jsonb check (ability is null or (jsonb_typeof(ability) = 'object' and ability ? 'name' and ability ? 'text')),
  attacks jsonb not null default '[]' check (jsonb_typeof(attacks) = 'array' and jsonb_array_length(attacks) between 1 and 3),
  flavor text not null default '' check (length(flavor) <= 300),
  updated_at timestamptz not null default now()
);

create table public.traders (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  name text not null unique check (length(name) between 1 and 24),
  hue integer not null check (hue between 0 and 359)
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  card_id text not null references public.cards(id) on delete cascade on update cascade,
  trader_id text not null references public.traders(id) on delete cascade on update cascade,
  created_at timestamptz not null default now()
);
create index listings_card_id_idx on public.listings (card_id);
create index listings_trader_id_idx on public.listings (trader_id);

-- Neon Auth user ids allowed to edit the catalogue.
create table public.admins (
  user_id text primary key,
  added_at timestamptz not null default now()
);

create function public.is_admin() returns boolean
  language sql stable security definer set search_path = public, pg_temp
  as $$ select exists (select 1 from public.admins where user_id = auth.user_id()) $$;

create function public.admins_exist() returns boolean
  language sql stable security definer set search_path = public, pg_temp
  as $$ select exists (select 1 from public.admins) $$;

-- The first signed-in account to call this becomes the admin; afterwards it changes nothing.
create function public.claim_first_admin() returns boolean
  language plpgsql security definer set search_path = public, pg_temp
  as $$
  begin
    if auth.user_id() is null then
      return false;
    end if;
    -- Serialise claims so two first sign-ins cannot both become admin.
    lock table public.admins in share row exclusive mode;
    if exists (select 1 from public.admins) then
      return exists (select 1 from public.admins where user_id = auth.user_id());
    end if;
    insert into public.admins (user_id) values (auth.user_id());
    return true;
  end
  $$;

create function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
create trigger cards_touch before update on public.cards for each row execute function public.touch_updated_at();

-- Everyone reads the catalogue; only admins write. The admins table is never writable through the API.
alter table public.cards enable row level security;
alter table public.traders enable row level security;
alter table public.listings enable row level security;
alter table public.admins enable row level security;

create policy cards_read on public.cards for select to anonymous, authenticated using (true);
create policy cards_write on public.cards for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy traders_read on public.traders for select to anonymous, authenticated using (true);
create policy traders_write on public.traders for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy listings_read on public.listings for select to anonymous, authenticated using (true);
create policy listings_write on public.listings for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy admins_self on public.admins for select to authenticated using (user_id = (select auth.user_id()));

grant usage on schema public to anonymous, authenticated;
grant select on public.cards, public.traders, public.listings to anonymous, authenticated;
grant insert, update, delete on public.cards, public.traders, public.listings to authenticated;
grant select on public.admins to authenticated;
revoke execute on function public.is_admin(), public.admins_exist(), public.claim_first_admin(), public.touch_updated_at() from public;
grant execute on function public.is_admin(), public.admins_exist() to anonymous, authenticated;
grant execute on function public.claim_first_admin() to authenticated;
