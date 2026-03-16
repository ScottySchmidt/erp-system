import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://ihdngvgfympjiepwzgqn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZG5ndmdmeW1wamllcHd6Z3FuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMjE2NjgsImV4cCI6MjA4ODU5NzY2OH0.xj0GS_BG3J8VWGnGV04z8MS_JsQ9P-wdblQfCSHE4JE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  return { data, error };
}

export async function signOut() {
  await supabase.auth.signOut();
}

export function subscribeToTable(table, callback) {
  return supabase
    .channel('realtime')
    .on('postgres_changes',
      { event: '*', schema: 'public', table },
      callback
    )
    .subscribe();
}

export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
}

