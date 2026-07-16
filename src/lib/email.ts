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
// replyTo es opcional: útil cuando el remitente técnico (dominio verificado en
// Resend) no es el buzón real de Emi — así, si alguien responde el correo, le
// llega a su bandeja de verdad en vez de a un remitente que nadie revisa.
export async function sendEmail(opts: { to: string; subject: string; html: string; text: string; replyTo?: string }) {
  if (!RESEND_API_KEY) return { error: new Error('RESEND_API_KEY no configurada') };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
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

// El buzón real de Emi (info@emilserios.com) NO está verificado en Resend, así
// que no puede ser el remitente técnico (ver docs/PROGRESO.md). Va como
// reply-to: si alguien responde este correo, le llega directo a Emi.
export const WELCOME_REPLY_TO = 'info@emilserios.com';

// -----------------------------------------------------------------------------
// Correo de bienvenida (crear contraseña). Copy DEFINITIVO de Emi (ES/EN).
// El texto visible del enlace es literalmente el que pidió Emi
// (emilseriosacademy.com/entrar/), pero el href real es el enlace seguro de un
// solo uso (`link`) que crea la contraseña (→ /nueva-clave/ o /nueva-clave/en/)
// — es "donde creas tu usuario y contraseña", tal como dice el copy. Formato
// carta (sin botón corporativo), paleta de la carta: crema + tinta cálida.
// -----------------------------------------------------------------------------
export function welcomeEmailContent(lang: 'es' | 'en', link: string): { subject: string; html: string; text: string } {
  const isEN = lang === 'en';
  const t = isEN
    ? {
        subject: 'Your access to the membership',
        preheader: 'Save this email — your key lives here.',
        linkLabel: 'https://www.emilseriosacademy.com/entrar/',
        p: [
          'Welcome.',
          'This is your link to the platform:',
        ],
        p2: 'There you create your username and password. That access is personal — keep it safe, like your bass.',
        p3: 'Every Thursday a new exercise is waiting for you.',
        p4: 'But you can enter any time: to review the exercise, watch the core concept of the month, or leave me your questions in the chat. I answer them personally.',
        p5: 'See you inside.',
        sign: 'Emilse',
        ps1: 'PS: If something doesn’t work or you have any question, write to info@emilserios.com and it comes straight to me.',
        ps2: 'PS2: A gift is waiting for you on the platform. A bonus I recorded so you can get more out of each exercise. I hope you enjoy it.',
      }
    : {
        subject: 'Tu acceso a la membresía',
        preheader: 'Guarda este correo — aquí vive tu entrada.',
        linkLabel: 'https://www.emilseriosacademy.com/entrar/',
        p: [
          'Bienvenido/a.',
          'Este es tu link de acceso a la plataforma:',
        ],
        p2: 'Ahí creas tu usuario y contraseña. Ese acceso es personal, cuídalo como tu contrabajo.',
        p3: 'Cada jueves te espera el ejercicio nuevo.',
        p4: 'Pero puedes entrar cuando quieras: para repasar el ejercicio, ver el concepto base del mes o dejarme tus preguntas en el chat. Las respondo personalmente.',
        p5: 'Nos vemos dentro.',
        sign: 'Emilse',
        ps1: 'PD: Si algo no funciona o tienes cualquier duda, escribe a info@emilserios.com y me llega directo a mí.',
        ps2: 'PD2: En la plataforma te espera un regalo. Un bonus que grabé para que le saques más jugo a cada ejercicio. Espero que lo disfrutes.',
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
          <p style="margin:0 0 28px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;font-size:12px;color:#6f6a61;">Emilse Rios · ${isEN ? 'Membership' : 'Membresía'}</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#17140f;">${t.p[0]}</p>
          <p style="margin:0 0 8px;font-size:16px;line-height:1.6;color:#17140f;">${t.p[1]}</p>
          <p style="margin:0 0 20px;font-size:16px;line-height:1.5;"><a href="${link}" style="color:#a94f2b;text-decoration:underline;">${t.linkLabel}</a></p>
          <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#17140f;">${t.p2}</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#17140f;">${t.p3}</p>
          <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#17140f;">${t.p4}</p>
          <p style="margin:0 0 4px;font-size:16px;line-height:1.6;color:#17140f;">${t.p5}</p>
          <p style="margin:0 0 28px;font-size:16px;line-height:1.6;font-style:italic;color:#17140f;">${t.sign}</p>
          <p style="margin:0 0 8px;font-size:13px;line-height:1.55;color:#6f6a61;font-style:italic;">${t.ps1}</p>
          <p style="margin:0;font-size:13px;line-height:1.55;color:#6f6a61;font-style:italic;">${t.ps2}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `${t.p[0]}
${t.p[1]}
${link}

${t.p2}

${t.p3}
${t.p4}

${t.p5}
${t.sign}

${t.ps1}
${t.ps2}`;

  return { subject: t.subject, html, text };
}
