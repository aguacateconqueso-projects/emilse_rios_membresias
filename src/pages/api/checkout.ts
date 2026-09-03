import type { APIRoute } from 'astro';
import { stripe, currentTier, priceForTier, siteOrigin } from '../../lib/stripe';
import { doorsClosed, inviteValid, INVITE_PARAM, REOPENS_AT, NEWSLETTER_URL } from '../../lib/membership';

// Endpoint bajo demanda (no se prerenderiza): crea la sesión de Stripe Checkout
// y redirige. Flujo 2a: pago ANÓNIMO. El comprador no inicia sesión antes; Stripe
// recolecta el correo y el webhook crea/enlaza el perfil por ese correo.
export const prerender = false;

// GET /api/checkout?lang=es|en  →  302 a la página de pago de Stripe.
// Es un GET para que los botones de la carta sean un simple <a href> (sin JS).
export const GET: APIRoute = async ({ request, redirect }) => {
  const url = new URL(request.url);
  const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'es';
  const origin = siteOrigin(request);

  // Pase de invitación: `?pase=…` deja entrar a UNA persona con las puertas
  // cerradas (ver src/lib/membership.ts). No es un descuento ni un regalo — paga
  // lo mismo y sigue el mismo camino; solo se salta el cierre. Sin código válido
  // vale 0: el `if` de abajo se comporta exactamente como antes.
  const invited = inviteValid(url.searchParams.get(INVITE_PARAM));

  // Puertas cerradas → no se crea la sesión de Stripe. Esconder los botones de la
  // carta NO basta: esta URL se puede pegar a mano, quedó en un correo viejo o la
  // guardó el navegador. El cierre de verdad es este, y usa las MISMAS fechas que
  // la carta (src/lib/membership.ts). 403 y no 404: existe, pero está cerrado.
  // Va ANTES de mirar a Stripe: si las puertas están cerradas da igual cómo esté
  // configurado el cobro, y así el visitante ve la explicación y no un error.
  if (doorsClosed() && !invited) return closedResponse(lang, origin);

  if (!stripe) return new Response('Stripe no está configurado.', { status: 500 });

  // El precio (fundador $57 / estándar €65) lo decide la fecha. El tier queda
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
      // `invited` queda escrito en Stripe para que se vea de un vistazo, meses
      // después, que esa suscripción entró por un pase y no por la carta abierta.
      metadata: { tier, lang, invited: invited ? 'si' : 'no' },
      subscription_data: { metadata: { tier, lang, invited: invited ? 'si' : 'no' } },
      // Idioma de la página de pago de Stripe (no hacen falta precios por idioma).
      locale: lang,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      // Tras pagar, el comprador aún no tiene sesión: lo mandamos a la página de
      // agradecimiento (bilingüe). El `{CHECKOUT_SESSION_ID}` (placeholder que
      // Stripe rellena) le permite a /gracias verificar el pago contra Stripe y
      // dejar que el comprador CREE su contraseña ahí mismo y entre, sin correo
      // (ver /api/claim-account). Si falta el session_id, /gracias cae al flujo
      // de "enviarme mi acceso" por correo.
      success_url: `${origin}/gracias/${lang === 'en' ? 'en/' : ''}?session_id={CHECKOUT_SESSION_ID}`,
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

// Página de «puertas cerradas» del checkout. Es un callejón sin salida (nadie va a
// pagar hoy), así que al menos deja dos puertas abiertas: volver a la carta y el
// alta al newsletter, que es como se entera de la reapertura quien llegó tarde.
function closedResponse(lang: 'es' | 'en', origin: string): Response {
  const back = `${origin}/${lang === 'en' ? 'en/' : ''}`;
  const reopens = Date.parse(REOPENS_AT);
  const date = Number.isNaN(reopens)
    ? ''
    : new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-ES',
        { timeZone: 'Europe/Madrid', day: 'numeric', month: 'long' }).format(new Date(reopens));
  const c = lang === 'en'
    ? { title: 'The doors are closed',
        p: date
          ? `Each week of the month builds on the one before, so nobody comes in halfway through. The doors open on ${date}.`
          : 'Each week of the month builds on the one before, so nobody comes in halfway through.',
        news: 'Tell me when they open', back: 'Back to the letter' }
    : { title: 'Las puertas están cerradas',
        p: date
          ? `Cada semana del mes se apoya en la anterior, por eso nadie entra a mitad de camino. Las puertas abren el ${date}.`
          : 'Cada semana del mes se apoya en la anterior, por eso nadie entra a mitad de camino.',
        news: 'Avísame cuando abran', back: 'Volver a la carta' };
  const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(c.title)}</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center;
         background: #faf7f1; color: #17140f; padding: 40px 24px;
         font-family: Georgia, 'Times New Roman', serif; line-height: 1.66; }
  main { max-width: 520px; text-align: center; }
  h1 { font-size: clamp(1.6rem, 5vw, 2.2rem); line-height: 1.15; margin: 0 0 0.6em; font-weight: 600; }
  p { margin: 0 0 1.6em; }
  a.btn { display: inline-flex; align-items: center; gap: 10px; text-decoration: none;
          color: #17140f; border: 1.5px solid currentColor; padding: 16px 34px;
          font-family: system-ui, sans-serif; font-size: 0.86rem; font-weight: 600;
          letter-spacing: 0.16em; text-transform: uppercase; }
  a.back { display: block; margin-top: 22px; color: #6f6a61; font-size: 0.9rem; }
</style></head><body><main>
  <h1>${esc(c.title)}</h1>
  <p>${esc(c.p)}</p>
  <a class="btn" href="${esc(NEWSLETTER_URL)}" target="_blank" rel="noopener">${esc(c.news)} →</a>
  <a class="back" href="${esc(back)}">${esc(c.back)}</a>
</main></body></html>`;
  return new Response(html, { status: 403, headers: { 'content-type': 'text/html; charset=utf-8' } });
}
