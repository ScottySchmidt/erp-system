import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://uasshkfuiyslfhaaddrb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhc3Noa2Z1aXlzbGZoYWFkZHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDc1MDIsImV4cCI6MjA4NjkyMzUwMn0.8W6xIYwIz1U2_BlNNWIG200qAF4pjX97j6Yi-4njYh4';

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
  supabase.close();
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

