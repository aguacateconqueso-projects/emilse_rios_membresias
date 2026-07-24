import type { APIRoute } from 'astro';
import { stripe } from '../../lib/stripe';
import { supabaseAdmin, findOrCreateUser } from '../../lib/supabase-admin';
import { writeSubscriptionRow } from '../../lib/stripe-sync';

// "Contraseña al pagar" — camino sin correo. Stripe redirige tras el pago a
// /gracias/?session_id={CHECKOUT_SESSION_ID}; esta ruta recibe ese session_id y la
// contraseña que eligió el comprador, y:
//   1) le pregunta a Stripe si esa sesión de checkout está PAGADA (esa sesión es la
//      prueba de que quien la tiene acaba de pagar; nadie más tiene ese id),
//   2) saca el correo del propio checkout (no lo escribe el usuario → no se puede
//      reclamar la cuenta de otro tecleando su correo),
//   3) crea/encuentra la cuenta (mismo criterio que el webhook) y fija la contraseña,
//   4) espeja la suscripción en la BD por si el webhook aún no llegó, para que el
//      aula lo deje pasar de inmediato.
// El navegador, con la contraseña recién puesta, hace signInWithPassword y entra.
//
// Nota de seguridad: la autorización aquí es "tener un session_id de Stripe pagado".
// El correo NO viaja desde el navegador, así que no hay toma de cuentas por conocer
// el correo de un miembro (a diferencia de verificar solo "¿este correo pagó?").
export const prerender = false;

const MIN_PASSWORD = 8;

export const POST: APIRoute = async ({ request }) => {
  if (!stripe) return json({ error: 'stripe_not_configured' }, 500);
  const admin = supabaseAdmin();
  if (!admin) return json({ error: 'supabase_not_configured' }, 500);

  let body: any = {};
  try { body = await request.json(); } catch { /* body vacío/ inválido */ }
  const sessionId = typeof body?.session_id === 'string' ? body.session_id.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!sessionId) return json({ error: 'missing_session' }, 400);
  if (password.length < MIN_PASSWORD) return json({ error: 'weak_password' }, 400);

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // La sesión tiene que ser una suscripción COMPLETADA y pagada. `no_payment_required`
    // cubre pruebas/cupones al 100%; `paid` es el caso normal.
    const complete = session.mode === 'subscription' && session.status === 'complete';
    const paid = session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
    if (!complete || !paid) return json({ error: 'not_paid' }, 402);

    const email = (session.customer_details?.email || session.customer_email || '').trim().toLowerCase();
    if (!email) return json({ error: 'no_email' }, 422);

    const { userId } = await findOrCreateUser(admin, email);
    if (!userId) return json({ error: 'account_failed' }, 500);

    const { error: upErr } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (upErr) {
      console.error('[claim-account] no se pudo fijar la contraseña', upErr.message);
      return json({ error: 'set_password_failed', detail: upErr.message }, 500);
    }

    // Espeja la suscripción ya mismo (el webhook puede tardar o haber fallado), así
    // el aula lo deja entrar en cuanto inicie sesión. No es fatal si algo de esto falla.
    if (session.subscription) {
      try {
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        await writeSubscriptionRow(admin, sub, userId);
        await stripe.customers
          .update(sub.customer as string, { metadata: { supabase_user_id: userId } })
          .catch(() => {});
      } catch (e) {
        console.error('[claim-account] no se pudo espejar la suscripción', e);
      }
    }

    // Devolvemos el correo (el que puso en Stripe) para que el navegador inicie
    // sesión con él + la contraseña recién creada.
    return json({ ok: true, email });
  } catch (err: any) {
    console.error('[claim-account] error', err?.message || err);
    return json({ error: 'server_error' }, 500);
  }
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
