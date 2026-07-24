import type { APIRoute } from 'astro';
import { siteOrigin } from '../../lib/stripe';
import { sendAccessCode } from '../../lib/welcome-email';

// POST /api/send-access-code  { email, lang } — envía un CÓDIGO de un solo uso
// al correo, con el copy de Emi por Resend. Lo usa /entrar → «Es mi
// primera vez»: el miembro teclea el código en la MISMA pantalla (sin ir a otra
// página) junto con su contraseña, que se fija tras verificar el código con
// supabase.auth.verifyOtp({ type: 'recovery' }).
// Por privacidad responde igual exista o no el correo (no revela membresía).
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: any = {};
  try { body = await request.json(); } catch { /* body vacío/ inválido */ }
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const lang = body?.lang === 'en' ? 'en' : 'es';

  if (email) {
    const origin = siteOrigin(request);
    await sendAccessCode(email, lang, origin);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
