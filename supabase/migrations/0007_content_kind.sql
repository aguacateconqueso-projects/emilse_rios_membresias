-- =============================================================================
-- 0007 — Destino del contenido: Ejercicio de la semana / Concepto Base / Bonus
-- Ejecutar en Supabase → SQL Editor (después de 0001–0006).
--
-- Punto 11 del checklist: hoy `exercises` solo modela el ejercicio semanal. Se
-- reutiliza la misma tabla (ya es genérica: título/desc/vimeo/pdf bilingües +
-- ventana publish_at/unpublish_at) para las otras dos pestañas del aula
-- (Concepto Base y Bonus Material), agregando una columna `kind` que dice a
-- cuál de las tres pertenece cada fila.
--
-- - kind='semana' (default): sin cambios, misma ventana semanal de siempre.
-- - kind='base': mismo mecanismo de ventana, pero pensado para un rango mensual
--   (una fila "vigente" a la vez, igual que hoy con la semanal).
-- - kind='bonus': se acumula — una vez publicada (publish_at <= now) NO expira,
--   la política de miembro ignora unpublish_at para este tipo. El panel guarda
--   unpublish_at igual (no-null en la tabla) pero con una fecha muy lejana.
-- =============================================================================

begin;

create type public.content_kind as enum ('semana', 'base', 'bonus');

alter table public.exercises
  add column if not exists kind public.content_kind not null default 'semana';

-- Política de lectura de miembro: la ventana de vigencia sigue mandando para
-- semana/base; para bonus alcanza con que ya se haya publicado.
drop policy if exists "exercises: member current" on public.exercises;
create policy "exercises: member current" on public.exercises for select using (
  has_active_sub()
  and now() >= publish_at
  and (kind = 'bonus' or now() < unpublish_at)
);

-- Reindexar la ventana incluyendo el tipo (las tres pestañas consultan por su
-- propio kind).
drop index if exists public.exercises_window_idx;
create index if not exists exercises_window_idx on public.exercises (kind, publish_at, unpublish_at);

commit;
