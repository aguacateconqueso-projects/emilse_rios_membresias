import type { APIRoute } from 'astro';
import { stripe } from '../../lib/stripe';
import { supabaseAdmin, getUserFromRequest } from '../../lib/supabase-admin';

// Portal de cliente de Stripe: el miembro (ya autenticado en el aula) gestiona
// su tarjeta y da de baja. Requiere sesión porque hay que saber qué customer es.
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!stripe) return json({ error: 'Stripe no está configurado.' }, 500);
  const admin = supabaseAdmin();
  if (!admin) return json({ error: 'Supabase no está configurado.' }, 500);

  const user = await getUserFromRequest(request);
  if (!user) return json({ error: 'Debes iniciar sesión.' }, 401);

  let body: any = {};
  try { body = await request.json(); } catch {}
  const lang = body?.lang === 'en' ? 'en' : 'es';
  const origin = new URL(request.url).origin;

  const { data: sub } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .not('stripe_customer_id', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub?.stripe_customer_id) return json({ error: 'Aún no tienes datos de facturación.' }, 400);

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    locale: lang,
    return_url: `${origin}/aula/${lang === 'en' ? 'en/' : ''}`,
  });

  return json({ url: session.url });
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
