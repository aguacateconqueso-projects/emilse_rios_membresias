-- =============================================================================
-- 0004 — Quitar los niveles (Iniciando / Avanzando)
-- Ejecutar en Supabase → SQL Editor (después de 0001–0003).
--
-- Nuevo modelo: UN solo ejercicio vigente, global, para todos. Emi guía inicial
-- y avanzado dentro del mismo video ("si eres inicial, hasta aquí; si avanzado,
-- continúa"). Se elimina la segmentación por nivel: ya no hay columna `level`
-- ni versión por nivel.
--
-- ⚠️ Destructivo para esos datos: borra la columna `level` de `exercises` y
-- `profiles` y el enum `user_level`. El nivel dejó de usarse, así que es seguro.
-- Orden: primero las políticas/función que dependen del nivel, luego columnas y
-- por último el tipo enum.
-- =============================================================================

-- 1) RLS que dependía del nivel: recrear sin ese filtro.
--    exercises: basta suscripción activa + estar dentro de la ventana de vigencia.
drop policy if exists "exercises: member current" on public.exercises;
create policy "exercises: member current" on public.exercises for select using (
  has_active_sub()
  and now() >= publish_at
  and now() <  unpublish_at
);

--    questions: leer el foro del ejercicio vigente (sin nivel). Sin filtro de
--    idioma —se filtra en la consulta según la página—, igual que dejó 0002.
drop policy if exists "questions: member read" on public.questions;
create policy "questions: member read" on public.questions for select using (
  has_active_sub()
  and exists (
    select 1 from exercises e
    where e.id = questions.exercise_id
      and now() >= e.publish_at and now() < e.unpublish_at
  )
);

-- 2) La función my_level() ya no se usa.
drop function if exists public.my_level();

-- 3) Quitar la columna level de ambas tablas.
alter table public.exercises drop column if exists level;
alter table public.profiles  drop column if exists level;

-- 4) Rehacer el índice de ventana sin la columna level.
drop index if exists public.exercises_window_idx;
create index if not exists exercises_window_idx on public.exercises (publish_at, unpublish_at);

-- 5) Quitar el enum, ya sin usos.
drop type if exists public.user_level;
