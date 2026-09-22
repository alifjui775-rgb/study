import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be provided in .env.local");
}

// Current SSO user's UUID. Injected as the `x-user-id` header on every
// request so database triggers can capture the actor without auth.uid()
// (which is null under our custom SSO).
let currentUserId: string | null = null;

/** Update the `x-user-id` header attached to all Supabase requests. */
export const setSupabaseUserHeader = (userId: string | null) => {
  currentUserId = userId;
};

const supabaseFetch: typeof fetch = (input, init) => {
  const existing = init?.headers ?? (input instanceof Request ? input.headers : undefined);
  const headers = new Headers(existing);

  if (currentUserId) {
    headers.set("x-user-id", currentUserId);
  } else {
    headers.delete("x-user-id");
  }

  return fetch(input, { ...init, headers });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: supabaseFetch,
  },
});
