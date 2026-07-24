import type { APIRoute } from 'astro';
import { stripe, currentTier, priceForTier, siteOrigin } from '../../lib/stripe';

// Endpoint bajo demanda (no se prerenderiza): crea la sesión de Stripe Checkout
// y redirige. Flujo 2a: pago ANÓNIMO. El comprador no inicia sesión antes; Stripe
// recolecta el correo y el webhook crea/enlaza el perfil por ese correo.
export const prerender = false;

// GET /api/checkout?lang=es|en  →  302 a la página de pago de Stripe.
// Es un GET para que los botones de la carta sean un simple <a href> (sin JS).
export const GET: APIRoute = async ({ request, redirect }) => {
  if (!stripe) return new Response('Stripe no está configurado.', { status: 500 });

  const url = new URL(request.url);
  const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'es';
  const origin = siteOrigin(request);

  // El precio (fundador $57 / estándar $80) lo decide la fecha. El tier queda
  // congelado en la suscripción: Stripe seguirá cobrando ese precio.
  const tier = currentTier();
  const price = priceForTier(tier);
  if (!price) return new Response('Falta configurar el precio de Stripe.', { status: 500 });

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      // Guardamos el idioma en el que pagó para enviar el correo de bienvenida
      // (y el enlace de crear contraseña) en ES o EN según corresponda.
      metadata: { tier, lang },
      subscription_data: { metadata: { tier, lang } },
      // Idioma de la página de pago de Stripe (no hacen falta precios por idioma).
      locale: lang,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      // Tras pagar, el comprador aún no tiene sesión: lo mandamos a la página de
      // agradecimiento (bilingüe) a pedir su acceso con el MISMO correo con el que
      // pagó (punto 9 del checklist).
      success_url: `${origin}/gracias/${lang === 'en' ? 'en/' : ''}`,
      cancel_url: `${origin}/${lang === 'en' ? 'en/' : ''}`,
    });
  } catch (err: any) {
    // Sin este try/catch, un fallo de Stripe (ej. Price ID de otro modo test/live,
    // Price archivado, o clave inválida) salía como un 500 genérico de Vercel sin
    // pista de la causa. Registramos el detalle completo en los logs de la función
    // (Vercel → Logs) y devolvemos el motivo de Stripe (type/code/message), que NO
    // contiene secretos, para poder diagnosticar desde el propio navegador.
    console.error('[checkout] Stripe falló al crear la sesión', {
      tier, price, message: err?.message, type: err?.type, code: err?.code,
    });
    const detail = err?.message || 'error desconocido';
    return new Response(
      `No se pudo conectar con Stripe.\n\nMotivo: ${detail}\n\n` +
      `Revisa en Vercel que STRIPE_PRICE_STANDARD (tier actual: ${tier}) y ` +
      `STRIPE_SECRET_KEY sean del MISMO modo (ambos test o ambos live) y que el ` +
      `Price exista y esté activo.`,
      { status: 500, headers: { 'content-type': 'text/plain; charset=utf-8' } },
    );
  }

  if (!session.url) return new Response('No se pudo crear la sesión de pago.', { status: 500 });
  return redirect(session.url, 303);
};
