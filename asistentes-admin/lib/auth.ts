import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export function requireAuth(): void {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('admin_session');
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret || !sessionCookie || sessionCookie.value !== adminSecret) {
    redirect('/login');
  }
}
