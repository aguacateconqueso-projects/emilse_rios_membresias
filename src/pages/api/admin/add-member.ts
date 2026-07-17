import type { APIRoute } from 'astro';
import type { SupabaseClient } from '@supabase/supabase-js';
import { siteOrigin } from '../../../lib/stripe';
import { supabaseAdmin, getUserFromRequest } from '../../../lib/supabase-admin';
import { sendAccessEmail } from '../../../lib/welcome-email';

// Alta MANUAL de un miembro (punto 14). Emi puede dar de alta alumnos o un
// miembro previo de membresía sin que pasen por el checkout de Stripe: se crea
// (o reutiliza) la cuenta por correo y se le concede una suscripción "manual"
// activa (sin id de Stripe, sin fecha de fin → acceso al aula hasta que Emi la
// quite). Opcionalmente se le envía el correo de acceso para que cree su
// contraseña, igual que cualquier miembro.
//
// Solo admin: se valida el token del navegador (Authorization: Bearer …) y que
// ese usuario tenga role = 'admin'. Todo lo demás corre con service_role, que
// es lo único que puede crear la cuenta en auth.users (el navegador no puede).
export const prerender = false;

// POST /api/admin/add-member  { email, full_name?, lang?, send_email? }
//   → { ok, created, emailed }  |  { error }
export const POST: APIRoute = async ({ request }) => {
  const admin = supabaseAdmin();
  if (!admin) return json({ error: 'Supabase no está configurado (falta service role).' }, 500);

  // --- Solo admin ---
  const caller = await getUserFromRequest(request);
  if (!caller) return json({ error: 'Debes iniciar sesión.' }, 401);
  const { data: callerProfile } = await admin
    .from('profiles').select('role').eq('id', caller.id).maybeSingle();
  if (callerProfile?.role !== 'admin') return json({ error: 'No autorizada.' }, 403);

  // --- Entrada ---
  let body: any = {};
  try { body = await request.json(); } catch { /* body vacío/ inválido */ }
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const fullName = typeof body?.full_name === 'string' ? body.full_name.trim() : '';
  const lang: 'es' | 'en' = body?.lang === 'en' ? 'en' : 'es';
  const sendEmail = body?.send_email !== false; // por defecto sí

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ error: 'Correo no válido.' }, 400);
  }

  try {
    // 1) Crear o encontrar la cuenta por correo.
    const { userId, created } = await findOrCreateUser(admin, email, fullName);
    if (!userId) return json({ error: 'No se pudo crear o encontrar la cuenta.' }, 500);

    // 2) Si nos pasaron nombre y el perfil no tiene uno, lo completamos (el
    //    trigger de la BD lo deja en null cuando la cuenta se crea sin metadata).
    if (fullName) {
      const { data: prof } = await admin.from('profiles').select('full_name').eq('id', userId).maybeSingle();
      if (prof && !prof.full_name) {
        await admin.from('profiles').update({ full_name: fullName }).eq('id', userId);
      }
    }

    // 3) Conceder la suscripción manual activa (idempotente por usuario).
    await grantManualSubscription(admin, userId);

    // 4) Correo de acceso (crear contraseña) por el mismo camino que el resto.
    let emailed = false;
    if (sendEmail) {
      await sendAccessEmail(email, lang, siteOrigin(request));
      emailed = true;
    }

    return json({ ok: true, created, emailed });
  } catch (err: any) {
    console.error('[add-member] error', err);
    return json({ error: 'No se pudo dar de alta al miembro.' }, 500);
  }
};

// Busca el perfil por correo; si no existe, crea la cuenta (sin contraseña; el
// trigger de la BD crea el profile). Mismo criterio que el webhook de Stripe.
async function findOrCreateUser(
  admin: SupabaseClient,
  email: string,
  fullName: string
): Promise<{ userId: string | null; created: boolean }> {
  const { data: prof } = await admin.from('profiles').select('id').eq('email', email).maybeSingle();
  if (prof?.id) return { userId: prof.id, created: false };

  const { data: createdU, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });
  if (createdU?.user?.id) return { userId: createdU.user.id, created: true };

  // Ya existía en auth pero sin perfil: ubícalo por correo (no es alta nueva).
  if (error) {
    const { data: list } = await admin.auth.admin.listUsers();
    const u = list?.users?.find((x) => (x.email || '').toLowerCase() === email);
    if (u) return { userId: u.id, created: false };
    console.error('[add-member] no se pudo crear/encontrar usuario para', email, error.message);
  }
  return { userId: null, created: false };
}

// Escribe una fila de suscripción MANUAL: activa, sin id real de Stripe y sin
// fecha de fin (has_active_sub() trata current_period_end nulo como vigente).
// Usa un id sintético `manual_<userId>` como clave de conflicto para que dar de
// alta dos veces al mismo miembro actualice la misma fila en vez de duplicarla.
async function grantManualSubscription(admin: SupabaseClient, userId: string) {
  const row = {
    user_id: userId,
    stripe_customer_id: null,
    stripe_subscription_id: 'manual_' + userId,
    status: 'active',
    tier: null,
    current_period_start: new Date().toISOString(),
    current_period_end: null, // sin vencimiento: acceso hasta que Emi lo quite
    cancel_at_period_end: false,
    updated_at: new Date().toISOString(),
  };
  const { error } = await admin.from('subscriptions').upsert(row, { onConflict: 'stripe_subscription_id' });
  if (error) throw new Error('subscriptions: ' + error.message);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
