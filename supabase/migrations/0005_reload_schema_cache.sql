-- =============================================================================
-- 0005 — Recargar la cache de esquema de PostgREST
-- Ejecutar en Supabase → SQL Editor (después de 0004).
--
-- Contexto del incidente: al guardar un ejercicio en /panel salía
--   "could not find the 'level' column of 'exercises' in the schema cache"
-- (error PGRST204). Ese error lo lanza PostgREST cuando la petición trae una
-- columna que su cache de esquema no reconoce. Como 0004 ya borró `level` de la
-- BD, el error indica que ALGO seguía enviando `level`:
--   • Causa principal: un build VIEJO de Vercel (anterior a quitar niveles)
--     seguía vivo en el navegador / edge y mandaba `level`. Se corrige con un
--     redeploy a `main` (cada push re-despliega) + refresco fuerte (Ctrl+Shift+R).
--   • Belt-and-suspenders (esta migración): si además la cache de esquema de
--     PostgREST quedó desincronizada tras el DROP de 0004, este NOTIFY la fuerza
--     a releer el esquema al instante. Es idempotente e inofensivo.
-- =============================================================================

notify pgrst, 'reload schema';
