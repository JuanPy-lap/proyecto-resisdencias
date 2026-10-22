'use client';

import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, supabaseConfigurado } from '@/lib/supabase';

/** Usuario con sesión iniciada (null mientras carga o si no hay sesión). */
export function useUsuario() {
  const [usuario, setUsuario] = useState<User | null>(null);

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.auth.getUser().then(({ data }) => setUsuario(data.user));
    const { data } = supabase.auth.onAuthStateChange((_evento, sesion) => setUsuario(sesion?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  return usuario;
}

/** Nombre para registrar quién capturó algo (metadata `nombre` o el correo). */
export function nombreUsuario(usuario: User | null) {
  const nombre = usuario?.user_metadata?.nombre as string | undefined;
  return nombre || usuario?.email || 'Operador';
}

/**
 * Carga datos asíncronos y expone { datos, error, cargando, recargar }.
 * `cargador` se vuelve a ejecutar cuando cambia `clave` (p. ej. el id de la unidad).
 */
export function useDatos<T>(cargador: () => Promise<T>, clave = '') {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [version, setVersion] = useState(0);

  // useEffectEvent siempre ve el `cargador` más reciente sin volverlo dependencia.
  const cargar = useEffectEvent(cargador);

  useEffect(() => {
    if (!supabaseConfigurado) return;
    let vigente = true;
    cargar()
      .then((resultado) => {
        if (!vigente) return;
        setDatos(resultado);
        setError(null);
      })
      .catch((err: unknown) => {
        if (vigente) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [clave, version]);

  const recargar = useCallback(() => {
    setCargando(true);
    setVersion((v) => v + 1);
  }, []);

  return { datos, setDatos, error, cargando: supabaseConfigurado && cargando && datos === null, actualizando: cargando, recargar };
}

/** Mensaje temporal tipo "toast" que se oculta solo. */
export function useAviso(duracionMs = 4000) {
  const [aviso, setAviso] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    if (!aviso) return;
    const t = window.setTimeout(() => setAviso(null), duracionMs);
    return () => window.clearTimeout(t);
  }, [aviso, duracionMs]);

  return {
    aviso,
    exito: (texto: string) => setAviso({ tipo: 'exito', texto }),
    error: (texto: string) => setAviso({ tipo: 'error', texto }),
    cerrar: () => setAviso(null),
  };
}

export function mensajeDeError(err: unknown) {
  return err instanceof Error ? err.message : 'Ocurrió un error inesperado.';
}
