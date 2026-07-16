import { supabase } from './supabase';

export async function getSessionUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}

export async function getProfile() {
  const user = await getSessionUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name, preferred_lang, role')
    .eq('id', user.id)
    .single();
  return data;
}

// El acceso es con correo + contraseña (se eliminó el enlace mágico).
export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

// Envía el correo con el enlace de un solo uso para crear/restablecer la
// contraseña (redirige a /nueva-clave/). Sirve tanto para la primera vez (cuenta
// creada al pagar, sin clave) como para recuperar el acceso.
export async function sendPasswordSetup(email: string, redirectTo: string) {
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}

export async function signOut() {
  await supabase.auth.signOut();
}
