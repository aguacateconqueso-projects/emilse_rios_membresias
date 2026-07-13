import type { APIRoute } from 'astro';
import type Stripe from 'stripe';
import { stripe } from '../../lib/stripe';
import { supabaseAdmin, getUserFromRequest } from '../../lib/supabase-admin';
import { writeSubscriptionRow, subGrantsAccess } from '../../lib/stripe-sync';

// Red de seguridad contra el "bucle de pago". El acceso al aula depende de que
// el webhook de Stripe haya escrito la fila de `subscriptions`. Si ese webhook
// no llegó, falló o tardó, un miembro que YA pagó queda encerrado en la puerta
// de pago. Este endpoint le pregunta a Stripe directamente por el correo del
// miembro autenticado; si hay una suscripción vigente, la espeja en la BD y
// enlaza el customer, de modo que la próxima lectura del aula lo deje pasar.
export const prerender = false;

// POST /api/verify-subscription  →  { active: boolean }
export const POST: APIRoute = async ({ request }) => {
  if (!stripe) return json({ error: 'Stripe no está configurado.' }, 500);
  const admin = supabaseAdmin();
  if (!admin) return json({ error: 'Supabase no está configurado.' }, 500);

  const user = await getUserFromRequest(request);
  if (!user) return json({ error: 'Debes iniciar sesión.' }, 401);
  const email = (user.email || '').trim().toLowerCase();
  if (!email) return json({ active: false });

  try {
    // Puede haber más de un customer con el mismo correo (p. ej. reintentos de
    // pago). Recorre todos y quédate con la primera suscripción que dé acceso.
    const customers = await stripe.customers.list({ email, limit: 20 });
    let match: Stripe.Subscription | null = null;
    for (const cust of customers.data) {
      const subs = await stripe.subscriptions.list({ customer: cust.id, status: 'all', limit: 20 });
      match = subs.data.find((s) => subGrantsAccess(s.status)) ?? null;
      if (match) break;
    }
    if (!match) return json({ active: false });

    await writeSubscriptionRow(admin, match, user.id);
    // Deja la pista para que los próximos eventos del webhook resuelvan el user
    // sin volver a pasar por aquí.
    await stripe.customers
      .update(match.customer as string, { metadata: { supabase_user_id: user.id } })
      .catch(() => {});

    return json({ active: true });
  } catch (err) {
    console.error('[verify-subscription] error', err);
    return json({ error: 'No se pudo verificar la suscripción.' }, 500);
  }
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
