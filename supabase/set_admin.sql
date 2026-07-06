-- =============================================================================
-- Roles del proyecto: define quién es admin y prepara el alumno de prueba.
-- Ejecutar en Supabase → SQL Editor. Idempotente y re-ejecutable.
--
--   ADMINS (ven /panel):  Emi + Adrián (Adrián, para apoyar a Emi).
--   ALUMNO DE PRUEBA:     mdza.exp@gmail.com (nivel + suscripción activa).
--
-- ANTES de ejecutar: el perfil de cada admin debe existir (se crea la primera
-- vez que entra por /entrar/ con su correo). Si falta alguno, el script ABORTA
-- sin tocar nada — así nadie pierde el admin por un typo o un login pendiente.
-- =============================================================================

do $$
declare
  -- Correos con acceso de admin, en minúsculas. Para sumar/quitar admins,
  -- edita SOLO esta lista y re-ejecuta.
  admin_emails constant text[] := array[
    'emilserios.bass@gmail.com',   -- Emi
    'adrianmendozam@gmail.com'     -- Adrián (apoyo)
  ];
  tester_email constant text := 'mdza.exp@gmail.com';   -- alumno de prueba
  missing text;
begin
  -- 0) Verificar que TODOS los admins tengan perfil; si falta alguno, abortar.
  select string_agg(e, ', ') into missing
  from unnest(admin_emails) e
  where not exists (select 1 from public.profiles p where lower(p.email) = lower(e));
  if missing is not null then
    raise exception 'Sin perfil (deben entrar una vez por /entrar/ antes): %', missing;
  end if;

  -- 1) Los correos de la lista pasan a admin.
  update public.profiles set role = 'admin'
  where lower(email) = any (admin_emails);

  -- 2) Cualquier OTRO admin baja a miembro: solo la lista de arriba entra al
  --    panel. La RLS impide que un miembro se vuelva a ascender solo.
  update public.profiles set role = 'member'
  where role = 'admin' and lower(email) <> all (admin_emails);

  -- 3) Alumno de prueba: suscripción activa de 30 días (si no tiene una vigente),
  --    para ver el aula completa. (Ya no hay niveles.)
  insert into public.subscriptions (user_id, status, tier, current_period_end)
  select p.id, 'active', 'founder_57', now() + interval '30 days'
  from public.profiles p
  where lower(p.email) = lower(tester_email)
    and not exists (
      select 1 from public.subscriptions s
      where s.user_id = p.id
        and s.status = 'active'
        and (s.current_period_end is null or s.current_period_end > now())
    );
end $$;

-- Verificación: Emi y Adrián como admin; mdza.exp como member.
select email, role, created_at
from public.profiles
order by (role = 'admin') desc, created_at;
