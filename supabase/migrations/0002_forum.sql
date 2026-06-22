-- =============================================================================
-- Foro real — ajustes sobre 0001
-- Ejecuta este archivo en Supabase → SQL Editor (una sola vez, después de 0001).
--
-- Dos cambios:
--   1) author_name desnormalizado en questions: un miembro NO puede leer el
--      profile de otro (RLS), así que el nombre a mostrar viaja en la propia
--      pregunta. Guardamos "Nombre Inicial." (ej. "Lucía F."), sin correo.
--   2) Acceso a los DOS foros (es/en): el modelo dice que cada miembro entra a
--      ambos y cambia con el toggle. Quitamos el filtro "lang = my_lang()" de la
--      RLS; el idioma se filtra en la consulta según la página (/aula vs /aula/en).
-- =============================================================================

-- ---------- 1) author_name ----------
alter table public.questions add column if not exists author_name text;

-- ---------- 2) RLS: leer/escribir en ambos idiomas ----------
-- Lectura: suscripción activa + ejercicio vigente de tu nivel. SIN filtro de idioma.
drop policy if exists "questions: member read" on public.questions;
create policy "questions: member read" on public.questions for select using (
  has_active_sub()
  and exists (
    select 1 from exercises e
    where e.id = questions.exercise_id
      and e.level = my_level()
      and now() >= e.publish_at and now() < e.unpublish_at
  )
);

-- Escritura: cualquier miembro con suscripción activa, sobre su propia fila.
-- El idioma (es/en) lo decide el foro en el que está escribiendo (la página).
drop policy if exists "questions: member write" on public.questions;
create policy "questions: member write" on public.questions for insert with check (
  user_id = auth.uid()
  and has_active_sub()
);
