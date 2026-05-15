import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

function createMockClient(): SupabaseClient {
  return {
    from: (_table: string) => ({
      insert: async (data: unknown) => {
        console.info("[mock-waitlist] insert →", data);
        return { error: null };
      },
    }),
  } as unknown as SupabaseClient;
}

export function getSupabase(): SupabaseClient {
  if (process.env.NEXT_PUBLIC_MOCK_WAITLIST === "true") return createMockClient();
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase URL/ANON KEY no configurados (.env.local)");
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}
