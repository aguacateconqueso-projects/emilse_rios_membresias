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
    .select('id, email, full_name, level, preferred_lang, role')
    .eq('id', user.id)
    .single();
  return data;
}

export async function sendMagicLink(email: string, redirectTo: string) {
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
}

export async function signOut() {
  await supabase.auth.signOut();
}
