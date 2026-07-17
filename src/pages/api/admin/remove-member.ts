import type { APIRoute } from 'astro';
import { supabaseAdmin, getUserFromRequest } from '../../../lib/supabase-admin';

// Quitar el acceso MANUAL de un miembro (punto 14). Borra la fila de suscripción
// "manual" (`manual_<userId>`) del miembro, con lo que `has_active_sub()` deja de
// darle acceso al aula. NO borra su cuenta ni su perfil (puede volver a entrar si
// Emi lo agrega otra vez o si paga por Stripe), y NO toca ninguna suscripción real
// de Stripe: solo la concesión hecha a mano. Las bajas de Stripe se gestionan por
// el portal de Stripe (el webhook ya les quita el acceso al terminar el período).
//
// Solo admin: se valida el token del navegador y que ese usuario sea admin.
export const prerender = false;

// POST /api/admin/remove-member  { user_id }  → { ok, removed }  |  { error }
export const POST: APIRoute = async ({ request }) => {
  const admin = supabaseAdmin();
  if (!admin) return json({ error: 'Supabase no está configurado (falta service role).' }, 500);

  const caller = await getUserFromRequest(request);
  if (!caller) return json({ error: 'Debes iniciar sesión.' }, 401);
  const { data: callerProfile } = await admin
    .from('profiles').select('role').eq('id', caller.id).maybeSingle();
  if (callerProfile?.role !== 'admin') return json({ error: 'No autorizada.' }, 403);

  let body: any = {};
  try { body = await request.json(); } catch { /* body vacío/ inválido */ }
  const userId = typeof body?.user_id === 'string' ? body.user_id.trim() : '';
  if (!userId) return json({ error: 'Falta el miembro a quitar.' }, 400);

  // Solo la concesión manual: la clave sintética `manual_<userId>`. Así no se
  // toca ninguna suscripción real de Stripe que el miembro pudiera tener.
  const { data, error } = await admin
    .from('subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('stripe_subscription_id', 'manual_' + userId)
    .select('id');
  if (error) {
    console.error('[remove-member] error', error);
    return json({ error: 'No se pudo quitar el acceso.' }, 500);
  }
  return json({ ok: true, removed: (data?.length || 0) > 0 });
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
