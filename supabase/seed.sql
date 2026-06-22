-- =============================================================================
-- Datos de ejemplo para probar (ejecútalo en Supabase → SQL Editor)
-- Crea el ejercicio vigente de la semana en ambos niveles, visible AHORA
-- (desde ayer hasta dentro de 6 días) para que el aula tenga qué mostrar.
-- =============================================================================

insert into public.exercises
  (level, title_es, title_en, desc_es, desc_en, vimeo_url_es, vimeo_url_en, week_label, publish_at, unpublish_at)
values
  ('avanzando',
   'Détaché controlado: peso y punto de contacto',
   'Controlled détaché: weight and contact point',
   'Trabajamos el détaché desde el peso del brazo, controlando el punto de contacto. Empieza a 60 bpm.',
   'We work the détaché from the weight of the arm, controlling the contact point. Start at 60 bpm.',
   'https://vimeo.com/76979871', 'https://vimeo.com/76979871',
   'Semana 24', now() - interval '1 day', now() + interval '6 days'),
  ('iniciando',
   'Détaché: primer contacto',
   'Détaché: first contact',
   'Primer acercamiento al détaché. Arco largo y relajado, sin presión.',
   'First approach to détaché. Long, relaxed bow, no pressure.',
   'https://vimeo.com/76979871', 'https://vimeo.com/76979871',
   'Semana 24', now() - interval '1 day', now() + interval '6 days');

-- =============================================================================
-- PASOS MANUALES (reemplaza TU-EMAIL por el correo con el que te registres):
--
-- 1) Regístrate primero en /entrar (te llega el enlace mágico).
-- 2) Conviértete en admin (para entrar al panel):
--      update public.profiles set role = 'admin' where email = 'TU-EMAIL';
--
-- 3) Para probar el AULA como miembro normal, dale a tu usuario nivel y una
--    suscripción activa de prueba:
--      update public.profiles set level = 'avanzando' where email = 'TU-EMAIL';
--      insert into public.subscriptions (user_id, status, tier, current_period_end)
--      select id, 'active', 'founder_57', now() + interval '30 days'
--      from public.profiles where email = 'TU-EMAIL';
-- =============================================================================
