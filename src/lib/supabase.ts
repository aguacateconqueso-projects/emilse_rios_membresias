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

// --- "Mantener sesión iniciada" ---------------------------------------------
// El acceso es con correo + contraseña. La casilla "mantener sesión iniciada" de
// /entrar/ decide DÓNDE se guarda la sesión:
//   · recordar (por defecto) → localStorage: sobrevive al cerrar el navegador.
//   · no recordar            → sessionStorage: se borra al cerrar la pestaña/navegador.
// /entrar/ escribe la preferencia en `erm_remember` ('0' = no recordar) ANTES de
// iniciar sesión, para que el token quede en el almacén correcto. Este adaptador
// lee esa preferencia en cada acceso; al cerrar sesión limpia AMBOS almacenes.
const REMEMBER_KEY = 'erm_remember';
function pickStore(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(REMEMBER_KEY) === '0' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}
const rememberAwareStorage = {
  getItem: (k: string) => { try { return pickStore()?.getItem(k) ?? null; } catch { return null; } },
  setItem: (k: string, v: string) => { try { pickStore()?.setItem(k, v); } catch { /* almacenamiento no disponible */ } },
  removeItem: (k: string) => {
    try { window.localStorage.removeItem(k); window.sessionStorage.removeItem(k); } catch { /* ídem */ }
  },
};

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Detecta el token del enlace de "crear/restablecer contraseña" que llega
      // en la URL (flujo de recuperación) y establece la sesión para poder fijar
      // la nueva clave en /nueva-clave/.
      detectSessionInUrl: true,
      flowType: 'implicit',
      storage: typeof window !== 'undefined' ? rememberAwareStorage : undefined,
    },
  }
);
