-- =============================================================================
-- 0008 — Etiqueta corta bilingüe ("Semana 8" / "Week 8")
-- Ejecutar en Supabase → SQL Editor (después de 0001–0007).
--
-- El bug que arregla: en /aula/en/ salía «Semana 8» junto a «Available until
-- Thursday». `week_label` es UNA sola columna de texto libre, así que lo que
-- Emi escribiera se veía igual en los dos idiomas — el único trozo del
-- contenido que no era bilingüe (título, descripción, video y PDF ya lo son).
--
-- Por qué se AGREGA `week_label_en` en vez de renombrar el par a
-- `week_label_es` / `week_label_en`: renombrar rompe el código que esté vivo
-- mientras se despliega (lo que ya está en el navegador de Emi seguiría
-- mandando `week_label`, que ya no existiría, y guardar daría error). Con esta
-- forma, el orden de las cosas deja de importar: el código viejo ignora la
-- columna nueva, y el código nuevo, si la columna todavía no está, lee
-- `undefined` y cae en la española. En ningún momento se rompe nada.
-- Es el mismo criterio (y el mismo precio: un nombre asimétrico) que con
-- `vimeo_url_es` / `vimeo_url_en`, que hoy guardan Bunny.
--
-- ⚠️ `week_label` queda siendo LA ESPAÑOLA. No se toca su contenido: las filas
-- que ya existen siguen mostrando lo mismo en /aula/, y en /aula/en/ pasan a
-- mostrar la inglesa en cuanto Emi la escriba (mientras tanto, la española).
-- =============================================================================

begin;

alter table public.exercises
  add column if not exists week_label_en text;

comment on column public.exercises.week_label is
  'Etiqueta corta en ESPAÑOL ("Semana 8"). Nombre histórico: es la columna es.';
comment on column public.exercises.week_label_en is
  'Etiqueta corta en INGLÉS ("Week 8"). Vacía = el aula usa la española.';

commit;

-- La cache de esquema de PostgREST no ve la columna nueva hasta que relee (si
-- no, el panel da PGRST204 al guardar). Ver el incidente de 0005.
notify pgrst, 'reload schema';
