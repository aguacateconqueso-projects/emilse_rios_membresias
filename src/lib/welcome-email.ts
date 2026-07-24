import { sendPasswordSetupEmail, generatePasswordSetupLink, generatePasswordSetupOtp } from './supabase-admin';
import { isResendConfigured, sendEmail, welcomeEmailContent, accessCodeEmailContent, WELCOME_REPLY_TO } from './email';

// Correo de acceso (crear/restablecer contraseña), en el idioma pedido. Camino
// preferido: Resend con el copy bilingüe de Emi (mismo que el correo automático
// de bienvenida). Si Resend no está configurado o falla, cae al correo estándar
// de Supabase (misma URL de destino por idioma). Comparten esta función:
// - el webhook de Stripe (alta nueva al pagar)
// - /entrar → «Crea o restablece tu contraseña»
// - /gracias → «Enviarme mi acceso»
// para que las tres vías manden EL MISMO correo, no solo la automática.
// No lanza y no revela si el correo existe (mismo comportamiento de privacidad
// que resetPasswordForEmail de Supabase).
export async function sendAccessEmail(email: string, lang: 'es' | 'en', origin: string) {
  const base = origin.replace(/\/+$/, '');
  const lower = email.trim().toLowerCase();
  const redirectTo = `${base}${lang === 'en' ? '/nueva-clave/en/' : '/nueva-clave/'}`;

  if (isResendConfigured) {
    const { link, error: linkErr } = await generatePasswordSetupLink(lower, redirectTo);
    if (link) {
      const { subject, html, text } = welcomeEmailContent(lang, link);
      const { error: mailErr } = await sendEmail({ to: lower, subject, html, text, replyTo: WELCOME_REPLY_TO });
      if (!mailErr) return; // enviado por Resend en el idioma correcto
      console.error('[welcome-email] Resend falló, uso Supabase:', mailErr.message || mailErr);
    } else {
      console.error('[welcome-email] no se pudo generar el enlace, uso Supabase:', linkErr?.message || linkErr);
    }
  }

  // Respaldo: correo estándar de Supabase (misma URL de destino por idioma).
  const { error } = await sendPasswordSetupEmail(lower, redirectTo);
  if (error) console.error('[welcome-email] no se pudo enviar el correo a', lower, error.message || error);
}

// Correo con CÓDIGO de acceso (flujo "primera vez en la misma pantalla" de /entrar).
// Genera el código de un solo uso (email_otp) y lo manda por Resend con el copy de
// Emi. Requiere Resend (sin él no podemos mandar el código con nuestro copy) y que
// la cuenta exista (creada al pagar). No lanza y no revela si el correo existe: el
// endpoint responde igual pase lo que pase. Devuelve { ok } solo para el log.
export async function sendAccessCode(email: string, lang: 'es' | 'en', origin: string): Promise<{ ok: boolean }> {
  const base = origin.replace(/\/+$/, '');
  const lower = email.trim().toLowerCase();
  // redirectTo es obligatorio para generateLink aunque solo usemos el código.
  const redirectTo = `${base}${lang === 'en' ? '/entrar/en/' : '/entrar/'}`;

  if (!isResendConfigured) {
    console.error('[access-code] Resend no configurado: no se puede enviar el código con el copy de Emi');
    return { ok: false };
  }
  const { code, error: otpErr } = await generatePasswordSetupOtp(lower, redirectTo);
  if (!code) {
    // Cuenta inexistente (nunca pagó) o error al generar: no enviamos nada.
    console.error('[access-code] sin código para', lower, otpErr?.message || otpErr);
    return { ok: false };
  }
  const { subject, html, text } = accessCodeEmailContent(lang, code);
  const { error: mailErr } = await sendEmail({ to: lower, subject, html, text, replyTo: WELCOME_REPLY_TO });
  if (mailErr) {
    console.error('[access-code] Resend falló al enviar el código a', lower, mailErr.message || mailErr);
    return { ok: false };
  }
  return { ok: true };
}
