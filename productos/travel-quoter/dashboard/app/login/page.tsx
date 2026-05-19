"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();

    if (mode === "login") {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        setError(
          err.message === "Invalid login credentials"
            ? "Email o contraseña incorrectos."
            : err.message
        );
      } else {
        window.location.href = "/dashboard";
      }
    } else {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        },
      });
      if (err) {
        setError(err.message);
      } else {
        setRegistered(true);
      }
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b0f0b]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/>
            </svg>
          </span>
          <div>
            <span className="font-display text-base font-bold text-slate-900">
              Propio<span className="text-verde-600">IA</span>
            </span>
            <p className="text-xs text-slate-400 leading-none">Travel Quoter</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          {registered ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-verde-50">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <h2 className="font-display text-lg font-bold text-slate-900">Confirmá tu email</h2>
              <p className="mt-2 text-sm text-slate-500">
                Te mandamos un link a <strong>{email}</strong>. Hacé click para activar tu cuenta.
              </p>
              <button
                onClick={() => { setRegistered(false); setMode("login"); }}
                className="mt-5 text-sm text-verde-600 hover:underline"
              >
                Ya confirmé, quiero entrar
              </button>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="mb-6 flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(""); }}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                    mode === "login"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Ingresar
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("register"); setError(""); }}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                    mode === "register"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Crear cuenta
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vos@ejemplo.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-verde-400 focus:outline-none focus:ring-2 focus:ring-verde-400/20 transition-all"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Contraseña</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "register" ? "Mínimo 6 caracteres" : "••••••••"}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-verde-400 focus:outline-none focus:ring-2 focus:ring-verde-400/20 transition-all"
                  />
                </div>

                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-verde-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-verde-500 disabled:opacity-60"
                >
                  {loading
                    ? mode === "login" ? "Ingresando..." : "Creando cuenta..."
                    : mode === "login" ? "Ingresar" : "Crear cuenta"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          ¿Problema para entrar?{" "}
          <a href="mailto:hola@propioia.com" className="text-verde-600 hover:underline">
            Contactanos
          </a>
        </p>
      </div>
    </div>
  );
}
