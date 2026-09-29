import Link from 'next/link';
import { Camera, ClipboardList, Home, Map, ShieldCheck } from 'lucide-react';

const items = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/camara', label: 'Cámara', icon: Camera },
  { href: '/inventario', label: 'Inventario', icon: ClipboardList },
  { href: '/qr-supervision', label: 'QR', icon: ShieldCheck },
  { href: '/mapa-taller', label: 'Mapa', icon: Map },
];

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900 text-white shadow-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="font-mono text-lg font-bold tracking-wider text-blue-400">
          SISTEMA NGR - AUX
        </Link>

        <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/60 px-3 py-2 transition hover:border-blue-500 hover:text-blue-300"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
