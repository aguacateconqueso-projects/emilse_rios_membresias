import type { APIRoute } from 'astro';
import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { stripe, siteOrigin } from '../../lib/stripe';
import { supabaseAdmin, sendPasswordSetupEmail, generatePasswordSetupLink } from '../../lib/supabase-admin';
import { writeSubscriptionRow } from '../../lib/stripe-sync';
import { isResendConfigured, sendEmail, welcomeEmailContent } from '../../lib/email';

// Webhook de Stripe (función serverless). Escucha los eventos y mantiene la tabla
// `subscriptions` de Supabase como espejo del estado de Stripe. Flujo 2a: el
// comprador pagó sin sesión, así que enlazamos por el correo que dio en Stripe.
export const prerender = false;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const POST: APIRoute = async ({ request }) => {
  if (!stripe || !webhookSecret) return new Response('Stripe no configurado', { status: 500 });
  const admin = supabaseAdmin();
  if (!admin) return new Response('Supabase (service role) no configurado', { status: 500 });

  const sig = request.headers.get('stripe-signature');
  const raw = await request.text(); // cuerpo crudo: necesario para verificar la firma
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig ?? '', webhookSecret);
  } catch (err) {
    return new Response('Firma inválida: ' + (err instanceof Error ? err.message : String(err)), { status: 400 });
  }

  // Base para el enlace del correo de bienvenida (→ /nueva-clave/).
  const origin = siteOrigin(request);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription' || !session.subscription) break;
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        const email = session.customer_details?.email || session.customer_email || null;
        await upsertSub(admin, sub, { email }, origin);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await upsertSub(admin, sub, { userId: sub.metadata?.supabase_user_id }, origin);
        break;
      }
      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as any).subscription as string | null;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await upsertSub(admin, sub, { userId: sub.metadata?.supabase_user_id }, origin);
        }
        break;
      }
    }
  } catch (err) {
    console.error('[stripe-webhook] error procesando', event.type, err);
    return new Response('Error interno', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// Inserta/actualiza la fila de `subscriptions` a partir de una suscripción de Stripe.
async function upsertSub(
  admin: SupabaseClient,
  sub: Stripe.Subscription,
  hint: { userId?: string | null; email?: string | null } = {},
  origin?: string
) {
  const customerId = sub.customer as string;

  // user_id: 1) pista (metadata), 2) fila previa por customer, 3) crear/enlazar por correo.
  let userId = hint.userId || null;
  if (!userId) {
    const { data } = await admin
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .limit(1)
      .maybeSingle();
    userId = data?.user_id || null;
  }
  if (!userId) {
    let email = hint.email || null;
    if (!email && stripe) {
      const cust = await stripe.customers.retrieve(customerId);
      email = cust && !(cust as any).deleted ? (cust as any).email : null;
    }
    const found = await findOrCreateUser(admin, email);
    userId = found.userId;
    // Guarda el user_id en el customer para que los próximos eventos lo traigan.
    if (userId && stripe) {
      await stripe.customers.update(customerId, { metadata: { supabase_user_id: userId } }).catch(() => {});
    }
    // Cuenta NUEVA creada al pagar: envía el correo de bienvenida con el enlace
    // para crear su contraseña, en el idioma en el que pagó. Solo en el alta real,
    // para no reenviarlo en cada evento posterior. No es fatal si falla.
    if (found.created && email) {
      const lang = sub.metadata?.lang === 'en' ? 'en' : 'es';
      await sendWelcomeEmail(email, lang, origin);
    }
  }
  if (!userId) {
    console.error('[stripe-webhook] sin user_id para la suscripción', sub.id);
    return;
  }

  await writeSubscriptionRow(admin, sub, userId);
}

// Correo de bienvenida al alta: enlace de un solo uso para crear la contraseña,
// en el idioma en el que se pagó. El destino es /nueva-clave/ (es) o
// /nueva-clave/en/ (en). Camino preferido: generamos el enlace y lo enviamos por
// Resend con el copy ES/EN de Emi. Si Resend no está configurado, caemos al
// correo estándar de Supabase (plantilla única) con el mismo enlace por idioma.
async function sendWelcomeEmail(email: string, lang: 'es' | 'en', origin?: string) {
  try {
    const base = (origin || process.env.PUBLIC_SITE_URL || import.meta.env.PUBLIC_SITE_URL || '').replace(/\/+$/, '');
    if (!base) { console.error('[stripe-webhook] sin origin para el correo de bienvenida'); return; }
    const lower = email.trim().toLowerCase();
    const redirectTo = `${base}${lang === 'en' ? '/nueva-clave/en/' : '/nueva-clave/'}`;

    if (isResendConfigured) {
      const { link, error: linkErr } = await generatePasswordSetupLink(lower, redirectTo);
      if (link) {
        const { subject, html, text } = welcomeEmailContent(lang, link);
        const { error: mailErr } = await sendEmail({ to: lower, subject, html, text });
        if (!mailErr) return; // enviado por Resend en el idioma correcto
        console.error('[stripe-webhook] Resend falló, uso Supabase:', mailErr.message || mailErr);
      } else {
        console.error('[stripe-webhook] no se pudo generar el enlace, uso Supabase:', linkErr?.message || linkErr);
      }
    }

    // Respaldo: correo estándar de Supabase (misma URL de destino por idioma).
    const { error } = await sendPasswordSetupEmail(lower, redirectTo);
    if (error) console.error('[stripe-webhook] no se pudo enviar la bienvenida a', lower, error.message || error);
  } catch (err) {
    console.error('[stripe-webhook] error enviando la bienvenida', err);
  }
}

// Busca el perfil por correo; si no existe, crea el usuario (sin contraseña; el
// trigger de la BD crea el profile) y lo marca como recién creado para disparar
// el correo de bienvenida. Así, al pagar, la cuenta ya existe y el comprador solo
// tiene que crear su contraseña con el enlace del correo.
async function findOrCreateUser(
  admin: SupabaseClient,
  email: string | null
): Promise<{ userId: string | null; created: boolean }> {
  if (!email) return { userId: null, created: false };
  const lower = email.trim().toLowerCase();

  // GoTrue guarda los correos en minúsculas y el trigger los copia tal cual al
  // perfil, así que un match exacto (eq) es correcto y evita comodines de LIKE.
  const { data: prof } = await admin.from('profiles').select('id').eq('email', lower).maybeSingle();
  if (prof?.id) return { userId: prof.id, created: false };

  const { data: created, error } = await admin.auth.admin.createUser({
    email: lower,
    email_confirm: true,
  });
  if (created?.user?.id) return { userId: created.user.id, created: true };

  // Si ya existía en auth pero sin perfil, ubícalo por correo (no es alta nueva).
  if (error) {
    const { data: list } = await admin.auth.admin.listUsers();
    const u = list?.users?.find((x) => (x.email || '').toLowerCase() === lower);
    if (u) return { userId: u.id, created: false };
    console.error('[stripe-webhook] no se pudo crear/encontrar usuario para', lower, error.message);
  }
  return { userId: null, created: false };
}
