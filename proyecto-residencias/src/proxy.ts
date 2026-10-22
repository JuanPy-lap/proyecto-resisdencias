import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/supabase';

// Proxy (antes "middleware" en Next.js <16): se ejecuta antes de cada página.
// 1) Refresca la sesión de Supabase guardada en cookies.
// 2) Redirige a /login a quien no haya iniciado sesión, y fuera de /login a quien sí.
// Es una verificación "optimista": la seguridad real de los datos la dan las
// políticas RLS de Supabase (ver supabase/schema.sql).

const RUTAS_PUBLICAS = ['/login'];

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sin configuración no hay sesión que validar: las páginas muestran el aviso.
  if (!url || !anonKey) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() valida el token con Supabase (getSession() solo lee la cookie).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const esPublica = RUTAS_PUBLICAS.some((ruta) => pathname.startsWith(ruta));

  if (!user && !esPublica) {
    const destino = request.nextUrl.clone();
    destino.pathname = '/login';
    destino.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(destino);
  }

  if (user && esPublica) {
    const destino = request.nextUrl.clone();
    destino.pathname = '/';
    destino.search = '';
    return NextResponse.redirect(destino);
  }

  return response;
}

export const config = {
  // Todo excepto archivos estáticos e imágenes.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
