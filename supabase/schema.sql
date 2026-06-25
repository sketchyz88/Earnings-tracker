create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  hourly_rate numeric not null default 15,
  tip_out_rate numeric not null default 4.5,
  tip_goal numeric not null default 100,
  hours_goal numeric not null default 80,
  pay_period_length_days integer not null default 15,
  pay_period_anchor_date date not null default date '2026-04-16',
  jobs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.settings
  add column if not exists pay_period_length_days integer not null default 15;

alter table public.settings
  add column if not exists pay_period_anchor_date date not null default date '2026-04-16';

alter table public.settings
  add column if not exists jobs jsonb not null default '[]'::jsonb;

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  shift_date date not null,
  start_time time,
  end_time time,
  hours numeric not null default 0,
  sales numeric not null default 0,
  tips numeric not null default 0,
  earnings numeric not null default 0,
  job_id text,
  floor text,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.shifts
  add column if not exists job_id text;

create index if not exists shifts_user_id_shift_date_idx
  on public.shifts (user_id, shift_date desc, created_at desc);

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at
before update on public.settings
for each row
execute procedure public.set_updated_at();

drop trigger if exists shifts_set_updated_at on public.shifts;
create trigger shifts_set_updated_at
before update on public.shifts
for each row
execute procedure public.set_updated_at();

alter table public.settings enable row level security;
alter table public.shifts enable row level security;

drop policy if exists "settings_select_own" on public.settings;
create policy "settings_select_own"
on public.settings
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "settings_insert_own" on public.settings;
create policy "settings_insert_own"
on public.settings
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "settings_update_own" on public.settings;
create policy "settings_update_own"
on public.settings
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "shifts_select_own" on public.shifts;
create policy "shifts_select_own"
on public.shifts
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "shifts_insert_own" on public.shifts;
create policy "shifts_insert_own"
on public.shifts
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "shifts_update_own" on public.shifts;
create policy "shifts_update_own"
on public.shifts
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "shifts_delete_own" on public.shifts;
create policy "shifts_delete_own"
on public.shifts
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
