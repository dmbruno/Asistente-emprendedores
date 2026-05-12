"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const DEV_SESSION = {
  access_token: "dev-token-local",
  token_type: "bearer" as const,
  expires_in: 86400,
  refresh_token: "dev-refresh",
  user: {
    id: "00000000-0000-0000-0000-000000000001",
    email: "dev@test.local",
    role: "authenticated",
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
    app_metadata: {},
    user_metadata: {},
  },
};

function createMockClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session: DEV_SESSION }, error: null }),
      getUser: async () => ({ data: { user: DEV_SESSION.user }, error: null }),
      signInWithOtp: async (_: unknown) => ({ data: {}, error: null }),
      signOut: async () => ({ error: null }),
    },
  } as unknown as ReturnType<typeof createClientComponentClient>;
}

export function getBrowserSupabase() {
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === "true") return createMockClient();
  return createClientComponentClient();
}
