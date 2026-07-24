import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Clientes de Supabase para el SERVIDOR (endpoints de Stripe). Nunca importar
// desde el navegador: la service_role omite RLS.
const url = process.env.PUBLIC_SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.PUBLIC_SUPABASE_ANON_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Cliente con service_role: escribe en `subscriptions` desde el webhook y puede
// crear usuarios (alta passwordless al pagar). Devuelve null si falta config.
export function supabaseAdmin(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Correo de bienvenida / crear contraseña: dispara el mismo correo de un solo uso
// que /entrar (resetPasswordForEmail), apuntando a /nueva-clave/. Es el CAMINO DE
// RESPALDO (plantilla única de Supabase): se usa si no está configurado Resend.
// Usa el flujo público (anon). No lanza: devuelve { error } si falla.
export async function sendPasswordSetupEmail(email: string, redirectTo: string) {
  if (!url || !anonKey) return { error: new Error('Supabase no configurado (falta anon key)') };
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client.auth.resetPasswordForEmail(email, { redirectTo });
}

// Genera (SIN enviar correo) el enlace de un solo uso para crear/restablecer la
// contraseña, apuntando a `redirectTo`. Lo usa el webhook para meterlo en el
// correo de bienvenida bilingüe que enviamos por Resend (así el correo llega en
// el idioma en el que pagó, con el copy de Emi). Devuelve { link, error }.
export async function generatePasswordSetupLink(email: string, redirectTo: string) {
  if (!url || !serviceKey) return { link: null, error: new Error('Supabase (service role) no configurado') };
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  });
  if (error) return { link: null, error };
  const link = (data as any)?.properties?.action_link || null;
  return { link, error: link ? null : new Error('generateLink no devolvió action_link') };
}

// Busca el perfil por correo; si no existe, crea el usuario (sin contraseña; el
// trigger de la BD crea el profile) y lo marca como recién creado (para disparar
// el correo de bienvenida en el webhook). Así, al pagar, la cuenta ya existe y el
// comprador solo tiene que crear su contraseña. Compartido entre el webhook de
// Stripe y /api/claim-account (contraseña al pagar), para que ambos caminos den
// de alta la cuenta con EXACTAMENTE el mismo criterio.
export async function findOrCreateUser(
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
    console.error('[supabase-admin] no se pudo crear/encontrar usuario para', lower, error.message);
  }
  return { userId: null, created: false };
}

// Genera (SIN enviar correo) el CÓDIGO de un solo uso (6 dígitos, `email_otp`) para
// crear/restablecer la contraseña. Mismo mecanismo que generatePasswordSetupLink,
// pero devuelve el código en vez del enlace: lo usa el flujo "primera vez en la
// misma pantalla" de /entrar — el miembro teclea el código sin salir de la página
// y luego lo verifica con supabase.auth.verifyOtp({ type: 'recovery' }). El correo
// con el código lo mandamos por Resend con el copy de Emi. `generateLink` falla si
// la cuenta no existe (nunca pagó) → devolvemos { code: null } y no se envía nada
// (el endpoint responde igual por privacidad). Devuelve { code, error }.
export async function generatePasswordSetupOtp(email: string, redirectTo: string) {
  if (!url || !serviceKey) return { code: null as string | null, error: new Error('Supabase (service role) no configurado') };
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  });
  if (error) return { code: null as string | null, error };
  const code = (data as any)?.properties?.email_otp || null;
  return { code, error: code ? null : new Error('generateLink no devolvió email_otp') };
}

// Valida el token de Supabase que manda el navegador (Authorization: Bearer …)
// y devuelve el usuario. Se usa en /api/portal (miembro autenticado en el aula).
export async function getUserFromRequest(request: Request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token || !url || !anonKey) return null;
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error) return null;
  return data.user ?? null;
}
