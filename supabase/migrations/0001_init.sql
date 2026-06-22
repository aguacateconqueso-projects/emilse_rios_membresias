-- =============================================================================
-- Membresía "Estudiemos Juntos" — esquema inicial
-- Ejecuta este archivo en Supabase → SQL Editor (una sola vez).
-- Define tablas, tipos, la creación automática de perfiles y las reglas RLS
-- que hacen cumplir el modelo: "solo el ejercicio vigente, de tu nivel, si tu
-- suscripción está activa". El foro está separado por idioma (es / en).
-- =============================================================================

-- ---------- TIPOS ----------
do $$ begin
  create type user_level as enum ('iniciando', 'avanzando');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('member', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lang as enum ('es', 'en');
exception when duplicate_object then null; end $$;

do $$ begin
  create type price_tier as enum ('founder_57', 'standard_77');
exception when duplicate_object then null; end $$;

-- ---------- PERFILES (extiende auth.users) ----------
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text,
  full_name      text,
  level          user_level,                 -- null hasta que Emi lo asigne
  preferred_lang lang        not null default 'es',
  role           user_role   not null default 'member',
  created_at     timestamptz not null default now()
);

-- ---------- SUSCRIPCIONES (espejo de Stripe; se llena en el paso 5) ----------
create table if not exists public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references public.profiles(id) on delete cascade,
  stripe_customer_id      text,
  stripe_subscription_id  text,
  status                  text not null default 'inactive',  -- active, past_due, canceled...
  tier                    price_tier,
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean not null default false,
  updated_at              timestamptz not null default now()
);
create index if not exists subscriptions_user_idx on public.subscriptions(user_id);

-- ---------- EJERCICIOS (contenido global semanal, bilingüe) ----------
create table if not exists public.exercises (
  id            uuid primary key default gen_random_uuid(),
  level         user_level not null,
  title_es      text not null,
  title_en      text not null,
  desc_es       text,
  desc_en       text,
  vimeo_url_es  text,
  vimeo_url_en  text,
  pdf_path_es   text,        -- ruta en Supabase Storage (opcional)
  pdf_path_en   text,
  week_label    text,        -- ej. "Semana 24"
  publish_at    timestamptz not null,   -- se hace visible (jue 00:01 Madrid)
  unpublish_at  timestamptz not null,   -- se oculta (jue siguiente 00:00 Madrid)
  created_at    timestamptz not null default now()
);
create index if not exists exercises_window_idx on public.exercises(level, publish_at, unpublish_at);

-- ---------- FORO: preguntas (separadas por idioma) ----------
create table if not exists public.questions (
  id           uuid primary key default gen_random_uuid(),
  exercise_id  uuid not null references public.exercises(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  lang         lang not null,
  body         text not null,
  created_at   timestamptz not null default now()
);
create index if not exists questions_exercise_idx on public.questions(exercise_id);

-- ---------- FORO: respuestas (de Emi) ----------
create table if not exists public.answers (
  id           uuid primary key default gen_random_uuid(),
  question_id  uuid not null references public.questions(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  body         text not null,
  created_at   timestamptz not null default now()
);

-- ---------- PROGRESO: ejercicios completados ----------
create table if not exists public.completions (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  exercise_id  uuid not null references public.exercises(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

-- =============================================================================
-- FUNCIONES AUXILIARES (SECURITY DEFINER: evitan recursión de RLS)
-- =============================================================================
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.has_active_sub()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from subscriptions
    where user_id = auth.uid()
      and status = 'active'
      and (current_period_end is null or current_period_end > now())
  );
$$;

create or replace function public.my_level()
returns user_level language sql stable security definer set search_path = public as $$
  select level from profiles where id = auth.uid();
$$;

create or replace function public.my_lang()
returns lang language sql stable security definer set search_path = public as $$
  select preferred_lang from profiles where id = auth.uid();
$$;

-- Crea el perfil automáticamente al registrarse un usuario nuevo
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.profiles      enable row level security;
alter table public.subscriptions enable row level security;
alter table public.exercises     enable row level security;
alter table public.questions     enable row level security;
alter table public.answers       enable row level security;
alter table public.completions   enable row level security;

-- ---- profiles ----
drop policy if exists "profiles: self read"   on public.profiles;
drop policy if exists "profiles: self update" on public.profiles;
drop policy if exists "profiles: admin all"   on public.profiles;
create policy "profiles: self read"   on public.profiles for select using (id = auth.uid());
create policy "profiles: self update" on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = 'member');   -- un miembro no puede auto-ascenderse a admin
create policy "profiles: admin all"   on public.profiles for all using (is_admin()) with check (is_admin());

-- ---- subscriptions ----
drop policy if exists "subs: self read" on public.subscriptions;
drop policy if exists "subs: admin all" on public.subscriptions;
create policy "subs: self read" on public.subscriptions for select using (user_id = auth.uid());
create policy "subs: admin all" on public.subscriptions for all using (is_admin()) with check (is_admin());
-- (la escritura normal de subs la hace el webhook de Stripe con service_role, que ignora RLS)

-- ---- exercises: EL corazón del modelo ----
drop policy if exists "exercises: member current" on public.exercises;
drop policy if exists "exercises: admin all"      on public.exercises;
create policy "exercises: member current" on public.exercises for select using (
  has_active_sub()
  and level = my_level()
  and now() >= publish_at
  and now() <  unpublish_at
);
create policy "exercises: admin all" on public.exercises for all using (is_admin()) with check (is_admin());

-- ---- questions: foro de la semana, separado por idioma ----
drop policy if exists "questions: member read" on public.questions;
drop policy if exists "questions: member write" on public.questions;
drop policy if exists "questions: admin all" on public.questions;
create policy "questions: member read" on public.questions for select using (
  has_active_sub()
  and lang = my_lang()
  and exists (
    select 1 from exercises e
    where e.id = questions.exercise_id
      and e.level = my_level()
      and now() >= e.publish_at and now() < e.unpublish_at
  )
);
create policy "questions: member write" on public.questions for insert with check (
  user_id = auth.uid()
  and has_active_sub()
  and lang = my_lang()
);
create policy "questions: admin all" on public.questions for all using (is_admin()) with check (is_admin());

-- ---- answers: visibles con su pregunta; solo el admin responde ----
drop policy if exists "answers: member read" on public.answers;
drop policy if exists "answers: admin all" on public.answers;
create policy "answers: member read" on public.answers for select using (
  exists (select 1 from questions q where q.id = answers.question_id)  -- la RLS de questions ya filtra
);
create policy "answers: admin all" on public.answers for all using (is_admin()) with check (is_admin());

-- ---- completions: cada quien gestiona las suyas ----
drop policy if exists "completions: self all" on public.completions;
drop policy if exists "completions: admin read" on public.completions;
create policy "completions: self all"  on public.completions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "completions: admin read" on public.completions for select using (is_admin());

-- =============================================================================
-- DESPUÉS DE REGISTRARTE: convierte tu cuenta en admin (Emi)
--   update public.profiles set role = 'admin' where email = 'TU-EMAIL';
-- =============================================================================
