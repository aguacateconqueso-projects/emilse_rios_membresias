import type { APIRoute } from 'astro';
import { siteOrigin } from '../../lib/stripe';
import { sendAccessEmail } from '../../lib/welcome-email';

// POST /api/send-access-email  { email, lang } — envía el correo de acceso
// (crear/restablecer contraseña) por el mismo camino que el correo automático
// de bienvenida (Resend + copy bilingüe de Emi, con respaldo de Supabase).
// Lo usan /entrar → «Crea o restablece tu contraseña» y /gracias → «Enviarme
// mi acceso»: antes llamaban a resetPasswordForEmail directo desde el
// navegador, que SIEMPRE manda la plantilla nativa de Supabase (nunca pasa por
// Resend). Por privacidad, responde igual exista o no el correo.
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: any = {};
  try { body = await request.json(); } catch { /* body vacío o inválido: se ignora */ }
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const lang = body?.lang === 'en' ? 'en' : 'es';

  if (email) {
    const origin = siteOrigin(request);
    await sendAccessEmail(email, lang, origin);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
