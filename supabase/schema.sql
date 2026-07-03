create extension if not exists "pgcrypto";

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text not null,
  avatar_url text,
  role text not null default 'participant' check (role in ('participant', 'admin')),
  total_points int not null default 0,
  created_at timestamptz default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  home_team text not null,
  away_team text not null,
  home_score int,
  away_score int,
  starts_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'finished')),
  round text,
  group_name text,
  created_at timestamptz default now(),
  constraint scores_non_negative check (
    (home_score is null or home_score >= 0) and
    (away_score is null or away_score >= 0)
  )
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  predicted_home_score int not null check (predicted_home_score >= 0),
  predicted_away_score int not null check (predicted_away_score >= 0),
  points_awarded int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(participant_id, match_id)
);

create table if not exists public.family_photos (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  title text,
  sort_order int not null default 0,
  created_at timestamptz default now()
);

create table if not exists public.final_prediction_settings (
  id boolean primary key default true,
  is_enabled boolean not null default false,
  prediction_deadline_at timestamptz,
  visibility_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint final_prediction_settings_singleton check (id = true),
  constraint final_prediction_settings_visibility_after_deadline check (
    prediction_deadline_at is null
    or visibility_at is null
    or visibility_at >= prediction_deadline_at
  )
);

create table if not exists public.final_predictions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  finalist_one text not null,
  finalist_two text not null,
  winner text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_id),
  constraint final_predictions_distinct_finalists check (finalist_one <> finalist_two),
  constraint final_predictions_winner_is_finalist check (
    winner = finalist_one or winner = finalist_two
  )
);

create index if not exists participants_total_points_idx
  on public.participants(total_points desc, full_name asc);
create index if not exists matches_starts_at_idx on public.matches(starts_at);
create index if not exists predictions_participant_id_idx on public.predictions(participant_id);
create index if not exists predictions_match_id_idx on public.predictions(match_id);
create index if not exists family_photos_sort_order_idx on public.family_photos(sort_order);
create index if not exists final_predictions_participant_id_idx
  on public.final_predictions(participant_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists predictions_touch_updated_at on public.predictions;
create trigger predictions_touch_updated_at
before update on public.predictions
for each row execute function public.touch_updated_at();

drop trigger if exists final_prediction_settings_touch_updated_at on public.final_prediction_settings;
create trigger final_prediction_settings_touch_updated_at
before update on public.final_prediction_settings
for each row execute function public.touch_updated_at();

drop trigger if exists final_predictions_touch_updated_at on public.final_predictions;
create trigger final_predictions_touch_updated_at
before update on public.final_predictions
for each row execute function public.touch_updated_at();

create or replace function public.current_participant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.participants where auth_user_id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.participants
    where auth_user_id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.prediction_is_open(target_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.matches
    where id = target_match_id
      and status <> 'finished'
      and now() < starts_at - interval '1 hour'
  );
$$;

create or replace function public.final_prediction_is_open()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.final_prediction_settings
    where id = true
      and is_enabled = true
      and prediction_deadline_at is not null
      and now() <= prediction_deadline_at
  );
$$;

alter table public.participants enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;
alter table public.family_photos enable row level security;
alter table public.final_prediction_settings enable row level security;
alter table public.final_predictions enable row level security;

drop policy if exists "participants are readable by authenticated users" on public.participants;
create policy "participants are readable by authenticated users"
on public.participants for select
to authenticated
using (true);

drop policy if exists "admins can manage participants" on public.participants;
create policy "admins can manage participants"
on public.participants for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "matches are readable by authenticated users" on public.matches;
create policy "matches are readable by authenticated users"
on public.matches for select
to authenticated
using (true);

drop policy if exists "admins can manage matches" on public.matches;
create policy "admins can manage matches"
on public.matches for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "participants read own predictions" on public.predictions;
drop policy if exists "authenticated users can read all predictions" on public.predictions;
create policy "authenticated users can read all predictions"
on public.predictions for select
to authenticated
using (true);

drop policy if exists "participants insert own open predictions" on public.predictions;
create policy "participants insert own open predictions"
on public.predictions for insert
to authenticated
with check (
  participant_id = public.current_participant_id()
  and public.prediction_is_open(match_id)
);

drop policy if exists "participants update own open predictions" on public.predictions;
create policy "participants update own open predictions"
on public.predictions for update
to authenticated
using (
  participant_id = public.current_participant_id()
  and public.prediction_is_open(match_id)
)
with check (
  participant_id = public.current_participant_id()
  and public.prediction_is_open(match_id)
);

drop policy if exists "admins can manage predictions" on public.predictions;
create policy "admins can manage predictions"
on public.predictions for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "family photos are readable by authenticated users" on public.family_photos;
create policy "family photos are readable by authenticated users"
on public.family_photos for select
to authenticated
using (true);

drop policy if exists "admins can manage family photos" on public.family_photos;
create policy "admins can manage family photos"
on public.family_photos for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "final prediction settings readable by authenticated users" on public.final_prediction_settings;
create policy "final prediction settings readable by authenticated users"
on public.final_prediction_settings for select
to authenticated
using (true);

drop policy if exists "admins can manage final prediction settings" on public.final_prediction_settings;
create policy "admins can manage final prediction settings"
on public.final_prediction_settings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "participants read own final prediction" on public.final_predictions;
create policy "participants read own final prediction"
on public.final_predictions for select
to authenticated
using (participant_id = public.current_participant_id());

drop policy if exists "participants insert own open final prediction" on public.final_predictions;
create policy "participants insert own open final prediction"
on public.final_predictions for insert
to authenticated
with check (
  participant_id = public.current_participant_id()
  and public.final_prediction_is_open()
);

drop policy if exists "participants update own open final prediction" on public.final_predictions;
create policy "participants update own open final prediction"
on public.final_predictions for update
to authenticated
using (
  participant_id = public.current_participant_id()
  and public.final_prediction_is_open()
)
with check (
  participant_id = public.current_participant_id()
  and public.final_prediction_is_open()
);

drop policy if exists "admins can manage final predictions" on public.final_predictions;
create policy "admins can manage final predictions"
on public.final_predictions for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.final_prediction_settings (id, is_enabled)
values (true, false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('family-photos', 'family-photos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "authenticated users can read avatars" on storage.objects;
create policy "authenticated users can read avatars"
on storage.objects for select
to authenticated
using (bucket_id = 'avatars');

drop policy if exists "admins can upload avatars" on storage.objects;
create policy "admins can upload avatars"
on storage.objects for insert
to authenticated
with check (bucket_id = 'avatars' and public.is_admin());

drop policy if exists "authenticated users can read family photos" on storage.objects;
create policy "authenticated users can read family photos"
on storage.objects for select
to authenticated
using (bucket_id = 'family-photos');

drop policy if exists "admins can upload family photos" on storage.objects;
create policy "admins can upload family photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'family-photos' and public.is_admin());
