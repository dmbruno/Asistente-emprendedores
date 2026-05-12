import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

async function login(formData: FormData) {
  'use server';

  const password = formData.get('password') as string;
  const adminSecret = process.env.ADMIN_SECRET;

  if (!password || !adminSecret || password !== adminSecret) {
    redirect('/login?error=1');
  }

  const cookieStore = cookies();
  cookieStore.set('admin_session', adminSecret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });

  redirect('/overview');
}

interface LoginPageProps {
  searchParams: { error?: string; from?: string };
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const hasError = searchParams.error === '1';

  return (
    <div className="min-h-screen bg-grid flex items-center justify-center p-4">
      <style>{`
        .password-input {
          background-color: var(--admin-bg);
          border: 1px solid var(--admin-border);
          color: var(--admin-text);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .password-input::placeholder {
          color: var(--admin-dim);
        }
        .password-input:focus {
          border-color: var(--admin-accent);
          box-shadow: 0 0 0 2px var(--admin-accent-dim);
        }
      `}</style>

      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'var(--admin-accent)' }}
          >
            <span className="font-mono text-black text-xl font-bold">P</span>
          </div>
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--admin-text)' }}>
              PropioIA
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--admin-muted)' }}>
              Control Panel
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 space-y-5"
          style={{
            backgroundColor: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold" style={{ color: 'var(--admin-text)' }}>
              Acceso de administrador
            </h2>
            <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>
              Ingresa tu contraseña para continuar.
            </p>
          </div>

          <form action={login} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs uppercase tracking-widest"
                style={{ color: 'var(--admin-muted)' }}
              >
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                autoFocus
                placeholder="••••••••••••"
                className="password-input w-full rounded-xl px-4 py-3 text-sm font-mono"
              />
            </div>

            {hasError && (
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs"
                style={{
                  color: 'var(--admin-danger)',
                  backgroundColor: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}
              >
                <svg
                  className="w-3.5 h-3.5 flex-shrink-0"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <circle cx="8" cy="8" r="7" />
                  <path d="M8 5v3M8 11h.01" strokeLinecap="round" />
                </svg>
                Contraseña incorrecta. Intentá de nuevo.
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-xl py-3 text-sm font-semibold text-black transition-all hover:brightness-110 active:scale-[0.99]"
              style={{ backgroundColor: 'var(--admin-accent)' }}
            >
              Ingresar al panel
            </button>
          </form>
        </div>

        <p className="text-center text-xs" style={{ color: 'var(--admin-dim)' }}>
          Acceso restringido · Solo administradores
        </p>
      </div>
    </div>
  );
}
