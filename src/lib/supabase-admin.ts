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
