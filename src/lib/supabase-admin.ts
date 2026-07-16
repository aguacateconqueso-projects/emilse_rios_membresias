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
