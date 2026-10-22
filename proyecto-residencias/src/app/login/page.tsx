'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, ClipboardList, Eye, EyeOff, Loader2, Lock, Mail, QrCode, ShieldAlert, Truck } from 'lucide-react';
import { supabase, supabaseConfigurado } from '@/lib/supabase';
import { AvisoConfiguracion, claseInput } from '@/components/ui';

const MENSAJES_AUTH: Record<string, string> = {
  'Invalid login credentials': 'Correo o contraseña incorrectos.',
  'Email not confirmed': 'Tu correo aún no está confirmado. Revisa tu bandeja de entrada.',
};

const beneficios = [
  { icon: Camera, texto: 'Evidencia fotográfica por etapa, comprimida y en la nube' },
  { icon: ClipboardList, texto: 'Inventario de ingreso con diagrama de daños' },
  { icon: QrCode, texto: 'Control de etiquetas QR antes de liberar cada unidad' },
];

function FormularioLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  // Solo rutas internas, para no permitir redirecciones a otros sitios.
  const siguiente = params.get('next');
  const destino = siguiente && siguiente.startsWith('/') && !siguiente.startsWith('//') ? siguiente : '/';

  const handleLogin = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setCargando(true);

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

    if (error) {
      setErrorMsg(MENSAJES_AUTH[error.message] ?? 'No se pudo iniciar sesión. Verifica tu conexión e inténtalo de nuevo.');
      setCargando(false);
      return;
    }

    router.replace(destino);
    router.refresh();
  };

  return (
    <form onSubmit={handleLogin} className="space-y-5">
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-slate-700">Correo electrónico</span>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@corporativongr.com"
            className={`${claseInput} py-3 pl-11`}
          />
        </div>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-slate-700">Contraseña</span>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type={verPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={`${claseInput} py-3 pl-11 pr-11`}
          />
          <button
            type="button"
            onClick={() => setVerPassword((v) => !v)}
            aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
          >
            {verPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </label>

      <button
        type="submit"
        disabled={cargando || !supabaseConfigurado}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 active:scale-[0.99] disabled:opacity-50"
      >
        {cargando && <Loader2 className="h-5 w-5 animate-spin" />}
        {cargando ? 'Verificando…' : 'Iniciar sesión'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panel de marca */}
      <div className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-500 text-slate-950">
            <Truck className="h-6 w-6" />
          </span>
          <span className="text-lg font-black tracking-wide">NGR TALLER</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-4xl font-black leading-tight tracking-tight">
            El expediente completo de cada tractocamión, <span className="text-amber-400">desde que entra hasta que sale.</span>
          </h2>
          <ul className="mt-8 space-y-4">
            {beneficios.map(({ icon: Icon, texto }) => (
              <li key={texto} className="flex items-center gap-3 text-slate-300">
                <span className="rounded-lg bg-white/10 p-2 text-amber-400">
                  <Icon className="h-5 w-5" />
                </span>
                {texto}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">Sistema auxiliar de gestión documental y fotográfica</p>
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-sm space-y-8">
          <div>
            <span className="mb-6 grid h-12 w-12 place-items-center rounded-xl bg-amber-500 text-slate-950 lg:hidden">
              <Truck className="h-6 w-6" />
            </span>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Bienvenido</h1>
            <p className="mt-2 text-sm text-slate-500">Ingresa con la cuenta que te asignó el administrador del taller.</p>
          </div>

          <AvisoConfiguracion />

          <Suspense>
            <FormularioLogin />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
