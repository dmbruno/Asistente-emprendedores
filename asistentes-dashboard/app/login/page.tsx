"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

const MOCK_AUTH = process.env.NEXT_PUBLIC_MOCK_AUTH === "true";

type Modo = "login" | "registro";
type Estado = "idle" | "enviando" | "ok" | "error";

export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [estado, setEstado] = useState<Estado>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (MOCK_AUTH) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm space-y-6 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="font-semibold text-slate-900">Ingresá a tu panel</div>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Modo desarrollo — Supabase no configurado
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full rounded-xl bg-verde-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-verde-500"
          >
            Entrar como dev@test.local
          </button>
        </div>
      </main>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEstado("enviando");
    setErrorMsg(null);

    const supabase = getBrowserSupabase();

    if (modo === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setEstado("error");
        setErrorMsg(
          error.message === "Invalid login credentials"
            ? "Email o contraseña incorrectos."
            : error.message
        );
      } else {
        router.push("/dashboard");
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setEstado("error");
        setErrorMsg(error.message);
      } else if (data.session) {
        // Supabase sin confirmación de email → sesión inmediata
        router.push("/dashboard");
      } else {
        setEstado("ok");
      }
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <a href="/" className="inline-flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-verde-600">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </span>
            <span className="text-lg font-bold text-slate-900">
              Propio<span className="text-verde-600">IA</span>
            </span>
          </a>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          {/* Tabs */}
          <div className="mb-6 flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => { setModo("login"); setEstado("idle"); setErrorMsg(null); }}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                modo === "login"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Ingresar
            </button>
            <button
              type="button"
              onClick={() => { setModo("registro"); setEstado("idle"); setErrorMsg(null); }}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                modo === "registro"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Crear cuenta
            </button>
          </div>

          {estado === "ok" && modo === "registro" ? (
            <div className="text-center">
              <div className="mb-3 text-4xl">📬</div>
              <h3 className="font-semibold text-slate-900">Revisá tu email</h3>
              <p className="mt-2 text-sm text-slate-500">
                Te mandamos un link para confirmar tu cuenta antes de ingresar.
              </p>
              <button
                onClick={() => { setModo("login"); setEstado("idle"); }}
                className="mt-6 text-sm font-medium text-verde-600 hover:text-verde-500"
              >
                ← Volver a ingresar
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-verde-400 focus:outline-none focus:ring-2 focus:ring-verde-400/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={modo === "registro" ? "Mínimo 6 caracteres" : "Tu contraseña"}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-verde-400 focus:outline-none focus:ring-2 focus:ring-verde-400/20"
                />
              </div>

              {errorMsg && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={estado === "enviando"}
                className="w-full rounded-xl bg-verde-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-verde-500 disabled:opacity-60"
              >
                {estado === "enviando"
                  ? "Un momento…"
                  : modo === "login"
                  ? "Ingresar"
                  : "Crear mi cuenta"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          ¿Problemas para ingresar?{" "}
          <a href="/contacto" className="font-medium text-verde-600 hover:text-verde-500">
            Contactanos
          </a>
        </p>
      </div>
    </main>
  );
}
