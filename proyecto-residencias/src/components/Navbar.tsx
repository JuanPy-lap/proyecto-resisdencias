'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Camera, Home, LogOut, Map, QrCode, Truck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUsuario } from '@/lib/hooks';

// El inventario no va en el menú: se llena desde la fase de Ingreso de cada unidad.
const items = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/unidades', label: 'Unidades', icon: Truck },
  { href: '/fotos', label: 'Fotos', icon: Camera },
  { href: '/qr-supervision', label: 'QR', icon: QrCode },
  { href: '/mapa-taller', label: 'Mapa', icon: Map },
];

function esActivo(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const usuario = useUsuario();

  if (pathname.startsWith('/login')) return null;

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  };

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-slate-950 text-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20">
              <Truck className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-black tracking-wide">NGR TALLER</span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Expediente digital</span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {items.map(({ href, label, icon: Icon }) => {
              const activo = esActivo(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    activo ? 'bg-white/10 text-amber-400' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            {usuario?.email && (
              <span className="hidden max-w-[180px] truncate text-xs text-slate-400 lg:block" title={usuario.email}>
                {usuario.email}
              </span>
            )}
            <button
              onClick={cerrarSesion}
              title="Cerrar sesión"
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Barra inferior para celular: los operadores capturan desde el patio */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {items.map(({ href, label, icon: Icon }) => {
            const activo = esActivo(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold ${
                  activo ? 'text-amber-600' : 'text-slate-500'
                }`}
              >
                <Icon className={`h-5 w-5 ${activo ? 'stroke-[2.5]' : ''}`} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
