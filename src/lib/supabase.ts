import { createClient } from '@supabase/supabase-js';

// Cliente de Supabase para el navegador (clave pública "anon").
// La seguridad real la imponen las reglas RLS en la base de datos, no esta clave:
// la anon key está pensada para ser pública. Las operaciones privilegiadas
// (webhook de Stripe) usarán la service_role key SOLO en el servidor (paso 5).
const url = import.meta.env.PUBLIC_SUPABASE_URL;
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  // Aviso claro en consola si falta el archivo .env (createClient se inicializa
  // con un placeholder para no romper toda la página de golpe).
  console.error('[supabase] Falta el archivo .env con PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY. Crea .env en la raíz del proyecto y reinicia el servidor.');
}

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
