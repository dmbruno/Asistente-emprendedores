import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  cookieStore.delete('admin_session');

  const origin = new URL(request.url).origin;
  return NextResponse.redirect(new URL('/login', origin), { status: 302 });
}
