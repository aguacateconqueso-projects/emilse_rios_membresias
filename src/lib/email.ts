// Envío de correos transaccionales por la API de Resend (el dominio
// emilseriosacademy.com ya está verificado en Resend). Se usa para el correo de
// bienvenida bilingüe (ES/EN) tras el pago. Si falta RESEND_API_KEY, el llamador
// (webhook) cae al correo estándar de Supabase, así que esto es opcional pero
// necesario para que el correo llegue en el idioma correcto y con el copy de Emi.
const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Remitente: debe ser del dominio verificado en Resend.
const RESEND_FROM = process.env.RESEND_FROM || 'Emilse Rios <info@emilseriosacademy.com>';

export const isResendConfigured = Boolean(RESEND_API_KEY);

// Envía un correo por Resend. No lanza: devuelve { error } si algo falla.
export async function sendEmail(opts: { to: string; subject: string; html: string; text: string }) {
  if (!RESEND_API_KEY) return { error: new Error('RESEND_API_KEY no configurada') };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: RESEND_FROM, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { error: new Error(`Resend HTTP ${res.status}: ${detail}`) };
    }
    return { error: null as Error | null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

// -----------------------------------------------------------------------------
// Correo de bienvenida (crear contraseña). Copy PROVISIONAL en la voz de Emi —
// se reemplaza por el texto definitivo que pase Emi. El botón lleva al enlace de
// un solo uso (`link`) que abre /nueva-clave/ (o /nueva-clave/en/) para fijar la
// contraseña. Paleta de la carta: crema + tinta cálida + terracota.
// -----------------------------------------------------------------------------
export function welcomeEmailContent(lang: 'es' | 'en', link: string): { subject: string; html: string; text: string } {
  const isEN = lang === 'en';
  const t = isEN
    ? {
        subject: 'Welcome to Let’s Study Together — create your password',
        preheader: 'Your payment is confirmed. Create your password to enter the classroom.',
        hi: 'Welcome!',
        p1: 'Your payment is confirmed — you’re in. I’m so happy to study together.',
        p2: 'To enter the classroom, create your password with the button below. You’ll use it to log in from now on.',
        cta: 'Create my password',
        p3: 'The button opens a secure, one-time link. If it expires, you can request a new one from the “Log in” page (“Create or reset your password”).',
        p4: 'If you didn’t make this purchase, you can ignore this email.',
        sign: '— Emilse',
        fallback: 'If the button doesn’t work, copy and paste this link into your browser:',
      }
    : {
        subject: 'Bienvenida/o a Estudiemos Juntos — crea tu contraseña',
        preheader: 'Tu pago está confirmado. Crea tu contraseña para entrar al aula.',
        hi: '¡Te damos la bienvenida!',
        p1: 'Tu pago está confirmado — ya estás dentro. Me hace muy feliz estudiar juntos.',
        p2: 'Para entrar al aula, crea tu contraseña con el botón de abajo. La usarás para entrar de ahora en adelante.',
        cta: 'Crear mi contraseña',
        p3: 'El botón abre un enlace seguro de un solo uso. Si caduca, puedes pedir uno nuevo desde la página de «Entrar» («Crea o restablece tu contraseña»).',
        p4: 'Si no hiciste esta compra, puedes ignorar este correo.',
        sign: '— Emilse',
        fallback: 'Si el botón no funciona, copia y pega este enlace en tu navegador:',
      };

  const html = `<!DOCTYPE html>
<html lang="${isEN ? 'en' : 'es'}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;background:#faf7f1;color:#17140f;font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${t.preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f1;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fffdf8;border:1px solid #e7e0d4;border-radius:8px;">
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 24px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;font-size:12px;color:#6f6a61;">Emilse Rios · ${isEN ? 'Membership' : 'Membresía'}</p>
          <h1 style="margin:0 0 16px;font-size:26px;line-height:1.15;font-weight:700;color:#17140f;">${t.hi}</h1>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#17140f;">${t.p1}</p>
          <p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:#17140f;">${t.p2}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px;"><tr><td>
            <a href="${link}" style="display:inline-block;background:#17140f;color:#faf7f1;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.06em;text-transform:uppercase;padding:15px 30px;border-radius:0;">${t.cta}</a>
          </td></tr></table>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#6f6a61;">${t.p3}</p>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#6f6a61;">${t.p4}</p>
          <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:#6f6a61;">${t.fallback}</p>
          <p style="margin:0 0 24px;font-size:12px;line-height:1.5;word-break:break-all;"><a href="${link}" style="color:#a94f2b;">${link}</a></p>
          <p style="margin:0;font-size:16px;font-style:italic;color:#17140f;">${t.sign}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `${t.hi}

${t.p1}

${t.p2}

${t.cta}: ${link}

${t.p3}
${t.p4}

${t.sign}`;

  return { subject: t.subject, html, text };
}
