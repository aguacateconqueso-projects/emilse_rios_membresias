-- =============================================================================
-- Traspaso de administrador: Emi = admin, todos los demás = miembros
-- Ejecutar en Supabase → SQL Editor.
--
-- ANTES de ejecutar:
--   1) El perfil de Emi debe existir. Se crea solo la primera vez que entra en
--      /entrar/ con su correo (enlace mágico). OJO: mientras Resend siga en modo
--      prueba (remitente onboarding@resend.dev) su correo NO le llega; en ese
--      caso créale el usuario a mano en Dashboard → Authentication → Users →
--      Add user (el trigger crea el perfil igual) y ya podrá ser promovida.
--   2) Reemplaza EMAIL-DE-EMI aquí abajo (una sola línea, en minúsculas).
-- 
-- El script es atómico: si el correo de Emi no existe, NO cambia nada
-- (nadie pierde el admin por un typo). Se puede re-ejecutar sin problema.
-- =============================================================================

do $$
declare
  emi_email    constant text := emilserios.bass@gmail.com;               -- ⚠️ EDITA ESTO
  tester_email constant text := 'adrianmendozam@gmail.com';   -- queda como alumno
begin
  -- 1) Emi pasa a admin. Si su perfil no existe, abortamos sin tocar nada.
  update public.profiles set role = 'admin' where lower(email) = lower(emi_email);
  if not found then
    raise exception 'No existe un perfil con el correo "%". Emi debe entrar una vez por /entrar/, o crea su usuario en Authentication → Users → Add user, y vuelve a ejecutar este script.', emi_email;
  end if;

  -- 2) Cualquier otro admin (Adrián incluido) baja a miembro: solo Emi entra
  --    al panel. La RLS impide que un miembro vuelva a ascenderse solo.
  update public.profiles set role = 'member'
  where role = 'admin' and lower(email) is distinct from lower(emi_email);

  -- 3) Adrián como alumno de prueba: nivel (si aún no tiene) y suscripción
  --    activa de 30 días (si no tiene una vigente), para ver el aula completa.
  update public.profiles set level = 'avanzando'
  where lower(email) = lower(tester_email) and level is null;

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

-- Verificación: Emi debe salir como admin y el resto como member.
select email, role, level, created_at
from public.profiles
order by (role = 'admin') desc, created_at;
