import { getBrowserSupabase } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export async function downloadCSV(
  params: string = "",
  filename: string = "facturas.csv",
): Promise<"ok" | "upgrade" | "error"> {
  try {
    const supabase = getBrowserSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
    const res = await fetch(`${API_URL}/api/v1/facturas/export/csv${params}`, {
      headers,
    });
    if (res.status === 402) return "upgrade";
    if (!res.ok) return "error";
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return "ok";
  } catch {
    return "error";
  }
}
