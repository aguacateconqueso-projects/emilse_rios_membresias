import { sendPasswordSetupEmail, generatePasswordSetupLink } from './supabase-admin';
import { isResendConfigured, sendEmail, welcomeEmailContent, WELCOME_REPLY_TO } from './email';

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
